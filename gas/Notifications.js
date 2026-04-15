function nijjaraBuildNotificationActions_(session, notificationRow) {
  var notificationType = String(notificationRow.Notification_Type_Code || '');
  var actionRows = nijjaraFindMany_('SYS_NotificationActions', function (row) {
    return String(row.Notification_Type_Code || '') === notificationType && String(row.Is_Active).toLowerCase() !== 'false';
  });
  var mappedActions = actionRows.filter(function (row) {
    if (String(row.Action_Code || '') === 'OPEN') {
      return true;
    }
    return nijjaraHasAccess_(session, 'notifications', 'action');
  }).map(function (row) {
    return {
      code: row.Action_Code,
      label: row.Action_Label_AR || row.Action_Label_EN || row.Action_Code,
      targetModule: row.Target_Module_Code || '',
      targetSubModule: row.Target_SubModule_Code || '',
      targetStatus: row.Target_Status_Code || '',
      actionTarget: row.Action_Target || ''
    };
  });

  if (!mappedActions.length && String(notificationRow.Action_Code || '').trim()) {
    mappedActions.push({
      code: notificationRow.Action_Code || '',
      label: String(notificationRow.Action_Code || '').toUpperCase() === 'OPEN' ? 'فتح' : (notificationRow.Action_Code || ''),
      targetModule: notificationRow.Module_Code || '',
      targetSubModule: notificationRow.SubModule_Code || '',
      targetStatus: notificationRow.Status_Code || '',
      actionTarget: notificationRow.Action_Target || ''
    });
  }

  return mappedActions;
}

function nijjaraCreateNotification_(payload) {
  nijjaraAppendRow_('SYS_Notifications', {
    Notification_ID: nijjaraRandomId_('NTF-'),
    Target_User_ID: payload.targetUserId || '',
    Target_Role_Code: payload.targetRoleCode || '',
    Module_Code: payload.moduleCode || '',
    SubModule_Code: payload.subModuleCode || '',
    Source_Record_ID: payload.sourceRecordId || '',
    Notification_Type_Code: payload.notificationTypeCode || 'SYSTEM_ALERT',
    Title_AR: payload.titleAr || 'إشعار',
    Body_AR: payload.bodyAr || '',
    Title_EN: payload.titleEn || '',
    Body_EN: payload.bodyEn || '',
    Action_Code: payload.actionCode || '',
    Action_Target: payload.actionTarget || '',
    Requires_Action: !!payload.requiresAction,
    Status_Code: payload.statusCode || 'NEW',
    Action_Taken_At: '',
    Action_Taken_By: '',
    Created_At: nijjaraNow_(),
    Created_By: payload.createdBy || 'system',
    Updated_At: nijjaraNow_(),
    Updated_By: payload.createdBy || 'system'
  });
}

function nijjaraGetNotifications(sessionToken) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) {
    throw new Error('Session expired.');
  }
  return nijjaraGetNotificationsForSession_(session);
}

function nijjaraGetNotificationsForSession_(session) {
  return nijjaraFindMany_('SYS_Notifications', function (row) {
    var targetUser = String(row.Target_User_ID || '');
    var targetRole = String(row.Target_Role_Code || '');
    var statusCode = String(row.Status_Code || 'NEW').toUpperCase();
    return (targetUser === session.userId || (session.roles || []).indexOf(targetRole) !== -1) &&
      ['NEW', 'PENDING'].indexOf(statusCode) !== -1;
  }).slice(0, 30).map(function (row) {
    return {
      id: row.Notification_ID,
      title: row.Title_AR || 'إشعار',
      body: row.Body_AR || '',
      status: row.Status_Code || 'NEW',
      actionCode: row.Action_Code || '',
      sourceRecordId: row.Source_Record_ID || '',
      moduleCode: row.Module_Code || '',
      subModuleCode: row.SubModule_Code || '',
      actionTarget: row.Action_Target || '',
      availableActions: nijjaraBuildNotificationActions_(session, row)
    };
  });
}

function nijjaraActOnNotification(sessionToken, notificationId, actionCode) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) {
    throw new Error('Session expired.');
  }

  nijjaraGuardAccess_(session, 'notifications', 'action');
  var notification = nijjaraFindOne_('SYS_Notifications', function (row) {
    return String(row.Notification_ID || '') === String(notificationId || '');
  });
  if (!notification) {
    throw new Error('تعذر العثور على الإشعار المطلوب.');
  }

  var available = nijjaraBuildNotificationActions_(session, notification).map(function (item) {
    return item.code;
  });
  if (!available.length && String(notification.Action_Code || '').trim()) {
    available.push(String(notification.Action_Code || '').trim());
  }
  if (available.indexOf(actionCode) === -1) {
    throw new Error('هذا الإجراء غير متاح على هذا الإشعار.');
  }

  nijjaraUpdateByRow_('SYS_Notifications', notification.__row, {
    Status_Code: actionCode === 'OPEN' ? 'CLEARED' : 'CLEARED',
    Action_Code: actionCode,
    Action_Taken_At: nijjaraNow_(),
    Action_Taken_By: session.userId,
    Updated_At: nijjaraNow_(),
    Updated_By: session.username
  });

  nijjaraAudit_(
    'SYS',
    'NOTIFICATIONS',
    actionCode,
    'MEDIUM',
    'SUCCESS',
    session.userId,
    'تم تنفيذ إجراء من مركز الإشعارات',
    'تم تنفيذ الإجراء ' + actionCode + ' على الإشعار ' + notificationId
  );

  CacheService.getScriptCache().remove('bootstrap:' + session.userId);
  return {
    success: true,
    notificationId: notificationId,
    actionCode: actionCode
  };
}

function nijjaraClearAllNotifications(sessionToken) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) {
    throw new Error('Session expired.');
  }

  nijjaraFindMany_('SYS_Notifications', function (row) {
    var targetUser = String(row.Target_User_ID || '');
    var targetRole = String(row.Target_Role_Code || '');
    var statusCode = String(row.Status_Code || 'NEW').toUpperCase();
    return (targetUser === session.userId || (session.roles || []).indexOf(targetRole) !== -1) &&
      ['NEW', 'PENDING'].indexOf(statusCode) !== -1;
  }).forEach(function (row) {
    nijjaraUpdateByRow_('SYS_Notifications', row.__row, {
      Status_Code: 'CLEARED',
      Action_Code: 'CLEAR_ALL',
      Action_Taken_At: nijjaraNow_(),
      Action_Taken_By: session.userId,
      Updated_At: nijjaraNow_(),
      Updated_By: session.username
    });
  });

  nijjaraAudit_(
    'SYS',
    'NOTIFICATIONS',
    'CLEAR_ALL',
    'MEDIUM',
    'SUCCESS',
    session.userId,
    'تم مسح جميع الإشعارات',
    'تم مسح جميع الإشعارات غير المقروءة من مركز الإشعارات'
  );

  CacheService.getScriptCache().remove('bootstrap:' + session.userId);
  return { success: true };
}

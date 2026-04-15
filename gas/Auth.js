function nijjaraUserPermissionRows_() {
  return nijjaraRows_('SYS_UserPermissions');
}

function nijjaraEnsureUserAccessRulesSheet_() {
  nijjaraEnsureSheetWithHeaders_('SYS_UserAccessRules', [
    'AccessRule_ID',
    'User_ID',
    'Module_Key',
    'View_Access',
    'Create_Access',
    'Edit_Access',
    'Action_Access',
    'Scope_Code',
    'Assigned_At',
    'Assigned_By',
    'Is_Active',
    'Notes'
  ]);
}

function nijjaraUserAccessRuleRows_() {
  nijjaraEnsureUserAccessRulesSheet_();
  return nijjaraRows_('SYS_UserAccessRules');
}

function nijjaraEnsureUserPermissionsSheet_() {
  nijjaraEnsureSheetWithHeaders_('SYS_UserPermissions', [
    'UserPerm_ID',
    'User_ID',
    'Perm_Code',
    'Assigned_At',
    'Assigned_By',
    'Is_Active',
    'Notes'
  ]);
}

function nijjaraGenerateUsernameCandidate_(employee) {
  employee = employee || {};
  var englishName = String(employee.Full_Name_EN || '').trim();
  if (englishName) {
    var parts = englishName
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 2) return parts[0] + '.' + parts[parts.length - 1];
    if (parts.length === 1) return parts[0];
  }
  var email = String(employee.Email || '').trim().toLowerCase();
  if (email && email.indexOf('@') !== -1) {
    return email.split('@')[0].replace(/[^a-z0-9.]/g, '');
  }
  return String(employee.Employee_ID || 'user').toLowerCase().replace(/[^a-z0-9.]/g, '');
}

function nijjaraNormalizeBooleanFlag_(value) {
  if (value === true || value === false) return value;
  var normalized = String(value == null ? '' : value).trim().toLowerCase();
  if (!normalized || normalized === 'inherit') return null;
  if (['true', '1', 'yes', 'allow', 'enabled'].indexOf(normalized) !== -1) return true;
  if (['false', '0', 'no', 'deny', 'disabled'].indexOf(normalized) !== -1) return false;
  return null;
}

function nijjaraSanitizeUserAccessRule_(rule) {
  rule = rule || {};
  var moduleKey = String(rule.moduleKey || '').trim();
  if (!moduleKey) return null;
  var sanitized = {
    moduleKey: moduleKey,
    view: nijjaraNormalizeBooleanFlag_(rule.view),
    create: nijjaraNormalizeBooleanFlag_(rule.create),
    edit: nijjaraNormalizeBooleanFlag_(rule.edit),
    action: nijjaraNormalizeBooleanFlag_(rule.action),
    scopeCode: String(rule.scopeCode || '').trim().toUpperCase() || 'INHERIT'
  };
  if (sanitized.scopeCode === 'INHERIT' &&
      sanitized.view == null &&
      sanitized.create == null &&
      sanitized.edit == null &&
      sanitized.action == null) {
    return null;
  }
  return sanitized;
}

function nijjaraGenerateUniqueUsername_(employee, excludeUserId) {
  var base = nijjaraGenerateUsernameCandidate_(employee) || 'user';
  var candidate = base;
  var counter = 2;
  while (nijjaraFindOne_('SYS_Users', function (row) {
    if (excludeUserId && String(row.User_ID || '') === String(excludeUserId || '')) return false;
    return String(row.Username || '').toLowerCase() === candidate.toLowerCase();
  })) {
    candidate = base + counter;
    counter += 1;
  }
  return candidate;
}

function nijjaraGetEmployeeByEmail_(email) {
  var lookup = String(email || '').trim().toLowerCase();
  if (!lookup) return null;
  return nijjaraFindOne_('HRM_Employees', function (row) {
    return String(row.Email || '').trim().toLowerCase() === lookup;
  });
}

function nijjaraBuildSessionForUser_(user) {
  var cache = CacheService.getScriptCache();
  var employee = nijjaraFindOne_('HRM_Employees', function (row) {
    return String(row.Employee_ID || '') === String(user.Linked_Employee_ID || '');
  });
  var userRoles = nijjaraFindMany_('SYS_UserRoles', function (row) {
    return String(row.User_ID || '') === String(user.User_ID || '') && String(row.Is_Active).toLowerCase() !== 'false';
  }).map(function (row) {
    return row.Role_Code;
  });
  var permissionRows = nijjaraFindMany_('SYS_RolePermissions', function (row) {
    return userRoles.indexOf(String(row.Role_Code || '')) !== -1 && String(row.Is_Active).toLowerCase() !== 'false';
  });
  var directPermissionRows = nijjaraUserPermissionRows_().filter(function (row) {
    return String(row.User_ID || '') === String(user.User_ID || '') && String(row.Is_Active).toLowerCase() !== 'false';
  });
  var accessRuleRows = nijjaraUserAccessRuleRows_().filter(function (row) {
    return String(row.User_ID || '') === String(user.User_ID || '') && String(row.Is_Active).toLowerCase() !== 'false';
  }).map(function (row) {
    return nijjaraSanitizeUserAccessRule_({
      moduleKey: row.Module_Key,
      view: row.View_Access,
      create: row.Create_Access,
      edit: row.Edit_Access,
      action: row.Action_Access,
      scopeCode: row.Scope_Code
    });
  }).filter(Boolean);
  var primaryRoleCode = userRoles[0] || '';
  var session = {
    token: Utilities.getUuid(),
    userId: user.User_ID,
    username: user.Username,
    displayName: user.Display_Name_AR || user.Username,
    displayNameEn: user.Display_Name_EN || user.Username,
    linkedEmployeeId: user.Linked_Employee_ID || '',
    linkedEmployeeDepartment: employee ? (employee.Department_Name_AR || employee.Department_Code || '') : '',
    roles: userRoles,
    primaryRoleCode: primaryRoleCode,
    permissions: permissionRows.map(function (row) { return row.Perm_Code; }).concat(directPermissionRows.map(function (row) { return row.Perm_Code; })),
    accessRules: accessRuleRows,
    issuedAt: nijjaraNow_()
  };
  session.permissions = session.permissions.filter(function (permissionCode, index, collection) {
    return collection.indexOf(permissionCode) === index;
  });
  cache.put('session:' + session.token, JSON.stringify(session), NIJJARA_CONFIG.sessionCacheSeconds);
  return session;
}

function nijjaraBuildPasswordFlowEmailHtml_(options) {
  options = options || {};
  var subjectTitle = options.subjectTitle || 'NIJJARA ERP';
  var heading = options.heading || 'مرحباً بك في نظام NIJJARA ERP';
  var message = options.message || '';
  var actionLabel = options.actionLabel || 'فتح الرابط';
  var actionUrl = options.actionUrl || '#';
  var usernameHtml = options.username ? '<p style="margin:0 0 12px;font-size:15px;line-height:1.9;color:#d7d7d7;text-align:right;direction:rtl">اسم المستخدم: <strong style="color:#fff">' + options.username + '</strong></p>' : '';
  return '' +
    '<div dir="rtl" style="margin:0;padding:32px;background:#0e0e12;font-family:Cairo,Tahoma,Arial,sans-serif;color:#f4f4f4;text-align:right;direction:rtl">' +
      '<table role="presentation" style="width:100%;max-width:680px;margin:0 auto;border-collapse:collapse;background:linear-gradient(180deg,#1b1b22 0%,#111117 100%);border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden">' +
        '<tr><td style="padding:32px 36px;background:radial-gradient(circle at top right,#7d1f2f 0%,#18181f 58%,#111117 100%)">' +
          '<p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ffcf91;text-align:right;direction:ltr">' + subjectTitle + '</p>' +
          '<h1 style="margin:0 0 14px;font-size:30px;line-height:1.5;color:#ffffff;text-align:right;direction:rtl">' + heading + '</h1>' +
          '<p style="margin:0;font-size:15px;line-height:2;color:#ececec;text-align:right;direction:rtl">' + message + '</p>' +
        '</td></tr>' +
        '<tr><td style="padding:28px 36px;background:#111117;text-align:right;direction:rtl">' +
          usernameHtml +
          '<div style="margin:22px 0 10px;text-align:right;direction:rtl">' +
            '<a href="' + actionUrl + '" style="display:inline-block;padding:14px 22px;border-radius:999px;background:linear-gradient(135deg,#b54b58 0%,#7a202e 100%);color:#fff;text-decoration:none;font-weight:700;font-size:15px">' + actionLabel + '</a>' +
          '</div>' +
          '<p style="margin:18px 0 0;font-size:13px;line-height:2;color:#a5a5ad;text-align:right;direction:rtl">هذا الرابط صالح لمدة 30 دقيقة. إذا لم تطلب هذا الإجراء، يمكنك تجاهل الرسالة.</p>' +
        '</td></tr>' +
      '</table>' +
    '</div>';
}

function nijjaraCreatePasswordTokenForUser_(user, purposeCode) {
  var token = Utilities.getUuid();
  var tokenHash = nijjaraHashPassword_('reset', token);
  var expiresAt = new Date(Date.now() + 1000 * 60 * 30);
  var expiresText = Utilities.formatDate(expiresAt, Session.getScriptTimeZone() || 'Africa/Cairo', "yyyy-MM-dd'T'HH:mm:ss");
  nijjaraAppendRow_('SYS_PasswordResets', {
    Reset_ID: nijjaraRandomId_('RST-'),
    User_ID: user.User_ID,
    Username: user.Username,
    Email: user.Email,
    Token_Hash: tokenHash,
    Status_Code: 'PENDING',
    Requested_At: nijjaraNow_(),
    Requested_By: purposeCode,
    Used_At: '',
    Used_By: '',
    Expires_At: expiresText,
    Notes: purposeCode
  });
  nijjaraUpdateByRow_('SYS_Users', user.__row, {
    Reset_Token_Hash: tokenHash,
    Reset_Token_Expiry: expiresText,
    Reset_Requested_At: nijjaraNow_(),
    Updated_At: nijjaraNow_(),
    Updated_By: purposeCode
  });
  return token;
}

function nijjaraPasswordFlowUrl_(token) {
  return ScriptApp.getService().getUrl() + '?flow=password-setup&token=' + encodeURIComponent(token);
}

function nijjaraSendPasswordFlowEmail_(user, options) {
  options = options || {};
  var token = nijjaraCreatePasswordTokenForUser_(user, options.purposeCode || 'PASSWORD_FLOW');
  var actionUrl = nijjaraPasswordFlowUrl_(token);
  var subject = options.subject || 'NIJJARA ERP';
  var plainBody = [
    options.heading || 'NIJJARA ERP',
    options.message || '',
    user && user.Username ? ('Username: ' + user.Username) : '',
    'Open this link to continue:',
    actionUrl,
    'This link expires in 30 minutes.'
  ].filter(Boolean).join('\n\n');
  MailApp.sendEmail({
    to: user.Email,
    subject: subject,
    body: plainBody,
    htmlBody: nijjaraBuildPasswordFlowEmailHtml_({
      subjectTitle: 'NIJJARA ERP',
      heading: options.heading,
      message: options.message,
      username: user.Username,
      actionLabel: options.actionLabel,
      actionUrl: actionUrl
    }),
    name: NIJJARA_CONFIG.systemName
  });
  return { success: true };
}

function nijjaraFindPasswordFlowUser_(token) {
  var tokenHash = nijjaraHashPassword_('reset', String(token || ''));
  var now = nijjaraNow_();
  return nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.Reset_Token_Hash || '') === tokenHash &&
      String(row.Reset_Token_Expiry || '') >= now &&
      String(row.Status_Code || '').toUpperCase() === 'ACTIVE';
  });
}

function nijjaraFindPasswordFlowRow_(token) {
  var tokenHash = nijjaraHashPassword_('reset', String(token || ''));
  var now = nijjaraNow_();
  return nijjaraFindOne_('SYS_PasswordResets', function (row) {
    return String(row.Token_Hash || '') === tokenHash &&
      String(row.Status_Code || '').toUpperCase() === 'PENDING' &&
      String(row.Expires_At || '') >= now;
  });
}

function nijjaraFinalizePasswordFlowRows_(userId) {
  nijjaraFindMany_('SYS_PasswordResets', function (row) {
    return String(row.User_ID || '') === String(userId || '') && String(row.Status_Code || '').toUpperCase() === 'PENDING';
  }).forEach(function (row) {
    nijjaraUpdateByRow_('SYS_PasswordResets', row.__row, {
      Status_Code: 'USED',
      Used_At: nijjaraNow_(),
      Used_By: String(userId || '')
    });
  });
}

function nijjaraGrantUserRolesAndPermissions_(userId, roleCodes, permissionCodes, actor) {
  roleCodes = Array.isArray(roleCodes) ? roleCodes : [];
  permissionCodes = Array.isArray(permissionCodes) ? permissionCodes : [];
  var now = nijjaraNow_();
  var actorName = actor && actor.username ? actor.username : 'system';

  nijjaraFindMany_('SYS_UserRoles', function (row) {
    return String(row.User_ID || '') === String(userId || '');
  }).forEach(function (row) {
    nijjaraUpdateByRow_('SYS_UserRoles', row.__row, {
      Is_Active: roleCodes.indexOf(String(row.Role_Code || '')) !== -1,
      Assigned_At: now,
      Assigned_By: actorName
    });
  });

  roleCodes.forEach(function (roleCode) {
    var existingRole = nijjaraFindOne_('SYS_UserRoles', function (row) {
      return String(row.User_ID || '') === String(userId || '') && String(row.Role_Code || '') === String(roleCode || '');
    });
    if (!existingRole) {
      nijjaraAppendRow_('SYS_UserRoles', {
        UserRole_ID: nijjaraRandomId_('UROL-'),
        User_ID: userId,
        Role_Code: roleCode,
        Assigned_At: now,
        Assigned_By: actorName,
        Is_Active: true,
        Notes: 'Assigned by user management'
      });
    }
  });

  nijjaraEnsureUserPermissionsSheet_();
  nijjaraFindMany_('SYS_UserPermissions', function (row) {
    return String(row.User_ID || '') === String(userId || '');
  }).forEach(function (row) {
    nijjaraUpdateByRow_('SYS_UserPermissions', row.__row, {
      Is_Active: permissionCodes.indexOf(String(row.Perm_Code || '')) !== -1,
      Assigned_At: now,
      Assigned_By: actorName
    });
  });

  permissionCodes.forEach(function (permCode) {
    var existingPerm = nijjaraFindOne_('SYS_UserPermissions', function (row) {
      return String(row.User_ID || '') === String(userId || '') && String(row.Perm_Code || '') === String(permCode || '');
    });
    if (!existingPerm) {
      nijjaraAppendRow_('SYS_UserPermissions', {
        UserPerm_ID: nijjaraRandomId_('UPRM-'),
        User_ID: userId,
        Perm_Code: permCode,
        Assigned_At: now,
        Assigned_By: actorName,
        Is_Active: true,
        Notes: 'Assigned by user management'
      });
    }
  });
}

function nijjaraGrantUserAccessRules_(userId, accessRules, actor) {
  nijjaraEnsureUserAccessRulesSheet_();
  accessRules = Array.isArray(accessRules) ? accessRules.map(nijjaraSanitizeUserAccessRule_).filter(Boolean) : [];
  var now = nijjaraNow_();
  var actorName = actor && actor.username ? actor.username : 'system';
  var activeRulesByModule = {};
  accessRules.forEach(function (rule) {
    activeRulesByModule[String(rule.moduleKey || '')] = rule;
  });

  nijjaraUserAccessRuleRows_().filter(function (row) {
    return String(row.User_ID || '') === String(userId || '');
  }).forEach(function (row) {
    var rule = activeRulesByModule[String(row.Module_Key || '')] || null;
    nijjaraUpdateByRow_('SYS_UserAccessRules', row.__row, {
      View_Access: rule && rule.view != null ? rule.view : '',
      Create_Access: rule && rule.create != null ? rule.create : '',
      Edit_Access: rule && rule.edit != null ? rule.edit : '',
      Action_Access: rule && rule.action != null ? rule.action : '',
      Scope_Code: rule ? rule.scopeCode : '',
      Assigned_At: now,
      Assigned_By: actorName,
      Is_Active: !!rule,
      Notes: rule ? 'Assigned by user management' : 'Disabled by user management'
    });
  });

  accessRules.forEach(function (rule) {
    var existingRule = nijjaraFindOne_('SYS_UserAccessRules', function (row) {
      return String(row.User_ID || '') === String(userId || '') &&
        String(row.Module_Key || '') === String(rule.moduleKey || '');
    });
    if (!existingRule) {
      nijjaraAppendRow_('SYS_UserAccessRules', {
        AccessRule_ID: nijjaraRandomId_('UACC-'),
        User_ID: userId,
        Module_Key: rule.moduleKey,
        View_Access: rule.view != null ? rule.view : '',
        Create_Access: rule.create != null ? rule.create : '',
        Edit_Access: rule.edit != null ? rule.edit : '',
        Action_Access: rule.action != null ? rule.action : '',
        Scope_Code: rule.scopeCode || 'INHERIT',
        Assigned_At: now,
        Assigned_By: actorName,
        Is_Active: true,
        Notes: 'Assigned by user management'
      });
    }
  });
}

function nijjaraNotifyAdminsOfPendingAccess_(user) {
  var adminRoleCodes = ['super_admin', 'access_admin', 'general_manager', 'hr_admin'];
  var adminUserIds = {};
  nijjaraFindMany_('SYS_UserRoles', function (row) {
    return adminRoleCodes.indexOf(String(row.Role_Code || '')) !== -1 && String(row.Is_Active).toLowerCase() !== 'false';
  }).forEach(function (row) {
    adminUserIds[String(row.User_ID || '')] = true;
  });
  Object.keys(adminUserIds).forEach(function (userId) {
    nijjaraCreateNotification_({
      targetUserId: userId,
      moduleCode: 'SYS',
      subModuleCode: 'USERS',
      sourceRecordId: user.User_ID,
      notificationTypeCode: 'SYSTEM_ALERT',
      titleAr: 'حساب جديد بانتظار الصلاحيات',
      bodyAr: 'تم إنشاء حساب جديد للمستخدم ' + (user.Display_Name_AR || user.Username) + ' وهو بانتظار تعيين الأدوار والصلاحيات.',
      actionCode: 'OPEN',
      actionTarget: JSON.stringify({ moduleKey: 'users', recordId: user.User_ID, mode: 'edit' }),
      createdBy: user.Username || 'system'
    });
  });
}

function nijjaraLogin(username, password) {
  username = String(username || '').trim();
  password = String(password || '');
  if (!username || !password) {
    throw new Error('Username and password are required.');
  }

  var user = nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.Username || '').toLowerCase() === username.toLowerCase() &&
      String(row.Status_Code || '').toUpperCase() === 'ACTIVE';
  });
  if (!user) {
    throw new Error('Invalid credentials.');
  }

  var candidateHash = nijjaraHashPassword_(String(user.Password_Salt || ''), password);
  if (candidateHash !== String(user.Password_Hash || '')) {
    throw new Error('Invalid credentials.');
  }

  var session = nijjaraBuildSessionForUser_(user);
  nijjaraUpdateByRow_('SYS_Users', user.__row, {
    Last_Login_At: nijjaraNow_(),
    Updated_At: nijjaraNow_(),
    Updated_By: user.Username
  });
  nijjaraAudit_('SYS', 'AUTH', 'LOGIN', 'LOW', 'SUCCESS', user.User_ID, 'تم تسجيل الدخول بنجاح', 'نجح تسجيل الدخول للمستخدم ' + user.Username, {
    sourceRecordId: user.User_ID,
    actorUsername: user.Username,
    actorDisplayAr: user.Display_Name_AR || user.Username
  });
  return session;
}

function nijjaraLogout(sessionToken) {
  if (!sessionToken) return true;
  CacheService.getScriptCache().remove('session:' + sessionToken);
  return true;
}

function nijjaraGetSession(sessionToken) {
  if (!sessionToken) return null;
  var raw = CacheService.getScriptCache().get('session:' + sessionToken);
  return raw ? JSON.parse(raw) : null;
}

function nijjaraStartSelfRegistration(email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) throw new Error('Email is required.');
  var employee = nijjaraGetEmployeeByEmail_(email);
  if (!employee) throw new Error('This email was not found in the employee records.');

  var user = nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.Linked_Employee_ID || '') === String(employee.Employee_ID || '');
  });
  if (!user) {
    var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 32);
    var username = nijjaraGenerateUniqueUsername_(employee);
    var userId = nijjaraRandomId_('USR-');
    nijjaraAppendRow_('SYS_Users', {
      User_ID: userId,
      Username: username,
      Password_Salt: salt,
      Password_Hash: '',
      Password_Algo: NIJJARA_CONFIG.passwordAlgo,
      Must_Change_Password: true,
      Email: email,
      Display_Name_AR: employee.Full_Name_AR || username,
      Display_Name_EN: employee.Full_Name_EN || username,
      Linked_Employee_ID: employee.Employee_ID || '',
      Linked_Partner_ID: '',
      Status_Code: 'ACTIVE',
      Last_Login_At: '',
      Failed_Login_Count: 0,
      Locked_Until: '',
      Reset_Token_Hash: '',
      Reset_Token_Expiry: '',
      Reset_Requested_At: '',
      Search_Text_AR: [username, employee.Full_Name_AR, employee.Employee_ID, email].join(' | '),
      Search_Text_EN: [username, employee.Full_Name_EN, employee.Employee_ID, email].join(' | '),
      Created_At: nijjaraNow_(),
      Created_By: 'self-register-invite',
      Updated_At: nijjaraNow_(),
      Updated_By: 'self-register-invite'
    });
    nijjaraAppendRow_('SYS_UserRoles', {
      UserRole_ID: nijjaraRandomId_('UROL-'),
      User_ID: userId,
      Role_Code: 'employee_self_service',
      Assigned_At: nijjaraNow_(),
      Assigned_By: 'self-register-invite',
      Is_Active: true,
      Notes: 'Awaiting access assignment'
    });
    user = nijjaraFindOne_('SYS_Users', function (row) {
      return String(row.User_ID || '') === String(userId || '');
    });
  } else {
    if (String(user.Password_Hash || '').trim() && String(user.Must_Change_Password).toLowerCase() !== 'true') {
      throw new Error('An active account already exists for this employee. Use reset password instead.');
    }
    nijjaraUpdateByRow_('SYS_Users', user.__row, {
      Email: email,
      Updated_At: nijjaraNow_(),
      Updated_By: 'self-register-invite'
    });
    user = nijjaraFindOne_('SYS_Users', function (row) {
      return String(row.User_ID || '') === String(user.User_ID || '');
    });
  }

  nijjaraSendPasswordFlowEmail_(user, {
    purposeCode: 'SELF_REGISTRATION',
    subject: 'مرحباً بك في NIJJARA ERP',
    heading: 'مرحباً بك في NIJJARA ERP',
    message: 'تم تجهيز حسابك المبدئي. اضغط على الرابط أدناه لإنشاء كلمة المرور الخاصة بك وإكمال تفعيل الحساب.',
    actionLabel: 'إنشاء كلمة المرور'
  });
  nijjaraAudit_('SYS', 'AUTH', 'CREATE_USER', 'MEDIUM', 'SUCCESS', user.User_ID, 'تم إرسال دعوة إنشاء حساب', 'تم إرسال رابط إنشاء كلمة المرور للمستخدم ' + user.Username, {
    sourceRecordId: user.User_ID,
    actorUsername: user.Username,
    actorDisplayAr: user.Display_Name_AR || user.Username
  });
  nijjaraClearModuleDatasetCache_('users');
  nijjaraClearSharedCaches_();
  return { success: true, email: email };
}

function nijjaraCreateManagedUser(sessionToken, payload) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, 'users', 'create');

  payload = payload || {};
  var employeeId = String(payload.employeeId || '').trim();
  var password = String(payload.password || '');
  var confirmPassword = String(payload.confirmPassword || '');
  if (!employeeId || !password) throw new Error('Employee and password are required.');
  if (password !== confirmPassword) throw new Error('Password confirmation does not match.');

  var employee = nijjaraFindOne_('HRM_Employees', function (row) {
    return String(row.Employee_ID || '') === employeeId;
  });
  if (!employee) throw new Error('Employee was not found.');
  var roleCodes = payload.roleCodes || (payload.primaryRoleCode ? [payload.primaryRoleCode] : []);
  if (!roleCodes.length) throw new Error('A primary role is required.');
  var existing = nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.Linked_Employee_ID || '') === employeeId && String(row.Status_Code || '').toUpperCase() === 'ACTIVE';
  });
  if (existing) throw new Error('This employee already has an active account.');

  var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 32);
  var userId = nijjaraRandomId_('USR-');
  var username = nijjaraGenerateUniqueUsername_(employee);
  nijjaraAppendRow_('SYS_Users', {
    User_ID: userId,
    Username: username,
    Password_Salt: salt,
    Password_Hash: nijjaraHashPassword_(salt, password),
    Password_Algo: NIJJARA_CONFIG.passwordAlgo,
    Must_Change_Password: false,
    Email: employee.Email || '',
    Display_Name_AR: employee.Full_Name_AR || username,
    Display_Name_EN: employee.Full_Name_EN || username,
    Linked_Employee_ID: employeeId,
    Linked_Partner_ID: '',
    Status_Code: 'ACTIVE',
    Last_Login_At: '',
    Failed_Login_Count: 0,
    Locked_Until: '',
    Reset_Token_Hash: '',
    Reset_Token_Expiry: '',
    Reset_Requested_At: '',
    Search_Text_AR: [username, employee.Full_Name_AR, employee.Employee_ID, employee.Email].join(' | '),
    Search_Text_EN: [username, employee.Full_Name_EN, employee.Employee_ID, employee.Email].join(' | '),
    Created_At: nijjaraNow_(),
    Created_By: session.username,
    Updated_At: nijjaraNow_(),
    Updated_By: session.username
  });
  nijjaraGrantUserRolesAndPermissions_(userId, roleCodes, payload.permissionCodes || [], session);
  nijjaraGrantUserAccessRules_(userId, payload.accessRules || [], session);
  nijjaraAudit_('SYS', 'USERS', 'CREATE_USER', 'MEDIUM', 'SUCCESS', session.userId, 'تم إنشاء مستخدم جديد من إدارة المستخدمين', 'تم إنشاء المستخدم ' + username + ' وربطه بالموظف ' + employeeId, {
    sourceRecordId: userId,
    actorUsername: session.username,
    actorDisplayAr: session.displayName
  });
  var createdUserRow = nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.User_ID || '') === String(userId || '');
  });
  var userRecord = nijjaraBuildModuleRecordPayload_('users', nijjaraModuleSpec_('users'), createdUserRow, nijjaraUsersLookupContext_(session), []);
  nijjaraClearModuleDatasetCache_('users');
  nijjaraClearSharedCaches_();
  return { success: true, userId: userId, username: username, record: userRecord };
}

function nijjaraUpdateManagedUser(sessionToken, userId, payload) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, 'users', 'edit');

  userId = String(userId || '').trim();
  if (!userId) throw new Error('User id is required.');
  payload = payload || {};

  var user = nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.User_ID || '') === userId;
  });
  if (!user) throw new Error('User was not found.');
  if (!nijjaraCanManageProtectedSystemUser_(session, user)) {
    throw new Error('This system user is protected and only the main super admin can change its roles, permissions, or access rules.');
  }

  var password = String(payload.password || '');
  var confirmPassword = String(payload.confirmPassword || '');
  if (password || confirmPassword) {
    if (!password) throw new Error('Password is required when changing it.');
    if (password !== confirmPassword) throw new Error('Password confirmation does not match.');
  }

  var patch = {
    Status_Code: String(payload.statusCode || user.Status_Code || 'ACTIVE').trim().toUpperCase() || 'ACTIVE',
    Updated_At: nijjaraNow_(),
    Updated_By: session.username
  };

  if (password) {
    var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 32);
    patch.Password_Salt = salt;
    patch.Password_Hash = nijjaraHashPassword_(salt, password);
    patch.Must_Change_Password = false;
    patch.Reset_Token_Hash = '';
    patch.Reset_Token_Expiry = '';
    patch.Reset_Requested_At = '';
  }

  nijjaraUpdateByRow_('SYS_Users', user.__row, patch);
  var nextRoleCodes = payload.roleCodes || (payload.primaryRoleCode ? [payload.primaryRoleCode] : []);
  if (!nextRoleCodes.length) throw new Error('A primary role is required.');
  nijjaraGrantUserRolesAndPermissions_(userId, nextRoleCodes, Object.prototype.hasOwnProperty.call(payload, 'permissionCodes') ? (payload.permissionCodes || []) : nijjaraUserPermissionRows_().filter(function (row) {
    return String(row.User_ID || '') === String(userId || '') && String(row.Is_Active).toLowerCase() !== 'false';
  }).map(function (row) {
    return row.Perm_Code;
  }), session);
  if (Object.prototype.hasOwnProperty.call(payload, 'accessRules')) {
    nijjaraGrantUserAccessRules_(userId, payload.accessRules || [], session);
  }
  nijjaraAudit_('SYS', 'USERS', 'UPDATE_USER', 'MEDIUM', 'SUCCESS', session.userId, 'تم تحديث بيانات المستخدم', 'تم تحديث المستخدم ' + (user.Username || userId) + ' من إدارة المستخدمين', {
    sourceRecordId: userId,
    actorUsername: session.username,
    actorDisplayAr: session.displayName
  });
  var updatedUserRow = nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.User_ID || '') === String(userId || '');
  });
  var updatedUserRecord = nijjaraBuildModuleRecordPayload_('users', nijjaraModuleSpec_('users'), updatedUserRow, nijjaraUsersLookupContext_(session), []);
  nijjaraClearModuleDatasetCache_('users');
  nijjaraClearSharedCaches_();
  return { success: true, userId: userId, record: updatedUserRecord };
}

function nijjaraRequestPasswordReset(identifier) {
  identifier = String(identifier || '').trim().toLowerCase();
  if (!identifier) {
    throw new Error('Email is required.');
  }

  var user = nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.Email || '').toLowerCase() === identifier;
  });
  if (!user) {
    throw new Error('This email was not found in system users.');
  }

  nijjaraSendPasswordFlowEmail_(user, {
    purposeCode: 'PASSWORD_RESET',
    subject: 'إعادة تعيين كلمة المرور - NIJJARA ERP',
    heading: 'إعادة تعيين كلمة المرور',
    message: 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. اضغط على الرابط أدناه لإدخال كلمة مرور جديدة.',
    actionLabel: 'إعادة تعيين كلمة المرور'
  });
  nijjaraAudit_('SYS', 'AUTH', 'FORGOT_PASSWORD', 'MEDIUM', 'SUCCESS', user.User_ID, 'تم إرسال طلب إعادة تعيين كلمة المرور', 'تم إرسال رابط إعادة تعيين كلمة المرور للمستخدم ' + user.Username, {
    sourceRecordId: user.User_ID,
    actorUsername: user.Username,
    actorDisplayAr: user.Display_Name_AR || user.Username
  });
  return { success: true };
}

function nijjaraGetPasswordSetupContext(token) {
  var user = nijjaraFindPasswordFlowUser_(token);
  if (!user) throw new Error('This link is invalid or expired.');
  return {
    email: user.Email || '',
    username: user.Username || '',
    displayName: user.Display_Name_AR || user.Username || ''
  };
}

function nijjaraCompletePasswordSetup(token, password, confirmPassword) {
  password = String(password || '');
  confirmPassword = String(confirmPassword || '');
  if (!password) throw new Error('Password is required.');
  if (password !== confirmPassword) throw new Error('Password confirmation does not match.');

  var user = nijjaraFindPasswordFlowUser_(token);
  if (!user) throw new Error('This link is invalid or expired.');
  var flowRow = nijjaraFindPasswordFlowRow_(token);

  var salt = String(user.Password_Salt || '') || Utilities.getUuid().replace(/-/g, '').slice(0, 32);
  nijjaraUpdateByRow_('SYS_Users', user.__row, {
    Password_Salt: salt,
    Password_Hash: nijjaraHashPassword_(salt, password),
    Must_Change_Password: false,
    Reset_Token_Hash: '',
    Reset_Token_Expiry: '',
    Reset_Requested_At: '',
    Updated_At: nijjaraNow_(),
    Updated_By: user.Username
  });
  nijjaraFinalizePasswordFlowRows_(user.User_ID);
  if (flowRow && String(flowRow.Notes || flowRow.Requested_By || '') === 'SELF_REGISTRATION') {
    nijjaraNotifyAdminsOfPendingAccess_(user);
  }
  nijjaraAudit_('SYS', 'AUTH', 'UPDATE', 'MEDIUM', 'SUCCESS', user.User_ID, 'تم استكمال إنشاء كلمة المرور', 'أكمل المستخدم ' + user.Username + ' إنشاء كلمة المرور لحسابه.', {
    sourceRecordId: user.User_ID,
    actorUsername: user.Username,
    actorDisplayAr: user.Display_Name_AR || user.Username
  });
  var freshUser = nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.User_ID || '') === String(user.User_ID || '');
  });
  return nijjaraBuildSessionForUser_(freshUser);
}

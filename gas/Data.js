var NIJJARA_GRID_PAGE_SIZE = 50;
var NIJJARA_RUNTIME_CACHE = this.NIJJARA_RUNTIME_CACHE || (this.NIJJARA_RUNTIME_CACHE = {
  lookupContext: null,
  usersLookupContext: null,
  moduleRows: {}
});

function nijjaraModuleDatasetCacheKey_(moduleKey, session) {
  return 'moduledata:v11:' + String(session && session.userId || 'anon') + ':' + moduleKey;
}

function nijjaraApplyProjectBudgetCascade_(projectId, newBudgetValue, revisionDate, actorId, actorUsername) {
  var now = nijjaraNow_();
  var projectRow = nijjaraFindOne_('PRJ_Projects', function (row) {
    return String(row.Project_ID || '') === String(projectId || '');
  });
  if (projectRow) {
    var receivedTotal = nijjaraFindMany_('PRJ_Payments', function (payRow) {
      return String(payRow.Project_ID || '') === String(projectId || '') && nijjaraRowVisible_(payRow);
    }).reduce(function (sum, payRow) {
      return sum + (Number(payRow.Payment_Amount || 0) || 0);
    }, 0);
    var newRemaining = Math.max(0, (Number(newBudgetValue || 0) || 0) - receivedTotal);
    var currentVersion = Number(projectRow.Budget_Version_No || 0) || 0;
    nijjaraUpdateByRow_('PRJ_Projects', projectRow.__row, {
      Project_Budget: Number(newBudgetValue || 0) || 0,
      Amount_Remaining: newRemaining,
      Budget_Version_No: currentVersion + 1,
      Last_Budget_Change_At: revisionDate || now,
      Last_Budget_Change_By: actorUsername || actorId || '',
      Updated_At: now,
      Updated_By: actorId || actorUsername || ''
    });
  }
  var paymentRows = nijjaraFindMany_('PRJ_Payments', function (row) {
    return String(row.Project_ID || '') === String(projectId || '');
  });
  paymentRows.forEach(function (row) {
    var totalReceived = Number(row.Total_Received || row.Payment_Amount || 0) || 0;
    var updatedRemaining = Math.max(0, (Number(newBudgetValue || 0) || 0) - totalReceived);
    nijjaraUpdateByRow_('PRJ_Payments', row.__row, {
      Project_Budget: Number(newBudgetValue || 0) || 0,
      Remaining_Mount: updatedRemaining,
      Updated_At: now,
      Updated_By: actorId || actorUsername || ''
    });
  });
}

function nijjaraEnsureRevenuePaymentSchema_() {
  nijjaraEnsureSheetHeaders_('PRJ_Payments', ['CustodyAccount_ID']);
  nijjaraEnsureSheetHeaders_('INCH_InternalChannels', ['RevChannel_ID']);
  nijjaraEnsureSheetHeaders_('INCH_InternalRevenuePayments', ['CustodyAccount_ID']);
  nijjaraEnsureSheetHeaders_('FIN_RevenueChannels', ['Linked_Partner_ID']);
  nijjaraEnsureSheetHeaders_('SET_ExpenseCatalog', ['Linked_Partner_ID']);
}

// One-time setup: links REVC-0004 (CNC) to PART-001, ensures all INCH_ schema columns exist
function nijjaraSetupCncPartnerRevenue() {
  nijjaraEnsureRevenuePaymentSchema_();
  // Set REVC-0004 -> PART-001 in FIN_RevenueChannels
  var cncChannel = nijjaraFindOne_('FIN_RevenueChannels', function (row) {
    return String(row.RevChannel_ID || '') === 'REVC-0004';
  });
  if (cncChannel) {
    nijjaraUpdateByRow_('FIN_RevenueChannels', cncChannel.__row, { Linked_Partner_ID: 'PART-001' });
    Logger.log('CNC channel REVC-0004 linked to PART-001');
  } else {
    Logger.log('WARNING: REVC-0004 not found in FIN_RevenueChannels');
  }
}

// Partner Revenue Functions — CNC Machine and other partner-exclusive channels

function nijjaraEnsurePartnerRevenueSheet_() {
  nijjaraEnsureSheetWithHeaders_('PAR_PartnerRevenue', [
    'PartnerRevenue_ID', 'Partner_ID', 'Source_Module', 'Source_SubModule', 'Source_Record_ID',
    'Revenue_Date', 'Amount', 'Statement_AR', 'Statement_EN', 'Status_Code',
    'Search_Text_AR', 'Search_Text_EN', 'Attachment_Count',
    'Created_At', 'Created_By', 'Updated_At', 'Updated_By'
  ]);
}

function nijjaraGetChannelLinkedPartner_(channelId) {
  if (!String(channelId || '').trim()) return null;
  var channel = nijjaraFindOne_('FIN_RevenueChannels', function (row) {
    return String(row.RevChannel_ID || '') === String(channelId || '');
  });
  return channel ? (String(channel.Linked_Partner_ID || '').trim() || null) : null;
}

function nijjaraGetExpenseLinkedPartner_(expenseName) {
  if (!String(expenseName || '').trim()) return null;
  var key = String(expenseName).trim().toLowerCase();
  var entry = nijjaraFindOne_('SET_ExpenseCatalog', function (row) {
    if (String(row.Is_Active).toLowerCase() === 'false') return false;
    return String(row.ExpenseName_AR || '').trim().toLowerCase() === key ||
           String(row.ExpenseName_EN || '').trim().toLowerCase() === key;
  });
  return entry ? (String(entry.Linked_Partner_ID || '').trim() || null) : null;
}

function nijjaraUpsertPartnerRevenue_(config, session) {
  nijjaraDeleteRows_('PAR_PartnerRevenue', function (row) {
    return String(row.Source_Module || '') === String(config.sourceModule || '') &&
      String(row.Source_SubModule || '') === String(config.sourceSubModule || '') &&
      String(row.Source_Record_ID || '') === String(config.sourceRecordId || '');
  });
  NIJJARA_ROWS_CACHE_['PAR_PartnerRevenue'] = null;
  if (!String(config.partnerId || '').trim() || (Number(config.amount || 0) || 0) <= 0) return;
  nijjaraEnsurePartnerRevenueSheet_();
  var now = nijjaraNow_();
  nijjaraAppendRow_('PAR_PartnerRevenue', {
    PartnerRevenue_ID: nijjaraRandomId_('PRV-'),
    Partner_ID: config.partnerId,
    Source_Module: config.sourceModule || '',
    Source_SubModule: config.sourceSubModule || '',
    Source_Record_ID: config.sourceRecordId || '',
    Revenue_Date: config.date || now,
    Amount: Number(config.amount || 0) || 0,
    Statement_AR: config.statementAr || '',
    Statement_EN: config.statementEn || '',
    Status_Code: 'APPROVED',
    Search_Text_AR: config.searchTextAr || '',
    Search_Text_EN: config.searchTextEn || '',
    Attachment_Count: 0,
    Created_At: now,
    Created_By: session.username || 'system',
    Updated_At: now,
    Updated_By: session.username || 'system'
  });
  NIJJARA_ROWS_CACHE_['PAR_PartnerRevenue'] = null;
}

function nijjaraRemovePartnerRevenue_(sourceModule, sourceSubModule, sourceRecordId) {
  nijjaraDeleteRows_('PAR_PartnerRevenue', function (row) {
    return String(row.Source_Module || '') === String(sourceModule || '') &&
      String(row.Source_SubModule || '') === String(sourceSubModule || '') &&
      String(row.Source_Record_ID || '') === String(sourceRecordId || '');
  });
  NIJJARA_ROWS_CACHE_['PAR_PartnerRevenue'] = null;
}

function nijjaraFindIncomingCustodyTransaction_(sourceModule, sourceSubModule, sourceRecordId) {
  return nijjaraFindOne_('FIN_CustodyTransactions', function (row) {
    return String(row.Source_Module || '') === String(sourceModule || '') &&
      String(row.Source_SubModule || '') === String(sourceSubModule || '') &&
      String(row.Source_Record_ID || '') === String(sourceRecordId || '');
  });
}

function nijjaraReverseIncomingCustodyTransaction_(transactionRow, session) {
  if (!transactionRow) return;
  var now = nijjaraNow_();
  var account = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === String(transactionRow.CustodyAccount_ID || '');
  });
  if (account) {
    var restoredBalance = (Number(account.Current_Balance || 0) || 0) - (Number(transactionRow.Amount || 0) || 0);
    nijjaraUpdateByRow_('FIN_CustodyAccounts', account.__row, {
      Current_Balance: restoredBalance,
      Last_Balance_Update_At: now,
      Last_Balance_Update_By: session.username,
      Updated_At: now,
      Updated_By: session.username
    });
  }
  nijjaraDeleteRows_('FIN_CustodyTransactions', function (row) {
    return String(row.Source_Module || '') === String(transactionRow.Source_Module || '') &&
      String(row.Source_SubModule || '') === String(transactionRow.Source_SubModule || '') &&
      String(row.Source_Record_ID || '') === String(transactionRow.Source_Record_ID || '');
  });
}

function nijjaraIncomingCustodyTransactionRow_(config, account, before, after, session) {
  var now = nijjaraNow_();
  return {
    CustodyTxn_ID: nijjaraRandomId_('CTX-'),
    CustodyAccount_ID: config.custodyAccountId,
    Transaction_Date: config.date || now,
    Transaction_Type: config.transactionType || 'INCOME',
    Source_Module: config.sourceModule || 'FIN',
    Source_SubModule: config.sourceSubModule || 'REVENUE',
    Source_Record_ID: config.sourceRecordId || '',
    Counterparty_CustodyAccount_ID: '',
    Amount: Number(config.amount || 0) || 0,
    Balance_Before: before,
    Balance_After: after,
    Statement_AR: config.statementAr || '',
    Statement_EN: '',
    Linked_CompanyLedger_ID: '',
    Status_Code: 'APPROVED',
    Search_Text_AR: config.searchTextAr || '',
    Search_Text_EN: config.searchTextEn || '',
    Attachment_Count: 0,
    Created_At: now,
    Created_By: session.username || 'system',
    Updated_At: now,
    Updated_By: session.username || 'system',
    Reviewed_At: '',
    Reviewed_By: '',
    Approved_At: now,
    Approved_By: session.userId || '',
    Rejected_At: '',
    Rejected_By: '',
    Cancelled_At: '',
    Cancelled_By: '',
    Workflow_Code: config.workflowCode || 'REVENUE_CUSTODY_LINK',
    Workflow_Status: 'APPROVED',
    Action_Notes: config.actionNotes || config.statementAr || ''
  };
}

function nijjaraSyncIncomingCustodyTransaction_(config, session) {
  var existingTxn = nijjaraFindIncomingCustodyTransaction_(config.sourceModule, config.sourceSubModule, config.sourceRecordId);
  if (existingTxn) {
    nijjaraReverseIncomingCustodyTransaction_(existingTxn, session);
  }
  if (!String(config.custodyAccountId || '').trim() || (Number(config.amount || 0) || 0) <= 0) return;
  var now = nijjaraNow_();
  var account = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === String(config.custodyAccountId || '');
  });
  if (!account) return;
  var before = Number(account.Current_Balance || 0) || 0;
  var after = before + (Number(config.amount || 0) || 0);
  nijjaraUpdateByRow_('FIN_CustodyAccounts', account.__row, {
    Current_Balance: after,
    Last_Balance_Update_At: now,
    Last_Balance_Update_By: session.username,
    Updated_At: now,
    Updated_By: session.username
  });
  nijjaraAppendRow_('FIN_CustodyTransactions', nijjaraIncomingCustodyTransactionRow_(config, account, before, after, session));
}

function nijjaraRecalculateProjectPaymentState_(projectId, session) {
  if (!String(projectId || '').trim()) return;
  var now = nijjaraNow_();
  var project = nijjaraFindOne_('PRJ_Projects', function (row) {
    return String(row.Project_ID || '') === String(projectId || '');
  });
  if (!project) return;
  var payments = nijjaraFindMany_('PRJ_Payments', function (row) {
    return String(row.Project_ID || '') === String(projectId || '') && nijjaraRowVisible_(row);
  }).sort(function (left, right) {
    var leftDate = String(nijjaraInputDateValue_(left.Payment_Date || '') || '');
    var rightDate = String(nijjaraInputDateValue_(right.Payment_Date || '') || '');
    if (leftDate === rightDate) return Number(left.__row || 0) - Number(right.__row || 0);
    return leftDate.localeCompare(rightDate);
  });
  var budget = Number(project.Project_Budget || 0) || 0;
  var runningReceived = 0;
  payments.forEach(function (row) {
    runningReceived += Number(row.Payment_Amount || 0) || 0;
    nijjaraUpdateByRow_('PRJ_Payments', row.__row, {
      Client_ID: project.Client_ID || row.Client_ID || '',
      Project_Budget: budget,
      Total_Received: runningReceived,
      Remaining_Mount: Math.max(0, budget - runningReceived),
      Project_Status: project.Project_Status || row.Project_Status || '',
      Updated_At: now,
      Updated_By: session.userId || session.username || ''
    });
  });
  nijjaraUpdateByRow_('PRJ_Projects', project.__row, {
    Amount_Received: runningReceived,
    Amount_Remaining: Math.max(0, budget - runningReceived),
    Updated_At: now,
    Updated_By: session.userId || session.username || ''
  });
}

function nijjaraUpsertProjectRevenueMirror_(paymentRow, session, existingRevenueId) {
  var project = nijjaraFindOne_('PRJ_Projects', function (row) {
    return String(row.Project_ID || '') === String(paymentRow.Project_ID || '');
  });
  var projectLabel = project ? (project.Project_Name_AR || project.Project_Name_EN || paymentRow.Project_ID || '') : (paymentRow.Project_ID || '');
  var marker = 'AUTO_PROJECT_PAYMENT:' + String(paymentRow.Prj_Payment_ID || '');
  var patch = {
    Date: nijjaraInputDateValue_(paymentRow.Payment_Date),
    Amount: Number(paymentRow.Payment_Amount || 0) || 0,
    RevChannel_ID: 'REVC-0003',
    Project_ID: paymentRow.Project_ID || '',
    Notes: 'تحصيل مشروع',
    Statement_AR: 'تحصيل مشروع: ' + projectLabel,
    Statement_EN: marker,
    CustodyAccount_ID: paymentRow.CustodyAccount_ID || '',
    Status_Code: 'APPROVED',
    Search_Text_AR: [projectLabel, paymentRow.Project_ID || '', paymentRow.Client_ID || ''].join(' | '),
    Search_Text_EN: marker,
    Attachment_Count: 0,
    Updated_At: nijjaraNow_(),
    Updated_By: session.userId || session.username || ''
  };
  if (existingRevenueId) {
    var existingRevenue = nijjaraFindOne_('FIN_Revenue', function (row) {
      return String(row.Income_ID || '') === String(existingRevenueId || '');
    });
    if (existingRevenue) {
      nijjaraUpdateByRow_('FIN_Revenue', existingRevenue.__row, patch);
      return existingRevenueId;
    }
  }
  var found = nijjaraFindOne_('FIN_Revenue', function (row) {
    return String(row.Statement_EN || '') === marker;
  });
  if (found) {
    nijjaraUpdateByRow_('FIN_Revenue', found.__row, patch);
    return found.Income_ID;
  }
  patch.Income_ID = nijjaraNextModuleId_('FIN_Revenue', 'Income_ID', 'REV-');
  patch.Created_At = nijjaraNow_();
  patch.Created_By = session.userId || session.username || '';
  nijjaraAppendRow_('FIN_Revenue', patch);
  return patch.Income_ID;
}

function nijjaraDeleteProjectRevenueMirror_(paymentId) {
  var marker = 'AUTO_PROJECT_PAYMENT:' + String(paymentId || '');
  nijjaraDeleteRows_('FIN_Revenue', function (row) {
    return String(row.Statement_EN || '') === marker;
  });
}

function nijjaraRecalculateInternalChannelTotals_(internalChannelId, session) {
  if (!String(internalChannelId || '').trim()) return;
  var now = nijjaraNow_();
  var channel = nijjaraFindOne_('INCH_InternalChannels', function (row) {
    return String(row.InternalChannel_ID || '') === String(internalChannelId || '');
  });
  if (!channel) return;
  var payments = nijjaraFindMany_('INCH_InternalRevenuePayments', function (row) {
    return String(row.InternalChannel_ID || '') === String(internalChannelId || '') && nijjaraRowVisible_(row);
  });
  var totalReceived = payments.reduce(function (sum, row) {
    return sum + (Number(row.Payment_Amount || 0) || 0);
  }, 0);
  var orderPrice = Number(channel.Order_Price || 0) || 0;
  var totalRemaining = Math.max(0, orderPrice - totalReceived);
  nijjaraUpdateByRow_('INCH_InternalChannels', channel.__row, {
    Total_Received: totalReceived,
    Total_Remaining: totalRemaining,
    Updated_At: now,
    Updated_By: session.userId || session.username || ''
  });
}

function nijjaraGetModuleDataset(sessionToken, moduleKey) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, moduleKey, 'view');
  return JSON.stringify(nijjaraGetModuleDataset_(session, moduleKey, false, null));
}

function nijjaraQueryModuleDataset(sessionToken, moduleKey, query) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, moduleKey, 'view');
  return JSON.stringify(nijjaraGetModuleDataset_(session, moduleKey, true, query || {}));
}

function nijjaraGetModuleRecord(sessionToken, moduleKey, recordId) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, moduleKey, 'view');
  return JSON.stringify(nijjaraGetModuleRecord_(session, moduleKey, recordId));
}

function nijjaraBuildModuleRecordPayload_(moduleKey, spec, row, context, attachments) {
  if (!spec || !row) throw new Error('Record not found.');
  var built = spec.rowBuilder(row, context);
  if (!built) throw new Error('Record not found.');
  return {
    id: built.id,
    values: built.values || {},
    formValues: built.formValues || {},
    attachments: attachments || []
  };
}

function nijjaraSaveModuleRecord(sessionToken, moduleKey, payload, recordId) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');

  // Route unified payment to the appropriate target module
  if (moduleKey === 'recordPayment') {
    var rpType = String(((payload || {}).paymentType) || '').trim().toUpperCase();
    moduleKey = rpType === 'PROJECT_PAYMENT' ? 'projectRevenueTracking' : 'internalRevenuePayments';
    nijjaraEnsureRevenuePaymentSchema_();
  }

  nijjaraGuardAccess_(session, moduleKey, recordId ? 'edit' : 'create');

  var spec = nijjaraModuleSpec_(moduleKey);
  if (!spec) throw new Error('Unsupported module.');

  var rawPayload = payload || {};
  var attachments = nijjaraNormalizeAttachmentPayload_(rawPayload.attachments);
  if (moduleKey === 'projectRevenueTracking' || moduleKey === 'collections' || moduleKey === 'internalRevenuePayments') {
    nijjaraEnsureRevenuePaymentSchema_();
  }
  var normalized = nijjaraNormalizePayloadForModule_(moduleKey, rawPayload);
  var now = nijjaraNow_();
  var context = nijjaraLookupContext_();
  var existing = recordId ? nijjaraFindOne_(spec.sheetName, function (row) {
    return String(row[spec.idField]) === String(recordId);
  }) : null;
  var isNewRecord = !existing;
  var beforeBuilt = existing ? spec.rowBuilder(existing, context) : null;

  var persistedRow = null;
  var persistedRowNumber = existing ? existing.__row : 0;
  if (existing) {
    normalized.Updated_At = now;
    normalized.Updated_By = session.userId;
    nijjaraUpdateByRow_(spec.sheetName, existing.__row, normalized);
    persistedRow = Object.assign({}, existing, normalized);
    nijjaraAudit_(
      spec.moduleCode,
      spec.subModuleCode,
      'UPDATE',
      'MEDIUM',
      'SUCCESS',
      session.userId,
      'تم تعديل سجل ' + spec.entityLabelAr,
      'تم تعديل السجل رقم ' + recordId + ' بواسطة ' + session.username,
      {
        sourceRecordId: recordId,
        actorUsername: session.username,
        actorDisplayAr: session.displayName,
        changedFieldsJson: JSON.stringify({
          kind: 'update',
          recordId: recordId,
          before: nijjaraAuditSnapshotForModule_(moduleKey, beforeBuilt),
          after: nijjaraAuditSnapshotForModule_(moduleKey, spec.rowBuilder(persistedRow, context))
        })
      }
    );
  } else {
    normalized[spec.idField] = nijjaraNextModuleId_(spec.sheetName, spec.idField, spec.idPrefix);
    normalized.Created_At = now;
    normalized.Created_By = session.userId;
    normalized.Updated_At = now;
    normalized.Updated_By = session.userId;
    if (normalized.Is_Active === undefined) normalized.Is_Active = true;
    persistedRowNumber = nijjaraAppendRow_(spec.sheetName, normalized);
    recordId = normalized[spec.idField];
    persistedRow = Object.assign({}, normalized);
    nijjaraAudit_(
      spec.moduleCode,
      spec.subModuleCode,
      'CREATE',
      'MEDIUM',
      'SUCCESS',
      session.userId,
      'تم إنشاء سجل ' + spec.entityLabelAr,
      'تم إنشاء السجل رقم ' + recordId + ' بواسطة ' + session.username,
      {
        sourceRecordId: recordId,
        actorUsername: session.username,
        actorDisplayAr: session.displayName,
        changedFieldsJson: JSON.stringify({
          kind: 'create',
          recordId: recordId,
          after: nijjaraAuditSnapshotForModule_(moduleKey, spec.rowBuilder(normalized, context))
        })
      }
    );
  }

  if (moduleKey === 'expenses') {
    nijjaraSyncExpenseCustodyTransaction_(existing, normalized, recordId, session);
    // If the expense catalog entry is linked to a partner (e.g. CNC machine), cascade to partner revenue
    var expPartnerId = nijjaraGetExpenseLinkedPartner_(normalized.Expense || '');
    if (expPartnerId) {
      nijjaraUpsertPartnerRevenue_({
        partnerId: expPartnerId,
        sourceModule: 'FIN',
        sourceSubModule: 'EXPENSES',
        sourceRecordId: recordId,
        amount: normalized.Amount || 0,
        date: normalized.Date || now,
        statementAr: 'إيراد ماكينة من مصروف: ' + (normalized.Expense || ''),
        searchTextAr: [normalized.Expense || '', normalized.Project_ID || ''].join(' | '),
        searchTextEn: ['MACHINE_EXPENSE', recordId].join(' | ')
      }, session);
    }
  }
  if (moduleKey === 'projectRevenueTracking' || moduleKey === 'collections') {
    var paymentProjectId = normalized.Project_ID || (existing && existing.Project_ID) || '';
    if (paymentProjectId) {
      nijjaraRecalculateProjectPaymentState_(paymentProjectId, session);
    }
    var refreshedPayment = nijjaraFindOne_('PRJ_Payments', function (row) {
      return String(row.Prj_Payment_ID || '') === String(recordId || '');
    }) || persistedRow;
    if (refreshedPayment) {
      nijjaraUpsertProjectRevenueMirror_(refreshedPayment, session);
      var paymentProject = nijjaraFindOne_('PRJ_Projects', function (row) {
        return String(row.Project_ID || '') === String(refreshedPayment.Project_ID || '');
      });
      var paymentProjectLabel = paymentProject
        ? (paymentProject.Project_Name_AR || paymentProject.Project_Name_EN || refreshedPayment.Project_ID || '')
        : (refreshedPayment.Project_ID || '');
      nijjaraSyncIncomingCustodyTransaction_({
        custodyAccountId: refreshedPayment.CustodyAccount_ID || '',
        amount: refreshedPayment.Payment_Amount || 0,
        date: nijjaraInputDateValue_(refreshedPayment.Payment_Date) || now,
        sourceModule: 'PRJ',
        sourceSubModule: 'PROJECT_PAYMENTS',
        sourceRecordId: refreshedPayment.Prj_Payment_ID || recordId,
        workflowCode: 'PROJECT_PAYMENT_CUSTODY_LINK',
        transactionType: 'PAYMENT_IN',
        statementAr: 'تحصيل وارد لمشروع: ' + paymentProjectLabel,
        searchTextAr: [paymentProjectLabel, refreshedPayment.Project_ID || '', refreshedPayment.Client_ID || ''].join(' | '),
        searchTextEn: ['PROJECT_PAYMENT', refreshedPayment.Prj_Payment_ID || recordId].join(' | ')
      }, session);
      persistedRow = refreshedPayment;
    }
  }
  if (moduleKey === 'internalRevenuePayments') {
    var internalChannelId = normalized.InternalChannel_ID || (existing && existing.InternalChannel_ID) || '';
    if (internalChannelId) {
      nijjaraRecalculateInternalChannelTotals_(internalChannelId, session);
    }
    var refreshedPayment = nijjaraFindOne_('INCH_InternalRevenuePayments', function (row) {
      return String(row.InternalPayment_ID || '') === String(recordId || '');
    }) || persistedRow;
    if (refreshedPayment) {
      var internalChannel = nijjaraFindOne_('INCH_InternalChannels', function (row) {
        return String(row.InternalChannel_ID || '') === String(refreshedPayment.InternalChannel_ID || '');
      });
      var channelRevChannelId = internalChannel ? (String(internalChannel.RevChannel_ID || '').trim() || '') : '';
      var channelLabel = internalChannel
        ? (internalChannel.InternalChannel_AR || internalChannel.InternalChannel_EN || refreshedPayment.InternalChannel_ID || '')
        : (refreshedPayment.InternalChannel_ID || '');
      var channelLinkedPartnerId = channelRevChannelId ? nijjaraGetChannelLinkedPartner_(channelRevChannelId) : null;
      if (channelLinkedPartnerId) {
        // Partner-exclusive channel: route to partner revenue, reverse any existing custody txn
        var existingPartnerCustodyTxn = nijjaraFindIncomingCustodyTransaction_('FIN', 'INTERNAL_REVENUE', refreshedPayment.InternalPayment_ID || recordId);
        if (existingPartnerCustodyTxn) {
          nijjaraReverseIncomingCustodyTransaction_(existingPartnerCustodyTxn, session);
        }
        nijjaraUpsertPartnerRevenue_({
          partnerId: channelLinkedPartnerId,
          sourceModule: 'FIN',
          sourceSubModule: 'INTERNAL_REVENUE',
          sourceRecordId: refreshedPayment.InternalPayment_ID || recordId,
          amount: refreshedPayment.Payment_Amount || 0,
          date: nijjaraInputDateValue_(refreshedPayment.Payment_Date) || now,
          statementAr: refreshedPayment.Statement_AR || ('إيراد شريك - ' + channelLabel),
          searchTextAr: [channelLabel, refreshedPayment.Statement_AR || ''].join(' | '),
          searchTextEn: ['PARTNER_REVENUE', refreshedPayment.InternalPayment_ID || recordId].join(' | ')
        }, session);
      } else {
        nijjaraSyncIncomingCustodyTransaction_({
          custodyAccountId: refreshedPayment.CustodyAccount_ID || '',
          amount: refreshedPayment.Payment_Amount || 0,
          date: nijjaraInputDateValue_(refreshedPayment.Payment_Date) || now,
          sourceModule: 'FIN',
          sourceSubModule: 'INTERNAL_REVENUE',
          sourceRecordId: refreshedPayment.InternalPayment_ID || recordId,
          workflowCode: 'INTERNAL_REVENUE_CUSTODY_LINK',
          transactionType: 'PAYMENT_IN',
          statementAr: refreshedPayment.Statement_AR || ('إيراد داخلي: ' + channelLabel),
          searchTextAr: [channelLabel, refreshedPayment.Statement_AR || ''].join(' | '),
          searchTextEn: ['INTERNAL_REVENUE', refreshedPayment.InternalPayment_ID || recordId].join(' | ')
        }, session);
      }
      persistedRow = refreshedPayment;
    }
  }
  if (moduleKey === 'projectBudgets') {
    var projectId = normalized.Project_ID || '';
    if (projectId) {
      nijjaraApplyProjectBudgetCascade_(projectId, normalized.New_Budget || 0, normalized.Revision_Date || now, session.userId, session.username);
    }
  }

  var linkedAttachments = nijjaraSaveRecordAttachments_(spec.moduleCode, spec.subModuleCode, recordId, attachments, session);
  var attachmentPatch = {
    Attachment_Count: linkedAttachments.length,
    Updated_At: now,
    Updated_By: session.userId
  };
  nijjaraUpdateByRow_(spec.sheetName, persistedRowNumber, attachmentPatch);
  persistedRow = Object.assign({}, persistedRow || {}, attachmentPatch);

  var savedRecord = nijjaraBuildModuleRecordPayload_(moduleKey, spec, persistedRow, context, linkedAttachments);
  nijjaraClearModuleDatasetCache_(moduleKey);
  nijjaraClearBootstrapCacheForUser_(session.userId);
  nijjaraClearSharedCaches_();
  return {
    success: true,
    recordId: recordId,
    created: isNewRecord,
    record: savedRecord
  };
}

function nijjaraDeleteModuleRecord(sessionToken, moduleKey, recordId) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, moduleKey, 'edit');

  var spec = nijjaraModuleSpec_(moduleKey);
  if (!spec) throw new Error('Unsupported module.');

  var existing = nijjaraFindOne_(spec.sheetName, function (row) {
    return String(row[spec.idField]) === String(recordId);
  });
  if (!existing) throw new Error('Record not found.');
  if (moduleKey === 'users' && !nijjaraCanManageProtectedSystemUser_(session, existing)) {
    throw new Error('This system user is protected and only the main super admin can adjust its access rights or account record.');
  }
  var existingPaymentProjectId = '';
  var existingRevenueChannelId = '';
  if (moduleKey === 'expenses') {
    nijjaraRemoveExpenseCustodyTransaction_(recordId, session);
    nijjaraRemovePartnerRevenue_('FIN', 'EXPENSES', recordId);
  }
  if (moduleKey === 'projectRevenueTracking' || moduleKey === 'collections') {
    existingPaymentProjectId = existing.Project_ID || '';
    var existingPaymentTxn = nijjaraFindIncomingCustodyTransaction_('PRJ', 'PROJECT_PAYMENTS', recordId);
    if (existingPaymentTxn) {
      nijjaraReverseIncomingCustodyTransaction_(existingPaymentTxn, session);
    }
    nijjaraDeleteProjectRevenueMirror_(recordId);
  }
  if (moduleKey === 'internalRevenuePayments') {
    existingRevenueChannelId = existing.InternalChannel_ID || '';
    var existingInternalRevenueTxn = nijjaraFindIncomingCustodyTransaction_('FIN', 'INTERNAL_REVENUE', recordId);
    if (existingInternalRevenueTxn) {
      nijjaraReverseIncomingCustodyTransaction_(existingInternalRevenueTxn, session);
    }
    nijjaraRemovePartnerRevenue_('FIN', 'INTERNAL_REVENUE', recordId);
  }

  var patch = {
    Updated_At: nijjaraNow_(),
    Updated_By: session.userId
  };
  if ('Is_Active' in existing) {
    patch.Is_Active = false;
  } else if ('Status_Code' in existing) {
    patch.Status_Code = 'ARCHIVED';
  } else if ('Status' in existing) {
    patch.Status = 'ARCHIVED';
  }
  nijjaraUpdateByRow_(spec.sheetName, existing.__row, patch);

  nijjaraAudit_(
    spec.moduleCode,
    spec.subModuleCode,
    'DELETE',
    'HIGH',
    'SUCCESS',
    session.userId,
    'تم إخفاء سجل ' + spec.entityLabelAr,
    'تم إخفاء السجل رقم ' + recordId + ' بواسطة ' + session.username,
    {
      sourceRecordId: recordId,
      actorUsername: session.username,
      actorDisplayAr: session.displayName,
      changedFieldsJson: JSON.stringify({
        kind: 'delete',
        recordId: recordId,
        before: nijjaraAuditSnapshotForModule_(moduleKey, spec.rowBuilder(existing, nijjaraLookupContext_()))
      })
    }
  );

  if ((moduleKey === 'projectRevenueTracking' || moduleKey === 'collections') && existingPaymentProjectId) {
    nijjaraRecalculateProjectPaymentState_(existingPaymentProjectId, session);
  }
  if (moduleKey === 'internalRevenuePayments' && existingRevenueChannelId) {
    nijjaraRecalculateInternalChannelTotals_(existingRevenueChannelId, session);
  }

  nijjaraClearModuleDatasetCache_(moduleKey);
  nijjaraClearBootstrapCacheForUser_(session.userId);
  nijjaraClearSharedCaches_();
  return { ok: true };
}

function nijjaraDefaultSortColumnType_(sortKey, columns) {
  var column = (columns || []).filter(function (item) { return item.key === sortKey; })[0];
  if (column && column.type) return column.type;
  var key = String(sortKey || '').toLowerCase();
  if (key.indexOf('date') !== -1 || key.indexOf('time') !== -1 || key.indexOf('created') !== -1 || key.indexOf('updated') !== -1 || key.indexOf('login') !== -1) return 'datetime';
  if (key.indexOf('amount') !== -1 || key.indexOf('balance') !== -1 || key.indexOf('budget') !== -1 || key.indexOf('value') !== -1 || key.indexOf('count') !== -1) return 'number';
  return 'text';
}

function nijjaraApplyDefaultSort_(rows, spec, query) {
  if (!spec || !spec.defaultSort || !spec.defaultSort.key) return rows;
  if (query && query.sortKey) return rows;
  var sortKey = spec.defaultSort.key;
  var sortDir = String(spec.defaultSort.dir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
  var columnType = nijjaraDefaultSortColumnType_(sortKey, spec.columns);
  return rows.slice().sort(function (left, right) {
    var comparison = nijjaraCompareGridValues_(left && left.values ? left.values[sortKey] : '', right && right.values ? right.values[sortKey] : '', columnType);
    return sortDir === 'desc' ? -comparison : comparison;
  });
}

function nijjaraGetModuleDataset_(session, moduleKey, bypassCache, query) {
  var cache = CacheService.getScriptCache();
  var cacheKey = nijjaraModuleDatasetCacheKey_(moduleKey, session);
  var useServerQuery = !!query;
  if (!bypassCache && !useServerQuery) {
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  var spec = nijjaraModuleSpec_(moduleKey);
  if (!spec) throw new Error('Unsupported module.');

  var rows = nijjaraApplyDefaultSort_(nijjaraGetMaterializedModuleRows_(session, moduleKey, spec), spec, query || {});

  var totalRows = rows.length;
  var pageSize = NIJJARA_GRID_PAGE_SIZE;
  if (useServerQuery) {
    rows = nijjaraApplyQueryToRows_(rows, spec.columns, query || {});
    totalRows = rows.length;
    pageSize = Math.max(1, Number(query.pageSize || NIJJARA_GRID_PAGE_SIZE) || NIJJARA_GRID_PAGE_SIZE);
    var page = Math.max(1, Number(query.page || 1) || 1);
    var start = (page - 1) * pageSize;
    rows = rows.slice(start, start + pageSize);
  }

  var payload = {
    moduleKey: moduleKey,
    label: spec.label,
    pageSize: pageSize,
    defaultSort: spec.defaultSort,
    columns: spec.columns,
    rows: rows,
    totalRows: totalRows,
    serverPaged: useServerQuery,
    canCreate: nijjaraHasAccess_(session, moduleKey, 'create'),
    canEdit: nijjaraHasAccess_(session, moduleKey, 'edit'),
    canDelete: nijjaraHasAccess_(session, moduleKey, 'edit')
  };

  if (!useServerQuery) {
    var serializedPayload = JSON.stringify(payload);
    if (serializedPayload.length <= 90000) {
      cache.put(cacheKey, serializedPayload, 180);
    }
  }
  return payload;
}

function nijjaraApplyQueryToRows_(rows, columns, query) {
  query = query || {};
  var filters = query.filters || {};
  var dateFilters = query.dateFilters || {};
  var sortKey = String(query.sortKey || '');
  var sortDir = String(query.sortDir || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

  var filtered = rows.filter(function (row) {
    return columns.every(function (column) {
      if (column.filterType === 'none') return true;
      var value = row.values ? row.values[column.key] : '';
      if (column.filterType === 'date') {
        return nijjaraMatchesDateFilter_(value, dateFilters[column.key]);
      }
      var filterText = nijjaraNormalizeSearchTerm_(filters[column.key] || '');
      if (!filterText) return true;
      return nijjaraNormalizeSearchTerm_(nijjaraFilterValueForColumn_(value)).indexOf(filterText) !== -1;
    });
  });

  var column = columns.filter(function (item) { return item.key === sortKey; })[0];
  if (!column || !column.sortable) {
    return filtered;
  }
  return filtered.sort(function (left, right) {
    var comparison = nijjaraCompareGridValues_(left.values[column.key], right.values[column.key], column.type);
    return sortDir === 'desc' ? -comparison : comparison;
  });
}

function nijjaraNormalizeSearchTerm_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

function nijjaraFilterValueForColumn_(value) {
  if (value == null) return '';
  if (typeof value === 'object' && value.ar !== undefined) {
    return [value.ar, value.en].join(' | ');
  }
  return String(value);
}

function nijjaraMatchesDateFilter_(value, filter) {
  filter = filter || null;
  var dateOnly = nijjaraInputDateValue_(value);
  if (!filter) return true;
  if (!dateOnly) return false;
  if (filter.mode === 'exact' && filter.exact) return dateOnly === filter.exact;
  if (filter.mode === 'range') {
    if (filter.from && dateOnly < filter.from) return false;
    if (filter.to && dateOnly > filter.to) return false;
  }
  return true;
}

function nijjaraCompareGridValues_(left, right, columnType) {
  if (columnType === 'money' || columnType === 'number') {
    return (Number(left || 0) || 0) - (Number(right || 0) || 0);
  }
  if (columnType === 'date') {
    return String(left || '').localeCompare(String(right || ''));
  }
  if (columnType === 'datetime') {
    return String(left || '').localeCompare(String(right || ''));
  }
  if (left && typeof left === 'object' && left.ar !== undefined) {
    left = [left.ar, left.en].join(' ');
  }
  if (right && typeof right === 'object' && right.ar !== undefined) {
    right = [right.ar, right.en].join(' ');
  }
  return String(left || '').localeCompare(String(right || ''), 'ar');
}

function nijjaraGetModuleRecord_(session, moduleKey, recordId) {
  var spec = nijjaraModuleSpec_(moduleKey);
  if (!spec) throw new Error('Unsupported module.');
  var context = moduleKey === 'users' ? nijjaraUsersLookupContext_(session) : nijjaraLookupContext_();
  var row = nijjaraFindOne_(spec.sheetName, function (entry) {
    return String(entry[spec.idField] || '') === String(recordId || '');
  });
  if (!row) {
    throw new Error('Record not found.');
  }
  if (spec.rowVisible ? !spec.rowVisible(row) : !nijjaraRowVisible_(row)) {
    throw new Error('Record not found.');
  }
  if (!nijjaraCanSessionViewRow_(session, moduleKey, row)) {
    throw new Error('Record not found.');
  }
  return nijjaraBuildModuleRecordPayload_(moduleKey, spec, row, context, nijjaraListRecordAttachments_(spec.moduleCode, spec.subModuleCode, recordId));
}

function nijjaraClearModuleDatasetCache_(moduleKey) {
  var cache = CacheService.getScriptCache();
  cache.remove(nijjaraModuleDatasetCacheKey_(moduleKey));
  cache.remove('moduledata:' + moduleKey);
  cache.remove('moduledata:v2:' + moduleKey);
  cache.remove('moduledata:v4:' + moduleKey);
  if (NIJJARA_RUNTIME_CACHE && NIJJARA_RUNTIME_CACHE.moduleRows) {
    NIJJARA_RUNTIME_CACHE.moduleRows = {};
  }
}

function nijjaraClearBootstrapCacheForUser_(userId) {
  var cache = CacheService.getScriptCache();
  cache.remove('bootstrap:' + userId);
  cache.remove('bootstrap:v2:' + userId);
}

function nijjaraLookupContext_() {
  if (NIJJARA_RUNTIME_CACHE.lookupContext) return NIJJARA_RUNTIME_CACHE.lookupContext;
  var employeeById = {};
  var employeeByEmail = {};
  nijjaraRows_('HRM_Employees').forEach(function (row) {
    var employeeId = String(row.Employee_ID || '').trim();
    var email = String(row.Email || '').trim().toLowerCase();
    if (employeeId) employeeById[employeeId] = row;
    if (email) employeeByEmail[email] = row;
  });

  var clients = {};
  nijjaraRows_('PRJ_Clients').forEach(function (row) {
    clients[String(row.Client_ID)] = {
      ar: row.Client_Name_AR || row.Client_ID || '',
      en: row.Client_Name_EN || ''
    };
  });

  var projects = {};
  nijjaraRows_('PRJ_Projects').forEach(function (row) {
    projects[String(row.Project_ID)] = {
      ar: row.Project_Name_AR || row.Project_ID || '',
      en: row.Project_Name_EN || '',
      status: row.Project_Status || '',
      clientId: row.Client_ID || ''
    };
  });

  var custodyAccounts = {};
  nijjaraRows_('FIN_CustodyAccounts').forEach(function (row) {
    custodyAccounts[String(row.CustodyAccount_ID)] = {
      ar: row.CustodyAccount_AR || row.Linked_ID || row.CustodyAccount_ID || '',
      en: '',
      balance: Number(row.Current_Balance || 0) || 0
    };
  });

  var revenueChannels = {};
  nijjaraRows_('FIN_RevenueChannels').forEach(function (row) {
    revenueChannels[String(row.RevChannel_ID)] = {
      ar: row.RevChannel_AR || row.RevChannel_ID || '',
      en: row.RevChannel_EN || ''
    };
  });

  var internalChannels = {};
  nijjaraRows_('INCH_InternalChannels').forEach(function (row) {
    internalChannels[String(row.InternalChannel_ID || '')] = {
      ar: row.InternalChannel_AR || row.InternalChannel_ID || '',
      en: row.InternalChannel_EN || '',
      revChannelId: row.RevChannel_ID || '',
      orderPrice: Number(row.Order_Price || 0) || 0,
      totalReceived: Number(row.Total_Received || 0) || 0,
      totalRemaining: Number(row.Total_Remaining || 0) || 0
    };
  });

  var allocationChannels = {};
  nijjaraRows_('FIN_AllocationChannels').forEach(function (row) {
    allocationChannels[String(row.AlloChannel_ID)] = {
      ar: row.AlloChannel_AR || row.AlloChannel_ID || '',
      en: row.AlloChannel_EN || ''
    };
  });

  var expenseCatalogByName = {};
  nijjaraRows_('SET_ExpenseCatalog').forEach(function (row) {
    if (String(row.Is_Active).toLowerCase() === 'false') return;
    var entry = {
      ar: row.ExpenseName_AR || row.ExpCat_ID || '',
      en: row.ExpenseName_EN || ''
    };
    [row.ExpenseName_AR, row.ExpenseName_EN].forEach(function (name) {
      var key = String(name || '').trim().toLowerCase();
      if (key) expenseCatalogByName[key] = entry;
    });
  });

  var userRoleCodesByUserId = {};
  nijjaraRows_('SYS_UserRoles').forEach(function (row) {
    if (String(row.Is_Active).toLowerCase() === 'false') return;
    var userId = String(row.User_ID || '').trim();
    var roleCode = String(row.Role_Code || '').trim();
    if (!userId || !roleCode) return;
    if (!userRoleCodesByUserId[userId]) userRoleCodesByUserId[userId] = [];
    userRoleCodesByUserId[userId].push(roleCode);
  });

  var userPermissionCodesByUserId = {};
  nijjaraUserPermissionRows_().forEach(function (row) {
    if (String(row.Is_Active).toLowerCase() === 'false') return;
    var userId = String(row.User_ID || '').trim();
    var permCode = String(row.Perm_Code || '').trim();
    if (!userId || !permCode) return;
    if (!userPermissionCodesByUserId[userId]) userPermissionCodesByUserId[userId] = [];
    userPermissionCodesByUserId[userId].push(permCode);
  });

  var userAccessRulesByUserId = {};
  if (typeof nijjaraUserAccessRuleRows_ === 'function') {
    nijjaraUserAccessRuleRows_().forEach(function (row) {
      if (String(row.Is_Active).toLowerCase() === 'false') return;
      var userId = String(row.User_ID || '').trim();
      if (!userId) return;
      if (!userAccessRulesByUserId[userId]) userAccessRulesByUserId[userId] = [];
      userAccessRulesByUserId[userId].push({
        moduleKey: String(row.Module_Key || ''),
        view: row.View_Access,
        create: row.Create_Access,
        edit: row.Edit_Access,
        action: row.Action_Access,
        scopeCode: String(row.Scope_Code || 'INHERIT')
      });
    });
  }

  NIJJARA_RUNTIME_CACHE.lookupContext = {
    clients: clients,
    projects: projects,
    custodyAccounts: custodyAccounts,
    revenueChannels: revenueChannels,
    internalChannels: internalChannels,
    allocationChannels: allocationChannels,
    expenseCatalogByName: expenseCatalogByName,
    employeeById: employeeById,
    employeeByEmail: employeeByEmail,
    userRoleCodesByUserId: userRoleCodesByUserId,
    userPermissionCodesByUserId: userPermissionCodesByUserId,
    userAccessRulesByUserId: userAccessRulesByUserId
  };
  return NIJJARA_RUNTIME_CACHE.lookupContext;
}

function nijjaraUsersLookupContext_(session) {
  var sessionUserId = String(session && session.userId || '');
  if (NIJJARA_RUNTIME_CACHE.usersLookupContext && NIJJARA_RUNTIME_CACHE.usersLookupContext.__sessionUserId === sessionUserId) {
    return NIJJARA_RUNTIME_CACHE.usersLookupContext;
  }
  var employeeById = {};
  var employeeByEmail = {};
  nijjaraRows_('HRM_Employees').forEach(function (row) {
    var employeeId = String(row.Employee_ID || '').trim();
    var email = String(row.Email || '').trim().toLowerCase();
    if (employeeId) employeeById[employeeId] = row;
    if (email) employeeByEmail[email] = row;
  });

  var userRoleCodesByUserId = {};
  nijjaraRows_('SYS_UserRoles').forEach(function (row) {
    if (String(row.Is_Active).toLowerCase() === 'false') return;
    var userId = String(row.User_ID || '').trim();
    var roleCode = String(row.Role_Code || '').trim();
    if (!userId || !roleCode) return;
    if (!userRoleCodesByUserId[userId]) userRoleCodesByUserId[userId] = [];
    userRoleCodesByUserId[userId].push(roleCode);
  });

  var userPermissionCodesByUserId = {};
  nijjaraUserPermissionRows_().forEach(function (row) {
    if (String(row.Is_Active).toLowerCase() === 'false') return;
    var userId = String(row.User_ID || '').trim();
    var permCode = String(row.Perm_Code || '').trim();
    if (!userId || !permCode) return;
    if (!userPermissionCodesByUserId[userId]) userPermissionCodesByUserId[userId] = [];
    userPermissionCodesByUserId[userId].push(permCode);
  });

  var userAccessRulesByUserId = {};
  if (typeof nijjaraUserAccessRuleRows_ === 'function') {
    nijjaraUserAccessRuleRows_().forEach(function (row) {
      if (String(row.Is_Active).toLowerCase() === 'false') return;
      var userId = String(row.User_ID || '').trim();
      if (!userId) return;
      if (!userAccessRulesByUserId[userId]) userAccessRulesByUserId[userId] = [];
      userAccessRulesByUserId[userId].push({
        moduleKey: String(row.Module_Key || ''),
        view: row.View_Access,
        create: row.Create_Access,
        edit: row.Edit_Access,
        action: row.Action_Access,
        scopeCode: String(row.Scope_Code || 'INHERIT')
      });
    });
  }

  NIJJARA_RUNTIME_CACHE.usersLookupContext = {
    __sessionUserId: sessionUserId,
    employeeById: employeeById,
    employeeByEmail: employeeByEmail,
    userRoleCodesByUserId: userRoleCodesByUserId,
    userPermissionCodesByUserId: userPermissionCodesByUserId,
    userAccessRulesByUserId: userAccessRulesByUserId,
    canManageProtectedSystemUser: !!(session && nijjaraCanManageProtectedSystemUser_(session, NIJJARA_CONFIG.protectedSystemUserId))
  };
  return NIJJARA_RUNTIME_CACHE.usersLookupContext;
}

function nijjaraModuleRowsCacheKey_(session, moduleKey) {
  if (typeof nijjaraIsEmployeeScopedSession_ === 'function' && nijjaraIsEmployeeScopedSession_(session)) {
    return String(moduleKey || '') + '::' + String(session.userId || 'anon');
  }
  return String(moduleKey || '') + '::global';
}

function nijjaraCanSessionViewRow_(session, moduleKey, row) {
  if (!session) return false;
  var scopeCode = typeof nijjaraResolveScopeForModule_ === 'function'
    ? nijjaraResolveScopeForModule_(session, moduleKey)
    : 'ALL';
  if (scopeCode === 'ALL') {
    return true;
  }
  if (scopeCode === 'NONE') {
    return false;
  }

  var employeeId = String(session.linkedEmployeeId || '').trim();
  var userId = String(session.userId || '').trim();
  var username = String(session.username || '').trim();
  var department = String(session.linkedEmployeeDepartment || '').trim();
  moduleKey = String(moduleKey || '');
  var matchesCreated = row.Created_By !== undefined &&
    (String(row.Created_By || '') === userId || String(row.Created_By || '') === username);
  var matchesEmployee = false;

  if (moduleKey === 'users') {
    matchesEmployee = String(row.User_ID || '') === userId || (employeeId && String(row.Linked_Employee_ID || '') === employeeId);
  } else if (moduleKey === 'employees') {
    matchesEmployee = !!(employeeId && String(row.Employee_ID || '') === employeeId);
  } else if (['attendance', 'leave', 'overtime', 'excuses', 'violations', 'payrollLinkedItems', 'employeesAdvances'].indexOf(moduleKey) !== -1) {
    matchesEmployee = !!(employeeId && String(row.Employee_ID || '') === employeeId);
  } else if (moduleKey === 'payrollExpenses') {
    matchesEmployee = !!(employeeId && nijjaraFindOne_('HRM_PayrollItems', function (item) {
      return nijjaraRowVisible_(item) &&
        String(item.Employee_ID || '') === employeeId &&
        String(item.PayrollRun_ID || '') === String(row.PayrollRun_ID || '');
    }));
  } else if (row.Employee_ID !== undefined) {
    matchesEmployee = !!(employeeId && String(row.Employee_ID || '') === employeeId);
  } else if (row.Linked_Employee_ID !== undefined) {
    matchesEmployee = !!(employeeId && String(row.Linked_Employee_ID || '') === employeeId);
  } else if (row.User_ID !== undefined) {
    matchesEmployee = String(row.User_ID || '') === userId;
  }

  if (scopeCode === 'OWN_CREATED') {
    return matchesCreated;
  }
  if (scopeCode === 'OWN_RELATED') {
    return matchesEmployee;
  }
  if (scopeCode === 'OWN_OR_RELATED') {
    return matchesCreated || matchesEmployee;
  }
  if (scopeCode === 'DEPARTMENT') {
    return department && (String(row.Department_Name_AR || row.Department_AR || row.Department_Code || '') === department);
  }
  return false;
}

function nijjaraGetMaterializedModuleRows_(session, moduleKey, spec) {
  var cacheKey = nijjaraModuleRowsCacheKey_(session, moduleKey);
  if (NIJJARA_RUNTIME_CACHE.moduleRows[cacheKey]) {
    return NIJJARA_RUNTIME_CACHE.moduleRows[cacheKey].slice();
  }
  var context = moduleKey === 'users' ? nijjaraUsersLookupContext_(session) : nijjaraLookupContext_();
  var rows = nijjaraRows_(spec.sheetName)
    .filter(function (row) {
      return (spec.rowVisible ? spec.rowVisible(row) : nijjaraRowVisible_(row)) &&
        nijjaraCanSessionViewRow_(session, moduleKey, row);
    })
    .map(function (row) { return spec.rowBuilder(row, context); })
    .filter(Boolean)
    .map(function (row) {
      return {
        id: row.id,
        values: row.values,
        formValues: row.formValues || row.values
      };
    });
  rows = nijjaraApplyDefaultSort_(rows, spec, null);
  NIJJARA_RUNTIME_CACHE.moduleRows[cacheKey] = rows;
  return rows.slice();
}

function nijjaraRowVisible_(row) {
  if ('Is_Active' in row && String(row.Is_Active).toLowerCase() === 'false') return false;
  if ('Status_Code' in row && String(row.Status_Code).toUpperCase() === 'ARCHIVED') return false;
  if ('Status' in row && String(row.Status).toUpperCase() === 'ARCHIVED') return false;
  return true;
}

function nijjaraBilingualValue_(ar, en) {
  return {
    ar: ar || '—',
    en: en || ''
  };
}

function nijjaraTextValue_(value) {
  return value == null || value === '' ? '—' : String(value);
}

function nijjaraNumberValue_(value) {
  return Number(value || 0) || 0;
}

function nijjaraInputDateValue_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || 'Africa/Cairo', 'yyyy-MM-dd');
  }
  var text = String(value || '').trim();
  if (!text) return '';
  var directMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (directMatch) return [directMatch[1], directMatch[2], directMatch[3]].join('-');
  var slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return [
      slashMatch[3],
      ('0' + slashMatch[2]).slice(-2),
      ('0' + slashMatch[1]).slice(-2)
    ].join('-');
  }
  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone() || 'Africa/Cairo', 'yyyy-MM-dd');
  }
  return text;
}

function nijjaraInputDateTimeValue_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || 'Africa/Cairo', "yyyy-MM-dd'T'HH:mm:ss");
  }
  var text = String(value || '').trim();
  if (!text) return '';
  var isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    var datePart = [isoMatch[1], isoMatch[2], isoMatch[3]].join('-');
    var hours = isoMatch[4] || '00';
    var minutes = isoMatch[5] || '00';
    var seconds = isoMatch[6] || '00';
    return datePart + 'T' + hours + ':' + minutes + ':' + seconds;
  }
  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, Session.getScriptTimeZone() || 'Africa/Cairo', "yyyy-MM-dd'T'HH:mm:ss");
  }
  return text;
}

function nijjaraGenericValue_(raw, columnType) {
  if (columnType === 'money' || columnType === 'number') {
    return nijjaraNumberValue_(raw);
  }
  if (columnType === 'date') {
    return nijjaraInputDateValue_(raw);
  }
  return nijjaraTextValue_(raw);
}

function nijjaraAuditModuleLabel_(moduleCode) {
  var labels = {
    SYS: 'إدارة النظام',
    HRM: 'الموارد البشرية',
    FIN: 'المالية',
    PRJ: 'المشاريع',
    NOT: 'الإشعارات'
  };
  return labels[String(moduleCode || '').toUpperCase()] || String(moduleCode || '—');
}

function nijjaraAuditSubModuleLabel_(subModuleCode) {
  var labels = {
    AUTH: 'المصادقة',
    USERS: 'المستخدمون',
    ROLES: 'الأدوار',
    ACTION_PERMISSIONS: 'صلاحيات الإجراءات',
    EMPLOYEES: 'ملفات الموظفين',
    EXPENSES: 'المصروفات',
    REVENUE: 'الإيرادات',
    COLLECTIONS: 'التحصيلات',
    EMPLOYEE_ADVANCES: 'سلف الموظفين',
    PARTNERS_DATA: 'بيانات الشركاء',
    PROJECTS: 'قاعدة بيانات المشاريع',
    CLIENTS: 'قاعدة بيانات العملاء',
    PROJECT_BUDGETS: 'ميزانيات المشاريع',
    PROJECT_REVENUE_TRACKING: 'متابعة إيرادات المشاريع',
    PROJECT_DIRECT_EXPENSES: 'المصروفات المباشرة للمشاريع',
    PROJECT_STATUS_MONITORING: 'متابعة حالة المشاريع',
    NOTIFICATIONS: 'الإشعارات',
    AUDIT_LOGS: 'سجلات التدقيق',
    CUSTODY_ACCOUNTS: 'حسابات العهدة',
    CUSTODY_TRANSFERS: 'تحويلات العهدة',
    REVENUE_CHANNELS: 'قنوات الإيراد'
  };
  return labels[String(subModuleCode || '').toUpperCase()] || String(subModuleCode || '—');
}

function nijjaraAuditActionLabel_(actionCode) {
  var labels = {
    LOGIN: 'تسجيل الدخول',
    LOGOUT: 'تسجيل الخروج',
    CREATE: 'إنشاء سجل',
    UPDATE: 'تعديل سجل',
    DELETE: 'حذف سجل',
    CREATE_USER: 'إنشاء مستخدم',
    UPDATE_USER: 'تحديث مستخدم',
    OPEN: 'فتح',
    VIEW: 'عرض',
    EDIT: 'تعديل',
    FORGOT_PASSWORD: 'طلب إعادة تعيين كلمة المرور',
    RESET_PASSWORD: 'إعادة تعيين كلمة المرور',
    PASSWORD_RESET: 'إعادة تعيين كلمة المرور',
    APPROVE: 'اعتماد',
    REJECT: 'رفض',
    ADJUST_BALANCE: 'تعديل رصيد',
    TRANSFER_IN: 'تحويل وارد',
    TRANSFER_OUT: 'تحويل صادر'
  };
  return labels[String(actionCode || '').toUpperCase()] || String(actionCode || '—');
}

function nijjaraAuditResultLabel_(resultCode) {
  return String(resultCode || '').toUpperCase() === 'SUCCESS' ? 'نجاح' : 'فشل';
}

function nijjaraAuditActorDisplay_(actorUserId, fallback) {
  if (fallback) return fallback;
  if (!actorUserId) return '—';
  var user = nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.User_ID || '') === String(actorUserId || '');
  });
  return user ? (user.Display_Name_AR || user.Username || actorUserId) : String(actorUserId || '—');
}

function nijjaraAuditDescribeFieldValue_(value) {
  if (value == null || value === '' || value === '—') return '—';
  if (typeof value === 'object' && value.ar !== undefined) {
    return value.en ? [value.ar, value.en].join(' / ') : value.ar;
  }
  if (typeof value === 'number') return String(value);
  return String(value);
}

function nijjaraAuditSnapshotForModule_(moduleKey, builtRecord) {
  if (!builtRecord) return [];
  var schema = (typeof NIJJARA_FORM_SCHEMAS !== 'undefined' && NIJJARA_FORM_SCHEMAS && NIJJARA_FORM_SCHEMAS[moduleKey]) ? NIJJARA_FORM_SCHEMAS[moduleKey] : null;
  var values = builtRecord.values || {};
  var formValues = builtRecord.formValues || {};
  if (schema && schema.summaryFieldKeys && schema.summaryFields) {
    return schema.summaryFieldKeys.map(function (key, index) {
      if (key === 'attachments') return null;
      var value = formValues[key];
      if ((value == null || value === '') && values[key] !== undefined) value = values[key];
      return {
        label: schema.summaryFields[index] || key,
        value: nijjaraAuditDescribeFieldValue_(value)
      };
    }).filter(Boolean);
  }
  return Object.keys(values).map(function (key) {
    return {
      label: key,
      value: nijjaraAuditDescribeFieldValue_(values[key])
    };
  });
}

function nijjaraMakeGenericSpec_(options) {
  return {
    sheetName: options.sheetName,
    idField: options.idField,
    idPrefix: options.idPrefix || '',
    moduleCode: options.moduleCode,
    subModuleCode: options.subModuleCode,
    entityLabelAr: options.entityLabelAr || options.label,
    label: options.label,
    defaultSort: options.defaultSort || { key: 'createdAt', dir: 'desc' },
    rowVisible: options.rowVisible || null,
    columns: options.columns,
    rowBuilder: function (row, ctx) {
      var values = {};
      options.columns.forEach(function (column) {
        if (column.type === 'actions' || column.type === 'view-action' || column.type === 'workflow-actions') return;
        if (column.type === 'bilingual-name') {
          values[column.key] = nijjaraBilingualValue_(row[column.arField], row[column.enField]);
          return;
        }
        var raw = column.value ? column.value(row, ctx) : row[column.field];
        values[column.key] = nijjaraGenericValue_(raw, column.type);
      });
      if (values.createdAt === undefined) {
        values.createdAt = row.Created_At || row.Updated_At || '';
      }
      return {
        id: row[options.idField],
        values: values,
        formValues: values
      };
    }
  };
}

function nijjaraModuleSpec_(moduleKey) {
  var commonActions = { view: true, edit: true, delete: true };
  var specs = {
    employees: {
      sheetName: 'HRM_Employees',
      idField: 'Employee_ID',
      idPrefix: 'EMP-',
      moduleCode: 'HRM',
      subModuleCode: 'EMPLOYEES',
      entityLabelAr: 'موظف',
      label: 'الموظفون',
      defaultSort: { key: 'createdAt', dir: 'desc' },
      columns: [
        { key: 'name', label: 'الموظف', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'jobTitle', label: 'المسمى الوظيفي', type: 'text', filterType: 'text', sortable: true },
        { key: 'department', label: 'الإدارة', type: 'text', filterType: 'text', sortable: true },
        { key: 'contractType', label: 'نوع العقد', type: 'text', filterType: 'text', sortable: true },
        { key: 'mobile', label: 'الجوال', type: 'mobile', filterType: 'text', sortable: true },
        { key: 'basicSalary', label: 'الراتب', type: 'money', filterType: 'number', sortable: true },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true },
        { key: 'hireDate', label: 'تاريخ التعيين', type: 'date', filterType: 'date', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row) {
        return {
          id: row.Employee_ID,
          values: {
            name: nijjaraBilingualValue_(row.Full_Name_AR, row.Full_Name_EN),
            jobTitle: nijjaraTextValue_(row.Job_Title_AR),
            department: nijjaraTextValue_(row.Department_Name_AR),
            contractType: nijjaraTextValue_(row.Contract_Type),
            mobile: nijjaraTextValue_(row.Mobile),
            basicSalary: nijjaraNumberValue_(row.Basic_Salary),
            status: nijjaraTextValue_(row.Status || row.Status_Code || (String(row.Is_Active).toLowerCase() === 'false' ? 'INACTIVE' : 'ACTIVE')),
            hireDate: row.Hire_Date || '',
            createdAt: row.Created_At || row.Hire_Date || ''
          },
          formValues: {
            arabicFullName: row.Full_Name_AR || '',
            englishFullName: row.Full_Name_EN || '',
            email: row.Email || '',
            mobileNumber: row.Mobile || '',
            nationalId: row.National_ID || row.NationalId || '',
            dateOfBirth: nijjaraInputDateValue_(row.Date_Of_Birth || row.DOB || row.Birth_Date || ''),
            hireDate: nijjaraInputDateValue_(row.Hire_Date || ''),
            statusCode: row.Status_Code || row.Status || (String(row.Is_Active).toLowerCase() === 'false' ? 'INACTIVE' : 'ACTIVE'),
            contractType: row.Contract_Type || 'PERMANENT',
            jobTitleArabic: row.Job_Title_AR || '',
            departmentArabic: row.Department_Name_AR || '',
            basicSalary: row.Basic_Salary || ''
          }
        };
      }
    },
    clients: {
      sheetName: 'PRJ_Clients',
      idField: 'Client_ID',
      idPrefix: 'CLI-',
      moduleCode: 'PRJ',
      subModuleCode: 'CLIENTS',
      entityLabelAr: 'عميل',
      label: 'العملاء',
      defaultSort: { key: 'createdAt', dir: 'desc' },
      columns: [
        { key: 'name', label: 'العميل', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'mobile', label: 'الجوال', type: 'mobile', filterType: 'text', sortable: true },
        { key: 'email', label: 'البريد الإلكتروني', type: 'text', filterType: 'text', sortable: true },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true },
        { key: 'createdAt', label: 'تاريخ الإنشاء', type: 'date', filterType: 'date', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row) {
        return {
          id: row.Client_ID,
          values: {
            name: nijjaraBilingualValue_(row.Client_Name_AR, row.Client_Name_EN),
            mobile: nijjaraTextValue_(row.Mobile),
            email: nijjaraTextValue_(row.Email),
            status: nijjaraTextValue_(row.Status_Code || (String(row.Is_Active).toLowerCase() === 'false' ? 'INACTIVE' : 'ACTIVE')),
            createdAt: row.Created_At || ''
          },
          formValues: {
            arabicName: row.Client_Name_AR || '',
            englishName: row.Client_Name_EN || '',
            email: row.Email || '',
            mobileNumber: row.Mobile || '',
            status: row.Status_Code || 'ACTIVE'
          }
        };
      }
    },
    projects: {
      sheetName: 'PRJ_Projects',
      idField: 'Project_ID',
      idPrefix: 'PRJ-',
      moduleCode: 'PRJ',
      subModuleCode: 'PROJECTS',
      entityLabelAr: 'مشروع',
      label: 'المشاريع',
      rowVisible: function (row) {
        return nijjaraRowVisible_(row) ||
          String(row.Project_Status || '').toUpperCase() === 'COMPLETED' ||
          String(row.Project_Status || '') === 'مكتمل';
      },
      defaultSort: { key: 'createdAt', dir: 'desc' },
      columns: [
        { key: 'project', label: 'المشروع', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'client', label: 'العميل', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'projectStatus', label: 'الحالة', type: 'text', filterType: 'text', sortable: true },
        { key: 'budget', label: 'الميزانية', type: 'money', filterType: 'number', sortable: true },
        { key: 'received', label: 'المستلم', type: 'money', filterType: 'number', sortable: true },
        { key: 'estimateEndDate', label: 'تاريخ الانتهاء', type: 'date', filterType: 'date', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row, ctx) {
        var client = ctx.clients[String(row.Client_ID)] || { ar: row.Client_ID || '—', en: '' };
        return {
          id: row.Project_ID,
          values: {
            project: nijjaraBilingualValue_(row.Project_Name_AR, row.Project_Name_EN),
            client: nijjaraBilingualValue_(client.ar, client.en),
            projectStatus: nijjaraTextValue_(row.Project_Status),
            budget: nijjaraNumberValue_(row.Project_Budget),
            received: nijjaraNumberValue_(row.Amount_Received),
            estimateEndDate: row.Estimate_End_Date || '',
            createdAt: row.Created_At || ''
          },
          formValues: {
            arabicName: row.Project_Name_AR || '',
            englishName: row.Project_Name_EN || '',
            clientId: row.Client_ID || '',
            projectStatus: row.Project_Status || 'IN_PROGRESS',
            budget: row.Project_Budget || ''
          }
        };
      }
    },
    expenses: {
      sheetName: 'FIN_Expenses',
      idField: 'Expense_ID',
      idPrefix: 'EXP-',
      moduleCode: 'FIN',
      subModuleCode: 'EXPENSES',
      entityLabelAr: 'مصروف',
      label: 'المصروفات',
      defaultSort: { key: 'date', dir: 'desc' },
      columns: [
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true },
        { key: 'expenseName', label: 'المصروف', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'category', label: 'الفئة', type: 'text', filterType: 'text', sortable: true },
        { key: 'subCategory', label: 'الفئة الفرعية', type: 'text', filterType: 'text', sortable: true },
        { key: 'fromCustody', label: 'من عهدة', type: 'text', filterType: 'text', sortable: true },
        { key: 'project', label: 'المشروع', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'allocationChannel', label: 'قناة التحميل', type: 'text', filterType: 'text', sortable: true },
        { key: 'expenseType', label: 'نوع المصروف', type: 'text', filterType: 'text', sortable: true },
        { key: 'amount', label: 'المبلغ', type: 'money', filterType: 'number', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row, ctx) {
        var custody = ctx.custodyAccounts[String(row.CustodyAccount_ID)] || { ar: row.From_Custody || '—' };
        var allocation = ctx.allocationChannels[String(row.AlloChannel_ID)] || { ar: row.AlloChannel_ID || '—' };
        var project = ctx.projects[String(row.Project_ID)] || { ar: row.Project_ID || '—', en: '' };
        var expenseLookup = ctx.expenseCatalogByName[String(row.Expense || '').trim().toLowerCase()] || null;
        return {
          id: row.Expense_ID,
          values: {
            date: nijjaraInputDateValue_(row.Date),
            expenseName: expenseLookup ? nijjaraBilingualValue_(expenseLookup.ar, expenseLookup.en) : nijjaraTextValue_(row.Expense || row.ExpenseName_AR || ''),
            category: nijjaraTextValue_(row.Category),
            subCategory: nijjaraTextValue_(row.Sub_Category || row.Subcategory),
            fromCustody: nijjaraTextValue_(custody.ar || row.From_Custody),
            project: nijjaraBilingualValue_(project.ar, project.en),
            projectId: row.Project_ID || '',
            allocationChannel: nijjaraTextValue_(allocation.ar || row.AlloChannel_ID),
            expenseType: nijjaraTextValue_(row.Expense_Type),
            amount: nijjaraNumberValue_(row.Amount)
          },
          formValues: {
            date: nijjaraInputDateValue_(row.Date),
            amount: row.Amount || '',
            expenseSmartSearch: row.Expense || '',
            allocationChannel: row.AlloChannel_ID || 'FACTORY',
            fromCustody: row.CustodyAccount_ID || '',
            categoryInfo: row.Category || '',
            subCategoryInfo: row.Sub_Category || '',
            expenseTypeInfo: row.Expense_Type || '',
            projectId: row.Project_ID || ''
          }
        };
      }
    },
    income: {
      sheetName: 'FIN_Revenue',
      idField: 'Income_ID',
      idPrefix: 'REV-',
      moduleCode: 'FIN',
      subModuleCode: 'REVENUE',
      entityLabelAr: 'إيراد',
      label: 'الإيرادات',
      defaultSort: { key: 'date', dir: 'desc' },
      columns: [
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true },
        { key: 'channel', label: 'قناة الإيراد', type: 'text', filterType: 'text', sortable: true },
        { key: 'project', label: 'المشروع', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'amount', label: 'المبلغ', type: 'money', filterType: 'number', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row, ctx) {
        var channel = ctx.revenueChannels[String(row.RevChannel_ID)] || { ar: row.RevChannel_ID || '—', en: '' };
        var project = ctx.projects[String(row.Project_ID)] || { ar: row.Project_ID || '—', en: '' };
        return {
          id: row.Income_ID,
          values: {
            date: nijjaraInputDateValue_(row.Date),
            channel: nijjaraTextValue_(channel.ar),
            project: nijjaraBilingualValue_(project.ar, project.en),
            amount: nijjaraNumberValue_(row.Amount)
          },
          formValues: {
            date: nijjaraInputDateValue_(row.Date),
            amount: row.Amount || '',
            revenueChannel: row.RevChannel_ID || '',
            projectId: row.Project_ID || '',
            statement: row.Statement_AR || row.Statement_EN || ''
          }
        };
      }
    },
    revenueChannels: {
      sheetName: 'FIN_RevenueChannels',
      idField: 'RevChannel_ID',
      idPrefix: 'RCH-',
      moduleCode: 'FIN',
      subModuleCode: 'REVENUE_CHANNELS',
      entityLabelAr: 'قناة إيراد',
      label: 'قنوات الإيراد',
      defaultSort: { key: 'createdAt', dir: 'desc' },
      columns: [
        { key: 'name', label: 'القناة', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'channelType', label: 'النوع', type: 'text', filterType: 'text', sortable: true },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true },
        { key: 'createdAt', label: 'تاريخ الإنشاء', type: 'date', filterType: 'date', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row) {
        return {
          id: row.RevChannel_ID,
          values: {
            name: nijjaraBilingualValue_(row.RevChannel_AR, row.RevChannel_EN),
            channelType: nijjaraTextValue_(row.RevChannel_Type),
            status: nijjaraTextValue_(row.Status_Code || (String(row.Is_Active).toLowerCase() === 'false' ? 'INACTIVE' : 'ACTIVE')),
            createdAt: row.Created_At || ''
          },
          formValues: {
            arabicName: row.RevChannel_AR || '',
            englishName: row.RevChannel_EN || '',
            channelType: row.RevChannel_Type || 'INTERNAL',
            linkedPartnerId: row.Linked_Partner_ID || '',
            statusCode: row.Status_Code || 'ACTIVE'
          }
        };
      }
    },
    expenseCatalog: {
      sheetName: 'SET_ExpenseCatalog',
      idField: 'ExpCat_ID',
      idPrefix: 'EXC-',
      moduleCode: 'SET',
      subModuleCode: 'EXPENSE_CATALOG',
      entityLabelAr: 'بند مصروف',
      label: 'دليل المصروفات',
      defaultSort: { key: 'createdAt', dir: 'desc' },
      columns: [
        { key: 'name', label: 'المصروف', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'category', label: 'الفئة', type: 'text', filterType: 'text', sortable: true },
        { key: 'subCategory', label: 'الفئة الفرعية', type: 'text', filterType: 'text', sortable: true },
        { key: 'factoryExpenseType', label: 'نوع المصنع', type: 'text', filterType: 'text', sortable: true }
      ],
      rowBuilder: function (row) {
        return {
          id: row.ExpCat_ID,
          values: {
            name: nijjaraBilingualValue_(row.ExpenseName_AR, row.ExpenseName_EN),
            category: nijjaraTextValue_(row.Category_AR),
            subCategory: nijjaraTextValue_(row.Subcategory_AR),
            factoryExpenseType: nijjaraTextValue_(row.Factory_Expense_Type),
            createdAt: row.Created_At || ''
          },
          formValues: {}
        };
      }
    },
    materialCatalog: {
      sheetName: 'SET_MaterialCatalog',
      idField: 'Material_ID',
      idPrefix: 'MAT-',
      moduleCode: 'SET',
      subModuleCode: 'MATERIAL_CATALOG',
      entityLabelAr: 'خامة',
      label: 'دليل الخامات',
      defaultSort: { key: 'createdAt', dir: 'desc' },
      columns: [
        { key: 'name', label: 'الخامة', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'category', label: 'الفئة', type: 'text', filterType: 'text', sortable: true },
        { key: 'subCategory', label: 'الفئة الفرعية', type: 'text', filterType: 'text', sortable: true }
      ],
      rowBuilder: function (row) {
        return {
          id: row.Material_ID,
          values: {
            name: nijjaraBilingualValue_(row.MaterialName_AR, row.MaterialName_EN),
            category: nijjaraTextValue_(row.Category_AR),
            subCategory: nijjaraTextValue_(row.Subcategory_AR),
            createdAt: row.Created_At || ''
          },
          formValues: {}
        };
      }
    },
      users: {
        sheetName: 'SYS_Users',
        idField: 'User_ID',
        moduleCode: 'SYS',
      subModuleCode: 'USERS',
      label: 'Users',
      entityLabelAr: 'مستخدم',
      defaultSort: { key: 'createdAt', dir: 'desc' },
      columns: [
        { key: 'username', label: 'اسم المستخدم', type: 'text', filterType: 'text', sortable: true, field: 'Username' },
          { key: 'displayName', label: 'الاسم', type: 'text', filterType: 'text', sortable: true, field: 'Display_Name_AR' },
          { key: 'email', label: 'البريد الإلكتروني', type: 'text', filterType: 'text', sortable: true, field: 'Email' },
          { key: 'linkedEmployee', label: 'الموظف المرتبط', type: 'text', filterType: 'text', sortable: true, field: 'Linked_Employee_ID' },
          { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true, field: 'Status_Code' },
          { key: 'lastLogin', label: 'آخر دخول', type: 'date', filterType: 'date', sortable: true, field: 'Last_Login_At' },
          { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
        ],
        rowBuilder: function (row, ctx) {
          var userId = String(row.User_ID || '');
          var linkedEmployeeId = String(row.Linked_Employee_ID || '').trim();
          var emailKey = String(row.Email || '').trim().toLowerCase();
          var roleCodes = (ctx.userRoleCodesByUserId[userId] || []).slice();
          var permissionCodes = (ctx.userPermissionCodesByUserId[userId] || []).slice();
          var accessRules = (ctx.userAccessRulesByUserId[userId] || []).slice();
          var protectedUser = nijjaraIsProtectedSystemUser_(row);
          var canManageProtected = !protectedUser || !!ctx.canManageProtectedSystemUser;
          var employee = ctx.employeeById[linkedEmployeeId] || ctx.employeeByEmail[emailKey] || null;
          var displayNameAr = row.Display_Name_AR || (employee && employee.Full_Name_AR) || row.Username || '';
          var linkedEmployeeLabel = (employee && (employee.Full_Name_AR || employee.Employee_ID)) || linkedEmployeeId || '';
          var primaryRoleCode = roleCodes[0] || '';
          return {
            id: row.User_ID,
            values: {
              username: nijjaraTextValue_(row.Username),
              displayName: nijjaraTextValue_(displayNameAr),
              email: nijjaraTextValue_(row.Email),
              linkedEmployee: nijjaraTextValue_(linkedEmployeeLabel),
              status: nijjaraTextValue_(row.Status_Code),
              lastLogin: row.Last_Login_At || '',
              createdAt: row.Created_At || '',
              recordLocked: protectedUser && !canManageProtected
            },
            formValues: {
              employeeId: row.Linked_Employee_ID || '',
              linkedEmployeeLabel: linkedEmployeeLabel,
              displayNameAr: displayNameAr,
              email: row.Email || '',
              username: row.Username || '',
              statusCode: row.Status_Code || 'ACTIVE',
              primaryRoleCode: primaryRoleCode,
              roleCodes: roleCodes,
              permissionCodes: permissionCodes,
              accessRules: accessRules,
              protectedUser: protectedUser
            }
          };
        }
      },
    roles: nijjaraMakeGenericSpec_({
      sheetName: 'SYS_Roles',
      idField: 'Role_ID',
      moduleCode: 'SYS',
      subModuleCode: 'ROLES',
      label: 'Roles',
      entityLabelAr: 'دور',
      columns: [
        { key: 'roleCode', label: 'الكود', type: 'text', filterType: 'text', sortable: true, field: 'Role_Code' },
        { key: 'roleName', label: 'الاسم', type: 'bilingual-name', filterType: 'text', sortable: true, arField: 'Role_Name_AR', enField: 'Role_Name_EN' },
        { key: 'systemRole', label: 'نظامي', type: 'text', filterType: 'text', sortable: true, value: function (row) { return row.Is_System_Role ? 'نعم' : 'لا'; } },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true, value: function (row) { return String(row.Is_Active).toLowerCase() === 'false' ? 'INACTIVE' : 'ACTIVE'; } },
        { key: 'createdAt', label: 'تاريخ الإنشاء', type: 'date', filterType: 'date', sortable: true, field: 'Created_At' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    actionPermissions: nijjaraMakeGenericSpec_({
      sheetName: 'SYS_Permissions',
      idField: 'Perm_ID',
      moduleCode: 'SYS',
      subModuleCode: 'PERMISSIONS',
      label: 'Action Permissions',
      entityLabelAr: 'صلاحية',
      columns: [
        { key: 'permCode', label: 'الكود', type: 'text', filterType: 'text', sortable: true, field: 'Perm_Code' },
        { key: 'module', label: 'الوحدة', type: 'text', filterType: 'text', sortable: true, field: 'Module_Code' },
        { key: 'submodule', label: 'الوحدة الفرعية', type: 'text', filterType: 'text', sortable: true, field: 'SubModule_Code' },
        { key: 'action', label: 'الإجراء', type: 'text', filterType: 'text', sortable: true, field: 'Action_Code' },
        { key: 'name', label: 'الاسم', type: 'bilingual-name', filterType: 'text', sortable: true, arField: 'Perm_Name_AR', enField: 'Perm_Name_EN' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    approvalAuthority: nijjaraMakeGenericSpec_({
      sheetName: 'SYS_WorkflowMatrix',
      idField: 'Workflow_ID',
      moduleCode: 'SYS',
      subModuleCode: 'WORKFLOW_MATRIX',
      label: 'Approval Authority',
      entityLabelAr: 'اعتماد',
      columns: [
        { key: 'workflowName', label: 'سير العمل', type: 'bilingual-name', filterType: 'text', sortable: true, arField: 'Workflow_Name_AR', enField: 'Workflow_Name_EN' },
        { key: 'module', label: 'الوحدة', type: 'text', filterType: 'text', sortable: true, field: 'Module_Code' },
        { key: 'reviewers', label: 'المراجعون', type: 'text', filterType: 'text', sortable: true, field: 'Reviewer_Role_Codes' },
        { key: 'approvers', label: 'المعتمدون', type: 'text', filterType: 'text', sortable: true, field: 'Approver_Role_Codes' },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true, value: function (row) { return String(row.Is_Active).toLowerCase() === 'false' ? 'INACTIVE' : 'ACTIVE'; } },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    workflowVisibility: nijjaraMakeGenericSpec_({
      sheetName: 'SYS_WorkflowMatrix',
      idField: 'Workflow_ID',
      moduleCode: 'SYS',
      subModuleCode: 'WORKFLOW_MATRIX',
      label: 'Workflow Visibility',
      entityLabelAr: 'ظهور سير العمل',
      columns: [
        { key: 'workflowName', label: 'سير العمل', type: 'bilingual-name', filterType: 'text', sortable: true, arField: 'Workflow_Name_AR', enField: 'Workflow_Name_EN' },
        { key: 'requesters', label: 'الأدوار الطالبة', type: 'text', filterType: 'text', sortable: true, field: 'Requester_Role_Codes' },
        { key: 'notifyRequester', label: 'إشعار الطالب', type: 'text', filterType: 'text', sortable: true, field: 'Notify_Requester' },
        { key: 'notifyReviewer', label: 'إشعار المراجع', type: 'text', filterType: 'text', sortable: true, field: 'Notify_Reviewer' },
        { key: 'notifyApprover', label: 'إشعار المعتمد', type: 'text', filterType: 'text', sortable: true, field: 'Notify_Approver' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    attendance: nijjaraMakeGenericSpec_({
      sheetName: 'HRM_Attendance',
      idField: 'Attendance_ID',
      moduleCode: 'HRM',
      subModuleCode: 'ATTENDANCE',
      label: 'Attendance',
      entityLabelAr: 'حضور',
      columns: [
        { key: 'employeeId', label: 'الموظف', type: 'text', filterType: 'text', sortable: true, field: 'Employee_ID' },
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Attendance_Date' },
        { key: 'checkIn', label: 'الحضور', type: 'text', filterType: 'text', sortable: true, field: 'Check_In' },
        { key: 'checkOut', label: 'الانصراف', type: 'text', filterType: 'text', sortable: true, field: 'Check_Out' },
        { key: 'workedHours', label: 'الساعات', type: 'number', filterType: 'number', sortable: true, field: 'Worked_Hours' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    leave: nijjaraMakeGenericSpec_({
      sheetName: 'HRM_VacationRequests',
      idField: 'VacationReq_ID',
      moduleCode: 'HRM',
      subModuleCode: 'VACATION_REQUESTS',
      label: 'Leave',
      entityLabelAr: 'إجازة',
      columns: [
        { key: 'employeeId', label: 'الموظف', type: 'text', filterType: 'text', sortable: true, field: 'Employee_ID' },
        { key: 'startDate', label: 'من', type: 'date', filterType: 'date', sortable: true, field: 'Start_Date' },
        { key: 'endDate', label: 'إلى', type: 'date', filterType: 'date', sortable: true, field: 'End_Date' },
        { key: 'days', label: 'الأيام', type: 'number', filterType: 'number', sortable: true, field: 'Days_Count' },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true, field: 'Workflow_Status' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    overtime: nijjaraMakeGenericSpec_({
      sheetName: 'HRM_OTRequests',
      idField: 'OTReq_ID',
      moduleCode: 'HRM',
      subModuleCode: 'OT_REQUESTS',
      label: 'Overtime',
      entityLabelAr: 'إضافي',
      columns: [
        { key: 'employeeId', label: 'الموظف', type: 'text', filterType: 'text', sortable: true, field: 'Employee_ID' },
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'OT_Date' },
        { key: 'requestedHours', label: 'الساعات المطلوبة', type: 'number', filterType: 'number', sortable: true, field: 'Requested_Hours' },
        { key: 'approvedHours', label: 'الساعات المعتمدة', type: 'number', filterType: 'number', sortable: true, field: 'Approved_Hours' },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true, field: 'Workflow_Status' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    excuses: nijjaraMakeGenericSpec_({
      sheetName: 'HRM_ExcuseRequests',
      idField: 'ExcuseReq_ID',
      moduleCode: 'HRM',
      subModuleCode: 'EXCUSE_REQUESTS',
      label: 'Excuses',
      entityLabelAr: 'إذن',
      columns: [
        { key: 'employeeId', label: 'الموظف', type: 'text', filterType: 'text', sortable: true, field: 'Employee_ID' },
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Excuse_Date' },
        { key: 'fromTime', label: 'من', type: 'text', filterType: 'text', sortable: true, field: 'From_Time' },
        { key: 'toTime', label: 'إلى', type: 'text', filterType: 'text', sortable: true, field: 'To_Time' },
        { key: 'hours', label: 'الساعات', type: 'number', filterType: 'number', sortable: true, field: 'Excuse_Hours' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    violations: nijjaraMakeGenericSpec_({
      sheetName: 'HRM_PenaltyPolicies',
      idField: 'PenaltyPolicy_ID',
      moduleCode: 'HRM',
      subModuleCode: 'VIOLATIONS',
      label: 'Violations',
      entityLabelAr: 'مخالفة',
      columns: [
        { key: 'policyCode', label: 'الكود', type: 'text', filterType: 'text', sortable: true, field: 'Policy_Code' },
        { key: 'policyName', label: 'السياسة', type: 'bilingual-name', filterType: 'text', sortable: true, arField: 'Policy_Name_AR', enField: 'Policy_Name_EN' },
        { key: 'violation', label: 'المخالفة', type: 'bilingual-name', filterType: 'text', sortable: true, arField: 'Violation_AR', enField: 'Violation_EN' },
        { key: 'method', label: 'طريقة الحساب', type: 'text', filterType: 'text', sortable: true, field: 'Calc_Method' },
        { key: 'value', label: 'القيمة', type: 'number', filterType: 'number', sortable: true, field: 'Calc_Value' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    payrollLinkedItems: nijjaraMakeGenericSpec_({
      sheetName: 'HRM_PayrollItems',
      idField: 'PayrollItem_ID',
      moduleCode: 'HRM',
      subModuleCode: 'PAYROLL_ITEMS',
      label: 'Payroll-Linked Items',
      entityLabelAr: 'بند رواتب',
      columns: [
        { key: 'runId', label: 'تشغيل الرواتب', type: 'text', filterType: 'text', sortable: true, field: 'PayrollRun_ID' },
        { key: 'employeeId', label: 'الموظف', type: 'text', filterType: 'text', sortable: true, field: 'Employee_ID' },
        { key: 'basicSalary', label: 'الأساسي', type: 'money', filterType: 'number', sortable: true, field: 'Basic_Salary' },
        { key: 'otAmount', label: 'الإضافي', type: 'money', filterType: 'number', sortable: true, field: 'OT_Amount' },
        { key: 'netSalary', label: 'الصافي', type: 'money', filterType: 'number', sortable: true, field: 'Net_Salary' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    collections: {
      sheetName: 'PRJ_Payments',
      idField: 'Prj_Payment_ID',
      moduleCode: 'FIN',
      subModuleCode: 'COLLECTIONS',
      label: 'Collections',
      entityLabelAr: 'تحصيل',
      defaultSort: { key: 'paymentDate', dir: 'desc' },
      columns: [
        { key: 'project', label: 'المشروع', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'client', label: 'العميل', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'paymentDate', label: 'تاريخ التحصيل', type: 'date', filterType: 'date', sortable: true },
        { key: 'paymentAmount', label: 'قيمة التحصيل', type: 'money', filterType: 'number', sortable: true },
        { key: 'totalReceived', label: 'إجمالي المستلم', type: 'money', filterType: 'number', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row, ctx) {
        var project = ctx.projects[String(row.Project_ID || '')] || { ar: row.Project_ID || '—', en: '' };
        var client = ctx.clients[String(row.Client_ID || '')] || { ar: row.Client_ID || '—', en: '' };
        return {
          id: row.Prj_Payment_ID,
          values: {
            project: nijjaraBilingualValue_(project.ar, project.en),
            client: nijjaraBilingualValue_(client.ar, client.en),
            paymentDate: nijjaraInputDateValue_(row.Payment_Date),
            paymentAmount: nijjaraNumberValue_(row.Payment_Amount),
            totalReceived: nijjaraNumberValue_(row.Total_Received)
          },
          formValues: {
            projectId: row.Project_ID || '',
            clientId: row.Client_ID || '',
            paymentDate: nijjaraInputDateValue_(row.Payment_Date),
            paymentAmount: row.Payment_Amount || '',
            receivedCustodyAccountId: row.CustodyAccount_ID || '',
            totalReceived: row.Total_Received || '',
            remainingAmount: row.Remaining_Mount || '',
            projectStatus: row.Project_Status || '',
            totalPayments: row.Payments_Count || '',
            totalBudget: row.Project_Budget || ''
          }
        };
      }
    },
    payrollExpenses: nijjaraMakeGenericSpec_({
      sheetName: 'HRM_PayrollRuns',
      idField: 'PayrollRun_ID',
      moduleCode: 'FIN',
      subModuleCode: 'PAYROLL_EXPENSES',
      label: 'Payroll Expenses',
      entityLabelAr: 'مصروف رواتب',
      columns: [
        { key: 'periodYear', label: 'السنة', type: 'number', filterType: 'number', sortable: true, field: 'Payroll_Period_Year' },
        { key: 'periodMonth', label: 'الشهر', type: 'number', filterType: 'number', sortable: true, field: 'Payroll_Period_Month' },
        { key: 'runDate', label: 'تاريخ التشغيل', type: 'date', filterType: 'date', sortable: true, field: 'Run_Date' },
        { key: 'employeeCount', label: 'عدد الموظفين', type: 'number', filterType: 'number', sortable: true, field: 'Employee_Count' },
        { key: 'netTotal', label: 'الصافي', type: 'money', filterType: 'number', sortable: true, field: 'Net_Total' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    employeesAdvances: nijjaraMakeGenericSpec_({
      sheetName: 'HRM_Advances',
      idField: 'EMPAdvance_ID',
      moduleCode: 'FIN',
      subModuleCode: 'EMPLOYEE_ADVANCES',
      label: 'Employees Advances',
      entityLabelAr: 'سلفة موظف',
      columns: [
        { key: 'employeeId', label: 'الموظف', type: 'text', filterType: 'text', sortable: true, field: 'Employee_ID' },
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Advance_Date' },
        { key: 'amount', label: 'القيمة', type: 'money', filterType: 'number', sortable: true, field: 'Advance_Amount' },
        { key: 'settled', label: 'تمت التسوية', type: 'text', filterType: 'text', sortable: true, field: 'Is_Settled' },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true, field: 'Workflow_Status' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    partnersData: nijjaraMakeGenericSpec_({
      sheetName: 'PAR_Partners',
      idField: 'Partner_ID',
      moduleCode: 'FIN',
      subModuleCode: 'PARTNERS_DATA',
      label: 'Partners Data',
      entityLabelAr: 'شريك',
      columns: [
        { key: 'name', label: 'الشريك', type: 'bilingual-name', filterType: 'text', sortable: true, arField: 'Partner_Name_AR', enField: 'Partner_Name_EN' },
        { key: 'mobile', label: 'الجوال', type: 'text', filterType: 'text', sortable: true, field: 'Mobile' },
        { key: 'email', label: 'البريد الإلكتروني', type: 'text', filterType: 'text', sortable: true, field: 'Email' },
        { key: 'sharePercent', label: 'نسبة الحصة', type: 'number', filterType: 'number', sortable: true, field: 'Share_Percent' },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true, field: 'Status_Code' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    partnersFunding: nijjaraMakeGenericSpec_({
      sheetName: 'PAR_FundingMovements',
      idField: 'PartnerFunding_ID',
      moduleCode: 'FIN',
      subModuleCode: 'PARTNERS_FUNDING',
      label: 'Partners Funding',
      entityLabelAr: 'تمويل شريك',
      columns: [
        { key: 'partnerId', label: 'الشريك', type: 'text', filterType: 'text', sortable: true, field: 'Partner_ID' },
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Funding_Date' },
        { key: 'type', label: 'النوع', type: 'text', filterType: 'text', sortable: true, field: 'Funding_Type_Code' },
        { key: 'amount', label: 'القيمة', type: 'money', filterType: 'number', sortable: true, field: 'Funding_Amount' },
        { key: 'temporary', label: 'مؤقت', type: 'text', filterType: 'text', sortable: true, field: 'Is_Temporary' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    partnersAdvances: nijjaraMakeGenericSpec_({
      sheetName: 'PAR_Advances',
      idField: 'PartnerAdvance_ID',
      moduleCode: 'FIN',
      subModuleCode: 'PARTNERS_ADVANCES',
      label: 'Partners Advances',
      entityLabelAr: 'سلفة شريك',
      columns: [
        { key: 'partnerId', label: 'الشريك', type: 'text', filterType: 'text', sortable: true, field: 'Partner_ID' },
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Advance_Date' },
        { key: 'amount', label: 'القيمة', type: 'money', filterType: 'number', sortable: true, field: 'Advance_Amount' },
        { key: 'settlementStatus', label: 'حالة التسوية', type: 'text', filterType: 'text', sortable: true, field: 'Settlement_Status' },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true, field: 'Workflow_Status' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    partnersShares: nijjaraMakeGenericSpec_({
      sheetName: 'PAR_ShareLedger',
      idField: 'PartnerShareTxn_ID',
      moduleCode: 'FIN',
      subModuleCode: 'PARTNERS_SHARES',
      label: 'Partners Shares',
      entityLabelAr: 'حصة شريك',
      columns: [
        { key: 'partnerId', label: 'الشريك', type: 'text', filterType: 'text', sortable: true, field: 'Partner_ID' },
        { key: 'periodKey', label: 'الفترة', type: 'text', filterType: 'text', sortable: true, field: 'Period_Key' },
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Txn_Date' },
        { key: 'sharePercent', label: 'النسبة', type: 'number', filterType: 'number', sortable: true, field: 'Share_Percent' },
        { key: 'amount', label: 'القيمة', type: 'money', filterType: 'number', sortable: true, field: 'Amount' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    allocations: nijjaraMakeGenericSpec_({
      sheetName: 'FIN_AllocationChannels',
      idField: 'AlloChannel_ID',
      moduleCode: 'FIN',
      subModuleCode: 'ALLOCATIONS',
      label: 'Allocations',
      entityLabelAr: 'قناة تحميل',
      columns: [
        { key: 'name', label: 'قناة التحميل', type: 'bilingual-name', filterType: 'text', sortable: true, arField: 'AlloChannel_AR', enField: 'AlloChannel_EN' },
        { key: 'type', label: 'النوع', type: 'text', filterType: 'text', sortable: true, field: 'AlloChannel_Type' },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true, value: function (row) { return String(row.Is_Active).toLowerCase() === 'false' ? 'INACTIVE' : 'ACTIVE'; } },
        { key: 'createdAt', label: 'تاريخ الإنشاء', type: 'date', filterType: 'date', sortable: true, field: 'Created_At' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    financialReporting: nijjaraMakeGenericSpec_({
      sheetName: 'FIN_CompanyLedger',
      idField: 'CompanyTxn_ID',
      moduleCode: 'FIN',
      subModuleCode: 'FINANCIAL_REPORTING',
      label: 'Financial Reporting',
      entityLabelAr: 'قيد شركة',
      columns: [
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Txn_Date' },
        { key: 'type', label: 'النوع', type: 'text', filterType: 'text', sortable: true, field: 'Txn_Type' },
        { key: 'source', label: 'المصدر', type: 'text', filterType: 'text', sortable: true, field: 'Source_Record_ID' },
        { key: 'debit', label: 'مدين', type: 'money', filterType: 'number', sortable: true, field: 'Debit_Amount' },
        { key: 'credit', label: 'دائن', type: 'money', filterType: 'number', sortable: true, field: 'Credit_Amount' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    projectBudgets: {
      sheetName: 'PRJ_BudgetRevisions',
      idField: 'BudgetRev_ID',
      idPrefix: 'BREV-',
      moduleCode: 'PRJ',
      subModuleCode: 'PROJECT_BUDGETS',
      label: 'Project Budgets',
      entityLabelAr: 'ميزانية مشروع',
      defaultSort: { key: 'revisionDate', dir: 'desc' },
      columns: [
        { key: 'project', label: 'المشروع', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'client', label: 'العميل', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'revisionDate', label: 'تاريخ المراجعة', type: 'date', filterType: 'date', sortable: true },
        { key: 'oldBudget', label: 'الميزانية السابقة', type: 'money', filterType: 'number', sortable: true },
        { key: 'newBudget', label: 'الميزانية الجديدة', type: 'money', filterType: 'number', sortable: true },
        { key: 'delta', label: 'الفرق', type: 'money', filterType: 'number', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row, ctx) {
        var project = ctx.projects[String(row.Project_ID || '')] || { ar: row.Project_ID || '—', en: '', clientId: '' };
        var client = ctx.clients[String(project.clientId || '')] || { ar: project.clientId || '—', en: '' };
        return {
          id: row.BudgetRev_ID,
          values: {
            project: nijjaraBilingualValue_(project.ar, project.en),
            client: nijjaraBilingualValue_(client.ar, client.en),
            revisionDate: nijjaraInputDateValue_(row.Revision_Date),
            oldBudget: nijjaraNumberValue_(row.Old_Budget),
            newBudget: nijjaraNumberValue_(row.New_Budget),
            delta: nijjaraNumberValue_(row.Delta_Amount)
          },
          formValues: {
            projectId: row.Project_ID || '',
            clientId: project.clientId || '',
            clientDisplay: client.ar || '',
            revisionDate: nijjaraInputDateValue_(row.Revision_Date),
            oldBudget: row.Old_Budget || '',
            newBudget: row.New_Budget || '',
            delta: row.Delta_Amount || '',
            reason: row.Reason_AR || '',
            receivedTotal: project.received || 0,
            remainingAmount: project.remaining || 0,
            projectStatus: project.status || ''
          }
        };
      }
    },
    projectTimelines: nijjaraMakeGenericSpec_({
      sheetName: 'PRJ_StatusHistory',
      idField: 'ProjectStatusHist_ID',
      moduleCode: 'PRJ',
      subModuleCode: 'PROJECT_TIMELINES',
      label: 'Project Timelines',
      entityLabelAr: 'تاريخ حالة مشروع',
      columns: [
        { key: 'projectId', label: 'المشروع', type: 'text', filterType: 'text', sortable: true, field: 'Project_ID' },
        { key: 'statusDate', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Status_Date' },
        { key: 'oldStatus', label: 'الحالة السابقة', type: 'text', filterType: 'text', sortable: true, field: 'Old_Status' },
        { key: 'newStatus', label: 'الحالة الجديدة', type: 'text', filterType: 'text', sortable: true, field: 'New_Status' },
        { key: 'reason', label: 'السبب', type: 'text', filterType: 'text', sortable: true, field: 'Reason_AR' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    projectRevenueTracking: {
      sheetName: 'PRJ_Payments',
      idField: 'Prj_Payment_ID',
      idPrefix: 'PPY-',
      moduleCode: 'PRJ',
      subModuleCode: 'PROJECT_REVENUE_TRACKING',
      label: 'Project Revenue Tracking',
      entityLabelAr: 'دفعة مشروع',
      defaultSort: { key: 'paymentDate', dir: 'desc' },
      columns: [
        { key: 'project', label: 'المشروع', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'client', label: 'العميل', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'paymentDate', label: 'تاريخ التحصيل', type: 'date', filterType: 'date', sortable: true },
        { key: 'paymentAmount', label: 'قيمة التحصيل', type: 'money', filterType: 'number', sortable: true },
        { key: 'totalReceived', label: 'إجمالي المستلم', type: 'money', filterType: 'number', sortable: true },
        { key: 'remainingAmount', label: 'المتبقي', type: 'money', filterType: 'number', sortable: true },
        { key: 'projectStatus', label: 'الحالة', type: 'text', filterType: 'text', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row, ctx) {
        var project = ctx.projects[String(row.Project_ID || '')] || { ar: row.Project_ID || '—', en: '' };
        var client = ctx.clients[String(row.Client_ID || project.clientId || '')] || { ar: row.Client_ID || '—', en: '' };
        return {
          id: row.Prj_Payment_ID,
          values: {
            project: nijjaraBilingualValue_(project.ar, project.en),
            client: nijjaraBilingualValue_(client.ar, client.en),
            paymentDate: nijjaraInputDateValue_(row.Payment_Date),
            paymentAmount: nijjaraNumberValue_(row.Payment_Amount),
            totalReceived: nijjaraNumberValue_(row.Total_Received),
            remainingAmount: nijjaraNumberValue_(row.Remaining_Mount),
            projectStatus: nijjaraTextValue_(row.Project_Status)
          },
          formValues: {
            projectId: row.Project_ID || '',
            clientId: row.Client_ID || project.clientId || '',
            paymentDate: nijjaraInputDateValue_(row.Payment_Date),
            paymentAmount: row.Payment_Amount || '',
            receivedCustodyAccountId: row.CustodyAccount_ID || '',
            totalReceived: row.Total_Received || '',
            remainingAmount: row.Remaining_Mount || '',
            projectStatus: row.Project_Status || ''
          }
        };
      }
    },
    internalChannels: {
      sheetName: 'INCH_InternalChannels',
      idField: 'InternalChannel_ID',
      idPrefix: 'INCH-',
      moduleCode: 'FIN',
      subModuleCode: 'INTERNAL_CHANNELS',
      label: 'Internal Channels',
      entityLabelAr: 'قناة داخلية',
      defaultSort: { key: 'orderDate', dir: 'desc' },
      columns: [
        { key: 'channelName', label: 'القناة', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'orderDate', label: 'تاريخ الطلب', type: 'date', filterType: 'date', sortable: true },
        { key: 'orderPrice', label: 'قيمة الطلب', type: 'money', filterType: 'number', sortable: true },
        { key: 'totalReceived', label: 'إجمالي المستلم', type: 'money', filterType: 'number', sortable: true },
        { key: 'totalRemaining', label: 'المتبقي', type: 'money', filterType: 'number', sortable: true },
        { key: 'orderStatus', label: 'حالة الطلب', type: 'text', filterType: 'text', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row, ctx) {
        return {
          id: row.InternalChannel_ID,
          values: {
            channelName: nijjaraBilingualValue_(row.InternalChannel_AR || '', row.InternalChannel_EN || ''),
            orderDate: nijjaraInputDateValue_(row.Order_Date),
            orderPrice: nijjaraNumberValue_(row.Order_Price),
            totalReceived: nijjaraNumberValue_(row.Total_Received),
            totalRemaining: nijjaraNumberValue_(row.Total_Remaining),
            orderStatus: nijjaraTextValue_(row.Order_Status)
          },
          formValues: {
            arabicName: row.InternalChannel_AR || '',
            englishName: row.InternalChannel_EN || '',
            revChannelId: row.RevChannel_ID || '',
            orderDate: nijjaraInputDateValue_(row.Order_Date),
            orderPrice: row.Order_Price || '',
            orderStatus: row.Order_Status || '',
            totalReceived: row.Total_Received || '',
            totalRemaining: row.Total_Remaining || ''
          }
        };
      }
    },
    internalRevenuePayments: {
      sheetName: 'INCH_InternalRevenuePayments',
      idField: 'InternalPayment_ID',
      idPrefix: 'IPAY-',
      moduleCode: 'FIN',
      subModuleCode: 'INTERNAL_REVENUE',
      label: 'Internal Revenue Payments',
      entityLabelAr: 'دفعة إيراد داخلي',
      defaultSort: { key: 'paymentDate', dir: 'desc' },
      columns: [
        { key: 'channel', label: 'القناة الداخلية', type: 'bilingual-name', filterType: 'text', sortable: true },
        { key: 'paymentDate', label: 'تاريخ التحصيل', type: 'date', filterType: 'date', sortable: true },
        { key: 'paymentAmount', label: 'قيمة التحصيل', type: 'money', filterType: 'number', sortable: true },
        { key: 'totalReceived', label: 'إجمالي المستلم', type: 'money', filterType: 'number', sortable: true },
        { key: 'totalRemaining', label: 'المتبقي', type: 'money', filterType: 'number', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'actions', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row, ctx) {
        var ch = (ctx.internalChannels || {})[String(row.InternalChannel_ID || '')] || { ar: row.InternalChannel_ID || '—', en: '' };
        return {
          id: row.InternalPayment_ID,
          values: {
            channel: nijjaraBilingualValue_(ch.ar, ch.en),
            paymentDate: nijjaraInputDateValue_(row.Payment_Date),
            paymentAmount: nijjaraNumberValue_(row.Payment_Amount),
            totalReceived: nijjaraNumberValue_(row.Total_Received),
            totalRemaining: nijjaraNumberValue_(row.Total_Remaining)
          },
          formValues: {
            internalChannelId: row.InternalChannel_ID || '',
            paymentDate: nijjaraInputDateValue_(row.Payment_Date),
            paymentAmount: row.Payment_Amount || '',
            receivedCustodyAccountId: row.CustodyAccount_ID || '',
            totalReceived: row.Total_Received || '',
            totalRemaining: row.Total_Remaining || '',
            statement: row.Statement_AR || ''
          }
        };
      }
    },
    projectDirectExpenses: nijjaraMakeGenericSpec_({
      sheetName: 'FIN_Expenses',
      idField: 'Expense_ID',
      moduleCode: 'PRJ',
      subModuleCode: 'PROJECT_DIRECT_EXPENSES',
      label: 'Project Direct Expenses',
      entityLabelAr: 'مصروف مشروع مباشر',
      rowVisible: function (row) {
        return nijjaraRowVisible_(row) &&
          String(row.Project_ID || '').trim() !== '' &&
          (String(row.Expense_Type || '').toUpperCase() === 'DIRECT' || String(row.AlloChannel_ID || '').toUpperCase() === 'PROJECT');
      },
      columns: [
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Date' },
        { key: 'projectId', label: 'المشروع', type: 'text', filterType: 'text', sortable: true, field: 'Project_ID' },
        { key: 'expense', label: 'المصروف', type: 'text', filterType: 'text', sortable: true, field: 'Expense' },
        { key: 'category', label: 'الفئة', type: 'text', filterType: 'text', sortable: true, field: 'Category' },
        { key: 'amount', label: 'القيمة', type: 'money', filterType: 'number', sortable: true, field: 'Amount' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    projectStatusMonitoring: nijjaraMakeGenericSpec_({
      sheetName: 'PRJ_StatusHistory',
      idField: 'ProjectStatusHist_ID',
      moduleCode: 'PRJ',
      subModuleCode: 'PROJECT_STATUS_MONITORING',
      label: 'Project Status Monitoring',
      entityLabelAr: 'مراقبة حالة مشروع',
      columns: [
        { key: 'projectId', label: 'المشروع', type: 'text', filterType: 'text', sortable: true, field: 'Project_ID' },
        { key: 'statusDate', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Status_Date' },
        { key: 'oldStatus', label: 'من', type: 'text', filterType: 'text', sortable: true, field: 'Old_Status' },
        { key: 'newStatus', label: 'إلى', type: 'text', filterType: 'text', sortable: true, field: 'New_Status' },
        { key: 'reason', label: 'السبب', type: 'text', filterType: 'text', sortable: true, field: 'Reason_AR' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    notifications: nijjaraMakeGenericSpec_({
      sheetName: 'SYS_Notifications',
      idField: 'Notification_ID',
      moduleCode: 'SYS',
      subModuleCode: 'NOTIFICATIONS',
      label: 'Notifications',
      entityLabelAr: 'إشعار',
      columns: [
        { key: 'title', label: 'العنوان', type: 'text', filterType: 'text', sortable: true, field: 'Title_AR' },
        { key: 'module', label: 'الوحدة', type: 'text', filterType: 'text', sortable: true, field: 'SubModule_Code' },
        { key: 'sourceRecordId', label: 'السجل المصدر', type: 'text', filterType: 'text', sortable: true, field: 'Source_Record_ID' },
        { key: 'status', label: 'الحالة', type: 'text', filterType: 'text', sortable: true, field: 'Status_Code' },
        { key: 'createdAt', label: 'تاريخ الإنشاء', type: 'date', filterType: 'date', sortable: true, field: 'Created_At' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    partnerRevenue: nijjaraMakeGenericSpec_({
      sheetName: 'PAR_PartnerRevenue',
      idField: 'PartnerRevenue_ID',
      idPrefix: 'PRV-',
      moduleCode: 'FIN',
      subModuleCode: 'PARTNER_REVENUE',
      label: 'Partner Revenue',
      entityLabelAr: 'إيراد شريك',
      defaultSort: { key: 'date', dir: 'desc' },
      columns: [
        { key: 'partnerId', label: 'الشريك', type: 'text', filterType: 'text', sortable: true, field: 'Partner_ID' },
        { key: 'date', label: 'التاريخ', type: 'date', filterType: 'date', sortable: true, field: 'Revenue_Date' },
        { key: 'amount', label: 'المبلغ', type: 'money', filterType: 'number', sortable: true, field: 'Amount' },
        { key: 'statement', label: 'الوصف', type: 'text', filterType: 'text', sortable: true, field: 'Statement_AR' },
        { key: 'sourceType', label: 'نوع المصدر', type: 'text', filterType: 'text', sortable: true, field: 'Source_SubModule' },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ]
    }),
    auditLogs: {
      sheetName: 'SYS_AuditLog',
      idField: 'Audit_ID',
      moduleCode: 'SYS',
      subModuleCode: 'AUDIT_LOGS',
      label: 'Audit Logs',
      entityLabelAr: 'سجل تدقيق',
      defaultSort: { key: 'dateTime', dir: 'desc' },
      columns: [
        { key: 'dateTime', label: 'التاريخ والوقت', type: 'datetime', filterType: 'date', sortable: true },
        { key: 'actor', label: 'المنفذ', type: 'text', filterType: 'text', sortable: true },
        { key: 'module', label: 'الوحدة', type: 'text', filterType: 'text', sortable: true },
        { key: 'submodule', label: 'الوحدة الفرعية', type: 'text', filterType: 'text', sortable: true },
        { key: 'action', label: 'الإجراء', type: 'text', filterType: 'text', sortable: true },
        { key: 'result', label: 'النتيجة', type: 'text', filterType: 'text', sortable: true },
        { key: 'actions', label: 'الإجراءات', type: 'view-action', filterType: 'none', sortable: false }
      ],
      rowBuilder: function (row) {
        return {
          id: row.Audit_ID,
          values: {
            dateTime: nijjaraInputDateTimeValue_(row.Log_DateTime || ''),
            actor: nijjaraAuditActorDisplay_(row.Actor_User_ID, row.Actor_Display_AR),
            module: nijjaraAuditModuleLabel_(row.Module_Code),
            submodule: nijjaraAuditSubModuleLabel_(row.SubModule_Code),
            action: nijjaraAuditActionLabel_(row.Action_Code),
            result: nijjaraAuditResultLabel_(row.Result_Code),
            createdAt: nijjaraInputDateTimeValue_(row.Log_DateTime || '')
          },
          formValues: {
            dateTime: nijjaraInputDateTimeValue_(row.Log_DateTime || ''),
            actor: nijjaraAuditActorDisplay_(row.Actor_User_ID, row.Actor_Display_AR),
            module: nijjaraAuditModuleLabel_(row.Module_Code),
            submodule: nijjaraAuditSubModuleLabel_(row.SubModule_Code),
            action: nijjaraAuditActionLabel_(row.Action_Code),
            result: nijjaraAuditResultLabel_(row.Result_Code),
            summary: row.Summary_AR || '',
            details: row.Details_AR || '',
            sourceRecordId: row.Source_Record_ID || '',
            changedFieldsJson: row.Changed_Fields_JSON || ''
          }
        };
      }
    }
  };

  return specs[moduleKey] || null;
}

function nijjaraNormalizePayloadForModule_(moduleKey, payload) {
  function nijjaraResolveAllocationChannelId_(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.indexOf('ALC-') === 0) return raw;
    var rows = nijjaraRows_('FIN_AllocationChannels');
    var normalized = raw.toUpperCase();
    var match = rows.filter(function (row) {
      if (String(row.AlloChannel_ID || '') === raw) return true;
      var labelAr = String(row.AlloChannel_AR || '');
      var labelEn = String(row.AlloChannel_EN || '');
      if (normalized === 'PROJECT') return labelAr.indexOf('المشاريع') !== -1 || labelEn.indexOf('PRJ_Projects') !== -1;
      if (normalized === 'FACTORY') return labelAr.indexOf('المصنع') !== -1 || labelEn.indexOf('Factory') !== -1;
      if (normalized === 'INTERNAL_REVENUE') return labelAr.indexOf('آند بيسز') !== -1 || labelEn.indexOf('&Pieces') !== -1;
      return labelAr === raw || labelEn === raw;
    })[0];
    return match ? (match.AlloChannel_ID || '') : raw;
  }
  if (moduleKey === 'employees') {
    return {
      Full_Name_AR: payload.arabicFullName || '',
      Full_Name_EN: payload.englishFullName || '',
      Email: payload.email || '',
      Mobile: payload.mobileNumber || '',
      National_ID: payload.nationalId || '',
      Date_Of_Birth: nijjaraInputDateValue_(payload.dateOfBirth),
      Hire_Date: nijjaraInputDateValue_(payload.hireDate),
      Contract_Type: payload.contractType || 'PERMANENT',
      Job_Title_AR: payload.jobTitleArabic || '',
      Department_Name_AR: payload.departmentArabic || '',
      Basic_Salary: Number(payload.basicSalary || 0) || 0,
      Status: payload.statusCode || 'ACTIVE',
      Status_Code: payload.statusCode || 'ACTIVE',
      Is_Active: String(payload.statusCode || 'ACTIVE').toUpperCase() === 'ACTIVE',
      Search_Text_AR: [payload.arabicFullName, payload.mobileNumber, payload.nationalId, payload.jobTitleArabic, payload.departmentArabic].join(' | '),
      Search_Text_EN: [payload.englishFullName, payload.email, payload.nationalId].join(' | ')
    };
  }
  if (moduleKey === 'clients') {
    return {
      Client_Name_AR: payload.arabicName || '',
      Client_Name_EN: payload.englishName || '',
      Email: payload.email || '',
      Mobile: payload.mobileNumber || '',
      Status_Code: payload.status || 'ACTIVE',
      Is_Active: String(payload.status || 'ACTIVE').toUpperCase() === 'ACTIVE',
      Search_Text_AR: [payload.arabicName, payload.mobileNumber].join(' | '),
      Search_Text_EN: [payload.englishName, payload.email].join(' | ')
    };
  }
  if (moduleKey === 'projects') {
    return {
      Project_Name_AR: payload.arabicName || '',
      Project_Name_EN: payload.englishName || '',
      Client_ID: payload.clientId || '',
      Project_Status: payload.projectStatus || 'IN_PROGRESS',
      Project_Budget: Number(payload.budget || 0) || 0,
      Search_Text_AR: [payload.arabicName].join(' | '),
      Search_Text_EN: [payload.englishName].join(' | ')
    };
  }
  if (moduleKey === 'projectBudgets') {
    var projectId = payload.projectId || '';
    var project = projectId ? nijjaraFindOne_('PRJ_Projects', function (row) {
      return String(row.Project_ID || '') === String(projectId || '');
    }) : null;
    var oldBudget = Number(payload.oldBudget || (project ? project.Project_Budget : 0) || 0) || 0;
    var newBudget = Number(payload.newBudget || 0) || 0;
    var delta = newBudget - oldBudget;
    return {
      Project_ID: projectId,
      Revision_Date: nijjaraInputDateValue_(payload.revisionDate || nijjaraNow_()),
      Old_Budget: oldBudget,
      New_Budget: newBudget,
      Delta_Amount: delta,
      Reason_AR: payload.reason || '',
      Reason_EN: '',
      Status_Code: 'APPROVED',
      Search_Text_AR: [projectId, payload.reason].join(' | '),
      Search_Text_EN: [projectId].join(' | '),
      Workflow_Code: 'PROJECT_BUDGET_CHANGE',
      Workflow_Status: 'APPROVED',
      Action_Notes: payload.reason || ''
    };
  }
  if (moduleKey === 'expenses') {
    var allocationCode = String(payload.allocationChannel || '').toUpperCase();
    var expenseType = allocationCode === 'FACTORY'
      ? (payload.expenseTypeInfo || '')
      : 'DIRECT';
    return {
      Date: nijjaraInputDateValue_(payload.date),
      Amount: Number(payload.amount || 0) || 0,
      Expense: payload.expenseSmartSearch || '',
      Category: payload.categoryInfo || '',
      Sub_Category: payload.subCategoryInfo || '',
      Expense_Type: expenseType,
      AlloChannel_ID: nijjaraResolveAllocationChannelId_(payload.allocationChannel || ''),
      Project_ID: payload.projectId || '',
      CustodyAccount_ID: payload.fromCustody || '',
      From_Custody: payload.fromCustody || '',
      Depreciation_Period: payload.depreciationPeriod || '',
      Period_Start_Date: nijjaraInputDateValue_(payload.periodStartDate),
      Period_End_Date: nijjaraInputDateValue_(payload.periodEndDate),
      Search_Text_AR: [payload.expenseSmartSearch, payload.categoryInfo, payload.subCategoryInfo].join(' | '),
      Search_Text_EN: [payload.expenseSmartSearch].join(' | ')
    };
  }
  if (moduleKey === 'income') {
    return {
      Date: nijjaraInputDateValue_(payload.date),
      Amount: Number(payload.amount || 0) || 0,
      RevChannel_ID: payload.revenueChannel || '',
      Project_ID: payload.projectId || '',
      Statement_AR: payload.statement || '',
      Search_Text_AR: [payload.statement].join(' | '),
      Search_Text_EN: [payload.statement].join(' | ')
    };
  }
  if (moduleKey === 'projectRevenueTracking') {
    return {
      Payment_Date: nijjaraInputDateValue_(payload.paymentDate || payload.date),
      Project_ID: payload.projectId || '',
      Client_ID: payload.clientId || '',
      Payment_Amount: Number(payload.paymentAmount || payload.amount || 0) || 0,
      CustodyAccount_ID: payload.receivedCustodyAccountId || '',
      Total_Received: Number(payload.totalReceived || 0) || 0,
      Remaining_Mount: Number(payload.remainingAmount || 0) || 0,
      Project_Status: payload.projectStatus || '',
      Search_Text_AR: [payload.projectId, payload.clientId].join(' | '),
      Search_Text_EN: [payload.projectId, payload.clientId].join(' | ')
    };
  }
  if (moduleKey === 'internalChannels') {
    return {
      InternalChannel_AR: payload.arabicName || '',
      InternalChannel_EN: payload.englishName || '',
      RevChannel_ID: payload.revChannelId || '',
      Order_Date: nijjaraInputDateValue_(payload.orderDate),
      Order_Price: Number(payload.orderPrice || 0) || 0,
      Order_Status: payload.orderStatus || 'ACTIVE',
      Total_Received: Number(payload.totalReceived || 0) || 0,
      Total_Remaining: Number(payload.totalRemaining || 0) || 0,
      Is_Active: true,
      Search_Text_AR: [payload.arabicName, payload.englishName].join(' | '),
      Search_Text_EN: [payload.englishName].join(' | ')
    };
  }
  if (moduleKey === 'internalRevenuePayments') {
    return {
      InternalChannel_ID: payload.internalChannelId || '',
      Payment_Date: nijjaraInputDateValue_(payload.paymentDate || payload.date),
      Payment_Amount: Number(payload.paymentAmount || payload.amount || 0) || 0,
      CustodyAccount_ID: payload.receivedCustodyAccountId || '',
      Total_Received: Number(payload.totalReceived || 0) || 0,
      Total_Remaining: Number(payload.totalRemaining || 0) || 0,
      Notes: payload.statement || '',
      Statement_AR: payload.statement || '',
      Statement_EN: '',
      Payment_Status: 'APPROVED',
      Search_Text_AR: [payload.internalChannelId, payload.statement].join(' | '),
      Search_Text_EN: [payload.internalChannelId, payload.statement].join(' | ')
    };
  }
  if (moduleKey === 'collections') {
    return {
      Payment_Date: nijjaraInputDateValue_(payload.paymentDate),
      Project_ID: payload.projectId || '',
      Client_ID: payload.clientId || '',
      Payment_Amount: Number(payload.paymentAmount || 0) || 0,
      CustodyAccount_ID: payload.receivedCustodyAccountId || '',
      Total_Received: Number(payload.totalReceived || 0) || 0,
      Remaining_Mount: Number(payload.remainingAmount || 0) || 0,
      Project_Status: payload.projectStatus || '',
      Search_Text_AR: [payload.projectId, payload.clientId].join(' | '),
      Search_Text_EN: [payload.projectId, payload.clientId].join(' | ')
    };
  }
  if (moduleKey === 'revenueChannels') {
    return {
      RevChannel_AR: payload.arabicName || '',
      RevChannel_EN: payload.englishName || '',
      RevChannel_Type: payload.channelType || 'INTERNAL',
      Linked_Partner_ID: payload.linkedPartnerId || '',
      Status_Code: payload.statusCode || 'ACTIVE',
      Is_Active: String(payload.statusCode || 'ACTIVE').toUpperCase() === 'ACTIVE',
      Search_Text_AR: [payload.arabicName].join(' | '),
      Search_Text_EN: [payload.englishName].join(' | ')
    };
  }
  return payload || {};
}

function nijjaraNextModuleId_(sheetName, idField, prefix) {
  var rows = nijjaraRows_(sheetName);
  var maxId = rows.reduce(function (maxValue, row) {
    var current = String(row[idField] || '');
    if (current.indexOf(prefix) !== 0) return maxValue;
    var numeric = Number(current.replace(prefix, '').replace(/[^0-9]/g, '')) || 0;
    return Math.max(maxValue, numeric);
  }, 0);
  return prefix + ('0000' + (maxId + 1)).slice(-4);
}

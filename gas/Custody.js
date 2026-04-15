function nijjaraGetCustodyModuleData(sessionToken) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) {
    throw new Error('Session expired.');
  }
  nijjaraGuardAccess_(session, 'custody', 'view');
  return JSON.stringify(nijjaraGetCustodyModuleData_(session));
}

function nijjaraGetCustodyModuleData_(session) {
  nijjaraEnsureExpenseCustodyTransactions_();
  var accounts = nijjaraRows_('FIN_CustodyAccounts');
  var transfers = nijjaraRows_('FIN_CustodyTransfers');
  var transactions = nijjaraRows_('FIN_CustodyTransactions');
  var users = nijjaraRows_('SYS_Users');
  var employeeMap = {};
  nijjaraRows_('HRM_Employees').forEach(function (row) {
    employeeMap[String(row.Employee_ID || '')] = row;
  });
  var partnerMap = {};
  nijjaraRows_('PAR_Partners').forEach(function (row) {
    partnerMap[String(row.Partner_ID || '')] = row;
  });
  var userById = {};
  users.forEach(function (row) {
    userById[String(row.User_ID || '')] = row;
  });
  var accountMap = {};

  var normalizedAccounts = accounts.filter(function (row) {
    return nijjaraRowVisible_(row);
  }).map(function (row) {
    var linkedId = String(row.Linked_ID || '');
    var employee = employeeMap[linkedId];
    var partner = partnerMap[linkedId];
    var holderNameAr = row.CustodyAccount_AR || (employee && employee.Full_Name_AR) || (partner && partner.Partner_Name_AR) || linkedId;
    var holderNameEn = (employee && employee.Full_Name_EN) || (partner && partner.Partner_Name_EN) || '';
    var item = {
      id: row.CustodyAccount_ID,
      accountNameAr: holderNameAr,
      accountNameEn: holderNameEn,
      createdAt: row.Created_At || '',
      linkedId: linkedId,
      holderType: row.Holder_Type || '',
      currentBalance: Number(row.Current_Balance || 0) || 0,
      openingBalance: Number(row.Opening_Balance || 0) || 0,
      fundingType: row.Funding_Type || 'STANDARD',
      allowExpenseUse: String(row.Allow_Expense_Use).toLowerCase() !== 'false',
      statusCode: row.Status_Code || 'ACTIVE'
    };
    accountMap[item.id] = item;
    return item;
  });

  var visibleTransfers = transfers.filter(function (row) {
    return nijjaraRowVisible_(row) && nijjaraCanAccessTransfer_(session, row);
  }).map(function (row) {
    return {
      id: row.CustodyTransfer_ID,
      sourceAccountId: row.Source_CustodyAccount_ID,
      destinationAccountId: row.Destination_CustodyAccount_ID,
      sourceAccountLabel: accountMap[row.Source_CustodyAccount_ID] ? accountMap[row.Source_CustodyAccount_ID].accountNameAr : row.Source_CustodyAccount_ID,
      destinationAccountLabel: accountMap[row.Destination_CustodyAccount_ID] ? accountMap[row.Destination_CustodyAccount_ID].accountNameAr : row.Destination_CustodyAccount_ID,
      amount: Number(row.Transfer_Amount || 0) || 0,
      date: row.Transfer_Date || '',
      statusCode: row.Status_Code || row.Workflow_Status || 'DRAFT',
      workflowStatus: row.Workflow_Status || row.Status_Code || 'DRAFT',
      reasonAr: row.Reason_AR || '',
      requestedByUserId: row.Requested_By_User_ID || '',
      receiverUserId: row.Receiver_User_ID || '',
      requestedByName: userById[row.Requested_By_User_ID] ? userById[row.Requested_By_User_ID].Display_Name_AR : (row.Requested_By_Username || ''),
      receiverName: userById[row.Receiver_User_ID] ? userById[row.Receiver_User_ID].Display_Name_AR : (row.Receiver_Username || ''),
      availableActions: nijjaraResolveTransferActions_(session, row)
    };
  }).sort(function (left, right) {
    return String(right.date).localeCompare(String(left.date));
  });

  var unifiedTransactions = transactions.filter(function (row) {
    return nijjaraRowVisible_(row);
  }).map(function (row) {
    return {
      id: row.CustodyTxn_ID,
      custodyAccountId: row.CustodyAccount_ID,
      custodyAccountLabel: accountMap[row.CustodyAccount_ID] ? accountMap[row.CustodyAccount_ID].accountNameAr : row.CustodyAccount_ID,
      transactionDate: row.Transaction_Date || '',
      transactionType: row.Transaction_Type || '',
      amount: Number(row.Amount || 0) || 0,
      balanceBefore: Number(row.Balance_Before || 0) || 0,
      balanceAfter: Number(row.Balance_After || 0) || 0,
      sourceModule: row.Source_Module || '',
      sourceSubModule: row.Source_SubModule || '',
      sourceRecordId: row.Source_Record_ID || '',
      statementAr: row.Statement_AR || '',
      statusCode: row.Status_Code || ''
    };
  }).sort(function (left, right) {
    return String(right.transactionDate).localeCompare(String(left.transactionDate));
  });

  return {
    accounts: normalizedAccounts.sort(function (left, right) {
      return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
    }),
    transfers: visibleTransfers,
    transactions: unifiedTransactions,
    actions: {
      canCreateAccount: nijjaraHasAccess_(session, 'custody', 'create'),
      canAdjustBalance: nijjaraHasAnyPermission_(session, ['CUSTODY_BALANCE_ADJUST']),
      canCreateTransfer: nijjaraHasAnyPermission_(session, ['CUSTODY_TRANSFER_CREATE'])
    }
  };
}

function nijjaraCanAccessTransfer_(session, row) {
  if ((session.roles || []).indexOf('super_admin') !== -1 || (session.roles || []).indexOf('finance_manager') !== -1) {
    return true;
  }
  var userId = String(session.userId || '');
  return String(row.Requested_By_User_ID || '') === userId || String(row.Receiver_User_ID || '') === userId;
}

function nijjaraResolveTransferActions_(session, row) {
  var status = String(row.Workflow_Status || row.Status_Code || '').toUpperCase();
  var userId = String(session.userId || '');
  var isSender = String(row.Requested_By_User_ID || '') === userId;
  var isReceiver = String(row.Receiver_User_ID || '') === userId;
  var isAdmin = (session.roles || []).indexOf('super_admin') !== -1 || (session.roles || []).indexOf('finance_manager') !== -1;
  if (status === 'APPROVED' || status === 'REJECTED' || status === 'CANCELLED' || status === 'COMPLETED') {
    return [];
  }
  var actions = [];
  if ((isReceiver || isAdmin) && nijjaraHasAnyPermission_(session, ['CUSTODY_TRANSFER_APPROVE'])) {
    actions.push({ code: 'APPROVE', label: 'اعتماد' });
  }
  if ((isReceiver || isAdmin) && nijjaraHasAnyPermission_(session, ['CUSTODY_TRANSFER_REVIEW'])) {
    actions.push({ code: 'REJECT', label: 'رفض' });
  }
  if ((isSender || isAdmin) && nijjaraHasAnyPermission_(session, ['CUSTODY_TRANSFER_CANCEL'])) {
    actions.push({ code: 'CANCEL', label: 'إلغاء' });
    actions.push({ code: 'EDIT', label: 'تعديل' });
  }
  return actions;
}

function nijjaraGenerateCustodyAccountName_(holderTypeCode, employee, partner, linkedEntityId) {
  var holderType = String(holderTypeCode || '').trim().toUpperCase();
  var nameAr = (employee && employee.Full_Name_AR) || (partner && partner.Partner_Name_AR) || linkedEntityId || '';
  if (!nameAr) return linkedEntityId || '';
  if (holderType === 'PARTNER') return 'عهدة شريك - ' + nameAr;
  return 'عهدة الموظف - ' + nameAr;
}

function nijjaraCreateCustodyTransfer(sessionToken, payload) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, 'custody', 'create');

  payload = payload || {};
  var sourceAccountId = String(payload.sourceAccountId || '').trim();
  var destinationAccountId = String(payload.destinationAccountId || '').trim();
  var amount = Number(payload.amount || 0) || 0;
  var reasonAr = String(payload.reasonAr || '').trim();

  if (!sourceAccountId || !destinationAccountId || sourceAccountId === destinationAccountId) {
    throw new Error('Valid source and destination custody accounts are required.');
  }
  if (amount <= 0) {
    throw new Error('Transfer amount must be greater than zero.');
  }

  var sourceAccount = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === sourceAccountId;
  });
  var destinationAccount = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === destinationAccountId;
  });
  if (!sourceAccount || !destinationAccount) {
    throw new Error('Custody account was not found.');
  }

  var receiverUserId = nijjaraResolveLinkedUserId_(destinationAccount.Linked_ID);
  var transferId = nijjaraRandomId_('CTR-');
  var now = nijjaraNow_();
  nijjaraAppendRow_('FIN_CustodyTransfers', {
    CustodyTransfer_ID: transferId,
    Source_CustodyAccount_ID: sourceAccountId,
    Destination_CustodyAccount_ID: destinationAccountId,
    Transfer_Amount: amount,
    Transfer_Date: now,
    Reason_AR: reasonAr,
    Reason_EN: '',
    Requested_By_User_ID: session.userId,
    Requested_By_Username: session.username,
    Receiver_User_ID: receiverUserId,
    Receiver_Username: '',
    Linked_CompanyLedger_ID: '',
    Status_Code: 'UNDER_REVIEW',
    Search_Text_AR: [sourceAccount.CustodyAccount_AR, destinationAccount.CustodyAccount_AR, reasonAr].join(' | '),
    Search_Text_EN: [sourceAccountId, destinationAccountId].join(' | '),
    Attachment_Count: Number(payload.attachmentCount || 0) || 0,
    Created_At: now,
    Created_By: session.username,
    Updated_At: now,
    Updated_By: session.username,
    Reviewed_At: '',
    Reviewed_By: '',
    Approved_At: '',
    Approved_By: '',
    Rejected_At: '',
    Rejected_By: '',
    Cancelled_At: '',
    Cancelled_By: '',
    Workflow_Code: 'WF-0005',
    Workflow_Status: 'UNDER_REVIEW',
    Action_Notes: reasonAr
  });

  if (receiverUserId) {
    nijjaraCreateNotification_({
      targetUserId: receiverUserId,
      moduleCode: 'FIN',
      subModuleCode: 'CUSTODY_TRANSFERS',
      sourceRecordId: transferId,
      notificationTypeCode: 'WORKFLOW_REQUEST',
      titleAr: 'طلب تحويل عهدة جديد',
      bodyAr: 'تم إرسال طلب تحويل عهدة جديد بانتظار مراجعتك.',
      actionCode: 'OPEN',
      requiresAction: true,
      createdBy: session.username
    });
  }
  nijjaraCreateNotification_({
    targetRoleCode: 'finance_manager',
    moduleCode: 'FIN',
    subModuleCode: 'CUSTODY_TRANSFERS',
    sourceRecordId: transferId,
    notificationTypeCode: 'WORKFLOW_REQUEST',
    titleAr: 'طلب تحويل عهدة جديد',
    bodyAr: 'تم إنشاء طلب تحويل عهدة جديد داخل النظام.',
    actionCode: 'OPEN',
    requiresAction: true,
    createdBy: session.username
  });

  nijjaraAudit_('FIN', 'CUSTODY_TRANSFERS', 'CREATE', 'MEDIUM', 'SUCCESS', session.userId, 'تم إنشاء طلب تحويل عهدة', 'تم إنشاء طلب تحويل عهدة جديد برقم ' + transferId);
  CacheService.getScriptCache().remove('bootstrap:' + session.userId);
  nijjaraClearSharedCaches_();
  return JSON.stringify(nijjaraGetCustodyModuleData_(session));
}

function nijjaraCreateCustodyAccount(sessionToken, payload) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, 'custody', 'create');

  payload = payload || {};
  var holderTypeCode = String(payload.holderTypeCode || '').trim().toUpperCase();
  var linkedEntityId = String(payload.linkedEntityId || '').trim();
  var openingBalance = Number(payload.openingBalance || 0) || 0;
  var allowExpenseUse = String(payload.allowExpenseUse || 'true') !== 'false';
  var statusCode = String(payload.statusCode || 'ACTIVE').trim();
  var fundingSourceType = String(payload.fundingSourceType || 'DIRECT').trim().toUpperCase();
  var sourceCustodyAccountId = String(payload.sourceCustodyAccountId || '').trim();
  if (!holderTypeCode || !linkedEntityId) {
    throw new Error('Account holder information is required.');
  }
  var employee = holderTypeCode === 'EMPLOYEE'
    ? nijjaraFindOne_('HRM_Employees', function (row) { return String(row.Employee_ID || '') === linkedEntityId; })
    : null;
  var partner = holderTypeCode === 'PARTNER'
    ? nijjaraFindOne_('PAR_Partners', function (row) { return String(row.Partner_ID || '') === linkedEntityId; })
    : null;
  var accountNameArabic = nijjaraGenerateCustodyAccountName_(holderTypeCode, employee, partner, linkedEntityId);
  if (fundingSourceType === 'FROM_CUSTODY' && !sourceCustodyAccountId) {
    throw new Error('Source custody account is required for transferred opening balance.');
  }

  var custodyAccountId = nijjaraRandomId_('CUS-');
  var fundingType = fundingSourceType === 'FROM_CUSTODY'
    ? 'TRANSFER'
    : (openingBalance < 0 ? 'TEMP_PARTNER_FUNDING' : 'STANDARD');

  nijjaraAppendRow_('FIN_CustodyAccounts', {
    CustodyAccount_ID: custodyAccountId,
    CustodyAccount_AR: accountNameArabic,
    Linked_ID: linkedEntityId,
    Is_Active: statusCode === 'ACTIVE',
    Search_Text_AR: [accountNameArabic, linkedEntityId].join(' | '),
    Search_Text_EN: linkedEntityId,
    Holder_Type: holderTypeCode,
    Linked_User_ID: nijjaraResolveLinkedUserId_(linkedEntityId),
    Opening_Balance: openingBalance,
    Current_Balance: openingBalance,
    Funding_Type: fundingType,
    Allow_Expense_Use: allowExpenseUse,
    Status_Code: statusCode,
    Currency_Code: 'EGP',
    Last_Balance_Update_At: nijjaraNow_(),
    Last_Balance_Update_By: session.username,
    Created_At: nijjaraNow_(),
    Created_By: session.username,
    Updated_At: nijjaraNow_(),
    Updated_By: session.username
  });

  if (fundingSourceType === 'FROM_CUSTODY' && openingBalance > 0) {
    var sourceAccount = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
      return String(row.CustodyAccount_ID || '') === sourceCustodyAccountId;
    });
    if (!sourceAccount) {
      throw new Error('Source custody account was not found.');
    }
    var now = nijjaraNow_();
    var sourceBefore = Number(sourceAccount.Current_Balance || 0) || 0;
    var sourceAfter = sourceBefore - openingBalance;
    nijjaraUpdateByRow_('FIN_CustodyAccounts', sourceAccount.__row, {
      Current_Balance: sourceAfter,
      Last_Balance_Update_At: now,
      Last_Balance_Update_By: session.username,
      Updated_At: now,
      Updated_By: session.username
    });
    nijjaraAppendRow_('FIN_CustodyTransactions', {
      CustodyTxn_ID: nijjaraRandomId_('CTX-'),
      CustodyAccount_ID: sourceCustodyAccountId,
      Transaction_Date: now,
      Transaction_Type: 'TRANSFER_OUT',
      Source_Module: 'FIN',
      Source_SubModule: 'CUSTODY_ACCOUNTS',
      Source_Record_ID: custodyAccountId,
      Counterparty_CustodyAccount_ID: custodyAccountId,
      Amount: -openingBalance,
      Balance_Before: sourceBefore,
      Balance_After: sourceAfter,
      Statement_AR: 'تمويل رصيد افتتاحي',
      Statement_EN: '',
      Linked_CompanyLedger_ID: '',
      Status_Code: 'APPROVED',
      Search_Text_AR: [sourceAccount.CustodyAccount_AR || '', accountNameArabic].join(' | '),
      Search_Text_EN: [sourceCustodyAccountId, custodyAccountId].join(' | '),
      Attachment_Count: 0,
      Created_At: now,
      Created_By: session.username,
      Updated_At: now,
      Updated_By: session.username,
      Reviewed_At: now,
      Reviewed_By: session.userId,
      Approved_At: now,
      Approved_By: session.userId,
      Rejected_At: '',
      Rejected_By: '',
      Cancelled_At: '',
      Cancelled_By: '',
      Workflow_Code: 'OPENING_BALANCE_TRANSFER',
      Workflow_Status: 'APPROVED',
      Action_Notes: 'تمويل رصيد افتتاحي'
    });
    nijjaraAppendRow_('FIN_CustodyTransactions', {
      CustodyTxn_ID: nijjaraRandomId_('CTX-'),
      CustodyAccount_ID: custodyAccountId,
      Transaction_Date: now,
      Transaction_Type: 'TRANSFER_IN',
      Source_Module: 'FIN',
      Source_SubModule: 'CUSTODY_ACCOUNTS',
      Source_Record_ID: custodyAccountId,
      Counterparty_CustodyAccount_ID: sourceCustodyAccountId,
      Amount: openingBalance,
      Balance_Before: 0,
      Balance_After: openingBalance,
      Statement_AR: 'تمويل رصيد افتتاحي',
      Statement_EN: '',
      Linked_CompanyLedger_ID: '',
      Status_Code: 'APPROVED',
      Search_Text_AR: [accountNameArabic, sourceAccount.CustodyAccount_AR || ''].join(' | '),
      Search_Text_EN: [custodyAccountId, sourceCustodyAccountId].join(' | '),
      Attachment_Count: 0,
      Created_At: now,
      Created_By: session.username,
      Updated_At: now,
      Updated_By: session.username,
      Reviewed_At: now,
      Reviewed_By: session.userId,
      Approved_At: now,
      Approved_By: session.userId,
      Rejected_At: '',
      Rejected_By: '',
      Cancelled_At: '',
      Cancelled_By: '',
      Workflow_Code: 'OPENING_BALANCE_TRANSFER',
      Workflow_Status: 'APPROVED',
      Action_Notes: 'تمويل رصيد افتتاحي'
    });
  }

  nijjaraAudit_('FIN', 'CUSTODY_ACCOUNTS', 'CREATE', 'MEDIUM', 'SUCCESS', session.userId, 'تم إنشاء حساب عهدة', 'تم إنشاء حساب عهدة جديد باسم ' + accountNameArabic);
  CacheService.getScriptCache().remove('bootstrap:' + session.userId);
  nijjaraClearSharedCaches_();
  return JSON.stringify(nijjaraGetCustodyModuleData_(session));
}

function nijjaraUpdateCustodyAccount(sessionToken, custodyAccountId, payload) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, 'custody', 'edit');

  payload = payload || {};
  var account = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === String(custodyAccountId || '');
  });
  if (!account) throw new Error('Custody account was not found.');

  var statusCode = String(payload.statusCode || 'ACTIVE').trim();
  var holderTypeCode = String(payload.holderTypeCode || account.Holder_Type || '').trim().toUpperCase();
  var linkedEntityId = String(payload.linkedEntityId || account.Linked_ID || '').trim();
  var previousOpeningBalance = Number(account.Opening_Balance || 0) || 0;
  var previousCurrentBalance = Number(account.Current_Balance || 0) || 0;
  var nextOpeningBalance = payload.openingBalance === '' || payload.openingBalance == null
    ? previousOpeningBalance
    : (Number(payload.openingBalance || 0) || 0);
  var openingDelta = nextOpeningBalance - previousOpeningBalance;
  var nextCurrentBalance = previousCurrentBalance + openingDelta;
  var employee = holderTypeCode === 'EMPLOYEE'
    ? nijjaraFindOne_('HRM_Employees', function (row) { return String(row.Employee_ID || '') === linkedEntityId; })
    : null;
  var partner = holderTypeCode === 'PARTNER'
    ? nijjaraFindOne_('PAR_Partners', function (row) { return String(row.Partner_ID || '') === linkedEntityId; })
    : null;
  var accountNameArabic = nijjaraGenerateCustodyAccountName_(holderTypeCode, employee, partner, linkedEntityId);
  nijjaraUpdateByRow_('FIN_CustodyAccounts', account.__row, {
    CustodyAccount_AR: accountNameArabic,
    Holder_Type: holderTypeCode,
    Linked_ID: linkedEntityId,
    Opening_Balance: nextOpeningBalance,
    Current_Balance: nextCurrentBalance,
    Allow_Expense_Use: String(payload.allowExpenseUse || 'true') !== 'false',
    Status_Code: statusCode,
    Is_Active: statusCode === 'ACTIVE',
    Search_Text_AR: [accountNameArabic, linkedEntityId].join(' | '),
    Search_Text_EN: linkedEntityId,
    Last_Balance_Update_At: nijjaraNow_(),
    Last_Balance_Update_By: session.username,
    Updated_At: nijjaraNow_(),
    Updated_By: session.username
  });

  if (openingDelta !== 0) {
    var now = nijjaraNow_();
    var adjustmentId = nijjaraRandomId_('CADJ-');
    nijjaraAppendRow_('FIN_CustodyAdjustments', {
      CustodyAdj_ID: adjustmentId,
      CustodyAccount_ID: custodyAccountId,
      Adjustment_Date: now,
      Balance_Before: previousCurrentBalance,
      Adjustment_Amount: openingDelta,
      Balance_After: nextCurrentBalance,
      Adjustment_Reason_AR: 'تحديث الرصيد الافتتاحي من نموذج الحساب',
      Adjustment_Reason_EN: 'Opening balance updated from custody account form',
      Requested_By_User_ID: session.userId,
      Status_Code: 'APPROVED',
      Search_Text_AR: [accountNameArabic, 'تحديث الرصيد الافتتاحي'].join(' | '),
      Search_Text_EN: custodyAccountId,
      Attachment_Count: Number(payload.attachmentCount || 0) || 0,
      Created_At: now,
      Created_By: session.username,
      Updated_At: now,
      Updated_By: session.username,
      Reviewed_At: now,
      Reviewed_By: session.userId,
      Approved_At: now,
      Approved_By: session.userId,
      Rejected_At: '',
      Rejected_By: '',
      Cancelled_At: '',
      Cancelled_By: '',
      Workflow_Code: 'OPENING_BALANCE_EDIT'
    });
    nijjaraAppendRow_('FIN_CustodyTransactions', {
      CustodyTxn_ID: nijjaraRandomId_('CTX-'),
      CustodyAccount_ID: custodyAccountId,
      Transaction_Date: now,
      Transaction_Type: 'ADJUSTMENT',
      Source_Module: 'FIN',
      Source_SubModule: 'CUSTODY_ACCOUNTS',
      Source_Record_ID: adjustmentId,
      Counterparty_CustodyAccount_ID: '',
      Amount: openingDelta,
      Balance_Before: previousCurrentBalance,
      Balance_After: nextCurrentBalance,
      Statement_AR: 'تحديث الرصيد الافتتاحي من نموذج الحساب',
      Statement_EN: 'Opening balance updated from custody account form',
      Linked_CompanyLedger_ID: '',
      Status_Code: 'APPROVED',
      Search_Text_AR: [accountNameArabic, 'تحديث الرصيد الافتتاحي'].join(' | '),
      Search_Text_EN: custodyAccountId,
      Attachment_Count: Number(payload.attachmentCount || 0) || 0,
      Created_At: now,
      Created_By: session.username,
      Updated_At: now,
      Updated_By: session.username,
      Reviewed_At: now,
      Reviewed_By: session.userId,
      Approved_At: now,
      Approved_By: session.userId,
      Rejected_At: '',
      Rejected_By: '',
      Cancelled_At: '',
      Cancelled_By: '',
      Workflow_Code: 'OPENING_BALANCE_EDIT',
      Workflow_Status: 'APPROVED',
      Action_Notes: 'تحديث الرصيد الافتتاحي من نموذج الحساب'
    });
  }

  nijjaraAudit_('FIN', 'CUSTODY_ACCOUNTS', 'UPDATE', 'MEDIUM', 'SUCCESS', session.userId, 'تم تعديل حساب عهدة', 'تم تعديل حساب العهدة ' + custodyAccountId);
  CacheService.getScriptCache().remove('bootstrap:' + session.userId);
  nijjaraClearSharedCaches_();
  return JSON.stringify(nijjaraGetCustodyModuleData_(session));
}

function nijjaraDeleteCustodyAccount(sessionToken, custodyAccountId) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, 'custody', 'edit');

  var account = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === String(custodyAccountId || '');
  });
  if (!account) throw new Error('Custody account was not found.');

  nijjaraUpdateByRow_('FIN_CustodyAccounts', account.__row, {
    Status_Code: 'INACTIVE',
    Is_Active: false,
    Updated_At: nijjaraNow_(),
    Updated_By: session.username
  });

  nijjaraAudit_('FIN', 'CUSTODY_ACCOUNTS', 'DELETE', 'HIGH', 'SUCCESS', session.userId, 'تم تعطيل حساب عهدة', 'تم تعطيل حساب العهدة ' + custodyAccountId);
  CacheService.getScriptCache().remove('bootstrap:' + session.userId);
  nijjaraClearSharedCaches_();
  return JSON.stringify(nijjaraGetCustodyModuleData_(session));
}

function nijjaraAdjustCustodyBalance(sessionToken, payload) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, 'custody', 'edit');

  payload = payload || {};
  var custodyAccountId = String(payload.custodyAccountId || '').trim();
  var targetBalance = Number(payload.targetBalance || 0) || 0;
  var reason = String(payload.reasonAr || '').trim();
  var account = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === custodyAccountId;
  });
  if (!account) throw new Error('Custody account was not found.');

  var before = Number(account.Current_Balance || 0) || 0;
  var delta = targetBalance - before;
  var adjustmentId = nijjaraRandomId_('CADJ-');
  var now = nijjaraNow_();

  nijjaraAppendRow_('FIN_CustodyAdjustments', {
    CustodyAdj_ID: adjustmentId,
    CustodyAccount_ID: custodyAccountId,
    Adjustment_Date: now,
    Balance_Before: before,
    Adjustment_Amount: delta,
    Balance_After: targetBalance,
    Adjustment_Reason_AR: reason,
    Adjustment_Reason_EN: '',
    Requested_By_User_ID: session.userId,
    Status_Code: 'APPROVED',
    Search_Text_AR: [account.CustodyAccount_AR, reason].join(' | '),
    Search_Text_EN: custodyAccountId,
    Attachment_Count: Number(payload.attachmentCount || 0) || 0,
    Created_At: now,
    Created_By: session.username,
    Updated_At: now,
    Updated_By: session.username,
    Reviewed_At: now,
    Reviewed_By: session.userId,
    Approved_At: now,
    Approved_By: session.userId,
    Rejected_At: '',
    Rejected_By: '',
    Cancelled_At: '',
    Cancelled_By: '',
    Workflow_Code: 'BALANCE_ADJUSTMENT',
    Workflow_Status: 'APPROVED',
    Action_Notes: reason
  });

  nijjaraUpdateByRow_('FIN_CustodyAccounts', account.__row, {
    Current_Balance: targetBalance,
    Last_Balance_Update_At: now,
    Last_Balance_Update_By: session.username,
    Updated_At: now,
    Updated_By: session.username
  });

  nijjaraAppendRow_('FIN_CustodyTransactions', {
    CustodyTxn_ID: nijjaraRandomId_('CTX-'),
    CustodyAccount_ID: custodyAccountId,
    Transaction_Date: now,
    Transaction_Type: 'ADJUSTMENT',
    Source_Module: 'FIN',
    Source_SubModule: 'CUSTODY_ADJUSTMENTS',
    Source_Record_ID: adjustmentId,
    Counterparty_CustodyAccount_ID: '',
    Amount: delta,
    Balance_Before: before,
    Balance_After: targetBalance,
    Statement_AR: reason || 'تعديل رصيد عهدة',
    Statement_EN: '',
    Linked_CompanyLedger_ID: '',
    Status_Code: 'APPROVED',
    Search_Text_AR: [account.CustodyAccount_AR, reason].join(' | '),
    Search_Text_EN: custodyAccountId,
    Attachment_Count: Number(payload.attachmentCount || 0) || 0,
    Created_At: now,
    Created_By: session.username,
    Updated_At: now,
    Updated_By: session.username,
    Reviewed_At: now,
    Reviewed_By: session.userId,
    Approved_At: now,
    Approved_By: session.userId,
    Rejected_At: '',
    Rejected_By: '',
    Cancelled_At: '',
    Cancelled_By: '',
    Workflow_Code: 'BALANCE_ADJUSTMENT',
    Workflow_Status: 'APPROVED',
    Action_Notes: reason
  });

  nijjaraAudit_('FIN', 'CUSTODY_ACCOUNTS', 'ADJUST_BALANCE', 'HIGH', 'SUCCESS', session.userId, 'تم تعديل رصيد عهدة', 'تم تعديل رصيد العهدة ' + custodyAccountId + ' إلى ' + targetBalance);
  CacheService.getScriptCache().remove('bootstrap:' + session.userId);
  nijjaraClearSharedCaches_();
  return JSON.stringify(nijjaraGetCustodyModuleData_(session));
}

function nijjaraActOnCustodyTransfer(sessionToken, transferId, actionCode, notes) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  var transfer = nijjaraFindOne_('FIN_CustodyTransfers', function (row) {
    return String(row.CustodyTransfer_ID || '') === String(transferId || '');
  });
  if (!transfer) throw new Error('Transfer was not found.');

  var allowed = nijjaraResolveTransferActions_(session, transfer).map(function (item) { return item.code; });
  if (allowed.indexOf(actionCode) === -1) {
    throw new Error('This transfer action is not allowed.');
  }

  var now = nijjaraNow_();
  var sourceAccount = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === String(transfer.Source_CustodyAccount_ID || '');
  });
  var destinationAccount = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === String(transfer.Destination_CustodyAccount_ID || '');
  });
  var sourceBefore = Number(sourceAccount.Current_Balance || 0) || 0;
  var destinationBefore = Number(destinationAccount.Current_Balance || 0) || 0;
  var amount = Number(transfer.Transfer_Amount || 0) || 0;

  if (actionCode === 'APPROVE') {
    var sourceAfter = sourceBefore - amount;
    var destinationAfter = destinationBefore + amount;
    nijjaraUpdateByRow_('FIN_CustodyAccounts', sourceAccount.__row, {
      Current_Balance: sourceAfter,
      Last_Balance_Update_At: now,
      Last_Balance_Update_By: session.username,
      Updated_At: now,
      Updated_By: session.username
    });
    nijjaraUpdateByRow_('FIN_CustodyAccounts', destinationAccount.__row, {
      Current_Balance: destinationAfter,
      Last_Balance_Update_At: now,
      Last_Balance_Update_By: session.username,
      Updated_At: now,
      Updated_By: session.username
    });
    nijjaraAppendRow_('FIN_CustodyTransactions', nijjaraTransferTransactionRow_(transfer, sourceAccount, destinationAccount, sourceBefore, sourceAfter, -amount, 'TRANSFER_OUT', now, session, notes));
    nijjaraAppendRow_('FIN_CustodyTransactions', nijjaraTransferTransactionRow_(transfer, destinationAccount, sourceAccount, destinationBefore, destinationAfter, amount, 'TRANSFER_IN', now, session, notes));
    nijjaraUpdateByRow_('FIN_CustodyTransfers', transfer.__row, {
      Status_Code: 'APPROVED',
      Workflow_Status: 'APPROVED',
      Reviewed_At: now,
      Reviewed_By: session.userId,
      Approved_At: now,
      Approved_By: session.userId,
      Updated_At: now,
      Updated_By: session.username,
      Action_Notes: notes || transfer.Action_Notes
    });
    nijjaraCreateNotification_({
      targetUserId: transfer.Requested_By_User_ID,
      moduleCode: 'FIN',
      subModuleCode: 'CUSTODY_TRANSFERS',
      sourceRecordId: transferId,
      notificationTypeCode: 'WORKFLOW_RESPONSE',
      titleAr: 'تم اعتماد طلب تحويل العهدة',
      bodyAr: 'تم اعتماد طلب تحويل العهدة وتحديث الأرصدة بنجاح.',
      actionCode: 'OPEN',
      requiresAction: false,
      createdBy: session.username
    });
  } else if (actionCode === 'REJECT') {
    nijjaraUpdateByRow_('FIN_CustodyTransfers', transfer.__row, {
      Status_Code: 'REJECTED',
      Workflow_Status: 'REJECTED',
      Reviewed_At: now,
      Reviewed_By: session.userId,
      Rejected_At: now,
      Rejected_By: session.userId,
      Updated_At: now,
      Updated_By: session.username,
      Action_Notes: notes || transfer.Action_Notes
    });
    nijjaraCreateNotification_({
      targetUserId: transfer.Requested_By_User_ID,
      moduleCode: 'FIN',
      subModuleCode: 'CUSTODY_TRANSFERS',
      sourceRecordId: transferId,
      notificationTypeCode: 'WORKFLOW_RESPONSE',
      titleAr: 'تم رفض طلب تحويل العهدة',
      bodyAr: 'تم رفض طلب تحويل العهدة.',
      actionCode: 'OPEN',
      requiresAction: false,
      createdBy: session.username
    });
  } else if (actionCode === 'CANCEL') {
    nijjaraUpdateByRow_('FIN_CustodyTransfers', transfer.__row, {
      Status_Code: 'CANCELLED',
      Workflow_Status: 'CANCELLED',
      Cancelled_At: now,
      Cancelled_By: session.userId,
      Updated_At: now,
      Updated_By: session.username,
      Action_Notes: notes || transfer.Action_Notes
    });
  }

  nijjaraAudit_('FIN', 'CUSTODY_TRANSFERS', actionCode, 'HIGH', 'SUCCESS', session.userId, 'تم تنفيذ إجراء على طلب تحويل عهدة', 'تم تنفيذ الإجراء ' + actionCode + ' على الطلب ' + transferId);
  CacheService.getScriptCache().remove('bootstrap:' + session.userId);
  nijjaraClearSharedCaches_();
  return JSON.stringify(nijjaraGetCustodyModuleData_(session));
}

function nijjaraUpdateCustodyTransfer(sessionToken, transferId, payload) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  nijjaraGuardAccess_(session, 'custody', 'create');

  payload = payload || {};
  var transfer = nijjaraFindOne_('FIN_CustodyTransfers', function (row) {
    return String(row.CustodyTransfer_ID || '') === String(transferId || '');
  });
  if (!transfer) throw new Error('Transfer was not found.');

  var isSender = String(transfer.Requested_By_User_ID || '') === String(session.userId || '');
  var isAdmin = (session.roles || []).indexOf('super_admin') !== -1 || (session.roles || []).indexOf('finance_manager') !== -1;
  var statusCode = String(transfer.Workflow_Status || transfer.Status_Code || '').toUpperCase();
  if (!isSender && !isAdmin) throw new Error('This transfer cannot be edited by the current user.');
  if (statusCode === 'APPROVED' || statusCode === 'REJECTED' || statusCode === 'CANCELLED' || statusCode === 'COMPLETED') {
    throw new Error('This transfer can no longer be edited.');
  }

  var destinationAccount = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === String(payload.destinationAccountId || transfer.Destination_CustodyAccount_ID || '');
  });

  nijjaraUpdateByRow_('FIN_CustodyTransfers', transfer.__row, {
    Source_CustodyAccount_ID: String(payload.sourceAccountId || transfer.Source_CustodyAccount_ID || '').trim(),
    Destination_CustodyAccount_ID: String(payload.destinationAccountId || transfer.Destination_CustodyAccount_ID || '').trim(),
    Transfer_Amount: Number(payload.amount || transfer.Transfer_Amount || 0) || 0,
    Reason_AR: String(payload.reasonAr || transfer.Reason_AR || '').trim(),
    Receiver_User_ID: destinationAccount ? nijjaraResolveLinkedUserId_(destinationAccount.Linked_ID) : (transfer.Receiver_User_ID || ''),
    Updated_At: nijjaraNow_(),
    Updated_By: session.username
  });

  nijjaraAudit_('FIN', 'CUSTODY_TRANSFERS', 'UPDATE', 'MEDIUM', 'SUCCESS', session.userId, 'تم تعديل طلب تحويل عهدة', 'تم تعديل طلب تحويل العهدة ' + transferId);
  CacheService.getScriptCache().remove('bootstrap:' + session.userId);
  nijjaraClearSharedCaches_();
  return JSON.stringify(nijjaraGetCustodyModuleData_(session));
}

function nijjaraDeleteCustodyTransfer(sessionToken, transferId) {
  return nijjaraActOnCustodyTransfer(sessionToken, transferId, 'CANCEL', 'تم الإلغاء من شاشة العهدة');
}

function nijjaraTransferTransactionRow_(transfer, primaryAccount, counterpartyAccount, before, after, amount, typeCode, now, session, notes) {
  return {
    CustodyTxn_ID: nijjaraRandomId_('CTX-'),
    CustodyAccount_ID: primaryAccount.CustodyAccount_ID,
    Transaction_Date: now,
    Transaction_Type: typeCode,
    Source_Module: 'FIN',
    Source_SubModule: 'CUSTODY_TRANSFERS',
    Source_Record_ID: transfer.CustodyTransfer_ID,
    Counterparty_CustodyAccount_ID: counterpartyAccount.CustodyAccount_ID,
    Amount: amount,
    Balance_Before: before,
    Balance_After: after,
    Statement_AR: notes || transfer.Reason_AR || 'تحويل عهدة',
    Statement_EN: '',
    Linked_CompanyLedger_ID: transfer.Linked_CompanyLedger_ID || '',
    Status_Code: 'APPROVED',
    Search_Text_AR: [primaryAccount.CustodyAccount_AR, counterpartyAccount.CustodyAccount_AR, transfer.Reason_AR].join(' | '),
    Search_Text_EN: [primaryAccount.CustodyAccount_ID, counterpartyAccount.CustodyAccount_ID].join(' | '),
    Attachment_Count: transfer.Attachment_Count || 0,
    Created_At: now,
    Created_By: session.username,
    Updated_At: now,
    Updated_By: session.username,
    Reviewed_At: now,
    Reviewed_By: session.userId,
    Approved_At: now,
    Approved_By: session.userId,
    Rejected_At: '',
    Rejected_By: '',
    Cancelled_At: '',
    Cancelled_By: '',
    Workflow_Code: transfer.Workflow_Code || 'WF-0005',
    Workflow_Status: 'APPROVED',
    Action_Notes: notes || transfer.Action_Notes
  };
}

function nijjaraResolveLinkedUserId_(linkedId) {
  var user = nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.Linked_Employee_ID || '') === String(linkedId || '');
  });
  return user ? String(user.User_ID || '') : '';
}

function nijjaraEnsureExpenseCustodyTransactions_() {
  var existingTransactions = nijjaraRows_('FIN_CustodyTransactions');
  if (existingTransactions.length) return;

  var accounts = nijjaraRows_('FIN_CustodyAccounts');
  var accountMap = {};
  accounts.forEach(function (row) {
    accountMap[String(row.CustodyAccount_ID || '')] = row;
  });

  var expenses = nijjaraRows_('FIN_Expenses')
    .filter(function (row) {
      return String(row.CustodyAccount_ID || '').trim() && (Number(row.Amount || 0) || 0) > 0;
    })
    .sort(function (left, right) {
      return String(left.Date || '').localeCompare(String(right.Date || ''));
    });

  var runningBalances = {};
  accounts.forEach(function (row) {
    runningBalances[String(row.CustodyAccount_ID || '')] = Number(row.Opening_Balance || 0) || 0;
  });

  expenses.forEach(function (expense) {
    var accountId = String(expense.CustodyAccount_ID || '').trim();
    var account = accountMap[accountId];
    if (!account) return;
    var before = Number(runningBalances[accountId] || 0) || 0;
    var amount = Number(expense.Amount || 0) || 0;
    var after = before - amount;
    runningBalances[accountId] = after;
    nijjaraAppendRow_('FIN_CustodyTransactions', nijjaraExpenseTransactionRow_(expense, account, before, after, {
      username: expense.Created_By || 'system',
      userId: expense.Created_By || ''
    }));
  });
}

function nijjaraSyncExpenseCustodyTransaction_(existingExpense, normalizedExpense, expenseId, session) {
  var now = nijjaraNow_();
  var accountId = String(normalizedExpense.CustodyAccount_ID || '').trim();
  var amount = Number(normalizedExpense.Amount || 0) || 0;
  var existingTxn = nijjaraFindOne_('FIN_CustodyTransactions', function (row) {
    return String(row.Source_Module || '') === 'FIN' &&
      String(row.Source_SubModule || '') === 'EXPENSES' &&
      String(row.Source_Record_ID || '') === String(expenseId || '');
  });

  if (existingTxn) {
    var previousAccount = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
      return String(row.CustodyAccount_ID || '') === String(existingTxn.CustodyAccount_ID || '');
    });
    if (previousAccount) {
      var restoredBalance = (Number(previousAccount.Current_Balance || 0) || 0) - (Number(existingTxn.Amount || 0) || 0);
      nijjaraUpdateByRow_('FIN_CustodyAccounts', previousAccount.__row, {
        Current_Balance: restoredBalance,
        Last_Balance_Update_At: now,
        Last_Balance_Update_By: session.username,
        Updated_At: now,
        Updated_By: session.username
      });
    }
    nijjaraDeleteRows_('FIN_CustodyTransactions', function (row) {
      return String(row.Source_Module || '') === 'FIN' &&
        String(row.Source_SubModule || '') === 'EXPENSES' &&
        String(row.Source_Record_ID || '') === String(expenseId || '');
    });
  }

  if (!accountId || amount <= 0) return;

  var account = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === accountId;
  });
  if (!account) return;

  var before = Number(account.Current_Balance || 0) || 0;
  var after = before - amount;
  nijjaraUpdateByRow_('FIN_CustodyAccounts', account.__row, {
    Current_Balance: after,
    Last_Balance_Update_At: now,
    Last_Balance_Update_By: session.username,
    Updated_At: now,
    Updated_By: session.username
  });

  nijjaraAppendRow_('FIN_CustodyTransactions', nijjaraExpenseTransactionRow_(Object.assign({}, normalizedExpense, {
    Expense_ID: expenseId,
    Date: normalizedExpense.Date || now,
    CustodyAccount_ID: accountId
  }), account, before, after, session));
}

function nijjaraRemoveExpenseCustodyTransaction_(expenseId, session) {
  var now = nijjaraNow_();
  var existingTxn = nijjaraFindOne_('FIN_CustodyTransactions', function (row) {
    return String(row.Source_Module || '') === 'FIN' &&
      String(row.Source_SubModule || '') === 'EXPENSES' &&
      String(row.Source_Record_ID || '') === String(expenseId || '');
  });
  if (!existingTxn) return;

  var account = nijjaraFindOne_('FIN_CustodyAccounts', function (row) {
    return String(row.CustodyAccount_ID || '') === String(existingTxn.CustodyAccount_ID || '');
  });
  if (account) {
    var restoredBalance = (Number(account.Current_Balance || 0) || 0) - (Number(existingTxn.Amount || 0) || 0);
    nijjaraUpdateByRow_('FIN_CustodyAccounts', account.__row, {
      Current_Balance: restoredBalance,
      Last_Balance_Update_At: now,
      Last_Balance_Update_By: session.username,
      Updated_At: now,
      Updated_By: session.username
    });
  }

  nijjaraDeleteRows_('FIN_CustodyTransactions', function (row) {
    return String(row.Source_Module || '') === 'FIN' &&
      String(row.Source_SubModule || '') === 'EXPENSES' &&
      String(row.Source_Record_ID || '') === String(expenseId || '');
  });
}

function nijjaraExpenseCustodyContext_(expense, account) {
  expense = expense || {};
  account = account || {};
  var projectId = String(expense.Project_ID || '').trim();
  var project = projectId ? nijjaraFindOne_('PRJ_Projects', function (row) {
    return String(row.Project_ID || '') === projectId;
  }) : null;
  var accountLabel = String(account.CustodyAccount_AR || account.Linked_ID || account.CustodyAccount_ID || '').trim();
  var projectLabel = project ? String(project.Project_Name_AR || project.Project_Name_EN || projectId || '').trim() : '';
  var sourceHolder = String(expense.From_Custody || '').trim();
  var notes = String(expense.Notes || '').trim();
  return {
    accountLabel: accountLabel,
    projectLabel: projectLabel,
    sourceHolder: sourceHolder,
    notes: notes
  };
}

function nijjaraExpenseCustodyStatementAr_(expense, account) {
  var context = nijjaraExpenseCustodyContext_(expense, account);
  var parts = [
    String(expense.Expense || expense.Category || 'مصروف').trim()
  ];
  if (context.projectLabel) parts.push('المشروع: ' + context.projectLabel);
  if (context.sourceHolder) parts.push('من العهدة: ' + context.sourceHolder);
  return parts.join(' | ');
}

function nijjaraExpenseTransactionRow_(expense, account, before, after, session) {
  var now = nijjaraNow_();
  var context = nijjaraExpenseCustodyContext_(expense, account);
  var searchArabicParts = [
    context.accountLabel,
    String(expense.Expense || '').trim(),
    String(expense.Category || '').trim(),
    String(expense.Sub_Category || '').trim(),
    context.projectLabel,
    context.sourceHolder,
    context.notes
  ].filter(Boolean);
  var actionNotes = [
    String(expense.Expense || expense.Category || 'مصروف').trim(),
    context.projectLabel ? ('المشروع: ' + context.projectLabel) : '',
    context.sourceHolder ? ('من العهدة: ' + context.sourceHolder) : '',
    context.notes ? ('ملاحظات: ' + context.notes) : ''
  ].filter(Boolean).join(' | ');
  return {
    CustodyTxn_ID: nijjaraRandomId_('CTX-'),
    CustodyAccount_ID: expense.CustodyAccount_ID,
    Transaction_Date: expense.Date || now,
    Transaction_Type: 'EXPENSE',
    Source_Module: 'FIN',
    Source_SubModule: 'EXPENSES',
    Source_Record_ID: expense.Expense_ID,
    Counterparty_CustodyAccount_ID: '',
    Amount: -(Number(expense.Amount || 0) || 0),
    Balance_Before: before,
    Balance_After: after,
    Statement_AR: nijjaraExpenseCustodyStatementAr_(expense, account),
    Statement_EN: '',
    Linked_CompanyLedger_ID: '',
    Status_Code: 'APPROVED',
    Search_Text_AR: searchArabicParts.join(' | '),
    Search_Text_EN: [expense.Expense_ID || '', expense.CustodyAccount_ID || '', expense.Project_ID || ''].join(' | '),
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
    Workflow_Code: 'EXPENSE_CUSTODY_LINK',
    Workflow_Status: 'APPROVED',
    Action_Notes: actionNotes
  };
}

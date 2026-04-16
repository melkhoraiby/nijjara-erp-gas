function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.initialParams = JSON.stringify((e && e.parameter) ? e.parameter : {});
  return template.evaluate()
    .setTitle(NIJJARA_CONFIG.systemName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function nijjaraRunOneTimeSetup() {
  nijjaraEnsureRevenuePaymentSchema_();
  return { done: true, timestamp: new Date().toISOString() };
}

function nijjaraSeedProjectBudgetRevisionBaselines() {
  var now = nijjaraNow_();
  var existingByProject = {};
  nijjaraRows_('PRJ_BudgetRevisions').forEach(function (row) {
    var projectId = String(row.Project_ID || '').trim();
    if (projectId) existingByProject[projectId] = true;
  });

  var created = 0;
  nijjaraRows_('PRJ_Projects').forEach(function (project) {
    var projectId = String(project.Project_ID || '').trim();
    if (!projectId || existingByProject[projectId]) return;
    var currentBudget = Number(project.Project_Budget || 0) || 0;
    var revisionDate = nijjaraInputDateValue_(project.Last_Budget_Change_At || project.Created_At || now);
    nijjaraAppendRow_('PRJ_BudgetRevisions', {
      BudgetRev_ID: nijjaraNextModuleId_('PRJ_BudgetRevisions', 'BudgetRev_ID', 'BREV-'),
      Project_ID: projectId,
      Revision_Date: revisionDate,
      Old_Budget: currentBudget,
      New_Budget: currentBudget,
      Delta_Amount: 0,
      Reason_AR: 'تهيئة أولية لميزانية المشروع',
      Reason_EN: 'Initial project budget baseline',
      Status_Code: 'APPROVED',
      Search_Text_AR: [projectId, project.Project_Name_AR || '', 'تهيئة أولية'].join(' | '),
      Search_Text_EN: [projectId, project.Project_Name_EN || '', 'initial baseline'].join(' | '),
      Attachment_Count: 0,
      Created_At: now,
      Created_By: 'system-seed',
      Updated_At: now,
      Updated_By: 'system-seed',
      Reviewed_At: now,
      Reviewed_By: 'system-seed',
      Approved_At: now,
      Approved_By: 'system-seed',
      Rejected_At: '',
      Rejected_By: '',
      Cancelled_At: '',
      Cancelled_By: '',
      Workflow_Code: 'PROJECT_BUDGET_BASELINE',
      Workflow_Status: 'APPROVED',
      Action_Notes: 'تهيئة أولية لميزانية المشروع'
    });
    nijjaraApplyProjectBudgetCascade_(projectId, currentBudget, revisionDate, 'system-seed', 'system-seed');
    created += 1;
  });

  NIJJARA_ROWS_CACHE_['PRJ_BudgetRevisions'] = null;
  NIJJARA_ROWS_CACHE_['PRJ_Projects'] = null;
  NIJJARA_ROWS_CACHE_['PRJ_Payments'] = null;
  return {
    created: created,
    totalBudgetRevisionRows: nijjaraRows_('PRJ_BudgetRevisions').length
  };
}

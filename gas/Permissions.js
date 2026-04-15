var NIJJARA_PERMISSION_RULES = Object.freeze({
  employees: {
    view: ['EMPLOYEE_VIEW'],
    create: ['EMPLOYEE_CREATE'],
    edit: ['EMPLOYEE_EDIT']
  },
  clients: {
    view: ['CLIENT_VIEW'],
    create: ['CLIENT_CREATE'],
    edit: ['CLIENT_EDIT']
  },
  projects: {
    view: ['PROJECT_VIEW'],
    create: ['PROJECT_CREATE'],
    edit: ['PROJECT_EDIT']
  },
  expenses: {
    view: ['EXPENSE_VIEW'],
    create: ['EXPENSE_CREATE'],
    edit: ['EXPENSE_EDIT']
  },
  income: {
    view: ['REVENUE_VIEW'],
    create: ['REVENUE_CREATE'],
    edit: ['REVENUE_EDIT']
  },
  revenueChannels: {
    view: ['REVENUE_VIEW'],
    create: ['REVENUE_CREATE'],
    edit: ['REVENUE_EDIT']
  },
  custody: {
    view: ['CUSTODY_ACCOUNT_VIEW'],
    create: ['CUSTODY_TRANSFER_CREATE'],
    edit: ['CUSTODY_BALANCE_ADJUST', 'CUSTODY_TRANSFER_REVIEW', 'CUSTODY_TRANSFER_APPROVE']
  },
  expenseCatalog: {
    view: ['EXPENSE_VIEW', 'EXPENSE_CREATE', 'EXPENSE_EDIT']
  },
  materialCatalog: {
    view: ['EXPENSE_VIEW', 'EXPENSE_CREATE', 'EXPENSE_EDIT']
  },
  notifications: {
    view: ['NOTIFICATION_VIEW'],
    action: ['NOTIFICATION_ACTION']
  },
  users: {
    view: ['EMPLOYEE_VIEW'],
    create: ['EMPLOYEE_EDIT'],
    edit: ['EMPLOYEE_EDIT']
  },
  roles: {
    view: ['EMPLOYEE_VIEW']
  },
  actionPermissions: {
    view: ['EMPLOYEE_VIEW']
  },
  approvalAuthority: {
    view: ['EMPLOYEE_VIEW']
  },
  workflowVisibility: {
    view: ['EMPLOYEE_VIEW']
  },
  attendance: {
    view: ['EMPLOYEE_VIEW']
  },
  leave: {
    view: ['EMPLOYEE_VIEW']
  },
  overtime: {
    view: ['EMPLOYEE_VIEW']
  },
  excuses: {
    view: ['EMPLOYEE_VIEW']
  },
  violations: {
    view: ['EMPLOYEE_VIEW']
  },
  payrollLinkedItems: {
    view: ['EMPLOYEE_VIEW']
  },
  requests: {
    view: ['EMPLOYEE_VIEW']
  },
  employeeFinancialRecords: {
    view: ['EMPLOYEE_VIEW']
  },
  collections: {
    view: ['REVENUE_VIEW'],
    create: ['REVENUE_CREATE'],
    edit: ['REVENUE_EDIT']
  },
  payrollExpenses: {
    view: ['REVENUE_VIEW']
  },
  employeesAdvances: {
    view: ['REVENUE_VIEW']
  },
  partnersData: {
    view: ['CUSTODY_ACCOUNT_VIEW']
  },
  partnersFunding: {
    view: ['CUSTODY_ACCOUNT_VIEW']
  },
  partnersAdvances: {
    view: ['CUSTODY_ACCOUNT_VIEW']
  },
  partnersShares: {
    view: ['CUSTODY_ACCOUNT_VIEW']
  },
  allocations: {
    view: ['EXPENSE_VIEW']
  },
  financialReporting: {
    view: ['REVENUE_VIEW']
  },
  projectBudgets: {
    view: ['PROJECT_VIEW'],
    create: ['PROJECT_EDIT'],
    edit: ['PROJECT_EDIT']
  },
  projectTimelines: {
    view: ['PROJECT_VIEW']
  },
  projectRevenueTracking: {
    view: ['REVENUE_VIEW'],
    create: ['REVENUE_CREATE'],
    edit: ['REVENUE_EDIT']
  },
  internalChannels: {
    view: ['REVENUE_VIEW'],
    create: ['REVENUE_CREATE'],
    edit: ['REVENUE_EDIT']
  },
  internalRevenuePayments: {
    view: ['REVENUE_VIEW'],
    create: ['REVENUE_CREATE'],
    edit: ['REVENUE_EDIT']
  },
  recordPayment: {
    view: ['REVENUE_VIEW'],
    create: ['REVENUE_CREATE'],
    edit: ['REVENUE_EDIT']
  },
  partnerRevenue: {
    view: ['CUSTODY_ACCOUNT_VIEW'],
    create: ['CUSTODY_ACCOUNT_VIEW'],
    edit: ['CUSTODY_ACCOUNT_VIEW']
  },
  projectDirectExpenses: {
    view: ['PROJECT_VIEW']
  },
  projectRelatedAllocations: {
    view: ['PROJECT_VIEW']
  },
  projectStatusMonitoring: {
    view: ['PROJECT_VIEW']
  },
  auditLogs: {
    view: ['NOTIFICATION_VIEW']
  },
  sourceRecordTraceability: {
    view: ['NOTIFICATION_VIEW']
  },
  reportExtraction: {
    view: ['NOTIFICATION_VIEW']
  },
  reportDownloading: {
    view: ['NOTIFICATION_VIEW']
  },
  businessAnalysisReporting: {
    view: ['NOTIFICATION_VIEW']
  }
});

var NIJJARA_STANDARD_ROLE_CODES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  GENERAL_MANAGER: 'general_manager',
  EMPLOYEE: 'employee',
  PENDING_EMPLOYEE: 'employee_self_service'
});

var NIJJARA_SCOPE_CODES = Object.freeze({
  INHERIT: 'INHERIT',
  ALL: 'ALL',
  OWN_CREATED: 'OWN_CREATED',
  OWN_RELATED: 'OWN_RELATED',
  OWN_OR_RELATED: 'OWN_OR_RELATED',
  DEPARTMENT: 'DEPARTMENT',
  NONE: 'NONE'
});

var NIJJARA_EMPLOYEE_RELATED_MODULES = Object.freeze({
  users: true,
  employees: true,
  attendance: true,
  leave: true,
  overtime: true,
  excuses: true,
  violations: true,
  payrollLinkedItems: true,
  payrollExpenses: true,
  requests: true,
  employeeFinancialRecords: true,
  employeesAdvances: true
});

var NIJJARA_PENDING_SELF_SERVICE_BLOCKED_MODULES = Object.freeze({
  notifications: true,
  auditLogs: true,
  sourceRecordTraceability: true,
  reportExtraction: true,
  reportDownloading: true,
  businessAnalysisReporting: true
});

function nijjaraHasRoleCode_(session, roleCode) {
  if (!session) return false;
  return (session.roles || []).indexOf(String(roleCode || '')) !== -1;
}

function nijjaraIsSuperAdmin_(session) {
  return nijjaraHasRoleCode_(session, NIJJARA_STANDARD_ROLE_CODES.SUPER_ADMIN);
}

function nijjaraIsGeneralManager_(session) {
  return nijjaraHasRoleCode_(session, NIJJARA_STANDARD_ROLE_CODES.GENERAL_MANAGER);
}

function nijjaraIsEmployeeRole_(session) {
  return nijjaraHasRoleCode_(session, NIJJARA_STANDARD_ROLE_CODES.EMPLOYEE);
}

function nijjaraIsEmployeeScopedSession_(session) {
  if (!session) return false;
  if (nijjaraIsSuperAdmin_(session) || nijjaraIsGeneralManager_(session)) return false;
  return nijjaraIsEmployeeRole_(session);
}

function nijjaraIsGeneralManagerBlockedModule_(moduleKey) {
  return {
    expenseCatalog: true,
    materialCatalog: true,
    partnersShares: true,
    auditLogs: true
  }[String(moduleKey || '')] === true;
}

function nijjaraGeneralManagerHasAccess_(moduleKey, actionKey) {
  moduleKey = String(moduleKey || '');
  actionKey = String(actionKey || '');
  if (nijjaraIsGeneralManagerBlockedModule_(moduleKey)) return false;
  if (moduleKey === 'custody' && (actionKey === 'edit' || actionKey === 'action')) return false;
  return ['view', 'create', 'edit', 'action'].indexOf(actionKey) !== -1;
}

function nijjaraEmployeeHasAccess_(moduleKey, actionKey) {
  moduleKey = String(moduleKey || '');
  actionKey = String(actionKey || '');
  if (nijjaraIsGeneralManagerBlockedModule_(moduleKey)) return false;
  if (moduleKey === 'custody' && (actionKey === 'edit' || actionKey === 'action')) return false;
  return actionKey === 'view';
}

function nijjaraIsSelfServiceBlockedModule_(moduleKey) {
  moduleKey = String(moduleKey || '');
  return NIJJARA_PENDING_SELF_SERVICE_BLOCKED_MODULES[moduleKey] === true;
}

function nijjaraIsPendingSelfServiceSession_(session) {
  if (!session) return false;
  if (nijjaraIsSuperAdmin_(session) || nijjaraIsGeneralManager_(session)) return false;
  if (nijjaraIsEmployeeRole_(session)) return false;
  return nijjaraHasRoleCode_(session, NIJJARA_STANDARD_ROLE_CODES.PENDING_EMPLOYEE);
}

function nijjaraIsPendingAccessUser_(session) {
  if (!session) return false;
  if (nijjaraIsSuperAdmin_(session) || nijjaraIsGeneralManager_(session) || nijjaraIsEmployeeRole_(session)) {
    return false;
  }
  return nijjaraHasRoleCode_(session, NIJJARA_STANDARD_ROLE_CODES.PENDING_EMPLOYEE) && !(session.permissions || []).length;
}

function nijjaraHasAnyPermission_(session, requiredPermissions) {
  if (!requiredPermissions || !requiredPermissions.length) {
    return true;
  }
  var permissionSet = session.permissions || [];
  return requiredPermissions.some(function (permissionCode) {
    return permissionSet.indexOf(permissionCode) !== -1;
  });
}

function nijjaraGetUserAccessRule_(session, moduleKey) {
  if (!session || !Array.isArray(session.accessRules)) return null;
  moduleKey = String(moduleKey || '');
  for (var index = 0; index < session.accessRules.length; index += 1) {
    if (String(session.accessRules[index].moduleKey || '') === moduleKey) {
      return session.accessRules[index];
    }
  }
  return null;
}

function nijjaraApplyAccessRuleOverride_(baseAllowed, actionKey, accessRule) {
  if (!accessRule) return baseAllowed;
  var actionMap = {
    view: accessRule.view,
    create: accessRule.create,
    edit: accessRule.edit,
    action: accessRule.action
  };
  if (actionMap[actionKey] === true) return true;
  if (actionMap[actionKey] === false) return false;
  return baseAllowed;
}

function nijjaraIsForcedRoleDeny_(session, moduleKey, actionKey) {
  if (!session) return false;
  moduleKey = String(moduleKey || '');
  actionKey = String(actionKey || '');
  if (nijjaraIsGeneralManager_(session) || nijjaraIsEmployeeScopedSession_(session)) {
    if (nijjaraIsGeneralManagerBlockedModule_(moduleKey)) return true;
    if (moduleKey === 'custody' && (actionKey === 'edit' || actionKey === 'action')) return true;
  }
  return false;
}

function nijjaraDefaultScopeForSession_(session, moduleKey) {
  moduleKey = String(moduleKey || '');
  if (!session) return NIJJARA_SCOPE_CODES.NONE;
  if (nijjaraIsSuperAdmin_(session) || nijjaraIsGeneralManager_(session)) {
    return NIJJARA_SCOPE_CODES.ALL;
  }
  if (nijjaraIsEmployeeScopedSession_(session)) {
    return NIJJARA_EMPLOYEE_RELATED_MODULES[moduleKey]
      ? NIJJARA_SCOPE_CODES.OWN_OR_RELATED
      : NIJJARA_SCOPE_CODES.OWN_CREATED;
  }
  return NIJJARA_SCOPE_CODES.ALL;
}

function nijjaraResolveScopeForModule_(session, moduleKey) {
  if (!session) return NIJJARA_SCOPE_CODES.NONE;
  if (nijjaraIsPendingAccessUser_(session)) return NIJJARA_SCOPE_CODES.NONE;
  var scopeCode = nijjaraDefaultScopeForSession_(session, moduleKey);
  var accessRule = nijjaraGetUserAccessRule_(session, moduleKey);
  if (accessRule && accessRule.scopeCode && accessRule.scopeCode !== NIJJARA_SCOPE_CODES.INHERIT) {
    scopeCode = accessRule.scopeCode;
  }
  return scopeCode || NIJJARA_SCOPE_CODES.NONE;
}

function nijjaraHasAccess_(session, moduleKey, actionKey) {
  if (!session) {
    return false;
  }
  if (nijjaraIsPendingSelfServiceSession_(session) && nijjaraIsSelfServiceBlockedModule_(moduleKey)) {
    return false;
  }
  if (nijjaraIsSuperAdmin_(session)) {
    return true;
  }
  if (nijjaraIsPendingAccessUser_(session)) {
    return false;
  }
  if (nijjaraIsForcedRoleDeny_(session, moduleKey, actionKey)) {
    return false;
  }
  var baseAllowed = false;
  if (nijjaraIsGeneralManager_(session)) {
    baseAllowed = nijjaraGeneralManagerHasAccess_(moduleKey, actionKey);
  } else if (nijjaraIsEmployeeScopedSession_(session)) {
    baseAllowed = nijjaraEmployeeHasAccess_(moduleKey, actionKey);
  } else {
    var rule = NIJJARA_PERMISSION_RULES[moduleKey] || {};
    baseAllowed = nijjaraHasAnyPermission_(session, rule[actionKey] || []);
  }
  return nijjaraApplyAccessRuleOverride_(baseAllowed, actionKey, nijjaraGetUserAccessRule_(session, moduleKey));
}

function nijjaraGuardAccess_(session, moduleKey, actionKey) {
  if (!nijjaraHasAccess_(session, moduleKey, actionKey)) {
    throw new Error('ليس لديك صلاحية لتنفيذ هذا الإجراء.');
  }
}

function nijjaraResolveNavigation_(session) {
  function resolveItems(items) {
    return (items || []).map(function (item) {
      if (item.items && item.items.length) {
        return {
          key: item.key,
          label: item.label,
          items: resolveItems(item.items)
        };
      }
      return {
        key: item.key,
        label: item.label,
        module: item.module,
        viewType: item.viewType,
        canCreate: nijjaraHasAccess_(session, item.key, 'create'),
        canEdit: nijjaraHasAccess_(session, item.key, 'edit')
      };
    }).filter(function (item) {
      return item && (!item.items || item.items.length > 0);
    });
  }

  return NIJJARA_NAVIGATION.map(function (group) {
    return {
      key: group.key,
      label: group.label,
      items: resolveItems(group.items)
    };
  });
}

function nijjaraResolveModuleActions_(session) {
  var actions = {};
  Object.keys(NIJJARA_PERMISSION_RULES).forEach(function (moduleKey) {
    actions[moduleKey] = {
      view: nijjaraHasAccess_(session, moduleKey, 'view'),
      create: nijjaraHasAccess_(session, moduleKey, 'create'),
      edit: nijjaraHasAccess_(session, moduleKey, 'edit'),
      action: nijjaraHasAccess_(session, moduleKey, 'action')
    };
  });
  return actions;
}

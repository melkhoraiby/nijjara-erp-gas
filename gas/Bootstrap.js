function nijjaraNormalizeProjectStatus_(value) {
  var status = String(value || '').trim().toUpperCase();
  if (!status) return '';
  if (status === 'مكتمل') return 'COMPLETED';
  if (status === 'ملغي') return 'CANCELLED';
  if (status === 'قيد التنفيذ') return 'ONGOING';
  return status;
}

function nijjaraGetBootstrap(sessionToken, options) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) {
    throw new Error('Session expired.');
  }
  options = options || {};

  var cache = CacheService.getScriptCache();
  var includeLookups = options.includeLookups === true;
  var includeNotifications = options.includeNotifications === true;
  var includeDashboard = options.includeDashboard === true;
  var awaitingAccess = nijjaraIsPendingAccessUser_(session);
  var cacheKey = 'bootstrap:v10:' + session.userId + ':' + (awaitingAccess ? 'pending' : 'active') + ':' + (includeLookups ? '1' : '0') + ':' + (includeNotifications ? '1' : '0') + ':' + (includeDashboard ? '1' : '0');
  if (!awaitingAccess) {
    var cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  var payload = {
    appVersion: NIJJARA_CONFIG.appVersion,
    systemName: NIJJARA_CONFIG.systemName,
    displayName: session.displayName,
    displayNameEn: session.displayNameEn,
    userId: session.userId,
    username: session.username,
    roles: session.roles,
    permissions: session.permissions,
    awaitingAccess: awaitingAccess,
    navigation: nijjaraResolveNavigation_(session),
    moduleActions: nijjaraResolveModuleActions_(session),
    dashboard: includeDashboard ? nijjaraBuildDashboardCached_() : null,
    notifications: includeNotifications ? nijjaraGetNotificationsForSession_(session) : [],
    formSchemas: NIJJARA_FORM_SCHEMAS,
    lookups: includeLookups ? nijjaraBuildLookupsCached_() : null,
    custodyData: null
  };

  if (!awaitingAccess) {
    cache.put(cacheKey, JSON.stringify(payload), NIJJARA_CONFIG.bootstrapCacheSeconds);
  }
  return payload;
}

function nijjaraGetLookups(sessionToken) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) {
    throw new Error('Session expired.');
  }
  return nijjaraBuildLookupsCached_();
}

function nijjaraGetLookupSubset(sessionToken, sources) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) {
    throw new Error('Session expired.');
  }
  return nijjaraBuildLookupSubset_(sources);
}

function nijjaraGetDashboard(sessionToken) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) {
    throw new Error('Session expired.');
  }
  return nijjaraBuildDashboardCached_();
}

function nijjaraBuildDashboardCached_() {
  var cache = CacheService.getScriptCache();
  var key = 'dashboard:main';
  var cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  var payload = nijjaraBuildDashboard_();
  cache.put(key, JSON.stringify(payload), 300);
  return payload;
}

function nijjaraBuildLookupsCached_() {
  var cache = CacheService.getScriptCache();
  var key = 'lookups:v6:main';
  var cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  var payload = nijjaraBuildLookups_();
  cache.put(key, JSON.stringify(payload), 300);
  return payload;
}

function nijjaraBuildLookupSubset_(sources) {
  var requested = {};
  (Array.isArray(sources) ? sources : []).forEach(function (source) {
    if (source) requested[String(source)] = true;
  });
  if (!Object.keys(requested).length) return nijjaraBuildLookupsCached_();

  var subset = {};
  var employeeRows = null;
  var partnerRows = null;
  var custodyRows = null;
  var revenueChannelRows = null;
  var internalRevenueRows = null;
  var activeLinkedEmployeeIds = null;
  var custodyLinkedEmployeeIds = null;
  var custodyLinkedPartnerIds = null;
  var revenueChannelTotals = null;

  function ensureEmployeeRows() {
    if (!employeeRows) employeeRows = nijjaraRows_('HRM_Employees');
    return employeeRows;
  }

  function ensurePartnerRows() {
    if (!partnerRows) partnerRows = nijjaraRows_('PAR_Partners');
    return partnerRows;
  }

  function ensureCustodyRows() {
    if (!custodyRows) custodyRows = nijjaraRows_('FIN_CustodyAccounts');
    return custodyRows;
  }

  function ensureActiveLinkedEmployeeIds() {
    if (activeLinkedEmployeeIds) return activeLinkedEmployeeIds;
    activeLinkedEmployeeIds = {};
    nijjaraRows_('SYS_Users').forEach(function (row) {
      if (String(row.Status_Code || '').toUpperCase() === 'ACTIVE' && String(row.Linked_Employee_ID || '').trim()) {
        activeLinkedEmployeeIds[String(row.Linked_Employee_ID || '').trim()] = true;
      }
    });
    return activeLinkedEmployeeIds;
  }

  function ensureCustodyLinkedMaps() {
    if (custodyLinkedEmployeeIds && custodyLinkedPartnerIds) {
      return { employees: custodyLinkedEmployeeIds, partners: custodyLinkedPartnerIds };
    }
    custodyLinkedEmployeeIds = {};
    custodyLinkedPartnerIds = {};
    ensureCustodyRows().forEach(function (row) {
      var linkedId = String(row.Linked_ID || '').trim();
      var holderType = String(row.Holder_Type || '').trim().toUpperCase();
      if (!linkedId) return;
      if (holderType === 'EMPLOYEE') custodyLinkedEmployeeIds[linkedId] = true;
      if (holderType === 'PARTNER') custodyLinkedPartnerIds[linkedId] = true;
    });
    return { employees: custodyLinkedEmployeeIds, partners: custodyLinkedPartnerIds };
  }

  function employeeOptions() {
    return ensureEmployeeRows().filter(function (row) {
      return String(row.Is_Active).toLowerCase() !== 'false';
    }).map(function (row) {
      return {
        value: row.Employee_ID,
        label: row.Full_Name_AR || row.Employee_ID,
        sublabel: row.Full_Name_EN || '',
        email: row.Email || '',
        username: nijjaraGenerateUniqueUsername_(row),
        displayNameAr: row.Full_Name_AR || '',
        displayNameEn: row.Full_Name_EN || ''
      };
    });
  }

  function partnerOptions() {
    return ensurePartnerRows().filter(function (row) {
      var status = String(row.Status_Code || row.Status || 'ACTIVE').toUpperCase();
      if (status === 'INACTIVE' || status === 'ARCHIVED') return false;
      return String(row.Is_Active).toLowerCase() !== 'false';
    }).map(function (row) {
      return {
        value: row.Partner_ID,
        label: row.Partner_Name_AR || row.Partner_ID,
        sublabel: row.Partner_Name_EN || ''
      };
    });
  }

  function ensureRevenueChannelTotals() {
    if (revenueChannelTotals) return revenueChannelTotals;
    revenueChannelRows = revenueChannelRows || nijjaraRows_('FIN_RevenueChannels');
    var inchChannelRevMap = {};
    nijjaraRows_('INCH_InternalChannels').forEach(function (row) {
      var channelId = String(row.InternalChannel_ID || '').trim();
      if (channelId) inchChannelRevMap[channelId] = String(row.RevChannel_ID || '').trim();
    });
    revenueChannelTotals = {};
    nijjaraRows_('INCH_InternalRevenuePayments').forEach(function (row) {
      var revChannelId = inchChannelRevMap[String(row.InternalChannel_ID || '').trim()] || '';
      if (!revChannelId) return;
      revenueChannelTotals[revChannelId] = (revenueChannelTotals[revChannelId] || 0) + (Number(row.Payment_Amount || 0) || 0);
    });
    return revenueChannelTotals;
  }

  Object.keys(requested).forEach(function (source) {
    if (source === 'employeesWithoutAccounts') {
      var linkedEmployees = ensureActiveLinkedEmployeeIds();
      subset.employeesWithoutAccounts = employeeOptions().filter(function (entry) {
        return !linkedEmployees[String(entry.value || '').trim()];
      });
      return;
    }
    if (source === 'employees') {
      subset.employees = employeeOptions();
      return;
    }
    if (source === 'employeesWithoutCustodyAccounts') {
      var employeeLinked = ensureCustodyLinkedMaps().employees;
      subset.employeesWithoutCustodyAccounts = employeeOptions().filter(function (entry) {
        return !employeeLinked[String(entry.value || '').trim()];
      });
      return;
    }
    if (source === 'partners') {
      subset.partners = partnerOptions();
      return;
    }
    if (source === 'partnersWithoutCustodyAccounts') {
      var partnerLinked = ensureCustodyLinkedMaps().partners;
      subset.partnersWithoutCustodyAccounts = partnerOptions().filter(function (entry) {
        return !partnerLinked[String(entry.value || '').trim()];
      });
      return;
    }
    if (source === 'custodyAccounts') {
      subset.custodyAccounts = ensureCustodyRows().filter(function (row) {
        return String(row.Status_Code || 'ACTIVE').toUpperCase() === 'ACTIVE';
      }).map(function (row) {
        return {
          value: row.CustodyAccount_ID,
          label: row.CustodyAccount_AR || row.Linked_ID || row.CustodyAccount_ID,
          sublabel: row.Linked_ID || '',
          balance: Number(row.Current_Balance || 0) || 0,
          fundingType: row.Funding_Type || 'STANDARD'
        };
      });
      return;
    }
    if (source === 'revenueChannels' || source === 'internalRevenueChannels') {
      revenueChannelRows = revenueChannelRows || nijjaraRows_('FIN_RevenueChannels');
      var channelTotals = ensureRevenueChannelTotals();
      var rows = source === 'internalRevenueChannels'
        ? revenueChannelRows.filter(function (row) { return String(row.RevChannel_Type || '').toUpperCase() === 'INTERNAL'; })
        : revenueChannelRows;
      subset[source] = rows.map(function (row) {
        return {
          value: row.RevChannel_ID,
          label: row.RevChannel_AR || row.RevChannel_ID,
          sublabel: row.RevChannel_EN || '',
          receivedTotal: Number(channelTotals[String(row.RevChannel_ID || '')] || 0) || 0
        };
      });
      return;
    }
    if (source === 'internalChannels') {
      subset.internalChannels = nijjaraRows_('INCH_InternalChannels').filter(function (row) {
        return String(row.Is_Active).toLowerCase() !== 'false';
      }).map(function (row) {
        return {
          value: row.InternalChannel_ID,
          label: row.InternalChannel_AR || row.InternalChannel_ID,
          sublabel: row.InternalChannel_EN || '',
          orderPrice: Number(row.Order_Price || 0) || 0,
          totalReceived: Number(row.Total_Received || 0) || 0,
          totalRemaining: Number(row.Total_Remaining || 0) || 0
        };
      });
      return;
    }
    if (source === 'allocationChannels') {
      subset.allocationChannels = nijjaraRows_('FIN_AllocationChannels').map(function (row) {
        return { value: row.AlloChannel_ID, label: row.AlloChannel_AR || row.AlloChannel_ID, sublabel: row.AlloChannel_EN || '' };
      });
      return;
    }
    if (source === 'manageableRoles' || source === 'roles') {
      subset[source] = nijjaraRoleOptions_();
      return;
    }
    if (source === 'accessModules') {
      subset.accessModules = nijjaraAccessModuleOptions_();
      return;
    }
    if (source === 'accessScopes') {
      subset.accessScopes = [
        { value: 'INHERIT', label: 'حسب الدور', sublabel: 'يستخدم إعداد الدور الأساسي' },
        { value: 'ALL', label: 'كل البيانات', sublabel: 'الوصول إلى جميع السجلات داخل الوحدة' },
        { value: 'OWN_CREATED', label: 'البيانات التي أنشأها', sublabel: 'السجلات التي أدخلها المستخدم فقط' },
        { value: 'OWN_RELATED', label: 'البيانات المرتبطة به', sublabel: 'السجلات المرتبطة بالموظف أو الحساب' },
        { value: 'OWN_OR_RELATED', label: 'أنشأها أو مرتبطة به', sublabel: 'يجمع بين سجلاته وسجلاته المرتبطة' },
        { value: 'DEPARTMENT', label: 'بيانات الإدارة', sublabel: 'السجلات المرتبطة بنفس الإدارة' },
        { value: 'NONE', label: 'بدون وصول', sublabel: 'حظر كامل لهذه الوحدة' }
      ];
      return;
    }
    subset = Object.assign(subset, nijjaraBuildLookupsCached_());
  });

  return subset;
}

function nijjaraClearSharedCaches_() {
  var cache = CacheService.getScriptCache();
  cache.remove('dashboard:main');
  cache.remove('lookups:main');
  cache.remove('lookups:v2:main');
  cache.remove('lookups:v5:main');
  cache.remove('lookups:v6:main');
  if (typeof NIJJARA_RUNTIME_CACHE !== 'undefined' && NIJJARA_RUNTIME_CACHE) {
    NIJJARA_RUNTIME_CACHE.lookupContext = null;
    NIJJARA_RUNTIME_CACHE.usersLookupContext = null;
    NIJJARA_RUNTIME_CACHE.moduleRows = {};
  }
}

function nijjaraEnumRows_() {
  var rows = nijjaraRows_('SET_Enums');
  if (rows && rows.length) return rows;
  return nijjaraRows_('SYS_Enum');
}

function nijjaraInternalRevenueChannelIds_() {
  return nijjaraRows_('FIN_RevenueChannels').reduce(function (map, row) {
    if (String(row.RevChannel_Type || '').toUpperCase() === 'INTERNAL') {
      map[String(row.RevChannel_ID || '').trim()] = true;
    }
    return map;
  }, {});
}

function nijjaraAccessModuleOptions_() {
  var accessModules = [];
  function flattenNavigationItems(items, groupLabel, collector) {
    (items || []).forEach(function (item) {
      if (item.items && item.items.length) {
        flattenNavigationItems(item.items, groupLabel, collector);
        return;
      }
      collector.push({
        value: item.key,
        label: item.label,
        sublabel: groupLabel || '',
        module: item.module || '',
        viewType: item.viewType || 'grid'
      });
    });
  }
  (NIJJARA_NAVIGATION || []).forEach(function (group) {
    flattenNavigationItems(group.items, group.label, accessModules);
  });
  return accessModules;
}

function nijjaraRoleOptions_() {
  var standardRoles = [
    { value: 'super_admin', label: 'مدير عام للنظام', sublabel: 'Super Admin' },
    { value: 'general_manager', label: 'مدير عام', sublabel: 'General Manager' },
    { value: 'employee', label: 'موظف', sublabel: 'Employee' }
  ];
  var roleOptions = nijjaraRows_('SYS_Roles').filter(function (row) {
    return String(row.Is_Active).toLowerCase() !== 'false';
  }).map(function (row) {
    return {
      value: row.Role_Code,
      label: row.Role_Name_AR || row.Role_Code,
      sublabel: row.Role_Name_EN || ''
    };
  });
  standardRoles.forEach(function (role) {
    if (!roleOptions.some(function (entry) { return String(entry.value || '') === String(role.value || ''); })) {
      roleOptions.push(role);
    }
  });
  return roleOptions;
}

function nijjaraBuildDashboard_() {
  var employees = nijjaraRows_('HRM_Employees');
  var clients = nijjaraRows_('PRJ_Clients');
  var projects = nijjaraRows_('PRJ_Projects');
  var expenses = nijjaraRows_('FIN_Expenses');
  var revenue = nijjaraRows_('FIN_Revenue');
  var internalChannelRevChannelIds = {};
  nijjaraRows_('INCH_InternalChannels').forEach(function (row) {
    var channelId = String(row.InternalChannel_ID || '').trim();
    if (channelId) internalChannelRevChannelIds[channelId] = String(row.RevChannel_ID || '').trim();
  });
  var internalRevenue = nijjaraRows_('INCH_InternalRevenuePayments').map(function (row) {
    return {
      Amount: Number(row.Payment_Amount || 0) || 0,
      RevChannel_ID: internalChannelRevChannelIds[String(row.InternalChannel_ID || '').trim()] || ''
    };
  });
  var internalRevenueChannelIds = nijjaraInternalRevenueChannelIds_();

  function sum(rows, field) {
    return rows.reduce(function (acc, row) {
      return acc + (Number(row[field] || 0) || 0);
    }, 0);
  }

  function sumExternalRevenue(rows) {
    return rows.reduce(function (acc, row) {
      var channelId = String(row.RevChannel_ID || '').trim();
      if (internalRevenueChannelIds[channelId]) return acc;
      return acc + (Number(row.Amount || 0) || 0);
    }, 0);
  }

  function countExternalRevenue(rows) {
    return rows.reduce(function (acc, row) {
      var channelId = String(row.RevChannel_ID || '').trim();
      return internalRevenueChannelIds[channelId] ? acc : acc + 1;
    }, 0);
  }

  return {
    cards: [
      { key: 'employees', label: 'الموظفون', value: employees.length, detail: employees.filter(function (row) { return String(row.Is_Active).toLowerCase() !== 'false'; }).length + ' نشط', tone: 'emerald' },
      { key: 'clients', label: 'العملاء', value: clients.length, detail: clients.filter(function (row) { return String(row.Is_Active).toLowerCase() !== 'false'; }).length + ' نشط', tone: 'blue' },
      { key: 'projects', label: 'المشاريع', value: projects.length, detail: projects.filter(function (row) { return nijjaraNormalizeProjectStatus_(row.Project_Status) === 'COMPLETED'; }).length + ' مكتمل', tone: 'violet' },
      { key: 'expenses', label: 'المصروفات', value: sum(expenses, 'Amount'), detail: expenses.length + ' سجل', tone: 'amber' },
      { key: 'income', label: 'الإيرادات', value: sumExternalRevenue(revenue) + sum(internalRevenue, 'Amount'), detail: (countExternalRevenue(revenue) + internalRevenue.length) + ' سجل', tone: 'rose' }
    ],
    monthlyFlow: [
      { label: 'يناير', income: 820000, expenses: 770000 },
      { label: 'فبراير', income: 910000, expenses: 804000 },
      { label: 'مارس', income: 1054000, expenses: 992000 },
      { label: 'أبريل', income: 980000, expenses: 903000 },
      { label: 'مايو', income: 1123000, expenses: 1048000 },
      { label: 'يونيو', income: 1211000, expenses: 1098000 }
    ]
  };
}

function nijjaraBuildLookups_() {
  var projectRows = nijjaraRows_('PRJ_Projects');
  var clientRows = nijjaraRows_('PRJ_Clients');
  var expenseRows = nijjaraRows_('FIN_Expenses');
  var revenueRows = nijjaraRows_('FIN_Revenue');
  var internalChannelRevMap = {};
  nijjaraRows_('INCH_InternalChannels').forEach(function (row) {
    var channelId = String(row.InternalChannel_ID || '').trim();
    if (channelId) internalChannelRevMap[channelId] = String(row.RevChannel_ID || '').trim();
  });
  var internalRevenueRows = nijjaraRows_('INCH_InternalRevenuePayments').map(function (row) {
    return {
      Payment_Amount: row.Payment_Amount,
      RevChannel_ID: internalChannelRevMap[String(row.InternalChannel_ID || '').trim()] || '',
      InternalChannel_ID: row.InternalChannel_ID || ''
    };
  });
  var revenueChannelRows = nijjaraRows_('FIN_RevenueChannels');
  var paymentRows = nijjaraRows_('PRJ_Payments');
  var internalRevenueChannelIds = nijjaraInternalRevenueChannelIds_();
  var activeLinkedEmployeeIds = {};
  nijjaraRows_('SYS_Users').forEach(function (row) {
    if (String(row.Status_Code || '').toUpperCase() === 'ACTIVE' && String(row.Linked_Employee_ID || '').trim()) {
      activeLinkedEmployeeIds[String(row.Linked_Employee_ID || '').trim()] = true;
    }
  });
  var custodyLinkedEmployeeIds = {};
  var custodyLinkedPartnerIds = {};
  nijjaraRows_('FIN_CustodyAccounts').forEach(function (row) {
    var linkedId = String(row.Linked_ID || '').trim();
    var holderType = String(row.Holder_Type || '').trim().toUpperCase();
    if (!linkedId) return;
    if (holderType === 'EMPLOYEE') custodyLinkedEmployeeIds[linkedId] = true;
    if (holderType === 'PARTNER') custodyLinkedPartnerIds[linkedId] = true;
  });
  var projectExpenseTotals = {};
  var projectRevenueTotals = {};
  var projectPaymentTotals = {};
  var projectPaymentCounts = {};
  var revenueChannelTotals = {};
  var clientsById = {};

  clientRows.forEach(function (row) {
    clientsById[String(row.Client_ID || '')] = {
      ar: row.Client_Name_AR || row.Client_ID || '',
      en: row.Client_Name_EN || ''
    };
  });
  var allocationTotals = {
    PROJECT: 0,
    FACTORY: 0,
    INTERNAL_REVENUE: 0
  };

  expenseRows.forEach(function (row) {
    var amount = Number(row.Amount || 0) || 0;
    var projectId = String(row.Project_ID || '').trim();
    var allocationKey = String(row.AlloChannel_ID || '').trim().toUpperCase();
    if (projectId) {
      projectExpenseTotals[projectId] = (projectExpenseTotals[projectId] || 0) + amount;
    }
    if (allocationTotals.hasOwnProperty(allocationKey)) {
      allocationTotals[allocationKey] += amount;
    }
  });

  revenueRows.forEach(function (row) {
    var amount = Number(row.Amount || 0) || 0;
    var projectId = String(row.Project_ID || '').trim();
    var channelId = String(row.RevChannel_ID || '').trim();
    if (projectId && !internalRevenueChannelIds[channelId]) {
      projectRevenueTotals[projectId] = (projectRevenueTotals[projectId] || 0) + amount;
    }
    if (channelId && !internalRevenueChannelIds[channelId]) {
      revenueChannelTotals[channelId] = (revenueChannelTotals[channelId] || 0) + amount;
    }
  });

  internalRevenueRows.forEach(function (row) {
    var amount = Number(row.Payment_Amount || 0) || 0;
    var channelId = String(row.RevChannel_ID || '').trim();
    if (channelId) {
      revenueChannelTotals[channelId] = (revenueChannelTotals[channelId] || 0) + amount;
    }
  });

  paymentRows.forEach(function (row) {
    var amount = Number(row.Payment_Amount || 0) || 0;
    var projectId = String(row.Project_ID || '').trim();
    if (projectId) {
      projectPaymentTotals[projectId] = (projectPaymentTotals[projectId] || 0) + amount;
      projectPaymentCounts[projectId] = (projectPaymentCounts[projectId] || 0) + 1;
    }
  });

  var roleOptions = nijjaraRoleOptions_();
  var accessModules = nijjaraAccessModuleOptions_();

  var employeeOptions = nijjaraRows_('HRM_Employees').filter(function (row) {
    return String(row.Is_Active).toLowerCase() !== 'false';
  }).map(function (row) {
    return {
      value: row.Employee_ID,
      label: row.Full_Name_AR || row.Employee_ID,
      sublabel: row.Full_Name_EN || '',
      email: row.Email || '',
      username: nijjaraGenerateUniqueUsername_(row),
      displayNameAr: row.Full_Name_AR || '',
      displayNameEn: row.Full_Name_EN || ''
    };
  });
  var partnerOptions = nijjaraRows_('PAR_Partners').filter(function (row) {
    var status = String(row.Status_Code || row.Status || 'ACTIVE').toUpperCase();
    if (status === 'INACTIVE' || status === 'ARCHIVED') return false;
    return String(row.Is_Active).toLowerCase() !== 'false';
  }).map(function (row) {
    return {
      value: row.Partner_ID,
      label: row.Partner_Name_AR || row.Partner_ID,
      sublabel: row.Partner_Name_EN || ''
    };
  });

  return {
    hrDepartments: nijjaraEnumRows_().filter(function (row) {
      var group = String(row.Enum_Group || row.Group_Code || row.EnumGroup || '').trim();
      return ['HRM_DEPARTMENT_ID', 'HRM_DEPARTMENT', 'HRM_DEPARTMENTS_ID'].indexOf(group) !== -1 && String(row.Is_Active).toLowerCase() !== 'false';
    }).sort(function (left, right) {
      return (Number(left.Sort_Order || 0) || 0) - (Number(right.Sort_Order || 0) || 0);
    }).map(function (row) {
      return {
        value: row.Enum_Label_AR || row.Value_AR || row.Enum_Key || row.Value_Code || '',
        label: row.Enum_Label_AR || row.Value_AR || row.Enum_Key || row.Value_Code || '',
        sublabel: row.Enum_Label_EN || row.Value_EN || ''
      };
    }),
    hrJobTitles: nijjaraEnumRows_().filter(function (row) {
      var group = String(row.Enum_Group || row.Group_Code || row.EnumGroup || '').trim();
      return ['HRM_POSITION_ID', 'HRM_JOB_TITLE_ID', 'HRM_POSITION', 'HRM_JOB_TITLE'].indexOf(group) !== -1 && String(row.Is_Active).toLowerCase() !== 'false';
    }).sort(function (left, right) {
      return (Number(left.Sort_Order || 0) || 0) - (Number(right.Sort_Order || 0) || 0);
    }).map(function (row) {
      return {
        value: row.Enum_Label_AR || row.Value_AR || row.Enum_Key || row.Value_Code || '',
        label: row.Enum_Label_AR || row.Value_AR || row.Enum_Key || row.Value_Code || '',
        sublabel: row.Enum_Label_EN || row.Value_EN || ''
      };
    }),
    employeesWithoutAccounts: employeeOptions.filter(function (entry) {
      return !activeLinkedEmployeeIds[String(entry.value || '').trim()];
    }),
    employeesWithoutCustodyAccounts: employeeOptions.filter(function (entry) {
      return !custodyLinkedEmployeeIds[String(entry.value || '').trim()];
    }),
    employees: employeeOptions,
    partnersWithoutCustodyAccounts: partnerOptions.filter(function (entry) {
      return !custodyLinkedPartnerIds[String(entry.value || '').trim()];
    }),
    partners: partnerOptions,
    roles: roleOptions,
    manageableRoles: roleOptions,
    accessScopes: [
      { value: 'INHERIT', label: 'حسب الدور', sublabel: 'يستخدم إعداد الدور الأساسي' },
      { value: 'ALL', label: 'كل البيانات', sublabel: 'الوصول إلى جميع السجلات داخل الوحدة' },
      { value: 'OWN_CREATED', label: 'البيانات التي أنشأها', sublabel: 'السجلات التي أدخلها المستخدم فقط' },
      { value: 'OWN_RELATED', label: 'البيانات المرتبطة به', sublabel: 'السجلات المرتبطة بالموظف أو الحساب' },
      { value: 'OWN_OR_RELATED', label: 'أنشأها أو مرتبطة به', sublabel: 'يجمع بين سجلاته وسجلاته المرتبطة' },
      { value: 'DEPARTMENT', label: 'بيانات الإدارة', sublabel: 'السجلات المرتبطة بنفس الإدارة' },
      { value: 'NONE', label: 'بدون وصول', sublabel: 'حظر كامل لهذه الوحدة' }
    ],
    accessModules: accessModules,
    permissions: nijjaraRows_('SYS_Permissions').filter(function (row) {
      return String(row.Is_Active).toLowerCase() !== 'false';
    }).map(function (row) {
      return {
        value: row.Perm_Code,
        label: row.Perm_Name_AR || row.Perm_Code,
        sublabel: row.Perm_Name_EN || '',
        module: row.Module_Code || '',
        action: row.Action_Code || ''
      };
    }),
    clients: nijjaraRows_('PRJ_Clients').map(function (row) {
      return { value: row.Client_ID, label: row.Client_Name_AR || row.Client_ID, sublabel: row.Client_Name_EN || '' };
    }),
    projects: projectRows.map(function (row) {
      var client = clientsById[String(row.Client_ID || '')] || { ar: row.Client_ID || '', en: '' };
      return {
        value: row.Project_ID,
        label: row.Project_Name_AR || row.Project_ID,
        sublabel: row.Project_Name_EN || '',
        active: String(row.Is_Active).toLowerCase() !== 'false',
        clientId: row.Client_ID || '',
        clientNameAr: client.ar || '',
        clientNameEn: client.en || '',
        projectStatus: row.Project_Status || '',
        budget: Number(row.Project_Budget || 0) || 0,
        received: Number(row.Amount_Received || 0) || 0,
        remaining: Number(row.Amount_Remaining || 0) || 0,
        expenseTotal: Number(projectExpenseTotals[String(row.Project_ID || '')] || 0) || 0,
        revenueTotal: Number(projectRevenueTotals[String(row.Project_ID || '')] || 0) || 0,
        paymentTotal: Number(projectPaymentTotals[String(row.Project_ID || '')] || 0) || 0,
        paymentCount: Number(projectPaymentCounts[String(row.Project_ID || '')] || 0) || 0
      };
    }),
    activeProjects: projectRows.filter(function (row) {
      return String(row.Is_Active).toLowerCase() !== 'false' && nijjaraNormalizeProjectStatus_(row.Project_Status) !== 'CANCELLED';
    }).map(function (row) {
      var client = clientsById[String(row.Client_ID || '')] || { ar: row.Client_ID || '', en: '' };
      return {
        value: row.Project_ID,
        label: row.Project_Name_AR || row.Project_ID,
        sublabel: row.Project_Name_EN || '',
        clientId: row.Client_ID || '',
        clientNameAr: client.ar || '',
        clientNameEn: client.en || '',
        projectStatus: row.Project_Status || '',
        budget: Number(row.Project_Budget || 0) || 0,
        received: Number(row.Amount_Received || 0) || 0,
        remaining: Number(row.Amount_Remaining || 0) || 0,
        expenseTotal: Number(projectExpenseTotals[String(row.Project_ID || '')] || 0) || 0,
        revenueTotal: Number(projectRevenueTotals[String(row.Project_ID || '')] || 0) || 0,
        paymentTotal: Number(projectPaymentTotals[String(row.Project_ID || '')] || 0) || 0,
        paymentCount: Number(projectPaymentCounts[String(row.Project_ID || '')] || 0) || 0
      };
    }),
    revenueChannels: revenueChannelRows.map(function (row) {
      return {
        value: row.RevChannel_ID,
        label: row.RevChannel_AR || row.RevChannel_ID,
        sublabel: row.RevChannel_EN || '',
        receivedTotal: Number(revenueChannelTotals[String(row.RevChannel_ID || '')] || 0) || 0
      };
    }),
    internalRevenueChannels: revenueChannelRows.filter(function (row) {
      return String(row.RevChannel_Type || '').toUpperCase() === 'INTERNAL';
    }).map(function (row) {
      return {
        value: row.RevChannel_ID,
        label: row.RevChannel_AR || row.RevChannel_ID,
        sublabel: row.RevChannel_EN || '',
        receivedTotal: Number(revenueChannelTotals[String(row.RevChannel_ID || '')] || 0) || 0
      };
    }),
    internalChannels: nijjaraRows_('INCH_InternalChannels').filter(function (row) {
      return String(row.Is_Active).toLowerCase() !== 'false';
    }).map(function (row) {
      return {
        value: row.InternalChannel_ID,
        label: row.InternalChannel_AR || row.InternalChannel_ID,
        sublabel: row.InternalChannel_EN || '',
        orderPrice: Number(row.Order_Price || 0) || 0,
        totalReceived: Number(row.Total_Received || 0) || 0,
        totalRemaining: Number(row.Total_Remaining || 0) || 0
      };
    }),
    allocationChannels: nijjaraRows_('FIN_AllocationChannels').map(function (row) {
      return { value: row.AlloChannel_ID, label: row.AlloChannel_AR || row.AlloChannel_ID, sublabel: row.AlloChannel_EN || '' };
    }),
    custodyAccounts: nijjaraRows_('FIN_CustodyAccounts').filter(function (row) {
      return String(row.Status_Code || 'ACTIVE').toUpperCase() === 'ACTIVE';
    }).map(function (row) {
      return {
        value: row.CustodyAccount_ID,
        label: row.CustodyAccount_AR || row.Linked_ID || row.CustodyAccount_ID,
        sublabel: row.Linked_ID || '',
        balance: Number(row.Current_Balance || 0) || 0,
        fundingType: row.Funding_Type || 'STANDARD'
      };
    }),
    expenseCatalog: nijjaraRows_('SET_ExpenseCatalog').filter(function (row) {
      return String(row.Is_Active).toLowerCase() !== 'false';
    }).map(function (row) {
      return {
        value: row.ExpCat_ID,
        label: row.ExpenseName_AR || row.ExpCat_ID,
        sublabel: row.ExpenseName_EN || '',
        category: row.Category_AR || '',
        subCategory: row.Subcategory_AR || '',
        factoryExpenseType: row.Factory_Expense_Type || '',
        directExpenseType: row.Direct_Expense_Type || ''
      };
    }),
    allocationStats: [
      { value: 'PROJECT', label: 'المشاريع', totalExpenses: Number(allocationTotals.PROJECT || 0) || 0 },
      { value: 'FACTORY', label: 'المصنع', totalExpenses: Number(allocationTotals.FACTORY || 0) || 0 },
      { value: 'INTERNAL_REVENUE', label: 'قنوات الإيراد الداخلية', totalExpenses: Number(allocationTotals.INTERNAL_REVENUE || 0) || 0 }
    ]
  };
}

function nijjaraAudit_(moduleCode, subModuleCode, actionCode, severityCode, resultCode, actorUserId, summaryAr, detailsAr, meta) {
  meta = meta || {};
  var actorUser = actorUserId ? nijjaraFindOne_('SYS_Users', function (row) {
    return String(row.User_ID || '') === String(actorUserId || '');
  }) : null;
  nijjaraAppendRow_('SYS_AuditLog', {
    Audit_ID: nijjaraRandomId_('AUD-'),
    Log_DateTime: nijjaraNow_(),
    Severity_Code: severityCode,
    Result_Code: resultCode,
    Module_Code: moduleCode,
    SubModule_Code: subModuleCode,
    Action_Code: actionCode,
    Source_Record_ID: meta.sourceRecordId || '',
    Actor_User_ID: actorUserId || '',
    Actor_Username: meta.actorUsername || (actorUser ? actorUser.Username || '' : ''),
    Actor_Display_AR: meta.actorDisplayAr || (actorUser ? actorUser.Display_Name_AR || actorUser.Username || '' : ''),
    Summary_AR: summaryAr || '',
    Details_AR: meta.detailsAr || detailsAr || '',
    Changed_Fields_JSON: meta.changedFieldsJson || '',
    Source_IP: '',
    Device_Info: 'Apps Script Web App'
  });
}

var NIJJARA_CONFIG = Object.freeze({
  spreadsheetId: '1Tvn1M80l6EPOIBymHFRguldergH3l3Oy5eTIe2lhUeo',
  sessionCacheSeconds: 21600,
  bootstrapCacheSeconds: 600,
  passwordAlgo: 'SHA-256',
  appVersion: 'gas-foundation-v12',
  protectedSystemUserId: 'USR-0001',
  protectedSystemUsername: 'mkhoraiby',
  protectedSystemEmail: 'm.elkhoraiby@gmail.com',
  systemName: 'NIJJARA ERP',
  homeTitle: 'لوحة التشغيل الرئيسية'
});

function nijjaraIsProtectedSystemUser_(userOrId) {
  if (!userOrId) return false;
  if (typeof userOrId === 'string') {
    return String(userOrId || '').trim() === String(NIJJARA_CONFIG.protectedSystemUserId || '').trim();
  }
  var userId = String(userOrId.User_ID || userOrId.userId || '').trim();
  var username = String(userOrId.Username || userOrId.username || '').trim().toLowerCase();
  var email = String(userOrId.Email || userOrId.email || '').trim().toLowerCase();
  return userId === String(NIJJARA_CONFIG.protectedSystemUserId || '').trim()
    || (username && username === String(NIJJARA_CONFIG.protectedSystemUsername || '').trim().toLowerCase())
    || (email && email === String(NIJJARA_CONFIG.protectedSystemEmail || '').trim().toLowerCase());
}

function nijjaraCanManageProtectedSystemUser_(session, userOrId) {
  if (!nijjaraIsProtectedSystemUser_(userOrId)) return true;
  return !!(session && String(session.userId || '').trim() === String(NIJJARA_CONFIG.protectedSystemUserId || '').trim());
}

var NIJJARA_NAVIGATION = Object.freeze([
  {
    key: 'systemAdministration',
    label: 'إدارة النظام',
    items: [
      { key: 'users', label: 'المستخدمون', module: 'SYS', viewType: 'grid' },
      { key: 'roles', label: 'الأدوار', module: 'SYS', viewType: 'grid' },
      { key: 'actionPermissions', label: 'صلاحيات الإجراءات', module: 'SYS', viewType: 'grid' },
      { key: 'approvalAuthority', label: 'سلطة الاعتماد', module: 'SYS', viewType: 'grid' },
      { key: 'workflowVisibility', label: 'ظهور سير العمل', module: 'SYS', viewType: 'grid' }
    ]
  },
  {
    key: 'humanResources',
    label: 'الموارد البشرية',
    items: [
      { key: 'employees', label: 'ملفات الموظفين', module: 'HRM', viewType: 'grid' },
      { key: 'attendance', label: 'الحضور', module: 'HRM', viewType: 'grid' },
      { key: 'leave', label: 'الإجازات', module: 'HRM', viewType: 'grid' },
      { key: 'overtime', label: 'العمل الإضافي', module: 'HRM', viewType: 'grid' },
      { key: 'excuses', label: 'الاستئذانات', module: 'HRM', viewType: 'grid' },
      { key: 'violations', label: 'المخالفات', module: 'HRM', viewType: 'grid' },
      { key: 'payrollLinkedItems', label: 'بنود مرتبطة بالرواتب', module: 'HRM', viewType: 'grid' },
      { key: 'requests', label: 'الطلبات', module: 'HRM', viewType: 'info' },
      { key: 'employeeFinancialRecords', label: 'السجلات المالية للموظفين', module: 'HRM', viewType: 'info' }
    ]
  },
  {
    key: 'finance',
    label: 'المالية',
    items: [
      { key: 'recordPayment', label: 'سجل الإيرادات والدفعات', module: 'FIN', viewType: 'unified-revenue' },
      { key: 'expenses', label: 'المصروفات', module: 'FIN', viewType: 'grid' },
      {
        key: 'revenue',
        label: 'سجلات الإيرادات (للمراجعة)',
        items: [
          { key: 'projectRevenueTracking', label: 'دفعات المشاريع', module: 'FIN', viewType: 'grid' },
          { key: 'internalChannels', label: 'أوامر القنوات الداخلية', module: 'FIN', viewType: 'grid' },
          { key: 'internalRevenuePayments', label: 'دفعات الإيرادات الداخلية', module: 'FIN', viewType: 'grid' },
          { key: 'showroomOrders', label: 'طلبات معرض &Pieces', module: 'FIN', viewType: 'grid' }
        ]
      },
      { key: 'revenueChannels', label: 'قنوات الإيراد', module: 'FIN', viewType: 'grid' },
      { key: 'custody', label: 'العهد', module: 'FIN', viewType: 'dashboard' },
      { key: 'payrollExpenses', label: 'مصروفات الرواتب', module: 'FIN', viewType: 'grid' },
      { key: 'employeesAdvances', label: 'سلف الموظفين', module: 'FIN', viewType: 'grid' },
      {
        key: 'partnersFinance',
        label: 'مالية الشركاء',
        items: [
          { key: 'partnersData', label: 'بيانات الشركاء', module: 'FIN', viewType: 'grid' },
          { key: 'partnerRevenue', label: 'إيرادات الشركاء المخصصة', module: 'FIN', viewType: 'grid' },
          { key: 'partnersFunding', label: 'تمويل الشركاء', module: 'FIN', viewType: 'grid' },
          { key: 'partnersAdvances', label: 'سلف الشركاء', module: 'FIN', viewType: 'grid' },
          { key: 'partnersShares', label: 'حصص الشركاء', module: 'FIN', viewType: 'grid' }
        ]
      },
      { key: 'allocations', label: 'التخصيصات', module: 'FIN', viewType: 'grid' },
      { key: 'financialReporting', label: 'التقارير المالية', module: 'FIN', viewType: 'grid' }
    ]
  },
  {
    key: 'projects',
    label: 'المشاريع',
    items: [
      { key: 'projects', label: 'قاعدة بيانات المشاريع', module: 'PRJ', viewType: 'grid' },
      { key: 'clients', label: 'قاعدة بيانات العملاء', module: 'PRJ', viewType: 'grid' },
      { key: 'projectBudgets', label: 'ميزانيات المشاريع', module: 'PRJ', viewType: 'grid' },
      { key: 'projectTimelines', label: 'الجداول الزمنية للمشاريع', module: 'PRJ', viewType: 'grid' },
      { key: 'projectDirectExpenses', label: 'المصروفات المباشرة للمشاريع', module: 'PRJ', viewType: 'grid' },
      { key: 'projectRelatedAllocations', label: 'التخصيصات المرتبطة بالمشاريع', module: 'PRJ', viewType: 'info' },
      { key: 'projectStatusMonitoring', label: 'مراقبة حالة المشاريع', module: 'PRJ', viewType: 'grid' }
    ]
  },
  {
    key: 'notificationsAudit',
    label: 'الإشعارات والتدقيق',
    items: [
      { key: 'notifications', label: 'الإشعارات', module: 'SYS', viewType: 'grid' },
      { key: 'auditLogs', label: 'سجلات التدقيق', module: 'SYS', viewType: 'grid' },
      { key: 'sourceRecordTraceability', label: 'تتبّع السجل المصدر', module: 'SYS', viewType: 'info' }
    ]
  },
  {
    key: 'reportsExports',
    label: 'التقارير والتصدير',
    items: [
      { key: 'reportExtraction', label: 'استخراج التقارير', module: 'REP', viewType: 'info' },
      { key: 'reportDownloading', label: 'تنزيل التقارير', module: 'REP', viewType: 'info' },
      { key: 'businessAnalysisReporting', label: 'تقارير التحليل التجاري', module: 'REP', viewType: 'info' }
    ]
  }
]);

var NIJJARA_FORM_SCHEMAS = Object.freeze({
  users: {
    titleNew: 'إضافة مستخدم',
    titleEdit: 'تعديل مستخدم',
    leftInfoTitle: 'معلومات الحساب',
    mainTitle: 'بيانات الربط',
    dynamicTitle: 'الدور والوصول',
    attachmentTitle: false,
    summaryFields: ['الموظف', 'الاسم', 'البريد الإلكتروني', 'اسم المستخدم', 'الحالة', 'الدور الرئيسي', 'تخصيصات الوصول'],
    summaryFieldKeys: ['linkedEmployeeLabel', 'displayNameAr', 'email', 'username', 'statusCode', 'primaryRoleCode', 'accessRules'],
    mainFields: [
      { name: 'employeeId', label: 'الموظف', type: 'dynamic-select', source: 'employeesWithoutAccounts', required: true, placeholder: 'اختر الموظف', modes: ['new'] },
      { name: 'linkedEmployeeLabel', label: 'الموظف', type: 'derived', modes: ['edit'] }
    ],
    dynamicFields: [
      { name: 'statusCode', label: 'الحالة', type: 'select', options: ['ACTIVE', 'INACTIVE'], modes: ['edit'] },
      { name: 'password', label: 'كلمة المرور', type: 'password', requiredOnModes: ['new'], placeholder: 'اتركه فارغاً للإبقاء على كلمة المرور الحالية' },
      { name: 'confirmPassword', label: 'تأكيد كلمة المرور', type: 'password', requiredOnModes: ['new'], placeholder: 'اتركه فارغاً إذا لم يتم تغيير كلمة المرور' },
      { name: 'primaryRoleCode', label: 'الدور الرئيسي', type: 'dynamic-select', source: 'manageableRoles', required: true, placeholder: 'اختر الدور الرئيسي', span: 2 },
      { name: 'accessRules', label: 'تخصيصات الوصول حسب الوحدة', type: 'access-matrix', source: 'accessModules', scopeSource: 'accessScopes', span: 4 }
    ]
  },
  employees: {
    titleNew: 'إضافة موظف',
    titleEdit: 'تعديل موظف',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'بيانات إضافية',
    attachmentTitle: 'المرفقات',
    summaryFields: ['الاسم بالعربية', 'الاسم بالإنجليزية', 'البريد الإلكتروني', 'رقم الجوال', 'الهوية الوطنية', 'تاريخ الميلاد', 'تاريخ التعيين', 'الحالة', 'نوع العقد', 'المسمى الوظيفي', 'الإدارة', 'الراتب الأساسي', 'المرفقات'],
    summaryFieldKeys: ['arabicFullName', 'englishFullName', 'email', 'mobileNumber', 'nationalId', 'dateOfBirth', 'hireDate', 'statusCode', 'contractType', 'jobTitleArabic', 'departmentArabic', 'basicSalary', 'attachments'],
    mainFields: [
      { name: 'arabicFullName', label: 'الاسم بالعربية', type: 'text', required: true },
      { name: 'englishFullName', label: 'الاسم بالإنجليزية', type: 'text' },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email' },
      { name: 'mobileNumber', label: 'رقم الجوال', type: 'text' },
      { name: 'nationalId', label: 'الهوية الوطنية', type: 'text' },
      { name: 'dateOfBirth', label: 'تاريخ الميلاد', type: 'date' },
      { name: 'hireDate', label: 'تاريخ التعيين', type: 'date' },
      { name: 'statusCode', label: 'الحالة', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
      { name: 'contractType', label: 'نوع العقد', type: 'select', options: ['PERMANENT', 'TEMP'] }
    ],
    dynamicFields: [
      { name: 'jobTitleArabic', label: 'المسمى الوظيفي', type: 'dynamic-select', source: 'hrJobTitles', placeholder: 'اختر المسمى الوظيفي' },
      { name: 'departmentArabic', label: 'الإدارة', type: 'dynamic-select', source: 'hrDepartments', placeholder: 'اختر الإدارة' },
      { name: 'basicSalary', label: 'الراتب الأساسي', type: 'number' }
    ]
  },
  clients: {
    titleNew: 'إضافة عميل',
    titleEdit: 'تعديل عميل',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'بيانات إضافية',
    attachmentTitle: 'المرفقات',
    summaryFields: ['الاسم بالعربية', 'الاسم بالإنجليزية', 'البريد الإلكتروني', 'رقم الجوال', 'الحالة', 'المرفقات'],
    summaryFieldKeys: ['arabicName', 'englishName', 'email', 'mobileNumber', 'status', 'attachments'],
    mainFields: [
      { name: 'arabicName', label: 'الاسم بالعربية', type: 'text', required: true },
      { name: 'englishName', label: 'الاسم بالإنجليزية', type: 'text' },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email' },
      { name: 'mobileNumber', label: 'رقم الجوال', type: 'text' }
    ],
    dynamicFields: [
      { name: 'status', label: 'الحالة', type: 'select', options: ['ACTIVE', 'INACTIVE', 'LEAD', 'ARCHIVED'] }
    ]
  },
  projects: {
    titleNew: 'إضافة مشروع',
    titleEdit: 'تعديل مشروع',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'بيانات تنفيذية',
    attachmentTitle: 'المرفقات',
    summaryFields: ['اسم المشروع بالعربية', 'اسم المشروع بالإنجليزية', 'العميل', 'الحالة', 'الميزانية', 'المرفقات'],
    summaryFieldKeys: ['arabicName', 'englishName', 'clientId', 'projectStatus', 'budget', 'attachments'],
    mainFields: [
      { name: 'arabicName', label: 'اسم المشروع بالعربية', type: 'text', required: true },
      { name: 'englishName', label: 'اسم المشروع بالإنجليزية', type: 'text' },
      { name: 'clientId', label: 'العميل', type: 'dynamic-select', source: 'clients' },
      { name: 'projectStatus', label: 'الحالة', type: 'select', options: ['IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] }
    ],
    dynamicFields: [
      { name: 'budget', label: 'الميزانية', type: 'number' }
    ]
  },
  projectBudgets: {
    titleNew: 'تعديل ميزانية مشروع',
    titleEdit: 'تعديل ميزانية مشروع',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'بيانات التعديل',
    dynamicTitle: 'بيانات مرتبطة بالمشروع',
    attachmentTitle: false,
    summaryFields: ['المشروع', 'العميل', 'تاريخ التعديل', 'الميزانية السابقة', 'الميزانية الجديدة', 'الفرق', 'السبب'],
    summaryFieldKeys: ['projectId', 'clientDisplay', 'revisionDate', 'oldBudget', 'newBudget', 'delta', 'reason'],
    mainFields: [
      { name: 'projectId', label: 'المشروع', type: 'dynamic-select', source: 'projects', required: true, placeholder: 'اختر المشروع' },
      { name: 'revisionDate', label: 'تاريخ التعديل', type: 'date', required: true },
      { name: 'newBudget', label: 'الميزانية الجديدة', type: 'number', required: true },
      { name: 'reason', label: 'السبب', type: 'textarea' }
    ],
    dynamicFields: [
      { name: 'clientDisplay', label: 'العميل', type: 'derived' },
      { name: 'oldBudget', label: 'الميزانية السابقة', type: 'derived' },
      { name: 'delta', label: 'الفرق', type: 'derived' },
      { name: 'receivedTotal', label: 'إجمالي المستلم', type: 'derived' },
      { name: 'remainingAmount', label: 'المتبقي الحالي', type: 'derived' },
      { name: 'projectStatus', label: 'الحالة', type: 'derived' }
    ]
  },
  expenses: {
    titleNew: 'إضافة مصروف',
    titleEdit: 'تعديل مصروف',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'البيانات المشتقة',
    attachmentTitle: 'المرفقات',
    summaryFields: ['التاريخ', 'المبلغ', 'المصروف', 'الفئة', 'الفئة الفرعية', 'من عهدة', 'قناة التحميل', 'المشروع', 'نوع المصروف', 'المرفقات'],
    summaryFieldKeys: ['date', 'amount', 'expenseSmartSearch', 'categoryInfo', 'subCategoryInfo', 'fromCustody', 'allocationChannel', 'projectId', 'expenseTypeInfo', 'attachments'],
    mainFields: [
      { name: 'date', label: 'التاريخ', type: 'date', required: true },
      { name: 'amount', label: 'المبلغ', type: 'number', required: true },
      { name: 'expenseSmartSearch', label: 'المصروف', type: 'smart-search', source: 'expenseCatalog', required: true, span: 2 },
      { name: 'allocationChannel', label: 'قناة التحميل', type: 'dynamic-select', source: 'allocationChannels', required: true, placeholder: 'اختر قناة التحميل' },
      { name: 'fromCustody', label: 'من عهدة', type: 'dynamic-select', source: 'custodyAccounts', required: true }
    ],
    dynamicFields: [
      { name: 'categoryInfo', label: 'الفئة', type: 'derived' },
      { name: 'subCategoryInfo', label: 'الفئة الفرعية', type: 'derived' },
      { name: 'expenseTypeInfo', label: 'نوع المصروف', type: 'select', options: ['DIRECT', 'INDIRECT_PERIODICAL', 'NON_PERIODICAL', 'ASSET'], placeholder: 'اختر نوع المصروف' },
      { name: 'depreciationPeriod', label: 'مدة الإهلاك (بالأشهر)', type: 'number' },
      { name: 'periodStartDate', label: 'بداية الفترة', type: 'date' },
      { name: 'periodEndDate', label: 'نهاية الفترة', type: 'date' },
      { name: 'projectId', label: 'المشروع', type: 'dynamic-select', source: 'activeProjects', placeholder: 'اختر المشروع' },
      { name: 'internalRevenueMode', label: 'قناة التحميل المشتقة', type: 'select', options: ['&Pieces', 'Using Factory Machines'], placeholder: 'اختر النمط الداخلي' }
    ]
  },
  income: {
    titleNew: 'إضافة إيراد',
    titleEdit: 'تعديل إيراد',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'بيانات إضافية',
    attachmentTitle: 'المرفقات',
    summaryFields: ['التاريخ', 'المبلغ', 'قناة الإيراد', 'المشروع', 'الوصف', 'المرفقات'],
    summaryFieldKeys: ['date', 'amount', 'revenueChannel', 'projectId', 'statement', 'attachments'],
    mainFields: [
      { name: 'date', label: 'التاريخ', type: 'date', required: true },
      { name: 'amount', label: 'المبلغ', type: 'number', required: true },
      { name: 'revenueChannel', label: 'قناة الإيراد', type: 'dynamic-select', source: 'revenueChannels', required: true }
    ],
    dynamicFields: [
      { name: 'projectId', label: 'المشروع', type: 'dynamic-select', source: 'projects' },
      { name: 'statement', label: 'الوصف', type: 'textarea' }
    ]
  },
  collections: {
    titleNew: 'إضافة تحصيل',
    titleEdit: 'تعديل تحصيل',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'بيانات إضافية',
    attachmentTitle: false,
    summaryFields: ['المشروع', 'العميل', 'تاريخ التحصيل', 'قيمة التحصيل', 'استلمت في عهدة', 'إجمالي المستلم', 'المتبقي', 'الحالة'],
    summaryFieldKeys: ['projectId', 'clientDisplay', 'paymentDate', 'paymentAmount', 'receivedCustodyAccountId', 'totalReceived', 'remainingAmount', 'projectStatus'],
    mainFields: [
      { name: 'projectId', label: 'المشروع', type: 'dynamic-select', source: 'projects', required: true, placeholder: 'اختر المشروع' },
      { name: 'paymentDate', label: 'تاريخ التحصيل', type: 'date', required: true },
      { name: 'paymentAmount', label: 'قيمة التحصيل', type: 'number', required: true },
      { name: 'receivedCustodyAccountId', label: 'استلمت في عهدة', type: 'dynamic-select', source: 'custodyAccounts', required: true, placeholder: 'اختر العهدة المستلمة' }
    ],
    dynamicFields: [
      { name: 'clientDisplay', label: 'العميل', type: 'derived' },
      { name: 'totalPayments', label: 'عدد التحصيلات', type: 'derived' },
      { name: 'totalBudget', label: 'إجمالي الميزانية', type: 'derived' },
      { name: 'totalReceived', label: 'إجمالي المستلم', type: 'derived' },
      { name: 'remainingAmount', label: 'المتبقي', type: 'derived' },
      { name: 'projectStatus', label: 'الحالة', type: 'derived' }
    ]
  },
  projectRevenueTracking: {
    titleNew: 'إضافة إيراد مشروع',
    titleEdit: 'تعديل إيراد مشروع',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'بيانات إضافية',
    attachmentTitle: false,
    summaryFields: ['المشروع', 'العميل', 'تاريخ التحصيل', 'قيمة التحصيل', 'استلمت في عهدة', 'إجمالي المستلم', 'المتبقي', 'الحالة'],
    summaryFieldKeys: ['projectId', 'clientDisplay', 'paymentDate', 'paymentAmount', 'receivedCustodyAccountId', 'totalReceived', 'remainingAmount', 'projectStatus'],
    mainFields: [
      { name: 'projectId', label: 'المشروع', type: 'dynamic-select', source: 'projects', required: true, placeholder: 'اختر المشروع' },
      { name: 'paymentDate', label: 'تاريخ التحصيل', type: 'date', required: true },
      { name: 'paymentAmount', label: 'قيمة التحصيل', type: 'number', required: true },
      { name: 'receivedCustodyAccountId', label: 'استلمت في عهدة', type: 'dynamic-select', source: 'custodyAccounts', required: true, placeholder: 'اختر العهدة المستلمة' }
    ],
    dynamicFields: [
      { name: 'clientDisplay', label: 'العميل', type: 'derived' },
      { name: 'totalReceived', label: 'إجمالي المستلم', type: 'derived' },
      { name: 'remainingAmount', label: 'المتبقي', type: 'derived' },
      { name: 'projectStatus', label: 'الحالة', type: 'derived' }
    ]
  },
  internalChannels: {
    titleNew: 'إضافة قناة داخلية',
    titleEdit: 'تعديل قناة داخلية',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'الأرصدة المحسوبة',
    attachmentTitle: false,
    summaryFields: ['الاسم بالعربية', 'الاسم بالإنجليزية', 'قناة الإيراد المرتبطة', 'تاريخ الطلب', 'قيمة الطلب', 'إجمالي المستلم', 'المتبقي', 'الحالة'],
    summaryFieldKeys: ['arabicName', 'englishName', 'revChannelId', 'orderDate', 'orderPrice', 'totalReceived', 'totalRemaining', 'orderStatus'],
    mainFields: [
      { name: 'arabicName', label: 'الاسم بالعربية', type: 'text', required: true },
      { name: 'englishName', label: 'الاسم بالإنجليزية', type: 'text' },
      { name: 'revChannelId', label: 'قناة الإيراد المرتبطة', type: 'dynamic-select', source: 'revenueChannels', placeholder: 'اختر القناة (للربط بالشريك إن وجد)' },
      { name: 'orderDate', label: 'تاريخ الطلب', type: 'date' },
      { name: 'orderPrice', label: 'قيمة الطلب', type: 'number' }
    ],
    dynamicFields: [
      { name: 'orderStatus', label: 'الحالة', type: 'select', options: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
      { name: 'totalReceived', label: 'إجمالي المستلم', type: 'derived' },
      { name: 'totalRemaining', label: 'المتبقي', type: 'derived' }
    ]
  },
  internalRevenuePayments: {
    titleNew: 'إضافة دفعة إيراد داخلي',
    titleEdit: 'تعديل دفعة إيراد داخلي',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'بيانات إضافية',
    attachmentTitle: false,
    summaryFields: ['القناة الداخلية', 'تاريخ التحصيل', 'قيمة التحصيل', 'استلمت في عهدة', 'إجمالي المستلم', 'المتبقي', 'الوصف'],
    summaryFieldKeys: ['internalChannelId', 'paymentDate', 'paymentAmount', 'receivedCustodyAccountId', 'totalReceived', 'totalRemaining', 'statement'],
    mainFields: [
      { name: 'internalChannelId', label: 'القناة الداخلية', type: 'dynamic-select', source: 'internalChannels', required: true, placeholder: 'اختر القناة الداخلية' },
      { name: 'paymentDate', label: 'تاريخ التحصيل', type: 'date', required: true },
      { name: 'paymentAmount', label: 'قيمة التحصيل', type: 'number', required: true },
      { name: 'receivedCustodyAccountId', label: 'استلمت في عهدة', type: 'dynamic-select', source: 'custodyAccounts', required: true, placeholder: 'اختر العهدة المستلمة' }
    ],
    dynamicFields: [
      { name: 'totalReceived', label: 'إجمالي المستلم', type: 'derived' },
      { name: 'totalRemaining', label: 'المتبقي', type: 'derived' },
      { name: 'statement', label: 'الوصف', type: 'textarea' }
    ]
  },
  recordPayment: {
    titleNew: 'تسجيل دفعة / إيراد',
    titleEdit: 'تسجيل دفعة / إيراد',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'بيانات الدفعة أو الإيراد',
    dynamicTitle: 'بيانات إضافية',
    attachmentTitle: 'المرفقات',
    summaryFields: ['نوع الإيراد', 'التاريخ', 'المبلغ', 'المشروع / القناة', 'استلمت في عهدة', 'ملاحظات'],
    summaryFieldKeys: ['paymentCategory', 'paymentDate', 'amount', 'sourceLabel', 'custodyLabel', 'notes'],
    mainFields: [
      { name: 'paymentCategory', label: 'نوع الإيراد', type: 'rp-category', required: true },
      { name: 'projectId', label: 'المشروع', type: 'dynamic-select', source: 'activeProjects', required: true, placeholder: 'اختر المشروع' },
      { name: 'internalSubType', label: 'القناة الداخلية', type: 'rp-subchannel', required: true },
      { name: 'showroomOrderId', label: 'طلب المعرض', type: 'dynamic-select', source: 'activeShowroomOrders', required: true, placeholder: 'اختر طلب المعرض' },
      { name: 'factoryOrderName', label: 'اسم الأمر / الطلب', type: 'text', required: true, placeholder: 'أدخل اسماً للأمر' },
      { name: 'totalOrderCost', label: 'إجمالي تكلفة الأمر', type: 'number', placeholder: 'التكلفة الكاملة المتفق عليها' },
      { name: 'amount', label: 'المبلغ المستلم', type: 'number', required: true },
      { name: 'paymentDate', label: 'التاريخ', type: 'date', required: true },
      { name: 'receivedCustodyAccountId', label: 'استلمت في عهدة', type: 'dynamic-select', source: 'custodyAccounts', required: true, placeholder: 'اختر العهدة' },
      { name: 'notes', label: 'ملاحظات', type: 'textarea' }
    ],
    dynamicFields: []
  },
  showroomOrders: {
    titleNew: 'إضافة طلب معرض &Pieces',
    titleEdit: 'تعديل طلب معرض &Pieces',
    leftInfoTitle: 'معلومات الطلب',
    mainTitle: 'بيانات الطلب',
    dynamicTitle: 'بيانات الأرصدة',
    attachmentTitle: 'المرفقات',
    summaryFields: ['اسم الطلب', 'تاريخ الطلب', 'تاريخ التسليم', 'القيمة المتفق عليها', 'الحالة', 'المرفقات'],
    summaryFieldKeys: ['orderName', 'orderDate', 'deliveryDate', 'agreedPrice', 'orderStatus', 'attachments'],
    mainFields: [
      { name: 'orderName', label: 'اسم الطلب', type: 'text', required: true, placeholder: 'أدخل اسماً مميزاً للطلب' },
      { name: 'orderDate', label: 'تاريخ الطلب', type: 'date', required: true },
      { name: 'deliveryDate', label: 'تاريخ التسليم المتفق عليه', type: 'date' },
      { name: 'agreedPrice', label: 'القيمة المتفق عليها', type: 'number', required: true }
    ],
    dynamicFields: [
      { name: 'orderStatus', label: 'حالة الطلب', type: 'select', options: ['ACTIVE', 'COMPLETED', 'CANCELLED'], placeholder: 'اختر الحالة' },
      { name: 'totalReceived', label: 'إجمالي المستلم', type: 'derived' },
      { name: 'totalRemaining', label: 'المتبقي', type: 'derived' },
      { name: 'notes', label: 'ملاحظات', type: 'textarea' }
    ]
  },
  revenueChannels: {
    titleNew: 'إضافة قناة إيراد',
    titleEdit: 'تعديل قناة إيراد',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'بيانات إضافية',
    attachmentTitle: 'المرفقات',
    summaryFields: ['الاسم بالعربية', 'الاسم بالإنجليزية', 'النوع', 'شريك مخصص', 'الحالة', 'المرفقات'],
    summaryFieldKeys: ['arabicName', 'englishName', 'channelType', 'linkedPartnerId', 'statusCode', 'attachments'],
    mainFields: [
      { name: 'arabicName', label: 'الاسم بالعربية', type: 'text', required: true },
      { name: 'englishName', label: 'الاسم بالإنجليزية', type: 'text' },
      { name: 'channelType', label: 'النوع', type: 'select', options: ['PROJECT', 'FACTORY', 'INTERNAL'] }
    ],
    dynamicFields: [
      { name: 'linkedPartnerId', label: 'شريك مخصص (إيراده كاملاً لهذا الشريك)', type: 'dynamic-select', source: 'partners', placeholder: 'اختر الشريك (اتركه فارغاً للإيرادات المشتركة)' },
      { name: 'statusCode', label: 'الحالة', type: 'select', options: ['ACTIVE', 'INACTIVE'] }
    ]
  },
  custodyAccount: {
    titleNew: 'إضافة حساب عهدة',
    titleEdit: 'تعديل حساب عهدة',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'إعدادات الحساب',
    attachmentTitle: 'المرفقات',
    summaryFields: ['نوع الحامل', 'الحامل', 'مصدر الرصيد', 'الرصيد الافتتاحي', 'السماح بالمصروفات', 'الحالة', 'المرفقات'],
    summaryFieldKeys: ['holderTypeCode', 'linkedEntityId', 'fundingSourceType', 'openingBalance', 'allowExpenseUse', 'statusCode', 'attachments'],
    mainFields: [
      { name: 'holderTypeCode', label: 'نوع الحامل', type: 'select', options: ['EMPLOYEE', 'PARTNER'], required: true },
      { name: 'linkedEmployeeId', label: 'الموظف', type: 'dynamic-select', source: 'employeesWithoutCustodyAccounts', fallbackSource: 'employees', placeholder: 'اختر الموظف', required: true },
      { name: 'linkedPartnerId', label: 'الشريك', type: 'dynamic-select', source: 'partnersWithoutCustodyAccounts', fallbackSource: 'partners', placeholder: 'اختر الشريك', required: true }
    ],
    dynamicFields: [
      { name: 'fundingSourceType', label: 'مصدر الرصيد الافتتاحي', type: 'select', options: ['DIRECT', 'FROM_CUSTODY'], required: true },
      { name: 'sourceCustodyAccountId', label: 'من عهدة', type: 'dynamic-select', source: 'custodyAccounts', placeholder: 'اختر العهدة' },
      { name: 'openingBalance', label: 'الرصيد الافتتاحي', type: 'number', required: true },
      { name: 'allowExpenseUse', label: 'السماح بالمصروفات', type: 'select', options: ['true', 'false'] },
      { name: 'statusCode', label: 'الحالة', type: 'select', options: ['ACTIVE', 'INACTIVE'] }
    ]
  },
  custodyAdjustment: {
    titleNew: 'تعديل رصيد عهدة',
    titleEdit: 'تعديل رصيد عهدة',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'الأرصدة المشتقة',
    attachmentTitle: 'المرفقات',
    summaryFields: ['الحساب', 'الرصيد قبل', 'قيمة التعديل', 'الرصيد بعد', 'السبب', 'المرفقات'],
    summaryFieldKeys: ['custodyAccountId', 'balanceBefore', 'adjustmentAmount', 'targetBalance', 'adjustmentReason', 'attachments'],
    mainFields: [
      { name: 'custodyAccountId', label: 'الحساب', type: 'dynamic-select', source: 'custodyAccounts', required: true, placeholder: 'اختر الحساب' },
      { name: 'targetBalance', label: 'الرصيد المستهدف', type: 'number', required: true }
    ],
    dynamicFields: [
      { name: 'balanceBefore', label: 'الرصيد قبل', type: 'derived' },
      { name: 'adjustmentAmount', label: 'قيمة التعديل', type: 'derived' },
      { name: 'adjustmentReason', label: 'السبب', type: 'textarea' }
    ]
  },
  custodyTransfer: {
    titleNew: 'إضافة تحويل عهدة',
    titleEdit: 'تعديل تحويل عهدة',
    leftInfoTitle: 'معلومات السجل',
    mainTitle: 'البيانات الرئيسية',
    dynamicTitle: 'بيانات الرصيد',
    attachmentTitle: 'المرفقات',
    summaryFields: ['من العهدة', 'إلى العهدة', 'القيمة', 'الملاحظات', 'المرفقات'],
    summaryFieldKeys: ['sourceCustody', 'destinationCustody', 'amount', 'notes', 'attachments'],
    mainFields: [
      { name: 'sourceCustody', label: 'من العهدة', type: 'dynamic-select', source: 'custodyAccounts', required: true, placeholder: 'اختر العهدة' },
      { name: 'destinationCustody', label: 'إلى العهدة', type: 'dynamic-select', source: 'custodyAccounts', required: true, placeholder: 'اختر العهدة' },
      { name: 'amount', label: 'القيمة', type: 'number', required: true }
    ],
    dynamicFields: [
      { name: 'notes', label: 'ملاحظات', type: 'textarea' },
      { name: 'sourceBalance', label: 'رصيد المرسل', type: 'derived' },
      { name: 'destinationBalance', label: 'رصيد المستلم', type: 'derived' }
    ]
  }
});

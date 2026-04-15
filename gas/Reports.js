function nijjaraCanUseExecutiveReport_(session) {
  if (!session) return false;
  return nijjaraHasAccess_(session, 'financialReporting', 'view') ||
    nijjaraHasAccess_(session, 'reportExtraction', 'view') ||
    nijjaraHasAccess_(session, 'reportDownloading', 'view') ||
    nijjaraHasAccess_(session, 'businessAnalysisReporting', 'view');
}

function nijjaraGetExecutiveReport(sessionToken) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  if (!nijjaraCanUseExecutiveReport_(session)) {
    throw new Error('You do not have access to generate this report.');
  }
  return nijjaraBuildExecutiveReport_(session);
}

function nijjaraGetExecutiveReportPdf(sessionToken) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  if (!nijjaraCanUseExecutiveReport_(session)) {
    throw new Error('You do not have access to download this report.');
  }
  var report = nijjaraBuildExecutiveReport_(session);
  var pdfBlob = nijjaraBuildExecutiveReportPdfBlob_(report);
  return {
    fileName: pdfBlob.getName(),
    mimeType: MimeType.PDF,
    base64: Utilities.base64Encode(pdfBlob.getBytes())
  };
}

function nijjaraEmailExecutiveReport(sessionToken, recipients) {
  var session = nijjaraGetSession(sessionToken);
  if (!session) throw new Error('Session expired.');
  if (!nijjaraCanUseExecutiveReport_(session)) {
    throw new Error('You do not have access to send this report.');
  }
  var recipientList = String(recipients || '')
    .split(/[;,]/)
    .map(function (item) { return String(item || '').trim(); })
    .filter(function (item) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item); });
  if (!recipientList.length) {
    throw new Error('At least one valid email address is required.');
  }
  var report = nijjaraBuildExecutiveReport_(session);
  var pdfBlob = nijjaraBuildExecutiveReportPdfBlob_(report);
  MailApp.sendEmail({
    to: recipientList.join(','),
    subject: report.subject,
    body: report.plainText,
    htmlBody: report.html,
    attachments: [pdfBlob],
    name: NIJJARA_CONFIG.systemName
  });
  return {
    success: true,
    recipients: recipientList,
    sentAt: nijjaraNow_()
  };
}

function nijjaraBuildExecutiveReport_(session) {
  var timeZone = Session.getScriptTimeZone() || 'Africa/Cairo';
  var now = new Date();
  var today = Utilities.formatDate(now, timeZone, 'yyyy-MM-dd');
  var yearStart = Utilities.formatDate(new Date(now.getFullYear(), 0, 1), timeZone, 'yyyy-MM-dd');
  var timestamp = Utilities.formatDate(now, timeZone, 'yyyy-MM-dd_HH-mm');
  var generatedAt = Utilities.formatDate(now, timeZone, "yyyy-MM-dd'T'HH:mm:ss");
  var generatedAtDisplay = formatArabicDateTimeServer(now, timeZone);

  var projects = nijjaraRows_('PRJ_Projects');
  var projectMap = {};
  projects.forEach(function (row) {
    projectMap[String(row.Project_ID || '').trim()] = row;
  });

  var revenueChannels = nijjaraRows_('FIN_RevenueChannels');
  var revenueChannelMap = {};
  var partnerLinkedChannelIds = {};
  revenueChannels.forEach(function (row) {
    var channelId = String(row.RevChannel_ID || '').trim();
    revenueChannelMap[channelId] = row;
    if (String(row.Linked_Partner_ID || '').trim()) {
      partnerLinkedChannelIds[channelId] = true;
    }
  });

  var allocationChannels = nijjaraRows_('FIN_AllocationChannels');
  var allocationChannelMap = {};
  allocationChannels.forEach(function (row) {
    allocationChannelMap[String(row.AlloChannel_ID || '').trim()] = row;
  });

  var expenses = nijjaraRows_('FIN_Expenses').filter(function (row) {
    return !!nijjaraInputDateValue_(row.Date || '');
  });
  var internalChannelRevChannelMap = {};
  nijjaraRows_('INCH_InternalChannels').forEach(function (row) {
    var channelId = String(row.InternalChannel_ID || '').trim();
    if (channelId) internalChannelRevChannelMap[channelId] = String(row.RevChannel_ID || '').trim();
  });
  var internalRevenue = nijjaraRows_('INCH_InternalRevenuePayments').filter(function (row) {
    return !!nijjaraInputDateValue_(row.Payment_Date || '');
  }).map(function (row) {
    return {
      Date: row.Payment_Date || '',
      Amount: Number(row.Payment_Amount || 0) || 0,
      RevChannel_ID: internalChannelRevChannelMap[String(row.InternalChannel_ID || '').trim()] || '',
      InternalChannel_ID: row.InternalChannel_ID || ''
    };
  });
  var projectRevenue = nijjaraRows_('FIN_Revenue').filter(function (row) {
    return !!nijjaraInputDateValue_(row.Date || '');
  });
  var payments = nijjaraRows_('PRJ_Payments').filter(function (row) {
    return !!nijjaraInputDateValue_(row.Payment_Date || '');
  });
  var custodyAccounts = nijjaraRows_('FIN_CustodyAccounts').filter(function (row) {
    return String(row.Is_Active).toLowerCase() !== 'false';
  });

  function inRange(value, from, to) {
    if (!value) return false;
    if (from && value < from) return false;
    if (to && value > to) return false;
    return true;
  }

  function sum(rows, field) {
    return rows.reduce(function (acc, row) {
      return acc + (Number(row[field] || 0) || 0);
    }, 0);
  }

  function amountValue(row, field) {
    return Number(row[field] || 0) || 0;
  }

  function bucketByLabel(rows, keyBuilder, amountField, labelBuilder) {
    var bucket = {};
    rows.forEach(function (row) {
      var key = String(keyBuilder(row) || '').trim() || 'UNASSIGNED';
      if (!bucket[key]) {
        bucket[key] = {
          key: key,
          label: labelBuilder(row, key),
          amount: 0,
          count: 0
        };
      }
      bucket[key].amount += amountValue(row, amountField);
      bucket[key].count += 1;
    });
    return Object.keys(bucket).map(function (key) { return bucket[key]; }).sort(function (left, right) {
      return right.amount - left.amount;
    });
  }

  function projectLabel(projectId) {
    var project = projectMap[String(projectId || '').trim()];
    return (project && (project.Project_Name_AR || project.Project_Name_EN || projectId)) || 'غير مرتبط بمشروع';
  }

  function revenueChannelLabel(channelId) {
    var channel = revenueChannelMap[String(channelId || '').trim()];
    return (channel && (channel.RevChannel_AR || channel.RevChannel_EN || channelId)) || 'قناة غير محددة';
  }

  function allocationChannelLabel(channelId) {
    var channel = allocationChannelMap[String(channelId || '').trim()];
    return (channel && (channel.AlloChannel_AR || channel.AlloChannel_EN || channelId)) || 'قناة غير محددة';
  }

  function normalizeEntityLabel(label) {
    var value = String(label || '').trim();
    if (!value) return 'غير محدد';
    if (value.indexOf('استخدام / تأجير ماكينات المصنع') !== -1 || value.indexOf('Factory Machinery Use / Rental') !== -1) {
      return 'تمكين - مكن المصنع';
    }
    return value;
  }

  function formatArabicDateServer(value) {
    var dateOnly = nijjaraInputDateValue_(value || '');
    if (!dateOnly) return '—';
    var parts = dateOnly.split('-');
    if (parts.length !== 3) return dateOnly;
    var months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return Number(parts[2]) + ' ' + months[Math.max(0, Math.min(11, Number(parts[1]) - 1))] + ' ' + parts[0];
  }

  function formatArabicDateTimeServer(value, zone) {
    if (!value) return '—';
    var date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '—';
    var months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    var year = Utilities.formatDate(date, zone, 'yyyy');
    var month = Number(Utilities.formatDate(date, zone, 'M'));
    var day = Number(Utilities.formatDate(date, zone, 'd'));
    var hour24 = Number(Utilities.formatDate(date, zone, 'H'));
    var minute = Utilities.formatDate(date, zone, 'mm');
    var meridiem = hour24 >= 12 ? 'م' : 'ص';
    var hour12 = hour24 % 12;
    if (!hour12) hour12 = 12;
    return day + ' ' + months[Math.max(0, Math.min(11, month - 1))] + ' ' + year + ' - ' + hour12 + ':' + minute + ' ' + meridiem;
  }

  function custodyDisplayLabel(row) {
    var label = String(row.CustodyAccount_AR || row.Linked_ID || row.CustodyAccount_ID || '').trim();
    if (String(row.Linked_ID || '').trim() === 'EMP-002' || label.indexOf('مصطفى سبيع') !== -1) {
      return 'الخزنة الرئيسية';
    }
    label = label.replace(/^عهدة شريك\s*-\s*/g, '');
    label = label.replace(/^عهدة الموظف\s*-\s*/g, '');
    return label;
  }

  var ytdExpenses = expenses.filter(function (row) {
    return inRange(nijjaraInputDateValue_(row.Date || ''), yearStart, today);
  });
  var ytdInternalRevenue = internalRevenue.filter(function (row) {
    return inRange(nijjaraInputDateValue_(row.Date || ''), yearStart, today);
  });
  var ytdProjectRevenue = projectRevenue.filter(function (row) {
    return inRange(nijjaraInputDateValue_(row.Date || ''), yearStart, today);
  });
  // Exclude partner-exclusive channels (e.g. CNC) from company revenue totals
  var ytdCompanyInternalRevenue = ytdInternalRevenue.filter(function (row) {
    return !partnerLinkedChannelIds[String(row.RevChannel_ID || '').trim()];
  });

  var expensesByChannel = bucketByLabel(ytdExpenses, function (row) {
    return row.AlloChannel_ID || '';
  }, 'Amount', function (row, key) {
    return allocationChannelLabel(key);
  });

  var revenueByChannel = bucketByLabel(ytdCompanyInternalRevenue.concat(ytdProjectRevenue), function (row) {
    return row.RevChannel_ID || '';
  }, 'Amount', function (row, key) {
    return normalizeEntityLabel(revenueChannelLabel(key));
  });

  expensesByChannel = expensesByChannel.map(function (row) {
    row.label = normalizeEntityLabel(row.label);
    return row;
  });

  var entitySummaryMap = {};
  function ensureEntitySummary(label) {
    label = normalizeEntityLabel(label);
    if (!entitySummaryMap[label]) {
      entitySummaryMap[label] = {
        label: label,
        revenue: 0,
        expenses: 0
      };
    }
    return entitySummaryMap[label];
  }
  revenueByChannel.forEach(function (row) {
    ensureEntitySummary(row.label).revenue += Number(row.amount || 0) || 0;
  });
  expensesByChannel.forEach(function (row) {
    ensureEntitySummary(row.label).expenses += Number(row.amount || 0) || 0;
  });
  var entitySummary = Object.keys(entitySummaryMap).map(function (key) {
    return entitySummaryMap[key];
  }).sort(function (left, right) {
    return Math.max(right.revenue, right.expenses) - Math.max(left.revenue, left.expenses);
  });

  var projectExpensesAllTime = {};
  expenses.forEach(function (row) {
    var projectId = String(row.Project_ID || '').trim();
    if (!projectId) return;
    projectExpensesAllTime[projectId] = (projectExpensesAllTime[projectId] || 0) + amountValue(row, 'Amount');
  });

  var paymentMetaByProject = {};
  payments.forEach(function (row) {
    var projectId = String(row.Project_ID || '').trim();
    if (!projectId) return;
    if (!paymentMetaByProject[projectId]) {
      paymentMetaByProject[projectId] = { count: 0, amount: 0 };
    }
    paymentMetaByProject[projectId].count += 1;
    paymentMetaByProject[projectId].amount += amountValue(row, 'Payment_Amount');
  });

  var activeProjectsPending = projects.filter(function (row) {
    var status = nijjaraNormalizeProjectStatus_(row.Project_Status || '');
    var isActive = String(row.Is_Active).toLowerCase() !== 'false';
    var remaining = Number(row.Amount_Remaining || 0) || 0;
    return isActive && status !== 'COMPLETED' && status !== 'CANCELLED' && remaining > 0;
  }).map(function (row) {
    var projectId = String(row.Project_ID || '').trim();
      var paymentMeta = paymentMetaByProject[projectId] || { count: 0, amount: 0 };
      return {
        projectId: projectId,
        projectNameAr: row.Project_Name_AR || row.Project_Name_EN || projectId,
        projectNameEn: row.Project_Name_EN || '',
        startDate: formatArabicDateServer(row.Actual_Start_Date || row.Contract_Start_Date || row.Created_At || ''),
        budget: Number(row.Project_Budget || 0) || 0,
        totalExpenses: Number(projectExpensesAllTime[projectId] || 0) || 0,
      paymentsCount: paymentMeta.count,
      received: Number(row.Amount_Received || paymentMeta.amount || 0) || 0,
      remaining: Number(row.Amount_Remaining || 0) || 0
    };
  }).sort(function (left, right) {
    return right.remaining - left.remaining;
  });

  var custodyBalances = custodyAccounts.map(function (row) {
    return {
      label: custodyDisplayLabel(row),
      amount: Number(row.Current_Balance || 0) || 0,
      status: row.Status_Code || 'ACTIVE'
    };
  }).sort(function (left, right) {
    return Math.abs(right.amount) - Math.abs(left.amount);
  });

  var summary = {
    yearStart: yearStart,
    periodLabel: '1 يناير ' + String(now.getFullYear()) + ' - ' + generatedAtDisplay,
    generatedAt: generatedAt,
    expensesYtdAmount: sum(ytdExpenses, 'Amount'),
    revenueYtdAmount: sum(ytdCompanyInternalRevenue, 'Amount') + sum(ytdProjectRevenue, 'Amount'),
    activeProjects: projects.filter(function (row) {
      var status = nijjaraNormalizeProjectStatus_(row.Project_Status || '');
      return String(row.Is_Active).toLowerCase() !== 'false' && status !== 'COMPLETED' && status !== 'CANCELLED';
    }).length
  };

  var report = {
    generatedAt: generatedAt,
    generatedAtDisplay: generatedAtDisplay,
    generatedBy: session.displayName || session.username,
    subject: 'تقرير نجارة التنفيذي - ' + generatedAtDisplay,
    fileName: 'Nijjara_DailyReport_' + timestamp + '.pdf',
    summary: summary,
    sections: {
      expensesByChannel: expensesByChannel,
      revenueByChannel: revenueByChannel,
      entitySummary: entitySummary,
      activeProjectsPending: activeProjectsPending,
      custodyBalances: custodyBalances
    }
  };
  report.whatsAppText = [
    'تقرير نجارة التنفيذي',
    'المصروفات منذ بداية السنة: ' + (summary.expensesYtdAmount || 0).toLocaleString('ar-EG') + ' ج.م',
    'الإيرادات منذ بداية السنة: ' + (summary.revenueYtdAmount || 0).toLocaleString('ar-EG') + ' ج.م',
    'المشاريع النشطة: ' + (summary.activeProjects || 0).toLocaleString('ar-EG')
  ].join('\n');
  report.html = nijjaraRenderExecutiveReportHtml_(report);
  report.plainText = [
    'التقرير التنفيذي اليومي - نجارة',
    'تاريخ الإنشاء: ' + generatedAtDisplay,
    'إجمالي المصروفات منذ بداية السنة: ' + summary.expensesYtdAmount,
    'إجمالي الإيرادات منذ بداية السنة: ' + summary.revenueYtdAmount,
    'عدد المشاريع النشطة: ' + summary.activeProjects
  ].join('\n');
  return report;
}

function nijjaraRenderExecutiveReportHtml_(report) {
  var summary = report.summary || {};
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function money(value) {
    return '<span class="num">' + esc((Number(value || 0) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })) + '</span> <span class="money-unit">ج.م</span>';
  }
  function count(value) {
    return '<span class="num">' + esc((Number(value || 0) || 0).toLocaleString('ar-EG')) + '</span>';
  }
  function metricCard(title, value) {
    return '<article class="metric-card"><div class="metric-card__title">' + esc(title) + '</div><div class="metric-card__value">' + value + '</div></article>';
  }
  function analysisSection(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var maxAmount = rows.reduce(function (acc, row) {
      return Math.max(acc, Number(row.revenue || 0) || 0, Number(row.expenses || 0) || 0);
    }, 1);
    return '<section class="panel panel--wide"><h3>ملخص تحليلي للإيرادات والمصروفات عن فترة:</h3><p class="panel__subline">' + esc(summary.periodLabel || '—') + '</p>' +
      (rows.length
        ? '<div class="analysis-graph">' + rows.map(function (row) {
            var revenueWidth = Math.max(8, Math.round(((Number(row.revenue || 0) || 0) / maxAmount) * 100));
            var expenseWidth = Math.max(8, Math.round(((Number(row.expenses || 0) || 0) / maxAmount) * 100));
            return '<article class="analysis-graph__item">' +
              '<div class="analysis-graph__meta"><strong>' + esc(row.label || '—') + '</strong></div>' +
              '<div class="analysis-graph__bars">' +
                '<div class="analysis-graph__track"><div class="analysis-graph__fill analysis-graph__fill--revenue" style="width:' + revenueWidth + '%"></div></div>' +
                '<div class="analysis-graph__track"><div class="analysis-graph__fill analysis-graph__fill--expense" style="width:' + expenseWidth + '%"></div></div>' +
              '</div>' +
              '<div class="analysis-graph__legend"><span>الإيراد: ' + money(row.revenue || 0) + '</span><span>المصروف: ' + money(row.expenses || 0) + '</span></div>' +
            '</article>';
          }).join('') + '</div>'
        : '<div class="empty">لا توجد بيانات متاحة.</div>') +
      '</section>';
  }
  function pendingProjectsTable(rows) {
    rows = Array.isArray(rows) ? rows : [];
    var totals = rows.reduce(function (acc, row) {
      acc.budget += Number(row.budget || 0) || 0;
      acc.totalExpenses += Number(row.totalExpenses || 0) || 0;
      acc.paymentsCount += Number(row.paymentsCount || 0) || 0;
      acc.received += Number(row.received || 0) || 0;
      acc.remaining += Number(row.remaining || 0) || 0;
      return acc;
    }, { budget: 0, totalExpenses: 0, paymentsCount: 0, received: 0, remaining: 0 });
    return '<section class="panel panel--wide"><h3>المشاريع النشطة ذات المبالغ غير المحصلة</h3>' +
      (rows.length
        ? '<table><thead><tr><th>المشروع</th><th>تاريخ البدء</th><th>إجمالي الميزانية</th><th>إجمالي المصروفات</th><th>عدد الدفعات</th><th>المبلغ المستلم</th><th>المبلغ المتبقي</th></tr></thead><tbody>' +
            rows.map(function (row) {
              return '<tr><td><div class="project-name-ar">' + esc(row.projectNameAr || '—') + '</div><div class="project-name-en">' + esc(row.projectNameEn || '') + '</div></td><td>' + esc(row.startDate || '—') + '</td><td>' + money(row.budget || 0) + '</td><td>' + money(row.totalExpenses || 0) + '</td><td>' + count(row.paymentsCount || 0) + '</td><td>' + money(row.received || 0) + '</td><td>' + money(row.remaining || 0) + '</td></tr>';
            }).join('') +
            '<tr class="table-total-row"><td>الإجمالي</td><td>—</td><td>' + money(totals.budget) + '</td><td>' + money(totals.totalExpenses) + '</td><td>' + count(totals.paymentsCount) + '</td><td>' + money(totals.received) + '</td><td>' + money(totals.remaining) + '</td></tr>' +
          '</tbody></table>'
        : '<div class="empty">لا توجد مشاريع نشطة بها مبالغ غير محصلة حالياً.</div>') +
      '</section>';
  }
  function custodyTable(rows) {
    rows = Array.isArray(rows) ? rows : [];
    return '<section class="panel"><h3>أرصدة العهد الحالية</h3>' +
      (rows.length
        ? '<table><thead><tr><th>الحساب</th><th>الرصيد الحالي</th></tr></thead><tbody>' +
            rows.map(function (row) {
              return '<tr><td>' + esc(row.label || '—') + '</td><td>' + money(row.amount || 0) + '</td></tr>';
            }).join('') +
          '</tbody></table>'
        : '<div class="empty">لا توجد بيانات عهد متاحة.</div>') +
      '</section>';
  }

  return '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>' + esc(report.fileName || 'Nijjara_DailyReport') + '</title>' +
    '<style>@import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Manrope:wght@600;700;800;900&display=swap");' +
      'body{margin:0;padding:20px;background:#0f1014;color:#f6f7fb;font-family:"Cairo",Tahoma,sans-serif;}' +
      '.shell{max-width:1180px;margin:0 auto;background:linear-gradient(180deg,#171922 0%,#101218 100%);border:1px solid rgba(255,255,255,.08);border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.36);}' +
      '.hero{position:relative;padding:30px 34px 26px;background:radial-gradient(circle at top right,rgba(193,67,94,.28),transparent 34%),radial-gradient(circle at top left,rgba(240,195,127,.12),transparent 28%),linear-gradient(135deg,#1c1e27 0%,#11131a 62%,#0d0f14 100%);overflow:hidden;}' +
      '.hero__grid{position:relative;display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px;min-height:118px;}' +
      '.hero__title-block{display:grid;gap:8px;justify-items:end;text-align:right;z-index:1;}' +
      '.hero__report-kicker{font-size:15px;color:#f0c37f;font-weight:800;letter-spacing:.06em;}' +
      '.hero__report-title{font-size:30px;line-height:1.1;font-weight:900;letter-spacing:-.5px;}' +
      '.hero__report-date{font-size:14px;color:#d8dbe3;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);}' +
      '.hero__logo-mark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-family:"Manrope","Cairo",sans-serif;font-size:62px;font-weight:900;letter-spacing:8px;background:linear-gradient(180deg,#fff8e3 0%,#f5d99a 24%,#d49a37 49%,#fff1c6 68%,#8e5a11 100%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 1px 0 rgba(255,255,255,.35),0 10px 28px rgba(0,0,0,.34),0 0 18px rgba(212,154,55,.22);filter:drop-shadow(0 6px 12px rgba(0,0,0,.18));z-index:1;}' +
      '.hero__glow{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:380px;height:140px;border-radius:999px;background:radial-gradient(circle,rgba(243,198,126,.2) 0%,rgba(243,198,126,.06) 42%,transparent 75%);filter:blur(10px);pointer-events:none;}' +
      '.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:18px 18px 12px;}' +
      '.metric-card,.panel{border-radius:20px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);}' +
      '.metric-card{padding:16px 18px;}' +
      '.metric-card__title{font-size:13px;color:#c2c5d0;margin-bottom:8px;}' +
      '.metric-card__value{font-size:28px;font-weight:900;line-height:1.2;}' +
      '.num{font-family:"Manrope","Segoe UI",Tahoma,sans-serif;font-variant-numeric:tabular-nums lining-nums;font-feature-settings:"tnum" 1, "lnum" 1;letter-spacing:.03em;font-weight:800;}' +
      '.money-unit{font-size:.8em;color:#d8dbe3;}' +
      '.content{display:grid;grid-template-columns:1.05fr .95fr;gap:12px;padding:12px 18px 18px;}' +
      '.stack{display:grid;gap:12px;}' +
      '.panel{padding:16px;}' +
      '.panel h3{margin:0 0 12px;font-size:17px;}' +
      '.panel__subline{margin:-4px 0 14px;color:#d4d7df;font-size:13px;}' +
      '.panel--wide{grid-column:1 / -1;}' +
      '.analysis-graph{display:grid;gap:14px;}' +
      '.analysis-graph__item{display:grid;gap:8px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.04);}' +
      '.analysis-graph__meta{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:#f7f8fb;}' +
      '.analysis-graph__bars{display:grid;gap:8px;}' +
      '.analysis-graph__track{height:13px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.25);}' +
      '.analysis-graph__fill{height:100%;border-radius:inherit;box-shadow:0 4px 10px rgba(0,0,0,.18), inset 0 1px 1px rgba(255,255,255,.16);}' +
      '.analysis-graph__fill--revenue{background:linear-gradient(90deg,#f285aa,#b53967);}' +
      '.analysis-graph__fill--expense{background:linear-gradient(90deg,#ffd774,#c48a10);}' +
      '.analysis-graph__legend{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;font-size:13px;color:#d4d7df;}' +
      'table{width:100%;border-collapse:collapse;font-size:13px;}' +
      'th,td{padding:9px 8px;border-bottom:1px solid rgba(255,255,255,.07);text-align:right;vertical-align:top;}' +
      'th{color:#f0c37f;font-size:12px;white-space:nowrap;}' +
      '.project-name-ar{font-size:14px;font-weight:800;color:#f8f9fd;}' +
      '.project-name-en{font-size:11px;color:#adb2bd;font-weight:500;margin-top:3px;direction:ltr;text-align:right;}' +
      '.table-total-row td{background:rgba(240,195,127,.1);border-top:1px solid rgba(240,195,127,.24);font-weight:900;color:#fff7e6;}' +
      '.empty{padding:16px 0;color:#a5a9b3;}' +
      '@media (max-width:920px){.metrics,.content{grid-template-columns:1fr}.hero__grid{grid-template-columns:1fr;justify-items:center}.hero__title-block{justify-items:center;text-align:center}.hero__logo-mark{position:relative;left:auto;top:auto;transform:none;order:-1;font-size:44px}.hero__glow{width:240px;height:100px}}' +
      '@media print{body{padding:0;background:#fff;color:#111}.shell{border:0;box-shadow:none;border-radius:0}.metric-card,.panel{break-inside:avoid}}' +
    '</style></head><body><div class="shell">' +
      '<section class="hero">' +
        '<div class="hero__grid">' +
          '<div class="hero__title-block"><div class="hero__report-kicker">التقرير التنفيذي</div><div class="hero__report-title">الملخص اليومي والتحليل</div><div class="hero__report-date">' + esc(report.generatedAtDisplay || summary.generatedAt || report.generatedAt) + '</div></div>' +
          '<div class="hero__logo-mark" aria-label="NIJJARA">NIJJARA</div>' +
          '<div class="hero__glow"></div>' +
        '</div>' +
      '</section>' +
      '<section class="metrics">' +
        metricCard('إجمالي المصروفات منذ بداية السنة', money(summary.expensesYtdAmount || 0)) +
        metricCard('إجمالي الإيرادات منذ بداية السنة', money(summary.revenueYtdAmount || 0)) +
        metricCard('عدد المشاريع النشطة', count(summary.activeProjects || 0)) +
      '</section>' +
      '<section class="content">' +
        '<div class="stack">' +
          custodyTable(report.sections.custodyBalances) +
        '</div>' +
        '<div class="stack">' +
          analysisSection(report.sections.entitySummary) +
        '</div>' +
        pendingProjectsTable(report.sections.activeProjectsPending) +
      '</section>' +
    '</div></body></html>';
}

function nijjaraBuildExecutiveReportPdfBlob_(report) {
  var doc = DocumentApp.create(report.fileName.replace(/\.pdf$/i, ''));
  var body = doc.getBody();
  body.setAttributes({});
  var defaultTextAttributes = {};
  defaultTextAttributes[DocumentApp.Attribute.FONT_FAMILY] = 'Cairo';
  defaultTextAttributes[DocumentApp.Attribute.FONT_SIZE] = 11;
  body.editAsText().setAttributes(defaultTextAttributes);
  body.appendParagraph('التقرير التنفيذي اليومي').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('تاريخ الإنشاء: ' + (report.generatedAtDisplay || report.generatedAt || '—'));
  body.appendParagraph('أُعد بواسطة: ' + (report.generatedBy || '—'));
  body.appendParagraph(' ');

  body.appendParagraph('المؤشرات الرئيسية').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendTable([
    ['البند', 'القيمة'],
    ['إجمالي المصروفات منذ بداية السنة', (Number(report.summary.expensesYtdAmount || 0) || 0).toLocaleString('ar-EG') + ' ج.م'],
    ['إجمالي الإيرادات منذ بداية السنة', (Number(report.summary.revenueYtdAmount || 0) || 0).toLocaleString('ar-EG') + ' ج.م'],
    ['عدد المشاريع النشطة', (Number(report.summary.activeProjects || 0) || 0).toLocaleString('ar-EG')]
  ]);

  body.appendParagraph(' ');
  body.appendParagraph('الإيرادات حسب القنوات').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendTable([['القناة', 'عدد السجلات', 'الإجمالي']].concat((report.sections.revenueByChannel || []).map(function (row) {
    return [row.label || '—', String(row.count || 0), (Number(row.amount || 0) || 0).toLocaleString('ar-EG') + ' ج.م'];
  })));

  body.appendParagraph(' ');
  body.appendParagraph('المصروفات حسب القنوات').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendTable([['القناة', 'عدد السجلات', 'الإجمالي']].concat((report.sections.expensesByChannel || []).map(function (row) {
    return [row.label || '—', String(row.count || 0), (Number(row.amount || 0) || 0).toLocaleString('ar-EG') + ' ج.م'];
  })));

  body.appendParagraph(' ');
  body.appendParagraph('المشاريع النشطة ذات المبالغ غير المحصلة').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendTable([['المشروع', 'تاريخ البدء', 'الميزانية', 'المصروفات', 'عدد الدفعات', 'المستلم', 'المتبقي']].concat((report.sections.activeProjectsPending || []).map(function (row) {
    return [
      row.projectName || '—',
      row.startDate || '—',
      (Number(row.budget || 0) || 0).toLocaleString('ar-EG') + ' ج.م',
      (Number(row.totalExpenses || 0) || 0).toLocaleString('ar-EG') + ' ج.م',
      String(row.paymentsCount || 0),
      (Number(row.received || 0) || 0).toLocaleString('ar-EG') + ' ج.م',
      (Number(row.remaining || 0) || 0).toLocaleString('ar-EG') + ' ج.م'
    ];
  })));

  body.appendParagraph(' ');
  body.appendParagraph('أرصدة العهد الحالية').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendTable([['الحساب', 'الرصيد الحالي']].concat((report.sections.custodyBalances || []).map(function (row) {
    return [row.label || '—', (Number(row.amount || 0) || 0).toLocaleString('ar-EG') + ' ج.م'];
  })));

  doc.saveAndClose();
  var file = DriveApp.getFileById(doc.getId());
  var pdfBlob = file.getAs(MimeType.PDF).setName(report.fileName || ('Nijjara_DailyReport_' + nijjaraNow_() + '.pdf'));
  file.setTrashed(true);
  return pdfBlob;
}

var NIJJARA_SPREADSHEET_CACHE_ = null;
var NIJJARA_SHEET_CACHE_ = {};
var NIJJARA_HEADERS_CACHE_ = {};
var NIJJARA_ROWS_CACHE_ = {};

function nijjaraOpenSpreadsheet_() {
  if (!NIJJARA_SPREADSHEET_CACHE_) {
    NIJJARA_SPREADSHEET_CACHE_ = SpreadsheetApp.openById(NIJJARA_CONFIG.spreadsheetId);
  }
  return NIJJARA_SPREADSHEET_CACHE_;
}

function nijjaraSheet_(name) {
  if (!NIJJARA_SHEET_CACHE_[name]) {
    var spreadsheet = nijjaraOpenSpreadsheet_();
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      var aliases = {
        SET_Enums: ['SYS_Enum', 'SYS_Enums', 'SET_Enum']
      };
      (aliases[name] || []).some(function (alias) {
        sheet = spreadsheet.getSheetByName(alias);
        return !!sheet;
      });
    }
    NIJJARA_SHEET_CACHE_[name] = sheet;
  }
  return NIJJARA_SHEET_CACHE_[name];
}

function nijjaraEnsureSheetWithHeaders_(sheetName, headers) {
  var spreadsheet = nijjaraOpenSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  var currentHeaders = nijjaraHeaders_(sheet);
  if (!currentHeaders.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    NIJJARA_HEADERS_CACHE_[sheetName] = headers.slice();
  }
  NIJJARA_SHEET_CACHE_[sheetName] = sheet;
  NIJJARA_ROWS_CACHE_[sheetName] = null;
  return sheet;
}

function nijjaraEnsureSheetHeaders_(sheetName, requiredHeaders) {
  requiredHeaders = Array.isArray(requiredHeaders) ? requiredHeaders.filter(Boolean) : [];
  if (!requiredHeaders.length) return nijjaraSheet_(sheetName);
  var sheet = nijjaraSheet_(sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + sheetName);
  var headers = nijjaraHeaders_(sheet).slice();
  var missing = requiredHeaders.filter(function (header) {
    return headers.indexOf(header) === -1;
  });
  if (!missing.length) return sheet;
  var startColumn = headers.length + 1;
  sheet.insertColumnsAfter(headers.length || 1, missing.length);
  sheet.getRange(1, startColumn, 1, missing.length).setValues([missing]);
  NIJJARA_HEADERS_CACHE_[sheetName] = headers.concat(missing);
  NIJJARA_ROWS_CACHE_[sheetName] = null;
  return sheet;
}

function nijjaraHeaders_(sheet) {
  if (!sheet || sheet.getLastColumn() === 0) return [];
  var sheetName = sheet.getName();
  if (!NIJJARA_HEADERS_CACHE_[sheetName]) {
    NIJJARA_HEADERS_CACHE_[sheetName] = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }
  return NIJJARA_HEADERS_CACHE_[sheetName];
}

function nijjaraRows_(sheetName) {
  if (NIJJARA_ROWS_CACHE_[sheetName]) {
    return NIJJARA_ROWS_CACHE_[sheetName];
  }
  var sheet = nijjaraSheet_(sheetName);
  if (!sheet) return [];
  var headers = nijjaraHeaders_(sheet);
  if (sheet.getLastRow() < 2 || headers.length === 0) return [];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  NIJJARA_ROWS_CACHE_[sheetName] = values.map(function (row, rowIndex) {
    var item = { __row: rowIndex + 2 };
    headers.forEach(function (header, index) {
      item[header] = row[index];
    });
    return item;
  });
  return NIJJARA_ROWS_CACHE_[sheetName];
}

function nijjaraAppendRow_(sheetName, record) {
  var sheet = nijjaraSheet_(sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + sheetName);
  var headers = nijjaraHeaders_(sheet);
  var row = headers.map(function (header) {
    return record[header] !== undefined ? record[header] : '';
  });
  var rowNumber = sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
  NIJJARA_ROWS_CACHE_[sheetName] = null;
  return rowNumber;
}

function nijjaraFindOne_(sheetName, predicate) {
  var rows = nijjaraRows_(sheetName);
  for (var index = 0; index < rows.length; index += 1) {
    if (predicate(rows[index])) return rows[index];
  }
  return null;
}

function nijjaraFindMany_(sheetName, predicate) {
  return nijjaraRows_(sheetName).filter(predicate);
}

function nijjaraUpdateByRow_(sheetName, rowNumber, patch) {
  var sheet = nijjaraSheet_(sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + sheetName);
  var headers = nijjaraHeaders_(sheet);
  if (!headers.length) return;
  var rows = NIJJARA_ROWS_CACHE_[sheetName] || null;
  var cachedRow = rows ? rows.filter(function (row) { return Number(row.__row || 0) === Number(rowNumber || 0); })[0] : null;
  var range = sheet.getRange(rowNumber, 1, 1, headers.length);
  var current = cachedRow
    ? headers.map(function (header) { return cachedRow[header]; })
    : range.getValues()[0];
  var changed = false;
  headers.forEach(function (header, index) {
    if (!Object.prototype.hasOwnProperty.call(patch, header)) return;
    current[index] = patch[header];
    changed = true;
  });
  if (changed) {
    range.setValues([current]);
  }
  NIJJARA_ROWS_CACHE_[sheetName] = null;
}

function nijjaraDeleteRows_(sheetName, predicate) {
  var sheet = nijjaraSheet_(sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + sheetName);
  var rows = nijjaraRows_(sheetName);
  var rowNumbers = rows
    .filter(predicate)
    .map(function (row) { return Number(row.__row || 0); })
    .filter(function (rowNumber) { return rowNumber > 1; })
    .sort(function (left, right) { return right - left; });

  rowNumbers.forEach(function (rowNumber) {
    sheet.deleteRow(rowNumber);
  });
  if (rowNumbers.length) {
    NIJJARA_ROWS_CACHE_[sheetName] = null;
  }
}

function nijjaraHashPassword_(salt, password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + '|' + password,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    var value = b < 0 ? b + 256 : b;
    var hex = value.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function nijjaraRandomId_(prefix) {
  return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
}

function nijjaraNow_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Africa/Cairo', "yyyy-MM-dd'T'HH:mm:ss");
}

function nijjaraAttachmentRootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var cachedId = props.getProperty('NIJJARA_ATTACHMENT_ROOT_FOLDER_ID');
  if (cachedId) {
    try {
      return DriveApp.getFolderById(cachedId);
    } catch (error) {}
  }

  var spreadsheetFile = DriveApp.getFileById(NIJJARA_CONFIG.spreadsheetId);
  var parents = spreadsheetFile.getParents();
  var parentFolder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var folders = parentFolder.getFoldersByName('NIJJARA ERP Attachments');
  var folder = folders.hasNext() ? folders.next() : parentFolder.createFolder('NIJJARA ERP Attachments');
  props.setProperty('NIJJARA_ATTACHMENT_ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function nijjaraAttachmentRecordFolder_(moduleCode, subModuleCode, recordId) {
  var root = nijjaraAttachmentRootFolder_();
  var moduleName = [moduleCode || 'SYS', subModuleCode || 'GENERAL'].join('_');
  var moduleFolders = root.getFoldersByName(moduleName);
  var moduleFolder = moduleFolders.hasNext() ? moduleFolders.next() : root.createFolder(moduleName);
  var recordFolders = moduleFolder.getFoldersByName(String(recordId || 'UNASSIGNED'));
  return recordFolders.hasNext() ? recordFolders.next() : moduleFolder.createFolder(String(recordId || 'UNASSIGNED'));
}

function nijjaraNormalizeAttachmentPayload_(items) {
  if (!items) return [];
  return items.filter(function (item) {
    return item && item.name && item.base64;
  }).map(function (item) {
    return {
      name: String(item.name || 'attachment'),
      mimeType: String(item.mimeType || 'application/octet-stream'),
      size: Number(item.size || 0) || 0,
      base64: String(item.base64 || '')
    };
  });
}

function nijjaraListRecordAttachments_(moduleCode, subModuleCode, recordId) {
  return nijjaraFindMany_('SYS_Attachments', function (row) {
    return String(row.Module_Code || '') === String(moduleCode || '') &&
      String(row.SubModule_Code || '') === String(subModuleCode || '') &&
      String(row.Source_Record_ID || '') === String(recordId || '') &&
      String(row.Is_Active).toLowerCase() !== 'false';
  }).sort(function (left, right) {
    return String(right.Uploaded_At || '').localeCompare(String(left.Uploaded_At || ''));
  }).map(function (row) {
    return {
      id: row.Attachment_ID,
      name: row.File_Name || '',
      url: row.File_URL || '',
      mimeType: row.File_MimeType || '',
      size: Number(row.File_Size_Bytes || 0) || 0,
      uploadedAt: row.Uploaded_At || ''
    };
  });
}

function nijjaraSaveRecordAttachments_(moduleCode, subModuleCode, recordId, attachments, session) {
  var normalized = nijjaraNormalizeAttachmentPayload_(attachments);
  if (!normalized.length) {
    return nijjaraListRecordAttachments_(moduleCode, subModuleCode, recordId);
  }

  var folder = nijjaraAttachmentRecordFolder_(moduleCode, subModuleCode, recordId);
  normalized.forEach(function (item) {
    var bytes = Utilities.base64Decode(item.base64);
    var blob = Utilities.newBlob(bytes, item.mimeType, item.name);
    var file = folder.createFile(blob);
    nijjaraAppendRow_('SYS_Attachments', {
      Attachment_ID: nijjaraRandomId_('ATT-'),
      Module_Code: moduleCode || '',
      SubModule_Code: subModuleCode || '',
      Source_Record_ID: recordId || '',
      File_Name: file.getName(),
      File_URL: file.getUrl(),
      File_MimeType: item.mimeType || blob.getContentType() || 'application/octet-stream',
      File_Size_Bytes: item.size || bytes.length,
      Uploaded_By: session && session.userId ? session.userId : '',
      Uploaded_At: nijjaraNow_(),
      Is_Active: true,
      Notes: ''
    });
  });

  return nijjaraListRecordAttachments_(moduleCode, subModuleCode, recordId);
}

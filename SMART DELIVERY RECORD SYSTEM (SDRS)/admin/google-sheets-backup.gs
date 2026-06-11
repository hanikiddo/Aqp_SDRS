// Google Apps Script for SDRS backup and restore
// Deploy as Web App and use the exec URL in admin/index.html

function doGet(e) {
  const action = e.parameter.action;
  const sheetId = e.parameter.sheetId;
  const tabName = e.parameter.tabName || 'SDRS_Backup';

  if (!sheetId || !action) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Missing parameters' }))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);

  if (action === 'restore') {
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: [] }))
                           .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = values[0];
    const data = values.slice(1).map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      return item;
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data }))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unsupported action' }))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || '{}');
  const action = payload.action;
  const sheetId = payload.sheetId;
  const tabName = payload.tabName || 'SDRS_Backup';
  const data = payload.data || [];

  if (!sheetId || !action || !Array.isArray(data)) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Missing or invalid payload' }))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
  sheet.clear();

  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    const rows = data.map(order => headers.map(header => order[header]));
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Backup completed' }))
                       .setMimeType(ContentService.MimeType.JSON);
}

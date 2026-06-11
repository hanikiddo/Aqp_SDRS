# Google Sheets Backup Setup for SDRS

This file shows the Google Apps Script endpoint you can deploy so the Admin dashboard can back up and restore orders to Google Sheets.

## 1. Create a new Google Apps Script
1. Open https://script.google.com/
2. Create a new script project.
3. Replace the default code with the script below.

```javascript
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
```

## 2. Deploy as Web App
1. Click **Deploy > New deployment**.
2. Select **Web app**.
3. Set **Execute as** to `Me`.
4. Set **Who has access** to `Anyone` or `Anyone with the link`.
5. Copy the web app URL.

## 3. Update Admin Dashboard Constants
In `admin/index.html`, replace these placeholders:
- `YOUR_SCRIPT_ID` with the web app ID from the URL
- `YOUR_SPREADSHEET_ID` with your Google Sheet ID

Example URL:
`https://script.google.com/macros/s/AKfycbx.../exec`

## 4. Use the Buttons
- `Cloud Backup` will write current orders to the sheet.
- `Restore Cloud` will fetch orders back from the sheet and refresh the dashboard.

## Notes
- The current implementation writes the order objects as raw JSON rows.
- If your order objects include nested arrays or objects, the sheet will store them as JSON strings.
- For more advanced restoration, you can normalize fields in the Apps Script or add a secondary restore endpoint.

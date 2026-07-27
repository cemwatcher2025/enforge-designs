const SPREADSHEET_ID = '16zzWBhLuOqLFp5yC2KcHH2PMfc1qgZRDmoBPImGhTdw';
const SHEET_NAME = 'Usage Log';

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function parsePayload(event) {
  if (!event || !event.postData || !event.postData.contents) return {};

  try {
    return JSON.parse(event.postData.contents);
  } catch (error) {
    return {};
  }
}

function normalizeSuccess(value) {
  if (value === true) return 'success';
  if (value === false) return 'failure';
  if (typeof value === 'string') return value;
  return 'unknown';
}

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'Enforge usage log webhook',
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
  });
}

function doPost(event) {
  const payload = parsePayload(event);
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getSheets()[0];

  const row = [
    payload.timestamp || new Date().toISOString(),
    payload.service || payload.apiService || payload['API/service called'] || 'Unknown service',
    payload.purpose || payload['Purpose of call'] || 'Unspecified purpose',
    payload.cost || payload['Cost (if applicable)'] || '',
    normalizeSuccess(payload.success ?? payload.status ?? payload['Success/failure']),
  ];

  sheet.appendRow(row);

  return jsonResponse({
    ok: true,
    appended: row,
  });
}

// ═══════════════════════════════════════════════════════
//  Axelliant Lead Intelligence — Google Apps Script
//
//  DEPLOY STEPS:
//  1. Open your Google Sheet → Extensions → Apps Script
//  2. Delete any existing code, paste this entire file
//  3. Click Deploy → New deployment
//  4. Type: Web app
//  5. Execute as: Me
//  6. Who has access: Anyone
//  7. Click Deploy → copy the Web App URL
//  8. Paste that URL into Settings → Apps Script URL in the dashboard
// ═══════════════════════════════════════════════════════

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'getLeads';

  try {
    if (action === 'getLeads')        return getLeads();
    if (action === 'assignIds')       return assignIds();
    if (action === 'updatePipeline')  return updatePipeline(e.parameter);
    return jsonOk({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOk({ ok: false, error: err.message });
  }
}

// ── Read all leads from the Leads tab ──────────────────
function getLeads() {
  const sheet  = getLeadsSheet();
  const data   = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonOk({ ok: true, leads: [] });

  const headers = data[0].map(h => String(h).trim());
  const leads   = data.slice(1)
    .filter(row => row.some(cell => String(cell).trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
      return obj;
    });

  return jsonOk({ ok: true, leads });
}

// ── Write stable IDs back to any row with blank id column ──
function assignIds() {
  const sheet   = getLeadsSheet();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idCol   = headers.indexOf('id');
  const nameCol = headers.indexOf('name');
  const coCol   = headers.indexOf('company_name');

  if (idCol === -1) return jsonOk({ ok: false, error: 'No "id" column found in Leads sheet' });

  let assigned = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.every(c => String(c).trim() === '')) continue; // skip blank rows
    if (!String(row[idCol]).trim()) {
      const name    = String(row[nameCol] || '');
      const company = String(row[coCol]   || '');
      const id = slugId(name, company, i);
      sheet.getRange(i + 1, idCol + 1).setValue(id);
      data[i][idCol] = id; // update in-memory so dupes don't happen
      assigned++;
    }
  }

  return jsonOk({ ok: true, assigned });
}

// ── Append a pipeline stage event to the Pipeline tab ──
function updatePipeline(params) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName('Pipeline');

  if (!sheet) {
    sheet = ss.insertSheet('Pipeline');
    sheet.appendRow(['id', 'lead_id', 'stage', 'status', 'timestamp', 'notes']);
    sheet.setFrozenRows(1);
  }

  const rowId = 'pl_' + new Date().getTime();
  sheet.appendRow([
    rowId,
    params.leadId    || '',
    params.stage     || '',
    params.status    || '',
    params.timestamp || new Date().toISOString(),
    params.notes     || '',
  ]);

  return jsonOk({ ok: true, rowId });
}

// ── Helpers ────────────────────────────────────────────
function getLeadsSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Leads') || ss.getSheets()[0];
  if (!sheet) throw new Error('No sheet found');
  return sheet;
}

function slugId(name, company, rowIndex) {
  const base = (name + '_' + company).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return 'gs_' + (base || 'row_' + rowIndex).slice(0, 48);
}

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

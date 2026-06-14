// ═══════════════════════════════════════════════════════
//  Axelliant Lead Intelligence — Google Apps Script
//
//  DEPLOY STEPS:
//  1. Open your Google Sheet → Extensions → Apps Script
//  2. Delete any existing code, paste this entire file
//  3. Click Deploy → New deployment
//     (or Manage deployments → edit → New version to redeploy)
//  4. Type: Web app  |  Execute as: Me  |  Access: Anyone
//  5. Copy the Web App URL → paste into dashboard Settings → Apps Script URL
// ═══════════════════════════════════════════════════════

// Pipeline tab: one row per lead, one column per stage timestamp
var PIPELINE_HEADERS = [
  'lead_id',           // A — matches Leads.id
  'lead_name',         // B — denormalised for readability
  'conn_sent_at',      // C
  'conn_accepted_at',  // D
  'msg1_sent_at',      // E
  'msg1_replied_at',   // F
  'msg2_sent_at',      // G
  'msg2_replied_at',   // H
  'msg3_sent_at',      // I
  'msg3_replied_at',   // J
  'last_updated',      // K
];

// Map stage key → column header name
var STAGE_COL = {
  conn_sent:      'conn_sent_at',
  conn_accepted:  'conn_accepted_at',
  msg1_sent:      'msg1_sent_at',
  msg1_replied:   'msg1_replied_at',
  msg2_sent:      'msg2_sent_at',
  msg2_replied:   'msg2_replied_at',
  msg3_sent:      'msg3_sent_at',
  msg3_replied:   'msg3_replied_at',
};

function doGet(e) {
  var action = (e.parameter && e.parameter.action) || 'getLeads';
  try {
    if (action === 'getLeads')       return getLeads();
    if (action === 'assignIds')      return assignIds();
    if (action === 'updatePipeline') return updatePipeline(e.parameter);
    return jsonOk({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOk({ ok: false, error: err.message });
  }
}

// ── Read all leads from the Leads tab ─────────────────────────────
function getLeads() {
  var sheet = getLeadsSheet();
  var data  = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonOk({ ok: true, leads: [] });

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var leads = data.slice(1)
    .filter(function(row) { return row.some(function(c) { return String(c).trim() !== ''; }); })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
      return obj;
    });
  return jsonOk({ ok: true, leads: leads });
}

// ── Write stable IDs into blank id cells in the Leads tab ────────
function assignIds() {
  var sheet   = getLeadsSheet();
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idCol   = headers.indexOf('id');
  var nameCol = headers.indexOf('name');
  var coCol   = headers.indexOf('company_name');

  if (idCol === -1) return jsonOk({ ok: false, error: 'No "id" column in Leads sheet' });

  var assigned = 0;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row.every(function(c) { return String(c).trim() === ''; })) continue;
    if (!String(row[idCol]).trim()) {
      var id = slugId(String(row[nameCol] || ''), String(row[coCol] || ''), i);
      sheet.getRange(i + 1, idCol + 1).setValue(id);
      data[i][idCol] = id;
      assigned++;
    }
  }
  return jsonOk({ ok: true, assigned: assigned });
}

// ── Upsert pipeline row: one row per lead, timestamp per stage ────
//
//  params: leadId, leadName, stage, status, timestamp
//
//  • Finds row where col A = leadId
//  • If status === 'done'    → writes timestamp into the stage column
//  • If status !== 'done'    → clears that stage column (toggled back)
//  • Always updates last_updated (col K)
//  • Creates the row if it doesn't exist yet
function updatePipeline(params) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Pipeline');

  if (!sheet) {
    sheet = ss.insertSheet('Pipeline');
    var hdrRange = sheet.getRange(1, 1, 1, PIPELINE_HEADERS.length);
    hdrRange.setValues([PIPELINE_HEADERS]);
    hdrRange.setFontWeight('bold').setBackground('#4F46E5').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 160);
    for (var c = 3; c <= PIPELINE_HEADERS.length; c++) sheet.setColumnWidth(c, 160);
  }

  var leadId   = params.leadId   || '';
  var leadName = params.leadName || '';
  var stage    = params.stage    || '';
  var status   = params.status   || 'pending';
  var ts       = params.timestamp || new Date().toISOString();

  var stageColName = STAGE_COL[stage];
  if (!stageColName) return jsonOk({ ok: false, error: 'Unknown stage: ' + stage });

  var headers     = PIPELINE_HEADERS;
  var stageColIdx = headers.indexOf(stageColName) + 1; // 1-based
  var lastUpdCol  = headers.indexOf('last_updated') + 1;

  // Find existing row for this lead
  var data     = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === leadId) { foundRow = i + 1; break; }
  }

  if (foundRow === -1) {
    // ── INSERT: build a blank row then fill in the known fields ──
    var newRow = PIPELINE_HEADERS.map(function() { return ''; });
    newRow[0] = leadId;
    newRow[1] = leadName;
    newRow[headers.indexOf('last_updated')] = ts;
    if (status === 'done') newRow[headers.indexOf(stageColName)] = ts;
    sheet.appendRow(newRow);
  } else {
    // ── UPDATE: write into the specific stage column ──
    // Update lead_name if it was blank (first time we have the name)
    if (leadName && !String(data[foundRow - 1][1]).trim()) {
      sheet.getRange(foundRow, 2).setValue(leadName);
    }
    // Write or clear the stage timestamp
    sheet.getRange(foundRow, stageColIdx).setValue(status === 'done' ? ts : '');
    // Always bump last_updated
    sheet.getRange(foundRow, lastUpdCol).setValue(ts);
  }

  return jsonOk({ ok: true, leadId: leadId, stage: stage, status: status });
}

// ── Helpers ───────────────────────────────────────────────────────
function getLeadsSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leads') || ss.getSheets()[0];
  if (!sheet) throw new Error('No sheet found');
  return sheet;
}

function slugId(name, company, rowIndex) {
  var base = (name + '_' + company).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/, '');
  return 'gs_' + (base || 'row_' + rowIndex).slice(0, 48);
}

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

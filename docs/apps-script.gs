// ═══════════════════════════════════════════════════════
//  Axelliant Lead Intelligence — Google Apps Script
//
//  DEPLOY STEPS:
//  1. Open your Google Sheet → Extensions → Apps Script
//  2. Delete any existing code, paste this entire file
//  3. Deploy → Manage deployments → edit → New version → Deploy
//     (your existing URL stays the same)
// ═══════════════════════════════════════════════════════

// ── Pipeline tab — one row per lead, one timestamp column per stage ─
var PIPELINE_HEADERS = [
  'lead_id',           // A
  'lead_name',         // B
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

var STAGE_TO_COL = {
  conn_sent:     'conn_sent_at',
  conn_accepted: 'conn_accepted_at',
  msg1_sent:     'msg1_sent_at',
  msg1_replied:  'msg1_replied_at',
  msg2_sent:     'msg2_sent_at',
  msg2_replied:  'msg2_replied_at',
  msg3_sent:     'msg3_sent_at',
  msg3_replied:  'msg3_replied_at',
};

// ── Messages tab — one row per lead, one column per message ─────────
// system_prompt stored once per lead (updated on every generate call)
var MESSAGES_HEADERS = [
  'lead_id',              // A
  'lead_name',            // B
  'system_prompt',        // C — the prompt template used
  'connection_note',      // D — connection request (≤300 chars)
  'connection_sent_at',   // E
  'msg1',                 // F — 1st message after connection accepted
  'msg1_sent_at',         // G
  'msg2',                 // H — follow-up 1
  'msg2_sent_at',         // I
  'msg3',                 // J — follow-up 2
  'msg3_sent_at',         // K
  'last_updated',         // L
];

// Map the colName param → which column header to write into
var MSG_CONTENT_COLS = {
  connection_note: 'connection_note',
  msg1:            'msg1',
  msg2:            'msg2',
  msg3:            'msg3',
};
var MSG_SENT_COLS = {
  connection_note: 'connection_sent_at',
  msg1:            'msg1_sent_at',
  msg2:            'msg2_sent_at',
  msg3:            'msg3_sent_at',
};

// ─────────────────────────────────────────────────────────────────
function doGet(e) {
  var action = (e.parameter && e.parameter.action) || 'getLeads';
  try {
    if (action === 'getLeads')       return getLeads();
    if (action === 'assignIds')      return assignIds();
    if (action === 'updatePipeline') return updatePipeline(e.parameter);
    if (action === 'updateMessage')  return updateMessage(e.parameter);
    return jsonOk({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOk({ ok: false, error: err.message });
  }
}

// ── Read all leads ────────────────────────────────────────────────
function getLeads() {
  var sheet = getLeadsSheet();
  var data  = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonOk({ ok: true, leads: [] });

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var leads = data.slice(1)
    .filter(function(row) {
      return row.some(function(c) { return String(c).trim() !== ''; });
    })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) {
        obj[h] = row[i] !== undefined ? String(row[i]) : '';
      });
      return obj;
    });
  return jsonOk({ ok: true, leads: leads });
}

// ── Auto-assign IDs to blank id cells ────────────────────────────
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

// ── Upsert pipeline: one row per lead, timestamp per stage ────────
//   params: leadId, leadName, stage, status, timestamp
function updatePipeline(params) {
  var sheet = getOrCreateSheet('Pipeline', PIPELINE_HEADERS, '#4F46E5');

  var leadId      = params.leadId    || '';
  var leadName    = params.leadName  || '';
  var stage       = params.stage     || '';
  var status      = params.status    || 'pending';
  var ts          = params.timestamp || new Date().toISOString();
  var stageColKey = STAGE_TO_COL[stage];

  if (!stageColKey) return jsonOk({ ok: false, error: 'Unknown stage: ' + stage });

  var stageColIdx = PIPELINE_HEADERS.indexOf(stageColKey) + 1;
  var lastUpdIdx  = PIPELINE_HEADERS.indexOf('last_updated') + 1;
  var foundRow    = findRowByLeadId(sheet, leadId);

  if (foundRow === -1) {
    var newRow = PIPELINE_HEADERS.map(function() { return ''; });
    newRow[0] = leadId;
    newRow[1] = leadName;
    newRow[PIPELINE_HEADERS.indexOf('last_updated')] = ts;
    if (status === 'done') newRow[PIPELINE_HEADERS.indexOf(stageColKey)] = ts;
    sheet.appendRow(newRow);
  } else {
    if (leadName && !String(sheet.getRange(foundRow, 2).getValue()).trim()) {
      sheet.getRange(foundRow, 2).setValue(leadName);
    }
    sheet.getRange(foundRow, stageColIdx).setValue(status === 'done' ? ts : '');
    sheet.getRange(foundRow, lastUpdIdx).setValue(ts);
  }

  return jsonOk({ ok: true, leadId: leadId, stage: stage, status: status });
}

// ── Upsert one message column at a time ───────────────────────────
//   params: leadId, leadName, colName, content, systemPrompt,
//           sentAt, last_updated
//
//   colName is one of: connection_note | msg1 | msg2 | msg3
//   content = the generated message text
//   sentAt  = timestamp if marking sent, else blank
function updateMessage(params) {
  var sheet = getOrCreateSheet('Messages', MESSAGES_HEADERS, '#059669');

  var leadId       = params.leadId       || '';
  var leadName     = params.leadName     || '';
  var colName      = params.colName      || '';
  var content      = params.content      || '';
  var systemPrompt = params.systemPrompt || '';
  var sentAt       = params.sentAt       || '';
  var now          = params.last_updated || new Date().toISOString();

  if (!MSG_CONTENT_COLS[colName]) {
    return jsonOk({ ok: false, error: 'Unknown colName: ' + colName });
  }

  var contentColIdx = MESSAGES_HEADERS.indexOf(MSG_CONTENT_COLS[colName]) + 1;
  var sentColIdx    = MESSAGES_HEADERS.indexOf(MSG_SENT_COLS[colName])    + 1;
  var promptColIdx  = MESSAGES_HEADERS.indexOf('system_prompt')           + 1;
  var lastUpdIdx    = MESSAGES_HEADERS.indexOf('last_updated')            + 1;

  var foundRow = findRowByLeadId(sheet, leadId);

  if (foundRow === -1) {
    // Create a fresh row with only the known fields populated
    var newRow = MESSAGES_HEADERS.map(function() { return ''; });
    newRow[0] = leadId;
    newRow[1] = leadName;
    newRow[promptColIdx  - 1] = systemPrompt;
    newRow[contentColIdx - 1] = content;
    newRow[sentColIdx    - 1] = sentAt;
    newRow[lastUpdIdx    - 1] = now;
    sheet.appendRow(newRow);
  } else {
    // Update lead_name if blank
    if (leadName && !String(sheet.getRange(foundRow, 2).getValue()).trim()) {
      sheet.getRange(foundRow, 2).setValue(leadName);
    }
    // Always update system_prompt (reflects the latest prompt used)
    if (systemPrompt) sheet.getRange(foundRow, promptColIdx).setValue(systemPrompt);
    // Write message content (only overwrite if non-empty)
    if (content) sheet.getRange(foundRow, contentColIdx).setValue(content);
    // Write sent timestamp (always — empty string clears it if needed)
    if (sentAt) sheet.getRange(foundRow, sentColIdx).setValue(sentAt);
    // Bump last_updated
    sheet.getRange(foundRow, lastUpdIdx).setValue(now);
  }

  return jsonOk({ ok: true, leadId: leadId, colName: colName });
}

// ── Helpers ───────────────────────────────────────────────────────
function getOrCreateSheet(name, headers, color) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var r = sheet.getRange(1, 1, 1, headers.length);
    r.setValues([headers]);
    r.setFontWeight('bold').setBackground(color || '#4F46E5').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 220);
    sheet.setColumnWidth(2, 160);
    // Wider columns for message content
    for (var c = 3; c <= headers.length; c++) {
      sheet.setColumnWidth(c, name === 'Messages' ? 300 : 170);
    }
  }
  return sheet;
}

function findRowByLeadId(sheet, leadId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === leadId) return i + 1;
  }
  return -1;
}

function getLeadsSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Leads') || ss.getSheets()[0];
  if (!sheet) throw new Error('No sheet found');
  return sheet;
}

function slugId(name, company, rowIndex) {
  var base = (name + '_' + company).toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/, '');
  return 'gs_' + (base || 'row_' + rowIndex).slice(0, 48);
}

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

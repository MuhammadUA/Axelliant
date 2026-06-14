// ═══════════════════════════════════════════════════════
//  Axelliant Lead Intelligence — Google Apps Script
//
//  DEPLOY STEPS:
//  1. Open your Google Sheet → Extensions → Apps Script
//  2. Delete any existing code, paste this entire file
//  3. Click Deploy → Manage deployments → edit → New version → Deploy
//     (URL stays the same — no need to update Settings)
// ═══════════════════════════════════════════════════════

// ── Pipeline tab schema ───────────────────────────────────────────
// One row per lead. Timestamp written into the column when stage = done,
// cleared when toggled back.
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

// ── Messages tab schema ───────────────────────────────────────────
// One row per lead. Each message type has a content column + sent_at column.
var MESSAGES_HEADERS = [
  'lead_id',              // A
  'lead_name',            // B
  'connection_note',      // C — connection request note (≤300 chars)
  'connection_sent_at',   // D
  'msg1',                 // E — 1st message
  'msg1_sent_at',         // F
  'msg2',                 // G — 2nd message (follow-up 1)
  'msg2_sent_at',         // H
  'msg3',                 // I — 3rd message (follow-up 2)
  'msg3_sent_at',         // J
  'last_updated',         // K
];

// ─────────────────────────────────────────────────────────────────
function doGet(e) {
  var action = (e.parameter && e.parameter.action) || 'getLeads';
  try {
    if (action === 'getLeads')       return getLeads();
    if (action === 'assignIds')      return assignIds();
    if (action === 'updatePipeline') return updatePipeline(e.parameter);
    if (action === 'updateMessages') return updateMessages(e.parameter);
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

// ── Write stable IDs into blank id cells in the Leads tab ─────────
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

// ── Upsert pipeline row: one row per lead, timestamp per stage ─────
//   params: leadId, leadName, stage, status, timestamp
function updatePipeline(params) {
  var sheet = getOrCreateSheet('Pipeline', PIPELINE_HEADERS, '#4F46E5');

  var leadId      = params.leadId   || '';
  var leadName    = params.leadName || '';
  var stage       = params.stage    || '';
  var status      = params.status   || 'pending';
  var ts          = params.timestamp || new Date().toISOString();
  var stageColKey = STAGE_TO_COL[stage];

  if (!stageColKey) return jsonOk({ ok: false, error: 'Unknown stage: ' + stage });

  var stageColIdx = PIPELINE_HEADERS.indexOf(stageColKey) + 1; // 1-based
  var lastUpdIdx  = PIPELINE_HEADERS.indexOf('last_updated') + 1;

  var foundRow = findRowByLeadId(sheet, leadId);

  if (foundRow === -1) {
    var newRow = PIPELINE_HEADERS.map(function() { return ''; });
    newRow[0] = leadId;
    newRow[1] = leadName;
    newRow[PIPELINE_HEADERS.indexOf('last_updated')] = ts;
    if (status === 'done') newRow[PIPELINE_HEADERS.indexOf(stageColKey)] = ts;
    sheet.appendRow(newRow);
  } else {
    // Fill lead_name if blank
    if (leadName) {
      var existing = sheet.getRange(foundRow, 2).getValue();
      if (!String(existing).trim()) sheet.getRange(foundRow, 2).setValue(leadName);
    }
    sheet.getRange(foundRow, stageColIdx).setValue(status === 'done' ? ts : '');
    sheet.getRange(foundRow, lastUpdIdx).setValue(ts);
  }

  return jsonOk({ ok: true, leadId: leadId, stage: stage, status: status });
}

// ── Upsert messages row: one row per lead, content + sent_at per msg
//   params: leadId, leadName, connection_note, msg1, msg2, msg3,
//           connection_sent_at, msg1_sent_at, msg2_sent_at, msg3_sent_at,
//           last_updated
function updateMessages(params) {
  var sheet = getOrCreateSheet('Messages', MESSAGES_HEADERS, '#059669');

  var leadId   = params.leadId   || '';
  var leadName = params.leadName || '';
  var now      = params.last_updated || new Date().toISOString();

  var foundRow = findRowByLeadId(sheet, leadId);

  // Build the full row values in header order
  function val(key) { return params[key] || ''; }

  if (foundRow === -1) {
    var newRow = [
      leadId, leadName,
      val('connection_note'),   val('connection_sent_at'),
      val('msg1'),              val('msg1_sent_at'),
      val('msg2'),              val('msg2_sent_at'),
      val('msg3'),              val('msg3_sent_at'),
      now,
    ];
    sheet.appendRow(newRow);
  } else {
    // Update each field — only overwrite content if non-empty (preserve
    // existing generated text if the new call omits a message)
    var updates = [
      { col: 2,  v: leadName,                    always: false },
      { col: 3,  v: val('connection_note'),       always: false },
      { col: 4,  v: val('connection_sent_at'),    always: true  },
      { col: 5,  v: val('msg1'),                  always: false },
      { col: 6,  v: val('msg1_sent_at'),          always: true  },
      { col: 7,  v: val('msg2'),                  always: false },
      { col: 8,  v: val('msg2_sent_at'),          always: true  },
      { col: 9,  v: val('msg3'),                  always: false },
      { col: 10, v: val('msg3_sent_at'),          always: true  },
      { col: 11, v: now,                          always: true  },
    ];

    updates.forEach(function(u) {
      if (u.always || u.v) {
        sheet.getRange(foundRow, u.col).setValue(u.v);
      }
    });
  }

  return jsonOk({ ok: true, leadId: leadId });
}

// ── Shared helpers ─────────────────────────────────────────────────

function getOrCreateSheet(name, headers, headerColor) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var hdrRange = sheet.getRange(1, 1, 1, headers.length);
    hdrRange.setValues([headers]);
    hdrRange.setFontWeight('bold')
            .setBackground(headerColor || '#4F46E5')
            .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    // Auto-size first two columns
    sheet.setColumnWidth(1, 220);
    sheet.setColumnWidth(2, 160);
    for (var c = 3; c <= headers.length; c++) sheet.setColumnWidth(c, 180);
  }
  return sheet;
}

function findRowByLeadId(sheet, leadId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === leadId) return i + 1; // 1-based
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

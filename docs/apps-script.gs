// ═══════════════════════════════════════════════════════
//  Axelliant Lead Intelligence — Google Apps Script
//
//  DEPLOY STEPS:
//  1. Open your Google Sheet → Extensions → Apps Script
//  2. Delete any existing code, paste this entire file
//  3. Click Deploy → New deployment  (or "Manage deployments" → edit
//     existing one and pick "New version" to redeploy after edits)
//  4. Type: Web app
//  5. Execute as: Me
//  6. Who has access: Anyone
//  7. Click Deploy → copy the Web App URL
//  8. Paste that URL into Settings → Apps Script URL in the dashboard
// ═══════════════════════════════════════════════════════

// Pipeline tab columns (order matters — do not reorder)
var PIPE_HEADERS = [
  'lead_id',        // A  — which lead
  'stage',          // B  — pipeline key (conn_sent, msg1_sent, …)
  'status',         // C  — current status: pending / active / done
  'activated_at',   // D  — when first moved to "active"
  'completed_at',   // E  — when marked "done"
  'last_updated',   // F  — timestamp of most recent change
  'lead_name',      // G  — denormalised for readability
];

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'getLeads';
  try {
    if (action === 'getLeads')       return getLeads();
    if (action === 'assignIds')      return assignIds();
    if (action === 'updatePipeline') return updatePipeline(e.parameter);
    return jsonOk({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOk({ ok: false, error: err.message });
  }
}

// ── Read all leads from the Leads tab ──────────────────
function getLeads() {
  const sheet = getLeadsSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonOk({ ok: true, leads: [] });

  const headers = data[0].map(function(h) { return String(h).trim(); });
  var leads = data.slice(1)
    .filter(function(row) { return row.some(function(c) { return String(c).trim() !== ''; }); })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
      return obj;
    });

  return jsonOk({ ok: true, leads: leads });
}

// ── Write stable IDs back to any row with blank id column ──
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

// ── Upsert one row per (lead_id, stage) in the Pipeline tab ──
//
//  params: leadId, stage, status, timestamp, leadName
//
//  Logic:
//    • Find existing row where col A = leadId AND col B = stage
//    • If found  → update status, set activated_at / completed_at
//      depending on new status, always update last_updated
//    • If not found → insert a new row with all fields
function updatePipeline(params) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Pipeline');

  // Create sheet with headers if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('Pipeline');
    sheet.appendRow(PIPE_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, PIPE_HEADERS.length)
         .setFontWeight('bold')
         .setBackground('#4F46E5')
         .setFontColor('#ffffff');
  }

  var leadId   = params.leadId    || '';
  var stage    = params.stage     || '';
  var status   = params.status    || 'pending';
  var ts       = params.timestamp || new Date().toISOString();
  var leadName = params.leadName  || params.notes || '';

  // Col indices (1-based for getRange)
  var COL = { lead_id:1, stage:2, status:3, activated_at:4, completed_at:5, last_updated:6, lead_name:7 };

  // Search existing rows for this lead+stage pair
  var data      = sheet.getDataRange().getValues();
  var foundRow  = -1; // 1-based sheet row

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === leadId && String(data[i][1]) === stage) {
      foundRow = i + 1; // convert to 1-based
      break;
    }
  }

  if (foundRow === -1) {
    // ── INSERT new row ──
    var newRow = ['', '', '', '', '', '', ''];
    newRow[COL.lead_id   - 1] = leadId;
    newRow[COL.stage     - 1] = stage;
    newRow[COL.status    - 1] = status;
    newRow[COL.activated_at  - 1] = (status === 'active' || status === 'done') ? ts : '';
    newRow[COL.completed_at  - 1] = status === 'done' ? ts : '';
    newRow[COL.last_updated  - 1] = ts;
    newRow[COL.lead_name - 1] = leadName;
    sheet.appendRow(newRow);
  } else {
    // ── UPDATE existing row ──
    var existingRow = data[foundRow - 1];

    // Update status
    sheet.getRange(foundRow, COL.status).setValue(status);

    // Set activated_at on first time it goes active/done (don't overwrite)
    if ((status === 'active' || status === 'done') && !String(existingRow[COL.activated_at - 1]).trim()) {
      sheet.getRange(foundRow, COL.activated_at).setValue(ts);
    }

    // Set or clear completed_at
    if (status === 'done') {
      sheet.getRange(foundRow, COL.completed_at).setValue(ts);
    } else {
      // Toggled back from done — clear completed_at
      sheet.getRange(foundRow, COL.completed_at).setValue('');
    }

    // Always update last_updated
    sheet.getRange(foundRow, COL.last_updated).setValue(ts);
  }

  return jsonOk({ ok: true, leadId: leadId, stage: stage, status: status });
}

// ── Helpers ────────────────────────────────────────────
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

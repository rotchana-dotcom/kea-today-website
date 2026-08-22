/**
 * Google Apps Script — Growth Engine 90-day event log.
 * 1. Extensions → Apps Script, paste this file.
 * 2. Deploy → New deployment → Web app → Anyone → URL into config.js sheetWebhook
 *    and Cloudflare Pages env SHEET_WEBHOOK.
 * Faults: 402.2.56.101 if this URL fails.
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName("events") || ss.insertSheet("events");
    if (sh.getLastRow() === 0) {
      sh.appendRow(["ts", "type", "src", "campaign", "exp", "visitor", "path", "tenant"]);
    }
    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    sh.appendRow([
      body.ts || Date.now(),
      body.type || "click",
      body.src || "",
      body.campaign || "",
      body.exp || "",
      body.visitor || "",
      body.path || "",
      body.tenant || ""
    ]);
    prune_(sh, 90);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, code: "402.2.56.101", error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName("events");
  if (!sh || sh.getLastRow() < 2) {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, clicks: 0, code: "402.4.1.0" })).setMimeType(ContentService.MimeType.JSON);
  }
  var data = sh.getDataRange().getValues();
  var clicks = 0;
  var bySource = {};
  for (var i = 1; i < data.length; i++) {
    var type = String(data[i][1]);
    var src = String(data[i][2] || "unknown");
    if (type === "click" || type === "play_tap") {
      clicks++;
      bySource[src] = (bySource[src] || 0) + 1;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, clicks: clicks, bySource: bySource })).setMimeType(ContentService.MimeType.JSON);
}

function prune_(sh, days) {
  var cut = Date.now() - days * 24 * 60 * 60 * 1000;
  var last = sh.getLastRow();
  for (var r = last; r >= 2; r--) {
    var ts = Number(sh.getRange(r, 1).getValue());
    if (ts && ts < cut) sh.deleteRow(r);
  }
}

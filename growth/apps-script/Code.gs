/**
 * Energy Today funnel — events log + Play listing snapshot (public page).
 * After editing: Deploy → Manage deployments → pencil → New version → Allow.
 */
var PLAY_PACKAGE = "com.kea.energytoday";
var PLAY_URL = "https://play.google.com/store/apps/details?id=" + PLAY_PACKAGE + "&hl=en&gl=US";

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SHEET_ID");
  var ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create("Energy Today funnel");
    props.setProperty("SHEET_ID", ss.getId());
  }
  return ss;
}

function getEventsSheet_() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName("events");
  if (!sh) sh = ss.insertSheet("events");
  if (sh.getLastRow() === 0) {
    sh.appendRow(["ts", "type", "src", "campaign", "exp", "visitor", "path", "tenant"]);
  }
  return sh;
}

function getPlaySheet_() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName("play_stats");
  if (!sh) sh = ss.insertSheet("play_stats");
  if (sh.getLastRow() === 0) {
    sh.appendRow(["updated", "source", "installsLabel", "installsGuess", "rating", "rawNote"]);
  }
  return sh;
}

function doGet() {
  try {
    maybeSyncPlay_();
    var sh = getEventsSheet_();
    var last = sh.getLastRow();
    var clicks = 0;
    var bySource = {};
    if (last >= 2) {
      var data = sh.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var type = String(data[i][1]);
        var src = String(data[i][2] || "unknown");
        if (type === "click" || type === "play_tap") {
          clicks++;
          bySource[src] = (bySource[src] || 0) + 1;
        }
      }
    }
    return json_({
      ok: true,
      clicks: clicks,
      bySource: bySource,
      sheet: getSpreadsheet_().getUrl(),
      play: readLatestPlay_()
    });
  } catch (err) {
    return json_({ ok: false, code: "402.2.56.101", error: String(err) });
  }
}

function doPost(e) {
  try {
    var sh = getEventsSheet_();
    var body = {};
    if (e && e.postData && e.postData.contents) {
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
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, code: "402.2.56.101", error: String(err) });
  }
}

function maybeSyncPlay_() {
  var props = PropertiesService.getScriptProperties();
  var last = Number(props.getProperty("PLAY_SYNC_AT") || "0");
  if (Date.now() - last < 6 * 60 * 60 * 1000 && readLatestPlay_().installsLabel) return;
  syncPlayToSheet();
}

/** Run this once from the editor (Run ▶) if you want a daily timer. */
function installDailyPlaySync() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "syncPlayToSheet") return;
  }
  ScriptApp.newTrigger("syncPlayToSheet").timeBased().everyDays(1).atHour(6).create();
}

function syncPlayToSheet() {
  var snap = fetchPlayPublic_();
  var sh = getPlaySheet_();
  sh.appendRow([
    new Date(),
    snap.source,
    snap.installsLabel,
    snap.installsGuess,
    snap.rating,
    snap.note
  ]);
  PropertiesService.getScriptProperties().setProperty("PLAY_SYNC_AT", String(Date.now()));
  return snap;
}

function readLatestPlay_() {
  var sh = getPlaySheet_();
  var last = sh.getLastRow();
  if (last < 2) return { installsLabel: "", installsGuess: null, source: "none" };
  var r = sh.getRange(last, 1, 1, 6).getValues()[0];
  return {
    updated: r[0],
    source: r[1],
    installsLabel: r[2],
    installsGuess: r[3],
    rating: r[4],
    note: r[5]
  };
}

function fetchPlayPublic_() {
  var res = UrlFetchApp.fetch(PLAY_URL, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
  });
  var html = res.getContentText() || "";
  var code = res.getResponseCode();
  var label = pick_(html, [
    /"downloadLabel"\s*:\s*"([^"]+)"/,
    /"downloads"\s*:\s*"([^"]+)"/,
    /([0-9][0-9,.]*\+)\s*Downloads/i,
    /([0-9][0-9,.]*\+)\s*<[^>]*>\s*Downloads/i,
    /Downloads<\/div>\s*<div[^>]*>\s*([^<]+)/i,
    /Downloads<\/span>\s*<span[^>]*>\s*([^<]+)/i
  ]);
  var rating = pick_(html, [
    /"starRating"\s*:\s*([0-9.]+)/,
    /"ratingValue"\s*:\s*"([0-9.]+)"/
  ]);
  var guess = guessInstalls_(label);
  return {
    source: code === 200 ? "play_store_public" : "play_store_http_" + code,
    installsLabel: label || "",
    installsGuess: guess,
    rating: rating || "",
    note: code === 200 ? "Public listing (not Console revenue). Exact $ needs Play Console API + developer login." : "HTTP " + code
  };
}

function pick_(html, regs) {
  for (var i = 0; i < regs.length; i++) {
    var m = html.match(regs[i]);
    if (m && m[1]) return String(m[1]).replace(/\\u0027/g, "'").trim();
  }
  return "";
}

function guessInstalls_(label) {
  if (!label) return null;
  var t = String(label).replace(/,/g, "").toUpperCase();
  var m = t.match(/([0-9.]+)\s*([KMB])?/);
  if (!m) return null;
  var n = parseFloat(m[1]);
  var u = m[2];
  if (u === "K") n *= 1000;
  if (u === "M") n *= 1000000;
  if (u === "B") n *= 1000000000;
  if (/\+/.test(t)) return n;
  return n;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function prune_(sh, days) {
  var cut = Date.now() - days * 24 * 60 * 60 * 1000;
  var last = sh.getLastRow();
  for (var r = last; r >= 2; r--) {
    var ts = Number(sh.getRange(r, 1).getValue());
    if (ts && ts < cut) sh.deleteRow(r);
  }
}

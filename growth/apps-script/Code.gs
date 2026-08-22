/**
 * Energy Today funnel — events log + Play Console (service account) + public listing.
 *
 * Deploy in Chrome: Deploy → Manage deployments → pencil → New version → Allow.
 *
 * Play Console users you added are NOT API keys. The robot user is:
 *   energy-today-billing@energy-today.iam.gserviceaccount.com
 *
 * One JSON key file (Cloud Console → IAM → that account → Keys → Add JSON).
 * Then in Apps Script: Project Settings → Script properties:
 *   PLAY_SA_JSON  = entire JSON on one line (never put this in git / kea.today)
 *   PLAY_GCS_BUCKET = optional, from Play Console → Download reports
 *     example: pubsite_prod_rev_1234567890123456789
 *
 * Cloud APIs to enable on project energy-today:
 *   Google Play Android Developer API, Cloud Storage, Play Developer Reporting API
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
    sh.appendRow([
      "updated",
      "source",
      "installsLabel",
      "installsGuess",
      "rating",
      "rawNote",
      "revenue",
      "payers"
    ]);
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
  var play = readLatestPlay_();
  if (Date.now() - last < 6 * 60 * 60 * 1000 && play.source === "play_console") return;
  if (Date.now() - last < 6 * 60 * 60 * 1000 && play.installsLabel) return;
  syncPlayToSheet();
}

/** Run once from the editor (Run ▶) after pasting PLAY_SA_JSON. */
function installDailyPlaySync() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "syncPlayToSheet") return;
  }
  ScriptApp.newTrigger("syncPlayToSheet").timeBased().everyDays(1).atHour(6).create();
}

function syncPlayToSheet() {
  var snap = mergePlay_(fetchPlayPublic_(), fetchPlayConsole_());
  var sh = getPlaySheet_();
  sh.appendRow([
    new Date(),
    snap.source,
    snap.installsLabel,
    snap.installsGuess,
    snap.rating,
    snap.note,
    snap.revenue || "",
    snap.payers || ""
  ]);
  PropertiesService.getScriptProperties().setProperty("PLAY_SYNC_AT", String(Date.now()));
  return snap;
}

function readLatestPlay_() {
  var sh = getPlaySheet_();
  var last = sh.getLastRow();
  if (last < 2) return { installsLabel: "", installsGuess: null, source: "none" };
  var r = sh.getRange(last, 1, 1, 8).getValues()[0];
  return {
    updated: r[0],
    source: r[1],
    installsLabel: r[2],
    installsGuess: r[3],
    rating: r[4],
    note: r[5],
    revenue: r[6],
    payers: r[7]
  };
}

function mergePlay_(pub, con) {
  pub = pub || {};
  if (!con || con.skip) {
    pub.note = (pub.note || "") + " " + (con && con.note ? con.note : "");
    return pub;
  }
  if (con.error) {
    pub.note = (pub.note || "") + " Console error: " + con.error;
    return pub;
  }
  return {
    source: "play_console",
    installsLabel: con.installsLabel || pub.installsLabel || "",
    installsGuess: con.installsGuess != null ? con.installsGuess : pub.installsGuess,
    rating: pub.rating || "",
    revenue: con.revenue || "",
    payers: con.payers || "",
    note: con.note || "Play Console via service account"
  };
}

function fetchPlayConsole_() {
  var raw = PropertiesService.getScriptProperties().getProperty("PLAY_SA_JSON");
  if (!raw) {
    return {
      skip: true,
      note: "PLAY_SA_JSON not set. Users on Console are not keys — paste the JSON key in Script properties."
    };
  }
  var token = playAccessToken_(raw);
  if (token.error) return { error: token.error };

  var notes = [];
  var products = playGet_(
    token.access,
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" +
      PLAY_PACKAGE +
      "/inappproducts"
  );
  if (products.code >= 400) {
    return {
      error:
        "Android Publisher " +
        products.code +
        " " +
        String(products.body).slice(0, 280) +
        " — Cloud Console: enable Google Play Android Developer API on project energy-today."
    };
  }
  notes.push("App linked: " + PLAY_PACKAGE);

  var subs = playGet_(
    token.access,
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" +
      PLAY_PACKAGE +
      "/subscriptions"
  );
  var subN = 0;
  try {
    var sj = JSON.parse(subs.body || "{}");
    subN = (sj.subscriptions || []).length;
    if (subN) notes.push(subN + " subscription product(s)");
  } catch (e) {}

  var bucket = PropertiesService.getScriptProperties().getProperty("PLAY_GCS_BUCKET") || "";
  var money = { revenue: "", payers: "", installsLabel: "", installsGuess: null };
  if (bucket) {
    money = readPlayReports_(token.access, bucket);
    if (money.note) notes.push(money.note);
  } else {
    notes.push("Set PLAY_GCS_BUCKET (Play Console → Download reports) for $ and exact installs.");
  }

  return {
    installsLabel: money.installsLabel || "",
    installsGuess: money.installsGuess,
    revenue: money.revenue,
    payers: money.payers,
    note: notes.join(" ")
  };
}

function playAccessToken_(rawJson) {
  var sa;
  try {
    sa = JSON.parse(rawJson);
  } catch (e) {
    return { error: "PLAY_SA_JSON is not valid JSON" };
  }
  if (!sa.client_email || !sa.private_key) return { error: "PLAY_SA_JSON missing client_email or private_key" };
  var now = Math.floor(Date.now() / 1000);
  var header = b64urlStr_(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  var claim = b64urlStr_(
    JSON.stringify({
      iss: sa.client_email,
      scope: [
        "https://www.googleapis.com/auth/androidpublisher",
        "https://www.googleapis.com/auth/devstorage.read_only",
        "https://www.googleapis.com/auth/playdeveloperreporting"
      ].join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  );
  var signingInput = header + "." + claim;
  var sig = Utilities.computeRsaSha256Signature(signingInput, sa.private_key);
  var jwt = signingInput + "." + b64urlBytes_(sig);
  var res = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "post",
    muteHttpExceptions: true,
    payload: {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    }
  });
  var body = JSON.parse(res.getContentText() || "{}");
  if (!body.access_token) {
    return { error: "token " + res.getResponseCode() + " " + String(res.getContentText()).slice(0, 200) };
  }
  return { access: body.access_token };
}

function playGet_(access, url) {
  var res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + access }
  });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

function readPlayReports_(access, bucket) {
  bucket = String(bucket).replace(/^gs:\/\//, "").replace(/\/$/, "");
  var ym = Utilities.formatDate(new Date(), "GMT", "yyyyMM");
  var out = { revenue: "", payers: "", installsLabel: "", installsGuess: null, note: "" };
  var salesName = "sales/salesreport_" + ym + ".csv";
  var sales = gcsDownload_(access, bucket, salesName);
  if (sales.code === 200) {
    var parsed = parseSalesCsv_(sales.text);
    out.revenue = parsed.revenue;
    out.payers = parsed.payers;
    out.note = "Sales " + ym + " (buyer-paid, before Google fee).";
  } else {
    out.note = "Sales CSV HTTP " + sales.code + " for " + salesName;
  }
  var instName = "stats/installs/installs_" + PLAY_PACKAGE + "_" + ym + "_overview.csv";
  var inst = gcsDownload_(access, bucket, instName);
  if (inst.code === 200) {
    var n = parseInstallsCsv_(inst.text);
    if (n != null) {
      out.installsGuess = n;
      out.installsLabel = String(n);
    }
  }
  return out;
}

function gcsDownload_(access, bucket, objectName) {
  var url =
    "https://storage.googleapis.com/storage/v1/b/" +
    encodeURIComponent(bucket) +
    "/o/" +
    encodeURIComponent(objectName) +
    "?alt=media";
  var res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + access }
  });
  var code = res.getResponseCode();
  var bytes = res.getContent();
  var text = "";
  try {
    text = Utilities.newBlob(bytes).getDataAsString("UTF-16");
    if (text.indexOf(",") < 0 && text.indexOf("\t") < 0) {
      text = Utilities.newBlob(bytes).getDataAsString("UTF-8");
    }
  } catch (e) {
    text = res.getContentText() || "";
  }
  return { code: code, text: text };
}

function parseSalesCsv_(text) {
  var lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).filter(function (l) {
    return l.trim();
  });
  if (lines.length < 2) return { revenue: "", payers: "" };
  var header = splitCsv_(lines[0]).map(function (h) {
    return h.replace(/"/g, "").trim().toLowerCase();
  });
  var amtI = indexOfHeader_(header, ["charged amount", "item price", "amount (merchant", "charged amount (merchant"]);
  var orderI = indexOfHeader_(header, ["order number", "order id"]);
  var total = 0;
  var orders = {};
  for (var i = 1; i < lines.length; i++) {
    var cols = splitCsv_(lines[i]);
    if (amtI >= 0 && cols[amtI]) {
      var n = parseFloat(String(cols[amtI]).replace(/[^0-9.-]/g, ""));
      if (!isNaN(n)) total += n;
    }
    if (orderI >= 0 && cols[orderI]) orders[cols[orderI]] = true;
  }
  return {
    revenue: total ? (Math.round(total * 100) / 100) : "",
    payers: Object.keys(orders).length || ""
  };
}

function parseInstallsCsv_(text) {
  var lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).filter(function (l) {
    return l.trim();
  });
  if (lines.length < 2) return null;
  var header = splitCsv_(lines[0]).map(function (h) {
    return h.replace(/"/g, "").trim().toLowerCase();
  });
  var col = indexOfHeader_(header, ["current user installs", "active device installs", "installs"]);
  if (col < 0) return null;
  var last = splitCsv_(lines[lines.length - 1]);
  var n = parseInt(String(last[col]).replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? null : n;
}

function indexOfHeader_(header, needles) {
  for (var i = 0; i < header.length; i++) {
    for (var j = 0; j < needles.length; j++) {
      if (header[i].indexOf(needles[j]) >= 0) return i;
    }
  }
  return -1;
}

function splitCsv_(line) {
  var out = [];
  var cur = "";
  var q = false;
  for (var i = 0; i < line.length; i++) {
    var c = line.charAt(i);
    if (c === '"') q = !q;
    else if ((c === "," || c === "\t") && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function b64urlStr_(s) {
  return Utilities.base64EncodeWebSafe(s).replace(/=+$/, "");
}

function b64urlBytes_(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, "");
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
    note: code === 200 ? "Public listing (not Console revenue)." : "HTTP " + code
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

/**
 * Local click log (this browser) until Google Sheet webhook is set.
 * Faults: 402.* — see FAULTS.md
 */
(function () {
  var KEY = "kea_growth_clicks_v1";
  var DAYS = (window.KEA_GROWTH && window.KEA_GROWTH.retentionDays) || 90;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function prune(rows) {
    var cut = Date.now() - DAYS * 24 * 60 * 60 * 1000;
    return rows.filter(function (r) {
      return r.ts && r.ts > cut;
    });
  }

  function save(rows) {
    localStorage.setItem(KEY, JSON.stringify(prune(rows)));
  }

  window.KeaGrowth = {
    fault: function (code, note) {
      return "[" + code + "] " + note;
    },

    recordClick: function (src) {
      var cfg = window.KEA_GROWTH || {};
      var rows = load();
      rows.push({ ts: Date.now(), src: src || "unknown", path: location.pathname });
      save(rows);

      if (!cfg.sheetWebhook) {
        return { ok: true, code: "402.2.1.0", local: true };
      }

      return fetch(cfg.sheetWebhook, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ts: Date.now(), src: src, tenant: cfg.tenantName })
      })
        .then(function () {
          return { ok: true, code: null, local: false };
        })
        .catch(function () {
          return { ok: false, code: "402.2.56.101", local: true };
        });
    },

    countsBySource: function () {
      var rows = prune(load());
      var out = {};
      rows.forEach(function (r) {
        out[r.src] = (out[r.src] || 0) + 1;
      });
      return { total: rows.length, bySource: out, days: DAYS };
    },

    playUrl: function (src) {
      var cfg = window.KEA_GROWTH || {};
      var base = cfg.playStoreUrl || "";
      if (!base) return "";
      var utm =
        "utm_source=" +
        encodeURIComponent(src || "direct") +
        "&utm_medium=social&utm_campaign=energy_today_funnel";
      var join = base.indexOf("?") >= 0 ? "&" : "?";
      return base + join + utm;
    }
  };
})();

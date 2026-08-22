/**
 * Growth event bus. Local 90-day log + optional /api/track + Google Sheet.
 * Faults: 402.page.line.char — FAULTS.md
 */
(function () {
  var KEY = "kea_growth_events_v2";
  var VISITOR = "kea_growth_vid";
  var DAYS = (window.KEA_GROWTH && window.KEA_GROWTH.retentionDays) || 90;

  function visitorId() {
    var id = localStorage.getItem(VISITOR);
    if (!id) {
      id = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(VISITOR, id);
    }
    return id;
  }

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

  function params() {
    return new URLSearchParams(location.search);
  }

  window.KeaGrowth = {
    visitorId: visitorId,

    fault: function (code, note) {
      return "[" + code + "] " + note;
    },

    experiment: function () {
      var cfg = window.KEA_GROWTH || {};
      var list = cfg.experiments || [];
      if (!list.length) return { id: "A", headline: "What is your energy today?" };
      var forced = params().get("exp");
      if (forced) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === forced) return list[i];
        }
      }
      var day = Math.floor(Date.now() / 86400000);
      return list[day % list.length];
    },

    record: function (type, extra) {
      extra = extra || {};
      var cfg = window.KEA_GROWTH || {};
      var src = extra.src || params().get("src") || "website";
      var campaign = extra.campaign || extra.c || params().get("c") || "";
      var exp = extra.exp || params().get("exp") || (this._exp && this._exp.id) || "";
      var row = {
        ts: Date.now(),
        type: type,
        src: src,
        campaign: campaign,
        exp: exp,
        visitor: visitorId(),
        path: location.pathname,
        tenant: cfg.tenantName
      };
      var rows = load();
      rows.push(row);
      save(rows);

      var payload = JSON.stringify(row);
      var api = cfg.trackApi || "https://www.kea.today/api/funnel";
      try {
        fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true, mode: "cors" }).catch(function () {});
        var img = new Image();
        img.src = api + "?type=" + encodeURIComponent(type) + "&src=" + encodeURIComponent(src) + "&c=" + encodeURIComponent(campaign) + "&n=" + Date.now();
      } catch (e) {}

      if (cfg.sheetWebhook) {
        fetch(cfg.sheetWebhook, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true
        }).catch(function () {});
      }

      return row;
    },

    recordClick: function (src) {
      this.record("click", { src: src });
      var cfg = window.KEA_GROWTH || {};
      return { ok: true, code: cfg.sheetWebhook ? null : "402.2.1.0", local: !cfg.sheetWebhook };
    },

    events: function () {
      return prune(load());
    },

    funnel: function () {
      var rows = prune(load());
      function n(t) {
        return rows.filter(function (r) {
          return r.type === t;
        }).length;
      }
      var bySource = {};
      var byExp = {};
      rows.forEach(function (r) {
        if (r.type === "click" || r.type === "play_tap") {
          bySource[r.src] = (bySource[r.src] || 0) + 1;
        }
        if (r.exp) byExp[r.exp] = (byExp[r.exp] || 0) + 1;
      });
      return {
        days: DAYS,
        clicks: n("click") + n("play_tap"),
        readings: n("reading"),
        returns: n("return"),
        offers: n("offer_shown"),
        playTaps: n("play_tap") + n("click"),
        bySource: bySource,
        byExp: byExp,
        total: rows.length
      };
    },

    playUrl: function (src, campaign) {
      var cfg = window.KEA_GROWTH || {};
      var base = cfg.playStoreUrl || "";
      if (!base) return "";
      var utm =
        "utm_source=" +
        encodeURIComponent(src || "direct") +
        "&utm_medium=funnel&utm_campaign=energy_today" +
        (campaign ? "&utm_content=" + encodeURIComponent(campaign) : "");
      return base + (base.indexOf("?") >= 0 ? "&" : "?") + utm;
    },

    seenReadingBefore: function () {
      return localStorage.getItem("kea_growth_read") === "1";
    },

    markReading: function () {
      localStorage.setItem("kea_growth_read", "1");
    }
  };
})();

/**
 * Growth brain for Energy Today.
 * Thinks in funnel stages, reads pasted replies, picks the invite that should be pushed.
 * No paid GPU required. Faults stay 402.*.
 */
(function () {
  var CAPTIONS = [
    {
      id: "download",
      body: "Download Energy Today. It runs fully automated daily energy on your phone — free on Google Play."
    },
    {
      id: "try",
      body: "Try Energy Today fully automated. Open the app once — it reads the day for you after that."
    },
    {
      id: "timing",
      body: "Plan the meeting when your energy is actually there. Energy Today does this automatically."
    },
    {
      id: "private",
      body: "Energy Today stays on your phone. Fully automated daily energy. Private. Free to try."
    }
  ];

  var THEMES = [
    { id: "want_app", caption: "download", words: ["download", "play store", "google play", "app link", "where is the app", "how do i get", "install"] },
    { id: "how_it_works", caption: "try", words: ["how does", "automated", "automatic", "what does it do", "how it work"] },
    { id: "timing", caption: "timing", words: ["meeting", "launch", "when to", "timing", "best day", "plan"] },
    { id: "privacy", caption: "private", words: ["privacy", "data", "private", "sell my", "account"] },
    { id: "skeptical", caption: "private", words: ["scam", "fake", "astrology", "bs", "clickbait"] },
    { id: "resonance", caption: "try", words: ["this is me", "needed this", "so true", "saved", "felt this", "exactly"] }
  ];

  var REPLY_SCRIPT = {
    want_app: "It's free on Google Play. Tap the link in this caption — Energy Today runs daily energy automatically on your phone.",
    how_it_works: "Put your birthday in once. After that it is fully automated — a daily energy read without you managing it.",
    timing: "Use it before a meeting, launch, or hard day. The app times the day for you automatically.",
    privacy: "Nothing leaves your phone. No social feed. Try it free, then keep what works.",
    skeptical: "It is a private timing tool, not a feed. Unlock a reading at app.kea.today/funnel, then the app.",
    resonance: "If that landed, download Energy Today and let it run. That clip was the invite."
  };

  function origin() {
    return "https://www.kea.today/growth/";
  }

  function trackUrl(src) {
    return origin() + "go.html?src=" + encodeURIComponent(src || "website");
  }

  function countThemes(replies) {
    var counts = {};
    THEMES.forEach(function (t) {
      counts[t.id] = 0;
    });
    (replies || []).forEach(function (r) {
      var text = String((r && r.text) || r || "").toLowerCase();
      if (!text) return;
      THEMES.forEach(function (t) {
        t.words.forEach(function (w) {
          if (text.indexOf(w) !== -1) counts[t.id] += 1;
        });
      });
    });
    return counts;
  }

  function topTheme(counts) {
    var id = "none";
    var n = 0;
    Object.keys(counts).forEach(function (k) {
      if (counts[k] > n) {
        n = counts[k];
        id = k;
      }
    });
    return { id: id, n: n };
  }

  function captionById(id) {
    for (var i = 0; i < CAPTIONS.length; i++) {
      if (CAPTIONS[i].id === id) return CAPTIONS[i];
    }
    return CAPTIONS[0];
  }

  function compose(src, captionId) {
    var cap = captionById(captionId);
    return cap.body + "\n" + trackUrl(src);
  }

  window.KeaGrowthSales = {
    captions: function () {
      return CAPTIONS.slice();
    },
    trackUrl: trackUrl,
    compose: compose,
    readReplies: countThemes,

    report: function (funnel, pasted, replies) {
      pasted = pasted || {};
      replies = replies || [];
      var installs = Number(pasted.installs);
      var paid = Number(pasted.paid);
      var revenue = pasted.revenue;
      var why = [];
      var lines = [];
      var action = "";
      var leak = "unknown";
      var code = null;

      var clicks = funnel.clicks || 0;
      var readings = funnel.readings || 0;
      var sources = funnel.bySource || {};
      var best = "youtube";
      var bestN = 0;
      Object.keys(sources).forEach(function (k) {
        if (sources[k] > bestN) {
          bestN = sources[k];
          best = k;
        }
      });
      if (bestN === 0) best = "youtube";

      var themes = countThemes(replies);
      var theme = topTheme(themes);
      var captionId = "download";
      if (theme.n > 0) {
        THEMES.forEach(function (t) {
          if (t.id === theme.id) captionId = t.caption;
        });
        why.push("Replies lean " + theme.id + " (" + theme.n + " hits). Push the invite that answers that, not a new idea.");
      } else {
        why.push("No replies in the inbox yet. Default invite: easy download + try fully automated.");
      }

      if (clicks < 50 && !(paid > 0)) {
        code = replies.length ? "402.4.1.0" : "402.8.1.0";
        leak = "no_awareness";
        action =
          "PUSH this caption on " +
          best +
          ": invite people to download Energy Today and try it fully automated. Answer comments with the reply script. Almost nobody knows the app — 7 installs will not become 7000 from reports.";
        if (clicks === 0) {
          lines.push("Awareness is empty. Studio can keep posting; this board tells you which invite to put under the video.");
        } else {
          lines.push(clicks + " tracked click(s). Still too few. Double down on the winning invite, do not change the product story.");
        }
      } else if (clicks > 0 && !(installs > 0)) {
        code = "402.6.1.0";
        leak = "click_to_install";
        captionId = "download";
        action = "People tap but installs are blank. Make download the only job in the caption. Paste Play listing visitors vs installs next.";
        lines.push(clicks + " tracked click(s). If Play visitors are near zero, the leak is still the CTA. If visitors are high, fix the store listing.");
        why.push("Clicks without installs means the invite is working and Play is not finishing the job.");
      } else if (installs > 0 && !(paid > 0)) {
        code = "402.6.2.0";
        leak = "install_to_pay";
        captionId = "try";
        action = "They downloaded. Invite them to let it run fully automated for three days. Measure purchases in Play, not views.";
        lines.push(installs + " installs, no paying users entered. After download, the job is the automated daily habit.");
      } else if (paid > 0) {
        leak = "scale_winner";
        action = "Paying users exist. Push more of " + best + " with the same winning caption. Pause weaker sources.";
        lines.push("Scale the source that produced payers, not the most views.");
      }

      if (theme.id === "skeptical" && theme.n > 0) {
        captionId = "private";
        action = "Replies are skeptical. Push privacy + free reading, then Play. Do not argue in captions.";
        why.push("Skepticism is a leak at belief, not at download. Soften with private + automated, then the reading page.");
      }
      if (theme.id === "want_app" && theme.n > 0) {
        captionId = "download";
        action = "Comments ask for the app. Put the download invite first. Reply with the Play script. Do not bury the link.";
      }

      if (bestN > 0) {
        lines.push("Best tracked source: " + best + " (" + bestN + "). Push that platform harder.");
        why.push("Clicks already name a winner: " + best + ". Grow that, then copy the same invite to the others.");
      }

      var exp = funnel.byExp || {};
      var expKeys = Object.keys(exp);
      if (expKeys.length > 1) {
        expKeys.sort(function (a, b) {
          return exp[b] - exp[a];
        });
        lines.push("Reading headline lead: " + expKeys[0] + ". Winner is paying users, not headline curiosity.");
      }

      if (readings > 0 && clicks > readings * 3) {
        lines.push(readings + " readings vs many Play taps. Keep Play above the fold — they already want the app.");
      }

      if (revenue && /[0-9]/.test(String(revenue))) lines.push("Revenue note: " + revenue);

      if (!replies.length) {
        lines.push("Paste YouTube / Facebook / TikTok comments into Replies. The brain cannot push what works until it can read what people say.");
      } else {
        lines.push(replies.length + " reply line(s) stored. Answer with the script, then push the matching caption.");
      }

      var cap = captionById(captionId);
      var pushSource = bestN > 0 ? best : "youtube";
      var pushText = compose(pushSource, captionId);
      var replyScript = REPLY_SCRIPT[theme.id] || REPLY_SCRIPT.want_app;

      why.push("Best growth move now: one clear invite (download + fully automated), one tracked link, read replies, repeat the winner.");

      return {
        leak: leak,
        action: action,
        lines: lines,
        why: why,
        bestSource: best,
        bestN: bestN,
        code: code,
        captionId: captionId,
        captionBody: cap.body,
        pushSource: pushSource,
        pushText: pushText,
        replyScript: replyScript,
        themeId: theme.id,
        themeN: theme.n,
        themes: themes
      };
    }
  };
})();

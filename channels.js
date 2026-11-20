/*
 * Every Kea Today channel on every platform, in one place (owner, 20 Nov 2026: "every page channel should be
 * linked, social is our marketing system"). Pages put <div class="kea-follow" data-first="echoes,mind"></div>
 * (optional data-lang="th") and this file fills it with a "Follow along" block, the fitting channels first.
 * A copy of this file lives in the kea-today-website repo (channels.js); keep the two the same.
 * A link left empty ("") is not shown: fill it in when the handle is known.
 */
(function () {
  var CHANNELS = [
    {
      id: "kea", name: "Kea Humour",
      en: "A cheeky New Zealand mountain parrot, daily laughs",
      th: "นกแก้วภูเขาจอมซนจากนิวซีแลนด์ หัวเราะได้ทุกวัน",
      page: "https://www.kea.today/kea-humour.html",
      youtube: "https://www.youtube.com/@vlog.Rotchana",
      facebook: "https://www.facebook.com/profile.php?id=883883358138931",
      instagram: "https://www.instagram.com/kea.humour/",
      tiktok: "https://www.tiktok.com/@kea.humour"
    },
    {
      id: "kiwi", name: "Kiwi in Thai",
      en: "Life in Thailand from a Kiwi, in Thai",
      th: "ชีวิตในประเทศไทยในแบบคนนิวซีแลนด์ เป็นภาษาไทย",
      page: "https://www.kea.today/kiwi-thai.html",
      youtube: "https://www.youtube.com/@Kiwi-in-Thai.Motivation",
      facebook: "https://www.facebook.com/profile.php?id=101582838945098",
      instagram: "https://www.instagram.com/kiwi.in.thai/",
      tiktok: ""
    },
    {
      id: "echoes", name: "Echoes & Wisdom",
      en: "Energy, timing and timeless insight",
      th: "พลังงาน จังหวะเวลา และข้อคิดที่ไม่มีวันเก่า",
      page: "https://www.kea.today/echos-wisdom.html",
      youtube: "https://www.youtube.com/@EchosandWisdom",
      facebook: "https://www.facebook.com/profile.php?id=109822684772325",
      instagram: "",
      tiktok: ""
    },
    {
      id: "mind", name: "Mindfulness Quotes",
      en: "Short drama and stories for calm and reflection",
      th: "ละครสั้นและเรื่องเล่า เพื่อความสงบและการทบทวนตัวเอง",
      page: "https://www.kea.today/mindfulness-quotes.html",
      youtube: "https://www.youtube.com/@MindfullnessQuote",
      facebook: "https://www.facebook.com/profile.php?id=101205638385529",
      instagram: "https://www.instagram.com/mindfullness.quotes/",
      tiktok: "https://www.tiktok.com/@mindfullness.quotes"
    },
    {
      id: "spoken", name: "Spoken And So It Is",
      en: "Where words become reality: one word a day",
      th: "ที่ที่คำพูดกลายเป็นความจริง วันละหนึ่งคำ",
      page: "",
      youtube: "https://www.youtube.com/@SpokenAndSoItIs",
      facebook: "",
      instagram: "",
      tiktok: ""
    }
  ];
  var PLATFORMS = [["youtube", "YouTube"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["tiktok", "TikTok"]];

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function ordered(first) {
    var want = String(first || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    var head = [], tail = [];
    CHANNELS.forEach(function (c) { (want.indexOf(c.id) >= 0 ? head : tail).push(c); });
    head.sort(function (a, b) { return want.indexOf(a.id) - want.indexOf(b.id); });
    return head.concat(tail);
  }
  function render(el) {
    var th = el.getAttribute("data-lang") === "th";
    var rows = ordered(el.getAttribute("data-first")).map(function (c) {
      var links = PLATFORMS.filter(function (p) { return c[p[0]]; }).map(function (p) {
        return '<a href="' + esc(c[p[0]]) + '" target="_blank" rel="noopener" style="color:#00ff9c;" data-ch="' + c.id + '" data-pf="' + p[0] + '">' + p[1] + "</a>";
      }).join(" · ");
      var title = c.page ? '<a href="' + esc(c.page) + '" class="kea-follow-name" style="color:inherit;font-weight:700;">' + esc(c.name) + "</a>" : '<span class="kea-follow-name" style="font-weight:700;">' + esc(c.name) + "</span>";
      return '<li style="margin:0 0 12px;">' + title + '<br><span style="opacity:.75;font-size:.85em;">' + esc(th ? c.th : c.en) + "</span><br>" + links + "</li>";
    }).join("");
    el.innerHTML =
      '<h3 style="margin:0 0 4px;">' + (th ? "ติดตามเรา" : "Follow along") + "</h3>" +
      '<p style="opacity:.75;font-size:.9em;margin:0 0 14px;">' +
      (th ? "ห้าช่อง คนจริงคนเดียวอยู่เบื้องหลัง เลือกช่องที่ใช่สำหรับคุณ" : "Five channels, one real person behind them. Pick the ones that fit you.") +
      "</p>" +
      '<ul style="list-style:none;padding:0;margin:0;">' + rows + "</ul>";
    el.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[data-ch]") : null;
      if (!a) return;
      try {
        var vid = localStorage.getItem("kea_growth_vid") || "";
        var src = new URLSearchParams(location.search).get("src") || "website";
        var api = /kea\.today$/.test(location.hostname) && location.hostname !== "app.kea.today" ? "https://app.kea.today/api/funnel" : "/api/funnel";
        fetch(api, {
          method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
          body: JSON.stringify({ type: "follow_click", src: src + ":" + a.getAttribute("data-ch") + "-" + a.getAttribute("data-pf"), visitor: vid, path: location.pathname })
        }).catch(function () {});
      } catch (x) {}
    });
  }
  window.KEA_CHANNELS = CHANNELS;
  function run() { Array.prototype.forEach.call(document.querySelectorAll(".kea-follow"), render); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();

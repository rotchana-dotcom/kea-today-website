(function () {
  var KEY = "kea_src";
  var VISITOR = "kea_growth_vid";
  var q = new URLSearchParams(location.search);
  var fromLink = (q.get("src") || "").trim();
  if (fromLink) {
    try { sessionStorage.setItem(KEY, fromLink); } catch (e) {}
  }
  var src = fromLink;
  if (!src) {
    try { src = sessionStorage.getItem(KEY) || ""; } catch (e) { src = ""; }
  }
  if (!src) src = "website";

  document.querySelectorAll('a[href*="funnel/reading"]').forEach(function (a) {
    try {
      var u = new URL(a.getAttribute("href"), location.href);
      if (!u.searchParams.get("src")) u.searchParams.set("src", src);
      a.setAttribute("href", u.toString());
    } catch (e) {}
  });

  function visitorId() {
    var id = "";
    try { id = localStorage.getItem(VISITOR) || ""; } catch (e) {}
    if (!id) {
      id = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem(VISITOR, id); } catch (e) {}
    }
    return id;
  }

  try {
    fetch("https://app.kea.today/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "site_visit", src: src, visitor: visitorId() }),
      keepalive: true
    }).catch(function () {});
  } catch (e) {}
})();

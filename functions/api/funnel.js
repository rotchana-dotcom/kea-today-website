/**
 * POST/GET /api/funnel  (name avoids ad-blockers that filter "/track")
 * Query beacon: /api/funnel?type=play_tap&src=youtube
 */
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    }
  });
}

const STATS_REQ = new Request("https://www.kea.today/growth/__edge_summary_v1");

function emptySum() {
  return { clicks: 0, readings: 0, offers: 0, returns: 0, playTaps: 0, visits: 0, bySource: {}, updated: 0 };
}

async function readSum(cache) {
  const hit = await cache.match(STATS_REQ);
  if (!hit) return emptySum();
  try {
    return Object.assign(emptySum(), await hit.json());
  } catch {
    return emptySum();
  }
}

async function writeSum(cache, sum) {
  sum.updated = Date.now();
  await cache.put(
    STATS_REQ,
    new Response(JSON.stringify(sum), {
      headers: { "content-type": "application/json", "cache-control": "max-age=7776000" }
    })
  );
}

async function applyEvent(cache, event) {
  const sum = await readSum(cache);
  const src = event.src || "unknown";
  const type = event.type || "click";
  if (type === "click" || type === "play_tap") {
    sum.clicks += 1;
    if (type === "play_tap") sum.playTaps += 1;
    sum.bySource[src] = (sum.bySource[src] || 0) + 1;
  } else if (type === "reading") sum.readings += 1;
  else if (type === "offer_shown") sum.offers += 1;
  else if (type === "return") sum.returns += 1;
  else if (type === "visit") sum.visits += 1;
  await writeSum(cache, sum);
  return sum;
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, code: "402.1.3.0" }, 400);
  }
  const event = Object.assign({ ts: Date.now() }, body);
  let sum;
  try {
    sum = await applyEvent(caches.default, event);
  } catch {
    return json({ ok: false, code: "402.2.56.101" }, 500);
  }
  const webhook = context.env && context.env.SHEET_WEBHOOK;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event)
      });
    } catch {
      return json({ ok: true, code: "402.2.56.101", edge: true, sum: sum });
    }
  }
  return json({ ok: true, edge: true, store: "edge", sum: sum });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const type = url.searchParams.get("type");
  const src = url.searchParams.get("src");
  const cache = caches.default;
  if (type || src) {
    try {
      await applyEvent(cache, {
        ts: Date.now(),
        type: type || "play_tap",
        src: src || "website",
        campaign: url.searchParams.get("c") || ""
      });
    } catch {
      /* still return summary */
    }
  }
  const sum = await readSum(cache);
  const payload = Object.assign({ ok: true, store: "edge", code: null }, sum);
  const cb = url.searchParams.get("callback");
  if (cb && /^[A-Za-z_][A-Za-z0-9_]*$/.test(cb)) {
    return new Response(cb + "(" + JSON.stringify(payload) + ");", {
      status: 200,
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
  return json(payload);
}

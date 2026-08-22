/**
 * POST/GET /api/track
 * Always stores a 90-day summary in the edge cache so the dashboard is shared
 * without N97. Optional: SHEET_WEBHOOK, GROWTH_KV.
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

const STATS_REQ = new Request("https://kea.today/growth/__edge_summary_v1");

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
    return json({ ok: false, code: "402.1.3.0", message: "Invalid JSON" }, 400);
  }
  const event = Object.assign({ ts: Date.now() }, body);
  const cache = caches.default;
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
  try {
    await writeSum(cache, sum);
  } catch {
    return json({ ok: false, code: "402.2.56.101", note: "Edge summary write failed" }, 500);
  }

  const kv = context.env && context.env.GROWTH_KV;
  const webhook = context.env && context.env.SHEET_WEBHOOK;
  if (kv) {
    const key = "e:" + String(event.ts) + ":" + Math.random().toString(36).slice(2, 8);
    await kv.put(key, JSON.stringify(event), { expirationTtl: 90 * 24 * 3600 });
  }
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
  return json({ ok: true, edge: true, sheet: !!webhook, sum: sum });
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const sum = await readSum(cache);
  const connected = sum.clicks > 0 || sum.readings > 0 || sum.visits > 0;
  return json(
    Object.assign(
      {
        ok: true,
        connected: connected,
        code: connected ? null : "402.4.1.0",
        store: "edge"
      },
      sum
    )
  );
}

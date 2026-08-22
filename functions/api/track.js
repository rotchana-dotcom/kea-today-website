/** POST /api/track — Cloudflare Pages Function. Optional env: SHEET_WEBHOOK, GROWTH_KV */
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }
  });
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
  const kv = context.env && context.env.GROWTH_KV;
  const webhook = context.env && context.env.SHEET_WEBHOOK;
  if (kv) {
    const key = "e:" + String(event.ts) + ":" + Math.random().toString(36).slice(2, 8);
    await kv.put(key, JSON.stringify(event), { expirationTtl: 90 * 24 * 3600 });
    const sumRaw = await kv.get("summary");
    let sum = { clicks: 0, bySource: {} };
    try {
      if (sumRaw) sum = JSON.parse(sumRaw);
    } catch {}
    if (event.type === "click" || event.type === "play_tap") {
      sum.clicks = (sum.clicks || 0) + 1;
      const src = event.src || "unknown";
      sum.bySource[src] = (sum.bySource[src] || 0) + 1;
    }
    await kv.put("summary", JSON.stringify(sum));
  }
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event)
      });
    } catch {
      return json({ ok: false, code: "402.2.56.101", kv: !!kv });
    }
  }
  if (!webhook && !kv) {
    return json({ ok: true, code: "402.2.1.0", note: "Set SHEET_WEBHOOK or GROWTH_KV in Pages settings" });
  }
  return json({ ok: true });
}

export async function onRequestGet(context) {
  const kv = context.env && context.env.GROWTH_KV;
  if (!kv) return json({ ok: false, code: "402.2.1.0", note: "No GROWTH_KV binding" });
  const sumRaw = await kv.get("summary");
  if (!sumRaw) return json({ ok: true, clicks: 0, bySource: {}, code: "402.4.1.0" });
  return json(Object.assign({ ok: true }, JSON.parse(sumRaw)));
}

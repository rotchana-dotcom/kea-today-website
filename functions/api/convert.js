/**
 * POST /api/convert — Energy Today app (later) reports install / trial / purchase.
 * Body: { type, src, campaign, visitor, revenue }
 */
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
      "access-control-allow-methods": "POST, OPTIONS",
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
  body.type = body.type || "convert";
  const trackUrl = new URL("/api/track", context.request.url);
  const res = await fetch(trackUrl.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
}

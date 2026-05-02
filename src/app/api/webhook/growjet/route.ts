import { NextRequest, NextResponse } from "next/server";

/* ──────────────────────────────────────────────────────────────
 * Growjet webhook — log & ack only.
 *
 * Payload shapes supported:
 *
 *   1) order_status_update
 *      { webhook_type, order_id, status, timestamp }
 *
 *   2) delivery_coordinates
 *      { webhook_type, order_id, coordinates: { lat, lon }, timestamp }
 *
 * Returns { ok: true, ... } on success, { ok: false, error } on bad input.
 * No DB writes — this endpoint only validates the shape and logs.
 * ────────────────────────────────────────────────────────────── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return bad("Body must be a JSON object");
  }

  const payload = body as Record<string, unknown>;
  const type = payload.webhook_type;

  console.log("[growjet-webhook] headers:", JSON.stringify(headers));
  console.log("[growjet-webhook] type:", type);
  console.log("[growjet-webhook] body:", JSON.stringify(payload));

  if (typeof type !== "string") {
    return bad("webhook_type is required");
  }

  if (type === "order_status_update") {
    const order_id = payload.order_id;
    const status = payload.status;
    if (typeof order_id !== "string" || !UUID_RE.test(order_id)) {
      return bad("order_id must be a UUID string");
    }
    if (typeof status !== "string" || !status.trim()) {
      return bad("status must be a non-empty string");
    }
    return NextResponse.json({
      ok: true,
      webhook_type: "order_status_update",
      order_id,
      status,
      timestamp: payload.timestamp ?? null,
    });
  }

  if (type === "delivery_coordinates") {
    const order_id = payload.order_id;
    const coordinates = payload.coordinates;
    if (typeof order_id !== "string" || !UUID_RE.test(order_id)) {
      return bad("order_id must be a UUID string");
    }
    if (!coordinates || typeof coordinates !== "object" || Array.isArray(coordinates)) {
      return bad("coordinates must be an object { lat, lon }");
    }
    const c = coordinates as Record<string, unknown>;
    const lat = Number(c.lat);
    const lon = Number(c.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return bad("coordinates.lat must be a number between -90 and 90");
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      return bad("coordinates.lon must be a number between -180 and 180");
    }
    return NextResponse.json({
      ok: true,
      webhook_type: "delivery_coordinates",
      order_id,
      coordinates: { lat, lon },
      timestamp: payload.timestamp ?? null,
    });
  }

  return bad(`Unknown webhook_type: ${type}`);
}

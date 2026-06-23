import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";

/* ──────────────────────────────────────────────────────────────
 * Menuthere Delivery Pool — inbound webhook.
 *
 * The pool's order-service POSTs lifecycle events here:
 *   delivery.created | delivery.status_changed | delivery.no_rider_found
 * Payload: { event, delivery_order_id, source_order_id?, status?, rider_id?, occurred_at }
 *
 * We mirror the pool's state into orders.delivery_provider_state so the
 * existing admin/order UIs reflect it. Order.status is left to the normal
 * partner flow (mapping delivered -> completed can be added later).
 *
 * Signed with HMAC (X-Signature: sha256=<hex>) when DELIVERY_POOL_WEBHOOK_SECRET
 * is set (must match the pool's CRAVINGS_WEBHOOK_SECRET); unset = skip (dev).
 * ────────────────────────────────────────────────────────────── */

const UPDATE_BY_SOURCE = `
  mutation PoolWebhookBySource($id: uuid!, $state: String!, $now: timestamptz!) {
    update_orders_by_pk(
      pk_columns: { id: $id },
      _set: { delivery_provider_state: $state, delivery_provider_last_event_at: $now }
    ) { id }
  }
`;

const UPDATE_BY_POOL_ID = `
  mutation PoolWebhookByPoolId($poolId: String!, $state: String!, $now: timestamptz!) {
    update_orders(
      where: { delivery_provider_order_id: { _eq: $poolId }, delivery_provider: { _eq: "menuthere_pool" } },
      _set: { delivery_provider_state: $state, delivery_provider_last_event_at: $now }
    ) { affected_rows }
  }
`;

// Mirror the pool lifecycle onto the cravings order.status.
const SET_ORDER_STATUS_BY_SOURCE = `
  mutation PoolOrderStatusBySource($id: uuid!, $status: String!) {
    update_orders_by_pk(pk_columns: { id: $id }, _set: { status: $status }) { id }
  }
`;
const SET_ORDER_STATUS_BY_POOL_ID = `
  mutation PoolOrderStatusByPoolId($poolId: String!, $status: String!) {
    update_orders(
      where: { delivery_provider_order_id: { _eq: $poolId }, delivery_provider: { _eq: "menuthere_pool" } },
      _set: { status: $status }
    ) { affected_rows }
  }
`;
// pool rider state → cravings order status
const POOL_TO_ORDER_STATUS: Record<string, string> = {
  picked_up: "dispatched",
  delivered: "completed",
};

// Store the assigned rider's contact into delivery_provider_meta (for the rider card).
const APPEND_META_BY_SOURCE = `
  mutation PoolMetaBySource($id: uuid!, $meta: jsonb!) {
    update_orders_by_pk(pk_columns: { id: $id }, _append: { delivery_provider_meta: $meta }) { id }
  }
`;
const APPEND_META_BY_POOL_ID = `
  mutation PoolMetaByPoolId($poolId: String!, $meta: jsonb!) {
    update_orders(
      where: { delivery_provider_order_id: { _eq: $poolId }, delivery_provider: { _eq: "menuthere_pool" } },
      _append: { delivery_provider_meta: $meta }
    ) { affected_rows }
  }
`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function verify(raw: string, sig: string | null): boolean {
  const secret = process.env.DELIVERY_POOL_WEBHOOK_SECRET;
  if (!secret) return true; // dev: no secret configured -> accept
  if (!sig) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verify(raw, req.headers.get("x-signature"))) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const event = String(payload.event ?? "");
  const state = String(
    payload.status ?? (event === "delivery.no_rider_found" ? "no_rider" : event),
  );
  const sourceId = typeof payload.source_order_id === "string" ? payload.source_order_id : null;
  const poolId = typeof payload.delivery_order_id === "string" ? payload.delivery_order_id : null;
  const now = new Date().toISOString();

  console.log("[delivery-pool-webhook]", event, JSON.stringify(payload));
  try {
    if (sourceId && UUID_RE.test(sourceId)) {
      await fetchFromHasura(UPDATE_BY_SOURCE, { id: sourceId, state, now });
    } else if (poolId) {
      await fetchFromHasura(UPDATE_BY_POOL_ID, { poolId, state, now });
    }
    // Advance the cravings order status: picked_up → dispatched, delivered → completed.
    const mappedStatus = POOL_TO_ORDER_STATUS[String(payload.status ?? "")];
    if (mappedStatus) {
      if (sourceId && UUID_RE.test(sourceId)) {
        await fetchFromHasura(SET_ORDER_STATUS_BY_SOURCE, { id: sourceId, status: mappedStatus });
      } else if (poolId) {
        await fetchFromHasura(SET_ORDER_STATUS_BY_POOL_ID, { poolId, status: mappedStatus });
      }
    }
    // Persist the assigned rider's contact so the order UIs can show a rider card.
    if (payload.rider_name) {
      const riderMeta = {
        riderName: payload.rider_name,
        riderPhone: payload.rider_phone ?? null,
        riderVehicle: payload.rider_vehicle ?? null,
      };
      if (sourceId && UUID_RE.test(sourceId)) {
        await fetchFromHasura(APPEND_META_BY_SOURCE, { id: sourceId, meta: riderMeta });
      } else if (poolId) {
        await fetchFromHasura(APPEND_META_BY_POOL_ID, { poolId, meta: riderMeta });
      }
    }
  } catch (err) {
    console.warn("[delivery-pool-webhook] update failed:", err);
  }
  return NextResponse.json({ ok: true });
}

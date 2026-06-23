"use server";

/**
 * Menuthere Delivery Pool — dispatch wrapper, modeled on porterBridge.ts.
 *
 * Fires on the `accepted` transition (gated by feature_flags `delivery_pool-true`)
 * for real delivery orders. Hands the order to the pool's order-service and
 * persists the pool's response (delivery order id, tracking url, pickup/drop OTPs,
 * fee) into delivery_provider_* so the existing admin/order UIs can show it.
 *
 * Per-partner OTP toggles live in partners.delivery_rules.pool_pickup_otp /
 * .pool_drop_otp (jsonb; default off). Fire-and-forget from the caller.
 */

import { fetchFromHasura } from "@/lib/hasuraClient";
import { notifyDeliveryPoolOrderReady, cancelDeliveryPoolOrder } from "@/lib/deliveryPool";

type Result =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status?: number; message: string };

interface OrderForPool {
  id: string;
  total_price: number;
  type: string;
  delivery_address: string | null;
  phone: string | null;
  partner_id: string;
  display_id: number | null;
  user: { phone: string | null; full_name: string | null } | null;
  delivery_location: { coordinates: [number, number] } | null;
  partner: {
    store_name: string | null;
    geo_location: { coordinates: [number, number] } | null;
    feature_flags: string | null;
    delivery_rules: { pool_pickup_otp?: unknown; pool_drop_otp?: unknown } | null;
  } | null;
}

const ORDER_FOR_POOL_QUERY = `
  query OrderForPool($id: uuid!) {
    orders_by_pk(id: $id) {
      id total_price type delivery_address phone partner_id display_id
      user { phone full_name }
      delivery_location
      partner { store_name geo_location feature_flags delivery_rules }
    }
  }
`;

const PERSIST_POOL_MUTATION = `
  mutation PersistPoolState($id: uuid!, $state: String!, $orderId: String, $meta: jsonb!, $now: timestamptz!) {
    update_orders_by_pk(
      pk_columns: { id: $id },
      _set: {
        delivery_provider: "menuthere_pool",
        delivery_provider_state: $state,
        delivery_provider_order_id: $orderId,
        delivery_provider_last_event_at: $now
      },
      _append: { delivery_provider_meta: $meta }
    ) { id }
  }
`;

function extractLatLng(
  geo: { coordinates: [number, number] } | null | undefined,
): { lat: number; lng: number } | null {
  if (!geo || !Array.isArray(geo.coordinates) || geo.coordinates.length !== 2) return null;
  const [lng, lat] = geo.coordinates;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

async function persistPool(
  orderId: string,
  state: string,
  poolOrderId: string | null,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await fetchFromHasura(PERSIST_POOL_MUTATION, {
      id: orderId,
      state,
      orderId: poolOrderId,
      meta,
      now: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[delivery-pool] persist failed:", err);
  }
}

export async function dispatchDeliveryPool(orderId: string): Promise<Result> {
  if (!orderId) return { ok: false, message: "orderId required" };

  let order: OrderForPool;
  try {
    const data = await fetchFromHasura(ORDER_FOR_POOL_QUERY, { id: orderId });
    order = data.orders_by_pk as OrderForPool;
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }
  if (!order) return { ok: false, message: `order ${orderId} not found` };
  if (!order.partner) return { ok: false, message: `partner missing on order ${orderId}` };
  if (!order.partner.feature_flags?.includes("delivery_pool-true")) {
    return { ok: false, status: 404, message: "delivery_pool not enabled" };
  }

  const pickup = extractLatLng(order.partner.geo_location);
  const drop = extractLatLng(order.delivery_location);
  if (!pickup) {
    await persistPool(orderId, "failed", null, { error: "partner.geo_location missing — no pickup coords" });
    return { ok: false, message: "partner geo_location missing" };
  }
  if (!drop) {
    await persistPool(orderId, "failed", null, { error: "order.delivery_location missing — no drop coords" });
    return { ok: false, message: "order delivery_location missing" };
  }

  const dr = order.partner.delivery_rules;
  const res = await notifyDeliveryPoolOrderReady({
    source_order_id: order.id,
    restaurant_id: order.partner_id,
    pickup,
    drop,
    drop_address: order.delivery_address ?? undefined,
    customer: {
      name: order.user?.full_name ?? undefined,
      phone: order.user?.phone ?? order.phone ?? undefined,
    },
    order_value: order.total_price,
    assignment_mode: "auto",
    require_pickup_otp: dr?.pool_pickup_otp === true,
    require_drop_otp: dr?.pool_drop_otp === true,
  });
  if (!res.ok) {
    await persistPool(orderId, "failed", null, { error: "delivery pool notify failed" });
    return { ok: false, message: "delivery pool notify failed" };
  }

  await persistPool(orderId, "searching", res.deliveryOrderId ?? null, {
    trackingUrl: res.trackingUrl ?? null,
    pickupOtp: res.pickupOtp ?? null,
    dropOtp: res.dropOtp ?? null,
    distanceKm: res.distanceKm ?? null,
    deliveryFee: res.deliveryFee ?? null,
    pool: true,
  });
  return { ok: true, data: { deliveryOrderId: res.deliveryOrderId, trackingUrl: res.trackingUrl } };
}

export async function cancelDeliveryPoolDispatch(
  orderId: string,
  reason?: string,
  cancelledBy?: string,
): Promise<Result> {
  if (!orderId) return { ok: false, message: "orderId required" };
  let row: { delivery_provider?: string | null; cancel_reason?: string | null; cancelled_by?: string | null } | null = null;
  try {
    const data = await fetchFromHasura(
      `query GetPoolProvider($id: uuid!) { orders_by_pk(id: $id) { delivery_provider cancel_reason cancelled_by } }`,
      { id: orderId },
    );
    row = data.orders_by_pk ?? null;
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }
  if (row?.delivery_provider !== "menuthere_pool") {
    return { ok: false, status: 404, message: "no delivery-pool order" };
  }

  // Prefer the order's real cancel reason/who (set by the cancel dialog) over the args.
  const finalReason = row?.cancel_reason || reason || "cancelled";
  const rawBy = (cancelledBy || row?.cancelled_by || "").toLowerCase();
  const who = rawBy.includes("user") || rawBy.includes("customer") ? "customer" : "restaurant";

  await cancelDeliveryPoolOrder(orderId, finalReason, who);
  await persistPool(orderId, "cancelled", null, {
    cancelledReason: finalReason,
    cancelledBy: who,
    cancelledAt: new Date().toISOString(),
  });
  return { ok: true, data: {} };
}

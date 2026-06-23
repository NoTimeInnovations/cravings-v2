// Menuthere Delivery Pool integration.
//
// Hands a ready order to the Delivery Pool service and (optionally) cancels it.
// Design goals: SAFE to call from existing flows —
//   - env-gated: a no-op unless DELIVERY_POOL_URL is set
//   - fire-and-forget: never throws into the caller (errors are logged)
//   - HMAC-signed when DELIVERY_POOL_HMAC_SECRET is set
//
// Env:
//   DELIVERY_POOL_URL=https://delivery.menuthere.com   (order-service base)
//   DELIVERY_POOL_HMAC_SECRET=<shared secret>          (matches INTEGRATION_HMAC_SECRET)
//
// See DELIVERY_POOL_INTEGRATION.md for where to call this.
import { createHmac } from "crypto";

export interface DeliveryPoolOrderInput {
  source_order_id: string;
  restaurant_id: string;
  pickup: { lat: number; lng: number };
  drop: { lat: number; lng: number };
  drop_address?: string;
  customer?: { name?: string; phone?: string };
  items_summary?: unknown;
  order_value?: number;
  assignment_mode?: "auto" | "manual";
  require_pickup_otp?: boolean;
  require_drop_otp?: boolean;
}

export interface DeliveryPoolOrderResult {
  ok: boolean;
  deliveryOrderId?: string;
  trackingUrl?: string;
  pickupOtp?: string | null;
  dropOtp?: string | null;
  distanceKm?: number | null;
  deliveryFee?: number | null;
}

function sign(body: string): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const secret = process.env.DELIVERY_POOL_HMAC_SECRET;
  if (secret) {
    headers["x-signature"] = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  }
  return headers;
}

export async function notifyDeliveryPoolOrderReady(
  input: DeliveryPoolOrderInput,
): Promise<DeliveryPoolOrderResult> {
  const baseUrl = process.env.DELIVERY_POOL_URL;
  if (!baseUrl) return { ok: false }; // integration disabled

  const body = JSON.stringify(input);
  try {
    const res = await fetch(`${baseUrl}/delivery/v1/integration/orders`, {
      method: "POST",
      headers: sign(body),
      body,
    });
    if (!res.ok) {
      console.error("[deliveryPool] notify failed:", res.status, await res.text().catch(() => ""));
      return { ok: false };
    }
    const data = (await res.json()) as {
      delivery_order_id?: string;
      tracking_url?: string;
      pickup_otp?: string | null;
      drop_otp?: string | null;
      distance_km?: number | null;
      delivery_fee?: number | null;
    };
    return {
      ok: true,
      deliveryOrderId: data.delivery_order_id,
      trackingUrl: data.tracking_url,
      pickupOtp: data.pickup_otp ?? null,
      dropOtp: data.drop_otp ?? null,
      distanceKm: data.distance_km ?? null,
      deliveryFee: data.delivery_fee ?? null,
    };
  } catch (err) {
    console.error("[deliveryPool] notify error:", err);
    return { ok: false };
  }
}

export async function cancelDeliveryPoolOrder(
  sourceOrderId: string,
  reason?: string,
): Promise<void> {
  const baseUrl = process.env.DELIVERY_POOL_URL;
  if (!baseUrl) return;
  const body = JSON.stringify({ reason });
  try {
    await fetch(
      `${baseUrl}/delivery/v1/integration/orders/${encodeURIComponent(sourceOrderId)}/cancel`,
      { method: "POST", headers: sign(body), body },
    );
  } catch (err) {
    console.error("[deliveryPool] cancel error:", err);
  }
}

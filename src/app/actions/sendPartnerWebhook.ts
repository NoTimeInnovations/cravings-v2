"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  deliverWebhook,
  parseWebhookSettings,
  type WebhookEvent,
  type OrderStatusPayload,
  type PaymentStatusPayload,
  type DeliveryStatusPayload,
} from "@/lib/webhooks/orderWebhook";

/**
 * Dispatcher for the non-creation order events.
 *
 * One entry point rather than three near-identical actions: every event needs
 * the same partner lookup, the same "is it even configured" exit, and the same
 * fire-and-forget contract, and three copies of that would drift.
 *
 * Every function here is fire-and-forget by contract — a partner's endpoint must
 * never be able to fail a status change made by their own staff.
 */

const Q_ORDER = `
  query OrderForEvent($id: uuid!) {
    orders_by_pk(id: $id) {
      id
      display_id
      status
      type
      total_price
      is_paid
      payment_method
      delivery_provider
      delivery_provider_meta
      partner_id
      partner { currency webhook_settings }
    }
  }
`;

type OrderRow = {
  id: string;
  partner_id: string | null;
  display_id: number | string | null;
  status: string | null;
  type: string | null;
  total_price: number | null;
  is_paid: boolean | null;
  payment_method: string | null;
  delivery_provider: string | null;
  delivery_provider_meta: Record<string, unknown> | null;
  partner: { currency: string | null; webhook_settings: unknown } | null;
};

/** Load the order and bail early when this partner has no webhook configured —
 *  which is the case for nearly every order, so it must cost one query and stop. */
async function loadIfConfigured(orderId: string) {
  if (!orderId) return null;
  try {
    const res: any = await fetchFromHasura(Q_ORDER, { id: orderId });
    const order: OrderRow | undefined = res?.orders_by_pk;
    if (!order) return null;
    const settings = parseWebhookSettings(order.partner?.webhook_settings);
    if (!settings.enabled || !settings.url) return null;
    return { order, settings };
  } catch (e) {
    console.warn("[webhook] order lookup failed:", e);
    return null;
  }
}

async function fire(
  orderId: string,
  event: WebhookEvent,
  build: (o: OrderRow) => unknown,
  /** Included in the delivery id so a receiver de-duplicating on `id` still sees
   *  each DISTINCT transition. Keying on the order alone would collapse
   *  "accepted" and "completed" into one and silently drop the second. */
  discriminator: string,
): Promise<void> {
  const found = await loadIfConfigured(orderId);
  if (!found) return;
  const result = await deliverWebhook(
    found.settings,
    event,
    build(found.order),
    `${event}:${orderId}:${discriminator}`,
    { partnerId: found.order.partner_id, orderId },
  );
  if (!result.ok) {
    console.warn(`[webhook] ${event} ${orderId} failed:`, result.error ?? result.status);
  }
}

/** Fired when an order's status changes (accepted, food_ready, completed, …). */
export async function sendOrderStatusWebhook(
  orderId: string,
  newStatus: string,
  previousStatus?: string | null,
): Promise<void> {
  await fire(
    orderId,
    "order.status_updated",
    (o): OrderStatusPayload => ({
      order_id: o.id,
      order_number: o.display_id ?? null,
      previous_status: previousStatus ?? null,
      status: newStatus,
      type: o.type ?? null,
      changed_at: new Date().toISOString(),
    }),
    newStatus,
  );
}

/** Fired when an order is marked paid, or its payment method is recorded/changed. */
export async function sendPaymentStatusWebhook(orderId: string): Promise<void> {
  const found = await loadIfConfigured(orderId);
  if (!found) return;
  const o = found.order;
  const payload: PaymentStatusPayload = {
    order_id: o.id,
    order_number: o.display_id ?? null,
    is_paid: !!o.is_paid,
    payment_method: o.payment_method ?? null,
    grand_total: o.total_price ?? null,
    currency: o.partner?.currency ?? null,
    changed_at: new Date().toISOString(),
  };
  // Keyed on the payment STATE, not a timestamp: "became paid" and "method
  // changed cash -> upi" are genuinely different events and must both arrive,
  // while re-saving the same state twice is a duplicate a receiver should drop.
  // A timestamp here would make every repeat look new and defeat de-duplication.
  const result = await deliverWebhook(
    found.settings,
    "payment.status_updated",
    payload,
    `payment.status_updated:${orderId}:${payload.is_paid ? "paid" : "unpaid"}:${payload.payment_method ?? "none"}`,
    { partnerId: found.order.partner_id, orderId },
  );
  if (!result.ok) {
    console.warn(`[webhook] payment.status_updated ${orderId} failed:`, result.error ?? result.status);
  }
}

/** Fired when a rider is assigned or their delivery state changes. */
export async function sendDeliveryStatusWebhook(
  orderId: string,
  status: string,
  driver?: { name?: string | null; phone?: string | null; vehicleNumber?: string | null } | null,
  trackingUrl?: string | null,
): Promise<void> {
  await fire(
    orderId,
    "delivery.status_updated",
    (o): DeliveryStatusPayload => ({
      order_id: o.id,
      order_number: o.display_id ?? null,
      status,
      provider: o.delivery_provider ?? null,
      driver: driver
        ? {
            name: driver.name ?? null,
            phone: driver.phone ?? null,
            vehicle_number: driver.vehicleNumber ?? null,
          }
        : null,
      tracking_url: trackingUrl ?? null,
      changed_at: new Date().toISOString(),
    }),
    status,
  );
}

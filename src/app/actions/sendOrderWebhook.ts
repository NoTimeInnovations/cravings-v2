"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  deliverWebhook,
  parseWebhookSettings,
  type OrderWebhookPayload,
} from "@/lib/webhooks/orderWebhook";

/**
 * Fire the `order.created` webhook for one order.
 *
 * Server-side because the signing secret must never reach the browser, and
 * because the customer's device may navigate away the instant the order is
 * placed.
 *
 * Reads the order back from Hasura rather than accepting a payload from the
 * caller: the client's in-memory cart has already been adjusted, rounded and
 * discounted by several layers, and a POS that reconciles against our numbers
 * needs the values we actually STORED, not the ones a browser believed.
 */

const Q_ORDER = `
  query OrderForWebhook($id: uuid!) {
    orders_by_pk(id: $id) {
      id
      display_id
      status
      type
      created_at
      total_price
      gst_included
      delivery_charge
      packing_charge
      discounts
      notes
      phone
      delivery_address
      table_number
      table_name
      payment_method
      is_paid
      partner_id
      partner {
        currency
        webhook_settings
      }
      order_items {
        quantity
        item
        menu { name price }
      }
    }
  }
`;

const numberOrNull = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function sendOrderWebhook(orderId: string): Promise<{ ok: boolean; error?: string }> {
  if (!orderId) return { ok: false, error: "no orderId" };

  let order: any;
  try {
    const res: any = await fetchFromHasura(Q_ORDER, { id: orderId });
    order = res?.orders_by_pk;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "order lookup failed" };
  }
  if (!order) return { ok: false, error: "order not found" };

  const settings = parseWebhookSettings(order.partner?.webhook_settings);
  // Cheapest possible exit for the overwhelming majority of partners, who have
  // no webhook configured — checked before any payload is built.
  if (!settings.enabled || !settings.url) return { ok: false, error: "not configured" };

  const items = (order.order_items || []).map((row: any) => {
    // The `item` snapshot is the price the customer was actually charged; the
    // live menu row may have changed since. Snapshot wins, menu is the fallback.
    const unit = numberOrNull(row.item?.price ?? row.menu?.price) ?? 0;
    const qty = Number(row.quantity) || 0;
    return {
      name: row.item?.name || row.menu?.name || "",
      quantity: qty,
      unit_price: unit,
      total_price: Number((unit * qty).toFixed(2)),
      variant: row.item?.variantSelections?.[0]?.name ?? row.item?.variant ?? null,
      notes: row.item?.notes ?? null,
    };
  });

  const discounts = Array.isArray(order.discounts) ? order.discounts : [];
  const discountTotal = discounts.reduce(
    (sum: number, d: any) => sum + (numberOrNull(d?.amount) ?? 0),
    0,
  );
  const grand = numberOrNull(order.total_price);
  const gst = numberOrNull(order.gst_included);
  const delivery = numberOrNull(order.delivery_charge);
  const packing = numberOrNull(order.packing_charge);
  // Subtotal is derived, not stored: total_price is the grand total, so the food
  // component is what remains once the add-ons are taken back off.
  const subtotal =
    grand === null
      ? null
      : Number((grand - (gst ?? 0) - (delivery ?? 0) - (packing ?? 0) + discountTotal).toFixed(2));

  const payload: OrderWebhookPayload = {
    order_id: order.id,
    order_number: order.display_id ?? null,
    status: order.status ?? null,
    type: order.type ?? null,
    placed_at: order.created_at,
    currency: order.partner?.currency ?? null,
    totals: {
      subtotal,
      delivery_charge: delivery,
      packing_charge: packing,
      gst,
      discount: discountTotal || null,
      grand_total: grand,
    },
    customer: {
      name: order.item?.customerName ?? null,
      phone: order.phone ?? null,
      address: order.delivery_address ?? null,
    },
    table:
      order.table_number || order.table_name
        ? { number: numberOrNull(order.table_number), name: order.table_name ?? null }
        : null,
    items,
    notes: order.notes ?? null,
    payment: { method: order.payment_method ?? null, is_paid: !!order.is_paid },
  };

  // Delivery id is derived from the order + event, so a repeat call for the same
  // order carries the SAME id and a partner keying on it can drop the duplicate.
  const result = await deliverWebhook(settings, "order.created", payload, `order.created:${order.id}`);
  if (!result.ok) {
    console.warn(`[webhook] order.created ${orderId} failed:`, result.error ?? result.status);
  }
  return { ok: result.ok, error: result.error };
}

"use server";

import { deliverWebhook, type OrderWebhookPayload } from "@/lib/webhooks/orderWebhook";

/**
 * "Send test event" from Webhook settings.
 *
 * Takes the url/secret from the FORM rather than the saved row, so a partner can
 * iterate on a broken endpoint without having to save a bad config first — the
 * whole point of a test button is the loop being short.
 *
 * `enabled: true` is forced: an explicit click is the consent, and requiring the
 * toggle to be on first would mean saving a live webhook just to test it.
 *
 * The payload mirrors a real order.created exactly, so the partner's real code
 * path is exercised — but the envelope carries `test: true` and obviously-fake
 * values, because a test indistinguishable from a real order would put a ticket
 * in someone's kitchen.
 *
 * Note on the shape of this action: it POSTs to a URL supplied by the caller, so
 * it is a request-proxy primitive. isSafeWebhookUrl (inside deliverWebhook)
 * confines it to public https hosts, and the body is a fixed sample signed with
 * the caller's own secret, so it cannot be used to reach anything internal or to
 * forge a payload of the caller's choosing.
 */

const SAMPLE: OrderWebhookPayload = {
  order_id: "00000000-0000-4000-8000-000000000000",
  order_number: 0,
  status: "pending",
  type: "delivery",
  placed_at: new Date(0).toISOString(),
  currency: "₹",
  totals: {
    subtotal: 520,
    delivery_charge: 40,
    packing_charge: 10,
    gst: 26,
    discount: 50,
    grand_total: 546,
  },
  customer: {
    name: "Test Customer",
    phone: "0000000000",
    address: "This is a test event from Menuthere settings",
  },
  table: null,
  items: [
    {
      name: "Test Item",
      quantity: 2,
      unit_price: 200,
      total_price: 400,
      variant: null,
      notes: "This is a test event — do not prepare",
    },
    {
      name: "Another Test Item",
      quantity: 4,
      unit_price: 30,
      total_price: 120,
      variant: null,
      notes: null,
    },
  ],
  notes: "Test event — safe to ignore",
  payment: { method: "upi", is_paid: true },
};

export async function sendTestWebhook(
  url: string,
  secret: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const result = await deliverWebhook(
    { enabled: true, url, secret },
    "order.created",
    SAMPLE,
    // Timestamped so repeated tests are distinct deliveries — otherwise a
    // partner who is correctly de-duplicating on `id` would silently drop every
    // test after the first and think their endpoint had stopped working.
    `test:${Date.now()}`,
    { test: true },
  );
  return result;
}

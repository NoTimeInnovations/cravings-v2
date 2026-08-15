"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { restockOrderStock } from "@/app/actions/restockOrder";
import {
  dayInvoiceNumbersQuery,
  isInvoiceNoTaken,
  nextRealInvoiceNo,
  parseRealInvoiceNo,
  storeDayBounds,
} from "@/lib/invoiceNumber";

// Partner push-notification server (same one the client Notification helper
// uses). We notify inline here instead of importing the client-only
// `Notification` helper from notification.ts ("use client"), whose exports are
// undefined when imported into a server module.
const NOTIFICATION_BASE_URL = "https://notification-server-khaki.vercel.app";

const GET_PARTNER_DEVICE_TOKENS = `
  query GetPartnerDeviceTokens($partnerId: String!) {
    device_tokens(where: { user_id: { _eq: $partnerId } }, order_by: { created_at: desc }, limit: 5) {
      device_token
    }
  }
`;

async function notifyPartnerNewOrder(
  partnerId: string,
  orderId: string,
  items: Array<{ name: string; quantity: number }>,
) {
  const { device_tokens } = await fetchFromHasura(GET_PARTNER_DEVICE_TOKENS, { partnerId });
  const tokens = (device_tokens || []).map((t: { device_token: string }) => t.device_token);
  if (tokens.length === 0) return;

  const itemsDesc = items.map((i) => `${i.name} x ${i.quantity}`).join(", ");
  const message = {
    tokens,
    notification: { title: "New Order Of", body: `You have a new order of ${itemsDesc}` },
    android: {
      priority: "high" as const,
      notification: { icon: "ic_stat_logo", channelId: "cravings_channel_1", sound: "custom_sound" },
    },
    apns: {
      headers: { "apns-priority": "10" },
      payload: { aps: { sound: "custom_sound.caf", contentAvailable: true } },
    },
    data: {
      url: "https://menuthere.com",
      channel_id: "cravings_channel_1",
      sound: "custom_sound.caf",
      order_id: orderId,
    },
  };

  const res = await fetch(`${NOTIFICATION_BASE_URL}/api/notifications/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, partner_id: partnerId }),
  });
  if (!res.ok) console.error("[finalizeCfOrder] notification server returned", res.status);
}

/**
 * Finalization of online (Cashfree) orders.
 *
 * The order is inserted as `status="pending_payment"` BEFORE the customer pays
 * (so it's never lost if they don't return to the app). Exactly one of three
 * independent triggers then finalizes it:
 *   - the Cashfree PAYMENT_SUCCESS webhook (server-to-server, customer-agnostic)
 *   - the customer returning to the app and verifying
 *   - the reconciler cron (backstop for missed webhooks)
 *
 * `finalizeCfOrder` is idempotent: it atomically CLAIMS the order by stamping
 * `cf_finalized_at` (conditional on it being null), so only the first caller
 * does the side-effects (Petpooja push + partner notification). If a side
 * effect that actually delivers the order to the kitchen (the Petpooja push)
 * fails, the claim is RELEASED so a later trigger retries.
 *
 * This is also where the order stops being a draft and earns a real invoice
 * number — see issueRealInvoiceNo below.
 */

const FINALIZE_CLAIM = `
  mutation FinalizeCfOrderClaim($id: uuid!, $now: timestamptz!, $cf_payment_id: String) {
    update_orders(
      where: { id: { _eq: $id }, cf_finalized_at: { _is_null: true } },
      _set: {
        cf_finalized_at: $now,
        payment_status: "paid",
        is_paid: true,
        status: "pending",
        cashfree_payment_id: $cf_payment_id
      }
    ) {
      affected_rows
      returning {
        id
        partner_id
        cf_pp_payload
        created_at
        display_id
        partner { timezone }
        order_items { quantity item }
      }
    }
  }
`;

const SET_INVOICE_NO = `
  mutation SetOrderInvoiceNo($id: uuid!, $display_id: String!, $cf_pp_payload: jsonb) {
    update_orders_by_pk(
      pk_columns: { id: $id },
      _set: { display_id: $display_id, cf_pp_payload: $cf_pp_payload }
    ) { id }
  }
`;

/**
 * Trade the order's draft number ("D7") for a real invoice number.
 *
 * A draft is inserted before the customer pays and most drafts are never paid,
 * so numbering one out of the partner's 1, 2, 3 sequence left a permanent gap in
 * their day. Drafts are numbered "D1, D2, …" instead, and the real number is
 * issued here — the first moment the order is an order.
 *
 * Numbered in the sequence of the day it was PLACED, not the day the payment
 * happened to land: `created_at` is what the dashboard sorts and groups by, so a
 * payment confirming just after midnight must still fall in the day the partner
 * sees it under.
 *
 * Mutates `order` in place so the caller pushes the corrected Petpooja payload.
 * Returns null if numbering failed — a paid order with a stale draft number is
 * far better than a failed finalization.
 */
async function issueRealInvoiceNo(order: any): Promise<string | null> {
  try {
    const { from, to } = storeDayBounds(
      order?.partner?.timezone ?? null,
      new Date(order?.created_at || Date.now()),
    );
    const { orders } = await fetchFromHasura(dayInvoiceNumbersQuery, {
      partnerId: order.partner_id,
      from,
      to,
    });
    const rows = orders || [];

    // Already carrying a real number, and nothing else holds it: either a retry
    // after a released claim (renumbering would walk the order up the sequence
    // once per attempt), or a draft placed before drafts had their own "D"
    // namespace, whose number is still free. Keep it either way.
    const existing = parseRealInvoiceNo(order?.display_id);
    if (existing !== null && !isInvoiceNoTaken(rows, existing, order.id)) {
      return String(existing);
    }

    const invoiceNo = String(nextRealInvoiceNo(rows));

    // The Petpooja payload was built at draft time and carries the "D7" number;
    // the POS has to show the real one. Null here only when the order already
    // had no payload, so writing null back is a no-op rather than a wipe.
    const payload = order?.cf_pp_payload
      ? { ...order.cf_pp_payload, display_id: invoiceNo }
      : null;

    await fetchFromHasura(SET_INVOICE_NO, {
      id: order.id,
      display_id: invoiceNo,
      cf_pp_payload: payload,
    });

    order.display_id = invoiceNo;
    if (payload) order.cf_pp_payload = payload;
    return invoiceNo;
  } catch (e: any) {
    console.error(
      `[finalizeCfOrder] invoice numbering failed order=${order?.id} (order still finalized):`,
      e?.message || e,
    );
    return null;
  }
}

const RELEASE_CLAIM = `
  mutation ReleaseCfOrderClaim($id: uuid!) {
    update_orders_by_pk(pk_columns: { id: $id }, _set: { cf_finalized_at: null }) { id }
  }
`;

export type FinalizeResult = {
  ok: boolean;
  alreadyFinalized?: boolean;
  notFound?: boolean;
  pushedToPetpooja?: boolean;
  error?: string;
};

export async function finalizeCfOrder(
  orderId: string,
  cfPaymentId?: string | null,
): Promise<FinalizeResult> {
  // Atomically claim the order. affected_rows === 0 means another trigger
  // already finalized it (or it doesn't exist) — a no-op success.
  const now = new Date().toISOString();
  let claim: any;
  try {
    claim = await fetchFromHasura(FINALIZE_CLAIM, {
      id: orderId,
      now,
      cf_payment_id: cfPaymentId || null,
    });
  } catch (e: any) {
    console.error(`[finalizeCfOrder] claim failed order=${orderId}:`, e?.message || e);
    return { ok: false, error: e?.message || "claim failed" };
  }

  const affected = claim?.update_orders?.affected_rows ?? 0;
  const order = claim?.update_orders?.returning?.[0];

  if (affected === 0) {
    // Either already finalized (idempotent ack) or the row doesn't exist yet
    // (e.g. webhook arrived before createPendingCfOrder committed — Cashfree
    // will retry).
    console.log(`[finalizeCfOrder] no-op order=${orderId} (already finalized or not yet created)`);
    return { ok: true, alreadyFinalized: true };
  }

  console.log(
    `[finalizeCfOrder] claimed order=${orderId} partner=${order?.partner_id} petpooja=${!!order?.cf_pp_payload}`,
  );

  // Before the Petpooja push: the payload still carries the draft number, and
  // the POS must receive the invoice number the partner will print.
  const invoiceNo = await issueRealInvoiceNo(order);
  if (invoiceNo) {
    console.log(`[finalizeCfOrder] invoice no ${invoiceNo} issued order=${orderId}`);
  }

  let pushedToPetpooja = false;

  // Petpooja partners: push the prebuilt payload to the POS now (post-payment).
  // This is the order actually reaching the kitchen, so a failure must release
  // the claim and propagate so a retry re-attempts.
  if (order?.cf_pp_payload) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_PETPOOJA_BACKEND_URL}/api/webhook/push-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(order.cf_pp_payload),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`push-order ${res.status}: ${body}`);
      }
      pushedToPetpooja = true;
      console.log(`[finalizeCfOrder] pushed to Petpooja order=${orderId}`);
    } catch (e: any) {
      console.error(
        `[finalizeCfOrder] Petpooja push FAILED order=${orderId}, releasing claim for retry:`,
        e?.message || e,
      );
      try {
        await fetchFromHasura(RELEASE_CLAIM, { id: orderId });
      } catch (releaseErr) {
        console.error(`[finalizeCfOrder] release claim failed order=${orderId}:`, releaseErr);
      }
      return { ok: false, error: e?.message || "petpooja push failed" };
    }
  }

  // Notify the restaurant of the new (now paid) order — Petpooja partner or
  // not. This sat in an `else` on the Petpooja branch above, so a partner who
  // runs Petpooja got no push for online-paid orders either; pushing the order
  // to their POS is a different thing from ringing the phone in the kitchen.
  // Mirrors the same fix in orderStore.placeOrder for cash/COD orders.
  //
  // Deliberately AFTER the Petpooja push and outside its try: best-effort, and
  // a notification failure must never release the claim (that would re-push a
  // real order to the POS twice).
  try {
    await notifyPartnerNewOrder(
      order.partner_id,
      order.id,
      (order.order_items || []).map((oi: any) => ({
        name: oi?.item?.name || "Item",
        quantity: oi?.quantity || 1,
      })),
    );
  } catch (e) {
    console.error(`[finalizeCfOrder] partner notification failed (order still finalized) order=${orderId}:`, e);
  }

  // NOTE: stock is decremented at PLACEMENT now (orderStore.placeOrder, even for
  // pending_payment online orders), not here — so a placed online order locks
  // its slot immediately. Cancel/expire restock via restockOrderStock. Finalize
  // therefore intentionally does NOT touch stock.

  return { ok: true, pushedToPetpooja };
}

const GET_STALE_PENDING = `
  query GetStalePendingCfOrders($before: timestamptz!) {
    orders(
      where: {
        status: { _eq: "pending_payment" },
        cashfree_order_id: { _is_null: false },
        created_at: { _lt: $before }
      },
      order_by: { created_at: asc },
      limit: 100
    ) {
      id
      partner_id
      cashfree_order_id
      created_at
    }
  }
`;

export async function getStalePendingCfOrders(beforeISO: string) {
  const res = await fetchFromHasura(GET_STALE_PENDING, { before: beforeISO });
  return (res?.orders || []) as Array<{
    id: string;
    partner_id: string;
    cashfree_order_id: string;
    created_at: string;
  }>;
}

const EXPIRE_PENDING = `
  mutation ExpireCfOrder($id: uuid!, $now: timestamptz!) {
    update_orders(
      where: { id: { _eq: $id }, status: { _eq: "pending_payment" } },
      _set: { status: "expired", payment_status: "failed", cf_finalized_at: $now }
    ) {
      affected_rows
    }
  }
`;

export async function expireCfOrder(orderId: string) {
  // Stamp cf_finalized_at so a late PAYMENT_SUCCESS webhook can't resurrect
  // (re-finalize) this now-expired order — critical since finalize no longer
  // decrements stock and the expiry below restocks it.
  const now = new Date().toISOString();
  const res = await fetchFromHasura(EXPIRE_PENDING, { id: orderId, now });
  const affected = res?.update_orders?.affected_rows ?? 0;
  // Abandoned/unpaid online order — return any loyalty points it had redeemed,
  // and add its stock back (it was decremented at placement).
  if (affected > 0) {
    try {
      await restockOrderStock(orderId);
    } catch (e) {
      console.warn("[restock] expire restock failed", orderId, e);
    }
    try {
      const { refundLoyaltyForOrder } = await import("@/app/actions/loyalty");
      await refundLoyaltyForOrder(orderId, "Order expired (unpaid)");
    } catch (e) {
      console.warn("[loyalty] expire refund failed", orderId, e);
    }
  }
  return affected;
}

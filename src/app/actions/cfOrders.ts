"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";

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
        order_items { quantity item }
      }
    }
  }
`;

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
  } else {
    // Non-Petpooja partner: notify the restaurant of the new (now paid) order.
    // Best-effort — a notification failure should NOT release the claim.
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
  }

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
  mutation ExpireCfOrder($id: uuid!) {
    update_orders(
      where: { id: { _eq: $id }, status: { _eq: "pending_payment" } },
      _set: { status: "expired", payment_status: "failed" }
    ) {
      affected_rows
    }
  }
`;

export async function expireCfOrder(orderId: string) {
  const res = await fetchFromHasura(EXPIRE_PENDING, { id: orderId });
  const affected = res?.update_orders?.affected_rows ?? 0;
  // Abandoned/unpaid online order — return any loyalty points it had redeemed.
  if (affected > 0) {
    try {
      const { refundLoyaltyForOrder } = await import("@/app/actions/loyalty");
      await refundLoyaltyForOrder(orderId, "Order expired (unpaid)");
    } catch (e) {
      console.warn("[loyalty] expire refund failed", orderId, e);
    }
  }
  return affected;
}

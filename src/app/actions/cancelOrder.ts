"use server";

import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { cancelDispatch } from "./porterBridge";

/**
 * Cancel whatever is out delivering this order, on whichever system it lives.
 *
 * An order can be dispatched through four different places and, before this,
 * cancelling only ever reached ONE of them:
 *
 *   delivery bridge  (delivery_provider "dispatch" while the auction runs, then
 *                     the winning provider — "porter", "rapido", …)
 *   delivery pool    (delivery_provider "menuthere_pool")
 *   delivery agent   (delivery_provider "adloggs")
 *   Menuthere riders (orders.delivery_boy_id — the rider Android app)
 *
 * The old code called cancelPorter, which returns early unless
 * delivery_provider === "porter". So a bridge dispatch still auctioning
 * ("dispatch"), or one already booked with Rapido, was never withdrawn: the
 * rider still turns up at the restaurant for an order nobody is making, and the
 * merchant is billed for the trip. Pool and Adloggs were not called at all.
 *
 * AWAITED, not detached. Every other hook here floats a promise, but a
 * serverless invocation is finalized the moment the response returns, so a
 * floating promise is routinely killed before it reaches the courier — the same
 * reasoning already written down for Shiprocket in
 * src/app/api/order/[id]/cancel/route.ts. Detaching this would mean the courier
 * is never actually withdrawn, which is the entire bug being fixed.
 *
 * Bounded so a hung courier API cannot hold up the customer's cancel: the order
 * is already `cancelled` in our own DB by the time this runs, and every one of
 * these calls is idempotent, so the worst case is a retry from the dashboard.
 * Failures are logged, never thrown — a cancel must not fail because a
 * courier's API is down.
 *
 * The Menuthere rider app needs no call: it reads orders from Hasura and the row
 * is already `cancelled` by the time this runs. The assignment is deliberately
 * left in place so the record of who was carrying it survives.
 */
const DISPATCH_ALREADY_OVER = new Set([
  "cancelled",
  "delivered",
  "ended",
  "failed",
  "no_rider",
  "expired",
]);

const DISPATCH_CANCEL_TIMEOUT_MS = 8000;

async function cancelDispatches(orderId: string, reason: string): Promise<void> {
  const work = (async () => {
    let provider: string | null = null;
    let state: string | null = null;
    try {
      const data = await fetchFromHasura(
        `query DispatchForCancel($id: uuid!) {
           orders_by_pk(id: $id) { delivery_provider delivery_provider_state }
         }`,
        { id: orderId },
      );
      provider = data?.orders_by_pk?.delivery_provider ?? null;
      state = data?.orders_by_pk?.delivery_provider_state ?? null;
    } catch (e) {
      console.warn("[cancel-order] could not read dispatch state:", e);
      return;
    }

    if (!provider) return; // never dispatched anywhere
    if (state && DISPATCH_ALREADY_OVER.has(state)) return; // nothing live to withdraw

    try {
      if (provider === "menuthere_pool") {
        const { cancelDeliveryPoolDispatch } = await import("./deliveryPoolDispatch");
        await cancelDeliveryPoolDispatch(orderId, reason);
      } else if (provider === "adloggs") {
        const { cancelDeliveryAgent } = await import("./deliveryAgent");
        const r = await cancelDeliveryAgent(orderId, reason);
        if (!r?.ok) console.warn(`[adloggs] cancel failed: ${r?.message}`);
      } else {
        // Everything else is a bridge dispatch. cancelDispatch resolves it by
        // meta.dispatchId, so it covers "dispatch", "porter", "rapido" and any
        // future provider, and falls back to the legacy porter path itself.
        const r = await cancelDispatch(orderId, reason, "partner");
        if (!r?.ok && r?.status !== 404) {
          console.warn(`[dispatch] cancel failed (${provider}): ${r?.message}`);
        }
      }
    } catch (e) {
      console.warn(`[cancel-order] dispatch cancel threw (${provider}):`, e);
    }
  })();

  await Promise.race([
    work,
    new Promise<void>((resolve) =>
      setTimeout(() => {
        console.warn(`[cancel-order] dispatch cancel timed out for order=${orderId}`);
        resolve();
      }, DISPATCH_CANCEL_TIMEOUT_MS),
    ),
  ]);
}

/**
 * Return any loyalty points the cancelled order had redeemed. Fire-and-forget and
 * idempotent (one refund per order) — a cancel never fails over a refund hiccup.
 */
function maybeRefundLoyalty(orderId: string, reason: string): void {
  import("@/app/actions/loyalty")
    .then(({ refundLoyaltyForOrder }) => refundLoyaltyForOrder(orderId, reason))
    .catch((e) => console.warn("[loyalty] cancel refund threw:", e));
}

/**
 * Cancel any Shiprocket shipment tied to this order.
 *
 * Hooked HERE rather than only on the status-change path, because the cancel
 * DIALOG is how orders are actually cancelled everywhere that matters — the
 * dashboard, the order detail view and the customer's own tracking page all
 * short-circuit to it and never reach updateOrderStatus. A shipment cancelled
 * only there would leave the courier collecting a parcel for an order that no
 * longer exists, billed to the merchant.
 *
 * Calls the plain-module core rather than the guarded server action, because a
 * customer cancelling their own order cannot satisfy that guard (it is scoped to
 * partner/captain/superadmin).
 *
 * ⚠ Note what this action does and does NOT check: it requires a session with
 * role user|partner, but it never compares the order's user_id / partner_id
 * against the caller. That gap is pre-existing — cancelDispatches,
 * maybeRefundLoyalty and maybeRestock all sit behind the same weak check — and it
 * means anyone holding an order UUID can trigger this. Shiprocket inherits that
 * exposure rather than introducing it, but the cost here is a real cancelled
 * parcel, so an ownership check on cancelOrderAction is worth adding.
 *
 * Fire-and-forget and idempotent (a row already `cancelled` returns a silent
 * skip) — a cancel never fails over Shiprocket.
 */
function maybeCancelShiprocket(orderId: string): void {
  import("@/lib/shiprocket/shipments")
    .then(({ cancelShipmentCore }) => cancelShipmentCore(orderId))
    .then((r) => {
      if (r && !r.ok) console.warn(`[shiprocket] cancel via cancelOrderAction failed: ${r.message}`);
    })
    .catch((e) => console.warn("[shiprocket] cancel via cancelOrderAction threw:", e));
}

/**
 * Add the cancelled order's stock back. Fire-and-forget and idempotent (an
 * atomic RELEASE inside restockOrderStock ensures it restocks at most once, even
 * if cancel and expire race). A cancel never fails over a restock hiccup.
 */
function maybeRestock(orderId: string): void {
  import("@/app/actions/restockOrder")
    .then(({ restockOrderStock }) => restockOrderStock(orderId))
    .catch((e) => console.warn("[restock] cancel restock threw:", e));
}

type CancelResult =
  | { success: true }
  | { success: false; message: string };

const GET_ORDER_PARTNER_PP_ID = `
  query GetOrderPartnerPpId($orderId: uuid!) {
    orders_by_pk(id: $orderId) {
      id
      status
      user_id
      partner_id
      partner {
        id
        petpooja_restaurant_id
      }
    }
  }
`;

const CANCEL_ORDER_LOCAL = `
  mutation CancelOrderLocal($orderId: uuid!, $reason: String!, $by: String!) {
    update_orders_by_pk(
      pk_columns: { id: $orderId }
      _set: { status: "cancelled", cancel_reason: $reason, cancelled_by: $by }
    ) {
      id
      status
    }
  }
`;

export async function cancelOrderAction(
  orderId: string,
  cancelReason: string,
): Promise<CancelResult> {
  if (!orderId) return { success: false, message: "Missing order id" };
  const reason = (cancelReason ?? "").trim();
  if (!reason) return { success: false, message: "Cancellation reason is required" };

  const auth = await getAuthCookie();
  if (!auth) return { success: false, message: "Not authenticated" };

  if (auth.role !== "user" && auth.role !== "partner") {
    return { success: false, message: "Only users or partners can cancel orders" };
  }

  // Look up the order's partner so we can route Petpooja vs non-Petpooja correctly.
  // The Petpooja backend rejects orders whose partner has no petpooja_restaurant_id
  // with "petpooja merchant id not found" — for those, cancel directly in Hasura.
  let isPetpoojaPartner = false;
  try {
    const data = await fetchFromHasura(GET_ORDER_PARTNER_PP_ID, { orderId });
    const order = data?.orders_by_pk;
    if (!order) return { success: false, message: "Order not found" };

    // OWNERSHIP, not just routing. This is a "use server" export, so it is a public
    // RPC endpoint: with only a role check, any signed-in account could cancel any
    // store's orders by id — and this action does not merely flip a status, it
    // withdraws Porter bookings, refunds loyalty and cancels real Shiprocket
    // parcels. Order ids are no defence: the browser carries a Hasura admin secret,
    // so they can simply be listed.
    //
    // Enforced wherever there IS a signal to enforce on:
    //   partner → must own the order. No exceptions, and this alone stops one store
    //             cancelling another's.
    //   user    → must match orders.user_id when it is set.
    //
    // ~60% of orders are placed by guests and carry user_id = null, with no phone
    // on the row either, so for those there is nothing to check a customer against.
    // Rejecting them would break a real flow (order as a guest, sign in, cancel
    // from the tracking link), so they are allowed through as before and logged.
    // Closing that properly needs an ownership signal recorded at placement time.
    if (auth.role === "partner" && order.partner_id !== auth.id) {
      return { success: false, message: "Not authorized to cancel this order" };
    }
    if (auth.role === "user" && order.user_id && order.user_id !== auth.id) {
      return { success: false, message: "Not authorized to cancel this order" };
    }
    if (auth.role === "user" && !order.user_id) {
      console.warn(
        `[cancel-order] order=${orderId} has no user_id; cancelled by user=${auth.id} without an ownership check`,
      );
    }

    isPetpoojaPartner = !!order.partner?.petpooja_restaurant_id;
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to load order" };
  }

  if (!isPetpoojaPartner) {
    try {
      const result = await fetchFromHasura(CANCEL_ORDER_LOCAL, {
        orderId,
        reason,
        // Record granular actor: customer vs partner-from-Cravings-admin.
        by: auth.role === "user" ? "customer" : "partner-cravings",
      });
      if (!result?.update_orders_by_pk) {
        return { success: false, message: "Failed to cancel order" };
      }
      await cancelDispatches(orderId, reason);
      maybeCancelShiprocket(orderId);
      maybeRefundLoyalty(orderId, "Order cancelled");
      maybeRestock(orderId);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || "Failed to cancel order" };
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_PETPOOJA_BACKEND_URL;
  const secret = process.env.CANCEL_AUTH_SECRET;
  if (!baseUrl) return { success: false, message: "Petpooja backend URL not configured" };
  if (!secret) return { success: false, message: "Cancel auth secret not configured" };

  try {
    const res = await fetch(`${baseUrl}/api/webhook/cancel-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cancel-auth": secret,
      },
      body: JSON.stringify({
        order_id: orderId,
        cancel_reason: reason,
        actor: { role: auth.role, id: auth.id },
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok || body?.success === false) {
      return { success: false, message: body?.message || `Cancel failed (${res.status})` };
    }

    await cancelDispatches(orderId, reason);
    maybeCancelShiprocket(orderId);
    maybeRefundLoyalty(orderId, "Order cancelled");
    maybeRestock(orderId);
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error" };
  }
}

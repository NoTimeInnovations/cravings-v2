"use server";

import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { cancelPorter } from "./porterBridge";

/**
 * Fire-and-forget cancel of any active porter-bridge dispatch tied to this
 * order. Runs after the local cancel succeeds. Failure to cancel on Porter's
 * side never fails the user's cancel action — the operator can clean up via
 * the porter-bridge dashboard if needed. We just log + move on.
 *
 * Idempotent on the porter-bridge side: cancelPorter() returns
 * { ok: true, alreadyCancelled: true } when called against an already-cancelled
 * booking, and { ok: false, status: 404 } when the order was never dispatched
 * via porter — both are silent success cases here.
 */
function maybeCancelPorter(orderId: string, reason: string): void {
  cancelPorter(orderId, reason)
    .then((r) => {
      if (!r.ok && r.status !== 404) {
        console.warn(
          `[porter-bridge] cancel via cancelOrderAction failed: ${r.message}`,
        );
      }
    })
    .catch((e) =>
      console.warn("[porter-bridge] cancel via cancelOrderAction threw:", e),
    );
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
 * against the caller. That gap is pre-existing — maybeCancelPorter,
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
      maybeCancelPorter(orderId, reason);
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

    maybeCancelPorter(orderId, reason);
    maybeCancelShiprocket(orderId);
    maybeRefundLoyalty(orderId, "Order cancelled");
    maybeRestock(orderId);
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error" };
  }
}

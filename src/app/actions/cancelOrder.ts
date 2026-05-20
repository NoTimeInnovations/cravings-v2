"use server";

import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasura } from "@/lib/hasuraClient";

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
        by: auth.role,
      });
      if (!result?.update_orders_by_pk) {
        return { success: false, message: "Failed to cancel order" };
      }
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

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error" };
  }
}

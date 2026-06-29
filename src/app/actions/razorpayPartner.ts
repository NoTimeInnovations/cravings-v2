"use server";

import Razorpay from "razorpay";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { finalizeCfOrder } from "./cfOrders";

// Only Flamin Hot Chicken uses Razorpay for order payments.
// Set FLAMIN_PARTNER_ID in env to this partner's UUID.
const FLAMIN_PARTNER_ID = process.env.FLAMIN_PARTNER_ID || "";

// Built per-call (not at module load) so it always reads the current env —
// avoids permanently capturing undefined if the keys weren't present when this
// module was first imported. Trim to defend against stray whitespace/newlines
// pasted into .env, which would otherwise cause a 401 from Razorpay.
function getFlaminRazorpay() {
  return new Razorpay({
    key_id: (process.env.FLAMIN_RAZORPAY_KEY_ID || "").trim(),
    key_secret: (process.env.FLAMIN_RAZORPAY_KEY_SECRET || "").trim(),
  });
}

export async function createRazorpayOrderForPartner(
  partnerId: string,
  orderId: string,
  amount: number, // in rupees (e.g. 299.00)
  customer: { id: string; name: string; phone: string; email?: string },
) {
  if (!FLAMIN_PARTNER_ID || partnerId !== FLAMIN_PARTNER_ID) {
    return { success: false, error: "Razorpay not enabled for this restaurant" };
  }
  if (!process.env.FLAMIN_RAZORPAY_KEY_ID || !process.env.FLAMIN_RAZORPAY_KEY_SECRET) {
    return { success: false, error: "Razorpay credentials not configured" };
  }

  try {
    const order = await getFlaminRazorpay().orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: "INR",
      receipt: orderId,
      notes: {
        order_id: orderId,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
      },
    });

    // Store the Razorpay order id on the local order row so the webhook can
    // map a payment.captured event back to our order (mirrors how Cashfree
    // stores cashfree_order_id). We reuse the cashfree_order_id column as the
    // generic "provider order id" — flamin never uses Cashfree, and the
    // reconcile cron safely no-ops on it (no Cashfree merchant configured).
    try {
      await fetchFromHasura(
        `mutation SetRazorpayOrderId($id: uuid!, $rzp_order_id: String!) {
          update_orders_by_pk(pk_columns: {id: $id}, _set: { cashfree_order_id: $rzp_order_id }) { id }
        }`,
        { id: orderId, rzp_order_id: order.id },
      );
    } catch (e) {
      console.error("[razorpay-flamin] failed to persist rzp_order_id on order", orderId, e);
    }

    console.log("[razorpay-flamin] create-order ok", "rzp_order_id=", order.id);

    return {
      success: true,
      rzpOrderId: order.id,
      keyId: process.env.FLAMIN_RAZORPAY_KEY_ID, // safe to send to client
    };
  } catch (error: any) {
    console.error("[razorpay-flamin] create-order FAILED", error);
    return {
      success: false,
      error: error?.error?.description || "Failed to create payment order",
    };
  }
}

// Call this server-side after Razorpay checkout.js fires the handler callback.
// rzpOrderId + rzpPaymentId + rzpSignature come from the Razorpay handler response.
export async function verifyRazorpayPayment(
  rzpOrderId: string,
  rzpPaymentId: string,
  rzpSignature: string,
) {
  const secret = process.env.FLAMIN_RAZORPAY_KEY_SECRET!;
  const generated = crypto
    .createHmac("sha256", secret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const isValid = generated === rzpSignature;
  console.log("[razorpay-flamin] verify", "valid=", isValid, "payment=", rzpPaymentId);

  return { success: true, paid: isValid };
}

// Run the SAME finalization the Cashfree success path uses: claim the order
// idempotently, mark it paid, and push to Petpooja / notify the partner.
// finalizeCfOrder is generic (keyed on orderId) — it reads cf_pp_payload from
// the order row, so the order MUST have been created via the same pending-order
// path that stamps cf_pp_payload (see createPendingCfOrder).
export async function markRazorpayOrderPaid(orderId: string, rzpPaymentId: string) {
  // payment_method isn't touched by finalizeCfOrder, so stamp it separately
  // for attribution before finalizing.
  await fetchFromHasura(
    `mutation SetRazorpayPaymentMethod($id: uuid!) {
      update_orders_by_pk(pk_columns: {id: $id}, _set: { payment_method: "razorpay" }) { id }
    }`,
    { id: orderId },
  );

  return finalizeCfOrder(orderId, rzpPaymentId);
}

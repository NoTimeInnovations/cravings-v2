"use server";

import Razorpay from "razorpay";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { finalizeCfOrder } from "./cfOrders";

// Partners that collect order payments through their OWN Razorpay account
// (env-gated). Each slug SLUG needs these env vars:
//   SLUG_PARTNER_ID              — the partner's UUID
//   SLUG_RAZORPAY_KEY_ID         — their Razorpay key id
//   SLUG_RAZORPAY_KEY_SECRET     — their Razorpay key secret
//   SLUG_RAZORPAY_WEBHOOK_SECRET — their Razorpay webhook secret
// (Plus NEXT_PUBLIC_SLUG_PARTNER_ID so the storefront checkout renders the
// Razorpay path — see src/lib/ownRazorpayPartners.ts.)
const RZP_PARTNER_SLUGS = ["FLAMIN", "REGU"];

// Resolve a partner's Razorpay keys from env. Read per-call (not at module load)
// so it always sees the current env. Trims to defend against stray whitespace
// pasted into .env, which would otherwise 401 from Razorpay.
function razorpayCredsForPartner(
  partnerId: string,
): { slug: string; keyId: string; keySecret: string } | null {
  for (const slug of RZP_PARTNER_SLUGS) {
    const pid = (process.env[`${slug}_PARTNER_ID`] || "").trim();
    if (pid && pid === partnerId) {
      const keyId = (process.env[`${slug}_RAZORPAY_KEY_ID`] || "").trim();
      const keySecret = (process.env[`${slug}_RAZORPAY_KEY_SECRET`] || "").trim();
      return keyId && keySecret ? { slug, keyId, keySecret } : null;
    }
  }
  return null;
}

// Every configured partner's webhook secret — the shared /api/fhc/razorpay
// webhook tries each so multiple accounts can point at the same URL.
export async function allRazorpayWebhookSecrets(): Promise<string[]> {
  return RZP_PARTNER_SLUGS.map((s) =>
    (process.env[`${s}_RAZORPAY_WEBHOOK_SECRET`] || "").trim(),
  ).filter(Boolean);
}

export async function createRazorpayOrderForPartner(
  partnerId: string,
  orderId: string,
  amount: number, // in rupees (e.g. 299.00)
  customer: { id: string; name: string; phone: string; email?: string },
) {
  const creds = razorpayCredsForPartner(partnerId);
  if (!creds) {
    return { success: false, error: "Razorpay not enabled for this restaurant" };
  }

  try {
    const rzp = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
    const order = await rzp.orders.create({
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
    // Also overwrite payment_method to "razorpay" — the deferred pending-order
    // mutation hardcodes "cashfree" (it was built for the platform Cashfree
    // flow), which made flamin's draft orders show "cashfree" in admin-v2.
    try {
      await fetchFromHasura(
        `mutation SetRazorpayOrderId($id: uuid!, $rzp_order_id: String!) {
          update_orders_by_pk(pk_columns: {id: $id}, _set: { cashfree_order_id: $rzp_order_id, payment_method: "razorpay" }) { id }
        }`,
        { id: orderId, rzp_order_id: order.id },
      );
    } catch (e) {
      console.error("[razorpay-flamin] failed to persist rzp_order_id on order", orderId, e);
    }

    console.log(`[razorpay-${creds.slug.toLowerCase()}] create-order ok`, "rzp_order_id=", order.id);

    return {
      success: true,
      rzpOrderId: order.id,
      keyId: creds.keyId, // safe to send to client
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
  partnerId: string,
  rzpOrderId: string,
  rzpPaymentId: string,
  rzpSignature: string,
) {
  const creds = razorpayCredsForPartner(partnerId);
  if (!creds) return { success: false, paid: false };
  const generated = crypto
    .createHmac("sha256", creds.keySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const isValid = generated === rzpSignature;
  console.log(`[razorpay-${creds.slug.toLowerCase()}] verify`, "valid=", isValid, "payment=", rzpPaymentId);

  return { success: true, paid: isValid };
}

// Lightweight mark-paid for the "pay an already-placed order" flow
// (/order/[id]), mirroring cashfree's markOrderAsPaid — it does NOT finalize /
// push to Petpooja (the order is already visible in the system; we only record
// the payment). Sets payment_method to razorpay so admin-v2 shows it correctly.
export async function markRazorpayOrderPaidSimple(orderId: string, rzpPaymentId?: string) {
  const set: Record<string, any> = { is_paid: true, payment_method: "razorpay" };
  if (rzpPaymentId) set.cashfree_payment_id = rzpPaymentId;
  await fetchFromHasura(
    `mutation MarkRzpPaidSimple($id: uuid!, $set: orders_set_input!) {
      update_orders_by_pk(pk_columns: {id: $id}, _set: $set) { id }
    }`,
    { id: orderId, set },
  );
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

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { finalizeCfOrder } from "@/app/actions/cfOrders";
import { allRazorpayWebhookSecrets } from "@/lib/ownRazorpayServer";

export const dynamic = "force-dynamic";

// Flamin Hot Chicken only: webhook for their own Razorpay account. Served at
// /api/fhc/razorpay/webhooks. Mirrors the Cashfree webhook
// (src/app/api/cashfree/webhooks/route.ts) — verify HMAC, look
// up the order by the stored Razorpay order id, mark it paid, then finalize
// (push to Petpooja + notify the partner). Idempotent with the client-return
// handler. Configure this URL in Razorpay Dashboard → Settings → Webhooks for
// the `payment.captured` and `payment.failed` events, signed with
// FLAMIN_RAZORPAY_WEBHOOK_SECRET.

// We reuse cashfree_order_id as the generic provider-order-id column. The rzp
// order id is written there when the order is created (razorpayPartner.ts).
const lookupOrderByProviderId = `
  query LookupOrderByRzpId($rzp_order_id: String!) {
    orders(where: { cashfree_order_id: { _eq: $rzp_order_id } }, limit: 1) {
      id
      short_id
      partner_id
      total_price
      status
      payment_status
      created_at
    }
  }
`;

const updateOrderPaymentStatus = `
  mutation UpdateRzpOrderPaymentStatus($rzp_order_id: String!, $payment_status: String!, $payment_details: jsonb, $rzp_payment_id: String) {
    update_orders(
      where: { cashfree_order_id: { _eq: $rzp_order_id }, payment_status: { _neq: "paid" } },
      _set: { payment_status: $payment_status, payment_details: $payment_details, cashfree_payment_id: $rzp_payment_id, payment_method: "razorpay" }
    ) {
      affected_rows
      returning {
        id
        short_id
        partner_id
        total_price
        payment_status
      }
    }
  }
`;

// Razorpay signs the raw body with HMAC-SHA256 (hex). Header: X-Razorpay-Signature.
function verifyWebhookSignature(rawBody: string, receivedSignature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  // timingSafeEqual guards against signature-comparison timing attacks.
  const a = Buffer.from(expected);
  const b = Buffer.from(receivedSignature || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // Both partners' Razorpay accounts can point at this same URL — try each
    // configured webhook secret and accept if any matches.
    const webhookSecrets = await allRazorpayWebhookSecrets();
    if (!webhookSecrets.length) {
      console.error("[Razorpay Webhook] no *_RAZORPAY_WEBHOOK_SECRET configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (!webhookSecrets.some((s) => verifyWebhookSignature(rawBody, signature, s))) {
      console.error("[Razorpay Webhook] invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType: string | undefined = event.event;
    const paymentEntity = event.payload?.payment?.entity;
    const rzpOrderId: string | undefined = paymentEntity?.order_id;
    const rzpPaymentId: string | undefined = paymentEntity?.id;
    const amountPaise = Number(paymentEntity?.amount ?? 0); // paise

    console.log(
      `[Razorpay Webhook] event=${eventType} rzp_order_id=${rzpOrderId} rzp_payment_id=${rzpPaymentId} amount=${amountPaise}`,
    );

    if (!rzpOrderId) {
      console.warn("[Razorpay Webhook] missing payment.order_id — ignoring");
      return NextResponse.json({ status: "ignored", reason: "missing_order_id" });
    }

    // Look up the local order up-front (for logging + amount check).
    let order: {
      id: string;
      short_id: string | null;
      partner_id: string;
      total_price: number;
      status: string | null;
      payment_status: string | null;
      created_at: string;
    } | null = null;
    try {
      const lookup = await fetchFromHasura(lookupOrderByProviderId, { rzp_order_id: rzpOrderId });
      order = lookup?.orders?.[0] || null;
    } catch (lookupErr) {
      console.error(`[Razorpay Webhook] order lookup failed (rzp_order_id=${rzpOrderId}):`, lookupErr);
    }

    switch (eventType) {
      case "payment.captured": {
        if (!order?.id) {
          // Order row not committed yet (race with checkout) — ask Razorpay to
          // retry. Razorpay retries failed webhooks with backoff.
          console.warn(`[Razorpay Webhook] captured but no order for rzp_order_id=${rzpOrderId} — requesting retry`);
          return NextResponse.json({ status: "retry", reason: "order_not_found" }, { status: 500 });
        }

        // Defense-in-depth: even with a valid HMAC, refuse to finalize if the
        // captured amount doesn't match the order total (1 paisa tolerance).
        const expectedPaise = Math.round(Number(order.total_price) * 100);
        if (!Number.isFinite(amountPaise) || Math.abs(amountPaise - expectedPaise) > 1) {
          console.error(
            `[Razorpay Webhook] amount mismatch — refusing. rzp_order_id=${rzpOrderId} expected=${expectedPaise} got=${amountPaise}`,
          );
          return NextResponse.json({ status: "rejected", reason: "amount_mismatch" }, { status: 200 });
        }

        await fetchFromHasura(updateOrderPaymentStatus, {
          rzp_order_id: rzpOrderId,
          payment_status: "paid",
          payment_details: {
            via: "razorpay",
            rzp_order_id: rzpOrderId,
            rzp_payment_id: rzpPaymentId,
            payment_method: paymentEntity?.method,
            payment_amount: amountPaise / 100,
            event_time: event.created_at || null,
          },
          rzp_payment_id: rzpPaymentId || null,
        });

        // Finalize: push to Petpooja + notify the partner. Idempotent with the
        // client handler. A real delivery failure returns 500 so Razorpay retries.
        const fin = await finalizeCfOrder(order.id, rzpPaymentId || null);
        if (!fin.ok) {
          console.error(`[Razorpay Webhook] finalize failed for order=${order.id}: ${fin.error}`);
          return NextResponse.json({ status: "retry", reason: fin.error }, { status: 500 });
        }
        console.log(`[Razorpay Webhook] PAID + finalized order id=${order.id} short_id=${order.short_id}`);
        break;
      }

      case "payment.failed": {
        if (order?.id) {
          await fetchFromHasura(updateOrderPaymentStatus, {
            rzp_order_id: rzpOrderId,
            payment_status: "failed",
            payment_details: {
              via: "razorpay",
              rzp_order_id: rzpOrderId,
              rzp_payment_id: rzpPaymentId,
              error_description: paymentEntity?.error_description,
            },
            rzp_payment_id: null,
          });
        }
        console.log(`[Razorpay Webhook] FAILED rzp_order_id=${rzpOrderId}`);
        break;
      }

      default:
        console.log(`[Razorpay Webhook] unhandled event: ${eventType}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Razorpay Webhook] unhandled error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

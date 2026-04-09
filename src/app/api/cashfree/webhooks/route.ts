import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";

const updateOrderPaymentStatus = `
  mutation UpdateOrderPaymentStatus($order_id: String!, $payment_status: String!, $payment_details: jsonb, $cashfree_payment_id: String) {
    update_orders(
      where: { id: { _eq: $order_id } },
      _set: { payment_status: $payment_status, payment_details: $payment_details, cashfree_payment_id: $cashfree_payment_id }
    ) {
      affected_rows
    }
  }
`;

function verifyWebhookSignature(
  timestamp: string,
  rawBody: string,
  receivedSignature: string,
  secretKey: string,
): boolean {
  const signedPayload = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(signedPayload)
    .digest("base64");
  return expectedSignature === receivedSignature;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    const partnerApiKey = process.env.CASHFREE_PARTNER_API_KEY;

    if (!partnerApiKey) {
      console.error("CASHFREE_PARTNER_API_KEY not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Verify signature if present
    if (signature && timestamp) {
      const isValid = verifyWebhookSignature(timestamp, rawBody, signature, partnerApiKey);
      if (!isValid) {
        console.error("Cashfree webhook: invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type;
    const orderId = event.data?.order?.order_id;
    const merchantId = event.data?.merchant?.merchant_id || event.merchant?.merchant_id;

    console.log(`[Cashfree Webhook] ${eventType} | Order: ${orderId} | Merchant: ${merchantId}`);

    switch (eventType) {
      case "PAYMENT_SUCCESS_WEBHOOK": {
        const paymentDetails = {
          cf_payment_id: event.data?.payment?.cf_payment_id,
          payment_method: event.data?.payment?.payment_method,
          payment_amount: event.data?.payment?.payment_amount,
          payment_time: event.data?.payment?.payment_time,
          merchant_id: merchantId,
        };

        await fetchFromHasura(updateOrderPaymentStatus, {
          order_id: orderId,
          payment_status: "paid",
          payment_details: paymentDetails,
          cashfree_payment_id: event.data?.payment?.cf_payment_id?.toString() || null,
        });

        console.log(`[Cashfree Webhook] Order ${orderId} marked as paid`);
        break;
      }

      case "PAYMENT_FAILED_WEBHOOK": {
        await fetchFromHasura(updateOrderPaymentStatus, {
          order_id: orderId,
          payment_status: "failed",
          payment_details: {
            error_description: event.data?.error_description,
            merchant_id: merchantId,
          },
          cashfree_payment_id: null,
        });

        console.log(`[Cashfree Webhook] Order ${orderId} payment failed`);
        break;
      }

      case "PAYMENT_USER_DROPPED_WEBHOOK": {
        await fetchFromHasura(updateOrderPaymentStatus, {
          order_id: orderId,
          payment_status: "dropped",
          payment_details: { merchant_id: merchantId },
          cashfree_payment_id: null,
        });

        console.log(`[Cashfree Webhook] Order ${orderId} user dropped`);
        break;
      }

      default:
        console.log(`[Cashfree Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Cashfree Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";

const updateOrderPaymentStatus = `
  mutation UpdateOrderPaymentStatus($cashfree_order_id: String!, $payment_status: String!, $payment_details: jsonb, $cashfree_payment_id: String) {
    update_orders(
      where: { cashfree_order_id: { _eq: $cashfree_order_id } },
      _set: { payment_status: $payment_status, payment_details: $payment_details, cashfree_payment_id: $cashfree_payment_id }
    ) {
      affected_rows
      returning {
        id
        short_id
        partner_id
        total_price
        status
        payment_status
      }
    }
  }
`;

const lookupOrderByCashfreeId = `
  query LookupOrderByCashfreeId($cashfree_order_id: String!) {
    orders(where: { cashfree_order_id: { _eq: $cashfree_order_id } }, limit: 1) {
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
    const cfOrderId: string | undefined = event.data?.order?.order_id;
    const merchantId: string | undefined =
      event.data?.merchant?.merchant_id || event.merchant?.merchant_id;
    const orderAmount = event.data?.order?.order_amount;
    const cfPaymentId = event.data?.payment?.cf_payment_id;
    const paymentStatus = event.data?.payment?.payment_status;
    const paymentMethod = event.data?.payment?.payment_method;

    console.log(
      `[Cashfree Webhook] event=${eventType} cf_order_id=${cfOrderId} merchant=${merchantId} amount=${orderAmount} cf_payment_id=${cfPaymentId} payment_status=${paymentStatus}`,
    );

    if (!cfOrderId) {
      console.warn("[Cashfree Webhook] Missing order.order_id in payload — ignoring");
      return NextResponse.json({ status: "ignored", reason: "missing_order_id" });
    }

    // Look up the order up-front so we can log identifying details even if
    // the update later turns out to be a no-op (no row matched).
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
      const lookup = await fetchFromHasura(lookupOrderByCashfreeId, {
        cashfree_order_id: cfOrderId,
      });
      order = lookup?.orders?.[0] || null;
    } catch (lookupErr) {
      console.error(
        `[Cashfree Webhook] Failed to look up order (cf_order_id=${cfOrderId}):`,
        lookupErr,
      );
    }

    if (order) {
      console.log(
        `[Cashfree Webhook] Matched order id=${order.id} short_id=${order.short_id} partner_id=${order.partner_id} total=${order.total_price} status=${order.status} payment_status=${order.payment_status}`,
      );
    } else {
      console.warn(
        `[Cashfree Webhook] No order row found for cf_order_id=${cfOrderId}. Event will be acknowledged but nothing will be updated. Likely causes: order row not yet inserted (race with checkout-return flow), or cashfree_order_id was never written to the row.`,
      );
    }

    const runUpdate = async (
      newStatus: "paid" | "failed" | "dropped",
      paymentDetails: Record<string, unknown>,
      cashfreePaymentIdStr: string | null,
    ) => {
      const result = await fetchFromHasura(updateOrderPaymentStatus, {
        cashfree_order_id: cfOrderId,
        payment_status: newStatus,
        payment_details: paymentDetails,
        cashfree_payment_id: cashfreePaymentIdStr,
      });
      const affected = result?.update_orders?.affected_rows ?? 0;
      const updated = result?.update_orders?.returning?.[0];
      if (affected === 0) {
        console.warn(
          `[Cashfree Webhook] ${newStatus.toUpperCase()} update affected 0 rows (cf_order_id=${cfOrderId}). Order may not exist yet — Cashfree should retry.`,
        );
      } else {
        console.log(
          `[Cashfree Webhook] ${newStatus.toUpperCase()} -> order id=${updated?.id} short_id=${updated?.short_id} partner_id=${updated?.partner_id} total=${updated?.total_price} (affected_rows=${affected})`,
        );
      }
      return affected;
    };

    switch (eventType) {
      case "PAYMENT_SUCCESS_WEBHOOK": {
        await runUpdate(
          "paid",
          {
            cf_payment_id: cfPaymentId,
            payment_method: paymentMethod,
            payment_amount: event.data?.payment?.payment_amount,
            payment_time: event.data?.payment?.payment_time,
            merchant_id: merchantId,
          },
          cfPaymentId?.toString() || null,
        );
        break;
      }

      case "PAYMENT_FAILED_WEBHOOK": {
        await runUpdate(
          "failed",
          {
            error_description: event.data?.error_description,
            merchant_id: merchantId,
          },
          null,
        );
        break;
      }

      case "PAYMENT_USER_DROPPED_WEBHOOK": {
        await runUpdate("dropped", { merchant_id: merchantId }, null);
        break;
      }

      default:
        console.log(`[Cashfree Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Cashfree Webhook] Unhandled error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

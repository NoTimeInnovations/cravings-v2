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

const lookupOrderByLinkId = `
  query LookupOrderByLinkId($link_id: String!) {
    orders(where: { cashfree_link_id: { _eq: $link_id } }, limit: 1) {
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

const updateOrderPaymentByLinkId = `
  mutation UpdateOrderPaymentByLinkId($link_id: String!, $payment_status: String!, $payment_details: jsonb, $cashfree_payment_id: String) {
    update_orders(
      where: {
        cashfree_link_id: { _eq: $link_id },
        payment_status: { _neq: "paid" }
      },
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

    // PAYMENT_LINK_EVENT carries link details under data.link_id (older
    // schema) or data.cf_link_id; the actual transaction lives under
    // data.order. Branch early so we can route to the link-specific handler.
    if (eventType === "PAYMENT_LINK_EVENT") {
      return await handlePaymentLinkEvent(event);
    }

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

/**
 * Payment Link events come from the rider Cashfree-QR flow.
 *
 * The HMAC signature has already been verified by the time we get here. We
 * then layer two more checks before flipping payment_status:
 *
 *  1. The reported link_amount_paid must match the order's total_price
 *     (within 1 paisa). If they diverge, refuse — this catches anything from
 *     a misrouted webhook to a hand-crafted payload that somehow passed HMAC.
 *  2. The mutation guards on `payment_status: { _neq: "paid" }`, so retries
 *     and duplicate "PAID" events can't double-credit or overwrite a prior
 *     authoritative state.
 */
async function handlePaymentLinkEvent(event: any) {
  const linkId: string | undefined = event.data?.link_id;
  const linkStatus: string | undefined = event.data?.link_status;
  const linkAmount = Number(event.data?.link_amount ?? 0);
  const linkAmountPaid = Number(event.data?.link_amount_paid ?? 0);
  const txn = event.data?.order || {};
  const transactionId = txn?.transaction_id?.toString();
  const transactionStatus: string | undefined = txn?.transaction_status;
  const paymentMethod = txn?.payment_method;

  console.log(
    `[Cashfree Webhook][LINK] link_id=${linkId} status=${linkStatus} amount=${linkAmount} paid=${linkAmountPaid} txn_id=${transactionId} txn_status=${transactionStatus}`,
  );

  if (!linkId) {
    console.warn("[Cashfree Webhook][LINK] missing data.link_id — ignoring");
    return NextResponse.json({ status: "ignored", reason: "missing_link_id" });
  }

  const lookup = await fetchFromHasura(lookupOrderByLinkId, { link_id: linkId });
  const order = lookup?.orders?.[0];

  if (!order) {
    console.warn(
      `[Cashfree Webhook][LINK] no order row for link_id=${linkId}. Acknowledging so Cashfree doesn't retry forever; if this is a real miss the order was likely never persisted or the link belongs to another tenant.`,
    );
    return NextResponse.json({ status: "ignored", reason: "order_not_found" });
  }

  console.log(
    `[Cashfree Webhook][LINK] matched order id=${order.id} short_id=${order.short_id} expected_total=${order.total_price} current_payment_status=${order.payment_status}`,
  );

  // Only PAID events flip status. Anything else is logged but ignored.
  if (linkStatus !== "PAID" || transactionStatus !== "SUCCESS") {
    return NextResponse.json({ status: "ignored", reason: `link_status=${linkStatus}` });
  }

  // Defense-in-depth: even with a valid HMAC, refuse to mark paid if the
  // amount Cashfree is reporting doesn't match what we expected. 1 paisa
  // tolerance for float rounding.
  const expected = Number(order.total_price);
  if (
    !Number.isFinite(linkAmountPaid) ||
    Math.abs(linkAmountPaid - expected) > 0.01
  ) {
    console.error(
      `[Cashfree Webhook][LINK] amount mismatch — refusing to mark paid. link_id=${linkId} expected=${expected} reported=${linkAmountPaid}`,
    );
    return NextResponse.json(
      { status: "rejected", reason: "amount_mismatch" },
      { status: 200 },
    );
  }

  const result = await fetchFromHasura(updateOrderPaymentByLinkId, {
    link_id: linkId,
    payment_status: "paid",
    payment_details: {
      via: "payment_link",
      link_id: linkId,
      link_amount: linkAmount,
      link_amount_paid: linkAmountPaid,
      cf_transaction_id: transactionId,
      payment_method: paymentMethod,
      event_time: event.event_time || null,
    },
    cashfree_payment_id: transactionId || null,
  });
  const affected = result?.update_orders?.affected_rows ?? 0;
  const updated = result?.update_orders?.returning?.[0];
  if (affected === 0) {
    // Mutation is guarded on payment_status _neq "paid", so 0 rows = already
    // paid. This is the happy path for a duplicate webhook delivery.
    console.log(
      `[Cashfree Webhook][LINK] no rows updated — order ${order.id} likely already paid (idempotent ack).`,
    );
  } else {
    console.log(
      `[Cashfree Webhook][LINK] PAID -> order id=${updated?.id} short_id=${updated?.short_id} partner=${updated?.partner_id} total=${updated?.total_price}`,
    );
  }

  return NextResponse.json({ status: "ok" });
}

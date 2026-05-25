import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Rider-facing endpoint. The delivery app POSTs { orderId, deliveryBoyId } when
// the partner has delivery_qr_method='cashfree' and the rider taps Show QR.
// All trusted data (amount, partner config, customer details) is read from
// Hasura server-side; the client supplies only the two identifiers we use to
// authorize the call.

const IS_PRODUCTION = process.env.CASHFREE_ENV === "PRODUCTION";
const CASHFREE_BASE_URL = IS_PRODUCTION
  ? "https://api.cashfree.com"
  : "https://sandbox.cashfree.com";

const resolveMerchantId = (partnerMerchantId: string | undefined | null) =>
  IS_PRODUCTION
    ? partnerMerchantId || ""
    : process.env.TEST_MERCHANT_ID || partnerMerchantId || "";

const RIDER_QR_QUERY = `
  query RiderQrContext($id: uuid!) {
    orders_by_pk(id: $id) {
      id
      short_id
      status
      payment_status
      total_price
      delivery_boy_id
      cashfree_order_id
      user_id
      phone
      partner {
        id
        delivery_qr_method
        cashfree_merchant_id
        accept_payments_via_cashfree
      }
      user {
        full_name
        phone
        email
      }
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const orderId: string | undefined = body?.orderId;
    const deliveryBoyId: string | undefined = body?.deliveryBoyId;

    if (!orderId || !deliveryBoyId) {
      return NextResponse.json(
        { error: "orderId and deliveryBoyId required" },
        { status: 400 },
      );
    }

    const { orders_by_pk: order } = await fetchFromHasura(RIDER_QR_QUERY, {
      id: orderId,
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Rider-to-order ownership. The single most important check.
    if (order.delivery_boy_id !== deliveryBoyId) {
      return NextResponse.json(
        { error: "Not assigned to this order" },
        { status: 403 },
      );
    }

    // Status guard: only collect on live orders. Cancelled / completed orders
    // should not generate a fresh QR.
    if (!["accepted", "dispatched"].includes(order.status)) {
      return NextResponse.json(
        { error: `Order not collectable (status=${order.status})` },
        { status: 409 },
      );
    }

    // Idempotent re-tap: if already paid, just signal so the app dismisses.
    if (order.payment_status === "paid") {
      return NextResponse.json({ alreadyPaid: true });
    }

    if (order.partner?.delivery_qr_method !== "cashfree") {
      return NextResponse.json(
        { error: "Partner not configured for Cashfree QR" },
        { status: 400 },
      );
    }
    if (
      !order.partner?.accept_payments_via_cashfree ||
      !order.partner?.cashfree_merchant_id
    ) {
      return NextResponse.json(
        { error: "Cashfree not enabled for partner" },
        { status: 400 },
      );
    }

    // Amount is read from Hasura — never trust the client.
    const amount = Number(order.total_price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid order amount" },
        { status: 400 },
      );
    }

    const merchantId = resolveMerchantId(order.partner.cashfree_merchant_id);
    const partnerApiKey = process.env.CASHFREE_PARTNER_API_KEY;
    if (!merchantId || !partnerApiKey) {
      return NextResponse.json(
        { error: "Cashfree credentials unavailable" },
        { status: 500 },
      );
    }

    // Unique Cashfree order id per QR request (their order_id must be unique
    // across creates). Suffix with a base36 timestamp so a rider can re-tap
    // after a partial / expired session.
    const ts = Date.now().toString(36);
    const cfOrderId = `${order.short_id || order.id.slice(0, 12)}-r-${ts}`.slice(0, 45);

    const customer = {
      id: order.user_id || order.delivery_boy_id,
      name: order.user?.full_name || "Customer",
      phone: order.user?.phone || order.phone || "0000000000",
      email: order.user?.email || "customer@menuthere.com",
    };

    // Step 1 — create the Cashfree order.
    const orderRes = await fetch(`${CASHFREE_BASE_URL}/pg/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2025-01-01",
        "x-partner-apikey": partnerApiKey,
        "x-partner-merchantid": merchantId,
      },
      body: JSON.stringify({
        order_id: cfOrderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: customer.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email,
        },
        order_meta: {
          payment_methods: "upi",
        },
        order_note: `Rider QR ${order.short_id || order.id}`,
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData?.payment_session_id) {
      console.error(
        "[cashfree-qr] order create failed:",
        orderData?.message || JSON.stringify(orderData),
      );
      return NextResponse.json(
        { error: "Could not create payment order" },
        { status: 502 },
      );
    }

    // Step 2 — ask Cashfree for a UPI deep link tied to that session.
    const sessionRes = await fetch(`${CASHFREE_BASE_URL}/pg/orders/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2025-01-01",
        "x-partner-apikey": partnerApiKey,
        "x-partner-merchantid": merchantId,
      },
      body: JSON.stringify({
        payment_session_id: orderData.payment_session_id,
        payment_method: { upi: { channel: "link" } },
      }),
    });
    const sessionData = await sessionRes.json();
    if (!sessionRes.ok) {
      console.error(
        "[cashfree-qr] session create failed:",
        sessionData?.message || JSON.stringify(sessionData),
      );
      return NextResponse.json(
        { error: "Could not generate QR" },
        { status: 502 },
      );
    }

    // Tolerant parse — Cashfree's response shape varies slightly across API
    // versions.
    const upiUri: string | undefined =
      sessionData?.data?.payload?.url ||
      sessionData?.data?.url ||
      sessionData?.payload?.url ||
      sessionData?.url;

    if (!upiUri || !upiUri.startsWith("upi://")) {
      console.error("[cashfree-qr] no UPI URI in session response");
      return NextResponse.json(
        { error: "QR generation failed" },
        { status: 502 },
      );
    }

    // Persist the cashfree_order_id so the existing webhook can map the
    // PAYMENT_SUCCESS event back to this order row.
    await fetchFromHasura(
      `mutation SetCashfreeOrderIdForRider($id: uuid!, $cfid: String!) {
        update_orders_by_pk(pk_columns: {id: $id}, _set: {cashfree_order_id: $cfid}) { id }
      }`,
      { id: order.id, cfid: cfOrderId },
    );

    return NextResponse.json({
      upiUri,
      amount,
      currency: "INR",
    });
  } catch (err: any) {
    console.error("[cashfree-qr] unhandled error:", err?.message || err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

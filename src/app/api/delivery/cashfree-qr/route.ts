import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Rider-facing endpoint. The delivery app POSTs { orderId, deliveryBoyId } when
// the partner has delivery_qr_method='cashfree' and the rider taps Show QR.
//
// Security posture:
//   - Cashfree REST key + merchant id stay server-side. The app receives ONLY
//     a hosted-checkout URL string.
//   - Amount is read from orders.total_price — never client-supplied.
//   - Partner merchant is read from order.partner.cashfree_merchant_id —
//     never client-supplied; that's why money can only ever land in the
//     correct partner's account.
//   - Rider-to-order ownership is verified against orders.delivery_boy_id.
//   - The Cashfree link_id is server-generated, persisted on the order row,
//     and used as the join key for the inbound webhook. Tampering with the
//     URL on the wire is moot since Cashfree only credits the configured
//     merchant for the configured link, regardless of who scans.
//   - The webhook handler does its own HMAC check + amount cross-check before
//     flipping payment_status.
//
// This route uses Cashfree's Payment Links API (POST /pg/links) rather than
// the gated /pg/orders/sessions endpoint — Payment Links is enabled by
// default on every merchant account.

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
      cashfree_link_id
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

const SET_CASHFREE_LINK_ID = `
  mutation SetCashfreeLinkId($id: uuid!, $linkId: String!) {
    update_orders_by_pk(pk_columns: {id: $id}, _set: {cashfree_link_id: $linkId}) {
      id
    }
  }
`;

type CashfreeLink = {
  link_id: string;
  link_url: string;
  link_status: string;
  link_amount: number;
};

async function cashfreeRequest(
  path: string,
  method: "GET" | "POST",
  merchantId: string,
  partnerApiKey: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${CASHFREE_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "2025-01-01",
      "x-partner-apikey": partnerApiKey,
      "x-partner-merchantid": merchantId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* swallow */
  }
  return { ok: res.ok, status: res.status, data };
}

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

    // Status guard: only collect on live orders.
    if (!["accepted", "dispatched"].includes(order.status)) {
      return NextResponse.json(
        { error: `Order not collectable (status=${order.status})` },
        { status: 409 },
      );
    }

    // Idempotent re-tap once already paid: signal so the app dismisses cleanly.
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

    // Amount comes ONLY from Hasura.
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

    // Idempotency: if we already created a link for this order, reuse it
    // unless Cashfree says it's expired/cancelled. This is what makes rapid
    // re-taps safe — the rider sees the same URL until the previous one
    // actually settles or expires.
    if (order.cashfree_link_id) {
      const existing = await cashfreeRequest(
        `/pg/links/${encodeURIComponent(order.cashfree_link_id)}`,
        "GET",
        merchantId,
        partnerApiKey,
      );
      if (existing.ok) {
        const link = existing.data as CashfreeLink;
        if (link.link_status === "PAID") {
          // Webhook may still be in flight; surface paid state so the app
          // dismisses without creating a duplicate.
          return NextResponse.json({ alreadyPaid: true });
        }
        if (link.link_status === "ACTIVE" || link.link_status === "PARTIALLY_PAID") {
          return NextResponse.json({
            upiUri: link.link_url,
            amount,
            currency: "INR",
          });
        }
        // EXPIRED / CANCELLED → fall through to create a fresh link.
      }
    }

    // Cashfree requires link_id to be unique across the merchant — suffix
    // with a base36 timestamp so we never collide with prior attempts.
    const ts = Date.now().toString(36);
    const linkId = `del-${order.short_id || order.id.slice(0, 12)}-${ts}`.slice(0, 50);

    // 30-minute expiry: short enough to prevent stale links being scanned
    // hours later, long enough for the rider/customer to complete the flow.
    const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const customer = {
      name: order.user?.full_name || "Customer",
      phone: order.user?.phone || order.phone || "0000000000",
      email: order.user?.email || "customer@menuthere.com",
    };

    const createRes = await cashfreeRequest(
      "/pg/links",
      "POST",
      merchantId,
      partnerApiKey,
      {
        link_id: linkId,
        link_amount: amount,
        link_currency: "INR",
        link_purpose: `Order ${order.short_id || order.id.slice(0, 8)}`,
        customer_details: {
          customer_phone: customer.phone,
          customer_name: customer.name,
          customer_email: customer.email,
        },
        // No partial payments — customer pays the exact total or nothing.
        link_partial_payments: false,
        link_expiry_time: expiry,
        link_auto_reminders: false,
        // Notes live on the link; useful for the webhook to cross-check.
        link_notes: {
          internal_order_id: order.id,
          short_id: order.short_id || "",
        },
        link_meta: {
          notify_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://menuthere.com"}/api/cashfree/webhooks`,
          upi_intent: false,
        },
      },
    );

    if (!createRes.ok) {
      console.error(
        "[cashfree-qr] link create failed:",
        createRes.data?.message || JSON.stringify(createRes.data),
      );
      return NextResponse.json(
        { error: "Could not create payment link" },
        { status: 502 },
      );
    }

    const link = createRes.data as CashfreeLink;
    if (!link.link_url || !/^https:\/\//.test(link.link_url)) {
      console.error("[cashfree-qr] missing/invalid link_url");
      return NextResponse.json(
        { error: "QR generation failed" },
        { status: 502 },
      );
    }

    // Persist before responding so the webhook can map back even if the
    // response never reaches the rider.
    await fetchFromHasura(SET_CASHFREE_LINK_ID, {
      id: order.id,
      linkId,
    });

    return NextResponse.json({
      upiUri: link.link_url,
      amount,
      currency: "INR",
    });
  } catch (err: any) {
    console.error("[cashfree-qr] unhandled error:", err?.message || err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

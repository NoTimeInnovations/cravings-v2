"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";

const IS_PRODUCTION = process.env.CASHFREE_ENV === "PRODUCTION";
const CASHFREE_BASE_URL = IS_PRODUCTION
  ? "https://api.cashfree.com"
  : "https://sandbox.cashfree.com";

// In non-production mode, force the test merchant ID. The partner's stored
// merchant_id is only valid against production Cashfree.
const resolveMerchantId = (partnerMerchantId: string | undefined | null) =>
  IS_PRODUCTION
    ? partnerMerchantId || ""
    : process.env.TEST_MERCHANT_ID || partnerMerchantId || "";

const getPartnerCashfreeId = `
  query GetPartnerCashfreeId($id: uuid!) {
    partners_by_pk(id: $id) {
      cashfree_merchant_id
      accept_payments_via_cashfree
    }
  }
`;

export async function createCashfreeOrderForPartner(
  partnerId: string,
  orderId: string,
  amount: number,
  customer: { id: string; name: string; phone: string; email?: string },
  returnUrl: string,
) {
  const partnerApiKey = process.env.CASHFREE_PARTNER_API_KEY;
  if (!partnerApiKey) throw new Error("CASHFREE_PARTNER_API_KEY not configured");

  const { partners_by_pk: partner } = await fetchFromHasura(getPartnerCashfreeId, { id: partnerId });
  if (!partner?.cashfree_merchant_id || !partner?.accept_payments_via_cashfree) {
    return { success: false, error: "Cashfree payments not enabled for this restaurant" };
  }

  const merchantId = resolveMerchantId(partner.cashfree_merchant_id);
  if (!merchantId) {
    return { success: false, error: "Cashfree merchant id not configured for current environment" };
  }
  console.log("[cashfree] env=", IS_PRODUCTION ? "PROD" : "SANDBOX", "merchant=", merchantId);

  // Cashfree rejects orders with an invalid customer_phone (e.g. "0000000000",
  // landline, or anything that doesn't reduce to a 6-9-leading 10-digit mobile).
  // That's what made payments fail for *some* users only. Normalise + fall back.
  const digits = (customer.phone || "").replace(/\D/g, "").slice(-10);
  const safePhone = /^[6-9][0-9]{9}$/.test(digits) ? digits : "9999999999";
  const safeName = (customer.name || "").trim() || "Customer";
  if (safePhone !== digits) {
    console.warn("[cashfree] invalid customer_phone, using fallback. raw=", customer.phone);
  }

  console.log(
    "[cashfree] create-order req",
    JSON.stringify({
      orderId,
      amount,
      phone: "***" + safePhone.slice(-4),
      phoneFallback: safePhone !== digits,
      name: safeName,
      email: customer.email ? "set" : "fallback",
      customerId: customer.id,
    }),
  );

  const res = await fetch(`${CASHFREE_BASE_URL}/pg/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "2025-01-01",
      "x-partner-apikey": partnerApiKey,
      "x-partner-merchantid": merchantId,
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: customer.id,
        customer_name: safeName,
        customer_phone: safePhone,
        customer_email: customer.email || "customer@menuthere.com",
      },
      order_meta: {
        return_url: returnUrl,
        // `app` enables the "UPI Apps" / "Pay with apps" section in the
        // Cashfree drop-in (GPay / PhonePe / Paytm intent buttons on mobile);
        // `upi` keeps the QR + UPI ID flow. Cashfree only accepts these
        // top-level method codes — granular per-app values are rejected.
        payment_methods: "app,upi,cc,dc,nb",
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(
      "[cashfree] create-order FAILED",
      "http=", res.status,
      "code=", data?.code,
      "type=", data?.type,
      "msg=", data?.message,
      "raw=", JSON.stringify(data),
    );
    return { success: false, error: data.message || "Failed to create payment order" };
  }

  console.log(
    "[cashfree] create-order ok",
    "session=", data.payment_session_id ? "yes" : "MISSING",
    "cf_order_id=", data.cf_order_id,
  );

  return {
    success: true,
    paymentSessionId: data.payment_session_id,
    cfOrderId: data.cf_order_id,
  };
}

export async function verifyCashfreePayment(partnerId: string, orderId: string) {
  const partnerApiKey = process.env.CASHFREE_PARTNER_API_KEY;
  if (!partnerApiKey) throw new Error("CASHFREE_PARTNER_API_KEY not configured");

  const { partners_by_pk: partner } = await fetchFromHasura(getPartnerCashfreeId, { id: partnerId });
  const merchantId = resolveMerchantId(partner?.cashfree_merchant_id);
  if (!merchantId) {
    return { success: false, error: "Cashfree not configured" };
  }

  const headers = {
    "x-api-version": "2025-01-01",
    "x-partner-apikey": partnerApiKey,
    "x-partner-merchantid": merchantId,
  };

  // Poll for the order status. After a successful payment Cashfree flips the
  // order ACTIVE -> PAID asynchronously; a single immediate check can race and
  // wrongly report "not completed" for users who actually paid. Retry while the
  // status is still ACTIVE (non-terminal) for a few seconds before concluding.
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let res: Response | null = null;
  let data: any = null;
  let lastError: string | undefined;
  for (let attempt = 0; attempt < 6; attempt++) {
    res = await fetch(`${CASHFREE_BASE_URL}/pg/orders/${orderId}`, { method: "GET", headers });
    data = await res.json();
    console.log(
      "[cashfree] verify",
      "order=", orderId,
      "attempt=", attempt,
      res.ok ? `status=${data?.order_status}` : `http=${res.status} msg=${data?.message}`,
    );
    if (!res.ok) {
      lastError = data?.message || "Failed to verify payment";
      // 404 can mean Cashfree hasn't registered the order yet — retry; other errors are terminal.
      if (res.status === 404 && attempt < 5) {
        await sleep(1500);
        continue;
      }
      return { success: false, error: lastError };
    }
    // Terminal statuses (PAID / EXPIRED / TERMINATED / ...) — stop polling.
    if (data?.order_status && data.order_status !== "ACTIVE") break;
    if (attempt < 5) await sleep(1500);
  }

  if (!res || !data) {
    return { success: false, error: lastError || "Failed to verify payment" };
  }

  console.log(
    "[cashfree] verify result",
    "order=", orderId,
    "orderStatus=", data.order_status,
    "paid=", data.order_status === "PAID",
  );

  // Fetch payment details to get cf_payment_id
  let cfPaymentId: string | null = null;
  if (data.order_status === "PAID") {
    try {
      const paymentsRes = await fetch(`${CASHFREE_BASE_URL}/pg/orders/${orderId}/payments`, {
        method: "GET",
        headers: {
          "x-api-version": "2025-01-01",
          "x-partner-apikey": partnerApiKey,
          "x-partner-merchantid": merchantId,
        },
      });
      const payments = await paymentsRes.json();
      if (Array.isArray(payments) && payments.length > 0) {
        const successPayment = payments.find((p: any) => p.payment_status === "SUCCESS") || payments[0];
        cfPaymentId = successPayment?.cf_payment_id?.toString() || null;
      }
    } catch (e) {
      console.error("Failed to fetch payment details:", e);
    }
  }

  return {
    success: true,
    orderStatus: data.order_status,
    paid: data.order_status === "PAID",
    orderNote: data.order_note,
    cfPaymentId,
  };
}

export async function setOrderCashfreeId(orderId: string, cashfreeOrderId: string) {
  await fetchFromHasura(
    `mutation SetOrderCashfreeId($id: uuid!, $cashfree_order_id: String!) {
      update_orders_by_pk(pk_columns: {id: $id}, _set: {cashfree_order_id: $cashfree_order_id}) { id }
    }`,
    { id: orderId, cashfree_order_id: cashfreeOrderId },
  );
}

export async function markOrderAsPaid(orderId: string, cashfreePaymentId?: string) {
  const setFields: Record<string, any> = {
    is_paid: true,
    payment_method: "cashfree",
  };
  if (cashfreePaymentId) {
    setFields.cashfree_payment_id = cashfreePaymentId;
  }

  await fetchFromHasura(
    `mutation MarkOrderPaid($id: uuid!, $set: orders_set_input!) {
      update_orders_by_pk(pk_columns: {id: $id}, _set: $set) { id }
    }`,
    { id: orderId, set: setFields },
  );
}

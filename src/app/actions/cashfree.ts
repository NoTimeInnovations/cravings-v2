"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";

const CASHFREE_BASE_URL = process.env.CASHFREE_ENV === "PRODUCTION"
  ? "https://api.cashfree.com"
  : "https://sandbox.cashfree.com";

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

  const res = await fetch(`${CASHFREE_BASE_URL}/pg/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "2025-01-01",
      "x-partner-apikey": partnerApiKey,
      "x-partner-merchantid": partner.cashfree_merchant_id,
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email || "customer@menuthere.com",
      },
      order_meta: {
        return_url: returnUrl,
        payment_methods: "cc,dc,upi,nb,app",
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Cashfree order creation failed:", data);
    return { success: false, error: data.message || "Failed to create payment order" };
  }

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
  if (!partner?.cashfree_merchant_id) {
    return { success: false, error: "Cashfree not configured" };
  }

  const res = await fetch(`${CASHFREE_BASE_URL}/pg/orders/${orderId}`, {
    method: "GET",
    headers: {
      "x-api-version": "2025-01-01",
      "x-partner-apikey": partnerApiKey,
      "x-partner-merchantid": partner.cashfree_merchant_id,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    return { success: false, error: data.message || "Failed to verify payment" };
  }

  // Fetch payment details to get cf_payment_id
  let cfPaymentId: string | null = null;
  if (data.order_status === "PAID") {
    try {
      const paymentsRes = await fetch(`${CASHFREE_BASE_URL}/pg/orders/${orderId}/payments`, {
        method: "GET",
        headers: {
          "x-api-version": "2025-01-01",
          "x-partner-apikey": partnerApiKey,
          "x-partner-merchantid": partner.cashfree_merchant_id,
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

"use server";

/**
 * Cashfree online-payment ledger for a partner (sub-merchant).
 *
 * The list is driven by OUR paid Cashfree orders (so today's transactions show
 * immediately), enriched with Cashfree's settlement data where it exists. A
 * payment only gets a settlement row AFTER Cashfree pays it out to the bank
 * (~T+1/T+2), so recent rows read "awaiting settlement" and gain their
 * settlement amount + fee once settled.
 *
 * We are a Cashfree PARTNER: one platform key (CASHFREE_PARTNER_API_KEY, header
 * x-partner-apikey) acts on behalf of each restaurant via cashfree_merchant_id
 * (header x-partner-merchantid) — the same auth we use for /pg/orders.
 * Cashfree returns fees as absolute INR amounts (service_charge = PG fee,
 * service_tax = GST on it); the "fee %" is derived on the client.
 */

import { fetchFromHasura } from "@/lib/hasuraClient";

const IS_PRODUCTION = process.env.CASHFREE_ENV === "PRODUCTION";
const CASHFREE_BASE_URL = IS_PRODUCTION
  ? "https://api.cashfree.com"
  : "https://sandbox.cashfree.com";

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

const getPartnerCfOrders = `
  query PartnerCfOrders($pid: uuid!, $start: timestamptz!, $end: timestamptz!) {
    orders(
      where: {
        partner_id: { _eq: $pid }
        payment_status: { _eq: "paid" }
        cashfree_order_id: { _is_null: false }
        created_at: { _gte: $start, _lte: $end }
      }
      order_by: { created_at: desc }
    ) {
      id
      short_id
      cashfree_order_id
      cashfree_payment_id
      total_price
      created_at
    }
  }
`;

/** A settled row as returned by Cashfree /pg/settlements (normalized). */
type SettlementRaw = {
  cfSettlementId: string | null;
  cfPaymentId: string | null;
  orderId: string | null;
  orderAmount: number;
  settlementAmount: number;
  serviceCharge: number;
  serviceTax: number;
  transferUtr: string | null;
  transferTime: string | null;
  paymentTime: string | null;
};

/** One transaction in the ledger — always present; settlement fields fill in later. */
export type LedgerRow = {
  /** Our human order id (short_id). */
  orderRef: string | null;
  /** Cashfree merchant order id (what we sent / matches settlement.order_id). */
  cfOrderId: string | null;
  cfPaymentId: string | null;
  /** Amount the customer paid (our order total). */
  amount: number;
  /** When the customer paid (our order created_at). */
  paymentTime: string;
  settled: boolean;
  settlementAmount: number | null;
  serviceCharge: number | null;
  serviceTax: number | null;
  transferUtr: string | null;
  transferTime: string | null;
};

export type LedgerResult =
  | {
      success: true;
      configured: true;
      rows: LedgerRow[];
      settlementsTruncated: boolean;
      /** True if the settlement API couldn't be reached (rows still show, as pending). */
      settlementsUnavailable: boolean;
    }
  | { success: false; configured: boolean; error: string };

const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string | null => (v == null ? null : String(v));

function normalizeSettlement(r: any): SettlementRaw {
  return {
    cfSettlementId: str(r.cf_settlement_id ?? r.settlement_id),
    cfPaymentId: str(r.cf_payment_id ?? r.payment_id),
    orderId: str(r.order_id ?? r.order_details?.order_id),
    orderAmount: num(r.order_amount ?? r.payment_amount),
    settlementAmount: num(r.settlement_amount ?? r.amount_settled ?? r.event_settlement_amount),
    serviceCharge: num(r.service_charge ?? r.payment_service_charge ?? r.commission),
    serviceTax: num(r.service_tax ?? r.payment_service_tax ?? r.gst),
    transferUtr: str(r.transfer_utr ?? r.utr),
    transferTime: str(r.transfer_time ?? r.settlement_time ?? r.settlement_date),
    paymentTime: str(r.payment_time),
  };
}

function extractRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.settlements)) return data.settlements;
  if (data && typeof data === "object" && (data.cf_settlement_id || data.order_amount != null)) {
    return [data];
  }
  return [];
}
function extractCursor(data: any): string | null {
  return (data?.cursor ?? data?.next_cursor ?? data?.pagination?.cursor ?? null) || null;
}

const MAX_PAGES = 40;
const PAGE_LIMIT = 100;

/** Fetch all settlement rows in [startISO, endISO], looping Cashfree's cursor. */
async function fetchAllSettlements(
  headers: Record<string, string>,
  startISO: string,
  endISO: string,
): Promise<{ rows: SettlementRaw[]; truncated: boolean; ok: boolean }> {
  const rows: SettlementRaw[] = [];
  let cursor: string | null = null;
  let truncated = false;
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const body = {
        pagination: { limit: PAGE_LIMIT, cursor },
        filters: { start_date: startISO, end_date: endISO },
      };
      const res = await fetch(`${CASHFREE_BASE_URL}/pg/settlements`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[cf-settlements] http=", res.status, "code=", data?.code, "msg=", data?.message);
        return { rows, truncated, ok: rows.length > 0 };
      }
      for (const r of extractRows(data)) rows.push(normalizeSettlement(r));
      cursor = extractCursor(data);
      if (!cursor) break;
      if (page === MAX_PAGES - 1 && cursor) truncated = true;
    }
  } catch (e: any) {
    console.error("[cf-settlements] fetch error:", e?.message || e);
    return { rows, truncated, ok: rows.length > 0 };
  }
  return { rows, truncated, ok: true };
}

/**
 * Transaction ledger for [startDate, endDate] (YYYY-MM-DD, IST). Every paid
 * Cashfree order in the window is a row; settlement fields are attached when a
 * matching settlement exists.
 */
export async function getPartnerSettlementLedger(
  partnerId: string,
  range: { startDate: string; endDate: string },
): Promise<LedgerResult> {
  const partnerApiKey = process.env.CASHFREE_PARTNER_API_KEY;

  const { partners_by_pk: partner } = await fetchFromHasura(getPartnerCashfreeId, { id: partnerId });
  if (!partner?.cashfree_merchant_id || !partner?.accept_payments_via_cashfree) {
    return { success: false, configured: false, error: "Cashfree payments not enabled for this restaurant" };
  }

  // Our paid Cashfree orders in the window (IST day bounds) — the source of truth
  // for "what transactions happened", available immediately.
  const startTs = `${range.startDate}T00:00:00+05:30`;
  const endTs = `${range.endDate}T23:59:59+05:30`;
  let orders: any[] = [];
  try {
    const data = await fetchFromHasura(getPartnerCfOrders, { pid: partnerId, start: startTs, end: endTs });
    orders = data?.orders || [];
  } catch (e: any) {
    console.error("[cf-ledger] orders query failed:", e?.message || e);
    return { success: false, configured: true, error: "Failed to load transactions" };
  }

  // Settlement enrichment (best-effort — transactions still show if this fails).
  let settlements: SettlementRaw[] = [];
  let settlementsTruncated = false;
  let settlementsUnavailable = false;
  const merchantId = resolveMerchantId(partner.cashfree_merchant_id);
  if (partnerApiKey && merchantId) {
    const headers = {
      "Content-Type": "application/json",
      "x-api-version": "2025-01-01",
      "x-partner-apikey": partnerApiKey,
      "x-partner-merchantid": merchantId,
    };
    const startISO = `${range.startDate}T00:00:00Z`;
    const endISO = `${range.endDate}T23:59:59Z`;
    const s = await fetchAllSettlements(headers, startISO, endISO);
    settlements = s.rows;
    settlementsTruncated = s.truncated;
    settlementsUnavailable = !s.ok;
  } else {
    settlementsUnavailable = true;
  }

  // Index settlements by cf_payment_id and by merchant order id for matching.
  const byPayment = new Map<string, SettlementRaw>();
  const byOrder = new Map<string, SettlementRaw>();
  for (const s of settlements) {
    if (s.cfPaymentId) byPayment.set(s.cfPaymentId, s);
    if (s.orderId) byOrder.set(s.orderId, s);
  }

  const rows: LedgerRow[] = orders.map((o) => {
    const cfPaymentId = str(o.cashfree_payment_id);
    const cfOrderId = str(o.cashfree_order_id);
    const match =
      (cfPaymentId && byPayment.get(cfPaymentId)) ||
      (cfOrderId && byOrder.get(cfOrderId)) ||
      null;
    return {
      orderRef: str(o.short_id ?? o.id),
      cfOrderId,
      cfPaymentId,
      amount: num(o.total_price),
      paymentTime: str(o.created_at) || "",
      settled: !!match,
      settlementAmount: match ? match.settlementAmount : null,
      serviceCharge: match ? match.serviceCharge : null,
      serviceTax: match ? match.serviceTax : null,
      transferUtr: match ? match.transferUtr : null,
      transferTime: match ? match.transferTime : null,
    };
  });

  return { success: true, configured: true, rows, settlementsTruncated, settlementsUnavailable };
}

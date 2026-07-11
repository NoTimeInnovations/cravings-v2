"use server";

/**
 * Cashfree settlement reporting for a partner (sub-merchant).
 *
 * We are a Cashfree PARTNER: one platform key (CASHFREE_PARTNER_API_KEY, header
 * x-partner-apikey) acts on behalf of each restaurant via their
 * partners.cashfree_merchant_id (header x-partner-merchantid) — the same auth we
 * already use for /pg/orders. Settlements are read the same way.
 *
 * Settlement rows only exist AFTER Cashfree settles a payment to the merchant's
 * bank (typically T+1/T+2), so this is a reconciliation view, not a live number.
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

export type SettlementRow = {
  cfSettlementId: string | null;
  cfPaymentId: string | null;
  orderId: string | null;
  orderAmount: number;
  settlementAmount: number;
  serviceCharge: number;
  serviceTax: number;
  transferUtr: string | null;
  /** When Cashfree paid the money out to the merchant. */
  transferTime: string | null;
  /** When the customer paid. */
  paymentTime: string | null;
  status: string | null;
};

export type SettlementsResult =
  | { success: true; configured: true; rows: SettlementRow[]; truncated: boolean }
  | { success: false; configured: boolean; error: string };

const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string | null => (v == null ? null : String(v));

// Cashfree has iterated field names across versions; read defensively so a
// minor shape change doesn't silently zero a column. Primary names come from the
// v2025-01-01 Get-Settlements reference.
function normalizeRow(r: any): SettlementRow {
  return {
    cfSettlementId: str(r.cf_settlement_id ?? r.settlement_id),
    cfPaymentId: str(r.cf_payment_id ?? r.payment_id),
    orderId: str(r.order_id ?? r.order_details?.order_id),
    orderAmount: num(r.order_amount ?? r.payment_amount ?? r.order_details?.order_amount),
    settlementAmount: num(
      r.settlement_amount ?? r.amount_settled ?? r.settled_amount ?? r.event_settlement_amount,
    ),
    serviceCharge: num(r.service_charge ?? r.payment_service_charge ?? r.commission),
    serviceTax: num(r.service_tax ?? r.payment_service_tax ?? r.gst),
    transferUtr: str(r.transfer_utr ?? r.utr),
    transferTime: str(r.transfer_time ?? r.settlement_time ?? r.settlement_date ?? r.transfer_utr_date),
    paymentTime: str(r.payment_time ?? r.payment_completion_time),
    status: str(r.status ?? r.settlement_status ?? r.transfer_status),
  };
}

// Extract the array of settlement rows. The confirmed shape is a paginated
// envelope { cursor, limit, data: [...] }; we also handle a bare array and a
// bare single SettlementEntity (a known Cashfree SDK codegen quirk).
function extractRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.settlements)) return data.settlements;
  // Bare single settlement object (no envelope) → wrap it.
  if (data && typeof data === "object" && (data.cf_settlement_id || data.order_amount != null)) {
    return [data];
  }
  return [];
}
// Next-page cursor is the top-level `cursor` on the envelope (null when done).
function extractCursor(data: any): string | null {
  return (data?.cursor ?? data?.next_cursor ?? data?.pagination?.cursor ?? null) || null;
}

const MAX_PAGES = 40; // ~40 * 100 rows safety cap for a single date-range pull
const PAGE_LIMIT = 100;

/**
 * Fetch ALL settlement rows for a partner in [startDate, endDate], looping
 * Cashfree's cursor pagination. Dates are "YYYY-MM-DD" (inclusive); we widen to
 * full-day ISO bounds. The caller paginates/summarizes/exports client-side.
 */
export async function getPartnerSettlements(
  partnerId: string,
  range: { startDate: string; endDate: string },
): Promise<SettlementsResult> {
  const partnerApiKey = process.env.CASHFREE_PARTNER_API_KEY;
  if (!partnerApiKey) return { success: false, configured: false, error: "Payments not configured" };

  const { partners_by_pk: partner } = await fetchFromHasura(getPartnerCashfreeId, { id: partnerId });
  if (!partner?.cashfree_merchant_id || !partner?.accept_payments_via_cashfree) {
    return { success: false, configured: false, error: "Cashfree payments not enabled for this restaurant" };
  }
  const merchantId = resolveMerchantId(partner.cashfree_merchant_id);
  if (!merchantId) {
    return { success: false, configured: false, error: "Cashfree merchant id not configured for this environment" };
  }

  const headers = {
    "Content-Type": "application/json",
    "x-api-version": "2025-01-01",
    "x-partner-apikey": partnerApiKey,
    "x-partner-merchantid": merchantId,
  };

  const startISO = `${range.startDate}T00:00:00Z`;
  const endISO = `${range.endDate}T23:59:59Z`;

  const rows: SettlementRow[] = [];
  let cursor: string | null = null;
  let truncated = false;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      // Cashfree wants the cursor explicitly present (null on the first call).
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
        // If we already gathered some rows, return them rather than failing hard.
        if (rows.length) break;
        return { success: false, configured: true, error: data?.message || "Failed to load settlements" };
      }
      const pageRows = extractRows(data);
      for (const r of pageRows) rows.push(normalizeRow(r));
      cursor = extractCursor(data);
      if (!cursor || pageRows.length === 0) break;
      if (page === MAX_PAGES - 1 && cursor) truncated = true;
    }
  } catch (e: any) {
    console.error("[cf-settlements] error:", e?.message || e);
    if (!rows.length) return { success: false, configured: true, error: "Failed to load settlements" };
  }

  return { success: true, configured: true, rows, truncated };
}

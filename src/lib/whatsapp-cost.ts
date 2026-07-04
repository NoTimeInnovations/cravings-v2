/**
 * Server-only WhatsApp cost engine.
 *
 * Meta's per-message pricing (PMP, since 2025) charges for delivered template
 * messages; the rate depends on the RECIPIENT's country + the message category
 * (marketing / utility / authentication; service is free). Meta's status webhook
 * tells us which messages were `billable` and their `category`, but NOT the price
 * — so we look the price up in an editable rate card (whatsapp_message_rates) and
 * convert it into the BUSINESS's display currency (derived from the WABA number's
 * country, e.g. an Indian number → INR, a Qatar number → QAR).
 *
 * Per-broadcast cost is therefore an ESTIMATE; the month total is cross-checked
 * against Meta's actual pricing_analytics in the phone-quality endpoint.
 */

import { parsePhoneNumberFromString } from "libphonenumber-js";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import countryCurrency from "@/data/countryCurrency.json";
import fxRates from "@/data/fxRates.json";

const CC = countryCurrency as Record<string, string>;
// fxRates.json carries a leading `_comment` string; cast via unknown. Lookups are
// always by ISO currency code, never `_comment`, so the mixed value type is safe.
const FX = fxRates as unknown as Record<string, number>;

export type PricingCategory =
  | "marketing"
  | "utility"
  | "authentication"
  | "service";

// ── Phone → country / currency ───────────────────────────────────
export function recipientMarket(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const raw = String(phone).trim();
  const e164 = raw.startsWith("+") ? raw : `+${raw.replace(/[^\d]/g, "")}`;
  try {
    const parsed = parsePhoneNumberFromString(e164);
    return parsed?.country || null;
  } catch {
    return null;
  }
}

export function currencyForCountry(iso2: string | null): string | null {
  if (!iso2) return null;
  return CC[iso2.toUpperCase()] || null;
}

// Common currency-symbol → ISO fallback (partners.currency stores a symbol).
const SYMBOL_TO_ISO: Record<string, string> = {
  "₹": "INR",
  "Rs": "INR",
  "Rs.": "INR",
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₩": "KRW",
  "₱": "PHP",
  "฿": "THB",
  "₫": "VND",
  "د.إ": "AED",
  "AED": "AED",
  "﷼": "SAR",
  "ر.ق": "QAR",
  "QAR": "QAR",
  "SAR": "SAR",
  "KWD": "KWD",
  "BHD": "BHD",
  "OMR": "OMR",
};

function symbolToIso(sym: string | null | undefined): string | null {
  if (!sym) return null;
  const s = String(sym).trim();
  if (/^[A-Z]{3}$/.test(s)) return s; // already an ISO code
  return SYMBOL_TO_ISO[s] || null;
}

// ── FX conversion (rate-card currency → business display currency) ──
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
): number | null {
  if (from === to) return amount;
  const f = FX[from];
  const t = FX[to];
  if (!f || !t) return null; // can't convert — caller keeps source currency
  // FX is "units per 1 USD": amount/from → USD, then × to.
  return (amount / f) * t;
}

// ── Rate card (cached; rarely changes) ───────────────────────────
interface RateRow {
  market: string;
  category: string;
  price: number;
  currency: string;
}
let rateCache: { at: number; rows: RateRow[] } | null = null;
const RATE_TTL_MS = 10 * 60 * 1000;

async function getRateCard(): Promise<RateRow[]> {
  if (rateCache && Date.now() - rateCache.at < RATE_TTL_MS) return rateCache.rows;
  const query = `
    query WaRates {
      whatsapp_message_rates { market category price currency }
    }
  `;
  try {
    const data = await fetchFromHasuraServer(query, {});
    const rows = (data?.whatsapp_message_rates || []).map((r: any) => ({
      market: String(r.market).toUpperCase(),
      category: String(r.category).toLowerCase(),
      price: Number(r.price),
      currency: String(r.currency).toUpperCase(),
    })) as RateRow[];
    rateCache = { at: Date.now(), rows };
    return rows;
  } catch {
    return rateCache?.rows || [];
  }
}

export async function priceFor(
  market: string | null,
  category: string,
): Promise<{ price: number; currency: string } | null> {
  const rows = await getRateCard();
  const cat = String(category || "").toLowerCase();
  const mkt = (market || "").toUpperCase();
  const exact = rows.find((r) => r.market === mkt && r.category === cat);
  if (exact) return { price: exact.price, currency: exact.currency };
  const def = rows.find((r) => r.market === "DEFAULT" && r.category === cat);
  if (def) return { price: def.price, currency: def.currency };
  return null;
}

// ── Business display currency (cached per partner) ───────────────
let bizCurrencyCache: Record<string, { at: number; cur: string }> = {};
const BIZ_TTL_MS = 30 * 60 * 1000;

export async function getBusinessCurrency(partnerId: string): Promise<string> {
  const hit = bizCurrencyCache[partnerId];
  if (hit && Date.now() - hit.at < BIZ_TTL_MS) return hit.cur;

  let cur = "INR";
  try {
    const query = `
      query BizCur($pid: uuid!) {
        whatsapp_business_integrations(where: { partner_id: { _eq: $pid } }, order_by: {is_primary: desc, updated_at: asc}, limit: 1) {
          display_phone
        }
        partners(where: { id: { _eq: $pid } }, limit: 1) {
          currency
          country
        }
      }
    `;
    const data = await fetchFromHasuraServer(query, { pid: partnerId });
    const displayPhone: string | null =
      data?.whatsapp_business_integrations?.[0]?.display_phone || null;
    const symbol: string | null = data?.partners?.[0]?.currency || null;

    // Primary: the WABA number's country (per product requirement).
    const fromNumber = currencyForCountry(recipientMarket(displayPhone));
    // Fallback: the partner's stored currency symbol → ISO.
    cur = fromNumber || symbolToIso(symbol) || "INR";
  } catch {
    // keep default
  }
  bizCurrencyCache[partnerId] = { at: Date.now(), cur };
  return cur;
}

// ── Cost of one message ──────────────────────────────────────────
export interface ComputedCost {
  amount: number;
  currency: string;
}

/**
 * Cost of a single delivered message in the business's display currency.
 * Returns 0 for non-billable / service messages.
 */
export async function computeMessageCost(params: {
  recipientPhone: string;
  category: string | null | undefined;
  billable: boolean | null | undefined;
  businessCurrency: string;
}): Promise<ComputedCost> {
  const { recipientPhone, category, billable, businessCurrency } = params;
  const cat = String(category || "").toLowerCase();
  if (!billable || cat === "service" || !cat) {
    return { amount: 0, currency: businessCurrency };
  }
  const market = recipientMarket(recipientPhone);
  const rate = await priceFor(market, cat);
  if (!rate) return { amount: 0, currency: businessCurrency };

  const converted = convertCurrency(rate.price, rate.currency, businessCurrency);
  if (converted == null) {
    // Couldn't FX-convert — fall back to the rate's own currency so we never
    // silently show a wrong number in the business currency.
    return { amount: round6(rate.price), currency: rate.currency };
  }
  return { amount: round6(converted), currency: businessCurrency };
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

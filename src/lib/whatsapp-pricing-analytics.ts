/**
 * Server-only WhatsApp REAL-cost engine (Meta `pricing_analytics`).
 *
 * Meta does NOT return a per-message price in the send response or the delivery
 * webhook — only `billable` + `category`. The authoritative cost lives in the
 * WhatsApp Business Account `pricing_analytics` Graph field, which reports actual
 * COST and VOLUME aggregated per (time-bucket, country, category, pricing_type,
 * tier). Since billing is deterministic per bucket, the real per-message rate is
 *   rate = cost / volume
 * for the bucket a message falls in. Assigning that rate to each delivered message
 * reconciles EXACTLY to Meta's totals and self-corrects for volume tiers + FX
 * (cost is already in the WABA's billing currency).
 *
 * This module:
 *   1. fetches pricing_analytics (all dimensions) — best-effort, never throws,
 *   2. stores every bucket in `whatsapp_pricing_analytics` (the audit ledger +
 *      the source of "observed" real rates used for future estimates),
 *   3. reconciles delivered recipients / ledger rows to their bucket's real rate.
 *
 * The analytics ledger is read/written via Hasura's raw-SQL endpoint (/v2/query)
 * so the freshly-created table needs NO metadata tracking — only the migration.
 */

import { recipientMarket, priceFor, convertCurrency } from "@/lib/whatsapp-cost";

const GRAPH = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v21.0"}`;

export type Granularity = "HALF_HOUR" | "DAILY" | "MONTHLY";

export interface PricingPoint {
  periodStart: number; // unix seconds
  periodEnd: number; // unix seconds
  country: string; // ISO-2, upper
  pricingCategory: string; // MARKETING|UTILITY|AUTHENTICATION|... (upper)
  pricingType: string; // REGULAR|FREE_*|... (upper)
  tier: string;
  volume: number;
  cost: number;
  currency: string | null;
}

// ── Raw-SQL bridge to Hasura (/v2/query) — used ONLY for the analytics ledger ──
function runSqlEndpoint(): { url: string; secret: string } | null {
  const gql =
    process.env.HASURA_SERVER_GRAPHQL_ENDPOINT ||
    process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT ||
    "";
  const secret =
    process.env.HASURA_SERVER_ADMIN_SECRET ||
    process.env.HASURA_GRAPHQL_ADMIN_SECRET ||
    "";
  if (!gql || !secret) return null;
  // .../v1/graphql -> .../v2/query
  const url = gql.replace(/\/v1\/graphql\/?$/, "/v2/query");
  return { url, secret };
}

// The WhatsApp tables live in the "neon db" Hasura source (see hasura/migrations/
// "neon db"/...), NOT "default" — raw SQL must target it explicitly. Overridable.
const SQL_SOURCE = process.env.HASURA_SQL_SOURCE || "neon db";

async function runSql(sql: string): Promise<any[][]> {
  const ep = runSqlEndpoint();
  if (!ep) throw new Error("Hasura raw-SQL endpoint not configured");
  const res = await fetch(ep.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": ep.secret,
    },
    body: JSON.stringify({
      type: "run_sql",
      args: { source: SQL_SOURCE, sql, cascade: false, read_only: false },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || data?.internal?.error?.message || `run_sql ${res.status}`);
  }
  // TuplesOk -> result is [ [colnames], ...rows ]; CommandOk -> no result.
  return Array.isArray(data?.result) ? data.result : [];
}

// SQL literal escaping (run_sql has no bind params). Strings: double single
// quotes. Numbers: validated finite. Used only on server/admin-controlled data.
function sqlStr(v: string | null | undefined): string {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlNum(v: number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`non-finite number in SQL: ${v}`);
  return String(n);
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ── 1) Fetch pricing_analytics with full dimensions (best-effort) ──────────────
export async function fetchPricingAnalytics(
  wabaId: string,
  token: string,
  startSec: number,
  endSec: number,
  granularity: Granularity = "DAILY",
): Promise<{ points: PricingPoint[]; raw: any; error: string | null }> {
  if (!wabaId || !token) {
    return { points: [], raw: null, error: "missing waba id / token" };
  }
  const dims = `["COUNTRY","PRICING_CATEGORY","PRICING_TYPE","TIER"]`;
  const metrics = `["COST","VOLUME"]`;
  const field =
    `pricing_analytics.start(${Math.floor(startSec)}).end(${Math.floor(endSec)})` +
    `.granularity(${granularity}).dimensions(${dims}).metric_types(${metrics})`;
  try {
    const res = await fetch(
      `${GRAPH}/${wabaId}?` +
        new URLSearchParams({ fields: field, access_token: token }),
    );
    const data = await res.json();
    if (!res.ok) {
      return {
        points: [],
        raw: data,
        error: data?.error?.message || `Meta ${res.status}`,
      };
    }
    return { points: normalizePoints(data), raw: data, error: null };
  } catch (e: any) {
    return { points: [], raw: null, error: e?.message || "fetch failed" };
  }
}

// Defensive parse — Meta nests data_points under pricing_analytics.data[]. Field
// names are read tolerantly so a minor shape change doesn't silently zero costs.
export function normalizePoints(data: any): PricingPoint[] {
  const groups: any[] = data?.pricing_analytics?.data || [];
  const parentCurrency =
    data?.pricing_analytics?.currency || data?.currency || null;
  const out: PricingPoint[] = [];
  for (const g of groups) {
    const pts: any[] = g?.data_points || g?.dataPoints || [];
    for (const p of pts) {
      out.push({
        periodStart: num(p?.start),
        periodEnd: num(p?.end),
        country: String(p?.country ?? p?.dimension_country ?? "").toUpperCase(),
        pricingCategory: String(
          p?.pricing_category ?? p?.category ?? "",
        ).toUpperCase(),
        pricingType: String(p?.pricing_type ?? p?.type ?? "").toUpperCase(),
        tier: p?.tier != null ? String(p.tier) : "",
        volume: num(p?.volume),
        cost: num(p?.cost),
        currency: p?.currency || g?.currency || parentCurrency || null,
      });
    }
  }
  return out;
}

// ── 2) Store buckets (idempotent upsert via raw SQL) ───────────────────────────
export async function storePricingAnalytics(
  wabaId: string,
  partnerId: string | null,
  granularity: Granularity,
  points: PricingPoint[],
): Promise<number> {
  const rows = points.filter((p) => p.periodStart && p.periodEnd);
  if (!rows.length) return 0;
  const values = rows
    .map((p) => {
      return (
        `(${sqlStr(wabaId)}, ${partnerId ? sqlStr(partnerId) + "::uuid" : "NULL"}, ` +
        `to_timestamp(${sqlNum(p.periodStart)}), to_timestamp(${sqlNum(p.periodEnd)}), ` +
        `${sqlStr(granularity)}, ${sqlStr(p.country)}, ${sqlStr(p.pricingCategory)}, ` +
        `${sqlStr(p.pricingType)}, ${sqlStr(p.tier)}, ${sqlNum(p.volume)}, ` +
        `${sqlNum(p.cost)}, ${sqlStr(p.currency)}, now())`
      );
    })
    .join(",\n");
  const sql = `
    INSERT INTO public.whatsapp_pricing_analytics
      (waba_id, partner_id, period_start, period_end, granularity, country,
       pricing_category, pricing_type, tier, volume, cost, currency, fetched_at)
    VALUES
      ${values}
    ON CONFLICT (waba_id, period_start, period_end, granularity, country,
                 pricing_category, pricing_type, tier)
    DO UPDATE SET
      volume = EXCLUDED.volume,
      cost = EXCLUDED.cost,
      currency = COALESCE(EXCLUDED.currency, public.whatsapp_pricing_analytics.currency),
      partner_id = COALESCE(EXCLUDED.partner_id, public.whatsapp_pricing_analytics.partner_id),
      fetched_at = now();
  `;
  await runSql(sql);
  return rows.length;
}

// ── 3) Observed real rates (latest cost/volume per market/category/type) ───────
export interface ObservedRate {
  country: string;
  category: string; // upper
  pricingType: string; // upper
  rate: number;
  currency: string | null;
}

let observedCache: { at: number; rows: ObservedRate[] } | null = null;
const OBSERVED_TTL_MS = 10 * 60 * 1000;

export async function getObservedRates(): Promise<ObservedRate[]> {
  if (observedCache && Date.now() - observedCache.at < OBSERVED_TTL_MS) {
    return observedCache.rows;
  }
  try {
    const result = await runSql(`
      SELECT DISTINCT ON (country, pricing_category, pricing_type)
        country, pricing_category, pricing_type, currency,
        CASE WHEN volume > 0 THEN (cost / volume) ELSE 0 END AS rate
      FROM public.whatsapp_pricing_analytics
      WHERE volume > 0
      ORDER BY country, pricing_category, pricing_type, period_end DESC;
    `);
    // result[0] = column names; rest = rows (string cells).
    const rows: ObservedRate[] = (result.slice(1) || []).map((r) => ({
      country: String(r[0] || "").toUpperCase(),
      category: String(r[1] || "").toUpperCase(),
      pricingType: String(r[2] || "").toUpperCase(),
      currency: r[3] || null,
      rate: num(r[4]),
    }));
    observedCache = { at: Date.now(), rows };
    return rows;
  } catch (e) {
    console.error("getObservedRates failed:", e);
    // Cache an empty result briefly so a missing table (pre-migration) doesn't
    // hammer raw SQL on every delivery; estimates fall back to the published card.
    observedCache = { at: Date.now(), rows: observedCache?.rows || [] };
    return observedCache.rows;
  }
}

// Most recent observed real rate for a market+category (any pricing type unless
// specified). Returns the billed rate in the WABA's billing currency — already
// correct, no FX needed. null when this market has no real history yet.
export async function observedRateFor(
  country: string | null,
  category: string,
  pricingType?: string,
): Promise<{ rate: number; currency: string | null } | null> {
  if (!country) return null;
  const rows = await getObservedRates();
  const c = country.toUpperCase();
  const cat = (category || "").toUpperCase();
  const pt = (pricingType || "").toUpperCase();
  const match =
    (pt && rows.find((r) => r.country === c && r.category === cat && r.pricingType === pt)) ||
    rows.find((r) => r.country === c && r.category === cat && r.pricingType === "REGULAR") ||
    rows.find((r) => r.country === c && r.category === cat);
  return match ? { rate: match.rate, currency: match.currency } : null;
}

// ── Provisional ESTIMATE (shown until reconciliation replaces it) ──────────────
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Best provisional cost for a single delivered message, in the business's display
 * currency. Priority:
 *   1) the REAL rate already observed for this market+category from this account's
 *      own pricing_analytics (already in the billing currency — most accurate),
 *   2) the official published rate card (FX-converted),
 *   3) zero (free / unknown).
 * The returned `source` drives the UI label and is overwritten by reconciliation.
 */
export async function estimateMessageCost(params: {
  recipientPhone: string;
  category: string | null | undefined;
  pricingType?: string | null;
  billable: boolean | null | undefined;
  businessCurrency: string;
}): Promise<{ amount: number; currency: string; source: string }> {
  const { recipientPhone, category, pricingType, billable, businessCurrency } = params;
  const cat = String(category || "").toLowerCase();
  if (billable === false || cat === "service" || !cat) {
    return { amount: 0, currency: businessCurrency, source: "free" };
  }
  const country = recipientMarket(recipientPhone);

  // 1) Real observed rate from this account's own billing history.
  const obs = await observedRateFor(country, cat, pricingType || undefined);
  if (obs && obs.rate > 0) {
    const cur = obs.currency || businessCurrency;
    if (cur === businessCurrency) {
      return { amount: round6(obs.rate), currency: businessCurrency, source: "observed" };
    }
    const conv = convertCurrency(obs.rate, cur, businessCurrency);
    return conv != null
      ? { amount: round6(conv), currency: businessCurrency, source: "observed" }
      : { amount: round6(obs.rate), currency: cur, source: "observed" };
  }

  // 2) Published rate card (FX-converted).
  const rate = await priceFor(country, cat);
  if (!rate) return { amount: 0, currency: businessCurrency, source: "none" };
  const conv = convertCurrency(rate.price, rate.currency, businessCurrency);
  if (conv == null) {
    return { amount: round6(rate.price), currency: rate.currency, source: "published" };
  }
  return { amount: round6(conv), currency: businessCurrency, source: "published" };
}

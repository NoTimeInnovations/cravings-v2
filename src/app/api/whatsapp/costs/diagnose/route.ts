import { NextRequest, NextResponse } from "next/server";
import {
  getPartnerWabaIntegration,
  partnerWabaToken,
} from "@/lib/whatsapp-meta";
import {
  fetchPricingAnalytics,
  normalizePoints,
  getObservedRates,
  type Granularity,
} from "@/lib/whatsapp-pricing-analytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/costs/diagnose?partnerId=<uuid>&days=2&granularity=DAILY
 *
 * Read-only. Calls Meta's pricing_analytics for the partner's WABA and returns
 * BOTH the raw Meta response and our normalized parse, so the exact field shape
 * can be verified against a live account (Meta's docs don't publish the
 * data_point schema). Use this to confirm reconciliation will parse correctly.
 */
export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }
  const days = Math.min(31, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 2));
  const granularity = (req.nextUrl.searchParams.get("granularity") ||
    "DAILY") as Granularity;

  const integ = await getPartnerWabaIntegration(partnerId);
  if (!integ?.waba_id) {
    return NextResponse.json({ connected: false, error: "No WABA for partner" });
  }

  const now = Math.floor(Date.now() / 1000);
  const sinceSec = now - days * 86400;
  const { points, raw, error } = await fetchPricingAnalytics(
    integ.waba_id,
    partnerWabaToken(integ),
    sinceSec,
    now,
    granularity,
  );

  let observed: any[] = [];
  try {
    observed = await getObservedRates();
  } catch {
    /* table may not exist yet — fine */
  }

  return NextResponse.json({
    connected: true,
    wabaId: integ.waba_id,
    window: { sinceSec, untilSec: now, granularity },
    error,
    pointCount: points.length,
    normalizedSample: points.slice(0, 20),
    derivedRates: points.slice(0, 20).map((p) => ({
      country: p.country,
      category: p.pricingCategory,
      type: p.pricingType,
      tier: p.tier,
      volume: p.volume,
      cost: p.cost,
      currency: p.currency,
      ratePerMessage: p.volume > 0 ? p.cost / p.volume : null,
    })),
    observedRateCacheSample: observed.slice(0, 20),
    // Raw Meta payload (re-parsed defensively) so we can confirm field names.
    rawReparsedCount: normalizePoints(raw).length,
    raw,
  });
}

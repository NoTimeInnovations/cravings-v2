import { NextRequest, NextResponse } from "next/server";
import {
  getPartnerWabaIntegration,
  partnerWabaToken,
} from "@/lib/whatsapp-meta";
import {
  fetchTemplateAnalytics,
  summarizeButtonClicks,
  type TemplateMetric,
} from "@/lib/whatsapp-template-analytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/analytics/template
 *   ?partnerId=<uuid>
 *   &templateId=<meta_template_id>[,<meta_template_id>...]
 *   &days=30                     (or explicit &start=<unix>&end=<unix>)
 *
 * Returns per-template button-click totals (+ sent/delivered/read) from Meta's
 * template_analytics for the partner's WABA. `raw` is included so the exact
 * field shape can be verified against a live account.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const partnerId = sp.get("partnerId");
  const templateIdsParam = sp.get("templateId");
  if (!partnerId || !templateIdsParam) {
    return NextResponse.json(
      { error: "partnerId and templateId are required" },
      { status: 400 },
    );
  }
  const templateIds = templateIdsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const now = Math.floor(Date.now() / 1000);
  const startParam = Number(sp.get("start"));
  const endParam = Number(sp.get("end"));
  // Meta rejects a start >= 90 days ago ("within the last 90 days"), so cap
  // comfortably under 90.
  const days = Math.min(88, Math.max(1, Number(sp.get("days")) || 30));
  const start = Number.isFinite(startParam) && startParam > 0 ? startParam : now - days * 86400;
  const end = Number.isFinite(endParam) && endParam > 0 ? endParam : now;

  const integ = await getPartnerWabaIntegration(partnerId);
  if (!integ?.waba_id) {
    return NextResponse.json({ connected: false, error: "No WABA for partner" });
  }

  const metricTypes: TemplateMetric[] = ["SENT", "DELIVERED", "READ", "CLICKED"];
  const { raw, error } = await fetchTemplateAnalytics(
    integ.waba_id,
    partnerWabaToken(integ),
    { templateIds, start, end, metricTypes },
  );

  const summary = summarizeButtonClicks(raw);

  return NextResponse.json({
    connected: true,
    wabaId: integ.waba_id,
    window: { start, end },
    templateIds,
    error,
    summary, // [{ templateId, totalClicks, byButton:[{button,type,count}], sent, delivered, read }]
    raw, // full Meta payload — verify field shape here if numbers look off
  });
}

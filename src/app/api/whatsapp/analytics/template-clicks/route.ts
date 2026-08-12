import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/analytics/template-clicks
 *   ?partnerId=<uuid>[&templateName=<name>][&days=30]
 *
 * Returns self-tracked quick-reply button-click counts per template, sourced
 * from whatsapp_template_click_events (populated by the WhatsApp webhook).
 * Works for SMB/coexistence WABAs where Meta's template_analytics is blocked.
 * (URL/CTA button taps are not captured — Meta sends no webhook for them.)
 */
const Q = `
  query TemplateClicks($partner: uuid!, $since: timestamptz!) {
    whatsapp_template_click_events(
      where: { partner_id: { _eq: $partner }, created_at: { _gte: $since } },
      order_by: { created_at: desc },
      limit: 5000
    ) {
      template_name
      button_text
      created_at
    }
  }
`;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const partnerId = sp.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "partnerId is required" }, { status: 400 });
  }
  const templateName = sp.get("templateName");
  const days = Math.min(365, Math.max(1, Number(sp.get("days")) || 30));
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const d = await fetchFromHasura(Q, { partner: partnerId, since });
  let rows: { template_name: string | null; button_text: string | null }[] =
    d?.whatsapp_template_click_events || [];
  if (templateName) rows = rows.filter((r) => r.template_name === templateName);

  const byTemplate: Record<string, { total: number; byButton: Record<string, number> }> = {};
  for (const r of rows) {
    const t = r.template_name || "unknown";
    const b = r.button_text || "button";
    const e = (byTemplate[t] ||= { total: 0, byButton: {} });
    e.total++;
    e.byButton[b] = (e.byButton[b] || 0) + 1;
  }

  const summary = Object.entries(byTemplate).map(([template, v]) => ({
    template,
    totalClicks: v.total,
    byButton: Object.entries(v.byButton)
      .map(([button, count]) => ({ button, count }))
      .sort((a, b) => b.count - a.count),
  }));

  return NextResponse.json({
    partnerId,
    days,
    totalClicks: rows.length,
    summary,
  });
}

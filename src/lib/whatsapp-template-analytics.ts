// Meta WhatsApp Template Analytics — button clicks (+ sent/delivered/read).
//
// Wraps the Graph API `template_analytics` edge on the WABA node. This is the
// same data the WhatsApp Manager "Performance" + "Button clicks" cards show.
//
// NOTE: Meta does not fully publish the data_point schema (same caveat as
// pricing_analytics), so callers should surface `raw` for verification against
// a live account. The parser below is defensive.

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type TemplateMetric = "SENT" | "DELIVERED" | "READ" | "CLICKED";

export interface TemplateAnalyticsResult {
  raw: any;
  error?: string;
}

/**
 * Call `/{wabaId}/template_analytics`. Arrays are JSON-encoded per Meta's
 * documented query format (e.g. metric_types=["CLICKED"], template_ids=["123"]).
 */
export async function fetchTemplateAnalytics(
  wabaId: string,
  token: string,
  opts: {
    templateIds: string[]; // Meta numeric template ids (meta_template_id)
    start: number; // unix seconds
    end: number; // unix seconds
    granularity?: "DAILY";
    metricTypes?: TemplateMetric[];
  },
): Promise<TemplateAnalyticsResult> {
  const params = new URLSearchParams({
    start: String(opts.start),
    end: String(opts.end),
    granularity: opts.granularity || "DAILY",
    metric_types: JSON.stringify(opts.metricTypes || ["CLICKED"]),
    template_ids: JSON.stringify(opts.templateIds),
    access_token: token,
  });
  const url = `${GRAPH_API_BASE}/${wabaId}/template_analytics?${params}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { raw, error: raw?.error?.message || `HTTP ${res.status}` };
    }
    return { raw };
  } catch (e: any) {
    return { raw: null, error: e?.name === "AbortError" ? "timeout" : e?.message };
  }
}

export interface ButtonClickSummary {
  templateId: string;
  totalClicks: number;
  byButton: { button: string; type?: string; count: number }[];
  sent?: number;
  delivered?: number;
  read?: number;
}

/**
 * Best-effort parse of the template_analytics payload into per-template button
 * click totals. Tolerates missing/renamed fields — anything it can't read is
 * simply skipped (verify against `raw` for a given account if numbers look off).
 */
export function summarizeButtonClicks(raw: any): ButtonClickSummary[] {
  const byTemplate = new Map<string, ButtonClickSummary>();
  const series: any[] = Array.isArray(raw?.data) ? raw.data : [];

  const get = (tid: string): ButtonClickSummary => {
    let s = byTemplate.get(tid);
    if (!s) {
      s = { templateId: tid, totalClicks: 0, byButton: [], sent: 0, delivered: 0, read: 0 };
      byTemplate.set(tid, s);
    }
    return s;
  };

  for (const block of series) {
    const points: any[] = Array.isArray(block?.data_points) ? block.data_points : [];
    for (const p of points) {
      const tid = String(p?.template_id ?? "unknown");
      const s = get(tid);
      if (typeof p?.sent === "number") s.sent = (s.sent || 0) + p.sent;
      if (typeof p?.delivered === "number") s.delivered = (s.delivered || 0) + p.delivered;
      if (typeof p?.read === "number") s.read = (s.read || 0) + p.read;

      // `clicked` is an array of button click breakdowns.
      const clicks: any[] = Array.isArray(p?.clicked) ? p.clicked : [];
      for (const c of clicks) {
        const count = Number(c?.count ?? c?.click_count ?? 0) || 0;
        const label = String(c?.button_content ?? c?.button ?? c?.type ?? "button");
        s.totalClicks += count;
        const existing = s.byButton.find((b) => b.button === label);
        if (existing) existing.count += count;
        else s.byButton.push({ button: label, type: c?.type, count });
      }
    }
  }
  return [...byTemplate.values()];
}

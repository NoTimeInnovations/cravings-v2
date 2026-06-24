import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  explainWhatsAppError,
  categoryForCode,
  ERROR_CATEGORY_META,
} from "@/lib/whatsapp-errors";

// GET /api/whatsapp/broadcasts/[id]?partnerId=<uuid>
// Returns the broadcast plus a sample of failed recipients for diagnostics.
const GET_DETAIL = `
  query GetBroadcast($id: uuid!, $partner_id: uuid!) {
    whatsapp_broadcasts(
      where: { id: { _eq: $id }, partner_id: { _eq: $partner_id } }
      limit: 1
    ) {
      id
      template_name
      language
      category
      status
      scheduled_at
      daily_limit
      total_recipients
      sent_count
      delivered_count
      read_count
      failed_count
      total_cost
      cost_currency
      last_error
      started_at
      completed_at
      created_at
      variable_map
      header_params
      failures: recipients(
        where: { status: { _eq: "failed" } }
        limit: 50
        order_by: { failed_at: desc_nulls_last }
      ) {
        id
        phone
        name
        error
        error_code
        error_title
        failed_at
      }
    }
  }
`;

// All failed recipients' error codes (lightweight: just the code + title) so we
// can build a full per-code breakdown, not just the 50-row failure sample.
const GET_FAILED_CODES = `
  query FailedCodes($id: uuid!) {
    whatsapp_broadcast_recipients(
      where: { broadcast_id: { _eq: $id }, status: { _eq: "failed" } }
      limit: 20000
    ) {
      error_code
      error_title
      error
    }
  }
`;

interface ErrorBucket {
  code: string | null;
  count: number;
  category: string;
  categoryLabel: string;
  side: string;
  retryable: boolean;
  summary: string;
  action?: string;
  metaTitle: string | null;
}

// Group failed recipients by Meta error code and attach a friendly explanation +
// category to each, sorted by frequency. Lets the owner categorise every failure.
function buildErrorBreakdown(rows: any[]): ErrorBucket[] {
  const byCode = new Map<string, { count: number; title: string | null; raw: string | null }>();
  for (const r of rows || []) {
    const key = r?.error_code != null && r.error_code !== "" ? String(r.error_code) : "unknown";
    const hit = byCode.get(key);
    if (hit) hit.count++;
    else byCode.set(key, { count: 1, title: r?.error_title || null, raw: r?.error || null });
  }
  const buckets: ErrorBucket[] = [];
  for (const [code, info] of byCode) {
    const numeric = code === "unknown" ? null : code;
    const cat = categoryForCode(numeric);
    const meta = ERROR_CATEGORY_META[cat];
    const explained = explainWhatsAppError(numeric, info.raw);
    buckets.push({
      code: numeric,
      count: info.count,
      category: cat,
      categoryLabel: meta.label,
      side: meta.side,
      retryable: meta.retryable,
      summary: explained.summary,
      action: explained.action,
      metaTitle: info.title,
    });
  }
  return buckets.sort((a, b) => b.count - a.count);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }
  try {
    const data = await fetchFromHasura(GET_DETAIL, { id, partner_id: partnerId });
    const broadcast = data?.whatsapp_broadcasts?.[0];
    if (!broadcast) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Full per-code failure breakdown (only worth querying when there are failures).
    let errorBreakdown: ErrorBucket[] = [];
    if ((broadcast.failed_count || 0) > 0) {
      const fc = await fetchFromHasura(GET_FAILED_CODES, { id });
      errorBreakdown = buildErrorBreakdown(fc?.whatsapp_broadcast_recipients || []);
    }
    return NextResponse.json({ broadcast, errorBreakdown });
  } catch (e: any) {
    console.error("Get broadcast failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load broadcast" },
      { status: 500 },
    );
  }
}

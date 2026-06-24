import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { categoryForCode, ERROR_CATEGORY_META } from "@/lib/whatsapp-errors";

// GET /api/whatsapp/broadcasts/[id]/export?partnerId=<uuid>
// Returns the broadcast summary + EVERY recipient with the full delivery
// timeline + failure reason, for building a downloadable Excel report. Read-only.

const OWNS_SUMMARY = `
  query OwnsSummary($id: uuid!, $pid: uuid!) {
    whatsapp_broadcasts(where: { id: { _eq: $id }, partner_id: { _eq: $pid } }, limit: 1) {
      id
      template_name
      language
      category
      status
      scheduled_at
      total_recipients
      sent_count
      delivered_count
      read_count
      failed_count
      total_cost
      cost_currency
      started_at
      completed_at
      created_at
    }
  }
`;

// Page through recipients so very large broadcasts export completely.
const PAGE = `
  query ExportRecipients($id: uuid!, $limit: Int!, $offset: Int!) {
    whatsapp_broadcast_recipients(
      where: { broadcast_id: { _eq: $id } }
      order_by: { created_at: asc }
      limit: $limit
      offset: $offset
    ) {
      phone
      name
      status
      sent_at
      delivered_at
      read_at
      failed_at
      error_code
      error_title
      error
      cost_amount
      cost_currency
    }
  }
`;

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
    const sum = await fetchFromHasura(OWNS_SUMMARY, { id, pid: partnerId });
    const broadcast = sum?.whatsapp_broadcasts?.[0];
    if (!broadcast) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Pull all recipients in chunks of 1000 (a hard cap of 100k guards memory).
    const CHUNK = 1000;
    const MAX = 100_000;
    const recipients: any[] = [];
    for (let offset = 0; offset < MAX; offset += CHUNK) {
      const data = await fetchFromHasura(PAGE, { id, limit: CHUNK, offset });
      const rows = data?.whatsapp_broadcast_recipients || [];
      recipients.push(...rows);
      if (rows.length < CHUNK) break;
    }

    // Attach a human category/side to every failed row so the sheet is readable.
    const enriched = recipients.map((r) => {
      const cat =
        r.status === "failed" ? categoryForCode(r.error_code) : null;
      const meta = cat ? ERROR_CATEGORY_META[cat] : null;
      return {
        ...r,
        error_category: meta?.label ?? null,
        error_side: meta?.side ?? null,
      };
    });

    return NextResponse.json({ broadcast, recipients: enriched });
  } catch (e: any) {
    console.error("Export broadcast failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to export broadcast" },
      { status: 500 },
    );
  }
}

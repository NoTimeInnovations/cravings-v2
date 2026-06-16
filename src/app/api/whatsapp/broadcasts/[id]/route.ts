import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

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
      failed_count
      last_error
      started_at
      completed_at
      created_at
      variable_map
      header_params
      failures: recipients(
        where: { status: { _eq: "failed" } }
        limit: 50
        order_by: { sent_at: desc }
      ) {
        id
        phone
        name
        error
      }
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
    const data = await fetchFromHasura(GET_DETAIL, { id, partner_id: partnerId });
    const broadcast = data?.whatsapp_broadcasts?.[0];
    if (!broadcast) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ broadcast });
  } catch (e: any) {
    console.error("Get broadcast failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load broadcast" },
      { status: 500 },
    );
  }
}

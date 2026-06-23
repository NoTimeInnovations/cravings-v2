import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// GET /api/whatsapp/broadcasts/[id]/recipients
//   ?partnerId=<uuid>&search=<phone|name>&status=<all|pending|sent|delivered|read|failed>
//   &limit=<n>&offset=<n>
//
// Searchable, paginated per-recipient view for a broadcast, plus current-status
// bucket counts (for the filter chips). Status buckets are the recipient's
// CURRENT state and sum to the total (pending+sent+delivered+read+failed).

// Confirm the broadcast belongs to the partner before exposing its recipients.
const OWNS = `
  query OwnsBroadcast($id: uuid!, $pid: uuid!) {
    whatsapp_broadcasts(where: { id: { _eq: $id }, partner_id: { _eq: $pid } }, limit: 1) {
      id
    }
  }
`;

const LIST = `
  query Recipients(
    $where: whatsapp_broadcast_recipients_bool_exp!
    $limit: Int!
    $offset: Int!
  ) {
    whatsapp_broadcast_recipients(
      where: $where
      order_by: { created_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      phone
      name
      status
      sent_at
      delivered_at
      read_at
      failed_at
      error
      error_code
      error_title
      cost_amount
      cost_currency
    }
    filtered: whatsapp_broadcast_recipients_aggregate(where: $where) {
      aggregate { count }
    }
  }
`;

const COUNTS = `
  query StatusCounts($bid: uuid!) {
    all: whatsapp_broadcast_recipients_aggregate(where: { broadcast_id: { _eq: $bid } }) { aggregate { count } }
    pending: whatsapp_broadcast_recipients_aggregate(where: { broadcast_id: { _eq: $bid }, status: { _eq: "pending" } }) { aggregate { count } }
    sent: whatsapp_broadcast_recipients_aggregate(where: { broadcast_id: { _eq: $bid }, status: { _eq: "sent" } }) { aggregate { count } }
    delivered: whatsapp_broadcast_recipients_aggregate(where: { broadcast_id: { _eq: $bid }, status: { _eq: "delivered" } }) { aggregate { count } }
    read: whatsapp_broadcast_recipients_aggregate(where: { broadcast_id: { _eq: $bid }, status: { _eq: "read" } }) { aggregate { count } }
    failed: whatsapp_broadcast_recipients_aggregate(where: { broadcast_id: { _eq: $bid }, status: { _eq: "failed" } }) { aggregate { count } }
  }
`;

const VALID_STATUS = ["pending", "sent", "delivered", "read", "failed"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const partnerId = sp.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }

  const search = (sp.get("search") || "").trim();
  const statusFilter = (sp.get("status") || "all").toLowerCase();
  const limit = Math.min(Math.max(parseInt(sp.get("limit") || "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(sp.get("offset") || "0", 10) || 0, 0);

  try {
    const owns = await fetchFromHasura(OWNS, { id, pid: partnerId });
    if (!owns?.whatsapp_broadcasts?.[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const where: any = { broadcast_id: { _eq: id } };
    if (statusFilter !== "all" && VALID_STATUS.includes(statusFilter)) {
      where.status = { _eq: statusFilter };
    }
    if (search) {
      const like = `%${search}%`;
      where._or = [{ phone: { _ilike: like } }, { name: { _ilike: like } }];
    }

    const [list, counts] = await Promise.all([
      fetchFromHasura(LIST, { where, limit, offset }),
      fetchFromHasura(COUNTS, { bid: id }),
    ]);

    const c = (k: string) =>
      counts?.[k]?.aggregate?.count ?? 0;

    return NextResponse.json({
      recipients: list?.whatsapp_broadcast_recipients || [],
      filteredTotal: list?.filtered?.aggregate?.count ?? 0,
      counts: {
        all: c("all"),
        pending: c("pending"),
        sent: c("sent"),
        delivered: c("delivered"),
        read: c("read"),
        failed: c("failed"),
      },
    });
  } catch (e: any) {
    console.error("List recipients failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load recipients" },
      { status: 500 },
    );
  }
}

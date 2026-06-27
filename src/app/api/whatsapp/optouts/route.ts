import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { normalizePhone } from "@/lib/whatsapp-broadcast";

// Per-partner broadcast blocklist (opt-outs). Numbers here are excluded from all
// of the partner's broadcasts — both at creation AND at send time. Rows are
// added automatically when a customer replies STOP (reason 'STOP') or manually by
// the partner (reason 'MANUAL'). Unique on (partner_id, phone).

const LIST = `
  query Optouts($pid: uuid!) {
    whatsapp_broadcast_optouts(
      where: { partner_id: { _eq: $pid } }
      order_by: { created_at: desc }
    ) {
      id
      phone
      reason
      created_at
    }
    whatsapp_broadcast_optouts_aggregate(where: { partner_id: { _eq: $pid } }) {
      aggregate { count }
    }
  }
`;

const LIST_SEARCH = `
  query OptoutsSearch($pid: uuid!, $like: String!) {
    whatsapp_broadcast_optouts(
      where: { partner_id: { _eq: $pid }, phone: { _ilike: $like } }
      order_by: { created_at: desc }
    ) {
      id
      phone
      reason
      created_at
    }
    whatsapp_broadcast_optouts_aggregate(where: { partner_id: { _eq: $pid } }) {
      aggregate { count }
    }
  }
`;

const INSERT = `
  mutation AddOptout($obj: whatsapp_broadcast_optouts_insert_input!) {
    insert_whatsapp_broadcast_optouts_one(object: $obj) {
      id
      phone
      reason
      created_at
    }
  }
`;

const DELETE_OPTOUT = `
  mutation RemoveOptout($pid: uuid!, $phone: String!) {
    delete_whatsapp_broadcast_optouts(
      where: { partner_id: { _eq: $pid }, phone: { _eq: $phone } }
    ) {
      affected_rows
    }
  }
`;

// GET /api/whatsapp/optouts?partnerId=<uuid>&search=<phone>
export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  const search = (req.nextUrl.searchParams.get("search") || "").trim();
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }
  try {
    const data = search
      ? await fetchFromHasura(LIST_SEARCH, { pid: partnerId, like: `%${search.replace(/[^\d]/g, "")}%` })
      : await fetchFromHasura(LIST, { pid: partnerId });
    return NextResponse.json({
      optouts: data?.whatsapp_broadcast_optouts || [],
      total: data?.whatsapp_broadcast_optouts_aggregate?.aggregate?.count || 0,
    });
  } catch (e: any) {
    console.error("List optouts failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to load blocklist" }, { status: 500 });
  }
}

// POST /api/whatsapp/optouts  { partnerId, phone, reason? }  -> add a manual block
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const partnerId = body?.partnerId;
  const rawPhone = String(body?.phone ?? "").trim();
  if (!partnerId || !rawPhone) {
    return NextResponse.json({ error: "Missing partnerId or phone" }, { status: 400 });
  }
  const digits = rawPhone.replace(/[\s\-\+\(\)]/g, "");
  if (digits.length < 10) {
    return NextResponse.json(
      { error: "Enter the full number with country code (e.g. 97455265466 or 919633440123)." },
      { status: 400 },
    );
  }
  const phone = normalizePhone(rawPhone);
  try {
    const data = await fetchFromHasura(INSERT, {
      obj: { partner_id: partnerId, phone, reason: body?.reason || "MANUAL" },
    });
    return NextResponse.json({ optout: data?.insert_whatsapp_broadcast_optouts_one });
  } catch (e: any) {
    // Already blocked = success (idempotent).
    if (String(e?.message || e).toLowerCase().includes("unique")) {
      return NextResponse.json({ optout: { phone, reason: "MANUAL" }, alreadyBlocked: true });
    }
    console.error("Add optout failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to add to blocklist" }, { status: 500 });
  }
}

// DELETE /api/whatsapp/optouts  { partnerId, phone }  -> unblock (resubscribe)
export async function DELETE(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const partnerId = body?.partnerId;
  const rawPhone = String(body?.phone ?? "").trim();
  if (!partnerId || !rawPhone) {
    return NextResponse.json({ error: "Missing partnerId or phone" }, { status: 400 });
  }
  try {
    // Remove both the normalized and raw forms to be safe.
    const phone = normalizePhone(rawPhone);
    const data = await fetchFromHasura(DELETE_OPTOUT, { pid: partnerId, phone });
    return NextResponse.json({
      removed: data?.delete_whatsapp_broadcast_optouts?.affected_rows || 0,
    });
  } catch (e: any) {
    console.error("Remove optout failed:", e);
    return NextResponse.json({ error: e?.message || "Failed to unblock" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

const MARK_READ = `
  mutation MarkConversationRead($partner_id: uuid!, $contact_phone: String!) {
    update_whatsapp_messages(
      where: {
        partner_id: { _eq: $partner_id }
        contact_phone: { _eq: $contact_phone }
        direction: { _eq: "in" }
        is_read: { _eq: false }
      }
      _set: { is_read: true }
    ) {
      affected_rows
    }
  }
`;

// POST /api/whatsapp/inbox/read
// Body: { partnerId, contactPhone }
// Marks every unread inbound message in the conversation as read. Outbound
// rows are always read by definition (the partner sent them).
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { partnerId, contactPhone } = body || {};
  if (!partnerId || !contactPhone) {
    return NextResponse.json(
      { error: "Missing partnerId or contactPhone" },
      { status: 400 },
    );
  }
  try {
    const data = await fetchFromHasura(MARK_READ, {
      partner_id: partnerId,
      contact_phone: contactPhone,
    });
    return NextResponse.json({
      affected_rows: data?.update_whatsapp_messages?.affected_rows || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

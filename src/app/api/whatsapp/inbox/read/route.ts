import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// When phoneNumberId is given, only mark messages that arrived on THAT number as
// read (multi-number: the same customer can have separate unread threads across
// the partner's numbers). Omitted → the whole contact, every number (unified view).
const MARK_READ = `
  mutation MarkConversationRead($partner_id: uuid!, $contact_phone: String!, $phone_number_id: String) {
    update_whatsapp_messages(
      where: {
        partner_id: { _eq: $partner_id }
        contact_phone: { _eq: $contact_phone }
        direction: { _eq: "in" }
        is_read: { _eq: false }
        phone_number_id: { _eq: $phone_number_id }
      }
      _set: { is_read: true }
    ) {
      affected_rows
    }
  }
`;

const MARK_READ_ALL = `
  mutation MarkConversationReadAll($partner_id: uuid!, $contact_phone: String!) {
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
// Body: { partnerId, contactPhone, phoneNumberId? }
// Marks unread inbound messages in the conversation as read. When phoneNumberId
// is present only that number's messages are marked (so viewing one account
// doesn't clear another account's unread badge for the same customer).
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { partnerId, contactPhone, phoneNumberId } = body || {};
  if (!partnerId || !contactPhone) {
    return NextResponse.json(
      { error: "Missing partnerId or contactPhone" },
      { status: 400 },
    );
  }
  try {
    const data = phoneNumberId
      ? await fetchFromHasura(MARK_READ, {
          partner_id: partnerId,
          contact_phone: contactPhone,
          phone_number_id: phoneNumberId,
        })
      : await fetchFromHasura(MARK_READ_ALL, {
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

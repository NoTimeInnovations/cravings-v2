import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

const DELETE_CHAT = `
  mutation DeleteChat($partner_id: uuid!, $contact_phone: String!) {
    delete_whatsapp_messages(
      where: {
        partner_id: { _eq: $partner_id }
        contact_phone: { _eq: $contact_phone }
      }
    ) {
      affected_rows
    }
  }
`;

function normalizePhone(phone: string): string {
  return String(phone || "").replace(/[^0-9]/g, "");
}

// Deletes the entire local message history for one contact under one partner.
// Does NOT touch Meta — the messages remain on WhatsApp servers and in the
// recipient's chat history. This is an admin-side cleanup only.
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
  const normalized = normalizePhone(contactPhone);
  if (normalized.length < 8) {
    return NextResponse.json({ error: "Invalid contact phone" }, { status: 400 });
  }

  try {
    const res = await fetchFromHasura(DELETE_CHAT, {
      partner_id: partnerId,
      contact_phone: normalized,
    });
    const affected = res?.delete_whatsapp_messages?.affected_rows ?? 0;
    return NextResponse.json({ deleted: affected });
  } catch (e: any) {
    console.error("Delete chat failed:", e);
    return NextResponse.json(
      { error: e?.message || "Delete failed" },
      { status: 500 },
    );
  }
}

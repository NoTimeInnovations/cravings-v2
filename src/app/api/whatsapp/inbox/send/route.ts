import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerWabaIntegration } from "@/lib/whatsapp-meta";

const INSERT_OUTBOX = `
  mutation InsertOutboxMessage($obj: whatsapp_messages_insert_input!) {
    insert_whatsapp_messages_one(object: $obj) {
      id
      partner_id
      direction
      contact_phone
      body
      status
      error_reason
      created_at
    }
  }
`;

const UPDATE_OUTBOX_STATUS = `
  mutation UpdateOutboxStatus($id: uuid!, $status: String!, $error: String, $wa_id: String) {
    update_whatsapp_messages_by_pk(
      pk_columns: { id: $id }
      _set: { status: $status, error_reason: $error, wa_message_id: $wa_id }
    ) {
      id
      status
      error_reason
      wa_message_id
    }
  }
`;

// Strip everything that's not a digit. Meta accepts E.164 without leading +.
function normalizePhone(phone: string): string {
  return String(phone || "").replace(/[^0-9]/g, "");
}

// POST /api/whatsapp/inbox/send
// Body: { partnerId, to, text }
// Sends a free-form text via the partner's connected WABA and persists
// the outbound row. The 24h session window is enforced by Meta, not us;
// if it's expired we get an error code that we surface via error_reason.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { partnerId, to, text } = body || {};
  if (!partnerId || !to || !text) {
    return NextResponse.json(
      { error: "Missing partnerId, to, or text" },
      { status: 400 },
    );
  }
  const normalizedTo = normalizePhone(to);
  if (normalizedTo.length < 8) {
    return NextResponse.json({ error: "Invalid recipient phone" }, { status: 400 });
  }

  const integration = await getPartnerWabaIntegration(partnerId);
  if (!integration?.phone_number_id || !integration.access_token) {
    return NextResponse.json(
      { error: "Connect your WhatsApp Business Account before sending." },
      { status: 412 },
    );
  }

  // Insert as queued so the UI gets an immediate optimistic row.
  let rowId: string;
  let row: any;
  try {
    const inserted = await fetchFromHasura(INSERT_OUTBOX, {
      obj: {
        partner_id: partnerId,
        direction: "out",
        contact_phone: normalizedTo,
        type: "text",
        body: text,
        status: "queued",
      },
    });
    row = inserted?.insert_whatsapp_messages_one;
    rowId = row?.id;
    if (!rowId) throw new Error("Insert returned no id");
  } catch (e: any) {
    console.error("Inbox insert failed:", e);
    return NextResponse.json({ error: "Failed to queue message" }, { status: 500 });
  }

  // Hit Meta. sendWhatsAppCloudMessage swallows errors and returns boolean;
  // we want the failure reason, so we call Graph directly here for the
  // first-class flow and keep the helper for fire-and-forget paths.
  const graphUrl = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v21.0"}/${integration.phone_number_id}/messages`;
  try {
    const res = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "text",
        text: { body: text },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const reason =
        data?.error?.error_user_msg ||
        data?.error?.message ||
        `Meta returned ${res.status}`;
      const updated = await fetchFromHasura(UPDATE_OUTBOX_STATUS, {
        id: rowId,
        status: "failed",
        error: reason,
        wa_id: null,
      });
      return NextResponse.json(
        { message: updated?.update_whatsapp_messages_by_pk, error: reason },
        { status: 400 },
      );
    }
    const waId = data?.messages?.[0]?.id || null;
    const updated = await fetchFromHasura(UPDATE_OUTBOX_STATUS, {
      id: rowId,
      status: "sent",
      error: null,
      wa_id: waId,
    });
    return NextResponse.json({ message: updated?.update_whatsapp_messages_by_pk });
  } catch (e: any) {
    await fetchFromHasura(UPDATE_OUTBOX_STATUS, {
      id: rowId,
      status: "failed",
      error: e?.message || "Network error",
      wa_id: null,
    }).catch(() => {});
    return NextResponse.json(
      { error: e?.message || "Network error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Turn automated WhatsApp flows ON/OFF for a SPECIFIC connected number. When
// off, inbound messages to that number are still recorded to the inbox but no
// flow/auto-reply runs. Scoped to the partner's own number.
export async function POST(req: NextRequest) {
  try {
    const { partnerId, phoneNumberId, enabled } = await req.json();
    if (!partnerId || !phoneNumberId || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Missing partnerId, phoneNumberId, or enabled" },
        { status: 400 },
      );
    }

    const mutation = `
      mutation SetFlowEnabled($partner_id: uuid!, $phone_number_id: String!, $enabled: Boolean!) {
        update_whatsapp_business_integrations(
          where: {partner_id: {_eq: $partner_id}, phone_number_id: {_eq: $phone_number_id}}
          _set: {flow_enabled: $enabled}
        ) {
          affected_rows
        }
      }
    `;
    const res = await fetchFromHasura(mutation, {
      partner_id: partnerId,
      phone_number_id: phoneNumberId,
      enabled,
    });

    if (!res?.update_whatsapp_business_integrations?.affected_rows) {
      return NextResponse.json(
        { error: "That number isn't connected to this partner." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp set-flow error:", error);
    return NextResponse.json(
      { error: "Failed to update flow setting" },
      { status: 500 },
    );
  }
}

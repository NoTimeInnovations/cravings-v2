import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

export async function POST(req: NextRequest) {
  try {
    const { partnerId } = await req.json();

    if (!partnerId) {
      return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
    }

    const mutation = `
      mutation DeleteWhatsAppIntegration($partner_id: uuid!) {
        delete_whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
          affected_rows
        }
      }
    `;

    await fetchFromHasura(mutation, { partner_id: partnerId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp disconnect error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");

  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }

  try {
    const query = `
      query GetWhatsAppStatus($partner_id: uuid!) {
        whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
          id
          waba_id
          phone_number_id
          display_phone
          updated_at
        }
      }
    `;

    const data = await fetchFromHasura(query, { partner_id: partnerId });
    const integration = data?.whatsapp_business_integrations?.[0];

    if (integration) {
      return NextResponse.json({
        connected: true,
        waba_id: integration.waba_id,
        phone_number_id: integration.phone_number_id,
        display_phone: integration.display_phone,
      });
    }

    return NextResponse.json({ connected: false });
  } catch (error) {
    console.error("WhatsApp status check error:", error);
    return NextResponse.json({ connected: false });
  }
}

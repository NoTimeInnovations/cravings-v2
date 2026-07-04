import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");

  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }

  try {
    // A partner can connect MULTIPLE numbers. Return every connected number,
    // primary first. Keep the legacy top-level fields (set to the primary
    // number) so older callers that read one number keep working.
    const query = `
      query GetWhatsAppStatus($partner_id: uuid!) {
        whatsapp_business_integrations(
          where: {partner_id: {_eq: $partner_id}}
          order_by: {is_primary: desc, updated_at: asc}
        ) {
          id
          waba_id
          phone_number_id
          display_phone
          is_primary
          flow_enabled
          updated_at
        }
      }
    `;

    const data = await fetchFromHasura(query, { partner_id: partnerId });
    const integrations = (data?.whatsapp_business_integrations || []) as Array<{
      id: string;
      waba_id: string;
      phone_number_id: string;
      display_phone: string | null;
      is_primary: boolean;
      flow_enabled: boolean;
      updated_at: string;
    }>;

    if (integrations.length > 0) {
      const primary =
        integrations.find((i) => i.is_primary) || integrations[0];
      return NextResponse.json({
        connected: true,
        integrations,
        // Legacy single-number fields = the primary number.
        waba_id: primary.waba_id,
        phone_number_id: primary.phone_number_id,
        display_phone: primary.display_phone,
      });
    }

    return NextResponse.json({ connected: false, integrations: [] });
  } catch (error) {
    console.error("WhatsApp status check error:", error);
    return NextResponse.json({ connected: false, integrations: [] });
  }
}

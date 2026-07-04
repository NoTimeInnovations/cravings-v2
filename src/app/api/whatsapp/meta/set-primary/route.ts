import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Choose which connected number is the partner's PRIMARY (default sender for
// system-initiated messages: order/loyalty notifications, OTP, the storefront
// "message us" link, and the broadcast default). Sets the chosen number's
// is_primary=true and every other number of that partner to false, so exactly
// one primary always exists.
export async function POST(req: NextRequest) {
  try {
    const { partnerId, phoneNumberId } = await req.json();
    if (!partnerId || !phoneNumberId) {
      return NextResponse.json(
        { error: "Missing partnerId or phoneNumberId" },
        { status: 400 },
      );
    }

    const mutation = `
      mutation SetPrimaryWhatsApp($partner_id: uuid!, $phone_number_id: String!) {
        clearOthers: update_whatsapp_business_integrations(
          where: {partner_id: {_eq: $partner_id}, phone_number_id: {_neq: $phone_number_id}}
          _set: {is_primary: false}
        ) { affected_rows }
        setPrimary: update_whatsapp_business_integrations(
          where: {partner_id: {_eq: $partner_id}, phone_number_id: {_eq: $phone_number_id}}
          _set: {is_primary: true}
        ) { affected_rows }
      }
    `;
    const res = await fetchFromHasura(mutation, {
      partner_id: partnerId,
      phone_number_id: phoneNumberId,
    });

    if (!res?.setPrimary?.affected_rows) {
      return NextResponse.json(
        { error: "That number isn't connected to this partner." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp set-primary error:", error);
    return NextResponse.json(
      { error: "Failed to set primary number" },
      { status: 500 },
    );
  }
}

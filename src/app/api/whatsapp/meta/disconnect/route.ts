import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Disconnect a WhatsApp number.
//   { partnerId, phoneNumberId } → remove just that one number.
//   { partnerId }                → remove ALL of the partner's numbers (legacy).
// When the removed number was the primary (default sender) and other numbers
// remain, the oldest surviving number is promoted to primary so the partner
// always has a working default sender.
export async function POST(req: NextRequest) {
  try {
    const { partnerId, phoneNumberId } = await req.json();

    if (!partnerId) {
      return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
    }

    // ── Remove ALL numbers (legacy behaviour) ──
    if (!phoneNumberId) {
      const mutation = `
        mutation DeleteAllWhatsAppIntegrations($partner_id: uuid!) {
          delete_whatsapp_business_integrations(where: {partner_id: {_eq: $partner_id}}) {
            affected_rows
          }
        }
      `;
      await fetchFromHasura(mutation, { partner_id: partnerId });
      return NextResponse.json({ success: true });
    }

    // ── Remove a single number ──
    const delMutation = `
      mutation DeleteOneWhatsAppIntegration($partner_id: uuid!, $phone_number_id: String!) {
        delete_whatsapp_business_integrations(
          where: {partner_id: {_eq: $partner_id}, phone_number_id: {_eq: $phone_number_id}}
        ) {
          affected_rows
          returning { is_primary }
        }
      }
    `;
    const delRes = await fetchFromHasura(delMutation, {
      partner_id: partnerId,
      phone_number_id: phoneNumberId,
    });
    const removed = delRes?.delete_whatsapp_business_integrations?.returning?.[0];

    // If we removed the primary, promote the oldest remaining number so the
    // partner keeps a default sender.
    if (removed?.is_primary) {
      const remainingRes = await fetchFromHasura(
        `query RemainingIntegrations($partner_id: uuid!) {
          whatsapp_business_integrations(
            where: {partner_id: {_eq: $partner_id}}
            order_by: {updated_at: asc}
            limit: 1
          ) { id }
        }`,
        { partner_id: partnerId },
      );
      const next = remainingRes?.whatsapp_business_integrations?.[0];
      if (next?.id) {
        await fetchFromHasura(
          `mutation PromotePrimary($id: uuid!) {
            update_whatsapp_business_integrations_by_pk(pk_columns: {id: $id}, _set: {is_primary: true}) { id }
          }`,
          { id: next.id },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp disconnect error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}

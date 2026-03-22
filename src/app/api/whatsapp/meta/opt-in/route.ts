import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

// Check if a user has opted in for a specific order
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  const orderId = req.nextUrl.searchParams.get("order_id");

  if (!phone || !orderId) {
    return NextResponse.json({ opted_in: false });
  }

  try {
    const query = `
      query CheckWhatsAppOptIn($phone: String!, $order_id: uuid!) {
        whatsapp_opt_ins(
          where: {
            phone: { _eq: $phone },
            order_id: { _eq: $order_id },
            opted_in_at: { _gte: "${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}" }
          },
          limit: 1
        ) {
          id
        }
      }
    `;

    const data = await fetchFromHasura(query, { phone, order_id: orderId });
    const hasOptIn = (data?.whatsapp_opt_ins?.length || 0) > 0;

    return NextResponse.json({ opted_in: hasOptIn });
  } catch {
    // Table may not exist yet
    return NextResponse.json({ opted_in: false });
  }
}

// Save opt-in when user clicks "Track Order Status" button
export async function POST(req: NextRequest) {
  try {
    const { phone, order_id } = await req.json();

    if (!phone || !order_id) {
      return NextResponse.json({ error: "Missing phone or order_id" }, { status: 400 });
    }

    const mutation = `
      mutation UpsertWhatsAppOptIn($phone: String!, $order_id: uuid!, $opted_in_at: timestamptz!) {
        insert_whatsapp_opt_ins_one(
          object: { phone: $phone, order_id: $order_id, opted_in_at: $opted_in_at },
          on_conflict: {
            constraint: whatsapp_opt_ins_phone_key,
            update_columns: [opted_in_at, order_id]
          }
        ) {
          id
        }
      }
    `;

    await fetchFromHasura(mutation, {
      phone,
      order_id,
      opted_in_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WhatsApp opt-in save error:", error);
    return NextResponse.json({ error: "Failed to save opt-in" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

// ─── Webhook Verification (Meta sends GET to verify) ─────────────
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// ─── Receive Incoming Messages & Status Updates ──────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        const messages = value.messages || [];

        for (const msg of messages) {
          console.log(
            `[WhatsApp Webhook] From: ${msg.from} | Type: ${msg.type}`
          );

          // Handle "Track Order Status" quick reply button click
          if (msg.type === "button" && msg.button?.text === "Track Order Status") {
            await handleTrackOrderStatus(msg.from, phoneNumberId);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ status: "ok" });
  }
}

// ─── Handle "Track Order Status" button click ────────────────────
async function handleTrackOrderStatus(userPhone: string, phoneNumberId: string) {
  try {
    // 1. Find the most recent order first, then save opt-in scoped to it

    // 2. Find the most recent order for this phone
    const phone10 = userPhone.startsWith("91") ? userPhone.slice(2) : userPhone;

    const query = `
      query GetLatestOrder($phone: String!, $phone_with_code: String!, $phone_with_plus: String!) {
        orders(
          where: {
            _or: [
              { phone: { _eq: $phone } },
              { phone: { _eq: $phone_with_code } },
              { phone: { _eq: $phone_with_plus } }
            ]
          },
          order_by: { created_at: desc },
          limit: 1
        ) {
          id
          display_id
          status
          totalPrice
          items
          partner {
            store_name
            currency
          }
        }
      }
    `;

    const data = await fetchFromHasura(query, {
      phone: phone10,
      phone_with_code: `91${phone10}`,
      phone_with_plus: `+91${phone10}`,
    });

    const order = data?.orders?.[0];

    if (!order) {
      await sendTextReply(
        phoneNumberId,
        userPhone,
        "😕 Sorry, we couldn't find a recent order for your number.\n\nPlease make sure you're using the same number you placed the order with."
      );
      return;
    }

    const store = order.partner?.store_name || "your store";
    const orderId = order.display_id || order.id.slice(0, 8);
    const status = (order.status as string).charAt(0).toUpperCase() + (order.status as string).slice(1);
    const currency = order.partner?.currency || "₹";
    const items = order.items
      .map((item: any) => `• ${item.name} × ${item.quantity}`)
      .join("\n");

    const statusEmojis: Record<string, string> = {
      confirmed: "✅",
      preparing: "👨‍🍳",
      ready: "🔔",
      picked: "🚗",
      delivered: "📦",
      cancelled: "❌",
      placed: "📝",
    };
    const emoji = statusEmojis[(order.status as string).toLowerCase()] || "📋";

    // 3. Save opt-in scoped to this order
    await saveOptIn(userPhone, order.id);

    // 4. Send confirmation + current status
    const text = `🔔 *Order Tracking Activated!*\n\n` +
      `You'll receive live updates for your order right here on WhatsApp.\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `${emoji} *Current Status: ${status}*\n\n` +
      `🏪 *${store}*\n` +
      `🆔 Order *#${orderId}*\n\n` +
      `🛒 *Items:*\n${items}\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `We'll notify you when your order status changes! 🙏`;

    await sendTextReply(phoneNumberId, userPhone, text);
  } catch (error) {
    console.error("Track order status error:", error);
  }
}

// ─── Save opt-in scoped to a specific order ─────────────────────
async function saveOptIn(phone: string, orderId: string) {
  try {
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
      order_id: orderId,
      opted_in_at: new Date().toISOString(),
    });
  } catch {
    // Table may not exist yet — non-critical
  }
}

// ─── Send a free-form text reply (within 24hr window) ────────────
async function sendTextReply(phoneNumberId: string, to: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Text reply failed:", err);
  }
}

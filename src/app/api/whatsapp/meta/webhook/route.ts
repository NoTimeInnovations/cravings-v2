import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerByPhoneNumberId } from "@/lib/whatsapp-meta";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

// Insert an inbound row into the inbox so partners can see every message
// their WABA receives. Fire-and-forget — never blocks the webhook ACK.
const INSERT_INBOX = `
  mutation InsertInboxMessage($obj: whatsapp_messages_insert_input!) {
    insert_whatsapp_messages_one(object: $obj) {
      id
    }
  }
`;

function extractIncomingBody(msg: any): { type: string; body: string | null; mediaUrl: string | null } {
  const t = msg.type as string;
  switch (t) {
    case "text":
      return { type: "text", body: msg.text?.body ?? null, mediaUrl: null };
    case "button":
      return { type: "button", body: msg.button?.text ?? null, mediaUrl: null };
    case "interactive":
      return {
        type: "interactive",
        body:
          msg.interactive?.button_reply?.title ||
          msg.interactive?.list_reply?.title ||
          null,
        mediaUrl: null,
      };
    case "image":
    case "video":
    case "audio":
    case "document":
    case "sticker":
      return {
        type: t,
        body: msg[t]?.caption ?? null,
        mediaUrl: msg[t]?.id ?? null,
      };
    case "location":
      return {
        type: "location",
        body: msg.location
          ? `${msg.location.latitude},${msg.location.longitude}`
          : null,
        mediaUrl: null,
      };
    default:
      return { type: "unknown", body: null, mediaUrl: null };
  }
}

async function persistIncoming(
  partnerId: string,
  msg: any,
  contactName: string | null,
): Promise<void> {
  const { type, body, mediaUrl } = extractIncomingBody(msg);
  try {
    await fetchFromHasura(INSERT_INBOX, {
      obj: {
        partner_id: partnerId,
        direction: "in",
        contact_phone: msg.from,
        contact_name: contactName,
        type,
        body,
        media_url: mediaUrl,
        wa_message_id: msg.id,
        status: "received",
      },
    });
  } catch (e) {
    console.error("Failed to persist incoming message:", e);
  }
}

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
        const contactName = value.contacts?.[0]?.profile?.name || null;

        // Resolve the partner once for this batch. The Menuthere shared
        // WABA won't be in whatsapp_business_integrations, so absence is
        // normal — those messages just don't go to a partner inbox.
        const partner = phoneNumberId
          ? await getPartnerByPhoneNumberId(phoneNumberId)
          : null;

        for (const msg of messages) {
          console.log(
            `[WhatsApp Webhook] From: ${msg.from} | Type: ${msg.type} | partner=${partner?.partner_id || "shared"}`
          );

          if (partner?.partner_id) {
            await persistIncoming(partner.partner_id, msg, contactName);
          }

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

// ─── Handle "Track Order Status" quick reply click ───────────────
async function handleTrackOrderStatus(userPhone: string, phoneNumberId: string) {
  try {
    const phone10 = userPhone.startsWith("91") ? userPhone.slice(2) : userPhone;

    const query = `
      query GetLatestOrder($phone: String!, $phone_with_code: String!, $phone_with_plus: String!) {
        orders(
          where: {
            _or: [
              { phone: { _eq: $phone } },
              { phone: { _eq: $phone_with_code } },
              { phone: { _eq: $phone_with_plus } },
              { user: { phone: { _eq: $phone } } },
              { user: { phone: { _eq: $phone_with_code } } },
              { user: { phone: { _eq: $phone_with_plus } } }
            ]
          },
          order_by: { created_at: desc },
          limit: 1
        ) {
          id
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

    const orderUrl = `https://menuthere.com/order/${order.id}`;
    await sendInteractiveReply(
      phoneNumberId,
      userPhone,
      "Click the button below to see realtime order updates 👇",
      orderUrl
    );
  } catch (error) {
    console.error("Track order status error:", error);
  }
}

// ─── Send a free-form text reply ─────────────────────────────────
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

// ─── Send interactive message with CTA URL button ────────────────
async function sendInteractiveReply(phoneNumberId: string, to: string, bodyText: string, url: string) {
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
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: { text: bodyText },
          action: {
            name: "cta_url",
            parameters: {
              display_text: "Track Your Order",
              url,
            },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Interactive reply failed:", err);
    await sendTextReply(phoneNumberId, to, `Click the link below to see realtime order updates:\n\n${url}`);
  }
}


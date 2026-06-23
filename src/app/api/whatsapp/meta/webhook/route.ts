import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerByPhoneNumberId } from "@/lib/whatsapp-meta";
import { runFlowForInbound, type FlowInput } from "@/lib/whatsappFlow/engine";
import { normalizePhone } from "@/lib/whatsapp-broadcast";

// Marketing opt-out: a customer who replies STOP (or taps a stop button) is added
// to the partner's suppression list and excluded from future broadcasts.
const INSERT_OPTOUT = `
  mutation OptOut($obj: whatsapp_broadcast_optouts_insert_input!) {
    insert_whatsapp_broadcast_optouts_one(object: $obj) { id }
  }
`;

function isStopMessage(msg: any): boolean {
  const norm = (s?: string) => String(s || "").trim().toLowerCase();
  if (msg?.type === "text") {
    return ["stop", "unsubscribe", "stop promotions", "cancel"].includes(
      norm(msg.text?.body),
    );
  }
  if (msg?.type === "button") return norm(msg.button?.text).includes("stop");
  if (msg?.type === "interactive") {
    return norm(
      msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title,
    ).includes("stop");
  }
  return false;
}

async function recordOptOut(partnerId: string, phone: string) {
  try {
    await fetchFromHasura(INSERT_OPTOUT, {
      obj: { partner_id: partnerId, phone: normalizePhone(phone), reason: "STOP" },
    });
  } catch (e: any) {
    // Unique violation = already opted out (fine); log anything else.
    if (!String(e?.message || e).toLowerCase().includes("unique")) {
      console.error("Opt-out insert failed:", e);
    }
  }
}

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

// Flow execution can emit several Graph sends per inbound message; give the
// handler headroom so it doesn't get cut off mid-turn.
export const maxDuration = 30;

// Constant-time string compare (length guard first — timingSafeEqual throws on
// unequal-length buffers).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Verify Meta's X-Hub-Signature-256 over the RAW request body using our app
// secret. Without this, anyone who learns the webhook URL could forge inbound
// events and drive flows / trigger sends from partner numbers.
function verifyMetaSignature(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signature || !signature.startsWith("sha256=")) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return safeEqual(expected, signature);
}

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

// Normalize an inbound message into the flow engine's input shape. Only
// text / interactive-reply / button messages drive flows; everything else
// returns null (ignored by the engine).
function normalizeFlowInput(msg: any): FlowInput | null {
  let text: string | null = null;
  let replyId: string | null = null;
  if (msg.type === "text") {
    text = msg.text?.body ?? null;
  } else if (msg.type === "interactive") {
    const ir = msg.interactive?.button_reply || msg.interactive?.list_reply;
    if (ir) {
      text = ir.title ?? null;
      replyId = ir.id ?? null;
    }
  } else if (msg.type === "button") {
    text = msg.button?.text ?? null;
    replyId = msg.button?.payload ?? null;
  }
  if (text == null) return null;
  return { text, normalized: String(text).trim().toLowerCase(), replyId };
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

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "";
  if (mode === "subscribe" && token && verifyToken && safeEqual(token, verifyToken)) {
    console.log("WhatsApp webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// ─── Receive Incoming Messages & Status Updates ──────────────────
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();

    // Authenticate the payload as genuinely from Meta. Reject forged requests.
    // A missing app secret is a deploy error we log loudly rather than fail
    // closed on, so a misconfig can't silently drop every real event.
    if (process.env.META_APP_SECRET) {
      if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
        console.warn(
          "WhatsApp webhook: invalid X-Hub-Signature-256 — ignoring payload",
        );
        return NextResponse.json({ status: "ok" });
      }
    } else {
      console.error(
        "META_APP_SECRET not set — webhook signature NOT verified",
      );
    }

    const body = JSON.parse(raw);
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
            // Log the inbound to the inbox, but DON'T block the flow reply on it —
            // overlap it with the flow run. Still awaited before we return so a
            // serverless freeze can't drop the write.
            const persistP = persistIncoming(partner.partner_id, msg, contactName);

            // Marketing STOP/unsubscribe → suppress from this partner's broadcasts.
            if (isStopMessage(msg)) {
              await recordOptOut(partner.partner_id, msg.from);
            }

            // Run the partner's WhatsApp flows for this inbound. Idempotent and
            // self-contained; never let it throw out of the webhook loop.
            const flowInput = normalizeFlowInput(msg);
            if (flowInput && msg.id && phoneNumberId) {
              try {
                await runFlowForInbound({
                  partnerId: partner.partner_id,
                  phoneNumberId,
                  contactPhone: msg.from,
                  waMessageId: msg.id,
                  input: flowInput,
                  contactName,
                });
              } catch (e) {
                console.error("Flow engine error:", e);
              }
            }

            await persistP.catch(() => {});
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


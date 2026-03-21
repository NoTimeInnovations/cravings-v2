import { NextRequest, NextResponse } from "next/server";
import { getPartnerByPhoneNumberId } from "@/lib/whatsapp-meta";

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

    // Meta sends an array of entries
    const entries = body.entry || [];

    for (const entry of entries) {
      const wabaId = entry.id;
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        const displayPhone = value.metadata?.display_phone_number;

        // Look up which partner this phone number belongs to
        const integration = await getPartnerByPhoneNumberId(phoneNumberId);

        if (!integration) {
          console.warn(
            `No integration found for phone_number_id: ${phoneNumberId}`,
          );
          continue;
        }

        const partnerId = integration.partner_id;

        // ── Handle incoming messages ──
        const messages = value.messages || [];
        for (const msg of messages) {
          console.log(
            `[WhatsApp] Partner ${partnerId} | From: ${msg.from} | Type: ${msg.type}`,
          );

          // TODO: Route to your message handler
          // await handleIncomingMessage(partnerId, phoneNumberId, msg);
        }

        // ── Handle status updates (sent, delivered, read, failed) ──
        const statuses = value.statuses || [];
        for (const status of statuses) {
          console.log(
            `[WhatsApp] Partner ${partnerId} | Status: ${status.status} | MsgID: ${status.id}`,
          );

          // TODO: Update message delivery status in your DB
          // await updateMessageStatus(partnerId, status);
        }
      }
    }

    // Always return 200 quickly — Meta retries on non-200
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ status: "ok" });
  }
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerByPhoneNumberIdCached } from "@/lib/whatsapp-meta";
import { runFlowForInbound, type FlowInput } from "@/lib/whatsappFlow/engine";
import { normalizePhone } from "@/lib/whatsapp-broadcast";
import { computeMessageCost, getBusinessCurrency } from "@/lib/whatsapp-cost";
import { whatsappEnabledFromFlags } from "@/lib/whatsapp-features";

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

// ════════════════════════════════════════════════════════════════
//  DELIVERY STATUS CAPTURE (Meta `value.statuses[]`)
//  Records sent → delivered → read → failed + per-message pricing/cost
//  onto broadcast recipients, the global message-log ledger, and the inbox.
//  Pure capture — never sends anything back to Meta. Forward-only so a late
//  `delivered` callback can never downgrade a row already marked `read`.
// ════════════════════════════════════════════════════════════════

const FIND_RECIPIENT = `
  query FindRecipient($mid: String!) {
    whatsapp_broadcast_recipients(where: { meta_message_id: { _eq: $mid } }, limit: 1) {
      id
      broadcast_id
      phone
      status
      cost_amount
      broadcast { partner_id category }
    }
  }
`;

const UPDATE_RECIPIENTS = `
  mutation UpdRecipients(
    $where: whatsapp_broadcast_recipients_bool_exp!
    $set: whatsapp_broadcast_recipients_set_input!
  ) {
    update_whatsapp_broadcast_recipients(where: $where, _set: $set) { affected_rows }
  }
`;

const RECOUNT_BROADCAST = `
  query RecountBroadcast($bid: uuid!) {
    delivered: whatsapp_broadcast_recipients_aggregate(
      where: { broadcast_id: { _eq: $bid }, status: { _in: ["delivered", "read"] } }
    ) { aggregate { count } }
    read: whatsapp_broadcast_recipients_aggregate(
      where: { broadcast_id: { _eq: $bid }, status: { _eq: "read" } }
    ) { aggregate { count } }
    failed: whatsapp_broadcast_recipients_aggregate(
      where: { broadcast_id: { _eq: $bid }, status: { _eq: "failed" } }
    ) { aggregate { count } }
    cost: whatsapp_broadcast_recipients_aggregate(
      where: { broadcast_id: { _eq: $bid } }
    ) { aggregate { sum { cost_amount } } }
  }
`;

const UPDATE_BROADCAST_COUNTS = `
  mutation UpdBroadcastCounts($id: uuid!, $set: whatsapp_broadcasts_set_input!) {
    update_whatsapp_broadcasts_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const FIND_LOG = `
  query FindLog($mid: String!) {
    whatsapp_message_logs(where: { meta_message_id: { _eq: $mid } }, limit: 1) {
      id
      partner_id
      phone
      status
      cost_amount
    }
  }
`;

const UPDATE_LOGS = `
  mutation UpdLogs(
    $where: whatsapp_message_logs_bool_exp!
    $set: whatsapp_message_logs_set_input!
  ) {
    update_whatsapp_message_logs(where: $where, _set: $set) { affected_rows }
  }
`;

const UPDATE_INBOX_STATUS = `
  mutation UpdInboxStatus(
    $where: whatsapp_messages_bool_exp!
    $set: whatsapp_messages_set_input!
  ) {
    update_whatsapp_messages(where: $where, _set: $set) { affected_rows }
  }
`;

// Statuses that a given delivery state is allowed to advance FROM (forward-only).
const ADVANCE_FROM: Record<string, string[]> = {
  delivered: ["pending", "queued", "sent"],
  read: ["pending", "queued", "sent", "delivered"],
  failed: ["pending", "queued", "sent"],
};

function metaTsToIso(ts: any): string {
  const n = Number(ts);
  if (!ts || Number.isNaN(n)) return new Date().toISOString();
  return new Date(n * 1000).toISOString();
}

// One broadcast recipient: advance status, capture failure detail + pricing/cost,
// then recompute the parent broadcast's delivered/read/failed counters + total cost.
async function applyBroadcastStatus(st: any): Promise<void> {
  const mid = st.id;
  if (!mid) return;
  let rcpt: any;
  try {
    const d = await fetchFromHasura(FIND_RECIPIENT, { mid });
    rcpt = d?.whatsapp_broadcast_recipients?.[0];
  } catch (e) {
    console.error("status: find recipient failed", e);
    return;
  }
  if (!rcpt) return; // not a broadcast message

  const partnerId = rcpt.broadcast?.partner_id as string | undefined;
  const tsIso = metaTsToIso(st.timestamp);
  const status = String(st.status || "").toLowerCase();
  const err = Array.isArray(st.errors) ? st.errors[0] : null;
  const pricing = st.pricing || null;

  // 1) Forward-only status advance.
  try {
    if (status === "delivered") {
      await fetchFromHasura(UPDATE_RECIPIENTS, {
        where: { meta_message_id: { _eq: mid }, status: { _in: ADVANCE_FROM.delivered } },
        set: { status: "delivered", delivered_at: tsIso },
      });
    } else if (status === "read") {
      await fetchFromHasura(UPDATE_RECIPIENTS, {
        where: { meta_message_id: { _eq: mid }, status: { _in: ADVANCE_FROM.read } },
        set: { status: "read", read_at: tsIso },
      });
      // Backfill delivered_at if the `delivered` callback was never seen.
      await fetchFromHasura(UPDATE_RECIPIENTS, {
        where: { meta_message_id: { _eq: mid }, delivered_at: { _is_null: true } },
        set: { delivered_at: tsIso },
      });
    } else if (status === "failed") {
      await fetchFromHasura(UPDATE_RECIPIENTS, {
        where: { meta_message_id: { _eq: mid }, status: { _in: ADVANCE_FROM.failed } },
        set: {
          status: "failed",
          failed_at: tsIso,
          error_code: err?.code != null ? String(err.code) : null,
          error_title: err?.title || null,
          error: err?.error_data?.details || err?.message || "delivery failed",
        },
      });
    }
  } catch (e) {
    console.error("status: recipient advance failed", e);
  }

  // 2) Pricing/cost — set ONCE. Meta charges per DELIVERED template message, so
  //    we cost it the moment it's delivered/read. Prefer Meta's own pricing
  //    object (authoritative category/billable) when present; otherwise fall back
  //    to the broadcast's category (broadcast templates are billable). Skipped
  //    for `failed` (undelivered → not charged).
  const isDeliveredish = status === "delivered" || status === "read";
  if (rcpt.cost_amount == null && partnerId && (pricing || isDeliveredish)) {
    try {
      const category = pricing?.category || rcpt.broadcast?.category || "marketing";
      const billable = pricing ? !!pricing.billable : true;
      const businessCurrency = await getBusinessCurrency(partnerId);
      const cost = await computeMessageCost({
        recipientPhone: rcpt.phone,
        category,
        billable,
        businessCurrency,
      });
      await fetchFromHasura(UPDATE_RECIPIENTS, {
        where: { meta_message_id: { _eq: mid }, cost_amount: { _is_null: true } },
        set: {
          billable,
          pricing_category: category.toLowerCase(),
          pricing_model: pricing?.pricing_model || null,
          cost_amount: cost.amount,
          cost_currency: cost.currency,
        },
      });
    } catch (e) {
      console.error("status: recipient cost failed", e);
    }
  }

  // 3) Recompute the broadcast's aggregate funnel + total cost.
  try {
    const bid = rcpt.broadcast_id;
    const agg = await fetchFromHasura(RECOUNT_BROADCAST, { bid });
    const delivered = agg?.delivered?.aggregate?.count || 0;
    const read = agg?.read?.aggregate?.count || 0;
    const failed = agg?.failed?.aggregate?.count || 0;
    const totalCost = Number(agg?.cost?.aggregate?.sum?.cost_amount || 0);
    const set: Record<string, unknown> = {
      delivered_count: delivered,
      read_count: read,
      failed_count: failed,
      total_cost: totalCost,
    };
    if (partnerId) set.cost_currency = await getBusinessCurrency(partnerId);
    await fetchFromHasura(UPDATE_BROADCAST_COUNTS, { id: bid, set });
  } catch (e) {
    console.error("status: broadcast recount failed", e);
  }
}

// The global ledger row (covers OTP / order / inbox / broadcast sends alike).
async function applyLedgerStatus(st: any): Promise<void> {
  const mid = st.id;
  if (!mid) return;
  const status = String(st.status || "").toLowerCase();
  const tsIso = metaTsToIso(st.timestamp);
  const pricing = st.pricing || null;

  let log: any;
  try {
    const d = await fetchFromHasura(FIND_LOG, { mid });
    log = d?.whatsapp_message_logs?.[0];
  } catch {
    return;
  }
  if (!log) return;

  try {
    if (status === "delivered") {
      await fetchFromHasura(UPDATE_LOGS, {
        where: { meta_message_id: { _eq: mid }, status: { _in: ["queued", "sent"] } },
        set: { status: "delivered", delivered_at: tsIso },
      });
    } else if (status === "read") {
      await fetchFromHasura(UPDATE_LOGS, {
        where: { meta_message_id: { _eq: mid }, status: { _in: ["queued", "sent", "delivered"] } },
        set: { status: "read", read_at: tsIso },
      });
    } else if (status === "failed") {
      await fetchFromHasura(UPDATE_LOGS, {
        where: { meta_message_id: { _eq: mid }, status: { _in: ["queued", "sent"] } },
        set: { status: "failed" },
      });
    }
  } catch (e) {
    console.error("status: ledger advance failed", e);
  }

  // Pricing/cost on the ledger so spend across ALL message types is trackable.
  if (pricing && log.cost_amount == null && log.partner_id) {
    try {
      const businessCurrency = await getBusinessCurrency(log.partner_id);
      const cost = await computeMessageCost({
        recipientPhone: log.phone,
        category: pricing.category,
        billable: pricing.billable,
        businessCurrency,
      });
      await fetchFromHasura(UPDATE_LOGS, {
        where: { meta_message_id: { _eq: mid }, cost_amount: { _is_null: true } },
        set: {
          billable: !!pricing.billable,
          pricing_category: pricing.category || null,
          cost_amount: cost.amount,
          cost_currency: cost.currency,
        },
      });
    } catch (e) {
      console.error("status: ledger cost failed", e);
    }
  }
}

// Inbox outbound messages — light up the owner's delivered/blue-tick ticks.
async function applyInboxStatus(st: any): Promise<void> {
  const mid = st.id;
  if (!mid) return;
  const status = String(st.status || "").toLowerCase();
  const err = Array.isArray(st.errors) ? st.errors[0] : null;
  try {
    if (status === "delivered") {
      await fetchFromHasura(UPDATE_INBOX_STATUS, {
        where: { wa_message_id: { _eq: mid }, direction: { _eq: "out" }, status: { _in: ["queued", "sent"] } },
        set: { status: "delivered" },
      });
    } else if (status === "read") {
      await fetchFromHasura(UPDATE_INBOX_STATUS, {
        where: { wa_message_id: { _eq: mid }, direction: { _eq: "out" }, status: { _in: ["queued", "sent", "delivered"] } },
        set: { status: "read" },
      });
    } else if (status === "failed") {
      await fetchFromHasura(UPDATE_INBOX_STATUS, {
        where: { wa_message_id: { _eq: mid }, direction: { _eq: "out" }, status: { _in: ["queued", "sent"] } },
        set: { status: "failed", error_reason: err?.error_data?.details || err?.message || "failed" },
      });
    }
  } catch (e) {
    console.error("status: inbox advance failed", e);
  }
}

async function processStatuses(value: any): Promise<void> {
  const statuses = value?.statuses || [];
  for (const st of statuses) {
    // Run the three targets sequentially; each updates only its matching rows.
    await applyBroadcastStatus(st);
    await applyLedgerStatus(st);
    await applyInboxStatus(st);
  }
}

// ─── Webhook Verification (Meta sends GET to verify) ─────────────
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Warm-ping: a Vercel cron hits this route (no Meta verify params) every minute
  // just to keep THIS function's instance hot, so a real inbound "hi" never pays
  // the serverless cold-start (1–2s). Returns instantly; touches nothing.
  if (!mode && !token && !challenge) {
    return NextResponse.json({ status: "warm" });
  }

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
          ? await getPartnerByPhoneNumberIdCached(phoneNumberId)
          : null;

        // Master gate: when the WhatsApp Ordering feature is OFF, no flows run and
        // no auto-replies are sent for this partner. Parsed from the feature_flags
        // already folded into the cached lookup — zero extra round-trips.
        const waEnabled =
          !!partner?.partner_id &&
          whatsappEnabledFromFlags(partner.feature_flags);

        for (const msg of messages) {
          console.log(
            `[WhatsApp Webhook] From: ${msg.from} | Type: ${msg.type} | partner=${partner?.partner_id || "shared"}`
          );

          if (partner?.partner_id) {
            // Log the inbound to the inbox, but DON'T block the flow reply on it —
            // overlap it with the flow run. Still awaited before we return so a
            // serverless freeze can't drop the write.
            const persistP = persistIncoming(partner.partner_id, msg, contactName);

            const flowInput = normalizeFlowInput(msg);

            // NO read receipt / blue tick on inbound session messages. WhatsApp's
            // typing indicator and the read receipt are the same API call, so we
            // deliberately send neither: every inbound stays UNREAD so the owner
            // (and other team members) can see and actually check what customers
            // sent. The flow's own reply is what the customer sees as activity.

            // Marketing STOP/unsubscribe → suppress from this partner's broadcasts.
            if (isStopMessage(msg)) {
              await recordOptOut(partner.partner_id, msg.from);
            }

            // Run the partner's WhatsApp flows for this inbound. Idempotent and
            // self-contained; never let it throw out of the webhook loop. Skipped
            // entirely when WhatsApp Ordering is OFF for this partner.
            if (waEnabled && flowInput && msg.id && phoneNumberId) {
              try {
                await runFlowForInbound({
                  partnerId: partner.partner_id,
                  phoneNumberId,
                  contactPhone: msg.from,
                  waMessageId: msg.id,
                  input: flowInput,
                  contactName,
                  // Reuse the token already on the partner row from the lookup
                  // above so the flow's send path doesn't re-query it.
                  sendToken: partner.access_token || undefined,
                });
              } catch (e) {
                console.error("Flow engine error:", e);
              }
            }

            await persistP.catch(() => {});
          }

          // Handle "Track Order Status" quick reply button click (auto-reply) —
          // only when WhatsApp Ordering is enabled for this partner.
          if (
            waEnabled &&
            msg.type === "button" &&
            msg.button?.text === "Track Order Status"
          ) {
            await handleTrackOrderStatus(msg.from, phoneNumberId);
          }
        }

        // Delivery receipts (sent/delivered/read/failed) for OUR outbound
        // messages arrive in the same "messages" change under `statuses`.
        // Capture them onto broadcasts / ledger / inbox. Never blocks the ACK.
        if (Array.isArray(value.statuses) && value.statuses.length) {
          await processStatuses(value).catch((e) =>
            console.error("processStatuses error:", e),
          );
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

// NOTE: The WhatsApp "typing…" indicator was intentionally removed. Meta's Cloud
// API only shows typing by sending a read receipt (status:"read") on the inbound
// message — the two are the same call and cannot be decoupled. To keep every
// inbound session message UNREAD (so owners/team can see customer messages), we
// send no read receipt and therefore no typing indicator.

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


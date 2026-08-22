import { NextRequest, NextResponse, after } from "next/server";
import crypto from "crypto";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerByPhoneNumberIdCached, type BranchCandidate } from "@/lib/whatsapp-meta";
import { runFlowForInbound, type FlowInput } from "@/lib/whatsappFlow/engine";
import { normalizePhone } from "@/lib/whatsapp-broadcast";
import {
  matchTableCandidate,
  buildTableOrderLink,
  mayNameTable,
  type TableCandidate,
} from "@/lib/whatsappTableMatch";
import { getBusinessCurrency } from "@/lib/whatsapp-cost";
import { estimateMessageCost } from "@/lib/whatsapp-pricing-analytics";
import {
  whatsappEnabledFromFlags,
  flowTypingEnabledFromFlags,
} from "@/lib/whatsapp-features";
import {
  parseCatalogOrder,
  looksLikeMenuId,
  buildCatalogReorderPayload,
  composeCatalogOrderReply,
} from "@/lib/whatsappCatalogOrder";
import { buildOrderLink } from "@/lib/whatsappFlow/orderLink";
import { toLocalPhone } from "@/lib/whatsappFlow/silentUser";

// Marketing opt-out / opt-in: a customer who replies STOP is added to the
// partner's blocklist (excluded from ALL of that partner's broadcasts — enforced
// both at creation and at send time); a customer who replies START is removed
// (resubscribe). Unique on (partner_id, phone).
const INSERT_OPTOUT = `
  mutation OptOut($obj: whatsapp_broadcast_optouts_insert_input!) {
    insert_whatsapp_broadcast_optouts_one(object: $obj) { id }
  }
`;

const DELETE_OPTOUT = `
  mutation OptIn($pid: uuid!, $phone: String!) {
    delete_whatsapp_broadcast_optouts(
      where: { partner_id: { _eq: $pid }, phone: { _eq: $phone } }
    ) { affected_rows }
  }
`;

// Reduce to letters+spaces so "STOP.", "Stop!", "  stop " all match the keyword.
function normKeyword(s?: string): string {
  return String(s || "").toLowerCase().replace(/[^a-z ]/g, "").trim();
}

// Exact-match keyword sets (exact avoids false positives like "please don't stop").
const STOP_WORDS = new Set([
  "stop", "stop promotions", "stop promotion", "stop all", "stop messages",
  "stop sending", "unsubscribe", "unsub", "cancel", "opt out", "optout", "remove me",
]);
const START_WORDS = new Set([
  "start", "unstop", "resubscribe", "subscribe", "resume", "opt in", "optin",
]);

function isStopMessage(msg: any): boolean {
  if (msg?.type === "text") return STOP_WORDS.has(normKeyword(msg.text?.body));
  if (msg?.type === "button") {
    const t = normKeyword(msg.button?.text);
    return t.includes("stop") || t.includes("unsubscribe");
  }
  if (msg?.type === "interactive") {
    const t = normKeyword(
      msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title,
    );
    return t.includes("stop") || t.includes("unsubscribe");
  }
  return false;
}

function isStartMessage(msg: any): boolean {
  if (msg?.type === "text") return START_WORDS.has(normKeyword(msg.text?.body));
  if (msg?.type === "button") {
    const t = normKeyword(msg.button?.text);
    return t.includes("resubscribe") || t === "start";
  }
  if (msg?.type === "interactive") {
    const t = normKeyword(
      msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title,
    );
    return t.includes("resubscribe") || t === "start";
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

async function removeOptOut(partnerId: string, phone: string) {
  try {
    await fetchFromHasura(DELETE_OPTOUT, {
      pid: partnerId,
      phone: normalizePhone(phone),
    });
  } catch (e: any) {
    console.error("Opt-in (resubscribe) failed:", e);
  }
}

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

// Flow execution can emit several Graph sends per inbound message, and delivery
// receipts are captured in a post-response `after()` callback; give the handler
// headroom so neither gets cut off before it finishes.
export const maxDuration = 60;

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

// A WhatsApp Flow submission arrives as interactive.nfm_reply, with the answers
// JSON-encoded inside `response_json` (plus the flow_token we set when sending,
// which is how a campaign maps an answer back to the recipient). Returns the
// decoded answers, or null when this isn't a Flow reply / the JSON is malformed.
export function readFlowReply(
  msg: any,
): { answers: Record<string, any>; raw: string } | null {
  const raw = msg?.interactive?.nfm_reply?.response_json;
  if (typeof raw !== "string" || !raw) return null;
  try {
    const answers = JSON.parse(raw);
    if (!answers || typeof answers !== "object") return null;
    return { answers, raw };
  } catch {
    return null;
  }
}

// Render a Flow submission as one readable inbox line ("Business type: Cafe").
// Meta gives no field ordering guarantee, so keys are sorted for a stable
// string. `flow_token` is plumbing, not an answer, and is never shown.
function describeFlowAnswers(answers: Record<string, any>): string {
  const parts = Object.keys(answers)
    .filter((k) => k !== "flow_token")
    .sort()
    .map((k) => {
      const v = answers[k];
      if (v === null || v === undefined || v === "") return null;
      const label = k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
      return `${label}: ${String(v)}`;
    })
    .filter(Boolean);
  return parts.join(" · ");
}

// ── campaign tagging bridge → whatsapp-clone inbox ─────────────────────────
// When someone answers the "Your business" Flow, tag their chat in the team's
// WhatsApp inbox so it can be filtered by business type. Strictly
// fire-and-forget: the inbox being down must never delay or fail our 200 back
// to Meta, which would make Meta retry the whole webhook.
const CAMPAIGN_TAG_URL = process.env.CAMPAIGN_TAG_URL || "";
const CAMPAIGN_TAG_SECRET = process.env.CAMPAIGN_TAG_SECRET || "";

async function tagCampaignAnswer(msg: any): Promise<void> {
  if (!CAMPAIGN_TAG_URL || !CAMPAIGN_TAG_SECRET) return;
  const flow = readFlowReply(msg);
  const answer = flow?.answers?.business_type;
  if (!answer) return;

  // flow_token is the number we sent to, so it survives a forwarded form;
  // msg.from is the fallback when an older send carried no token.
  const body = JSON.stringify({
    phone: String(flow!.answers.flow_token || msg.from || ""),
    answer: String(answer),
    otherText: flow!.answers.other_business ?? "",
  });
  const sig = crypto
    .createHmac("sha256", CAMPAIGN_TAG_SECRET)
    .update(body, "utf8")
    .digest("hex");

  try {
    const res = await fetch(CAMPAIGN_TAG_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-campaign-signature": sig,
        // Cloudflare's bot check rejects a default script user-agent with a
        // 1010 before the request ever reaches the Worker.
        "user-agent": "menuthere-campaign/1.0",
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[campaign-tag] HTTP", res.status, await res.text());
  } catch (e) {
    console.error("[campaign-tag] failed", e);
  }
}

// Tables (QR codes) for a partner, cached briefly. Read only when an inbound
// actually names a table, so ordinary traffic never pays for it. The TTL is
// short because a newly created table would otherwise be unreachable, and a
// deleted one would keep handing out a dead link.
const WA_LINK_DOMAIN = "menuthere.com";
const TABLES_TTL_MS = 60_000;
const tablesCache = new Map<
  string,
  { at: number; rows: TableCandidate[]; storeName: string | null; countryCode?: string | null }
>();

const GET_PARTNER_TABLES = `
  query PartnerTables($pid: uuid!) {
    qr_codes(where: { partner_id: { _eq: $pid } }) {
      id
      table_number
      table_name
    }
    partners_by_pk(id: $pid) {
      store_name
      country_code
    }
  }
`;

// store_name comes back with the tables because the printed QR encodes it in
// the link slug, and the cached partner row the webhook already holds does not
// carry it.
async function getPartnerTablesCached(
  partnerId: string,
): Promise<{ rows: TableCandidate[]; storeName: string | null; countryCode: string | null }> {
  const hit = tablesCache.get(partnerId);
  if (hit && Date.now() - hit.at < TABLES_TTL_MS) {
    return { rows: hit.rows, storeName: hit.storeName, countryCode: hit.countryCode ?? null };
  }
  const res: any = await fetchFromHasura(GET_PARTNER_TABLES, { pid: partnerId });
  const rows: TableCandidate[] = res?.qr_codes ?? [];
  const storeName: string | null = res?.partners_by_pk?.store_name ?? null;
  // Needed to turn the WhatsApp number into the LOCAL form the auto-login token
  // keys on. The cached phone-number→partner row does not carry it, and this
  // query already fetches the partner for store_name.
  const countryCode: string | null = res?.partners_by_pk?.country_code ?? null;
  tablesCache.set(partnerId, { at: Date.now(), rows, storeName, countryCode });
  return { rows, storeName, countryCode };
}

function extractIncomingBody(msg: any): { type: string; body: string | null; mediaUrl: string | null } {
  const t = msg.type as string;
  switch (t) {
    case "text":
      return { type: "text", body: msg.text?.body ?? null, mediaUrl: null };
    case "button":
      return { type: "button", body: msg.button?.text ?? null, mediaUrl: null };
    case "interactive": {
      // Flow submissions carry no title — without this branch the whole answer
      // was dropped and the row landed in the inbox with a null body.
      const flow = readFlowReply(msg);
      if (flow) {
        // Keep the raw JSON when it renders to nothing, so a shape we didn't
        // anticipate is still recoverable from the inbox rather than lost.
        return {
          type: "interactive",
          body: describeFlowAnswers(flow.answers) || flow.raw,
          mediaUrl: null,
        };
      }
      return {
        type: "interactive",
        body:
          msg.interactive?.button_reply?.title ||
          msg.interactive?.list_reply?.title ||
          null,
        mediaUrl: null,
      };
    }
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
    case "order": {
      // A catalogue cart. Without this it fell to "unknown" and landed in the
      // inbox as a blank row, so the owner could see that SOMETHING arrived but
      // not that a customer had built a basket.
      const parsed = parseCatalogOrder(msg);
      const n = parsed?.lines.length ?? 0;
      const qty = parsed?.lines.reduce((s, l) => s + l.quantity, 0) ?? 0;
      return {
        type: "order",
        body: n
          ? `🛒 Cart: ${n} item${n === 1 ? "" : "s"} (${qty} unit${qty === 1 ? "" : "s"})${
              parsed?.note ? ` — “${parsed.note}”` : ""
            }`
          : "🛒 Cart (empty)",
        mediaUrl: null,
      };
    }
    default:
      return { type: "unknown", body: null, mediaUrl: null };
  }
}

// Normalize an inbound message into the flow engine's input shape. Text,
// interactive-reply and button messages carry their text/title; media and
// location messages drive flows too (so the "on any" trigger fires on a photo,
// document, voice note, etc.), using the caption as text when present, "" when
// not. Only genuinely non-actionable events (reactions, system/unsupported
// messages) return null and are ignored by the engine.
function normalizeFlowInput(msg: any): FlowInput | null {
  const type = msg?.type as string;
  let text: string | null = null;
  let replyId: string | null = null;
  switch (type) {
    case "text":
      text = msg.text?.body ?? "";
      break;
    case "interactive": {
      // A questionnaire submission: the answers ARE the message. Carried
      // through as `flowResponse` so the parked questionnaire step can bind each
      // one to its variable; `text` is the readable summary, which is what a
      // trigger or a Condition step sees if it ever looks at the words.
      const submitted = readFlowReply(msg);
      if (submitted) {
        const summary = describeFlowAnswers(submitted.answers);
        return {
          text: summary,
          normalized: summary.trim().toLowerCase(),
          replyId: null,
          type,
          flowResponse: submitted.answers,
        };
      }
      const ir = msg.interactive?.button_reply || msg.interactive?.list_reply;
      if (!ir) return null;
      text = ir.title ?? "";
      replyId = ir.id ?? null;
      break;
    }
    case "button":
      text = msg.button?.text ?? "";
      replyId = msg.button?.payload ?? null;
      break;
    case "image":
    case "video":
    case "audio":
    case "document":
    case "sticker":
      text = msg[type]?.caption ?? "";
      break;
    case "location":
      text = msg.location?.name || msg.location?.address || "";
      break;
    case "contacts":
      text = "";
      break;
    default:
      // reaction / system / unsupported / unknown → not a flow-driving message
      return null;
  }
  return { text: text ?? "", normalized: String(text ?? "").trim().toLowerCase(), replyId, type };
}

// Generic lead words that would make a short outlet-name prefix ambiguous
// ("the grand ...") — a prefix match is skipped when the name leads with one.
const BRANCH_MATCH_STOPWORDS = new Set([
  "the", "a", "an", "and", "of", "for", "to", "at", "in", "on", "my", "your",
  "i", "we", "order", "from", "want", "need", "hi", "hello", "hey", "please",
  "some", "this", "that",
]);

/**
 * Shared-number brand routing: does the inbound text NAME one of the brand's
 * outlets? Matches the message against each candidate's username / store_name
 * (space/underscore/case-insensitive) as a contiguous run of WHOLE words — so a
 * short name like "cipo" can't false-match inside another word ("recipone").
 * Accepts the FULL name, or (failing that) a distinctive leading run: >= 2
 * name-words (>= 6 chars) like "al arab", OR a single long word (>= 7 chars)
 * like "jamsheena" — never led by a generic stop word. So "order from al arab
 * kuzhimandi" routes via "al arab" and "order from jamsheena" via "jamsheena",
 * even when the rest is partial/misspelled. A full match beats a prefix; the
 * longest wins. Returns null when nothing is named.
 */
function matchBranchCandidate(
  normalizedText: string,
  candidates: BranchCandidate[],
): BranchCandidate | null {
  const msgTokens = (normalizedText || "").match(/[a-z0-9]+/g) || [];
  if (!msgTokens.length) return null;
  const tokenize = (s: string | null) =>
    (s || "").toLowerCase().match(/[a-z0-9]+/g) || [];
  // Does the message contain `needle` as a contiguous run of WHOLE tokens?
  const messageHasRun = (needle: string): boolean => {
    for (let i = 0; i < msgTokens.length; i++) {
      let acc = "";
      for (let j = i; j < msgTokens.length; j++) {
        acc += msgTokens[j];
        if (acc === needle) return true;
        if (acc.length >= needle.length) break; // overshot — no run equals needle
      }
    }
    return false;
  };
  let best: { c: BranchCandidate; score: number } | null = null;
  for (const c of candidates) {
    for (const raw of [c.username, c.store_name]) {
      const nameTokens = tokenize(raw);
      if (!nameTokens.length) continue;
      // Try the full name, then shrinking leading whole-word runs; take the
      // longest that the message contains.
      for (let n = nameTokens.length; n >= 1; n--) {
        const isWhole = n === nameTokens.length;
        const key = nameTokens.slice(0, n).join("");
        if (isWhole) {
          if (key.length < 4) continue;
        } else {
          // A prefix (not the full name): a distinctive leading run, not led by
          // a generic word — >= 2 words (>= 6 chars) like "al arab", or a single
          // long word (>= 7 chars) like "jamsheena".
          if (BRANCH_MATCH_STOPWORDS.has(nameTokens[0] ?? "")) continue;
          const okMulti = n >= 2 && key.length >= 6;
          const okSingle = n === 1 && key.length >= 7;
          if (!okMulti && !okSingle) continue;
        }
        if (!messageHasRun(key)) continue;
        const score = (isWhole ? 1000 : 0) + key.length; // full match wins
        if (!best || score > best.score) best = { c, score };
        break; // longest match for this name found
      }
    }
  }
  return best?.c ?? null;
}

async function persistIncoming(
  partnerId: string,
  msg: any,
  contactName: string | null,
  phoneNumberId: string | null,
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
        // Which of the partner's numbers received this — so an inbox reply goes
        // back out from the SAME number (multi-number correctness).
        phone_number_id: phoneNumberId,
      },
    });
  } catch (e) {
    console.error("Failed to persist incoming message:", e);
  }
}

// ── Template quick-reply button-click tracking ──────────────────────────────
// SMB / coexistence WABAs can't use Meta's template_analytics, so we count
// quick-reply button taps ourselves. A button reply carries `context.id` (the
// WAMID of the original template message); we map that back to the template via
// the message-log ledger and record one idempotent click (deduped on the reply
// id). NOTE: URL/CTA buttons send no webhook, so those taps are not captured.
const FIND_TEMPLATE_BY_MID = `
  query FindTemplateByMid($mid: String!) {
    whatsapp_message_logs(where: { meta_message_id: { _eq: $mid } }, limit: 1) {
      template_name
    }
  }
`;
const INSERT_TEMPLATE_CLICK = `
  mutation InsertTemplateClick($obj: whatsapp_template_click_events_insert_input!) {
    insert_whatsapp_template_click_events_one(
      object: $obj,
      on_conflict: { constraint: whatsapp_template_click_events_reply_message_id_key, update_columns: [] }
    ) { id }
  }
`;

/**
 * Record a quick-reply button tap on a template message. Fire-and-forget and
 * fully guarded — must never affect inbound message processing.
 */
async function recordTemplateButtonClick(
  partnerId: string,
  msg: any,
): Promise<void> {
  try {
    if (msg?.type !== "button") return;
    const contextMid = msg?.context?.id;
    if (!contextMid || !msg?.id) return;
    const d = await fetchFromHasura(FIND_TEMPLATE_BY_MID, { mid: contextMid });
    const templateName = d?.whatsapp_message_logs?.[0]?.template_name;
    if (!templateName) return; // reply wasn't to a known template send
    await fetchFromHasura(INSERT_TEMPLATE_CLICK, {
      obj: {
        partner_id: partnerId,
        template_name: templateName,
        button_text: msg.button?.text ?? null,
        button_payload: msg.button?.payload ?? null,
        context_message_id: contextMid,
        reply_message_id: msg.id, // UNIQUE → dedupes webhook retries
        contact_phone: msg.from ?? null,
      },
    });
  } catch (e) {
    console.error("recordTemplateButtonClick failed:", e);
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

// Android Call Logger send logs — flow follow-ups (wa_sends) and scheduled bulk
// messages (scheduled_message_targets). Both carry the Meta message id in
// `wa_message_id`; the Cloudflare worker only ever writes `sent`, so these rows
// need the same delivered/read/failed advance to reflect real delivery.
const UPDATE_WA_SENDS = `
  mutation UpdWaSends($where: wa_sends_bool_exp!, $set: wa_sends_set_input!) {
    update_wa_sends(where: $where, _set: $set) { affected_rows }
  }
`;

const UPDATE_SCHED_TARGETS = `
  mutation UpdSchedTargets(
    $where: scheduled_message_targets_bool_exp!
    $set: scheduled_message_targets_set_input!
  ) {
    update_scheduled_message_targets(where: $where, _set: $set) { affected_rows }
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

// One broadcast recipient: advance status + capture failure detail and
// pricing/cost. Returns the parent broadcast (id + partner) so the caller can
// recompute its aggregate funnel ONCE per batch, instead of re-aggregating the
// whole broadcast on every single status callback (which made the webhook too
// slow under a delivery burst and caused Meta to drop receipts). Returns null
// when the message isn't a broadcast recipient.
async function applyBroadcastStatus(
  st: any,
): Promise<{ broadcastId: string; partnerId?: string } | null> {
  const mid = st.id;
  if (!mid) return null;
  let rcpt: any;
  try {
    const d = await fetchFromHasura(FIND_RECIPIENT, { mid });
    rcpt = d?.whatsapp_broadcast_recipients?.[0];
  } catch (e) {
    console.error("status: find recipient failed", e);
    return null;
  }
  if (!rcpt) return null; // not a broadcast message

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

  // 2) Pricing/cost — write a PROVISIONAL ESTIMATE the moment a message is
  //    delivered (Meta charges per delivered template message). The estimate uses
  //    the real rate already observed for this market from pricing_analytics, else
  //    the published rate card — clearly labelled `cost_source='estimate'` and
  //    OVERWRITTEN with Meta's actual billed cost by the reconciliation cron.
  //    A message Meta's pricing object marks non-billable is authoritatively free
  //    → mark it reconciled now so reconciliation never re-charges it. Skipped for
  //    `failed` (undelivered → not charged).
  const isDeliveredish = status === "delivered" || status === "read";
  if (rcpt.cost_amount == null && partnerId && (pricing || isDeliveredish)) {
    try {
      const category = pricing?.category || rcpt.broadcast?.category || "marketing";
      const billable = pricing ? !!pricing.billable : true;
      const pricingType = pricing?.type || pricing?.pricing_type || null;
      const businessCurrency = await getBusinessCurrency(partnerId);
      const est = await estimateMessageCost({
        recipientPhone: rcpt.phone,
        category,
        pricingType,
        billable,
        businessCurrency,
      });
      await fetchFromHasura(UPDATE_RECIPIENTS, {
        where: { meta_message_id: { _eq: mid }, cost_amount: { _is_null: true } },
        set: {
          billable,
          pricing_category: category.toLowerCase(),
          pricing_model: pricing?.pricing_model || null,
          pricing_type: pricingType,
          cost_amount: est.amount, // best-available now; reconciliation replaces it
          cost_estimated: est.amount, // preserved so we can measure estimate accuracy
          cost_currency: est.currency,
          cost_source: billable ? "rate_card" : "meta_free",
          // Rate-card cost is FINAL: Meta hides COST for BSP-billed accounts
          // (verified on the live WABAs), so there is no later reconciliation.
          // The rate card is Meta's published rate = what the restaurant is charged.
          cost_reconciled_at: tsIso,
        },
      });
    } catch (e) {
      console.error("status: recipient cost failed", e);
    }
  }

  return { broadcastId: rcpt.broadcast_id, partnerId };
}

// Recompute a broadcast's aggregate funnel (delivered/read/failed) + total cost
// from its recipient rows. Called ONCE per affected broadcast after a webhook
// batch is applied — not per status callback.
async function recountBroadcast(
  bid: string,
  partnerId?: string,
): Promise<void> {
  try {
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
      const pricingType = pricing.type || pricing.pricing_type || null;
      const billable = !!pricing.billable;
      const est = await estimateMessageCost({
        recipientPhone: log.phone,
        category: pricing.category,
        pricingType,
        billable,
        businessCurrency,
      });
      await fetchFromHasura(UPDATE_LOGS, {
        where: { meta_message_id: { _eq: mid }, cost_amount: { _is_null: true } },
        set: {
          billable,
          pricing_category: pricing.category || null,
          pricing_type: pricingType,
          cost_amount: est.amount,
          cost_estimated: est.amount,
          cost_currency: est.currency,
          cost_source: billable ? "estimate" : "meta_free",
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

// Android Call Logger sends (flow follow-ups + scheduled bulk messages). These
// live in their own tables, matched by wa_message_id. The worker records only
// `sent` (Meta accepted the API call); advance them the same forward-only way so
// the call-logger log shows real delivery — and, on `failed`, the actual reason
// (e.g. a marketing-frequency drop) instead of a misleading "sent".
async function applyCallLoggerStatus(st: any): Promise<void> {
  const mid = st.id;
  if (!mid) return;
  const status = String(st.status || "").toLowerCase();
  const allowedFrom = ADVANCE_FROM[status];
  if (!allowedFrom) return; // only delivered / read / failed advance a row

  const err = Array.isArray(st.errors) ? st.errors[0] : null;
  const set: Record<string, unknown> =
    status === "failed"
      ? {
          status: "failed",
          error: `${err?.code != null ? `(#${err.code}) ` : ""}${
            err?.error_data?.details || err?.title || err?.message || "delivery failed"
          }`.slice(0, 500),
        }
      : { status };
  const where = { wa_message_id: { _eq: mid }, status: { _in: allowedFrom } };

  // A given message id lives in only one of these tables; running both is cheap
  // and keeps flow + scheduled logs truthful. Never let one 500 the webhook.
  await Promise.all([
    fetchFromHasura(UPDATE_WA_SENDS, { where, set }).catch((e) =>
      console.error("status: wa_sends advance failed", e),
    ),
    fetchFromHasura(UPDATE_SCHED_TARGETS, { where, set }).catch((e) =>
      console.error("status: scheduled_message_targets advance failed", e),
    ),
  ]);
}

async function processStatuses(value: any): Promise<void> {
  const statuses: any[] = value?.statuses || [];
  if (!statuses.length) return;

  // Group callbacks by message id. Multiple states for the SAME message
  // (delivered → read) MUST be applied in timestamp order so a late `delivered`
  // can't downgrade a row already marked `read`; different messages are fully
  // independent and run in parallel. This keeps the webhook fast enough under a
  // broadcast's burst of receipts that Meta never times out and drops them.
  const byMid = new Map<string, any[]>();
  for (const st of statuses) {
    if (!st?.id) continue;
    const arr = byMid.get(st.id);
    if (arr) arr.push(st);
    else byMid.set(st.id, [st]);
  }

  // broadcastId -> partnerId for the broadcasts touched by this batch.
  const affected = new Map<string, string | undefined>();

  await Promise.all(
    [...byMid.values()].map(async (group) => {
      group.sort(
        (a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0),
      );
      for (const st of group) {
        // These targets hit different tables — safe to run together.
        const [bres] = await Promise.all([
          applyBroadcastStatus(st),
          applyLedgerStatus(st),
          applyInboxStatus(st),
          applyCallLoggerStatus(st),
        ]);
        if (bres) affected.set(bres.broadcastId, bres.partnerId);
      }
    }),
  );

  // Recompute each touched broadcast's funnel + cost exactly once.
  await Promise.all(
    [...affected.entries()].map(([bid, pid]) => recountBroadcast(bid, pid)),
  );
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

        // Expo Lead Scanner inbox: mirror events on the shared Menuthere number
        // to the standalone Convex inbox. The shared number has no partner row,
        // so nothing below persists these — this forward is the only capture
        // path (Meta allows a single webhook callback per app). No-op unless
        // EXPO_INBOX_INGEST_URL is configured. Awaited with a short timeout so
        // a slow/down inbox can never stall webhook handling; failures only log.
        if (
          process.env.EXPO_INBOX_INGEST_URL &&
          phoneNumberId ===
            (process.env.EXPO_INBOX_PHONE_NUMBER_ID ||
              process.env.WHATSAPP_PHONE_NUMBER_ID) &&
          (messages.length > 0 || (value.statuses || []).length > 0)
        ) {
          try {
            await fetch(process.env.EXPO_INBOX_INGEST_URL, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-ingest-secret": process.env.EXPO_INBOX_INGEST_SECRET || "",
              },
              body: JSON.stringify({ kind: "meta", value }),
              signal: AbortSignal.timeout(3000),
            });
          } catch (e) {
            console.error("Expo inbox forward failed:", e);
          }
        }

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
          whatsappEnabledFromFlags(partner.feature_flags) &&
          // Per-number flow switch: a partner can turn OFF automated flows for a
          // specific number (inbound is still recorded to the inbox below).
          partner.flow_enabled !== false;
        // Welcome-flow read receipt + typing toggle (only meaningful when WA on).
        const flowTyping =
          waEnabled && flowTypingEnabledFromFlags(partner!.feature_flags);

        for (const msg of messages) {
          console.log(
            `[WhatsApp Webhook] From: ${msg.from} | Type: ${msg.type} | partner=${partner?.partner_id || "shared"}`
          );

          if (partner?.partner_id) {
            // Log the inbound to the inbox, but DON'T block the flow reply on it —
            // overlap it with the flow run. Still awaited before we return so a
            // serverless freeze can't drop the write.
            const persistP = persistIncoming(partner.partner_id, msg, contactName, phoneNumberId);
            // Tag the sender's chat in the inbox when this is a Flow answer.
            const tagP = tagCampaignAnswer(msg);
            // Count template quick-reply button taps (SMB/coexistence WABAs can't
            // use Meta's template_analytics). Guarded; flushed with the writes below.
            const clickP = recordTemplateButtonClick(partner.partner_id, msg);

            const flowInput = normalizeFlowInput(msg);

            // Shared-number brands (e.g. Televery): if the customer NAMES one of
            // the brand's outlets ("...order from spicechick"), run THAT branch's
            // flows so the welcome + order link are the branch's, not the brand
            // parent's. A plain "hi" (no branch named) — OR a named branch whose
            // own WhatsApp Ordering is off — falls through to the brand parent
            // rather than dropping the message silently.
            const named =
              flowInput?.type === "text" && partner.branchCandidates?.length
                ? matchBranchCandidate(flowInput.normalized, partner.branchCandidates)
                : null;
            const branch =
              named &&
              whatsappEnabledFromFlags(named.feature_flags) &&
              named.flow_enabled !== false
                ? named
                : null;
            const runPartnerId = branch?.partner_id ?? partner.partner_id;
            const runSendToken =
              (branch?.access_token ?? partner.access_token) || undefined;
            // A matched branch is kept only when it can actually run (checked
            // above), so it's WA-enabled here; everything else stays on the parent.
            const runWaEnabled = branch ? true : waEnabled;
            const runFlowTyping = branch
              ? flowTypingEnabledFromFlags(branch.feature_flags)
              : flowTyping;

            // NO read receipt / blue tick on inbound session messages. WhatsApp's
            // typing indicator and the read receipt are the same API call, so we
            // deliberately send neither: every inbound stays UNREAD so the owner
            // (and other team members) can see and actually check what customers
            // sent. The flow's own reply is what the customer sees as activity.

            // Marketing opt-out (STOP) / opt-in (START) for this partner's broadcasts.
            if (isStopMessage(msg)) {
              await recordOptOut(partner.partner_id, msg.from);
            } else if (isStartMessage(msg)) {
              await removeOptOut(partner.partner_id, msg.from);
            }

            // Run the partner's WhatsApp flows for this inbound. Idempotent and
            // self-contained; never let it throw out of the webhook loop. Skipped
            // entirely when WhatsApp Ordering is OFF for this partner.
            if (runWaEnabled && flowInput && msg.id && phoneNumberId) {
              // "I want to order from table 5" → link straight to that table's
              // QR page. Only a TEXT inbound is parsed (a button label must
              // never be table-matched), and the lookup is skipped entirely
              // unless the message actually names a table, so ordinary traffic
              // costs no query.
              let orderLinkOverride: string | undefined;
              let tableLabelOverride: string | undefined;
              // mayNameTable, not extractTableLabel: the latter only sees the
              // word "table", so a partner whose tables are called "AC 1" never
              // got as far as the lookup.
              if (flowInput.type === "text" && mayNameTable(flowInput.normalized || "")) {
                try {
                  const { rows, storeName, countryCode } = await getPartnerTablesCached(runPartnerId);
                  const m = matchTableCandidate(flowInput.normalized || "", rows);
                  if (m?.kind === "hit") {
                    orderLinkOverride = buildTableOrderLink(
                      WA_LINK_DOMAIN,
                      branch?.store_name ?? storeName,
                      m.table.id,
                      {
                        // Same identity the generic order link carries, so the
                        // table order lands on the number that asked for it
                        // rather than whoever the browser is signed in as.
                        // toLocalPhone for the reason spelled out in
                        // buildTableOrderLink: auto-login keys on the LOCAL number.
                        partnerId: runPartnerId,
                        phone: toLocalPhone(msg.from, countryCode) || null,
                      },
                    );
                    // What the partner actually calls this table, falling back
                    // to "Table N" the same way every other surface does.
                    tableLabelOverride =
                      m.table.table_name?.trim() || `Table ${m.table.table_number}`;
                  }
                  // "ambiguous" deliberately falls through to the generic link:
                  // qr_codes.price_adjustment rewrites prices, so guessing the
                  // wrong table would change what the customer pays.
                } catch (e) {
                  console.error("table match failed (using generic link):", e);
                }
              }

              try {
                await runFlowForInbound({
                  // Branch-scoped when the customer named an outlet, else the
                  // brand parent. partnerId is the single lever — the engine
                  // re-derives store_name + order_link from it.
                  partnerId: runPartnerId,
                  phoneNumberId,
                  contactPhone: msg.from,
                  waMessageId: msg.id,
                  input: flowInput,
                  contactName,
                  // Same physical number → the parent's token also sends for its
                  // outlets; a branch's own copied token is equivalent.
                  sendToken: runSendToken,
                  // Send read+typing only if the welcome flow actually runs.
                  flowTyping: runFlowTyping,
                  // Table-scoped link when the customer named a table; the
                  // partner's own welcome copy is otherwise untouched.
                  orderLinkOverride,
                  tableLabelOverride,
                });
              } catch (e) {
                console.error("Flow engine error:", e);
              }
            }

            await Promise.all([persistP.catch(() => {}), tagP.catch(() => {}), clickP.catch(() => {})]);
          }

          // Handle "Track Order Status" quick reply button click (auto-reply) —
          // only when WhatsApp Ordering is enabled for this partner.
          if (
            waEnabled &&
            msg.type === "button" &&
            msg.button?.text === "Track Order Status"
          ) {
            await handleTrackOrderStatus(
              msg.from,
              phoneNumberId,
              partner?.access_token || undefined,
            );
          }

          // A catalogue cart. Answered whenever WhatsApp Ordering is on — NOT
          // gated on the whatsappcatalog flag, because a coexistence number can
          // deliver a cart from the WhatsApp Business app's own catalogue whether
          // or not we ever provisioned one, and that customer still deserves an
          // answer rather than silence.
          if (waEnabled && msg.type === "order" && partner?.partner_id && phoneNumberId) {
            await handleCatalogOrder(
              partner.partner_id,
              msg,
              phoneNumberId,
              partner.access_token || undefined,
            );
          }
        }

        // Delivery receipts (sent/delivered/read/failed) for OUR outbound
        // messages arrive in the same "messages" change under `statuses`.
        // Capture them onto broadcasts / ledger / inbox AFTER the 200 is sent
        // (Next `after`) so Meta gets an instant ACK and never times out — a
        // slow ACK is exactly what was making it retry then DROP delivery
        // receipts, leaving recipients stuck at "sent".
        if (Array.isArray(value.statuses) && value.statuses.length) {
          const statusValue = value;
          after(() =>
            processStatuses(statusValue).catch((e) =>
              console.error("processStatuses error:", e),
            ),
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
// ── WhatsApp catalogue carts ────────────────────────────────────────────────

const CATALOG_CART_ITEMS = `
  query CatalogCartItems($partnerId: uuid!, $ids: [uuid!]!) {
    menu(
      where: {
        partner_id: { _eq: $partnerId }
        id: { _in: $ids }
        deletion_status: { _eq: 0 }
      }
    ) { id name is_available }
    partners_by_pk(id: $partnerId) { username store_name country_code }
  }
`;

/**
 * Answer an inbound catalogue cart with a checkout link.
 *
 * Shape A: WhatsApp is a browse-and-cart surface, the storefront is checkout.
 * We resolve the cart to menu rows, hand it over via the existing `?ro=`
 * payload, and let checkout re-price everything against the live menu — so a
 * stale catalogue can never produce a wrong bill.
 *
 * A customer who builds a cart and gets silence is worse than never having been
 * shown a catalogue, so EVERY branch replies:
 *  - nothing matched (typically a coexistence number's on-device catalogue,
 *    whose retailer ids are not our uuids) → point them at the ordering page
 *  - some matched → link with those, and say how many were dropped
 *
 * Never throws: the webhook must keep processing and still return 200.
 */
async function handleCatalogOrder(
  partnerId: string,
  msg: any,
  phoneNumberId: string,
  /** The partner's own WABA token. Without it every reply 100/33s and the
   *  customer gets exactly the silence this handler exists to prevent. */
  sendToken?: string,
): Promise<void> {
  try {
    const parsed = parseCatalogOrder(msg);
    if (!parsed || !parsed.lines.length) return;

    // Shape-filter first: a cart from the phone app's catalogue carries ids that
    // are not uuids, and Hasura would reject the whole `_in` on the first bad
    // value rather than returning the rows we could have matched.
    const candidateIds = parsed.lines.map((l) => l.retailerId).filter(looksLikeMenuId);

    let rows: Array<{ id: string; name: string; is_available?: boolean | null }> = [];
    let partner: { username?: string; store_name?: string; country_code?: string | null } | null = null;
    if (candidateIds.length) {
      const d = await fetchFromHasura(CATALOG_CART_ITEMS, { partnerId, ids: candidateIds });
      rows = d?.menu ?? [];
      partner = d?.partners_by_pk ?? null;
    } else {
      const d = await fetchFromHasura(
        `query CatalogCartPartner($id: uuid!) { partners_by_pk(id: $id) { username store_name country_code } }`,
        { id: partnerId },
      );
      partner = d?.partners_by_pk ?? null;
    }
    if (!partner?.username) return;

    const rowById = new Map(rows.map((r) => [r.id, r]));

    // A catalogue keeps sold-out dishes LISTED (marked out of stock), so a
    // customer can cart one. Confirming it by name and putting it in the
    // checkout cart would promise food the kitchen does not have.
    const matched: Array<{ menuId: string; quantity: number; name: string }> = [];
    const soldOut: string[] = [];
    let unmatchedCount = 0;
    for (const l of parsed.lines) {
      const row = rowById.get(l.retailerId);
      if (!row) { unmatchedCount++; continue; }
      if (row.is_available === false) { soldOut.push(row.name); continue; }
      matched.push({ menuId: l.retailerId, quantity: l.quantity, name: row.name });
    }

    const storeName = partner.store_name || "us";
    const body = composeCatalogOrderReply({
      storeName,
      matched: matched.map((m) => ({ name: m.name, quantity: m.quantity })),
      soldOut,
      unmatchedCount,
    });

    // The sender's number authenticates the link, exactly as the flow engine's
    // order links do — the cart is already proof of intent.
    //
    // toLocalPhone, NOT normalizePhone: buildOrderLink's `phone` must be the
    // LOCAL number because auto-login keys the account on `${local}@user.com`.
    // normalizePhone ADDS a country code, so handing it over mints a token for a
    // phone that matches nobody and signs the customer into a brand-new empty
    // account — losing their saved address, history and loyalty balance.
    const localPhone = toLocalPhone(msg.from, partner.country_code) || undefined;
    const reorderPayload = buildCatalogReorderPayload(matched);
    const url = buildOrderLink(partner.username, partnerId, {
      phone: localPhone ?? null,
      reorderPayload,
    });

    await sendInteractiveReply(phoneNumberId, msg.from, body, url, {
      accessToken: sendToken,
      ctaText: "Checkout",
      fallbackText: body,
    });
  } catch (e) {
    console.error("handleCatalogOrder failed:", e);
  }
}

async function handleTrackOrderStatus(
  userPhone: string,
  phoneNumberId: string,
  /** Partner's own WABA token — the global one 100/33s on a partner number, so
   *  without this the customer who tapped "Track Order Status" gets nothing.
   *  Pre-existing; fixed alongside the catalogue path that shares these helpers. */
  sendToken?: string,
) {
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
        "😕 Sorry, we couldn't find a recent order for your number.\n\nPlease make sure you're using the same number you placed the order with.",
        sendToken,
      );
      return;
    }

    const orderUrl = `https://menuthere.com/order/${order.id}`;
    await sendInteractiveReply(
      phoneNumberId,
      userPhone,
      "Click the button below to see realtime order updates 👇",
      orderUrl,
      { accessToken: sendToken },
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
async function sendTextReply(
  phoneNumberId: string,
  to: string,
  text: string,
  /**
   * The PARTNER's Embedded-Signup token. Our global WHATSAPP_ACCESS_TOKEN has no
   * role on a partner's WABA and returns 100/subcode 33 on every call (see
   * src/lib/whatsapp-meta.ts:16-33) — it only works for WABAs inside our own Meta
   * business. Omitting this makes the send fail silently.
   */
  accessTokenOverride?: string,
) {
  const accessToken = accessTokenOverride || process.env.WHATSAPP_ACCESS_TOKEN!;

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
async function sendInteractiveReply(
  phoneNumberId: string,
  to: string,
  bodyText: string,
  url: string,
  opts?: {
    /** See sendTextReply — the global token cannot send on a partner WABA. */
    accessToken?: string;
    /** Button label. Defaults to the order-tracking wording this helper was
     *  written for; a catalogue cart must NOT say "Track Your Order". */
    ctaText?: string;
    /** Plain-text fallback body when the interactive send is rejected. Defaults
     *  to the order-tracking sentence, which is wrong for any other caller. */
    fallbackText?: string;
  },
) {
  const accessToken = opts?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN!;

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
              display_text: opts?.ctaText ?? "Track Your Order",
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
    // Carry the caller's own body into the fallback. Dropping it used to lose
    // the cart confirmation AND tell the customer a checkout link was order
    // tracking.
    await sendTextReply(
      phoneNumberId,
      to,
      opts?.fallbackText
        ? `${opts.fallbackText}\n\n${url}`
        : `Click the link below to see realtime order updates:\n\n${url}`,
      accessToken,
    );
  }
}


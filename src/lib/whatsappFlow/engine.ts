// WhatsApp Flow runtime engine. Called from the Meta webhook for each inbound
// customer message. Ported from OpenWA's FSM engine, but made serverless-safe:
// correctness lives in Postgres (idempotency on the Meta message id + a
// partial-unique active run + optimistic-version CAS on advance), never in
// process memory. Sends go from the partner's own number with OUR system-user
// token (a partner Coexistence token can't send). `buttons` nodes are sent as
// NATIVE WhatsApp interactive reply buttons.

import { fetchFromHasura } from "@/lib/hasuraClient";
import { isWithinTimeWindow, formatTime12h } from "@/lib/isWithinTimeWindow";
import { buildOrderLink } from "@/lib/whatsappFlow/orderLink";
import { findOrCreateUserByPhone, toLocalPhone } from "@/lib/whatsappFlow/silentUser";
import type {
  FlowGraph,
  FlowNode,
  TriggerDef,
  ConditionRule,
  ButtonItem,
  CaptureValidation,
} from "@/lib/whatsappFlow/types";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";
// Meta dismisses the "typing…" indicator the instant a message is sent, so the
// welcome path holds it on screen for a short, human-like beat before sending
// the reply. Meta shows typing for up to 25s; this only affects the
// once-per-customer welcome path, so it never delays normal replies.
const WELCOME_TYPING_MS = 1500;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const MAX_STEPS = 50; // loop guard across a whole run
const MAX_SENDS_PER_TURN = 10; // bound Graph sends per inbound message
// Delay ("wait then continue") support. A delay parks the run in a SLEEPING
// state (status stays "active" so it keeps the single conversation slot; a
// non-null resume_at marks it as sleeping rather than awaiting a reply) and a
// cron wakes it. Capped at 24h — the outer bound Meta's session window allows.
const MAX_DELAY_SECONDS = 24 * 60 * 60;
// Extra head-room added past a delay's wake time so the run's TTL always
// outlives the delay itself plus the steps that fire after it.
const POST_DELAY_BUFFER_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FlowInput {
  text: string; // raw inbound text / interactive title / media caption ("" if none)
  normalized: string; // text.trim().toLowerCase()
  replyId?: string | null; // interactive button/list reply id (= branch handle)
  // WhatsApp message type ("text", "image", "location", …). Lets the "any"
  // trigger fire on media messages that carry no caption (empty normalized).
  type?: string;
}

interface RunState {
  id?: string;
  flowId: string;
  variables: Record<string, unknown>;
  stepCount: number;
  version: number;
}

interface Outbound {
  kind: "text" | "image" | "video" | "audio" | "document" | "buttons" | "cta";
  text?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  items?: ButtonItem[];
  buttonText?: string;
  url?: string;
}

// ─── GraphQL ─────────────────────────────────────────────────────
const Q_ACTIVE_RUN = `
  query ActiveRun($p: uuid!, $c: String!) {
    whatsapp_flow_execution_state(where: {partner_id: {_eq: $p}, contact_phone: {_eq: $c}, status: {_eq: "active"}}, limit: 1) {
      id flow_id current_node_id variables step_count version expires_at resume_at phone_number_id
    }
  }
`;
const Q_RUN_COUNT = `
  query RunCount($p: uuid!, $c: String!) {
    whatsapp_flow_execution_state_aggregate(where: {partner_id: {_eq: $p}, contact_phone: {_eq: $c}}) { aggregate { count } }
  }
`;
const Q_ENABLED_FLOWS = `
  query EnabledFlows($p: uuid!) {
    whatsapp_flows(where: {partner_id: {_eq: $p}, enabled: {_eq: true}}) {
      id graph triggers escape_keyword run_ttl_hours once_per_user cooldown_hours
    }
  }
`;
// Most recent run timestamp per flow for this contact — drives "once per
// customer" (ever) and "once per customer every N hours" (cooldown).
const Q_LAST_FLOW_RUNS = `
  query LastFlowRuns($p: uuid!, $c: String!) {
    whatsapp_flow_execution_state(where: {partner_id: {_eq: $p}, contact_phone: {_eq: $c}}, distinct_on: flow_id, order_by: [{flow_id: asc}, {started_at: desc}]) {
      flow_id
      started_at
    }
  }
`;
const Q_FLOW = `
  query Flow($id: uuid!) {
    whatsapp_flows_by_pk(id: $id) { id graph enabled escape_keyword run_ttl_hours }
  }
`;
// Sleeping runs whose delay has elapsed — drained by the resume-flow-delays cron.
// resume_at is only ever non-null on a sleeping ("active" but not awaiting a
// reply) run, so `_lte now` is a precise "due to wake" filter.
const Q_DUE_SLEEPING = `
  query DueSleeping($now: timestamptz!, $limit: Int!) {
    whatsapp_flow_execution_state(
      where: {status: {_eq: "active"}, resume_at: {_lte: $now}}
      order_by: {resume_at: asc}
      limit: $limit
    ) {
      id partner_id flow_id contact_phone current_node_id variables step_count version phone_number_id resume_at expires_at
    }
  }
`;
const Q_PARTNER_INFO = `
  query PartnerInfo($id: uuid!) {
    partners_by_pk(id: $id) { store_name username currency country_code custom_domain delivery_rules timezone }
  }
`;
// The customer's most recent order at this partner, matched by PHONE (not user
// id) so we don't need to resolve/create the account on the reply path. Drives
// whether the welcome flow offers "Reorder" (non-empty link) AND the reorder
// payload encoded into the link, so the storefront pre-fills cart + address.
const Q_LAST_ORDER_BY_PHONE = `
  query LastOrderByPhone($phones: [String!], $partner_id: uuid!) {
    orders(
      where: {
        partner_id: { _eq: $partner_id }
        status: { _nin: ["cancelled", "expired"] }
        _or: [
          { phone: { _in: $phones } }
          { user: { phone: { _in: $phones } } }
        ]
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      type
      total_price
      delivery_address
      delivery_location
      order_items { menu_id quantity item }
    }
  }
`;

// Phone forms an order may have been stored under, derived from the WhatsApp
// sender number WITHOUT a partner-country lookup (so this can ride the same
// parallel read wave). Covers the raw international form and the India local
// form; a miss just means no Reorder offer (graceful), never a wrong match.
function phoneMatchVariants(waPhone: string): string[] {
  const digits = String(waPhone || "").replace(/\D/g, "");
  const set = new Set<string>();
  if (digits) {
    set.add(digits);
    set.add(`+${digits}`);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    set.add(local);
    set.add(`+91${local}`);
  }
  return [...set];
}

// Same money formatting the order-status flows use (whole numbers stay whole).
function fmtMoney(n: number): string {
  if (!isFinite(n)) return "0";
  return String(Math.round(n * 100) / 100);
}

// Variant name is encoded in the line item's composite id ("<menuId>|<Variant>"),
// since order_items has no separate variant column.
function variantNameFromItem(it: any): string | null {
  const composite = String(it?.item?.id || "");
  const idx = composite.indexOf("|");
  return idx >= 0 ? composite.slice(idx + 1) || null : null;
}

// Compact, base64url-encoded snapshot of an order for the reorder link.
// Shape: { i: [[menu_id, qty, variantName|null], ...], t: type, a: address, c: [lng,lat] }
function encodeReorderPayload(order: any): string | null {
  try {
    const items = (order?.order_items || [])
      .map((it: any) => [
        it.menu_id || String(it?.item?.id || "").split("|")[0],
        it.quantity,
        variantNameFromItem(it),
      ])
      .filter((x: any[]) => x[0]);
    if (!items.length) return null;
    const payload = {
      i: items,
      t: order.type || null,
      a: order.delivery_address || null,
      c: order.delivery_location?.coordinates || null,
    };
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
  } catch {
    return null;
  }
}
const M_EVENT = `
  mutation Event($o: whatsapp_flow_events_insert_input!) {
    insert_whatsapp_flow_events_one(object: $o) { id }
  }
`;
const M_INSERT_RUN = `
  mutation InsertRun($o: whatsapp_flow_execution_state_insert_input!) {
    insert_whatsapp_flow_execution_state_one(object: $o) { id }
  }
`;
const M_CAS_RUN = `
  mutation CasRun($id: uuid!, $v: Int!, $wa: String!, $set: whatsapp_flow_execution_state_set_input!) {
    update_whatsapp_flow_execution_state(
      where: {id: {_eq: $id}, version: {_eq: $v}, last_inbound_wa_id: {_neq: $wa}}
      _set: $set
      _inc: {version: 1}
    ) { affected_rows }
  }
`;
const M_EXPIRE_RUN = `
  mutation Expire($id: uuid!) {
    update_whatsapp_flow_execution_state_by_pk(pk_columns: {id: $id}, _set: {status: "expired"}) { id }
  }
`;
const M_ABORT_RUN = `
  mutation Abort($id: uuid!) {
    update_whatsapp_flow_execution_state_by_pk(pk_columns: {id: $id}, _set: {status: "aborted", current_node_id: null}) { id }
  }
`;
const M_OUTBOX = `
  mutation Outbox($o: whatsapp_messages_insert_input!) {
    insert_whatsapp_messages_one(object: $o) { id }
  }
`;

// ─── Flow opt-out (END-node "stop" button) ───────────────────────
// A flow's END node can carry a one-tap opt-out button. Tapping it records a
// per-(flow, contact) suppression so that flow won't START again for that
// customer until it expires. Stored in whatsapp_flow_suppressions.
const STOP_FLOW_BUTTON_ID = "__flow_stop__";
const DEFAULT_SUPPRESS_HOURS = 24;
// Far-future timestamp = "forever" (the suppression query is expires_at > now()).
const FOREVER_EXPIRES_AT = "9999-12-31T23:59:59Z";
const Q_SUPPRESSED_FLOWS = `
  query SuppressedFlows($p: uuid!, $c: String!, $now: timestamptz!) {
    whatsapp_flow_suppressions(where: {partner_id: {_eq: $p}, contact_phone: {_eq: $c}, expires_at: {_gt: $now}}) {
      flow_id
    }
  }
`;
const M_SUPPRESS_FLOW = `
  mutation SuppressFlow($o: whatsapp_flow_suppressions_insert_input!) {
    insert_whatsapp_flow_suppressions_one(
      object: $o,
      on_conflict: {constraint: whatsapp_flow_suppressions_unique, update_columns: [expires_at, reason]}
    ) { id }
  }
`;

// Flow ids this contact has opted out of (still inside the suppression window).
async function getSuppressedFlowIds(
  partnerId: string,
  contactPhone: string,
): Promise<Set<string>> {
  try {
    const res = await fetchFromHasura(Q_SUPPRESSED_FLOWS, {
      p: partnerId,
      c: contactPhone,
      now: new Date().toISOString(),
    });
    return new Set(
      (res?.whatsapp_flow_suppressions || []).map((r: any) => r.flow_id as string),
    );
  } catch (e) {
    console.error("getSuppressedFlowIds failed:", e);
    return new Set();
  }
}

// Most recent run start time (ms) per flow this contact has run — drives the
// frequency options below.
async function getLastFlowRunAt(
  partnerId: string,
  contactPhone: string,
): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  try {
    const res = await fetchFromHasura(Q_LAST_FLOW_RUNS, { p: partnerId, c: contactPhone });
    for (const r of res?.whatsapp_flow_execution_state || []) {
      if (r?.flow_id && r?.started_at) {
        m.set(r.flow_id as string, new Date(r.started_at).getTime());
      }
    }
  } catch (e) {
    console.error("getLastFlowRunAt failed:", e);
  }
  return m;
}

// Should this flow be blocked from STARTING for this contact, given when it last
// ran? once_per_user => blocked forever after one run; cooldown_hours > 0 =>
// blocked until that many hours pass since the last run; otherwise runs always.
function flowBlockedFor(
  flow: { id: string; once_per_user?: boolean; cooldown_hours?: number },
  lastRunByFlow: Map<string, number>,
): boolean {
  const last = lastRunByFlow.get(flow.id);
  if (last === undefined) return false; // never run → allowed
  if (flow.once_per_user) return true; // ran once → never again
  const cd = Number(flow.cooldown_hours) || 0;
  if (cd > 0) return Date.now() - last < cd * 3600 * 1000;
  return false; // every time
}

// Record that `contactPhone` opted out of `flowId`. `hours` <= 0 means forever.
async function suppressFlow(
  partnerId: string,
  flowId: string,
  contactPhone: string,
  hours: number,
): Promise<void> {
  try {
    const expires_at =
      hours > 0
        ? new Date(Date.now() + hours * 3600 * 1000).toISOString()
        : FOREVER_EXPIRES_AT;
    await fetchFromHasura(M_SUPPRESS_FLOW, {
      o: {
        partner_id: partnerId,
        flow_id: flowId,
        contact_phone: contactPhone,
        reason: "user_opt_out",
        expires_at,
      },
    });
  } catch (e) {
    console.error("suppressFlow failed:", e);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────
function interpolate(text: string, vars: Record<string, unknown>): string {
  return String(text ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? "" : String(v);
  });
}

function nodeById(graph: FlowGraph, id: string | null): FlowNode | undefined {
  if (!id) return undefined;
  return (graph.nodes || []).find((n) => n.id === id);
}

function firstEdgeTarget(graph: FlowGraph, nodeId: string, handle?: string): string | null {
  const edges = (graph.edges || []).filter(
    (e) => e.source === nodeId && (handle === undefined || (e.sourceHandle ?? null) === handle),
  );
  return edges[0]?.target ?? null;
}

function triggerMatches(
  t: TriggerDef,
  normalized: string,
  firstContact: boolean,
  type?: string,
): boolean {
  switch (t.matchType) {
    case "exact":
      return (t.keywords || []).includes(normalized);
    case "contains":
      return (t.keywords || []).some((k) => normalized.includes(k));
    case "welcome":
      return firstContact;
    case "any":
      // Any inbound message: non-empty text, OR a non-text message (image,
      // video, audio, document, location, …) that may carry no caption.
      return normalized.length > 0 || (!!type && type !== "text");
    case "default":
      return true;
    default:
      return false;
  }
}

function validateCapture(reply: string, validation?: CaptureValidation): boolean {
  const v = (reply ?? "").trim();
  if (!v) return false;
  if (validation === "number") return /^-?\d+(\.\d+)?$/.test(v);
  if (validation === "email") return EMAIL_RE.test(v);
  return true;
}

function evaluateCondition(node: FlowNode, vars: Record<string, unknown>, lastReply: string): string {
  const data = (node.data || {}) as any;
  const rules: ConditionRule[] = data.rules || [];
  const fallback = data.defaultHandle || "else";
  for (const r of rules) {
    const raw = r.var ? vars[r.var] : lastReply;
    const sv = raw == null ? "" : String(raw);
    const target = String(r.value ?? "");
    let hit = false;
    switch (r.op) {
      case "equals":
        hit = sv.trim().toLowerCase() === target.trim().toLowerCase();
        break;
      case "contains":
        hit = sv.toLowerCase().includes(target.toLowerCase());
        break;
      case "isEmpty":
        hit = sv.trim() === "";
        break;
      case "gt":
        hit = parseFloat(sv) > parseFloat(target);
        break;
      case "lt":
        hit = parseFloat(sv) < parseFloat(target);
        break;
    }
    if (hit) return r.handle;
  }
  return fallback;
}

function matchButtonChoice(items: ButtonItem[], input: FlowInput): ButtonItem | null {
  if (input.replyId) {
    const m = items.find((it) => it.id === input.replyId);
    if (m) return m;
  }
  const norm = input.normalized;
  if (/^\d+$/.test(norm)) {
    const idx = parseInt(norm, 10) - 1;
    if (idx >= 0 && idx < items.length) return items[idx];
  }
  for (const it of items) {
    const lbl = (it.label || "").trim().toLowerCase();
    if (lbl && (norm === lbl || norm.includes(lbl))) return it;
    if (it.value && norm === String(it.value).toLowerCase()) return it;
  }
  return null;
}

// Walk the graph from `startId`, collecting outbound messages, until we PARK
// (wait_for_reply / buttons), END, or run out of nodes. Mutates `state`.
// Returns the parked node id, or null when the run completes.
function executeForward(
  graph: FlowGraph,
  startId: string | null,
  state: RunState,
  outbound: Outbound[],
): { parkedNodeId: string | null; completed: boolean; sleepMs?: number } {
  let nodeId = startId;
  let lastReply = String((state.variables.__lastReply as string) ?? "");

  while (nodeId) {
    if (++state.stepCount > MAX_STEPS) return { parkedNodeId: null, completed: true };
    if (outbound.length >= MAX_SENDS_PER_TURN) return { parkedNodeId: nodeId, completed: false };

    const node = nodeById(graph, nodeId);
    if (!node) return { parkedNodeId: null, completed: true };
    const data = (node.data || {}) as any;

    switch (node.type) {
      case "trigger":
        nodeId = firstEdgeTarget(graph, node.id);
        break;
      case "send_text":
        outbound.push({ kind: "text", text: interpolate(data.text || "", state.variables) });
        nodeId = firstEdgeTarget(graph, node.id);
        break;
      case "send_image":
        outbound.push({
          kind: "image",
          mediaUrl: data.mediaUrl || "",
          caption: interpolate(data.caption || "", state.variables),
        });
        nodeId = firstEdgeTarget(graph, node.id);
        break;
      case "send_video":
        outbound.push({
          kind: "video",
          mediaUrl: data.mediaUrl || "",
          caption: interpolate(data.caption || "", state.variables),
        });
        nodeId = firstEdgeTarget(graph, node.id);
        break;
      case "send_audio":
        outbound.push({ kind: "audio", mediaUrl: data.mediaUrl || "" });
        nodeId = firstEdgeTarget(graph, node.id);
        break;
      case "send_document":
        outbound.push({
          kind: "document",
          mediaUrl: data.mediaUrl || "",
          filename: data.filename || undefined,
          caption: interpolate(data.caption || "", state.variables),
        });
        nodeId = firstEdgeTarget(graph, node.id);
        break;
      case "set_variable":
        if (data.name) state.variables[data.name] = interpolate(data.value || "", state.variables);
        nodeId = firstEdgeTarget(graph, node.id);
        break;
      case "delay": {
        // Park the run to sleep for `seconds` (0..24h), then resume at the node
        // AFTER the delay. Messages collected so far are dispatched by the
        // caller before the run sleeps; the cron (resume-flow-delays) wakes it.
        // A zero delay, or a delay with nothing after it, is a plain no-op.
        const secs = Math.max(
          0,
          Math.min(MAX_DELAY_SECONDS, Math.floor(Number(data.seconds) || 0)),
        );
        const next = firstEdgeTarget(graph, node.id);
        if (secs > 0 && next) {
          return { parkedNodeId: next, completed: false, sleepMs: secs * 1000 };
        }
        nodeId = next;
        break;
      }
      case "condition": {
        const handle = evaluateCondition(node, state.variables, lastReply);
        nodeId = firstEdgeTarget(graph, node.id, handle);
        break;
      }
      case "jump":
        nodeId = data.targetNodeId || null;
        break;
      case "link_button": {
        const ctaUrl = interpolate(data.url || "", state.variables);
        // Opt-in: a node flagged skipIfUrlEmpty with a blank/non-http URL is
        // dropped entirely (e.g. the welcome "Reorder" link for a customer with
        // no past order) instead of degrading to a plain-text bubble.
        const skip =
          data.skipIfUrlEmpty && !/^https?:\/\//i.test(ctaUrl.trim());
        if (!skip) {
          outbound.push({
            kind: "cta",
            text: interpolate(data.text || "", state.variables),
            buttonText: data.buttonText || "Open",
            url: ctaUrl,
          });
        }
        nodeId = firstEdgeTarget(graph, node.id);
        break;
      }
      case "buttons":
        outbound.push({
          kind: "buttons",
          text: interpolate(data.text || "", state.variables),
          items: (data.items as ButtonItem[]) || [],
        });
        return { parkedNodeId: node.id, completed: false }; // park awaiting choice
      case "wait_for_reply":
        return { parkedNodeId: node.id, completed: false }; // park awaiting reply
      case "end": {
        const endMsg = interpolate(data.message || "", state.variables);
        const stopBtn = String(data.buttonText || "").trim();
        if (stopBtn) {
          // One-tap opt-out button. WhatsApp interactive button messages REQUIRE
          // body text, so fall back to a default prompt when the author left the
          // end message blank (otherwise the button can't be sent). PARK so the
          // tap can be captured (resumeRun records the 24h suppression).
          const body =
            endMsg || "Tap below if you'd prefer not to receive these messages.";
          outbound.push({
            kind: "buttons",
            text: body,
            items: [{ id: STOP_FLOW_BUTTON_ID, label: stopBtn.slice(0, 20) }],
          });
          return { parkedNodeId: node.id, completed: false };
        }
        if (endMsg) outbound.push({ kind: "text", text: endMsg });
        return { parkedNodeId: null, completed: true };
      }
      default:
        nodeId = firstEdgeTarget(graph, node.id);
    }
  }
  return { parkedNodeId: null, completed: true };
}

// Persistence fields for a run's post-turn state. When the walk parked on a
// delay (`sleepMs`), the row sleeps: resume_at holds the wake time and the TTL
// is pushed out so it always outlives the delay. Otherwise resume_at is cleared
// (awaiting reply / completed) and the TTL is the normal run window.
function sleepFields(
  sleepMs: number | undefined,
  ttlMs: number,
): { resume_at: string | null; expires_at: string } {
  const now = Date.now();
  if (sleepMs && sleepMs > 0) {
    const resumeAt = now + sleepMs;
    return {
      resume_at: new Date(resumeAt).toISOString(),
      expires_at: new Date(
        Math.max(now + ttlMs, resumeAt + POST_DELAY_BUFFER_MS),
      ).toISOString(),
    };
  }
  return { resume_at: null, expires_at: new Date(now + ttlMs).toISOString() };
}

// ─── Sending (native interactive) ────────────────────────────────
async function graphSend(phoneNumberId: string, payload: Record<string, unknown>, token: string) {
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) console.error("Flow send failed:", res.status, JSON.stringify(data?.error || data));
  return { ok: res.ok, id: data?.messages?.[0]?.id as string | undefined };
}

function buildPayload(to: string, o: Outbound): { payload: Record<string, unknown>; type: string; body: string } {
  switch (o.kind) {
    case "buttons": {
      const items = (o.items || []).slice(0, 3);
      return {
        type: "interactive",
        body: o.text || "",
        payload: {
          to,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: o.text || " " },
            action: {
              buttons: items.map((it) => ({
                type: "reply",
                reply: { id: it.id, title: (it.label || "Option").slice(0, 20) },
              })),
            },
          },
        },
      };
    }
    case "image":
      return {
        type: "image",
        body: o.caption || "",
        payload: { to, type: "image", image: { link: o.mediaUrl, caption: o.caption || undefined } },
      };
    case "video":
      return {
        type: "video",
        body: o.caption || "",
        payload: { to, type: "video", video: { link: o.mediaUrl, caption: o.caption || undefined } },
      };
    case "audio":
      return {
        type: "audio",
        body: "",
        payload: { to, type: "audio", audio: { link: o.mediaUrl } },
      };
    case "cta": {
      const url = (o.url || "").trim();
      // No valid URL → degrade to a plain text message so the caption still sends
      // (text body allows 4096 chars; the button is just dropped).
      if (!/^https?:\/\//i.test(url)) {
        const t = (o.text || " ").slice(0, 4096);
        return { type: "text", body: t, payload: { to, type: "text", text: { body: t } } };
      }
      // Interactive body is capped at 1024 chars by WhatsApp — clamp so a long
      // caption (e.g. a big order bill) never fails the send. Full detail is on
      // the linked page the button opens.
      const body = (o.text || " ").slice(0, 1024);
      return {
        type: "interactive",
        body,
        payload: {
          to,
          type: "interactive",
          interactive: {
            type: "cta_url",
            body: { text: body },
            action: {
              name: "cta_url",
              parameters: { display_text: (o.buttonText || "Open").slice(0, 20), url },
            },
          },
        },
      };
    }
    case "document":
      return {
        type: "document",
        body: o.caption || o.filename || "",
        payload: {
          to,
          type: "document",
          document: { link: o.mediaUrl, filename: o.filename || undefined, caption: o.caption || undefined },
        },
      };
    case "text":
    default:
      return { type: "text", body: o.text || "", payload: { to, type: "text", text: { body: o.text || " " } } };
  }
}

// Coexistence Tech Provider model: flows send from the PARTNER's own number, so
// they must authenticate with the partner's per-customer Embedded Signup token
// (the only token with a role on their WABA). Falls back to our system-user
// token for WABAs inside our own business (demo/test).
async function getPartnerSendToken(
  partnerId: string,
  phoneNumberId?: string,
): Promise<string> {
  try {
    // Prefer the token bound to the EXACT number we're sending from — a partner
    // may have several numbers, and each number's Coexistence token is the only
    // one with a role on that number's WABA. Falls back to the partner's primary
    // number, then our system-user token.
    if (phoneNumberId) {
      const byNumber = await fetchFromHasura(
        `query WaSendTokenByPnid($pn: String!) {
          whatsapp_business_integrations(where: { phone_number_id: { _eq: $pn } }, limit: 1) { access_token }
        }`,
        { pn: phoneNumberId },
      );
      const tok = byNumber?.whatsapp_business_integrations?.[0]?.access_token;
      if (tok) return tok;
    }
    const res = await fetchFromHasura(
      `query WaSendToken($p: uuid!) {
        whatsapp_business_integrations(where: { partner_id: { _eq: $p } }, order_by: {is_primary: desc, updated_at: asc}, limit: 1) { access_token }
      }`,
      { p: partnerId },
    );
    return (
      res?.whatsapp_business_integrations?.[0]?.access_token ||
      process.env.WHATSAPP_ACCESS_TOKEN!
    );
  } catch {
    return process.env.WHATSAPP_ACCESS_TOKEN!;
  }
}

async function dispatch(
  partnerId: string,
  phoneNumberId: string,
  to: string,
  outbound: Outbound[],
  prefetchedToken?: string,
): Promise<void> {
  if (!outbound.length) return;
  const token =
    prefetchedToken || (await getPartnerSendToken(partnerId, phoneNumberId));
  for (const o of outbound) {
    const { payload, type, body } = buildPayload(to, o);
    const sent = await graphSend(phoneNumberId, payload, token);
    // Persist to the inbox so flow replies show in the Inbox tab.
    fetchFromHasura(M_OUTBOX, {
      o: {
        partner_id: partnerId,
        direction: "out",
        contact_phone: to,
        type,
        body,
        wa_message_id: sent.id || null,
        status: sent.ok ? "sent" : "failed",
      },
    }).catch(() => {});
  }
}

// ─── Orchestrator ────────────────────────────────────────────────
export async function runFlowForInbound(args: {
  partnerId: string;
  phoneNumberId: string;
  contactPhone: string;
  waMessageId: string;
  input: FlowInput;
  contactName?: string | null;
  // The partner's WhatsApp access token, already fetched by the webhook's
  // phone-number→partner lookup. Threaded through so the welcome path doesn't
  // re-query it. Falls back to a fresh lookup / env token when absent.
  sendToken?: string;
  // When true, send a read receipt + typing indicator IF this inbound triggers
  // the welcome flow. Gated upstream by whatsappOrdering + whatsappFlowTyping.
  flowTyping?: boolean;
}): Promise<void> {
  const { partnerId, phoneNumberId, contactPhone, waMessageId, input, contactName = null, sendToken, flowTyping = false } = args;

  // Layer 1 — idempotency: claim this Meta message id. A retry (or a second
  // instance handed the same delivery) throws on the partial-unique index and
  // we drop it. This is the primary double-advance guard. Run it in parallel
  // with the active-run lookup — they're independent, so one round-trip; if the
  // claim turns out to be a duplicate we bail before doing any work.
  const eventP = fetchFromHasura(M_EVENT, {
    o: { partner_id: partnerId, contact_phone: contactPhone, wa_message_id: waMessageId, input },
  })
    .then(() => false)
    .catch((e: any) => {
      if (/unique|duplicate/i.test(String(e?.message || e))) return true; // already processed
      console.error("Flow idempotency insert failed:", e);
      return false; // fall through — better to attempt processing than to drop a real message
    });
  const activeP = fetchFromHasura(Q_ACTIVE_RUN, { p: partnerId, c: contactPhone }).catch(
    () => null,
  );
  // Optimistically start the new-run read wave NOW, in parallel with the
  // active-run check — an inbound "hi" is almost always a fresh order, so this
  // collapses two sequential round-trips into one. On the rare resume the wave
  // is simply discarded (cheap reads). Pre-attach a no-op catch so a failure
  // here can't surface as an unhandled rejection when we don't await it.
  const waveP = runStartRunWave(partnerId, contactPhone, sendToken);
  waveP.catch(() => {});

  const [isDuplicate, activeRes] = await Promise.all([eventP, activeP]);
  if (isDuplicate) return;
  const active = activeRes?.whatsapp_flow_execution_state?.[0];

  if (active) {
    if (active.expires_at && new Date(active.expires_at).getTime() < Date.now()) {
      await fetchFromHasura(M_EXPIRE_RUN, { id: active.id }).catch(() => {});
    } else if (await matchesSpecificTrigger(partnerId, contactPhone, input.normalized)) {
      // A specific keyword trigger (exact/contains) restarts its flow even
      // mid-run, so re-sending the trigger word replays the WHOLE flow instead
      // of being treated as a reply to the parked step. (Generic any/welcome
      // triggers don't do this, so button choices / captures still work.)
      // A fresh wave is taken inside startNewRun so the counts reflect the run
      // we're about to abort; the optimistic waveP is dropped.
      await abortRun(active.id);
      await startNewRun(partnerId, phoneNumberId, contactPhone, waMessageId, input, contactName, sendToken, undefined, flowTyping);
      return;
    } else {
      await resumeRun(partnerId, phoneNumberId, contactPhone, waMessageId, input, active);
      return;
    }
  }

  // Common path: no active run → reuse the wave already in flight.
  await startNewRun(
    partnerId,
    phoneNumberId,
    contactPhone,
    waMessageId,
    input,
    contactName,
    sendToken,
    waveP,
    flowTyping,
  );
}

// True if the inbound matches a SPECIFIC (exact/contains) keyword trigger of an
// enabled flow — used to decide whether to restart a flow mid-run.
async function matchesSpecificTrigger(
  partnerId: string,
  contactPhone: string,
  normalized: string,
): Promise<boolean> {
  const res = await fetchFromHasura(Q_ENABLED_FLOWS, { p: partnerId });
  const flows = (res?.whatsapp_flows || []) as Array<{
    id: string;
    triggers: TriggerDef[];
    once_per_user: boolean;
    cooldown_hours: number;
  }>;
  const suppressed = await getSuppressedFlowIds(partnerId, contactPhone);
  const lastRunByFlow = await getLastFlowRunAt(partnerId, contactPhone);
  return flows.some(
    (f) =>
      !suppressed.has(f.id) &&
      !flowBlockedFor(f, lastRunByFlow) &&
      (f.triggers || []).some(
        (t) =>
          (t.matchType === "exact" || t.matchType === "contains") &&
          triggerMatches(t, normalized, false),
      ),
  );
}

async function abortRun(id: string): Promise<void> {
  await fetchFromHasura(M_ABORT_RUN, { id }).catch(() => {});
}

interface PartnerInfo {
  store_name?: string | null;
  username?: string | null;
  currency?: string | null;
  country_code?: string | null;
  custom_domain?: string | null;
  delivery_rules?: any;
  timezone?: string | null;
}

// System variables available to every message-triggered run. Pure (no DB): the
// partner row and last order are prefetched in startNewRun's parallel wave, and
// the auto-login link is an ENCRYPTED PHONE token, so the customer's account is
// resolved/created only when they tap — nothing on the reply path waits on it.
function buildMessageRunVars(
  partnerId: string,
  localPhone: string,
  partner: PartnerInfo | null,
  lastOrder: any | null,
): Record<string, unknown> {
  if (!partner) return {};
  const p = partner;
  const cur = p.currency ?? "₹";
  const username = p.username || "";

  // Offer a "Reorder" link only when this customer has a previous order here.
  // We encode that order into the link so the storefront pre-fills the cart +
  // address without a query. reorder_link is empty for first-time customers,
  // so the welcome condition hides the Reorder button for them.
  const reorderPayload = lastOrder ? encodeReorderPayload(lastOrder) : null;

  // Itemised summary of the last order for the Reorder message ({{reorder_items}})
  // and its grand total ({{reorder_total}}). Same line format the order-status
  // flows use: "1. Name × qty — ₹line". Empty when there's no prior order.
  let reorderItems = "";
  let reorderTotal = "";
  if (lastOrder) {
    reorderItems = (lastOrder.order_items || [])
      .map((oi: any, i: number) => {
        const it = oi.item || {};
        const name = it.name || "Item";
        const qty = Number(oi.quantity) || 0;
        const line = Number(it.price ?? 0) * qty;
        return `${i + 1}. ${name} × ${qty} — ${cur}${fmtMoney(line)}`;
      })
      .join("\n");
    const total = Number(lastOrder.total_price) || 0;
    if (total > 0) reorderTotal = `${cur}${fmtMoney(total)}`;
  }

  // Order-type availability RIGHT NOW (purely time-window based, in the partner's
  // timezone). These are raw DATA variables only — the greeting TEXT lives in the
  // flow's own send_text nodes (editable per partner in the builder), so messages
  // aren't hardcoded here. A condition node branches on {{delivery_available_now}}
  // / {{can_order_now}}; the message uses {{delivery_hours}} / {{takeaway_hours}}.
  const dr =
    typeof p.delivery_rules === "string"
      ? (() => {
          try {
            return JSON.parse(p.delivery_rules as string);
          } catch {
            return {};
          }
        })()
      : (p.delivery_rules as any) || {};
  const tz = p.timezone || "Asia/Kolkata";
  const fmtRange = (w: any) =>
    w?.from && w?.to ? `${formatTime12h(w.from)} to ${formatTime12h(w.to)}` : "";
  const deliveryNow = isWithinTimeWindow(dr?.delivery_time_allowed, tz);
  const takeawayNow = isWithinTimeWindow(dr?.takeaway_time_allowed, tz);
  const deliveryHours = fmtRange(dr?.delivery_time_allowed);
  const takeawayHours = fmtRange(dr?.takeaway_time_allowed);

  return {
    delivery_available_now: deliveryNow ? "true" : "false",
    takeaway_available_now: takeawayNow ? "true" : "false",
    // "true" if at least one order type (delivery OR takeaway) is open right now.
    can_order_now: deliveryNow || takeawayNow ? "true" : "false",
    delivery_hours: deliveryHours,
    takeaway_hours: takeawayHours,
    store_name: p.store_name || "",
    username,
    currency: cur,
    order_link: username
      ? buildOrderLink(username, partnerId, {
          phone: localPhone || null,
          customDomain: p.custom_domain,
        })
      : "",
    reorder_link:
      username && localPhone && reorderPayload
        ? buildOrderLink(username, partnerId, {
            phone: localPhone,
            customDomain: p.custom_domain,
            reorderPayload,
          })
        : "",
    reorder_items: reorderItems,
    reorder_total: reorderTotal,
  };
}

interface StartRunWave {
  flowsRes: any;
  runCountRes: any;
  suppressed: Set<string>;
  lastRunByFlow: Map<string, number>;
  partnerRes: any;
  sendToken: string;
  lastOrderRes: any;
}

// One parallel wave of every read a fresh run needs — none depend on each other,
// so they resolve in a single round-trip instead of ~6 stacked ones. Split out
// so runFlowForInbound can fire it OPTIMISTICALLY, in parallel with the
// active-run check: an inbound "hi" is virtually always a new run, so we don't
// wait to confirm there's no active run before doing this work. On the rare
// resume the result is simply discarded.
// (Q_RUN_COUNT is always fetched, even if no welcome trigger ends up using it;
// an over-fetch is cheaper than a serialised round-trip to find out.)
function runStartRunWave(
  partnerId: string,
  contactPhone: string,
  prefetchedToken?: string,
): Promise<StartRunWave> {
  const phoneVariants = phoneMatchVariants(contactPhone);
  return Promise.all([
    fetchFromHasura(Q_ENABLED_FLOWS, { p: partnerId }),
    fetchFromHasura(Q_RUN_COUNT, { p: partnerId, c: contactPhone }),
    getSuppressedFlowIds(partnerId, contactPhone),
    getLastFlowRunAt(partnerId, contactPhone),
    fetchFromHasura(Q_PARTNER_INFO, { id: partnerId }).catch(() => null),
    // Reuse the token the webhook already fetched; only hit the DB if it
    // wasn't passed (e.g. the keyword-restart path or a missing integration).
    prefetchedToken ? Promise.resolve(prefetchedToken) : getPartnerSendToken(partnerId),
    phoneVariants.length
      ? fetchFromHasura(Q_LAST_ORDER_BY_PHONE, {
          phones: phoneVariants,
          partner_id: partnerId,
        }).catch(() => null)
      : Promise.resolve(null),
  ]).then(
    ([flowsRes, runCountRes, suppressed, lastRunByFlow, partnerRes, sendToken, lastOrderRes]) => ({
      flowsRes,
      runCountRes,
      suppressed,
      lastRunByFlow,
      partnerRes,
      sendToken,
      lastOrderRes,
    }),
  );
}

// Read receipt + typing indicator for the welcome flow. Meta's Cloud API couples
// them into a single call (status:"read" carrying a typing_indicator), so this
// both blue-ticks the welcome-triggering message and shows "typing…" until the
// reply lands. Best-effort — never throws into the reply path; returns whether
// the call actually reached Meta so the caller can skip the typing pause when it
// didn't. A short timeout keeps a slow/hung Meta call from stalling the reply.
async function sendWelcomeReadTyping(
  phoneNumberId: string,
  messageId: string,
  token: string,
): Promise<boolean> {
  if (!phoneNumberId || !messageId || !token) return false;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
          typing_indicator: { type: "text" },
        }),
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) {
      console.error(
        "Welcome read/typing failed:",
        await res.text().catch(() => ""),
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error("Welcome read/typing error:", e);
    return false;
  }
}

async function startNewRun(
  partnerId: string,
  phoneNumberId: string,
  contactPhone: string,
  waMessageId: string,
  input: FlowInput,
  contactName: string | null = null,
  prefetchedToken?: string,
  // An already-in-flight read wave (fired in parallel with the active-run
  // check). When absent we start a fresh one — used by the keyword-restart path,
  // where the counts must reflect the just-aborted run.
  prefetchedWave?: Promise<StartRunWave>,
  // Send read receipt + typing indicator if (and only if) the matched flow is the
  // welcome flow. Gated upstream by whatsappOrdering + whatsappFlowTyping.
  flowTyping = false,
) {
  const { flowsRes, runCountRes, suppressed, lastRunByFlow, partnerRes, sendToken, lastOrderRes } =
    await (prefetchedWave ?? runStartRunWave(partnerId, contactPhone, prefetchedToken));

  const flows = (flowsRes?.whatsapp_flows || []) as Array<{
    id: string;
    graph: FlowGraph;
    triggers: TriggerDef[];
    escape_keyword: string | null;
    run_ttl_hours: number;
    once_per_user: boolean;
    cooldown_hours: number;
  }>;
  if (!flows.length) return;

  const hasWelcomeTrigger = flows.some((f) =>
    (f.triggers || []).some((t) => t.matchType === "welcome"),
  );
  const firstContact =
    hasWelcomeTrigger &&
    (runCountRes?.whatsapp_flow_execution_state_aggregate?.aggregate?.count ?? 0) === 0;

  // Skip flows the customer opted out of (END-node "stop" button, time-bound) and
  // flows blocked by their run-frequency setting (once-per-customer / cooldown).
  const candidates = flows
    .flatMap((f) => (f.triggers || []).map((t) => ({ flow: f, t })))
    .sort((a, b) => a.t.priority - b.t.priority);
  const matchedCand = candidates.find(
    (c) =>
      !suppressed.has(c.flow.id) &&
      !flowBlockedFor(c.flow, lastRunByFlow) &&
      triggerMatches(c.t, input.normalized, firstContact, input.type),
  );
  if (!matchedCand) return;
  const matched = matchedCand.flow;

  // Welcome-only read receipt + typing. We're here only because the welcome flow
  // passed every gate (enabled, not suppressed, not blocked by once-per-customer
  // /cooldown, and the trigger matched on first contact) — so firing it here
  // inherits all those rules. Sent BEFORE the reply and AWAITED, on purpose:
  //   • awaiting means a serverless freeze after the webhook responds can't drop
  //     the call before it reaches Meta (the old fire-and-forget could vanish, so
  //     no blue tick ever showed), and
  //   • Meta dismisses the typing indicator the moment a message is sent, so
  //     firing it concurrently with the reply made "typing…" invisible.
  // We mark read + start typing, hold a short beat so the animation is actually
  // seen, then fall through to send the reply (which clears the typing).
  if (flowTyping && matchedCand.t.matchType === "welcome" && sendToken) {
    const shown = await sendWelcomeReadTyping(phoneNumberId, waMessageId, sendToken);
    if (shown) await sleep(WELCOME_TYPING_MS);
  }

  const graph = matched.graph || { nodes: [], edges: [] };
  // Start from the MATCHED trigger node's branch — a flow can have multiple
  // trigger nodes (entry points), each starting its own branch.
  const startNodeId =
    matchedCand.t.nodeId ||
    (graph.nodes || []).find((n) => n.type === "trigger")?.id ||
    null;
  const startId = startNodeId ? firstEdgeTarget(graph, startNodeId) : null;

  // Inject system variables (store name, a fresh 10-min auto-login order link,
  // etc.) so welcome/menu flows can use {{order_link}}, {{store_name}}, etc.
  // The link carries an encrypted phone, so no account lookup/creation here.
  const partner = (partnerRes?.partners_by_pk as PartnerInfo | null) || null;
  const localPhone = toLocalPhone(contactPhone, partner?.country_code);
  const lastOrder = lastOrderRes?.orders?.[0] || null;
  const sysVars = buildMessageRunVars(partnerId, localPhone, partner, lastOrder);
  const state: RunState = { flowId: matched.id, variables: sysVars, stepCount: 0, version: 0 };
  const outbound: Outbound[] = [];
  const { parkedNodeId, completed, sleepMs } = executeForward(graph, startId, state, outbound);

  // Send the reply FIRST — reuse the token prefetched in the wave so this never
  // re-queries. Persisting the run state is moved AFTER the send so it's off the
  // customer's critical path: a welcome that completes in one turn doesn't need
  // the row before replying, and a parked flow's row still lands well before the
  // customer can type their next message (a network round-trip away).
  await dispatch(partnerId, phoneNumberId, contactPhone, outbound, sendToken);

  const ttlMs = (matched.run_ttl_hours || 24) * 3600 * 1000;
  const sf = sleepFields(sleepMs, ttlMs);
  // Insert the run with its post-turn state. The partial-unique active index is
  // the concurrency guard: if another instance already created an active run
  // for this contact, this insert throws and we drop (rare first-message race).
  try {
    await fetchFromHasura(M_INSERT_RUN, {
      o: {
        partner_id: partnerId,
        flow_id: matched.id,
        contact_phone: contactPhone,
        phone_number_id: phoneNumberId,
        current_node_id: parkedNodeId,
        status: completed ? "completed" : "active",
        variables: state.variables,
        step_count: state.stepCount,
        version: 1,
        last_inbound_wa_id: waMessageId,
        last_interaction_at: new Date().toISOString(),
        resume_at: sf.resume_at,
        expires_at: sf.expires_at,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    // Duplicate = lost the active-run race; the other run owns the conversation.
    if (!/unique|duplicate/i.test(String(e?.message || e))) {
      console.error("Flow insert run failed:", e);
    }
  }

  // AFTER the customer already has the message, make sure the silent account
  // exists — so a customer who never taps the link still lands in the partner's
  // CRM, exactly like before. The tap path also find-or-creates (idempotent by
  // phone/email), so this is a head start, not a dependency. Kept inside the
  // awaited request (not fire-and-forget) so it can't be dropped on a serverless
  // freeze, but it runs post-reply so it never delays the message.
  if (localPhone) {
    await findOrCreateUserByPhone(localPhone, contactName).catch(() => {});
  }
}

// ─── Order-triggered flows ───────────────────────────────────────
// Fired (from the order-event webhook) when an order's status changes. Runs
// every enabled flow whose order trigger matches `status`, starting from that
// trigger's branch, with the order context injected as variables.
export async function runOrderTriggeredFlows(args: {
  partnerId: string;
  phoneNumberId: string;
  orderId: string;
  status: string;
  customerPhone: string;
  variables: Record<string, unknown>;
}): Promise<void> {
  const { partnerId, phoneNumberId, orderId, status, customerPhone, variables } = args;

  const flowsRes = await fetchFromHasura(Q_ENABLED_FLOWS, { p: partnerId });
  const flows = (flowsRes?.whatsapp_flows || []) as Array<{
    id: string;
    graph: FlowGraph;
    triggers: TriggerDef[];
    run_ttl_hours: number;
  }>;

  const candidates = flows.flatMap((f) =>
    (f.triggers || [])
      .filter((t) => t.matchType === "order" && t.orderStatus === status)
      .map((t) => ({ flow: f, t })),
  );
  if (!candidates.length) return;

  for (const { flow, t } of candidates) {
    // Idempotency: each (order, status, trigger) fires at most once even if the
    // order row is updated again or the event is redelivered.
    const idemKey = `order_${orderId}_${status}_${t.nodeId || flow.id}`;
    try {
      await fetchFromHasura(M_EVENT, {
        o: {
          partner_id: partnerId,
          contact_phone: customerPhone,
          wa_message_id: idemKey,
          input: { orderTrigger: status, orderId },
        },
      });
    } catch (e: any) {
      if (/unique|duplicate/i.test(String(e?.message || e))) continue;
      console.error("Order flow idempotency insert failed:", e);
    }

    const graph = flow.graph || { nodes: [], edges: [] };
    const startId = t.nodeId ? firstEdgeTarget(graph, t.nodeId) : null;
    const state: RunState = { flowId: flow.id, variables: { ...variables }, stepCount: 0, version: 0 };
    const outbound: Outbound[] = [];
    const { parkedNodeId, completed, sleepMs } = executeForward(graph, startId, state, outbound);

    const ttlMs = (flow.run_ttl_hours || 24) * 3600 * 1000;
    const sf = sleepFields(sleepMs, ttlMs);
    try {
      await fetchFromHasura(M_INSERT_RUN, {
        o: {
          partner_id: partnerId,
          flow_id: flow.id,
          contact_phone: customerPhone,
          phone_number_id: phoneNumberId,
          current_node_id: parkedNodeId,
          status: completed ? "completed" : "active",
          variables: state.variables,
          step_count: state.stepCount,
          version: 1,
          last_inbound_wa_id: idemKey,
          last_interaction_at: new Date().toISOString(),
          resume_at: sf.resume_at,
          expires_at: sf.expires_at,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (e: any) {
      // The customer already has an active run (e.g. mid-conversation). Order
      // notifications should still go out, so dispatch without tracking a run.
      if (/unique|duplicate/i.test(String(e?.message || e))) {
        await dispatch(partnerId, phoneNumberId, customerPhone, outbound);
        continue;
      }
      console.error("Order flow insert run failed:", e);
      continue;
    }
    await dispatch(partnerId, phoneNumberId, customerPhone, outbound);
  }
}

// ─── Loyalty-triggered flows ─────────────────────────────────────
// Fired (from the loyalty-event webhook) when a loyalty-points transaction is
// recorded for a customer. Runs every enabled flow whose loyalty trigger
// matches `event` ("earned" / "redeemed"), starting from that trigger's branch,
// with the loyalty context injected as variables. Mirrors order-triggered flows
// but keyed on the (immutable, append-only) transaction id for idempotency.
export async function runLoyaltyTriggeredFlows(args: {
  partnerId: string;
  phoneNumberId: string;
  txnId: string;
  event: string;
  customerPhone: string;
  variables: Record<string, unknown>;
}): Promise<void> {
  const { partnerId, phoneNumberId, txnId, event, customerPhone, variables } = args;

  const flowsRes = await fetchFromHasura(Q_ENABLED_FLOWS, { p: partnerId });
  const flows = (flowsRes?.whatsapp_flows || []) as Array<{
    id: string;
    graph: FlowGraph;
    triggers: TriggerDef[];
    run_ttl_hours: number;
  }>;

  const candidates = flows.flatMap((f) =>
    (f.triggers || [])
      .filter((t) => t.matchType === "loyalty" && t.loyaltyEvent === event)
      .map((t) => ({ flow: f, t })),
  );
  if (!candidates.length) return;

  for (const { flow, t } of candidates) {
    // Idempotency: each (transaction, event, trigger) fires at most once even if
    // the event is redelivered by Hasura's at-least-once delivery.
    const idemKey = `loyalty_${txnId}_${event}_${t.nodeId || flow.id}`;
    try {
      await fetchFromHasura(M_EVENT, {
        o: {
          partner_id: partnerId,
          contact_phone: customerPhone,
          wa_message_id: idemKey,
          input: { loyaltyTrigger: event, txnId },
        },
      });
    } catch (e: any) {
      if (/unique|duplicate/i.test(String(e?.message || e))) continue;
      console.error("Loyalty flow idempotency insert failed:", e);
    }

    const graph = flow.graph || { nodes: [], edges: [] };
    const startId = t.nodeId ? firstEdgeTarget(graph, t.nodeId) : null;
    const state: RunState = { flowId: flow.id, variables: { ...variables }, stepCount: 0, version: 0 };
    const outbound: Outbound[] = [];
    const { parkedNodeId, completed, sleepMs } = executeForward(graph, startId, state, outbound);

    const ttlMs = (flow.run_ttl_hours || 24) * 3600 * 1000;
    const sf = sleepFields(sleepMs, ttlMs);
    try {
      await fetchFromHasura(M_INSERT_RUN, {
        o: {
          partner_id: partnerId,
          flow_id: flow.id,
          contact_phone: customerPhone,
          phone_number_id: phoneNumberId,
          current_node_id: parkedNodeId,
          status: completed ? "completed" : "active",
          variables: state.variables,
          step_count: state.stepCount,
          version: 1,
          last_inbound_wa_id: idemKey,
          last_interaction_at: new Date().toISOString(),
          resume_at: sf.resume_at,
          expires_at: sf.expires_at,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (e: any) {
      // The customer already has an active run (e.g. mid-conversation). Loyalty
      // notifications should still go out, so dispatch without tracking a run.
      if (/unique|duplicate/i.test(String(e?.message || e))) {
        await dispatch(partnerId, phoneNumberId, customerPhone, outbound);
        continue;
      }
      console.error("Loyalty flow insert run failed:", e);
      continue;
    }
    await dispatch(partnerId, phoneNumberId, customerPhone, outbound);
  }
}

async function resumeRun(
  partnerId: string,
  phoneNumberId: string,
  contactPhone: string,
  waMessageId: string,
  input: FlowInput,
  active: { id: string; flow_id: string; current_node_id: string | null; variables: any; step_count: number; version: number; resume_at?: string | null; phone_number_id?: string | null },
) {
  const flowRes = await fetchFromHasura(Q_FLOW, { id: active.flow_id });
  const flow = flowRes?.whatsapp_flows_by_pk;
  if (!flow || !flow.enabled) {
    await fetchFromHasura(M_EXPIRE_RUN, { id: active.id }).catch(() => {});
    return;
  }
  const graph: FlowGraph = flow.graph || { nodes: [], edges: [] };

  // Escape keyword aborts the run (works mid-delay too).
  if (flow.escape_keyword && input.normalized === String(flow.escape_keyword).trim().toLowerCase()) {
    await casUpdate(active, waMessageId, { status: "aborted", current_node_id: null, resume_at: null });
    return;
  }

  // Sleeping (delay) run: parked on a delay, NOT awaiting a reply. If the delay
  // is still counting down, this inbound isn't a reply to anything — leave the
  // delay intact for the resume-flow-delays cron (a specific keyword trigger
  // would have restarted the flow upstream, before we got here). If the delay is
  // already due, the customer's message effectively wakes it now; the version
  // CAS makes this idempotent with the cron.
  if (active.resume_at) {
    if (new Date(active.resume_at).getTime() > Date.now()) return;
    const outbound: Outbound[] = [];
    const st: RunState = {
      id: active.id,
      flowId: active.flow_id,
      variables: { ...(active.variables || {}) },
      stepCount: active.step_count || 0,
      version: active.version,
    };
    const { parkedNodeId, completed, sleepMs } = executeForward(graph, active.current_node_id, st, outbound);
    const sf = sleepFields(sleepMs, (flow.run_ttl_hours || 24) * 3600 * 1000);
    const won = await casUpdate(active, waMessageId, {
      current_node_id: parkedNodeId,
      status: completed ? "completed" : "active",
      variables: st.variables,
      step_count: st.stepCount,
      resume_at: sf.resume_at,
      expires_at: sf.expires_at,
      last_interaction_at: new Date().toISOString(),
    });
    if (won) await dispatch(partnerId, phoneNumberId, contactPhone, outbound);
    return;
  }

  const node = nodeById(graph, active.current_node_id);
  const state: RunState = {
    id: active.id,
    flowId: active.flow_id,
    variables: { ...(active.variables || {}) },
    stepCount: active.step_count || 0,
    version: active.version,
  };
  const outbound: Outbound[] = [];

  if (!node) {
    await casUpdate(active, waMessageId, { status: "completed", current_node_id: null });
    return;
  }

  let nextStart: string | null = null;
  const data = (node.data || {}) as any;

  if (node.type === "wait_for_reply") {
    if (!validateCapture(input.text, data.validation)) {
      // Re-prompt, stay parked, but still claim this message via CAS so a retry
      // doesn't double-prompt.
      const retry = data.retryText || "Sorry, that doesn't look right. Please try again.";
      const won = await casUpdate(active, waMessageId, {
        current_node_id: node.id,
        variables: state.variables,
        last_interaction_at: new Date().toISOString(),
      });
      if (won) await dispatch(partnerId, phoneNumberId, contactPhone, [{ kind: "text", text: retry }]);
      return;
    }
    if (data.variableName) state.variables[data.variableName] = input.text;
    state.variables.__lastReply = input.text;
    nextStart = firstEdgeTarget(graph, node.id);
  } else if (node.type === "buttons") {
    const items = (data.items as ButtonItem[]) || [];
    const choice = matchButtonChoice(items, input);
    if (!choice) {
      const won = await casUpdate(active, waMessageId, {
        current_node_id: node.id,
        variables: state.variables,
        last_interaction_at: new Date().toISOString(),
      });
      if (won)
        await dispatch(partnerId, phoneNumberId, contactPhone, [
          { kind: "buttons", text: interpolate(data.text || "", state.variables), items },
        ]);
      return;
    }
    state.variables.__lastReply = choice.value ?? choice.label ?? "";
    nextStart = firstEdgeTarget(graph, node.id, choice.id);
  } else if (node.type === "end") {
    // Parked at an END node that offered an opt-out button. If the customer
    // tapped it, suppress this flow for them for the author-chosen duration
    // (suppressHours; 0 = forever, default 24h); either way the run is done.
    const tappedStop =
      input.replyId === STOP_FLOW_BUTTON_ID ||
      (!!data.buttonText &&
        input.normalized === String(data.buttonText).trim().toLowerCase());
    const won = await casUpdate(active, waMessageId, {
      status: "completed",
      current_node_id: null,
      last_interaction_at: new Date().toISOString(),
    });
    if (won && tappedStop) {
      const rawHours = Number(data.suppressHours);
      const hours = Number.isFinite(rawHours) ? rawHours : DEFAULT_SUPPRESS_HOURS;
      await suppressFlow(partnerId, active.flow_id, contactPhone, hours);
      // Confirmation is optional: send it only if the author set one (blank =
      // no confirmation message).
      const confirm = interpolate(
        String(data.stopConfirmText || "").trim(),
        state.variables,
      );
      if (confirm) {
        await dispatch(partnerId, phoneNumberId, contactPhone, [
          { kind: "text", text: confirm },
        ]);
      }
    }
    return;
  } else {
    nextStart = firstEdgeTarget(graph, node.id);
  }

  const { parkedNodeId, completed, sleepMs } = executeForward(graph, nextStart, state, outbound);

  const sf = sleepFields(sleepMs, (flow.run_ttl_hours || 24) * 3600 * 1000);
  const won = await casUpdate(active, waMessageId, {
    current_node_id: parkedNodeId,
    status: completed ? "completed" : "active",
    variables: state.variables,
    step_count: state.stepCount,
    resume_at: sf.resume_at,
    expires_at: sf.expires_at,
    last_interaction_at: new Date().toISOString(),
  });
  if (won) await dispatch(partnerId, phoneNumberId, contactPhone, outbound);
}

// Compare-and-swap the run row. Returns true if THIS turn won the advance.
async function casUpdate(
  active: { id: string; version: number },
  waMessageId: string,
  set: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetchFromHasura(M_CAS_RUN, {
      id: active.id,
      v: active.version,
      wa: waMessageId,
      set: { ...set, last_inbound_wa_id: waMessageId, updated_at: new Date().toISOString() },
    });
    return (res?.update_whatsapp_flow_execution_state?.affected_rows ?? 0) === 1;
  } catch (e) {
    console.error("Flow CAS update failed:", e);
    return false;
  }
}

// ─── Delayed-message resume (cron) ───────────────────────────────
// Drains runs parked on a delay whose wake time has arrived. Called every
// minute by /api/cron/resume-flow-delays. Each run is continued from the node
// AFTER its delay; the walk may send messages, chain into another delay (parks
// again with a fresh resume_at), park awaiting a reply, or finish. A version
// CAS guards every advance, so overlapping cron ticks — or a concurrent inbound
// that also wakes the run — can never double-send.
export async function resumeDueDelayedFlows(
  limit = 200,
): Promise<{ due: number; processed: number }> {
  const nowIso = new Date().toISOString();
  const res = await fetchFromHasura(Q_DUE_SLEEPING, { now: nowIso, limit }).catch(
    (e) => {
      console.error("resumeDueDelayedFlows query failed:", e);
      return null;
    },
  );
  const runs = (res?.whatsapp_flow_execution_state || []) as Array<{
    id: string;
    partner_id: string;
    flow_id: string;
    contact_phone: string;
    current_node_id: string | null;
    variables: any;
    step_count: number;
    version: number;
    phone_number_id: string | null;
    resume_at: string;
    expires_at: string | null;
  }>;
  let processed = 0;
  for (const run of runs) {
    try {
      await wakeSleepingRun(run);
      processed++;
    } catch (e) {
      console.error("wakeSleepingRun failed for run", run.id, e);
    }
  }
  return { due: runs.length, processed };
}

async function resolvePhoneNumberId(
  partnerId: string,
  fallback?: string | null,
): Promise<string | null> {
  if (fallback) return fallback;
  try {
    const r = await fetchFromHasura(
      `query PnByPartner($p: uuid!) {
        whatsapp_business_integrations(where: {partner_id: {_eq: $p}}, order_by: {is_primary: desc, updated_at: asc}, limit: 1) { phone_number_id }
      }`,
      { p: partnerId },
    );
    return r?.whatsapp_business_integrations?.[0]?.phone_number_id ?? null;
  } catch {
    return null;
  }
}

async function wakeSleepingRun(run: {
  id: string;
  partner_id: string;
  flow_id: string;
  contact_phone: string;
  current_node_id: string | null;
  variables: any;
  step_count: number;
  version: number;
  phone_number_id: string | null;
  resume_at: string;
  expires_at: string | null;
}): Promise<void> {
  // Outlived its TTL while sleeping (e.g. flow paused for a long time) → drop.
  if (run.expires_at && new Date(run.expires_at).getTime() < Date.now()) {
    await fetchFromHasura(M_EXPIRE_RUN, { id: run.id }).catch(() => {});
    return;
  }
  const flowRes = await fetchFromHasura(Q_FLOW, { id: run.flow_id });
  const flow = flowRes?.whatsapp_flows_by_pk;
  if (!flow || !flow.enabled) {
    // Flow was disabled/deleted during the wait — the delayed message is dropped.
    await fetchFromHasura(M_EXPIRE_RUN, { id: run.id }).catch(() => {});
    return;
  }
  const graph: FlowGraph = flow.graph || { nodes: [], edges: [] };
  const state: RunState = {
    id: run.id,
    flowId: run.flow_id,
    variables: { ...(run.variables || {}) },
    stepCount: run.step_count || 0,
    version: run.version,
  };
  const outbound: Outbound[] = [];
  // Resume by executing FORWARD from current_node_id (the node after the delay).
  const { parkedNodeId, completed, sleepMs } = executeForward(
    graph,
    run.current_node_id,
    state,
    outbound,
  );
  const sf = sleepFields(sleepMs, (flow.run_ttl_hours || 24) * 3600 * 1000);
  // Synthetic wa id namespaces this wake so the CAS's last_inbound_wa_id guard
  // plus the version check together make concurrent wakes idempotent.
  const claimWaId = `wake_${new Date(run.resume_at).getTime()}`;
  const won = await casUpdate(run, claimWaId, {
    current_node_id: parkedNodeId,
    status: completed ? "completed" : "active",
    variables: state.variables,
    step_count: state.stepCount,
    resume_at: sf.resume_at,
    expires_at: sf.expires_at,
    last_interaction_at: new Date().toISOString(),
  });
  if (!won || !outbound.length) return;
  const pnid = await resolvePhoneNumberId(run.partner_id, run.phone_number_id);
  if (pnid) await dispatch(run.partner_id, pnid, run.contact_phone, outbound);
  else console.error("wakeSleepingRun: no phone_number_id for partner", run.partner_id);
}

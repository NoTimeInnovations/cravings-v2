// WhatsApp Flow runtime engine. Called from the Meta webhook for each inbound
// customer message. Ported from OpenWA's FSM engine, but made serverless-safe:
// correctness lives in Postgres (idempotency on the Meta message id + a
// partial-unique active run + optimistic-version CAS on advance), never in
// process memory. Sends go from the partner's own number with OUR system-user
// token (a partner Coexistence token can't send). `buttons` nodes are sent as
// NATIVE WhatsApp interactive reply buttons.

import { fetchFromHasura } from "@/lib/hasuraClient";
import { buildOrderLink } from "@/lib/whatsappFlow/orderLink";
import type {
  FlowGraph,
  FlowNode,
  TriggerDef,
  ConditionRule,
  ButtonItem,
  CaptureValidation,
} from "@/lib/whatsappFlow/types";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";
const MAX_STEPS = 50; // loop guard across a whole run
const MAX_SENDS_PER_TURN = 10; // bound Graph sends per inbound message
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FlowInput {
  text: string; // raw inbound text / interactive title
  normalized: string; // text.trim().toLowerCase()
  replyId?: string | null; // interactive button/list reply id (= branch handle)
}

interface RunState {
  id?: string;
  flowId: string;
  variables: Record<string, unknown>;
  stepCount: number;
  version: number;
}

interface Outbound {
  kind: "text" | "image" | "audio" | "document" | "buttons" | "cta";
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
      id flow_id current_node_id variables step_count version expires_at
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
      id graph triggers escape_keyword run_ttl_hours
    }
  }
`;
const Q_FLOW = `
  query Flow($id: uuid!) {
    whatsapp_flows_by_pk(id: $id) { id graph enabled escape_keyword run_ttl_hours }
  }
`;
const Q_PARTNER_INFO = `
  query PartnerInfo($id: uuid!) {
    partners_by_pk(id: $id) { store_name username currency }
  }
`;
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

function triggerMatches(t: TriggerDef, normalized: string, firstContact: boolean): boolean {
  switch (t.matchType) {
    case "exact":
      return (t.keywords || []).includes(normalized);
    case "contains":
      return (t.keywords || []).some((k) => normalized.includes(k));
    case "welcome":
      return firstContact;
    case "any":
      return normalized.length > 0;
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
): { parkedNodeId: string | null; completed: boolean } {
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
      case "delay":
        // v1: delays are skipped (no inline sleep — keeps the webhook fast and
        // safe; a real scheduler comes with the async-worker phase).
        nodeId = firstEdgeTarget(graph, node.id);
        break;
      case "condition": {
        const handle = evaluateCondition(node, state.variables, lastReply);
        nodeId = firstEdgeTarget(graph, node.id, handle);
        break;
      }
      case "jump":
        nodeId = data.targetNodeId || null;
        break;
      case "link_button":
        outbound.push({
          kind: "cta",
          text: interpolate(data.text || "", state.variables),
          buttonText: data.buttonText || "Open",
          url: interpolate(data.url || "", state.variables),
        });
        nodeId = firstEdgeTarget(graph, node.id);
        break;
      case "buttons":
        outbound.push({
          kind: "buttons",
          text: interpolate(data.text || "", state.variables),
          items: (data.items as ButtonItem[]) || [],
        });
        return { parkedNodeId: node.id, completed: false }; // park awaiting choice
      case "wait_for_reply":
        return { parkedNodeId: node.id, completed: false }; // park awaiting reply
      case "end":
        return { parkedNodeId: null, completed: true };
      default:
        nodeId = firstEdgeTarget(graph, node.id);
    }
  }
  return { parkedNodeId: null, completed: true };
}

// ─── Sending (native interactive) ────────────────────────────────
async function graphSend(phoneNumberId: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
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
    case "audio":
      return {
        type: "audio",
        body: "",
        payload: { to, type: "audio", audio: { link: o.mediaUrl } },
      };
    case "cta": {
      const url = (o.url || "").trim();
      // No valid URL → degrade to a plain text message so the caption still sends.
      if (!/^https?:\/\//i.test(url)) {
        return { type: "text", body: o.text || "", payload: { to, type: "text", text: { body: o.text || " " } } };
      }
      return {
        type: "interactive",
        body: o.text || "",
        payload: {
          to,
          type: "interactive",
          interactive: {
            type: "cta_url",
            body: { text: o.text || " " },
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

async function dispatch(
  partnerId: string,
  phoneNumberId: string,
  to: string,
  outbound: Outbound[],
): Promise<void> {
  for (const o of outbound) {
    const { payload, type, body } = buildPayload(to, o);
    const sent = await graphSend(phoneNumberId, payload);
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
}): Promise<void> {
  const { partnerId, phoneNumberId, contactPhone, waMessageId, input } = args;

  // Layer 1 — idempotency: claim this Meta message id. A retry (or a second
  // instance handed the same delivery) throws on the partial-unique index and
  // we drop it. This is the primary double-advance guard.
  try {
    await fetchFromHasura(M_EVENT, {
      o: { partner_id: partnerId, contact_phone: contactPhone, wa_message_id: waMessageId, input },
    });
  } catch (e: any) {
    if (/unique|duplicate/i.test(String(e?.message || e))) return; // already processed
    console.error("Flow idempotency insert failed:", e);
    // fall through — better to attempt processing than to drop a real message
  }

  const activeRes = await fetchFromHasura(Q_ACTIVE_RUN, { p: partnerId, c: contactPhone });
  const active = activeRes?.whatsapp_flow_execution_state?.[0];

  if (active) {
    if (active.expires_at && new Date(active.expires_at).getTime() < Date.now()) {
      await fetchFromHasura(M_EXPIRE_RUN, { id: active.id }).catch(() => {});
    } else if (await matchesSpecificTrigger(partnerId, input.normalized)) {
      // A specific keyword trigger (exact/contains) restarts its flow even
      // mid-run, so re-sending the trigger word replays the WHOLE flow instead
      // of being treated as a reply to the parked step. (Generic any/welcome
      // triggers don't do this, so button choices / captures still work.)
      await abortRun(active.id);
      await startNewRun(partnerId, phoneNumberId, contactPhone, waMessageId, input);
      return;
    } else {
      await resumeRun(partnerId, phoneNumberId, contactPhone, waMessageId, input, active);
      return;
    }
  }

  await startNewRun(partnerId, phoneNumberId, contactPhone, waMessageId, input);
}

// True if the inbound matches a SPECIFIC (exact/contains) keyword trigger of an
// enabled flow — used to decide whether to restart a flow mid-run.
async function matchesSpecificTrigger(partnerId: string, normalized: string): Promise<boolean> {
  const res = await fetchFromHasura(Q_ENABLED_FLOWS, { p: partnerId });
  const flows = (res?.whatsapp_flows || []) as Array<{ triggers: TriggerDef[] }>;
  return flows.some((f) =>
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

// System variables available to every message-triggered run.
async function buildMessageRunVars(partnerId: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetchFromHasura(Q_PARTNER_INFO, { id: partnerId });
    const p = res?.partners_by_pk;
    if (!p) return {};
    return {
      store_name: p.store_name || "",
      username: p.username || "",
      currency: p.currency ?? "₹",
      order_link: p.username ? buildOrderLink(p.username, partnerId) : "",
    };
  } catch (e) {
    console.error("buildMessageRunVars failed:", e);
    return {};
  }
}

async function startNewRun(
  partnerId: string,
  phoneNumberId: string,
  contactPhone: string,
  waMessageId: string,
  input: FlowInput,
) {
  const flowsRes = await fetchFromHasura(Q_ENABLED_FLOWS, { p: partnerId });
  const flows = (flowsRes?.whatsapp_flows || []) as Array<{
    id: string;
    graph: FlowGraph;
    triggers: TriggerDef[];
    escape_keyword: string | null;
    run_ttl_hours: number;
  }>;
  if (!flows.length) return;

  // Need firstContact only if some flow has a welcome trigger.
  let firstContact = false;
  if (flows.some((f) => (f.triggers || []).some((t) => t.matchType === "welcome"))) {
    const c = await fetchFromHasura(Q_RUN_COUNT, { p: partnerId, c: contactPhone });
    firstContact = (c?.whatsapp_flow_execution_state_aggregate?.aggregate?.count ?? 0) === 0;
  }

  const candidates = flows
    .flatMap((f) => (f.triggers || []).map((t) => ({ flow: f, t })))
    .sort((a, b) => a.t.priority - b.t.priority);
  const matchedCand = candidates.find((c) =>
    triggerMatches(c.t, input.normalized, firstContact),
  );
  if (!matchedCand) return;
  const matched = matchedCand.flow;

  const graph = matched.graph || { nodes: [], edges: [] };
  // Start from the MATCHED trigger node's branch — a flow can have multiple
  // trigger nodes (entry points), each starting its own branch.
  const startNodeId =
    matchedCand.t.nodeId ||
    (graph.nodes || []).find((n) => n.type === "trigger")?.id ||
    null;
  const startId = startNodeId ? firstEdgeTarget(graph, startNodeId) : null;

  // Inject system variables (store name, a fresh 30-min order link, etc.) so
  // welcome/menu flows can use {{order_link}}, {{store_name}}, etc.
  const sysVars = await buildMessageRunVars(partnerId);
  const state: RunState = { flowId: matched.id, variables: sysVars, stepCount: 0, version: 0 };
  const outbound: Outbound[] = [];
  const { parkedNodeId, completed } = executeForward(graph, startId, state, outbound);

  const ttlMs = (matched.run_ttl_hours || 24) * 3600 * 1000;
  // Insert the run with its post-turn state. The partial-unique active index is
  // the concurrency guard: if another instance already created an active run
  // for this contact, this insert throws and we drop (rare first-message race).
  try {
    await fetchFromHasura(M_INSERT_RUN, {
      o: {
        partner_id: partnerId,
        flow_id: matched.id,
        contact_phone: contactPhone,
        current_node_id: parkedNodeId,
        status: completed ? "completed" : "active",
        variables: state.variables,
        step_count: state.stepCount,
        version: 1,
        last_inbound_wa_id: waMessageId,
        last_interaction_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttlMs).toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    if (/unique|duplicate/i.test(String(e?.message || e))) return; // lost the race
    console.error("Flow insert run failed:", e);
    return;
  }

  await dispatch(partnerId, phoneNumberId, contactPhone, outbound);
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
    const { parkedNodeId, completed } = executeForward(graph, startId, state, outbound);

    const ttlMs = (flow.run_ttl_hours || 24) * 3600 * 1000;
    try {
      await fetchFromHasura(M_INSERT_RUN, {
        o: {
          partner_id: partnerId,
          flow_id: flow.id,
          contact_phone: customerPhone,
          current_node_id: parkedNodeId,
          status: completed ? "completed" : "active",
          variables: state.variables,
          step_count: state.stepCount,
          version: 1,
          last_inbound_wa_id: idemKey,
          last_interaction_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + ttlMs).toISOString(),
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

async function resumeRun(
  partnerId: string,
  phoneNumberId: string,
  contactPhone: string,
  waMessageId: string,
  input: FlowInput,
  active: { id: string; flow_id: string; current_node_id: string | null; variables: any; step_count: number; version: number },
) {
  const flowRes = await fetchFromHasura(Q_FLOW, { id: active.flow_id });
  const flow = flowRes?.whatsapp_flows_by_pk;
  if (!flow || !flow.enabled) {
    await fetchFromHasura(M_EXPIRE_RUN, { id: active.id }).catch(() => {});
    return;
  }
  const graph: FlowGraph = flow.graph || { nodes: [], edges: [] };

  // Escape keyword aborts the run.
  if (flow.escape_keyword && input.normalized === String(flow.escape_keyword).trim().toLowerCase()) {
    await casUpdate(active, waMessageId, { status: "aborted", current_node_id: null });
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
  } else {
    nextStart = firstEdgeTarget(graph, node.id);
  }

  const { parkedNodeId, completed } = executeForward(graph, nextStart, state, outbound);

  const won = await casUpdate(active, waMessageId, {
    current_node_id: parkedNodeId,
    status: completed ? "completed" : "active",
    variables: state.variables,
    step_count: state.stepCount,
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

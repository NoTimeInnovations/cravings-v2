// Shared shapes for the WhatsApp Flow feature (conversational automation),
// ported from the OpenWA flow engine. A flow is stored as a single node-graph
// JSON document that round-trips 1:1 with the @xyflow/react builder, so adding
// a node type never needs a DB migration — only new `data`.
//
// Cravings adaptation: flows are partner-scoped (one partner_id per flow), and
// `buttons` nodes are sent as NATIVE WhatsApp interactive buttons/lists by the
// engine (not a numbered text menu).

export type FlowNodeType =
  | "trigger"
  | "send_text"
  | "send_image"
  | "send_audio"
  | "send_document"
  | "buttons"
  | "wait_for_reply"
  | "condition"
  | "delay"
  | "set_variable"
  | "jump"
  | "end";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  /** Branching key: a `buttons` item id, or a `condition` rule handle / 'else'. */
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

// ─── Triggers ────────────────────────────────────────────────────
// "order" triggers fire on an order STATUS change rather than an inbound
// message; every other matchType fires on an inbound customer message. A flow
// may contain MULTIPLE trigger nodes (multiple entry points) — each starts its
// own branch of the graph.
export type TriggerMatchType =
  | "exact"
  | "contains"
  | "welcome"
  | "any"
  | "default"
  | "order";

export interface TriggerDef {
  matchType: TriggerMatchType;
  /** Normalized (trim + lowercase) keywords for exact/contains matching. */
  keywords?: string[];
  /** For matchType "order": which order status fires this trigger. */
  orderStatus?: string;
  /** The trigger node id — the engine starts the run from this node's branch. */
  nodeId?: string;
  priority: number;
}

/** Deterministic trigger priority — lower wins. */
export const TRIGGER_PRIORITY: Record<TriggerMatchType, number> = {
  exact: 0,
  order: 5,
  contains: 10,
  welcome: 20,
  any: 30,
  default: 40,
};

// Order-status values a flow can be triggered on. "placed" fires when the order
// is created; the rest fire when the order's status changes to that value.
export const ORDER_STATUSES: { value: string; label: string }[] = [
  { value: "placed", label: "Order placed" },
  { value: "accepted", label: "Accepted" },
  { value: "food_ready", label: "Food ready" },
  { value: "dispatched", label: "Dispatched" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Variables the engine injects into an order-triggered run, usable as {{name}}
// in any send/text step.
export const ORDER_FLOW_VARIABLES = [
  "store_name",
  "order_id",
  "order_status",
  "customer_name",
  "items",
  "total",
  "order_type",
  "currency",
] as const;

// ─── Conditions / captures ───────────────────────────────────────
export type ConditionOp = "equals" | "contains" | "isEmpty" | "gt" | "lt";

export interface ConditionRule {
  /** Variable name to read, or empty to use the last reply. */
  var?: string;
  op: ConditionOp;
  value?: string;
  /** sourceHandle of the outgoing edge taken when this rule matches. */
  handle: string;
}

export type CaptureValidation = "text" | "number" | "email";

export type FlowRunStatus = "active" | "completed" | "aborted" | "expired";

// ─── Buttons ─────────────────────────────────────────────────────
export interface ButtonItem {
  id: string;
  label: string;
  value?: string;
}

// ─── Persisted flow row (mirrors whatsapp_flows) ─────────────────
export interface Flow {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  graph: FlowGraph;
  triggers: TriggerDef[];
  escape_keyword: string | null;
  run_ttl_hours: number;
  created_at: string;
  updated_at: string;
}

// What the builder sends to create/update a flow.
export interface SaveFlowPayload {
  name: string;
  description?: string | null;
  enabled?: boolean;
  graph: FlowGraph;
  escapeKeyword?: string | null;
  runTtlHours?: number;
}

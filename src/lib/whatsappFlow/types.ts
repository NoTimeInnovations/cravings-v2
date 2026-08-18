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
  | "send_video"
  | "send_audio"
  | "send_document"
  /** Sends the partner's WhatsApp Catalogue as a "View catalog" card. Degrades
   *  to plain text for a partner with no catalogue, so a shared flow carrying
   *  this node is never a dead end. */
  | "send_catalog"
  | "buttons"
  | "link_button"
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
// "order" and "loyalty" triggers fire on a backend EVENT (an order status
// change / a loyalty-points transaction) rather than an inbound message; every
// other matchType fires on an inbound customer message. A flow may contain
// MULTIPLE trigger nodes (multiple entry points) — each starts its own branch
// of the graph.
export type TriggerMatchType =
  | "exact"
  | "contains"
  | "welcome"
  | "any"
  | "default"
  | "order"
  | "loyalty"
  /** Fires when the inbound named one of THIS partner's real tables — including
   *  by its own name ("order from AC 1"), which no keyword can cover because the
   *  names are per-partner data. Resolved by the webhook before the engine runs. */
  | "table";

export interface TriggerDef {
  matchType: TriggerMatchType;
  /** Normalized (trim + lowercase) keywords for exact/contains matching. */
  keywords?: string[];
  /** For matchType "order": which order status fires this trigger. */
  orderStatus?: string;
  /** For matchType "loyalty": which loyalty event fires this trigger. */
  loyaltyEvent?: string;
  /** The trigger node id — the engine starts the run from this node's branch. */
  nodeId?: string;
  priority: number;
}

/** Deterministic trigger priority — lower wins. */
export const TRIGGER_PRIORITY: Record<TriggerMatchType, number> = {
  exact: 0,
  order: 5,
  loyalty: 6,
  // Beats `contains` so a confirmed table wins over a generic keyword flow: the
  // customer named a specific table, which is more specific than "says 'table'".
  // 7 rather than 8 because 41 live table flows already store their `contains`
  // trigger at 8 — a tie would leave which one wins up to array order.
  table: 7,
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
  "subtotal",
  "gst",
  "charges",
  "discount",
  "total",
  "bill",
  "order_url",
  "review_url",
  "driver_name",
  "driver_phone",
  "driver_details",
  "tracking_url",
  "order_type",
  "currency",
] as const;

// ─── Loyalty triggers ────────────────────────────────────────────
// Loyalty events a flow can be triggered on. "earned" fires when points are
// credited to a customer (an order earn or a manual store credit); "redeemed"
// fires when a customer spends points on an order.
export const LOYALTY_EVENTS: { value: string; label: string }[] = [
  { value: "earned", label: "Points earned" },
  { value: "redeemed", label: "Points redeemed" },
];

// Variables the engine injects into a loyalty-triggered run, usable as
// {{name}} in any send/text step.
//   points         — points added (earned) or spent (redeemed), always positive
//   points_value   — currency value of those points (e.g. ₹50)
//   points_balance — the customer's new total balance after this transaction
//   balance_value  — currency value of the total balance
//   lifetime_earned— points the customer has earned all-time at this store
//   order_id       — the order this transaction is tied to (blank if manual)
export const LOYALTY_FLOW_VARIABLES = [
  "store_name",
  "customer_name",
  "points",
  "points_value",
  "points_balance",
  "balance_value",
  "lifetime_earned",
  "order_id",
  "currency",
] as const;

// ─── Message-triggered flows (welcome / keyword / any) ───────────
// Variables the engine injects into every MESSAGE-triggered run (welcome, exact,
// contains, any, default) — the "hi"/"menu" greeting paths. Unlike order/loyalty
// these carry no event payload; they describe the STORE and the customer's own
// order history, so a welcome flow can branch on whether the shop is open, show
// today's timings, or offer a one-tap reorder. Each entry has a short,
// partner-facing description shown in the builder's variable helper box.
//
// The boolean flags render as the literal strings "true" / "false", so a
// condition node checks them with equals "true" (or "false").
export const MESSAGE_FLOW_VARIABLE_INFO: { name: string; desc: string }[] = [
  { name: "shop_open", desc: `"true" if your store's open/closed switch is ON, else "false"` },
  { name: "can_order_now", desc: `"true" if delivery OR takeaway is open right now (by your timings)` },
  { name: "delivery_available_now", desc: `"true" if delivery is open right now` },
  { name: "takeaway_available_now", desc: `"true" if takeaway is open right now` },
  { name: "delivery_hours", desc: `Your delivery timings, e.g. "9:00 AM to 10:00 PM"` },
  { name: "takeaway_hours", desc: `Your takeaway timings` },
  { name: "store_name", desc: "Your store's name" },
  { name: "currency", desc: "Your currency symbol (₹, $, …)" },
  { name: "order_link", desc: "A ready-to-tap link for the customer to place an order" },
  { name: "reorder_link", desc: "Link that repeats the customer's last order (blank if none)" },
  { name: "reorder_items", desc: "List of the customer's last order's items (blank if none)" },
  { name: "reorder_total", desc: "Total of the customer's last order (blank if none)" },
  { name: "table_name", desc: `The table they named/scanned, e.g. "Table 5" (blank if none)` },
];

// Just the names, for the "#" variable picker in message fields.
export const MESSAGE_FLOW_VARIABLES = MESSAGE_FLOW_VARIABLE_INFO.map(
  (v) => v.name,
) as readonly string[];

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
  oncePerUser?: boolean;
  cooldownHours?: number;
}

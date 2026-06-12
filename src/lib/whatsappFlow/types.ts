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
export type TriggerMatchType = "exact" | "contains" | "welcome" | "any" | "default";

export interface TriggerDef {
  matchType: TriggerMatchType;
  /** Normalized (trim + lowercase) keywords for exact/contains matching. */
  keywords?: string[];
  priority: number;
}

/** Deterministic trigger priority — lower wins. */
export const TRIGGER_PRIORITY: Record<TriggerMatchType, number> = {
  exact: 0,
  contains: 10,
  welcome: 20,
  any: 30,
  default: 40,
};

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

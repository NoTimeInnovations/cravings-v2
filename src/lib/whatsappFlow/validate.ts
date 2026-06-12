import {
  FlowGraph,
  FlowNode,
  TriggerDef,
  TriggerMatchType,
  TRIGGER_PRIORITY,
} from "./types";

// Denormalize the trigger node(s) into a flat TriggerDef[] stored on the flow
// row for fast inbound matching by the engine. Mirrors OpenWA's extractTriggers.
export function extractTriggers(graph: FlowGraph): TriggerDef[] {
  const out: TriggerDef[] = [];
  for (const node of graph.nodes || []) {
    if (node.type !== "trigger") continue;
    const data = (node.data || {}) as Record<string, unknown>;
    const matchType = ((data.matchType as TriggerMatchType) ?? "any") as TriggerMatchType;
    const keywords = Array.isArray(data.keywords)
      ? (data.keywords as unknown[])
          .map((k) => String(k).trim().toLowerCase())
          .filter((k) => k.length > 0)
      : [];
    out.push({
      matchType,
      keywords,
      priority: TRIGGER_PRIORITY[matchType] ?? 30,
    });
  }
  return out;
}

export class FlowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowValidationError";
  }
}

// Validate a flow graph at author time. An empty graph is allowed (draft).
// Throws FlowValidationError with a partner-facing message on the first problem.
export function validateGraph(graph: FlowGraph): void {
  const nodes: FlowNode[] = graph?.nodes || [];
  const edges = graph?.edges || [];

  if (nodes.length === 0) return; // empty draft is fine

  const ids = new Set<string>();
  let triggerCount = 0;

  for (const node of nodes) {
    if (!node.id || !node.type) {
      throw new FlowValidationError("Every node must have an id and a type.");
    }
    if (ids.has(node.id)) {
      throw new FlowValidationError(`Duplicate node id: ${node.id}`);
    }
    ids.add(node.id);

    if (node.type === "trigger") triggerCount++;

    if (node.type === "wait_for_reply") {
      const v = (node.data as any)?.variableName;
      if (!v || typeof v !== "string") {
        throw new FlowValidationError(
          'A "Wait for reply" step needs a variable name to store the answer.',
        );
      }
    }

    if (node.type === "buttons") {
      const items = (node.data as any)?.items;
      if (!Array.isArray(items) || items.length === 0) {
        throw new FlowValidationError("A buttons step needs at least one button.");
      }
      if (items.length > 3) {
        throw new FlowValidationError(
          "WhatsApp interactive buttons allow at most 3 options per step.",
        );
      }
    }
  }

  if (triggerCount === 0) {
    throw new FlowValidationError("A flow must have a trigger step.");
  }
  if (triggerCount > 1) {
    throw new FlowValidationError("A flow must have exactly one trigger step.");
  }

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      throw new FlowValidationError(
        "A connection points to a step that no longer exists.",
      );
    }
  }
}

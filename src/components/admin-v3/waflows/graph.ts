import {
  AudioLines,
  Clock,
  CornerUpRight,
  ExternalLink,
  FileText,
  GitBranch,
  Image as ImageIcon,
  ListChecks,
  MessageCircleQuestion,
  MessageSquare,
  ShoppingBag,
  Square,
  Variable,
  Video as VideoIcon,
  Zap,
} from "lucide-react";
import type { ElementType } from "react";

import type {
  ButtonItem,
  ConditionRule,
  FlowEdge,
  FlowGraph,
  FlowNode,
  FlowNodeType,
  TriggerDef,
} from "@/lib/whatsappFlow/types";

/**
 * Pure graph helpers shared by the v3 Flows list and the v3 Flow editor.
 *
 * The stored document is unchanged from admin-v2 — the same `FlowGraph` of
 * nodes + edges the engine reads and the @xyflow builder writes. v3 only
 * *renders* it differently: the design shows a single vertical run of steps
 * instead of a free canvas, so everything here is about deriving that linear
 * reading order from an arbitrary graph without ever rewriting it.
 */

/* ------------------------------------------------------------------- types */

export type EditorNode = FlowNode;
export type EditorEdge = FlowEdge;

export type NodeKind = "Trigger" | "Message" | "Media" | "Choice" | "Logic";

export interface NodeMeta {
  label: string;
  icon: ElementType;
  kind: NodeKind;
  /** One-line explanation shown under the inspector title. */
  hint: string;
}

export const NODE_META: Record<FlowNodeType, NodeMeta> = {
  trigger: {
    label: "Trigger",
    icon: Zap,
    kind: "Trigger",
    hint: "What starts this conversation.",
  },
  send_text: {
    label: "Send text",
    icon: MessageSquare,
    kind: "Message",
    hint: "A plain WhatsApp message.",
  },
  send_image: {
    label: "Send image",
    icon: ImageIcon,
    kind: "Media",
    hint: "A photo, with an optional caption.",
  },
  send_video: {
    label: "Send video",
    icon: VideoIcon,
    kind: "Media",
    hint: "A video, with an optional caption.",
  },
  send_audio: {
    label: "Send audio",
    icon: AudioLines,
    kind: "Media",
    hint: "A voice note or audio clip.",
  },
  send_document: {
    label: "Send document",
    icon: FileText,
    kind: "Media",
    hint: "A PDF or file attachment.",
  },
  send_catalog: {
    label: "Send catalogue",
    icon: ShoppingBag,
    kind: "Message",
    hint: "Your menu, browsable inside WhatsApp.",
  },
  buttons: {
    label: "Buttons",
    icon: ListChecks,
    kind: "Choice",
    hint: "Up to three tappable replies, each with its own branch.",
  },
  link_button: {
    label: "Link button",
    icon: ExternalLink,
    kind: "Message",
    hint: "A message with one button that opens a link.",
  },
  wait_for_reply: {
    label: "Wait for reply",
    icon: MessageCircleQuestion,
    kind: "Logic",
    hint: "Pause until the customer answers, and keep what they said.",
  },
  condition: {
    label: "Condition",
    icon: GitBranch,
    kind: "Choice",
    hint: "Branch on a variable. First matching rule wins.",
  },
  delay: {
    label: "Delay",
    icon: Clock,
    kind: "Logic",
    hint: "Wait before sending the next step.",
  },
  set_variable: {
    label: "Set variable",
    icon: Variable,
    kind: "Logic",
    hint: "Store a value you can reuse later in the flow.",
  },
  jump: {
    label: "Jump",
    icon: CornerUpRight,
    kind: "Logic",
    hint: "Continue from another step instead of the next one.",
  },
  end: {
    label: "End",
    icon: Square,
    kind: "Logic",
    hint: "Finish the conversation, optionally with an opt-out button.",
  },
};

/** Palette groups, exactly the two the design shows. */
export const PALETTE_SEND: FlowNodeType[] = [
  "send_text",
  "send_image",
  "send_video",
  "send_audio",
  "send_document",
  "send_catalog",
  "link_button",
];

export const PALETTE_LOGIC: FlowNodeType[] = [
  "trigger",
  "buttons",
  "wait_for_reply",
  "condition",
  "delay",
  "set_variable",
  "jump",
  "end",
];

/** Trigger match-types that fire on an inbound message rather than an event. */
export const MESSAGE_TRIGGER_TYPES = new Set<string>([
  "welcome",
  "exact",
  "contains",
  "any",
  "default",
  "table",
]);

/* ---------------------------------------------------------------- id + data */

let idSeq = 0;
export const genId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${idSeq++}`;

/** Identical defaults to admin-v2's builder, so both write the same documents. */
export function defaultData(type: FlowNodeType): Record<string, unknown> {
  switch (type) {
    case "trigger":
      return { matchType: "any", keywords: [] };
    case "send_text":
      return { text: "" };
    case "send_image":
    case "send_video":
      return { mediaUrl: "", caption: "" };
    case "send_audio":
      return { mediaUrl: "" };
    case "send_document":
      return { mediaUrl: "", filename: "", caption: "" };
    case "send_catalog":
      return {
        text: "Here's our menu 🍽️ Tap below to browse and add to your basket.",
      };
    case "buttons":
      return {
        text: "Choose an option:",
        items: [{ id: genId("opt"), label: "Option 1" }],
      };
    case "link_button":
      return { text: "", buttonText: "Open", url: "" };
    case "wait_for_reply":
      return { variableName: "reply", validation: "text", retryText: "" };
    case "condition":
      return {
        rules: [{ var: "", op: "equals", value: "", handle: genId("r") }],
        defaultHandle: "else",
      };
    case "delay":
      return { seconds: 60 };
    case "set_variable":
      return { name: "", value: "" };
    case "jump":
      return { targetNodeId: "" };
    case "end":
      return { message: "", buttonText: "", suppressHours: 24, stopConfirmText: "" };
    default:
      return {};
  }
}

/* ---------------------------------------------------------------- delays */

export type DelayUnit = "seconds" | "minutes" | "hours";
export const MAX_DELAY_SECONDS = 24 * 60 * 60;
export const DELAY_UNIT_SECONDS: Record<DelayUnit, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
};

export function clampDelaySeconds(sec: number): number {
  if (!Number.isFinite(sec) || sec <= 0) return 0;
  return Math.min(MAX_DELAY_SECONDS, Math.round(sec));
}

export function splitDelay(sec: number): { value: number; unit: DelayUnit } {
  const s = clampDelaySeconds(sec);
  if (s > 0 && s % 3600 === 0) return { value: s / 3600, unit: "hours" };
  if (s > 0 && s % 60 === 0) return { value: s / 60, unit: "minutes" };
  return { value: s, unit: "seconds" };
}

export function toDelaySeconds(value: number, unit: DelayUnit): number {
  return clampDelaySeconds((Number(value) || 0) * DELAY_UNIT_SECONDS[unit]);
}

export function describeDelay(sec: number): string {
  const s = clampDelaySeconds(sec);
  if (s <= 0) return "No wait";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  return [h && `${h}h`, m && `${m}m`, rem && `${rem}s`].filter(Boolean).join(" ");
}

/* -------------------------------------------------------------- summaries */

const truncate = (s: unknown, n = 90) => {
  const str = String(s ?? "").replace(/\s+/g, " ").trim();
  return str.length > n ? `${str.slice(0, n)}…` : str;
};

const MATCH_LABELS: Record<string, string> = {
  any: "Any message",
  exact: "Exact keyword",
  contains: "Message contains",
  welcome: "First-ever message",
  default: "Fallback (nothing else matched)",
  table: "Names one of your tables",
  order: "Order status update",
  loyalty: "Loyalty points",
};

export function matchLabel(matchType?: string): string {
  return MATCH_LABELS[matchType || "any"] || matchType || "Any message";
}

/** One-line preview shown on a step card. */
export function nodeSummary(type: FlowNodeType, data: any): string {
  switch (type) {
    case "trigger": {
      const mt = String(data?.matchType || "any");
      if (mt === "order") return `When an order becomes “${data?.orderStatus || "—"}”.`;
      if (mt === "loyalty") return `When loyalty points are ${data?.loyaltyEvent || "—"}.`;
      if (mt === "exact" || mt === "contains") {
        const kw = (data?.keywords || []).join(", ");
        return kw
          ? `When the message ${mt === "exact" ? "is exactly" : "contains"} ${kw}.`
          : "No keywords set yet.";
      }
      return `${matchLabel(mt)}.`;
    }
    case "send_text":
      return truncate(data?.text) || "No message written yet.";
    case "send_image":
      return data?.mediaUrl ? truncate(data.caption) || truncate(data.mediaUrl, 60) : "No image chosen.";
    case "send_video":
      return data?.mediaUrl ? truncate(data.caption) || truncate(data.mediaUrl, 60) : "No video chosen.";
    case "send_audio":
      return data?.mediaUrl ? truncate(data.mediaUrl, 60) : "No audio chosen.";
    case "send_document":
      return data?.filename || (data?.mediaUrl ? truncate(data.mediaUrl, 60) : "No document chosen.");
    case "send_catalog":
      return truncate(data?.text) || "Your WhatsApp catalogue.";
    case "buttons": {
      const items = (data?.items as ButtonItem[]) || [];
      const labels = items.map((i) => i.label).filter(Boolean).join(" · ");
      return labels ? `${truncate(data?.text, 50)} → ${labels}` : "No buttons yet.";
    }
    case "link_button":
      return data?.buttonText
        ? `Button “${data.buttonText}” → ${truncate(data?.url, 40) || "no link"}`
        : "No button label yet.";
    case "wait_for_reply":
      return `Waits, then stores the answer in {{${data?.variableName || "reply"}}}.`;
    case "condition": {
      const rules = (data?.rules as ConditionRule[]) || [];
      return rules.length
        ? `${rules.length} rule${rules.length === 1 ? "" : "s"}, then otherwise.`
        : "No rules yet.";
    }
    case "delay":
      return `Waits ${describeDelay(Number(data?.seconds) || 0)}.`;
    case "set_variable":
      return `{{${data?.name || "?"}}} = ${truncate(data?.value, 40) || "—"}`;
    case "jump":
      return data?.targetNodeId ? "Continues from another step." : "No target step chosen.";
    case "end":
      return data?.buttonText
        ? `Opt-out button: ${truncate(data.buttonText, 30)}`
        : truncate(data?.message) || "Ends the conversation.";
    default:
      return "";
  }
}

export function describeRule(r: ConditionRule): string {
  const left = r.var ? `{{${r.var}}}` : "their reply";
  if (r.op === "isEmpty") return `${left} is empty`;
  const op =
    r.op === "equals" ? "is" : r.op === "contains" ? "contains" : r.op === "gt" ? ">" : "<";
  return `${left} ${op} ${r.value || "—"}`;
}

/** The list row's trigger chip — same wording as admin-v2's `triggerSummary`. */
export function triggerChip(triggers?: TriggerDef[] | null): string {
  const t = triggers?.[0];
  if (!t) return "No trigger set";
  if (t.matchType === "exact" || t.matchType === "contains") {
    const kw = (t.keywords || []).join(", ");
    return kw ? `${t.matchType}: ${kw}` : `${t.matchType}: —`;
  }
  if (t.matchType === "welcome") return "On first message";
  if (t.matchType === "any") return "On any message";
  if (t.matchType === "default") return "Fallback (no match)";
  if (t.matchType === "table") return "Names a table";
  if (t.matchType === "order") return `On order: ${t.orderStatus || "—"}`;
  if (t.matchType === "loyalty") return `On loyalty: ${t.loyaltyEvent || "—"}`;
  return String(t.matchType);
}

/* ------------------------------------------------------------------ wiring */

export interface NodeOutput {
  /** `null` is the node's single unnamed output. */
  handle: string | null;
  label: string;
}

/** The outgoing connection points a step offers. */
export function outputsOf(node: EditorNode): NodeOutput[] {
  const data = (node.data || {}) as any;
  if (node.type === "buttons") {
    return ((data.items as ButtonItem[]) || []).map((it, i) => ({
      handle: it.id,
      label: it.label || `Button ${i + 1}`,
    }));
  }
  if (node.type === "condition") {
    const rules = (data.rules as ConditionRule[]) || [];
    return [
      ...rules.map((r) => ({ handle: r.handle, label: describeRule(r) })),
      { handle: "else", label: "Otherwise" },
    ];
  }
  if (node.type === "end" || node.type === "jump") return [];
  return [{ handle: null, label: "Next step" }];
}

/** Human label for the branch an edge represents, or `undefined` for a plain next. */
export function branchLabel(source: EditorNode, handle: string | null): string | undefined {
  if (handle == null) return undefined;
  const out = outputsOf(source).find((o) => o.handle === handle);
  return out?.label;
}

/* ------------------------------------------------------------ reading order */

export interface OrderedStep {
  node: EditorNode;
  /** Label of the branch that led here, when it wasn't the plain next step. */
  via?: string;
  /** False for steps nothing points at — shown in their own group. */
  reachable: boolean;
}

/**
 * Flatten the graph into the single column the design draws.
 *
 * Depth-first from every trigger, following each node's outputs in the order
 * the node itself declares them, so a `buttons` step is immediately followed by
 * its first branch. Nodes reachable from two places appear once (at the first
 * place they are reached) — the second route shows up as a "Jump"-style note on
 * the step that points at it, never as a duplicate card. Anything unreachable
 * is appended so it can still be edited or deleted.
 */
export function orderSteps(nodes: EditorNode[], edges: EditorEdge[]): OrderedStep[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: OrderedStep[] = [];
  const seen = new Set<string>();

  const walk = (id: string, via?: string) => {
    if (seen.has(id)) return;
    const node = byId.get(id);
    if (!node) return;
    seen.add(id);
    out.push({ node, via, reachable: true });

    for (const o of outputsOf(node)) {
      const edge = edges.find(
        (e) => e.source === id && (e.sourceHandle ?? null) === o.handle,
      );
      if (edge) walk(edge.target, o.handle == null ? undefined : o.label);
    }
  };

  for (const n of nodes) if (n.type === "trigger") walk(n.id);
  for (const n of nodes) {
    if (!seen.has(n.id)) out.push({ node: n, reachable: false });
  }
  return out;
}

/** The step a given output currently points at, if any. */
export function targetOf(
  edges: EditorEdge[],
  sourceId: string,
  handle: string | null,
): string {
  const e = edges.find(
    (x) => x.source === sourceId && (x.sourceHandle ?? null) === handle,
  );
  return e?.target || "";
}

/** Rewire one output. Passing an empty target just disconnects it. */
export function setTarget(
  edges: EditorEdge[],
  sourceId: string,
  handle: string | null,
  targetId: string,
): EditorEdge[] {
  const kept = edges.filter(
    (e) => !(e.source === sourceId && (e.sourceHandle ?? null) === handle),
  );
  if (!targetId) return kept;
  return [
    ...kept,
    {
      id: genId("e"),
      source: sourceId,
      target: targetId,
      sourceHandle: handle,
      targetHandle: null,
    },
  ];
}

/** Build the document that goes to the API — identical shape to admin-v2's. */
export function buildGraph(nodes: EditorNode[], edges: EditorEdge[]): FlowGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position || { x: 0, y: 0 },
      data: (n.data || {}) as Record<string, unknown>,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      label: typeof e.label === "string" ? e.label : undefined,
    })),
  };
}

/**
 * The same checks `validateGraph` runs server-side, surfaced as a single
 * partner-facing line in the editor footer so a save can't fail for a reason
 * that was visible all along. Returns `null` when the flow is fine.
 */
export function graphProblem(nodes: EditorNode[]): string | null {
  if (nodes.length === 0) return "Add a trigger to start this flow.";
  if (!nodes.some((n) => n.type === "trigger"))
    return "This flow needs a trigger step.";
  for (const n of nodes) {
    const d = (n.data || {}) as any;
    if (n.type === "trigger" && d.matchType === "order" && !d.orderStatus)
      return "The order trigger needs an order status.";
    if (n.type === "trigger" && d.matchType === "loyalty" && !d.loyaltyEvent)
      return "The loyalty trigger needs an event.";
    if (n.type === "wait_for_reply" && !d.variableName)
      return "A “Wait for reply” step needs a variable name.";
    if (n.type === "buttons") {
      const items = (d.items as ButtonItem[]) || [];
      if (items.length === 0) return "A buttons step needs at least one button.";
      if (items.length > 3) return "WhatsApp allows at most 3 buttons per step.";
    }
  }
  return null;
}

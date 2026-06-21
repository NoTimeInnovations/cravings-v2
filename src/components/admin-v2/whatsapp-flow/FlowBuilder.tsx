"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadFileToS3 } from "@/app/actions/aws-s3";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  MarkerType,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ChevronLeft,
  Save,
  Trash2,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  ListChecks,
  MessageCircleQuestion,
  GitBranch,
  Clock,
  Variable,
  CornerUpRight,
  Square,
  Zap,
  Plus,
  Loader2,
  Upload,
  AudioLines,
  ExternalLink,
} from "lucide-react";
import type {
  FlowNodeType,
  FlowGraph,
  ButtonItem,
  ConditionRule,
} from "@/lib/whatsappFlow/types";
import {
  ORDER_STATUSES,
  ORDER_FLOW_VARIABLES,
  LOYALTY_EVENTS,
  LOYALTY_FLOW_VARIABLES,
} from "@/lib/whatsappFlow/types";

const NODE_META: Record<FlowNodeType, { label: string; icon: React.ElementType; accent: string }> = {
  trigger: { label: "Trigger", icon: Zap, accent: "#f59e0b" },
  send_text: { label: "Send text", icon: MessageSquare, accent: "#16a34a" },
  send_image: { label: "Send image", icon: ImageIcon, accent: "#0ea5e9" },
  send_audio: { label: "Send audio", icon: AudioLines, accent: "#14b8a6" },
  send_document: { label: "Send document", icon: FileText, accent: "#6366f1" },
  buttons: { label: "Buttons", icon: ListChecks, accent: "#a855f7" },
  link_button: { label: "Link button", icon: ExternalLink, accent: "#2563eb" },
  wait_for_reply: { label: "Wait for reply", icon: MessageCircleQuestion, accent: "#ec4899" },
  condition: { label: "Condition", icon: GitBranch, accent: "#f97316" },
  delay: { label: "Delay", icon: Clock, accent: "#64748b" },
  set_variable: { label: "Set variable", icon: Variable, accent: "#0d9488" },
  jump: { label: "Jump", icon: CornerUpRight, accent: "#d97706" },
  end: { label: "End", icon: Square, accent: "#ef4444" },
};

// Steps that can be added from the palette. "trigger" is included so a flow can
// have multiple entry points (e.g. a keyword trigger AND an order-status trigger).
const PALETTE: FlowNodeType[] = [
  "trigger",
  "send_text",
  "send_image",
  "send_audio",
  "send_document",
  "buttons",
  "link_button",
  "wait_for_reply",
  "condition",
  "delay",
  "set_variable",
  "jump",
  "end",
];

let idSeq = 0;
const genId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${idSeq++}`;

function defaultData(type: FlowNodeType): Record<string, unknown> {
  switch (type) {
    case "trigger":
      return { matchType: "any", keywords: [] };
    case "send_text":
      return { text: "" };
    case "send_image":
      return { mediaUrl: "", caption: "" };
    case "send_audio":
      return { mediaUrl: "" };
    case "send_document":
      return { mediaUrl: "", filename: "", caption: "" };
    case "buttons":
      return { text: "Choose an option:", items: [{ id: genId("opt"), label: "Option 1" }] };
    case "link_button":
      return { text: "", buttonText: "Open", url: "" };
    case "wait_for_reply":
      return { variableName: "reply", validation: "text", retryText: "" };
    case "condition":
      return { rules: [{ var: "", op: "equals", value: "", handle: genId("r") }], defaultHandle: "else" };
    case "delay":
      return { seconds: 1 };
    case "set_variable":
      return { name: "", value: "" };
    case "jump":
      return { targetNodeId: "" };
    case "end":
      return { message: "", buttonText: "" };
    default:
      return {};
  }
}

function getBranches(type: FlowNodeType, data: any): { id: string; label: string }[] {
  if (type === "buttons") {
    return ((data?.items as ButtonItem[]) || []).map((it) => ({ id: it.id, label: it.label || it.id }));
  }
  if (type === "condition") {
    const rules = ((data?.rules as ConditionRule[]) || []).map((r) => ({
      id: r.handle,
      label: `${r.var || "reply"} ${r.op}${r.op === "isEmpty" ? "" : " " + (r.value ?? "")}`.trim(),
    }));
    return [...rules, { id: "else", label: "else" }];
  }
  return [];
}

function nodeSummary(type: FlowNodeType, data: any): string {
  const t = (s: any, n = 48) => {
    const str = String(s ?? "");
    return str.length > n ? str.slice(0, n) + "…" : str;
  };
  switch (type) {
    case "trigger": {
      const mt = data?.matchType || "any";
      if (mt === "order") return `on order: ${data?.orderStatus || "?"}`;
      const kw = (data?.keywords || []).join(", ");
      return mt === "exact" || mt === "contains" ? `${mt}: ${kw || "—"}` : `on ${mt}`;
    }
    case "send_text":
      return t(data?.text) || "Empty message";
    case "send_image":
      return data?.mediaUrl ? t(data.mediaUrl) : "No image";
    case "send_audio":
      return data?.mediaUrl ? t(data.mediaUrl) : "No audio";
    case "send_document":
      return data?.filename || (data?.mediaUrl ? t(data.mediaUrl) : "No document");
    case "buttons":
      return `${(data?.items || []).length} button(s)`;
    case "link_button":
      return data?.buttonText ? `🔗 ${data.buttonText}` : "Link button";
    case "wait_for_reply":
      return `→ {{${data?.variableName || "reply"}}}`;
    case "condition":
      return `${(data?.rules || []).length} rule(s)`;
    case "delay":
      return `${data?.seconds || 0}s`;
    case "set_variable":
      return `${data?.name || "?"} = ${t(data?.value, 20)}`;
    case "jump":
      return data?.targetNodeId ? "jump" : "No target";
    case "end":
      return data?.buttonText
        ? `🛑 opt-out: ${t(data.buttonText, 24)}`
        : t(data?.message) || "End of flow";
    default:
      return "";
  }
}

// ─── Custom node card (one component for every node type) ─────────
function FlowNodeCard({ type, data, selected }: NodeProps) {
  const nt = type as FlowNodeType;
  const meta = NODE_META[nt] || NODE_META.send_text;
  const Icon = meta.icon;
  const branches = getBranches(nt, data);
  const hasTarget = nt !== "trigger";

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm min-w-[160px] max-w-[240px] ${
        selected ? "ring-2 ring-orange-500" : ""
      }`}
    >
      {hasTarget && <Handle type="target" position={Position.Left} />}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Icon className="h-4 w-4" style={{ color: meta.accent }} />
        <span className="text-xs font-semibold">{meta.label}</span>
      </div>
      <div className="px-3 py-2 text-xs text-gray-500 break-words">
        {nodeSummary(nt, data)}
      </div>
      {branches.length > 0 ? (
        <div className="pb-2">
          {branches.map((b, i) => (
            <div key={b.id} className="relative px-3 py-1 text-[11px] text-right text-gray-600">
              <span className="truncate inline-block max-w-[180px] align-middle">{b.label}</span>
              <Handle
                type="source"
                id={b.id}
                position={Position.Right}
                style={{ top: `${((i + 1) / (branches.length + 1)) * 100}%` }}
              />
            </div>
          ))}
        </div>
      ) : nt !== "end" ? (
        <Handle type="source" position={Position.Right} />
      ) : null}
    </div>
  );
}

const nodeTypes = Object.fromEntries(
  Object.keys(NODE_META).map((k) => [k, FlowNodeCard]),
) as Record<string, typeof FlowNodeCard>;

// ─── Builder ─────────────────────────────────────────────────────
export function FlowBuilder(props: {
  partnerId?: string;
  flowId: string | null;
  loyaltyEnabled?: boolean;
  onClose: () => void;
}) {
  return (
    <ReactFlowProvider>
      <BuilderInner {...props} />
    </ReactFlowProvider>
  );
}

function BuilderInner({
  partnerId,
  flowId,
  loyaltyEnabled,
  onClose,
}: {
  partnerId?: string;
  flowId: string | null;
  loyaltyEnabled?: boolean;
  onClose: () => void;
}) {
  const isNew = !flowId;
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [escapeKeyword, setEscapeKeyword] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  // Seed a trigger node for new flows; hydrate from the API for existing ones.
  useEffect(() => {
    if (isNew) {
      setNodes([
        {
          id: "trigger",
          type: "trigger",
          position: { x: 140, y: 220 },
          data: defaultData("trigger"),
        },
      ]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/whatsapp/flows/${flowId}?partnerId=${partnerId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.flow) {
          toast.error(data?.error || "Could not load flow");
          onClose();
          return;
        }
        const g: FlowGraph = data.flow.graph || { nodes: [], edges: [] };
        setName(data.flow.name || "");
        setEscapeKeyword(data.flow.escape_keyword || "");
        setNodes(
          (g.nodes || []).map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position || { x: 0, y: 0 },
            data: n.data || {},
          })) as Node[],
        );
        setEdges(
          (g.edges || []).map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle ?? null,
            targetHandle: e.targetHandle ?? null,
            label: e.label,
            markerEnd: { type: MarkerType.ArrowClosed },
          })) as Edge[],
        );
      } catch {
        if (!cancelled) {
          toast.error("Could not load flow");
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  const addNode = (type: FlowNodeType) => {
    const id = genId(type);
    setNodes((ns) => [
      ...ns,
      {
        id,
        type,
        position: { x: 420 + ns.length * 16, y: 120 + ns.length * 16 },
        data: defaultData(type),
      } as Node,
    ]);
    setSelectedId(id);
  };

  const updateNodeData = (id: string, patch: Record<string, unknown>) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  };

  // Drop edges leaving `nodeId` whose branch handle no longer exists.
  const syncBranches = (nodeId: string, keep: string[]) => {
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId || keep.includes(e.sourceHandle || "")),
    );
  };

  const deleteNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  };

  const buildGraph = (): FlowGraph => ({
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as FlowNodeType,
      position: n.position,
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
  });

  const onSaveClick = () => {
    if (!nodes.some((n) => n.type === "trigger")) {
      toast.error("A flow must have a trigger step.");
      return;
    }
    setSaveOpen(true);
  };

  const confirmSave = async () => {
    if (!name.trim()) {
      toast.error("Give your flow a name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        partnerId,
        name: name.trim(),
        graph: buildGraph(),
        escapeKeyword: escapeKeyword.trim() || null,
      };
      const res = isNew
        ? await fetch("/api/whatsapp/flows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/whatsapp/flows/${flowId}?partnerId=${partnerId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save flow");
      toast.success(isNew ? "Flow created" : "Flow saved");
      setSaveOpen(false);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save flow");
    } finally {
      setSaving(false);
    }
  };

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId],
  );

  return (
    <div className="flex h-[calc(100vh-150px)] flex-col rounded-lg border bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="-ml-2">
          <ChevronLeft className="mr-1 h-4 w-4" /> Flows
        </Button>
        <span className="truncate text-sm font-medium">{name || "New flow"}</span>
        <Button
          onClick={onSaveClick}
          disabled={loading || saving}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Palette */}
          <div className="w-[190px] shrink-0 overflow-y-auto border-r p-2">
            <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">Add step</p>
            <div className="space-y-1">
              {PALETTE.map((type) => {
                const meta = NODE_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addNode(type)}
                    className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <Icon className="h-4 w-4" style={{ color: meta.accent }} />
                    <span className="flex-1">{meta.label}</span>
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canvas */}
          <div className="min-w-0 flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
              proOptions={{ hideAttribution: true }}
              fitView
            >
              <Background gap={18} />
            </ReactFlow>
          </div>

          {/* Inspector */}
          <div className="w-[310px] shrink-0 overflow-y-auto border-l p-3">
            {selectedNode ? (
              <Inspector
                node={selectedNode}
                allNodes={nodes}
                loyaltyEnabled={loyaltyEnabled}
                onChange={(patch) => updateNodeData(selectedNode.id, patch)}
                onSyncBranches={syncBranches}
                onDelete={() => deleteNode(selectedNode.id)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Click a step to edit it, or add steps from the left and drag between them to connect.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Save flow" : "Save changes"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Flow name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome menu" />
            </div>
            <div className="space-y-1.5">
              <Label>Stop keyword (optional)</Label>
              <Input
                value={escapeKeyword}
                onChange={(e) => setEscapeKeyword(e.target.value)}
                placeholder="e.g. stop"
              />
              <p className="text-xs text-muted-foreground">
                If the customer sends this word, the flow ends immediately.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={confirmSave}
              disabled={saving || !name.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isNew ? "Create flow" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Inspector (per-node config) ─────────────────────────────────
function Inspector({
  node,
  allNodes,
  loyaltyEnabled,
  onChange,
  onSyncBranches,
  onDelete,
}: {
  node: Node;
  allNodes: Node[];
  loyaltyEnabled?: boolean;
  onChange: (patch: Record<string, unknown>) => void;
  onSyncBranches: (nodeId: string, keep: string[]) => void;
  onDelete: () => void;
}) {
  const type = node.type as FlowNodeType;
  const data = (node.data || {}) as any;
  const meta = NODE_META[type];
  // Show the loyalty trigger only to partners with loyalty enabled — but always
  // show it when a flow already uses it, so existing loyalty flows stay editable.
  const showLoyalty = loyaltyEnabled || data.matchType === "loyalty";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <meta.icon className="h-4 w-4" style={{ color: meta.accent }} />
          <span className="text-sm font-semibold">{meta.label}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {type === "trigger" && (
        <>
          <Field label="When">
            <Select value={data.matchType || "any"} onValueChange={(v) => onChange({ matchType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any message</SelectItem>
                <SelectItem value="exact">Exact keyword</SelectItem>
                <SelectItem value="contains">Message contains</SelectItem>
                <SelectItem value="welcome">First-ever message</SelectItem>
                <SelectItem value="order">Order status update</SelectItem>
                {showLoyalty && <SelectItem value="loyalty">Loyalty points</SelectItem>}
              </SelectContent>
            </Select>
          </Field>
          {(data.matchType === "exact" || data.matchType === "contains") && (
            <Field label="Keywords (comma separated)">
              <KeywordsInput
                value={data.keywords || []}
                onChange={(keywords) => onChange({ keywords })}
                placeholder="hi, menu, order"
              />
            </Field>
          )}
          {data.matchType === "order" && (
            <>
              <Field label="Order status">
                <Select value={data.orderStatus || ""} onValueChange={(v) => onChange({ orderStatus: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a status…" /></SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="rounded-md border bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">Variables you can use</p>
                <p>
                  Put these in any message:{" "}
                  {ORDER_FLOW_VARIABLES.map((v) => `{{${v}}}`).join("  ")}
                </p>
              </div>
            </>
          )}
          {data.matchType === "loyalty" && (
            <>
              <Field label="Loyalty event">
                <Select value={data.loyaltyEvent || ""} onValueChange={(v) => onChange({ loyaltyEvent: v })}>
                  <SelectTrigger><SelectValue placeholder="Select an event…" /></SelectTrigger>
                  <SelectContent>
                    {LOYALTY_EVENTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="rounded-md border bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">Variables you can use</p>
                <p>
                  Put these in any message:{" "}
                  {LOYALTY_FLOW_VARIABLES.map((v) => `{{${v}}}`).join("  ")}
                </p>
              </div>
            </>
          )}
        </>
      )}

      {type === "send_text" && (
        <Field label="Message">
          <Textarea rows={5} value={data.text || ""} onChange={(e) => onChange({ text: e.target.value })} placeholder="Hi {{name}}, welcome!" />
        </Field>
      )}

      {type === "send_image" && (
        <>
          <MediaField label="Image" accept="image/*" value={data.mediaUrl || ""} onChange={(url) => onChange({ mediaUrl: url })} />
          <Field label="Caption"><Input value={data.caption || ""} onChange={(e) => onChange({ caption: e.target.value })} /></Field>
        </>
      )}

      {type === "send_audio" && (
        <MediaField label="Audio" accept="audio/*" value={data.mediaUrl || ""} onChange={(url) => onChange({ mediaUrl: url })} />
      )}

      {type === "send_document" && (
        <>
          <MediaField
            label="Document"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf"
            value={data.mediaUrl || ""}
            onChange={(url) => onChange({ mediaUrl: url })}
          />
          <Field label="File name"><Input value={data.filename || ""} onChange={(e) => onChange({ filename: e.target.value })} placeholder="menu.pdf" /></Field>
          <Field label="Caption"><Input value={data.caption || ""} onChange={(e) => onChange({ caption: e.target.value })} /></Field>
        </>
      )}

      {type === "buttons" && (
        <>
          <Field label="Message">
            <Textarea rows={3} value={data.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
          </Field>
          <Field label="Buttons (max 3)">
            <div className="space-y-2">
              {((data.items as ButtonItem[]) || []).map((it, i) => (
                <div key={it.id} className="flex items-center gap-1">
                  <Input
                    value={it.label}
                    onChange={(e) => {
                      const items = [...((data.items as ButtonItem[]) || [])];
                      items[i] = { ...items[i], label: e.target.value };
                      onChange({ items });
                    }}
                    placeholder={`Button ${i + 1}`}
                    maxLength={20}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const items = ((data.items as ButtonItem[]) || []).filter((_, j) => j !== i);
                      onChange({ items });
                      onSyncBranches(node.id, items.map((x) => x.id));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {((data.items as ButtonItem[]) || []).length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const items = [...((data.items as ButtonItem[]) || []), { id: genId("opt"), label: `Option ${((data.items as ButtonItem[]) || []).length + 1}` }];
                    onChange({ items });
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add button
                </Button>
              )}
            </div>
          </Field>
        </>
      )}

      {type === "link_button" && (
        <>
          <Field label="Message (caption)">
            <Textarea
              rows={4}
              value={data.text || ""}
              onChange={(e) => onChange({ text: e.target.value })}
              placeholder="Tap the button below to order."
            />
          </Field>
          <Field label="Button text">
            <Input
              value={data.buttonText || ""}
              onChange={(e) => onChange({ buttonText: e.target.value })}
              maxLength={20}
              placeholder="Order Now"
            />
          </Field>
          <Field label="Link URL">
            <Input
              value={data.url || ""}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://…  or  {{order_link}}"
            />
          </Field>
        </>
      )}

      {type === "wait_for_reply" && (
        <>
          <Field label="Store answer in variable"><Input value={data.variableName || ""} onChange={(e) => onChange({ variableName: e.target.value.replace(/[^\w]/g, "") })} placeholder="name" /></Field>
          <Field label="Expect">
            <Select value={data.validation || "text"} onValueChange={(v) => onChange({ validation: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Any text</SelectItem>
                <SelectItem value="number">A number</SelectItem>
                <SelectItem value="email">An email</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Retry message (optional)"><Input value={data.retryText || ""} onChange={(e) => onChange({ retryText: e.target.value })} placeholder="That doesn't look right, try again." /></Field>
        </>
      )}

      {type === "condition" && (
        <Field label="Rules (first match wins)">
          <div className="space-y-2">
            {((data.rules as ConditionRule[]) || []).map((r, i) => (
              <div key={r.handle} className="space-y-1 rounded-md border p-2">
                <Input
                  value={r.var || ""}
                  onChange={(e) => {
                    const rules = [...((data.rules as ConditionRule[]) || [])];
                    rules[i] = { ...rules[i], var: e.target.value };
                    onChange({ rules });
                  }}
                  placeholder="variable (blank = last reply)"
                />
                <div className="flex items-center gap-1">
                  <Select
                    value={r.op}
                    onValueChange={(v) => {
                      const rules = [...((data.rules as ConditionRule[]) || [])];
                      rules[i] = { ...rules[i], op: v as ConditionRule["op"] };
                      onChange({ rules });
                    }}
                  >
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">equals</SelectItem>
                      <SelectItem value="contains">contains</SelectItem>
                      <SelectItem value="isEmpty">is empty</SelectItem>
                      <SelectItem value="gt">&gt;</SelectItem>
                      <SelectItem value="lt">&lt;</SelectItem>
                    </SelectContent>
                  </Select>
                  {r.op !== "isEmpty" && (
                    <Input
                      value={r.value || ""}
                      onChange={(e) => {
                        const rules = [...((data.rules as ConditionRule[]) || [])];
                        rules[i] = { ...rules[i], value: e.target.value };
                        onChange({ rules });
                      }}
                      placeholder="value"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const rules = ((data.rules as ConditionRule[]) || []).filter((_, j) => j !== i);
                      onChange({ rules });
                      onSyncBranches(node.id, [...rules.map((x) => x.handle), "else"]);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rules = [...((data.rules as ConditionRule[]) || []), { var: "", op: "equals" as const, value: "", handle: genId("r") }];
                onChange({ rules });
              }}
            >
              <Plus className="mr-1 h-3 w-3" /> Add rule
            </Button>
            <p className="text-xs text-muted-foreground">Unmatched messages take the “else” branch.</p>
          </div>
        </Field>
      )}

      {type === "delay" && (
        <Field label="Wait (seconds, max 10)">
          <Input
            type="number"
            min={0}
            max={10}
            value={data.seconds ?? 1}
            onChange={(e) => onChange({ seconds: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
          />
        </Field>
      )}

      {type === "set_variable" && (
        <>
          <Field label="Variable name"><Input value={data.name || ""} onChange={(e) => onChange({ name: e.target.value.replace(/[^\w]/g, "") })} /></Field>
          <Field label="Value"><Input value={data.value || ""} onChange={(e) => onChange({ value: e.target.value })} placeholder="can use {{otherVar}}" /></Field>
        </>
      )}

      {type === "jump" && (
        <Field label="Jump to step">
          <Select value={data.targetNodeId || ""} onValueChange={(v) => onChange({ targetNodeId: v })}>
            <SelectTrigger><SelectValue placeholder="Select a step…" /></SelectTrigger>
            <SelectContent>
              {allNodes
                .filter((n) => n.id !== node.id)
                .map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {NODE_META[n.type as FlowNodeType]?.label} · {n.id.slice(0, 8)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {type === "end" && (
        <>
          <Field label="End message (optional)">
            <Textarea
              rows={3}
              value={data.message || ""}
              onChange={(e) => onChange({ message: e.target.value })}
              placeholder="Thanks! You're all set. 🎉"
            />
          </Field>
          <Field label="Opt-out button (optional)">
            <Input
              value={data.buttonText || ""}
              onChange={(e) => onChange({ buttonText: e.target.value })}
              placeholder="Stop these messages"
              maxLength={20}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Leave both blank to just end the flow. Add a message to send a closing
            note. If you also add a button, the message is sent with it — tapping it
            stops this flow from starting again for that customer for 24 hours.
          </p>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// Comma-separated keyword editor. Keeps the raw typed text in local state so a
// comma (and the space after it) survives keystrokes — deriving the input value
// from keywords.join(", ") while parsing with .filter(Boolean) would strip the
// trailing empty segment on every keypress, making it impossible to type a comma.
function KeywordsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (keywords: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => (value || []).join(", "));
  const lastEmitted = useRef((value || []).join(", "));
  // Adopt the upstream value only when it changes to something we didn't just
  // emit (e.g. a different trigger node is selected).
  useEffect(() => {
    const joined = (value || []).join(", ");
    if (joined !== lastEmitted.current) {
      setText(joined);
      lastEmitted.current = joined;
    }
  }, [value]);
  return (
    <Input
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = raw.split(",").map((s) => s.trim()).filter(Boolean);
        lastEmitted.current = parsed.join(", ");
        onChange(parsed);
      }}
    />
  );
}

// Media input: paste a link OR upload a file (uploaded to S3 via uploadFileToS3,
// the same helper the rest of the app uses). The resulting URL is stored either
// way, so the engine just sends a link.
function MediaField({
  label,
  accept,
  value,
  onChange,
}: {
  label: string;
  accept: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const safe = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9.\-_]/g, "");
      const url = await uploadFileToS3(dataUrl, `whatsapp-flow/${Date.now()}_${safe}`);
      onChange(url);
      toast.success(`${label} uploaded`);
    } catch {
      toast.error("Upload failed — try a smaller file or paste a link.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label} — upload or paste a link</Label>
      <div className="flex gap-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title={`Upload ${label.toLowerCase()}`}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {value && <p className="truncate text-[11px] text-muted-foreground">{value}</p>}
    </div>
  );
}

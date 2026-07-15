"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  Position,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CallLoggerApi, type FlowGraph } from "@/lib/callLogger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Clock, GitBranch, Phone, Plus, Save, Send, Trash2 } from "lucide-react";
import TemplatePicker from "./TemplatePicker";

type Kind = "trigger" | "send" | "wait" | "condition";

const KIND_LABEL: Record<Kind, string> = {
  trigger: "Call received",
  send: "Send WhatsApp",
  wait: "Wait",
  condition: "Condition",
};
const KIND_COLOR: Record<Kind, string> = {
  trigger: "#2563eb",
  send: "#16a34a",
  wait: "#ea580c",
  condition: "#7c3aed",
};

function summary(d: Record<string, unknown>): string {
  switch (d.kind as Kind) {
    case "trigger": return "When a call comes in";
    case "send": return (d.template as string) || "(pick a template)";
    case "wait": return `${d.seconds || 0}s`;
    case "condition": return `If ${String(d.check || "not_replied").replace("_", " ")}`;
    default: return "";
  }
}

function ClNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const kind = d.kind as Kind;
  return (
    <div className="w-44 rounded-lg border bg-card p-3 text-xs shadow-sm">
      {kind !== "trigger" && <Handle type="target" position={Position.Top} />}
      <div className="font-semibold" style={{ color: KIND_COLOR[kind] }}>
        {KIND_LABEL[kind]}
      </div>
      <div className="text-muted-foreground">{summary(d)}</div>
      {kind === "condition" ? (
        <>
          <Handle id="true" type="source" position={Position.Bottom} style={{ left: "30%", background: "#16a34a" }} />
          <Handle id="false" type="source" position={Position.Bottom} style={{ left: "70%", background: "#dc2626" }} />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  );
}

const nodeTypes = { cl: ClNode };

function toRf(graph: FlowGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graph.nodes.map((n, i) => ({
    id: n.id,
    type: "cl",
    position: n.position ?? { x: 80, y: 40 + i * 130 },
    data: { kind: n.type, ...(n.data ?? {}) },
  }));
  const edges: Edge[] = graph.edges
    .filter((e) => e.to)
    .map((e) => ({
      id: `${e.from}->${e.to}:${e.branch ?? ""}`,
      source: e.from,
      target: e.to as string,
      sourceHandle: e.branch ?? null,
      label: e.branch ?? undefined,
    }));
  return { nodes, edges };
}

function toGraph(nodes: Node[], edges: Edge[]): FlowGraph {
  return {
    nodes: nodes.map((n) => {
      const nd = n.data as Record<string, unknown>;
      const kind = nd.kind as Kind;
      const data: Record<string, unknown> = {};
      if (kind === "trigger") data.event = "call_received";
      if (kind === "send") {
        data.template = nd.template ?? "";
        data.language = nd.language ?? "en";
        data.params = nd.params ?? [];
        data.headerImage = nd.headerImage ?? "";
      }
      if (kind === "wait") data.seconds = Number(nd.seconds) || 0;
      if (kind === "condition") data.check = nd.check ?? "not_replied";
      return { id: n.id, type: kind, position: n.position, data };
    }),
    edges: edges.map((e) => ({
      from: e.source,
      to: e.target,
      ...(e.sourceHandle ? { branch: e.sourceHandle } : {}),
    })),
  };
}

export default function FlowBuilder({
  partnerId,
  accountEmail: _accountEmail,
}: {
  partnerId: string;
  accountEmail: string;
}) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [name, setName] = useState("Call follow-up");
  const [enabled, setEnabled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [counter, setCounter] = useState(1);

  useEffect(() => {
    CallLoggerApi.getFlow(partnerId)
      .then((res) => {
        let graph: FlowGraph = res.graph && res.graph.nodes ? res.graph : { nodes: [], edges: [] };
        if (!graph.nodes.some((n) => n.type === "trigger")) {
          graph = {
            nodes: [{ id: "trigger", type: "trigger", position: { x: 80, y: 40 }, data: {} }, ...graph.nodes],
            edges: graph.edges,
          };
        }
        const rf = toRf(graph);
        setNodes(rf.nodes);
        setEdges(rf.edges);
        setName(res.name ?? "Call follow-up");
        setEnabled(!!res.enabled);
        setCounter(1 + Math.max(0, ...graph.nodes.map((n) => Number(n.id.replace(/\D/g, "")) || 0)));
      })
      .catch((e) => setMsg(e.message))
      .finally(() => setLoading(false));
  }, [partnerId]);

  const onNodesChange = useCallback((c: NodeChange[]) => setNodes((ns) => applyNodeChanges(c, ns)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((es) => applyEdgeChanges(c, es)), []);
  const onConnect = useCallback((c: Connection) => {
    setEdges((es) => {
      const cleaned = es.filter(
        (e) => !(e.source === c.source && (e.sourceHandle ?? null) === (c.sourceHandle ?? null))
      );
      return addEdge(
        { ...c, id: `${c.source}->${c.target}:${c.sourceHandle ?? ""}`, label: c.sourceHandle ?? undefined },
        cleaned
      );
    });
  }, []);

  const addNode = (kind: Kind) => {
    const id = `n${counter}`;
    setCounter((v) => v + 1);
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "cl",
        position: { x: 120 + (counter % 3) * 40, y: 200 + (counter % 6) * 40 },
        data: {
          kind,
          ...(kind === "send" ? { template: "call_followup", language: "en", params: [] } : {}),
          ...(kind === "wait" ? { seconds: 86400 } : {}),
          ...(kind === "condition" ? { check: "not_replied" } : {}),
        },
      },
    ]);
    setSelectedId(id);
  };

  const patch = (data: Record<string, unknown>) =>
    setNodes((ns) => ns.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...data } } : n)));

  const deleteSelected = () => {
    if (!selectedId || selectedId === "trigger") return;
    setEdges((es) => es.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setNodes((ns) => ns.filter((n) => n.id !== selectedId));
    setSelectedId(null);
  };

  const save = async () => {
    if (nodes.filter((n) => (n.data as Record<string, unknown>).kind === "trigger").length !== 1) {
      setMsg("Need exactly one trigger");
      return;
    }
    try {
      await CallLoggerApi.saveFlow(partnerId, { name, enabled, graph: toGraph(nodes, edges) });
      setMsg("Saved");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading flow…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-52" />
        <div className="flex items-center gap-2">
          <Switch id="flow-enabled" checked={enabled} onCheckedChange={setEnabled} />
          <Label htmlFor="flow-enabled" className="text-sm">Enabled</Label>
        </div>
        <Button size="sm" variant="outline" onClick={() => addNode("send")}>
          <Send className="mr-1 h-4 w-4" /> Send
        </Button>
        <Button size="sm" variant="outline" onClick={() => addNode("wait")}>
          <Clock className="mr-1 h-4 w-4" /> Wait
        </Button>
        <Button size="sm" variant="outline" onClick={() => addNode("condition")}>
          <GitBranch className="mr-1 h-4 w-4" /> If
        </Button>
        <Button size="sm" onClick={save} className="ml-auto">
          <Save className="mr-1 h-4 w-4" /> Save flow
        </Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>

      <div className="flex gap-4">
        <Card className="h-[520px] flex-1 overflow-hidden p-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </Card>

        <Card className="w-72 p-4">
          {!selected && (
            <p className="text-sm text-muted-foreground">
              Select a node to edit it. Drag from a node&apos;s bottom dot to connect steps.
            </p>
          )}
          {selected && (
            <Inspector node={selected} patch={patch} onDelete={deleteSelected} partnerId={partnerId} />
          )}
        </Card>
      </div>
    </div>
  );
}

function Inspector({
  node,
  patch,
  onDelete,
  partnerId,
}: {
  node: Node;
  patch: (d: Record<string, unknown>) => void;
  onDelete: () => void;
  partnerId: string;
}) {
  const d = node.data as Record<string, unknown>;
  const kind = d.kind as Kind;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium" style={{ color: KIND_COLOR[kind] }}>
          {kind === "trigger" && <Phone className="h-4 w-4" />}
          {kind === "send" && <Send className="h-4 w-4" />}
          {kind === "wait" && <Clock className="h-4 w-4" />}
          {kind === "condition" && <GitBranch className="h-4 w-4" />}
          {KIND_LABEL[kind]}
        </span>
        {kind !== "trigger" && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {kind === "trigger" && (
        <p className="text-sm text-muted-foreground">Runs when a call is received.</p>
      )}

      {kind === "send" && (
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Template</Label>
            <TemplatePicker
              partnerId={partnerId}
              template={String(d.template ?? "")}
              language={String(d.language ?? "en")}
              params={(d.params as string[]) ?? []}
              headerImage={String(d.headerImage ?? "")}
              onChange={({ template, language }) => patch({ template, language })}
              onHeaderImageChange={(url) => patch({ headerImage: url })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Body params (one per line)</Label>
            <Textarea
              className="h-20"
              value={((d.params as string[]) ?? []).join("\n")}
              onChange={(e) =>
                patch({ params: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
              }
            />
            <p className="text-xs text-muted-foreground">{"{{contact_name}}, {{business_name}}, {{number}}"}</p>
          </div>
        </div>
      )}

      {kind === "wait" && (
        <div className="grid gap-1.5">
          <Label>Wait (seconds)</Label>
          <Input
            type="number"
            value={Number(d.seconds ?? 0)}
            onChange={(e) => patch({ seconds: Number(e.target.value) })}
          />
          <div className="mt-1 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => patch({ seconds: 3600 })}>1h</Button>
            <Button size="sm" variant="outline" onClick={() => patch({ seconds: 86400 })}>1d</Button>
            <Button size="sm" variant="outline" onClick={() => patch({ seconds: 604800 })}>7d</Button>
          </div>
        </div>
      )}

      {kind === "condition" && (
        <div className="grid gap-1.5">
          <Label>Check</Label>
          <Select value={String(d.check ?? "not_replied")} onValueChange={(v) => patch({ check: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_replied">Not replied</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Green dot = yes, red dot = no.</p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReactFlow,
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CallLoggerApi, type FlowGraph } from '@/lib/callLogger';

type Kind = 'trigger' | 'send' | 'wait' | 'condition';

const KIND_LABEL: Record<Kind, string> = {
  trigger: 'Call received',
  send: 'Send WhatsApp',
  wait: 'Wait',
  condition: 'Condition',
};
const KIND_COLOR: Record<Kind, string> = {
  trigger: '#1565c0', send: '#2e7d32', wait: '#ef6c00', condition: '#6a1b9a',
};

function summary(d: Record<string, unknown>): string {
  switch (d.kind as Kind) {
    case 'trigger': return 'When a call comes in';
    case 'send': return (d.template as string) || '(pick a template)';
    case 'wait': return `${d.seconds || 0}s`;
    case 'condition': return `If ${String(d.check || 'not_replied').replace('_', ' ')}`;
  }
}

function ClNode({ data }: NodeProps) {
  const kind = data.kind as Kind;
  return (
    <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', padding: 10, width: 176, fontSize: 12 }}>
      {kind !== 'trigger' && <Handle type="target" position={Position.Top} />}
      <div style={{ fontWeight: 600, color: KIND_COLOR[kind] }}>{KIND_LABEL[kind]}</div>
      <div style={{ color: '#64748b' }}>{summary(data)}</div>
      {kind === 'condition' ? (
        <>
          <Handle id="true" type="source" position={Position.Bottom} style={{ left: '30%', background: '#16a34a' }} />
          <Handle id="false" type="source" position={Position.Bottom} style={{ left: '70%', background: '#dc2626' }} />
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
    type: 'cl',
    position: n.position ?? { x: 80, y: 40 + i * 130 },
    data: { kind: n.type, ...(n.data ?? {}) },
  }));
  const edges: Edge[] = graph.edges
    .filter((e) => e.to)
    .map((e) => ({
      id: `${e.from}->${e.to}:${e.branch ?? ''}`,
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
      const kind = n.data.kind as Kind;
      const data: Record<string, unknown> = {};
      if (kind === 'trigger') data.event = 'call_received';
      if (kind === 'send') { data.template = n.data.template ?? ''; data.language = n.data.language ?? 'en'; data.params = n.data.params ?? []; }
      if (kind === 'wait') data.seconds = Number(n.data.seconds) || 0;
      if (kind === 'condition') data.check = n.data.check ?? 'not_replied';
      return { id: n.id, type: kind, position: n.position, data };
    }),
    edges: edges.map((e) => ({ from: e.source, to: e.target, ...(e.sourceHandle ? { branch: e.sourceHandle } : {}) })),
  };
}

export default function FlowBuilder({ partnerId, accountEmail }: { partnerId: string; accountEmail: string }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [name, setName] = useState('Call follow-up');
  const [enabled, setEnabled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [counter, setCounter] = useState(1);

  useEffect(() => {
    CallLoggerApi.getFlow(partnerId).then((res) => {
      let graph: FlowGraph = res.graph && res.graph.nodes ? res.graph : { nodes: [], edges: [] };
      if (!graph.nodes.some((n) => n.type === 'trigger')) {
        graph = { nodes: [{ id: 'trigger', type: 'trigger', position: { x: 80, y: 40 }, data: {} }, ...graph.nodes], edges: graph.edges };
      }
      const rf = toRf(graph);
      setNodes(rf.nodes);
      setEdges(rf.edges);
      setName(res.name ?? 'Call follow-up');
      setEnabled(!!res.enabled);
      setCounter(1 + Math.max(0, ...graph.nodes.map((n) => Number(n.id.replace(/\D/g, '')) || 0)));
    }).catch((e) => setMsg(e.message)).finally(() => setLoading(false));
  }, [partnerId]);

  const onNodesChange = useCallback((c: NodeChange[]) => setNodes((ns) => applyNodeChanges(c, ns)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((es) => applyEdgeChanges(c, es)), []);
  const onConnect = useCallback((c: Connection) => {
    setEdges((es) => {
      // one edge per source handle
      const cleaned = es.filter((e) => !(e.source === c.source && (e.sourceHandle ?? null) === (c.sourceHandle ?? null)));
      return addEdge({ ...c, id: `${c.source}->${c.target}:${c.sourceHandle ?? ''}`, label: c.sourceHandle ?? undefined }, cleaned);
    });
  }, []);

  const addNode = (kind: Kind) => {
    const id = `n${counter}`;
    setCounter((v) => v + 1);
    setNodes((ns) => [
      ...ns,
      { id, type: 'cl', position: { x: 120 + (counter % 3) * 40, y: 200 + (counter % 6) * 40 },
        data: { kind, ...(kind === 'send' ? { template: 'call_followup', language: 'en', params: [] } : {}), ...(kind === 'wait' ? { seconds: 86400 } : {}), ...(kind === 'condition' ? { check: 'not_replied' } : {}) } },
    ]);
    setSelectedId(id);
  };

  const patch = (data: Record<string, unknown>) =>
    setNodes((ns) => ns.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...data } } : n)));

  const deleteSelected = () => {
    if (!selectedId || selectedId === 'trigger') return;
    setEdges((es) => es.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setNodes((ns) => ns.filter((n) => n.id !== selectedId));
    setSelectedId(null);
  };

  const save = async () => {
    // client-side guard mirrors the Worker's validation
    if (nodes.filter((n) => n.data.kind === 'trigger').length !== 1) { setMsg('Need exactly one trigger'); return; }
    try {
      await CallLoggerApi.saveFlow(partnerId, { name, enabled, graph: toGraph(nodes, edges) });
      setMsg('Saved');
    } catch (e) { setMsg((e as Error).message); }
  };

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);

  if (loading) return <p>Loading flow…</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-3 py-1.5" />
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
        </label>
        <button onClick={() => addNode('send')} className="px-2 py-1 text-sm border rounded">+ Send</button>
        <button onClick={() => addNode('wait')} className="px-2 py-1 text-sm border rounded">+ Wait</button>
        <button onClick={() => addNode('condition')} className="px-2 py-1 text-sm border rounded">+ If</button>
        <button onClick={save} className="ml-auto px-3 py-1.5 rounded bg-blue-600 text-white">Save flow</button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>

      <div className="flex gap-4">
        <div style={{ height: 520 }} className="flex-1 border rounded">
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
        </div>

        <div className="w-72 border rounded p-3">
          {!selected && <p className="text-sm text-gray-500">Select a node to edit it. Drag from a node's bottom dot to connect.</p>}
          {selected && <Inspector node={selected} patch={patch} onDelete={deleteSelected} />}
        </div>
      </div>
    </div>
  );
}

function Inspector({ node, patch, onDelete }: { node: Node; patch: (d: Record<string, unknown>) => void; onDelete: () => void }) {
  const kind = node.data.kind as Kind;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium" style={{ color: KIND_COLOR[kind] }}>{KIND_LABEL[kind]}</span>
        {kind !== 'trigger' && <button onClick={onDelete} className="text-red-600 text-sm">Delete</button>}
      </div>

      {kind === 'trigger' && <p className="text-sm text-gray-500">Runs when a call is received.</p>}

      {kind === 'send' && (
        <>
          <Field label="Template name">
            <input className="border rounded px-2 py-1 w-full" value={String(node.data.template ?? '')} onChange={(e) => patch({ template: e.target.value })} />
          </Field>
          <Field label="Language">
            <input className="border rounded px-2 py-1 w-full" value={String(node.data.language ?? 'en')} onChange={(e) => patch({ language: e.target.value })} />
          </Field>
          <Field label="Body params (one per line)">
            <textarea
              className="border rounded px-2 py-1 w-full h-20"
              value={((node.data.params as string[]) ?? []).join('\n')}
              onChange={(e) => patch({ params: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
            />
            <p className="text-xs text-gray-400">{'{{contact_name}}, {{business_name}}, {{number}}'}</p>
          </Field>
        </>
      )}

      {kind === 'wait' && (
        <Field label="Wait (seconds)">
          <input type="number" className="border rounded px-2 py-1 w-full" value={Number(node.data.seconds ?? 0)} onChange={(e) => patch({ seconds: Number(e.target.value) })} />
          <div className="flex gap-2 mt-1 text-xs">
            <button className="underline" onClick={() => patch({ seconds: 3600 })}>1h</button>
            <button className="underline" onClick={() => patch({ seconds: 86400 })}>1d</button>
            <button className="underline" onClick={() => patch({ seconds: 604800 })}>7d</button>
          </div>
        </Field>
      )}

      {kind === 'condition' && (
        <Field label="Check">
          <select className="border rounded px-2 py-1 w-full" value={String(node.data.check ?? 'not_replied')} onChange={(e) => patch({ check: e.target.value })}>
            <option value="not_replied">Not replied</option>
            <option value="replied">Replied</option>
          </select>
          <p className="text-xs text-gray-400">Green dot = yes, red dot = no.</p>
        </Field>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { uploadFileToS3 } from "@/app/actions/aws-s3";
import { cn } from "@/lib/utils";
import {
  LOYALTY_EVENTS,
  LOYALTY_FLOW_VARIABLES,
  MESSAGE_FLOW_VARIABLES,
  MESSAGE_FLOW_VARIABLE_INFO,
  ORDER_FLOW_VARIABLES,
  ORDER_STATUSES,
  type ButtonItem,
  type ConditionRule,
  type FlowGraph,
  type FlowNodeType,
} from "@/lib/whatsappFlow/types";
import { TestFlowDialog } from "@/components/admin-v2/whatsapp-flow/TestFlowDialog";
import { QuestionnaireEditor } from "@/components/admin-v2/whatsapp-flow/QuestionnaireEditor";
import { VariableTextInput } from "@/components/admin-v2/whatsapp-flow/VariableTextInput";
import {
  questionnaireVariables,
  type QuestionnaireData,
} from "@/lib/whatsappFlow/questionnaire";

import { AdminV3Button } from "../ui/primitives";
import {
  Chip,
  Field,
  FlowToggle,
  GroupLabel,
  SegButton,
  Segmented,
  SelectField,
  fieldLabelCls,
  inputCls,
  textareaCls,
} from "./kit";
import {
  DELAY_UNIT_SECONDS,
  MAX_DELAY_SECONDS,
  MESSAGE_TRIGGER_TYPES,
  NODE_META,
  PALETTE_LOGIC,
  PALETTE_SEND,
  buildGraph,
  clampDelaySeconds,
  defaultData,
  describeDelay,
  genId,
  graphProblem,
  matchLabel,
  nodeSummary,
  orderSteps,
  outputsOf,
  setTarget,
  splitDelay,
  targetOf,
  toDelaySeconds,
  type DelayUnit,
  type EditorEdge,
  type EditorNode,
} from "./graph";

/**
 * The v3 flow editor (design block "Flow editor").
 *
 * Where admin-v2's FlowBuilder is a free @xyflow canvas, this is the design's
 * three-pane editor: a step palette, a single readable column of steps, and an
 * inspector. The stored document is byte-for-byte the same `FlowGraph` — the
 * column is only a *reading order* derived from the graph (see graph.ts), and
 * branching is edited in the inspector's "What happens next" section rather
 * than by dragging wires. That is what makes a canvas-free editor safe: a flow
 * authored in admin-v2 opens here intact, and one authored here opens there.
 *
 * Every write goes through the exact endpoints admin-v2 uses:
 *   GET/PUT  /api/whatsapp/flows/<id>?partnerId=…
 *   POST     /api/whatsapp/flows
 */

const MATCH_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "Any message" },
  { value: "exact", label: "Exact keyword" },
  { value: "contains", label: "Contains" },
  { value: "welcome", label: "First message" },
  { value: "table", label: "Table named" },
  { value: "order", label: "Order update" },
  { value: "loyalty", label: "Loyalty" },
];

type RunMode = "every" | "once" | "cooldown";

export function FlowEditor({
  partnerId,
  flowId,
  loyaltyEnabled,
  onClose,
}: {
  partnerId?: string;
  /** null = create a new flow. */
  flowId: string | null;
  loyaltyEnabled?: boolean;
  /** Called after save/back — the list refetches. */
  onClose: () => void;
}) {
  const isNew = !flowId;

  const [nodes, setNodes] = React.useState<EditorNode[]>([]);
  const [edges, setEdges] = React.useState<EditorEdge[]>([]);
  const [name, setName] = React.useState("");
  const [enabled, setEnabled] = React.useState(true);
  const [escapeKeyword, setEscapeKeyword] = React.useState("");
  const [runMode, setRunMode] = React.useState<RunMode>("every");
  const [cooldownHours, setCooldownHours] = React.useState(24);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(!isNew);
  const [saving, setSaving] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [testOpen, setTestOpen] = React.useState(false);
  const [paletteQuery, setPaletteQuery] = React.useState("");

  /* ------------------------------------------------------------- hydrate */

  React.useEffect(() => {
    if (isNew) {
      const trigger: EditorNode = {
        id: "trigger",
        type: "trigger",
        position: { x: 140, y: 220 },
        data: defaultData("trigger"),
      };
      setNodes([trigger]);
      setEdges([]);
      setSelectedId(trigger.id);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/whatsapp/flows/${flowId}?partnerId=${partnerId}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.flow) {
          toast.error(data?.error || "Could not load this flow");
          onClose();
          return;
        }
        const g: FlowGraph = data.flow.graph || { nodes: [], edges: [] };
        setName(data.flow.name || "");
        setEnabled(!!data.flow.enabled);
        setEscapeKeyword(data.flow.escape_keyword || "");
        const cd = Number(data.flow.cooldown_hours) || 0;
        setRunMode(data.flow.once_per_user ? "once" : cd > 0 ? "cooldown" : "every");
        setCooldownHours(cd > 0 ? cd : 24);
        const loadedNodes = (g.nodes || []).map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position || { x: 0, y: 0 },
          data: (n.data || {}) as Record<string, unknown>,
        }));
        setNodes(loadedNodes);
        setEdges(
          (g.edges || []).map((e) => ({
            id: e.id || genId("e"),
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle ?? null,
            targetHandle: e.targetHandle ?? null,
            label: e.label,
          })),
        );
        setSelectedId(
          loadedNodes.find((n) => n.type === "trigger")?.id ||
            loadedNodes[0]?.id ||
            null,
        );
      } catch {
        if (!cancelled) {
          toast.error("Could not load this flow");
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // onClose is a stable callback from the list screen; re-running on it would
    // refetch the flow on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, partnerId, isNew]);

  /* --------------------------------------------------------------- derived */

  const steps = React.useMemo(() => orderSteps(nodes, edges), [nodes, edges]);
  const selected = React.useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId],
  );
  const problem = React.useMemo(() => graphProblem(nodes), [nodes]);
  const triggerCount = nodes.filter((n) => n.type === "trigger").length;

  const summary = React.useMemo(() => {
    const first = nodes.find((n) => n.type === "trigger");
    const mt = String((first?.data as any)?.matchType || "any");
    const stepWord = `${nodes.length} step${nodes.length === 1 ? "" : "s"}`;
    return first ? `${stepWord} · starts on ${matchLabel(mt).toLowerCase()}` : stepWord;
  }, [nodes]);

  /* ------------------------------------------------------------- mutations */

  const updateNodeData = (id: string, patch: Record<string, unknown>) =>
    setNodes((ns) =>
      ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    );

  /** The step a newly added one should hang off: the selection if it has a free
   *  output, else the last step in the column that does. */
  const findFreeTail = React.useCallback((): { id: string; handle: string | null } | null => {
    const free = (node: EditorNode) =>
      outputsOf(node).find((o) => !targetOf(edges, node.id, o.handle));
    if (selected) {
      const o = free(selected);
      if (o) return { id: selected.id, handle: o.handle };
    }
    for (let i = steps.length - 1; i >= 0; i--) {
      const o = free(steps[i].node);
      if (o) return { id: steps[i].node.id, handle: o.handle };
    }
    return null;
  }, [edges, selected, steps]);

  const addNode = (type: FlowNodeType) => {
    const id = genId(type);
    const tail = type === "trigger" ? null : findFreeTail();
    setNodes((ns) => [
      ...ns,
      {
        id,
        type,
        // Kept sane so the same document still lays out in admin-v2's canvas.
        position: { x: 420 + ns.length * 16, y: 120 + ns.length * 16 },
        data: defaultData(type),
      },
    ]);
    if (tail) setEdges((es) => setTarget(es, tail.id, tail.handle, id));
    setSelectedId(id);
    setSheetOpen(true);
  };

  const deleteNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
    setSheetOpen(false);
  };

  /** Drop edges leaving `nodeId` whose branch handle no longer exists. */
  const syncBranches = (nodeId: string, keep: string[]) =>
    setEdges((es) =>
      es.filter((e) => e.source !== nodeId || keep.includes(e.sourceHandle || "")),
    );

  const rewire = (sourceId: string, handle: string | null, targetId: string) =>
    setEdges((es) => setTarget(es, sourceId, handle, targetId));

  /* ------------------------------------------------------------------ save */

  const getGraph = React.useCallback(
    () => buildGraph(nodes, edges),
    [nodes, edges],
  );

  const save = async () => {
    if (!name.trim()) {
      toast.error("Give your flow a name.");
      return;
    }
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...(isNew ? { partnerId } : {}),
        name: name.trim(),
        enabled,
        graph: getGraph(),
        escapeKeyword: escapeKeyword.trim() || null,
        oncePerUser: runMode === "once",
        cooldownHours: runMode === "cooldown" ? cooldownHours : 0,
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
      // Saving also publishes questionnaire steps to WhatsApp; a warning means
      // the flow was stored but that form can't be sent yet.
      if (data?.warning) toast.warning(data.warning, { duration: 8000 });
      toast.success(isNew ? "Flow created" : "Flow saved");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save flow");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------------- palette */

  const filterPalette = (list: FlowNodeType[]) => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => NODE_META[t].label.toLowerCase().includes(q));
  };
  const sendItems = filterPalette(PALETTE_SEND);
  const logicItems = filterPalette(PALETTE_LOGIC);

  const selectedIndex = selected ? steps.findIndex((s) => s.node.id === selected.id) : -1;

  /* ------------------------------------------------------------------ view */

  return (
    <div className="flex min-h-[74vh] flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      {/* ---------------------------------------------------- sticky header */}
      <div className="sticky top-0 z-[6] flex flex-none flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white px-[14px] py-3 dark:border-zinc-800 dark:bg-zinc-950 lg:px-[clamp(14px,3vw,28px)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to flows"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>

        <div className="min-w-0 flex-[1_1_220px]">
          <input
            value={name}
            translate="no"
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this flow"
            aria-label="Flow name"
            className="notranslate -ml-1.5 w-full max-w-[320px] rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[16px] font-semibold tracking-[-0.02em] text-zinc-950 outline-none transition-colors hover:border-zinc-200 hover:bg-zinc-50 focus:border-zinc-300 focus:bg-white dark:text-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:focus:border-zinc-600 dark:focus:bg-zinc-900"
          />
          <div className="mt-0.5 text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            {loading ? "Loading…" : summary}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex h-[34px] flex-none items-center gap-2 rounded-md border border-zinc-200 bg-white pl-3 pr-2.5 dark:border-zinc-700 dark:bg-zinc-800">
            <span className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              {enabled ? "On" : "Off"}
            </span>
            <FlowToggle
              size="sm"
              on={enabled}
              label="Flow enabled"
              onClick={() => setEnabled((v) => !v)}
            />
          </div>

          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3"
            disabled={loading || !partnerId}
            onClick={() => setTestOpen(true)}
          >
            <Play size={14} strokeWidth={1.8} className="text-zinc-400 dark:text-zinc-500" />
            Test
          </AdminV3Button>

          <AdminV3Button
            variant="primary"
            className="h-[34px] px-3.5 font-medium"
            disabled={loading || saving}
            onClick={save}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={15} strokeWidth={1.7} />
            )}
            {saving ? "Saving…" : isNew ? "Create flow" : "Save"}
          </AdminV3Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20 text-zinc-400 dark:text-zinc-500">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-nowrap items-stretch overflow-hidden">
          {/* --------------------------------------------------- palette */}
          <div className="flex w-[58px] flex-none flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 xl:w-[190px]">
            <div className="hidden border-b border-zinc-100 p-3 dark:border-zinc-800 xl:block">
              <div className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 dark:border-zinc-700 dark:bg-zinc-800">
                <Search size={14} strokeWidth={1.8} className="flex-none text-zinc-400 dark:text-zinc-500" />
                <input
                  value={paletteQuery}
                  onChange={(e) => setPaletteQuery(e.target.value)}
                  placeholder="Find a step"
                  aria-label="Find a step"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] font-normal leading-none text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2.5">
              {sendItems.length > 0 && (
                <>
                  <GroupLabel className="hidden px-[9px] pb-1 pt-1.5 xl:block">
                    Send something
                  </GroupLabel>
                  {sendItems.map((t) => (
                    <PaletteItem key={t} type={t} onAdd={() => addNode(t)} />
                  ))}
                </>
              )}
              {sendItems.length > 0 && logicItems.length > 0 && (
                <div className="mx-1.5 my-2.5 h-px bg-zinc-100 dark:bg-zinc-800" />
              )}
              {logicItems.length > 0 && (
                <>
                  <GroupLabel className="hidden px-[9px] pb-1 pt-1.5 xl:block">
                    Then decide
                  </GroupLabel>
                  {logicItems.map((t) => (
                    <PaletteItem key={t} type={t} onAdd={() => addNode(t)} />
                  ))}
                </>
              )}
              {sendItems.length === 0 && logicItems.length === 0 && (
                <div className="hidden px-2 py-4 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500 xl:block">
                  No step matches “{paletteQuery}”.
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------- column */}
          <div className="flex min-h-0 min-w-0 flex-[1_1_240px] flex-col overflow-hidden bg-zinc-50 [background-image:radial-gradient(theme(colors.zinc.200)_1px,transparent_1px)] [background-size:18px_18px] dark:bg-zinc-950 dark:[background-image:radial-gradient(theme(colors.zinc.800)_1px,transparent_1px)]">
            <div className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
              <div className="mx-auto flex min-w-0 max-w-[520px] flex-col">
                {steps.map((s, i) => {
                  const prev = i > 0 ? steps[i - 1] : null;
                  return (
                    <React.Fragment key={s.node.id}>
                      {i > 0 &&
                        (s.reachable && prev?.reachable ? (
                          <Connector label={s.via} />
                        ) : !s.reachable && prev?.reachable ? (
                          <div className="py-3.5">
                            <GroupLabel>Not connected yet</GroupLabel>
                          </div>
                        ) : (
                          <div className="h-2.5" />
                        ))}
                      {i === 0 && !s.reachable && (
                        <div className="pb-3.5">
                          <GroupLabel>Not connected yet</GroupLabel>
                        </div>
                      )}
                      <StepCard
                        node={s.node}
                        selected={s.node.id === selectedId}
                        onSelect={() => {
                          setSelectedId(s.node.id);
                          setSheetOpen(true);
                        }}
                      />
                    </React.Fragment>
                  );
                })}

                {steps.length > 0 && (
                  <div className="flex flex-col items-center py-1.5">
                    <span className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => addNode("send_text")}
                  className="flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-zinc-300 bg-white/60 p-[13px] text-[12.5px] font-medium leading-none text-zinc-500 transition-colors hover:bg-white hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                >
                  <Plus size={14} strokeWidth={2} />
                  Add a step
                </button>
              </div>
            </div>

            {/* ------------------------------------------------- status bar */}
            <div className="flex flex-none flex-wrap items-center gap-2.5 border-t border-zinc-200 bg-white/[0.86] px-3.5 py-2.5 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/[0.86]">
              <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
                {selected && selectedIndex >= 0
                  ? `Step ${selectedIndex + 1} of ${steps.length} · ${NODE_META[selected.type].label}`
                  : `${steps.length} step${steps.length === 1 ? "" : "s"}`}
              </span>
              <span
                className={cn(
                  "text-[12px] font-normal leading-none",
                  problem
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-400 dark:text-zinc-500",
                )}
              >
                {problem || "Ready to save"}
              </span>
              {selected && !sheetOpen && (
                <AdminV3Button
                  variant="primary"
                  className="ml-auto h-8 px-3 text-[12.5px] font-medium lg:hidden"
                  onClick={() => setSheetOpen(true)}
                >
                  Edit step
                </AdminV3Button>
              )}
            </div>

          </div>

          {/* Scrim for the mobile inspector sheet — a sibling of the sheet so it
              covers the palette too, not just the step column. */}
          {sheetOpen && (
            <button
              type="button"
              aria-label="Close step editor"
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 z-20 bg-zinc-950/30 lg:hidden"
            />
          )}

          {/* -------------------------------------------------- inspector */}
          <div
            className={cn(
              "flex-col bg-white dark:bg-zinc-900",
              "absolute inset-x-0 bottom-0 z-30 max-h-[68dvh] rounded-t-2xl border-t border-zinc-200 shadow-[0_-8px_24px_rgba(9,9,11,.14)] dark:border-zinc-800",
              sheetOpen ? "flex" : "hidden",
              "lg:static lg:z-auto lg:flex lg:max-h-none lg:w-[330px] lg:flex-none lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none",
            )}
          >
            {selected ? (
              <Inspector
                node={selected}
                nodes={nodes}
                edges={edges}
                loyaltyEnabled={loyaltyEnabled}
                canDelete={!(selected.type === "trigger" && triggerCount <= 1)}
                sheetOpen={sheetOpen}
                escapeKeyword={escapeKeyword}
                runMode={runMode}
                cooldownHours={cooldownHours}
                onCloseSheet={() => setSheetOpen(false)}
                onChange={(patch) => updateNodeData(selected.id, patch)}
                onSyncBranches={syncBranches}
                onRewire={rewire}
                onDelete={() => deleteNode(selected.id)}
                onEscapeKeyword={setEscapeKeyword}
                onRunMode={setRunMode}
                onCooldownHours={setCooldownHours}
              />
            ) : (
              <div className="p-4 text-[12.5px] leading-[1.55] text-zinc-400 dark:text-zinc-500">
                Pick a step to edit it, or add one from the left.
              </div>
            )}
          </div>
        </div>
      )}

      <TestFlowDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        partnerId={partnerId}
        getGraph={getGraph}
      />
    </div>
  );
}

/* ------------------------------------------------------------ palette item */

function PaletteItem({ type, onAdd }: { type: FlowNodeType; onAdd: () => void }) {
  const meta = NODE_META[type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onAdd}
      title={`Add: ${meta.label}`}
      aria-label={`Add step: ${meta.label}`}
      className="flex w-full items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 max-xl:justify-center max-xl:px-0"
    >
      <Icon
        size={16}
        strokeWidth={1.8}
        className="flex-none text-zinc-500 dark:text-zinc-400"
      />
      <span className="hidden min-w-0 flex-1 truncate text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300 xl:block">
        {meta.label}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------- step card */

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1.5">
      <span className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
      {label ? (
        <Chip className="max-w-[240px] truncate bg-white dark:bg-zinc-900">{label}</Chip>
      ) : (
        <ArrowRight
          size={14}
          strokeWidth={1.8}
          className="rotate-90 text-zinc-400 dark:text-zinc-500"
        />
      )}
      <span className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
    </div>
  );
}

function StepCard({
  node,
  selected,
  onSelect,
}: {
  node: EditorNode;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = NODE_META[node.type] || NODE_META.send_text;
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "block w-full rounded-[10px] border-[1.5px] bg-white text-left transition-colors dark:bg-zinc-900",
        selected
          ? "border-zinc-900 shadow-[0_0_0_3px_rgba(9,9,11,.06)] dark:border-zinc-50"
          : "border-zinc-200 shadow-[0_1px_2px_rgba(9,9,11,.05)] hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
      )}
    >
      <div className="flex items-center gap-[9px] border-b border-zinc-100 px-[13px] py-[11px] dark:border-zinc-800">
        <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <Icon size={14} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
          {meta.label}
        </span>
        <Chip>{meta.kind}</Chip>
      </div>
      <div
        translate="no"
        className="notranslate px-[13px] py-[11px] text-[12.5px] font-normal leading-[1.5] text-zinc-600 [text-wrap:pretty] dark:text-zinc-300"
      >
        {nodeSummary(node.type, node.data)}
      </div>
    </button>
  );
}

/* -------------------------------------------------------------- inspector */

function Inspector({
  node,
  nodes,
  edges,
  loyaltyEnabled,
  canDelete,
  sheetOpen,
  escapeKeyword,
  runMode,
  cooldownHours,
  onCloseSheet,
  onChange,
  onSyncBranches,
  onRewire,
  onDelete,
  onEscapeKeyword,
  onRunMode,
  onCooldownHours,
}: {
  node: EditorNode;
  nodes: EditorNode[];
  edges: EditorEdge[];
  loyaltyEnabled?: boolean;
  canDelete: boolean;
  sheetOpen: boolean;
  escapeKeyword: string;
  runMode: RunMode;
  cooldownHours: number;
  onCloseSheet: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onSyncBranches: (nodeId: string, keep: string[]) => void;
  onRewire: (sourceId: string, handle: string | null, targetId: string) => void;
  onDelete: () => void;
  onEscapeKeyword: (v: string) => void;
  onRunMode: (v: RunMode) => void;
  onCooldownHours: (v: number) => void;
}) {
  const type = node.type;
  const data = (node.data || {}) as any;
  const meta = NODE_META[type];

  // Loyalty triggers stay visible for flows that already use one, so an existing
  // loyalty flow never becomes uneditable when the feature is off.
  const showLoyalty = !!loyaltyEnabled || data.matchType === "loyalty";

  const availableVariables = React.useMemo(() => {
    const set = new Set<string>();
    let hasOrder = false;
    let hasLoyalty = false;
    let hasMessage = false;
    for (const n of nodes) {
      const d = (n.data || {}) as any;
      if (n.type === "trigger") {
        if (d.matchType === "order") hasOrder = true;
        else if (d.matchType === "loyalty") hasLoyalty = true;
        else if (MESSAGE_TRIGGER_TYPES.has(String(d.matchType || "any"))) hasMessage = true;
      }
      if (n.type === "wait_for_reply" && d.variableName) set.add(String(d.variableName));
      if (n.type === "set_variable" && d.name) set.add(String(d.name));
      // A questionnaire contributes one variable per answerable question.
      if (n.type === "questionnaire") {
        for (const v of questionnaireVariables(d as QuestionnaireData)) set.add(v);
      }
    }
    if (hasOrder) ORDER_FLOW_VARIABLES.forEach((v) => set.add(v));
    if (hasLoyalty) LOYALTY_FLOW_VARIABLES.forEach((v) => set.add(v));
    if (hasMessage) MESSAGE_FLOW_VARIABLES.forEach((v) => set.add(v));
    return Array.from(set);
  }, [nodes]);

  const outputs = outputsOf(node);

  return (
    <>
      <div className="flex flex-none flex-wrap items-center gap-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            {meta.label}
          </div>
          <div className="mt-1 text-[12px] font-normal leading-[1.4] text-zinc-400 dark:text-zinc-500">
            {meta.hint}
          </div>
        </div>
        {sheetOpen && (
          <button
            type="button"
            onClick={onCloseSheet}
            title="Close"
            aria-label="Close step editor"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 lg:hidden"
          >
            <X size={15} strokeWidth={1.9} />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete step"
            aria-label="Delete step"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <Trash2 size={15} strokeWidth={1.7} />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-3.5">
        {/* ------------------------------------------------------ trigger */}
        {type === "trigger" && (
          <>
            <Field label="Match">
              <Segmented>
                {MATCH_OPTIONS.filter(
                  (o) => o.value !== "loyalty" || showLoyalty,
                ).map((o) => (
                  <SegButton
                    key={o.value}
                    active={String(data.matchType || "any") === o.value}
                    onClick={() => onChange({ matchType: o.value })}
                  >
                    {o.label}
                  </SegButton>
                ))}
              </Segmented>
            </Field>

            {(data.matchType === "exact" || data.matchType === "contains") && (
              <Field
                label="Keywords"
                hint={
                  data.matchType === "exact"
                    ? "Fires only when the whole message is one of these words."
                    : "Fires when the message contains any of these words."
                }
              >
                <KeywordsInput
                  value={(data.keywords as string[]) || []}
                  onChange={(keywords) => onChange({ keywords })}
                />
              </Field>
            )}

            {data.matchType === "table" && (
              <Hint>
                Fires when the customer names one of your tables — by number
                (“order from table 5”) or by the name printed on it. No keywords
                needed. <Code>{"{{table_name}}"}</Code> holds the table and{" "}
                <Code>{"{{order_link}}"}</Code> links straight to it.
              </Hint>
            )}

            {data.matchType === "order" && (
              <Field label="Order status" hint="Which status change starts this flow.">
                <SelectField
                  value={String(data.orderStatus || "")}
                  onChange={(v) => onChange({ orderStatus: v })}
                >
                  <option value="">Choose a status…</option>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </SelectField>
              </Field>
            )}

            {data.matchType === "loyalty" && (
              <Field label="Loyalty event">
                <SelectField
                  value={String(data.loyaltyEvent || "")}
                  onChange={(v) => onChange({ loyaltyEvent: v })}
                >
                  <option value="">Choose an event…</option>
                  {LOYALTY_EVENTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </SelectField>
              </Field>
            )}

            <VariableHelp
              matchType={String(data.matchType || "any")}
              showLoyalty={showLoyalty}
            />

            {/* Flow-level settings live on the trigger, exactly as the design
                puts "How often" in the trigger panel. */}
            <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Field
                label="How often"
                hint={
                  runMode === "every"
                    ? "Runs whenever the trigger matches."
                    : runMode === "once"
                      ? "Runs only the first time, for each customer — never again."
                      : `Runs once, then not again for that customer for ${cooldownHours} hour${cooldownHours === 1 ? "" : "s"}.`
                }
              >
                <SelectField value={runMode} onChange={(v) => onRunMode(v as RunMode)}>
                  <option value="every">Every time the trigger matches</option>
                  <option value="once">Only once per customer</option>
                  <option value="cooldown">Once per customer, then wait</option>
                </SelectField>
              </Field>
            </div>

            {runMode === "cooldown" && (
              <Field label="Don’t run again for (hours)">
                <input
                  type="number"
                  min={1}
                  max={8760}
                  value={cooldownHours}
                  onChange={(e) =>
                    onCooldownHours(
                      Math.max(1, Math.min(8760, Math.round(Number(e.target.value) || 1))),
                    )
                  }
                  className={inputCls}
                />
              </Field>
            )}

            <Field
              label="Stop keyword (optional)"
              hint="If the customer sends this word, the flow ends immediately."
            >
              <input
                value={escapeKeyword}
                onChange={(e) => onEscapeKeyword(e.target.value)}
                placeholder="e.g. stop"
                className={inputCls}
              />
            </Field>
          </>
        )}

        {/* ------------------------------------------------ text / catalog */}
        {(type === "send_text" || type === "send_catalog") && (
          <>
            <Field
              label={type === "send_catalog" ? "Message above the catalogue" : "Message"}
              right={`${String(data.text ?? "").length} chars`}
            >
              <VariableTextInput
                multiline
                rows={4}
                variables={availableVariables}
                value={String(data.text ?? "")}
                onChange={(v) => onChange({ text: v })}
                placeholder="What should this step say?"
                className={textareaCls}
              />
            </Field>
            <VariableChips
              variables={availableVariables}
              onInsert={(v) => onChange({ text: `${String(data.text ?? "")}{{${v}}}` })}
            />
            {type === "send_catalog" && (
              <Hint>
                Sends your WhatsApp catalogue as a card with a “View catalogue”
                button. Needs WhatsApp Catalogue switched on and synced —
                otherwise only this text is sent.
              </Hint>
            )}
            <Preview text={String(data.text ?? "")} cta={type === "send_catalog" ? "View catalogue" : undefined} />
          </>
        )}

        {/* ------------------------------------------------------- media */}
        {(type === "send_image" || type === "send_video" || type === "send_audio" || type === "send_document") && (
          <>
            <MediaField
              label={
                type === "send_image"
                  ? "Image"
                  : type === "send_video"
                    ? "Video"
                    : type === "send_audio"
                      ? "Audio"
                      : "Document"
              }
              accept={
                type === "send_image"
                  ? "image/*"
                  : type === "send_video"
                    ? "video/*"
                    : type === "send_audio"
                      ? "audio/*"
                      : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf"
              }
              value={String(data.mediaUrl ?? "")}
              onChange={(url) => onChange({ mediaUrl: url })}
            />
            {type === "send_document" && (
              <Field label="File name">
                <input
                  value={String(data.filename ?? "")}
                  onChange={(e) => onChange({ filename: e.target.value })}
                  placeholder="menu.pdf"
                  className={inputCls}
                />
              </Field>
            )}
            {type !== "send_audio" && (
              <Field label="Caption">
                <VariableTextInput
                  variables={availableVariables}
                  value={String(data.caption ?? "")}
                  onChange={(v) => onChange({ caption: v })}
                  placeholder="Optional"
                  className={inputCls}
                />
              </Field>
            )}
          </>
        )}

        {/* ------------------------------------------------------ buttons */}
        {type === "buttons" && (
          <>
            <Field label="Message">
              <VariableTextInput
                multiline
                rows={3}
                variables={availableVariables}
                value={String(data.text ?? "")}
                onChange={(v) => onChange({ text: v })}
                placeholder="Choose an option:"
                className={textareaCls}
              />
            </Field>
            <Field label="Buttons" hint="WhatsApp allows at most 3.">
              <div className="flex flex-col gap-2">
                {((data.items as ButtonItem[]) || []).map((it, i) => (
                  <div key={it.id} className="flex items-center gap-1.5">
                    <input
                      value={it.label}
                      maxLength={20}
                      placeholder={`Button ${i + 1}`}
                      onChange={(e) => {
                        const items = [...((data.items as ButtonItem[]) || [])];
                        items[i] = { ...items[i], label: e.target.value };
                        onChange({ items });
                      }}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      aria-label={`Remove button ${i + 1}`}
                      onClick={() => {
                        const items = ((data.items as ButtonItem[]) || []).filter(
                          (_, j) => j !== i,
                        );
                        onChange({ items });
                        onSyncBranches(node.id, items.map((x) => x.id));
                      }}
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
                    >
                      <Trash2 size={14} strokeWidth={1.7} />
                    </button>
                  </div>
                ))}
                {((data.items as ButtonItem[]) || []).length < 3 && (
                  <AdminV3Button
                    variant="small"
                    className="self-start"
                    onClick={() => {
                      const existing = (data.items as ButtonItem[]) || [];
                      onChange({
                        items: [
                          ...existing,
                          { id: genId("opt"), label: `Option ${existing.length + 1}` },
                        ],
                      });
                    }}
                  >
                    <Plus size={13} strokeWidth={2} />
                    Add button
                  </AdminV3Button>
                )}
              </div>
            </Field>
          </>
        )}

        {/* -------------------------------------------------- questionnaire */}
        {type === "questionnaire" && (
          <QuestionnaireEditor
            data={data as QuestionnaireData}
            onChange={(patch) => onChange(patch as Record<string, unknown>)}
            variables={availableVariables}
          />
        )}

        {/* -------------------------------------------------- link button */}
        {type === "link_button" && (
          <>
            <Field label="Message">
              <VariableTextInput
                multiline
                rows={4}
                variables={availableVariables}
                value={String(data.text ?? "")}
                onChange={(v) => onChange({ text: v })}
                placeholder="Tap the button below to order."
                className={textareaCls}
              />
            </Field>
            <Field label="Button label">
              <input
                value={String(data.buttonText ?? "")}
                maxLength={20}
                placeholder="Order now"
                onChange={(e) => onChange({ buttonText: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Link">
              <VariableTextInput
                variables={availableVariables}
                value={String(data.url ?? "")}
                onChange={(v) => onChange({ url: v })}
                placeholder="https://…  or  {{order_link}}"
                className={inputCls}
              />
            </Field>
          </>
        )}

        {/* ------------------------------------------------ wait for reply */}
        {type === "wait_for_reply" && (
          <>
            <Field label="Store the answer in" hint="Use it later as {{name}}.">
              <input
                value={String(data.variableName ?? "")}
                placeholder="name"
                onChange={(e) =>
                  onChange({ variableName: e.target.value.replace(/[^\w]/g, "") })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Expect">
              <SelectField
                value={String(data.validation || "text")}
                onChange={(v) => onChange({ validation: v })}
              >
                <option value="text">Any text</option>
                <option value="number">A number</option>
                <option value="email">An email</option>
              </SelectField>
            </Field>
            <Field label="Retry message (optional)">
              <VariableTextInput
                variables={availableVariables}
                value={String(data.retryText ?? "")}
                onChange={(v) => onChange({ retryText: v })}
                placeholder="That doesn't look right, try again."
                className={inputCls}
              />
            </Field>
          </>
        )}

        {/* ---------------------------------------------------- condition */}
        {type === "condition" && (
          <Field label="Rules" hint="First match wins. Anything else takes “Otherwise”.">
            <div className="flex flex-col gap-2">
              {((data.rules as ConditionRule[]) || []).map((r, i) => (
                <div
                  key={r.handle}
                  className="flex flex-col gap-1.5 rounded-md border border-zinc-200 p-2 dark:border-zinc-700"
                >
                  <input
                    value={r.var || ""}
                    placeholder="variable (blank = their reply)"
                    onChange={(e) => {
                      const rules = [...((data.rules as ConditionRule[]) || [])];
                      rules[i] = { ...rules[i], var: e.target.value };
                      onChange({ rules });
                    }}
                    className={inputCls}
                  />
                  <div className="flex items-center gap-1.5">
                    <div className="w-[110px] flex-none">
                      <SelectField
                        value={r.op}
                        onChange={(v) => {
                          const rules = [...((data.rules as ConditionRule[]) || [])];
                          rules[i] = { ...rules[i], op: v as ConditionRule["op"] };
                          onChange({ rules });
                        }}
                      >
                        <option value="equals">equals</option>
                        <option value="contains">contains</option>
                        <option value="isEmpty">is empty</option>
                        <option value="gt">&gt;</option>
                        <option value="lt">&lt;</option>
                      </SelectField>
                    </div>
                    {r.op !== "isEmpty" && (
                      <input
                        value={r.value || ""}
                        placeholder="value"
                        onChange={(e) => {
                          const rules = [...((data.rules as ConditionRule[]) || [])];
                          rules[i] = { ...rules[i], value: e.target.value };
                          onChange({ rules });
                        }}
                        className={inputCls}
                      />
                    )}
                    <button
                      type="button"
                      aria-label={`Remove rule ${i + 1}`}
                      onClick={() => {
                        const rules = ((data.rules as ConditionRule[]) || []).filter(
                          (_, j) => j !== i,
                        );
                        onChange({ rules });
                        onSyncBranches(node.id, [...rules.map((x) => x.handle), "else"]);
                      }}
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
                    >
                      <Trash2 size={14} strokeWidth={1.7} />
                    </button>
                  </div>
                </div>
              ))}
              <AdminV3Button
                variant="small"
                className="self-start"
                onClick={() =>
                  onChange({
                    rules: [
                      ...((data.rules as ConditionRule[]) || []),
                      { var: "", op: "equals" as const, value: "", handle: genId("r") },
                    ],
                  })
                }
              >
                <Plus size={13} strokeWidth={2} />
                Add rule
              </AdminV3Button>
            </div>
          </Field>
        )}

        {/* -------------------------------------------------------- delay */}
        {type === "delay" &&
          (() => {
            const totalSec = clampDelaySeconds(Number(data.seconds) || 0);
            const { value, unit } = splitDelay(totalSec);
            const maxForUnit = Math.floor(MAX_DELAY_SECONDS / DELAY_UNIT_SECONDS[unit]);
            return (
              <Field
                label="Wait before continuing"
                hint={`Waits ${describeDelay(totalSec)}, then sends the next steps. Up to 24 hours; the customer doesn't need to reply.`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={maxForUnit}
                    value={value}
                    onChange={(e) =>
                      onChange({
                        seconds: toDelaySeconds(Number(e.target.value) || 0, unit),
                      })
                    }
                    className={inputCls}
                  />
                  <div className="w-[120px] flex-none">
                    <SelectField
                      value={unit}
                      onChange={(u) =>
                        onChange({ seconds: toDelaySeconds(value, u as DelayUnit) })
                      }
                    >
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </SelectField>
                  </div>
                </div>
              </Field>
            );
          })()}

        {/* ------------------------------------------------- set variable */}
        {type === "set_variable" && (
          <>
            <Field label="Variable name">
              <input
                value={String(data.name ?? "")}
                onChange={(e) => onChange({ name: e.target.value.replace(/[^\w]/g, "") })}
                className={inputCls}
              />
            </Field>
            <Field label="Value">
              <VariableTextInput
                variables={availableVariables}
                value={String(data.value ?? "")}
                onChange={(v) => onChange({ value: v })}
                placeholder="can use {{otherVar}}"
                className={inputCls}
              />
            </Field>
          </>
        )}

        {/* --------------------------------------------------------- jump */}
        {type === "jump" && (
          <Field label="Continue from" hint="The flow carries on at this step.">
            <SelectField
              value={String(data.targetNodeId ?? "")}
              onChange={(v) => onChange({ targetNodeId: v })}
            >
              <option value="">Choose a step…</option>
              {nodes
                .filter((n) => n.id !== node.id)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {NODE_META[n.type]?.label} · {nodeSummary(n.type, n.data).slice(0, 40)}
                  </option>
                ))}
            </SelectField>
          </Field>
        )}

        {/* ---------------------------------------------------------- end */}
        {type === "end" && (
          <>
            <Field label="Closing message (optional)">
              <textarea
                rows={3}
                value={String(data.message ?? "")}
                onChange={(e) => onChange({ message: e.target.value })}
                placeholder="Thanks! You're all set. 🎉"
                className={textareaCls}
              />
            </Field>
            <Field
              label="Opt-out button (optional)"
              hint="Tapping it stops this flow starting again for that customer."
            >
              <input
                value={String(data.buttonText ?? "")}
                maxLength={20}
                placeholder="Stop these messages"
                onChange={(e) => onChange({ buttonText: e.target.value })}
                className={inputCls}
              />
            </Field>
            {data.buttonText ? (
              <>
                <Field label="After tapping, pause this flow for">
                  <SelectField
                    value={String(data.suppressHours ?? 24)}
                    onChange={(v) => onChange({ suppressHours: Number(v) })}
                  >
                    <option value="24">1 day</option>
                    <option value="72">3 days</option>
                    <option value="168">1 week</option>
                    <option value="720">1 month</option>
                    <option value="0">Forever</option>
                  </SelectField>
                </Field>
                <Field label="Confirmation message (optional)">
                  <input
                    value={String(data.stopConfirmText ?? "")}
                    placeholder="Leave blank to send nothing"
                    onChange={(e) => onChange({ stopConfirmText: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </>
            ) : null}
          </>
        )}

        {/* --------------------------------------------- what happens next */}
        {outputs.length > 0 && (
          <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <GroupLabel>What happens next</GroupLabel>
            <div className="mt-2.5 flex flex-col gap-2.5">
              {outputs.map((o) => (
                <Field
                  key={o.handle ?? "__next"}
                  label={outputs.length > 1 ? o.label : undefined}
                >
                  <SelectField
                    value={targetOf(edges, node.id, o.handle)}
                    onChange={(v) => onRewire(node.id, o.handle, v)}
                  >
                    <option value="">End the conversation here</option>
                    {nodes
                      .filter((n) => n.id !== node.id && n.type !== "trigger")
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {NODE_META[n.type]?.label} ·{" "}
                          {nodeSummary(n.type, n.data).slice(0, 40)}
                        </option>
                      ))}
                  </SelectField>
                </Field>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------- small bits */

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 text-[12px] font-normal leading-[1.55] text-zinc-400 dark:text-zinc-500">
      {children}
    </p>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-zinc-600 dark:text-zinc-300">{children}</span>
  );
}

function Preview({ text, cta }: { text: string; cta?: string }) {
  return (
    <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <GroupLabel>Preview</GroupLabel>
      <div className="mt-2 rounded-[10px] border border-zinc-200 bg-zinc-100 px-3 py-[11px] dark:border-zinc-700 dark:bg-zinc-800">
        <div
          translate="no"
          className="notranslate whitespace-pre-wrap text-[12.5px] font-normal leading-[1.55] text-zinc-950 [text-wrap:pretty] dark:text-zinc-50"
        >
          {text || "Nothing to send yet."}
        </div>
        {cta && (
          <div className="mt-2.5 border-t border-zinc-200 pt-2.5 text-center text-[12.5px] font-semibold leading-none text-green-700 dark:border-zinc-700 dark:text-green-400">
            {cta}
          </div>
        )}
      </div>
    </div>
  );
}

function VariableChips({
  variables,
  onInsert,
}: {
  variables: string[];
  onInsert: (v: string) => void;
}) {
  if (variables.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-[7px]">
      {variables.slice(0, 12).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onInsert(v)}
          title={`Add {{${v}}} to the message`}
          className="h-7 flex-none rounded-full border border-zinc-200 bg-white px-2.5 font-mono text-[12px] font-medium leading-none text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {`{{${v}}}`}
        </button>
      ))}
    </div>
  );
}

function VariableHelp({
  matchType,
  showLoyalty,
}: {
  matchType: string;
  showLoyalty: boolean;
}) {
  if (matchType === "order") {
    return (
      <Hint>
        Use these in any message:{" "}
        <Code>{ORDER_FLOW_VARIABLES.map((v) => `{{${v}}}`).join("  ")}</Code>
      </Hint>
    );
  }
  if (matchType === "loyalty" && showLoyalty) {
    return (
      <Hint>
        Use these in any message:{" "}
        <Code>{LOYALTY_FLOW_VARIABLES.map((v) => `{{${v}}}`).join("  ")}</Code>
      </Hint>
    );
  }
  if (!MESSAGE_TRIGGER_TYPES.has(matchType)) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-800">
      <div className={cn(fieldLabelCls, "mb-1.5")}>Store variables you can use</div>
      <dl className="m-0 flex flex-col gap-1">
        {MESSAGE_FLOW_VARIABLE_INFO.map((v) => (
          <div key={v.name} className="flex gap-1.5 text-[11.5px] leading-[1.45]">
            <dt className="flex-none font-mono text-zinc-700 dark:text-zinc-300">
              {`{{${v.name}}}`}
            </dt>
            <dd className="m-0 min-w-0 text-zinc-400 dark:text-zinc-500">— {v.desc}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Comma-separated keyword editor. Keeps the raw typed text locally so a comma
 * (and the space after it) survives keystrokes — deriving the input value from
 * `keywords.join(", ")` strips the trailing empty segment on every keypress,
 * which makes a comma impossible to type. Same fix as admin-v2's.
 */
function KeywordsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (keywords: string[]) => void;
}) {
  const [text, setText] = React.useState(() => (value || []).join(", "));
  const lastEmitted = React.useRef((value || []).join(", "));

  React.useEffect(() => {
    const joined = (value || []).join(", ");
    if (joined !== lastEmitted.current) {
      setText(joined);
      lastEmitted.current = joined;
    }
  }, [value]);

  return (
    <input
      value={text}
      placeholder="hello, menu"
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = raw.split(",").map((s) => s.trim()).filter(Boolean);
        lastEmitted.current = parsed.join(", ");
        onChange(parsed);
      }}
      className={inputCls}
    />
  );
}

/** Paste a link OR upload a file — same S3 helper the rest of the app uses. */
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
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

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
    <Field label={`${label} — upload or paste a link`}>
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className={inputCls}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          title={`Upload ${label.toLowerCase()}`}
          aria-label={`Upload ${label.toLowerCase()}`}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {uploading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Upload size={15} strokeWidth={1.8} />
          )}
        </button>
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
      {value && (
        <p className="mt-1.5 truncate text-[11px] leading-none text-zinc-400 dark:text-zinc-500">
          {value}
        </p>
      )}
    </Field>
  );
}

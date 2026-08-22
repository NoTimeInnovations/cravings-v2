"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ClipboardList, Globe, Loader2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { updatePartner } from "@/api/partners";
import { provisionDefaultFlows } from "@/app/actions/provisionDefaultFlows";
import { revalidateTag } from "@/app/actions/revalidate";
import { GlobalFlowsBrowser } from "@/components/admin-v2/whatsapp-flow/GlobalFlowsBrowser";
import { QuestionnaireResponses } from "@/components/admin-v2/whatsapp-flow/QuestionnaireResponses";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { getFeatures, revertFeatureToString } from "@/lib/getFeatures";
import { cn } from "@/lib/utils";
import type { Flow } from "@/lib/whatsappFlow/types";
import { patchFlowEnabled } from "@/lib/whatsappFlowsBulk";
import { useAuthStore } from "@/store/authStore";

import { AdminV3Button, V3Card } from "./ui/primitives";
import { FlowEditor } from "./waflows/FlowEditor";
import { Chip, FlowToggle, SegButton, Segmented } from "./waflows/kit";
import { triggerChip } from "./waflows/graph";

/**
 * /admin-v3 → WhatsApp → Flows.
 *
 * A straight port of admin-v2's Flows screen onto the design's list block: the
 * same `/api/whatsapp/flows` endpoints, the same idempotent default-flow
 * provisioning for partners with WhatsApp ordering, the same `whatsappFlowTyping`
 * feature-flag toggle for read receipts on greetings, and the same all-on/all-off
 * bulk switch that reconciles from the server when a PATCH fails.
 *
 * Editing opens the v3 FlowEditor (see waflows/FlowEditor.tsx) in place of
 * admin-v2's canvas builder. Both read and write the identical flow document.
 *
 * NOT SHOWN, because the list endpoint does not return it: how many messages a
 * flow has sent, and each flow's run frequency (`once_per_user` /
 * `cooldown_hours` are only selected on the single-flow endpoint). The design's
 * "sent" slot carries the flow's last-updated time instead — real data — and
 * frequency is edited inside the flow rather than guessed at in the list.
 */

type FlowListItem = Pick<
  Flow,
  | "id"
  | "name"
  | "description"
  | "enabled"
  | "triggers"
  | "run_ttl_hours"
  | "escape_keyword"
  | "created_at"
  | "updated_at"
>;

type Tab = "all" | "on" | "off";

function relative(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `Updated ${formatDistanceToNow(d, { addSuffix: true })}`;
}

export function AdminV3WhatsAppFlows({
  onBack,
}: {
  /** Set by the shell. Falls back to admin-v2's WhatsApp hub until then. */
  onBack?: () => void;
} = {}) {
  const router = useRouter();
  const { userData, setState } = useAuthStore();
  const partnerId = (userData as { id?: string } | undefined)?.id;
  const featureFlags =
    (userData as { feature_flags?: string } | undefined)?.feature_flags || null;

  const loyaltyEnabled = React.useMemo(() => {
    const f = getFeatures(featureFlags);
    return !!(f.loyalty_points?.access && f.loyalty_points?.enabled);
  }, [featureFlags]);

  const whatsappOrderingEnabled = React.useMemo(
    () => !!getFeatures(featureFlags).whatsappOrdering?.enabled,
    [featureFlags],
  );

  const [flows, setFlows] = React.useState<FlowListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<Tab>("all");
  const [mode, setMode] = React.useState<"list" | "editor" | "responses">("list");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [showGlobal, setShowGlobal] = React.useState(false);

  /* ------------------------------------------------- greeting read receipts */

  const [flowTyping, setFlowTyping] = React.useState(false);
  const [savingTyping, setSavingTyping] = React.useState(false);

  React.useEffect(() => {
    setFlowTyping(!!getFeatures(featureFlags).whatsappFlowTyping?.enabled);
  }, [featureFlags]);

  const toggleTyping = async () => {
    if (!partnerId || savingTyping || !whatsappOrderingEnabled) return;
    const next = !flowTyping;
    const prev = flowTyping;
    setFlowTyping(next);
    setSavingTyping(true);
    try {
      const featureString = revertFeatureToString({
        ...getFeatures(featureFlags),
        whatsappFlowTyping: { access: true, enabled: next },
      });
      await updatePartner(partnerId, { feature_flags: featureString });
      setState({ feature_flags: featureString });
      revalidateTag(partnerId);
      toast.success(
        next ? "Read & typing on for greeting flows" : "Read & typing turned off",
      );
    } catch {
      setFlowTyping(prev);
      toast.error("Couldn't update the setting");
    } finally {
      setSavingTyping(false);
    }
  };

  /* ---------------------------------------------------------------- loading */

  const load = React.useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/flows?partnerId=${partnerId}`);
      const data = await res.json();
      setFlows(data.flows || []);
    } catch {
      setFlows([]);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  // Every partner with WhatsApp ordering gets the built-in order flows seeded —
  // disabled by default — so they're ready to switch on. Idempotent by name.
  React.useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    (async () => {
      if (whatsappOrderingEnabled) {
        try {
          await provisionDefaultFlows(partnerId);
        } catch {
          /* best effort — fall through and show whatever exists */
        }
      }
      if (!cancelled) load();
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId, whatsappOrderingEnabled, load]);

  /* -------------------------------------------------------------- mutations */

  const toggleFlow = async (f: FlowListItem) => {
    if (!partnerId || busyId) return;
    setBusyId(f.id);
    setFlows((xs) => xs.map((x) => (x.id === f.id ? { ...x, enabled: !x.enabled } : x)));
    try {
      await patchFlowEnabled(partnerId, f.id, !f.enabled);
    } catch {
      setFlows((xs) =>
        xs.map((x) => (x.id === f.id ? { ...x, enabled: f.enabled } : x)),
      );
      toast.error("Failed to update flow");
    } finally {
      setBusyId(null);
    }
  };

  const removeFlow = async (f: FlowListItem) => {
    if (
      !(await confirmDialog({
        title: `Delete flow "${f.name}"?`,
        description: "This can't be undone.",
        confirmText: "Delete",
        destructive: true,
      }))
    )
      return;
    try {
      const res = await fetch(`/api/whatsapp/flows/${f.id}?partnerId=${partnerId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setFlows((xs) => xs.filter((x) => x.id !== f.id));
      toast.success("Flow deleted");
    } catch {
      toast.error("Failed to delete flow");
    }
  };

  // Bulk on/off. Optimistic; the PATCHes are independent and non-atomic, so on
  // ANY failure we re-sync from the server rather than blind-reverting — flows
  // that DID flip would otherwise show the wrong state until a manual reload.
  const allOn = flows.length > 0 && flows.every((f) => f.enabled);
  const toggleAll = async () => {
    if (!partnerId || flows.length === 0 || bulkBusy) return;
    const target = !allOn;
    const changed = flows.filter((f) => !!f.enabled !== target);
    setFlows((xs) => xs.map((x) => ({ ...x, enabled: target })));
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        changed.map((f) => patchFlowEnabled(partnerId, f.id, target)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(`Couldn't update ${failed} flow${failed === 1 ? "" : "s"}`);
        await load();
      } else {
        toast.success(target ? "All flows turned on" : "All flows turned off");
      }
    } catch {
      toast.error("Couldn't update all flows");
      await load();
    } finally {
      setBulkBusy(false);
    }
  };

  /* ---------------------------------------------------------------- derived */

  const activeCount = flows.filter((f) => f.enabled).length;
  const visible = flows.filter((f) =>
    tab === "all" ? true : tab === "on" ? f.enabled : !f.enabled,
  );

  const headerSummary = loading
    ? "Loading your flows…"
    : flows.length === 0
      ? "Automated conversations that run on your own WhatsApp number."
      : `${activeCount} of ${flows.length} flow${flows.length === 1 ? "" : "s"} on · they run on your own WhatsApp number.`;

  /* ----------------------------------------------------------------- editor */

  if (mode === "responses") {
    return (
      <V3Card className="p-4">
        <QuestionnaireResponses partnerId={partnerId} onClose={() => setMode("list")} />
      </V3Card>
    );
  }

  if (mode === "editor") {
    return (
      <FlowEditor
        partnerId={partnerId}
        flowId={editingId}
        loyaltyEnabled={loyaltyEnabled}
        onClose={() => {
          setMode("list");
          setEditingId(null);
          load();
        }}
      />
    );
  }

  /* ------------------------------------------------------------------- list */

  return (
    <div className="flex flex-col">
      {/* --------------------------------------------------- sticky header */}
      <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[14px] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 lg:px-[clamp(14px,3vw,28px)]">
        <button
          type="button"
          aria-label="Back to WhatsApp"
          onClick={() => (onBack ? onBack() : router.push("/admin-v2?view=WhatsApp"))}
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
        </button>

        <div className="min-w-0 flex-[1_1_200px]">
          <h1 className="m-0 text-[16px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
            Flows
          </h1>
          <p className="mt-1 text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            {headerSummary}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3"
            disabled={!partnerId}
            onClick={() => setMode("responses")}
            title="Answers customers have sent through questionnaire steps"
          >
            <ClipboardList size={15} strokeWidth={1.7} className="text-zinc-500 dark:text-zinc-400" />
            Responses
          </AdminV3Button>

          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3"
            disabled={!partnerId}
            onClick={() => setShowGlobal(true)}
            title="Browse and import from the shared Global Flows library"
          >
            <Globe size={15} strokeWidth={1.7} className="text-zinc-500 dark:text-zinc-400" />
            Global flows
          </AdminV3Button>

          <AdminV3Button
            variant="secondary"
            className="h-[34px] px-3"
            disabled={flows.length === 0 || bulkBusy || loading}
            onClick={toggleAll}
            title={allOn ? "Turn every flow off" : "Turn every flow on"}
          >
            {bulkBusy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Power size={15} strokeWidth={1.7} className="text-zinc-500 dark:text-zinc-400" />
            )}
            {allOn ? "Turn all off" : "Turn all on"}
          </AdminV3Button>

          <AdminV3Button
            variant="primary"
            className="h-[34px] px-3.5 font-medium"
            onClick={() => {
              setEditingId(null);
              setMode("editor");
            }}
          >
            <Plus size={15} strokeWidth={2} />
            New flow
          </AdminV3Button>
        </div>
      </div>

      {/* ----------------------------------------------------------- body */}
      <div className="flex flex-col gap-3.5 pb-10 pt-4 lg:px-[clamp(14px,3vw,28px)]">
        {/* ---------------------------------------------- greeting receipts */}
        <V3Card className="px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-3 gap-y-2.5">
            <div className="min-w-0 flex-[1_1_240px]">
              <div className="text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50">
                Read receipt and typing on greetings
              </div>
              <div className="mt-[3px] text-[12px] font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
                When a message starts a greeting flow — a Welcome flow, or one
                triggered by a keyword like “hi” or “menu” — mark it read and show
                a typing animation while the reply is prepared.
                {!whatsappOrderingEnabled && (
                  <span className="mt-1 block text-amber-600 dark:text-amber-400">
                    Turn on WhatsApp Ordering first to use this.
                  </span>
                )}
              </div>
            </div>
            <FlowToggle
              on={flowTyping}
              label="Read receipt and typing on greetings"
              disabled={!whatsappOrderingEnabled || savingTyping}
              onClick={toggleTyping}
            />
          </div>

          {flowTyping && (
            <div className="mt-[11px] flex gap-2 border-t border-zinc-100 pt-[11px] dark:border-zinc-800">
              <span className="mt-[2px] flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full border border-zinc-400 text-[9px] font-bold leading-none text-zinc-400 dark:border-zinc-500 dark:text-zinc-500">
                i
              </span>
              <span className="text-[12px] font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
                Only greeting flows do this. Messages that hit a catch-all flow
                stay unread, so you can still spot real questions in your inbox.
              </span>
            </div>
          )}
        </V3Card>

        <div className="flex flex-wrap items-center gap-2.5 px-[14px] lg:px-0">
          <Segmented>
            <SegButton active={tab === "all"} onClick={() => setTab("all")}>
              All {flows.length ? `(${flows.length})` : ""}
            </SegButton>
            <SegButton active={tab === "on"} onClick={() => setTab("on")}>
              On {activeCount ? `(${activeCount})` : ""}
            </SegButton>
            <SegButton active={tab === "off"} onClick={() => setTab("off")}>
              Off {flows.length - activeCount ? `(${flows.length - activeCount})` : ""}
            </SegButton>
          </Segmented>
        </div>

        {/* ------------------------------------------------------ your flows */}
        <V3Card className="w-full min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                Your flows
              </div>
              <div className="mt-1 text-[12px] font-normal leading-tight text-zinc-400 dark:text-zinc-500">
                Matched top to bottom — the first flow whose trigger fits replies.
              </div>
            </div>
            <Chip>
              {loading
                ? "Loading…"
                : `${flows.length} flow${flows.length === 1 ? "" : "s"}`}
            </Chip>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-12 text-[13px] text-zinc-400 dark:text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              Loading flows…
            </div>
          ) : flows.length === 0 ? (
            <div className="px-4 py-[30px] text-center">
              <div className="text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                No flows yet
              </div>
              <div className="mx-auto mt-2 max-w-[380px] text-[12px] font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
                Create your first automated conversation — a welcome menu, order
                capture, or an FAQ reply. Or import one from the Global flows
                library.
              </div>
              <AdminV3Button
                variant="secondary"
                className="mx-auto mt-3.5 h-8 px-3 text-[12.5px]"
                onClick={() => {
                  setEditingId(null);
                  setMode("editor");
                }}
              >
                <Plus size={14} strokeWidth={2} />
                New flow
              </AdminV3Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="px-4 py-[30px] text-center">
              <div className="text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                Nothing here with this filter
              </div>
              <div className="mt-2 text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
                Switch to All to see every flow.
              </div>
            </div>
          ) : (
            visible.map((f, i) => (
              <FlowRow
                key={f.id}
                flow={f}
                last={i === visible.length - 1}
                busy={busyId === f.id}
                onToggle={() => toggleFlow(f)}
                onEdit={() => {
                  setEditingId(f.id);
                  setMode("editor");
                }}
                onDelete={() => removeFlow(f)}
              />
            ))
          )}
        </V3Card>

      </div>

      {showGlobal && partnerId && (
        <GlobalFlowsBrowser
          partnerId={partnerId}
          partnerFlows={flows.map((f) => ({ id: f.id, name: f.name }))}
          onClose={() => setShowGlobal(false)}
          onImported={load}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- row */

function FlowRow({
  flow,
  last,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  flow: FlowListItem;
  last: boolean;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const on = !!flow.enabled;
  const extraTriggers = (flow.triggers?.length || 0) - 1;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 gap-y-2.5 px-4 py-[13px] transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
        !last && "border-b border-zinc-100 dark:border-zinc-800",
      )}
    >
      <div className="min-w-0 flex-[1_1_240px]">
        <div className="flex flex-wrap items-center gap-2 gap-y-1.5">
          <span
            translate="no"
            className={cn(
              "notranslate text-[13.5px] font-semibold leading-none tracking-[-0.01em]",
              on ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            {flow.name}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-[5px] rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none",
              on
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
                : "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                on ? "bg-green-600" : "bg-zinc-400 dark:bg-zinc-500",
              )}
            />
            {on ? "Active" : "Off"}
          </span>
        </div>

        <div className="mt-[7px] flex flex-wrap items-center gap-2 gap-y-1.5">
          <Chip>{triggerChip(flow.triggers)}</Chip>
          {extraTriggers > 0 && (
            <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
              +{extraTriggers} more trigger{extraTriggers === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <span className="flex-none text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
        {relative(flow.updated_at)}
      </span>

      <div className="flex flex-none items-center gap-1.5">
        <FlowToggle
          on={on}
          disabled={busy}
          onClick={onToggle}
          label={`${on ? "Turn off" : "Turn on"} ${flow.name}`}
        />
        <button
          type="button"
          onClick={onEdit}
          title="Edit flow"
          aria-label={`Edit ${flow.name}`}
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <Pencil size={15} strokeWidth={1.7} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete flow"
          aria-label={`Delete ${flow.name}`}
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          <Trash2 size={15} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}

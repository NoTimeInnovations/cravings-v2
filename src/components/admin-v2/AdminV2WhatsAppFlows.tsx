"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Workflow, Loader2, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import type { Flow } from "@/lib/whatsappFlow/types";
import { getFeatures, revertFeatureToString } from "@/lib/getFeatures";
import { FlowBuilder } from "@/components/admin-v2/whatsapp-flow/FlowBuilder";
import { provisionDefaultFlows } from "@/app/actions/provisionDefaultFlows";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { patchFlowEnabled } from "@/lib/whatsappFlowsBulk";

type FlowListItem = Pick<
  Flow,
  "id" | "name" | "description" | "enabled" | "triggers" | "run_ttl_hours" | "escape_keyword" | "created_at" | "updated_at"
>;

function triggerSummary(f: FlowListItem): string {
  const t = f.triggers?.[0];
  if (!t) return "No trigger set";
  if (t.matchType === "exact" || t.matchType === "contains") {
    return `${t.matchType}: ${(t.keywords || []).join(", ") || "—"}`;
  }
  if (t.matchType === "welcome") return "On first message";
  if (t.matchType === "any") return "On any message";
  if (t.matchType === "order") return `On order: ${t.orderStatus || "—"}`;
  if (t.matchType === "loyalty") return `On loyalty: ${t.loyaltyEvent || "—"}`;
  return t.matchType;
}

export function AdminV2WhatsAppFlows() {
  const { userData, setState } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;
  const loyaltyEnabled = useMemo(() => {
    const f = getFeatures((userData as any)?.feature_flags || null);
    return !!(f.loyalty_points?.access && f.loyalty_points?.enabled);
  }, [userData]);
  const whatsappOrderingEnabled = useMemo(() => {
    const f = getFeatures((userData as any)?.feature_flags || null);
    return !!f.whatsappOrdering?.enabled;
  }, [userData]);

  // Welcome-flow read receipt + typing toggle (whatsappFlowTyping feature flag).
  const [flowTyping, setFlowTyping] = useState(false);
  const [savingTyping, setSavingTyping] = useState(false);
  useEffect(() => {
    const f = getFeatures((userData as any)?.feature_flags || null);
    setFlowTyping(!!f.whatsappFlowTyping?.enabled);
  }, [userData]);

  const handleTypingToggle = async (val: boolean) => {
    if (!partnerId) return;
    const prev = flowTyping;
    setFlowTyping(val); // optimistic
    setSavingTyping(true);
    try {
      const f = getFeatures((userData as any)?.feature_flags || null);
      const updated = {
        ...f,
        whatsappFlowTyping: { access: true, enabled: val },
      };
      const featureString = revertFeatureToString(updated);
      await updatePartner(partnerId, { feature_flags: featureString });
      setState({ feature_flags: featureString });
      revalidateTag(partnerId);
      toast.success(
        val
          ? "Read & typing on for the Welcome flow"
          : "Read & typing turned off",
      );
    } catch {
      setFlowTyping(prev); // revert on failure
      toast.error("Couldn't update the setting");
    } finally {
      setSavingTyping(false);
    }
  };

  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "builder">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
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

  // Every partner with WhatsApp ordering gets the built-in order flows
  // (welcome + order-status) seeded automatically — disabled by default — so
  // they're ready to switch on without a superadmin adding them by hand.
  // Idempotent: existing flows (by name) are never duplicated or re-enabled.
  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    (async () => {
      if (whatsappOrderingEnabled) {
        try {
          await provisionDefaultFlows(partnerId);
        } catch {
          /* best-effort — fall through to load whatever exists */
        }
      }
      if (!cancelled) load();
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId, whatsappOrderingEnabled, load]);

  const openNew = () => {
    setEditingId(null);
    setMode("builder");
  };

  const toggle = async (f: FlowListItem) => {
    try {
      const res = await fetch(`/api/whatsapp/flows/${f.id}?partnerId=${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !f.enabled }),
      });
      if (!res.ok) throw new Error();
      setFlows((xs) => xs.map((x) => (x.id === f.id ? { ...x, enabled: !x.enabled } : x)));
    } catch {
      toast.error("Failed to update flow");
    }
  };

  const remove = async (f: FlowListItem) => {
    if (!confirm(`Delete flow "${f.name}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/whatsapp/flows/${f.id}?partnerId=${partnerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFlows((xs) => xs.filter((x) => x.id !== f.id));
      toast.success("Flow deleted");
    } catch {
      toast.error("Failed to delete flow");
    }
  };

  // Bulk on/off for every flow. Optimistic; PATCHes are independent + non-atomic,
  // so on ANY failure we re-sync from the server (load) rather than blind-reverting
  // to the pre-click snapshot — otherwise flows that DID flip server-side would be
  // shown with the wrong state until a manual reload.
  const allOn = flows.length > 0 && flows.every((f) => f.enabled);
  const toggleAll = async () => {
    if (!partnerId || flows.length === 0 || bulkBusy) return;
    const target = !allOn;
    const changed = flows.filter((f) => !!f.enabled !== target);
    setFlows((xs) => xs.map((x) => ({ ...x, enabled: target }))); // optimistic
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        changed.map((f) => patchFlowEnabled(partnerId, f.id, target)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(`Couldn't update ${failed} flow${failed === 1 ? "" : "s"}`);
        await load(); // reconcile to true server state
      } else {
        toast.success(target ? "All flows turned on" : "All flows turned off");
      }
    } catch {
      toast.error("Couldn't update all flows");
      await load(); // reconcile to true server state
    } finally {
      setBulkBusy(false);
    }
  };

  if (mode === "builder") {
    return (
      <FlowBuilder
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Flows</h2>
          <p className="text-sm text-muted-foreground">
            Automated conversations that run on your own WhatsApp number.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={toggleAll}
            disabled={flows.length === 0 || bulkBusy || loading}
            title={allOn ? "Turn every flow off" : "Turn every flow on"}
          >
            {bulkBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Power className="mr-2 h-4 w-4" />
            )}
            {allOn ? "Turn all off" : "Turn all on"}
          </Button>
          <Button onClick={openNew} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> New Flow
          </Button>
        </div>
      </div>

      {/* Welcome-flow read receipt + typing animation toggle */}
      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">
            Read receipt &amp; typing on Welcome
          </div>
          <p className="max-w-xl text-xs text-muted-foreground">
            When a customer&apos;s message triggers your <b>Welcome flow</b>, mark
            it read (blue tick) and show a typing animation while the reply is
            prepared. <b>Only the Welcome flow does this</b> — every other message
            stays unread so you can see and answer real customer queries. Works
            only while your Welcome flow is on and follows its run frequency
            (e.g. once per customer / cooldown).
            {!whatsappOrderingEnabled && (
              <span className="block mt-1 text-amber-600">
                Enable WhatsApp Ordering first to use this.
              </span>
            )}
          </p>
        </div>
        <Switch
          checked={flowTyping}
          disabled={!whatsappOrderingEnabled || savingTyping}
          onCheckedChange={handleTypingToggle}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading flows…
        </div>
      ) : flows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <div className="rounded-full bg-muted p-3">
            <Workflow className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No flows yet</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Create your first automated conversation — a welcome menu, order capture, or FAQ bot.
          </p>
          <Button onClick={openNew} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> New Flow
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {flows.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{f.name}</p>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      f.enabled ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {f.enabled ? "Active" : "Off"}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{triggerSummary(f)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggle(f)} title={f.enabled ? "Disable" : "Enable"}>
                  <Power className={`h-4 w-4 ${f.enabled ? "text-green-600" : "text-muted-foreground"}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(f.id);
                    setMode("builder");
                  }}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(f)}
                  title="Delete"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

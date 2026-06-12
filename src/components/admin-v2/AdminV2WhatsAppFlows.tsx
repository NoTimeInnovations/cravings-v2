"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Plus, Workflow, Loader2, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import type { Flow } from "@/lib/whatsappFlow/types";
import { FlowBuilder } from "@/components/admin-v2/whatsapp-flow/FlowBuilder";

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
  return t.matchType;
}

export function AdminV2WhatsAppFlows() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;

  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "builder">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

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

  if (mode === "builder") {
    return (
      <FlowBuilder
        partnerId={partnerId}
        flowId={editingId}
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
        <Button onClick={openNew} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> New Flow
        </Button>
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

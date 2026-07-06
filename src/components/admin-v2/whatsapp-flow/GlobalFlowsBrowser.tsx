"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  DownloadCloud,
  X,
  Loader2,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TriggerDef } from "@/lib/whatsappFlow/types";
import { FlowBuilder } from "@/components/admin-v2/whatsapp-flow/FlowBuilder";

interface GlobalFlowItem {
  id: string;
  name: string;
  description?: string | null;
  triggers?: TriggerDef[];
  updated_at?: string;
}

interface PartnerFlowRef {
  id: string;
  name: string;
}

function triggerSummary(triggers?: TriggerDef[]): string {
  const t = triggers?.[0];
  if (!t) return "No trigger set";
  if (t.matchType === "exact" || t.matchType === "contains") {
    return `${t.matchType}: ${(t.keywords || []).join(", ") || "—"}`;
  }
  if (t.matchType === "welcome") return "On first message";
  if (t.matchType === "any") return "On any message";
  if (t.matchType === "default") return "Fallback (no match)";
  if (t.matchType === "order") return `On order: ${t.orderStatus || "—"}`;
  if (t.matchType === "loyalty") return `On loyalty: ${t.loyaltyEvent || "—"}`;
  return t.matchType;
}

export function GlobalFlowsBrowser({
  partnerId,
  partnerFlows,
  loyaltyEnabled,
  onClose,
  onImported,
}: {
  partnerId: string;
  partnerFlows: PartnerFlowRef[];
  loyaltyEnabled?: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [flows, setFlows] = useState<GlobalFlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "builder">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  // Name-collision prompt: a global flow whose name matches an existing partner flow.
  const [collision, setCollision] = useState<{ gf: GlobalFlowItem; targetId: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/global-flows");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load global flows");
      setFlows((data.flows || []) as GlobalFlowItem[]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load global flows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doImport = async (gf: GlobalFlowItem, importMode: "replace" | "add", targetFlowId?: string) => {
    setImportingId(gf.id);
    try {
      const res = await fetch("/api/whatsapp/global-flows/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, globalFlowId: gf.id, mode: importMode, targetFlowId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Import failed");
      toast.success(
        importMode === "replace"
          ? `Replaced "${gf.name}" with the global version`
          : `Imported "${data?.name || gf.name}" (turned off — enable when ready)`,
      );
      setCollision(null);
      onImported();
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally {
      setImportingId(null);
    }
  };

  const handleImport = (gf: GlobalFlowItem) => {
    const match = partnerFlows.find((f) => f.name.trim().toLowerCase() === gf.name.trim().toLowerCase());
    if (match) {
      setCollision({ gf, targetId: match.id });
      return;
    }
    doImport(gf, "add");
  };

  const remove = async (gf: GlobalFlowItem) => {
    if (!confirm(`Delete global flow "${gf.name}"? This removes it from the shared library for everyone.`)) return;
    try {
      const res = await fetch(`/api/whatsapp/global-flows/${gf.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFlows((xs) => xs.filter((x) => x.id !== gf.id));
      toast.success("Global flow deleted");
    } catch {
      toast.error("Failed to delete global flow");
    }
  };

  // ── Builder (create / edit a global flow) ───────────────────────
  if (mode === "builder") {
    return (
      <div className="fixed inset-0 z-[60] bg-background">
        <FlowBuilder
          scope="global"
          flowId={editingId}
          loyaltyEnabled={loyaltyEnabled}
          onClose={() => {
            setMode("list");
            setEditingId(null);
            load();
          }}
        />
      </div>
    );
  }

  // ── Full-screen library browser ─────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Globe className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">Global Flows</h2>
            <p className="truncate text-xs text-muted-foreground">
              A shared library of flows. Import one here, or save your own into it.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            onClick={() => {
              setEditingId(null);
              setMode("builder");
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> New Global Flow
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading global flows…
          </div>
        ) : flows.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
            <div className="rounded-full bg-muted p-3">
              <Workflow className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">The library is empty</h3>
            <p className="text-sm text-muted-foreground">
              Create a new global flow, or use “Save to Global” on any of your flows
              to add it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {flows.map((gf) => {
              const conflict = partnerFlows.some(
                (f) => f.name.trim().toLowerCase() === gf.name.trim().toLowerCase(),
              );
              return (
                <div key={gf.id} className="flex flex-col rounded-xl border bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{gf.name}</p>
                      {conflict && (
                        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          in your flows
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {triggerSummary(gf.triggers)}
                    </p>
                    {gf.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{gf.description}</p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={importingId === gf.id}
                      onClick={() => handleImport(gf)}
                    >
                      {importingId === gf.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <DownloadCloud className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Edit global flow"
                      onClick={() => {
                        setEditingId(gf.id);
                        setMode("builder");
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Delete global flow"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => remove(gf)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Name-collision prompt */}
      <Dialog open={!!collision} onOpenChange={(o) => !o && setCollision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You already have a flow named “{collision?.gf.name}”</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Replace your existing flow with the global one (keeps it on/off state), or
            add the global flow as a separate copy?
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCollision(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={!!importingId}
              onClick={() => collision && doImport(collision.gf, "add")}
            >
              Add as copy
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!!importingId}
              onClick={() => collision && doImport(collision.gf, "replace", collision.targetId)}
            >
              {importingId ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Replace existing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Globe,
  Plus,
  Pencil,
  Trash2,
  UploadCloud,
  Search,
  Loader2,
  Workflow,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { searchPartnersForAdminQuery } from "@/api/partners";
import type { TriggerDef } from "@/lib/whatsappFlow/types";
import { FlowBuilder } from "@/components/admin-v2/whatsapp-flow/FlowBuilder";

interface FlowRow {
  id: string;
  name: string;
  description?: string | null;
  triggers?: TriggerDef[];
  enabled?: boolean;
}
interface PartnerRow {
  id: string;
  name?: string | null;
  store_name?: string | null;
  username?: string | null;
  email?: string | null;
}
type Builder =
  | { scope: "global"; flowId: string | null }
  | { scope: "partner"; flowId: string; partnerId: string };

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

export default function SuperadminGlobalFlows() {
  // ── Global library ──────────────────────────────────────────────
  const [globalFlows, setGlobalFlows] = useState<FlowRow[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);

  // ── Builder overlay (global create/edit OR partner-flow edit) ────
  const [builder, setBuilder] = useState<Builder | null>(null);

  // ── Partner search → their flows → import into the library ───────
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerRow | null>(null);
  const [partnerFlows, setPartnerFlows] = useState<FlowRow[]>([]);
  const [loadingPartnerFlows, setLoadingPartnerFlows] = useState(false);
  const [savingGlobalId, setSavingGlobalId] = useState<string | null>(null);

  const loadGlobal = useCallback(async () => {
    setLoadingGlobal(true);
    try {
      const res = await fetch("/api/whatsapp/global-flows");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load global flows");
      setGlobalFlows((data.flows || []) as FlowRow[]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load global flows");
    } finally {
      setLoadingGlobal(false);
    }
  }, []);

  useEffect(() => {
    loadGlobal();
  }, [loadGlobal]);

  const removeGlobal = async (gf: FlowRow) => {
    if (!confirm(`Delete global flow "${gf.name}"? This removes it from the library for every partner.`)) return;
    try {
      const res = await fetch(`/api/whatsapp/global-flows/${gf.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setGlobalFlows((xs) => xs.filter((x) => x.id !== gf.id));
      toast.success("Global flow deleted");
    } catch {
      toast.error("Failed to delete global flow");
    }
  };

  const runSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term) {
      setPartners([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetchFromHasura(searchPartnersForAdminQuery, { query: `%${term}%` });
      setPartners((res?.partners || []) as PartnerRow[]);
    } catch {
      toast.error("Partner search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  // Live typeahead: search 300ms after the user stops typing.
  useEffect(() => {
    if (!query.trim()) {
      setPartners([]);
      return;
    }
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const selectPartner = async (p: PartnerRow) => {
    setSelectedPartner(p);
    setDropdownOpen(false);
    setPartnerFlows([]);
    setLoadingPartnerFlows(true);
    try {
      const res = await fetch(`/api/whatsapp/flows?partnerId=${p.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load flows");
      setPartnerFlows((data.flows || []) as FlowRow[]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load this partner's flows");
    } finally {
      setLoadingPartnerFlows(false);
    }
  };

  // Push a partner's flow into the shared library (upsert by name).
  const importToGlobal = async (flow: FlowRow, partnerId: string) => {
    setSavingGlobalId(flow.id);
    try {
      const r = await fetch(`/api/whatsapp/flows/${flow.id}?partnerId=${partnerId}`);
      const d = await r.json();
      if (!r.ok || !d.flow) throw new Error(d?.error || "Could not load flow");
      const fl = d.flow;
      const res = await fetch("/api/whatsapp/global-flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fl.name,
          description: fl.description ?? null,
          graph: fl.graph,
          escapeKeyword: fl.escape_keyword ?? null,
          runTtlHours: fl.run_ttl_hours,
          oncePerUser: fl.once_per_user,
          cooldownHours: fl.cooldown_hours,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to add to library");
      toast.success(data?.replaced ? `Updated "${fl.name}" in the library` : `Added "${fl.name}" to the library`);
      loadGlobal();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add to library");
    } finally {
      setSavingGlobalId(null);
    }
  };

  // ── Builder (rendered INLINE, not as a fixed overlay — an overlay would sit
  // above the FlowBuilder's save Dialog (z-50) and swallow the save click) ──
  if (builder) {
    return (
      <FlowBuilder
        scope={builder.scope}
        flowId={builder.flowId}
        partnerId={builder.scope === "partner" ? builder.partnerId : undefined}
        loyaltyEnabled
        onClose={() => {
          const wasScope = builder.scope;
          const wasPartner = builder.scope === "partner" ? builder.partnerId : null;
          setBuilder(null);
          if (wasScope === "global") loadGlobal();
          else if (wasPartner) {
            const p = selectedPartner;
            if (p && p.id === wasPartner) selectPartner(p);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Global Flow Library ─────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">Global Flow Library</h2>
            {!loadingGlobal && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {globalFlows.length}
              </span>
            )}
          </div>
          <Button
            onClick={() => setBuilder({ scope: "global", flowId: null })}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> New Global Flow
          </Button>
        </div>

        {loadingGlobal ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : globalFlows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-white py-12 text-center">
            <Workflow className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No global flows yet. Create one, or import from a partner below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {globalFlows.map((gf) => (
              <div key={gf.id} className="flex flex-col rounded-xl border bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{gf.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {triggerSummary(gf.triggers)}
                  </p>
                  {gf.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{gf.description}</p>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setBuilder({ scope: "global", flowId: gf.id })}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    title="Delete from library"
                    onClick={() => removeGlobal(gf)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Import from a partner ───────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold">Import from a partner</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Search a partner, then add any of their flows to the global library (or edit
          the partner&apos;s flow directly).
        </p>

        {/* Live typeahead: results drop down under the box as you type. */}
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => query.trim() && setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            placeholder="Search by store name, name, email, username…"
            className="pl-9 pr-9 bg-white"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}

          {dropdownOpen && query.trim() && (
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-white shadow-lg">
              {searching && partners.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                </div>
              ) : partners.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">No partners found.</div>
              ) : (
                partners.map((p) => (
                  <button
                    key={p.id}
                    // onMouseDown fires before the input's onBlur, so the pick registers.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectPartner(p);
                    }}
                    className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted"
                  >
                    <span className="text-sm font-medium">
                      {p.store_name || p.name || p.username || p.email || p.id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[p.username && `@${p.username}`, p.email].filter(Boolean).join(" · ") || p.id}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {selectedPartner && (
          <div className="rounded-xl border bg-white p-4">
            <p className="mb-3 text-sm font-medium">
              Flows for{" "}
              <span className="text-orange-700">
                {selectedPartner.store_name || selectedPartner.name || selectedPartner.username}
              </span>
            </p>
            {loadingPartnerFlows ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading flows…
              </div>
            ) : partnerFlows.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">This partner has no flows.</p>
            ) : (
              <div className="space-y-2">
                {partnerFlows.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{f.name}</p>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            f.enabled ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {f.enabled ? "Active" : "Off"}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{triggerSummary(f.triggers)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={savingGlobalId === f.id}
                        onClick={() => importToGlobal(f, selectedPartner.id)}
                      >
                        {savingGlobalId === f.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Add to library
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        title="Edit this partner's flow"
                        onClick={() =>
                          setBuilder({ scope: "partner", flowId: f.id, partnerId: selectedPartner.id })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

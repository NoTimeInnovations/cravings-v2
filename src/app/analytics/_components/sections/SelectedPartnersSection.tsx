"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Bike,
  ShoppingBag,
  Building2,
  Search,
  Plus,
  X,
  Star,
  ArrowDownAZ,
  Loader2,
} from "lucide-react";
import { compact } from "../format";
import { SectionHeader } from "./OverviewSection";
import type { SelectedPartner } from "../types";

const STORAGE_KEY = "analytics:selected-partners:v1";
const MAX_PARTNERS = 9;
const REFRESH_MS = 10_000;
const SEARCH_DEBOUNCE_MS = 250;

type SortKey =
  | "orders_desc"
  | "delivery_desc"
  | "takeaway_desc"
  | "name_asc";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "orders_desc", label: "Total orders" },
  { id: "delivery_desc", label: "Delivery" },
  { id: "takeaway_desc", label: "Takeaway" },
  { id: "name_asc", label: "Name (A–Z)" },
];

type StoredPartner = { id: string; name: string; district: string | null };

function readStored(): StoredPartner[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p) => p && typeof p.id === "string" && typeof p.name === "string"
      )
      .slice(0, MAX_PARTNERS)
      .map((p) => ({
        id: p.id,
        name: p.name,
        district: p.district ?? null,
      }));
  } catch {
    return [];
  }
}

function writeStored(list: StoredPartner[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota errors — selections will reset next reload
  }
}

export default function SelectedPartnersSection() {
  const [selected, setSelected] = useState<StoredPartner[]>([]);
  const [stats, setStats] = useState<Record<string, SelectedPartner>>({});
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("orders_desc");
  const [tick, setTick] = useState(0);

  // Hydrate from localStorage once
  useEffect(() => {
    const stored = readStored();
    setSelected(stored);
  }, []);

  const ids = useMemo(() => selected.map((p) => p.id).join(","), [selected]);

  const fetchStats = useCallback(async () => {
    if (!ids) {
      setStats({});
      return;
    }
    try {
      const r = await fetch(
        `/api/stats/selected-partners?ids=${encodeURIComponent(ids)}`,
        { cache: "no-store" }
      );
      const d = await r.json();
      const next: Record<string, SelectedPartner> = {};
      for (const p of (d.partners ?? []) as SelectedPartner[]) {
        next[p.id] = p;
      }
      setStats(next);
    } catch (e) {
      console.error("selected-partners fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, [ids]);

  useEffect(() => {
    if (selected.length === 0) {
      setStats({});
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchStats();
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchStats, selected.length]);

  // Re-fetch on tick without flipping the loading flag (keeps cards stable).
  useEffect(() => {
    if (tick === 0) return;
    fetchStats();
  }, [tick, fetchStats]);

  const addPartner = (p: StoredPartner) => {
    setSelected((prev) => {
      if (prev.some((x) => x.id === p.id)) return prev;
      if (prev.length >= MAX_PARTNERS) return prev;
      const next = [...prev, p];
      writeStored(next);
      return next;
    });
  };

  const removePartner = (id: string) => {
    setSelected((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writeStored(next);
      return next;
    });
    setStats((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const cards = useMemo(() => {
    const enriched = selected.map((p) => {
      const s = stats[p.id];
      return {
        id: p.id,
        name: s?.name ?? p.name,
        district: s?.district ?? p.district,
        totalOrders: s?.totalOrders ?? 0,
        delivery: s?.delivery ?? 0,
        takeaway: s?.takeaway ?? 0,
        monthTotal: s?.monthTotal ?? 0,
        monthDelivery: s?.monthDelivery ?? 0,
        monthTakeaway: s?.monthTakeaway ?? 0,
      };
    });

    const sorters: Record<SortKey, (a: any, b: any) => number> = {
      orders_desc: (a, b) => b.totalOrders - a.totalOrders,
      delivery_desc: (a, b) => b.delivery - a.delivery,
      takeaway_desc: (a, b) => b.takeaway - a.takeaway,
      name_asc: (a, b) => a.name.localeCompare(b.name),
    };

    return [...enriched].sort(sorters[sort]);
  }, [selected, stats, sort]);

  const atCapacity = selected.length >= MAX_PARTNERS;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Key partners"
        subtitle="Pick up to 9 partners — last 24h + current month counts, refreshed every 10s"
        right={
          <div className="flex items-center gap-3">
            <SortSelect value={sort} onChange={setSort} />
            <AddPartnerButton
              onAdd={addPartner}
              disabled={atCapacity}
              selectedIds={new Set(selected.map((p) => p.id))}
            />
            <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
              {selected.length}/{MAX_PARTNERS}
            </div>
          </div>
        }
      />

      {selected.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <PartnerCard
              key={c.id}
              data={c}
              loading={loading && stats[c.id] === undefined}
              onRemove={() => removePartner(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-10 bg-white text-center">
      <div className="mx-auto size-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
        <Star className="size-5" />
      </div>
      <div className="text-base font-semibold">No partners selected yet</div>
      <div className="text-sm text-muted-foreground mt-1">
        Use "Add partner" above to start building your watchlist (up to{" "}
        {MAX_PARTNERS}).
      </div>
    </Card>
  );
}

function PartnerCard({
  data,
  loading,
  onRemove,
}: {
  data: {
    id: string;
    name: string;
    district: string | null;
    totalOrders: number;
    delivery: number;
    takeaway: number;
    monthTotal: number;
    monthDelivery: number;
    monthTakeaway: number;
  };
  loading: boolean;
  onRemove: () => void;
}) {
  const monthLabel = new Date().toLocaleString(undefined, { month: "long" });

  return (
    <Card className="p-4 bg-white relative">
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 size-6 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center"
        aria-label={`Remove ${data.name}`}
      >
        <X className="size-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-7">
        <div className="size-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Building2 className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{data.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {data.district ?? "—"}
          </div>
        </div>
      </div>

      {/* 24h block */}
      <div className="mt-4 flex items-baseline gap-2">
        <div className="text-3xl font-semibold tabular-nums">
          {loading ? <Skeleton className="h-9 w-16 inline-block" /> : compact(data.totalOrders)}
        </div>
        <div className="text-xs text-muted-foreground">total orders · 24h</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric
          label="Delivery"
          value={data.delivery}
          icon={<Bike className="size-3.5" />}
          tone="text-blue-700 bg-blue-50"
          loading={loading}
        />
        <Metric
          label="Takeaway"
          value={data.takeaway}
          icon={<ShoppingBag className="size-3.5" />}
          tone="text-amber-700 bg-amber-50"
          loading={loading}
        />
      </div>

      {/* This-month block */}
      <div className="mt-4 pt-3 border-t">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-semibold tabular-nums">
            {loading ? <Skeleton className="h-7 w-14 inline-block" /> : compact(data.monthTotal)}
          </div>
          <div className="text-xs text-muted-foreground">
            total orders · {monthLabel}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Metric
            label="Delivery"
            value={data.monthDelivery}
            icon={<Bike className="size-3.5" />}
            tone="text-blue-700 bg-blue-50"
            loading={loading}
          />
          <Metric
            label="Takeaway"
            value={data.monthTakeaway}
            icon={<ShoppingBag className="size-3.5" />}
            tone="text-amber-700 bg-amber-50"
            loading={loading}
          />
        </div>
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border bg-white px-2.5 py-2 flex items-center gap-2">
      <div className={cn("size-6 rounded-md flex items-center justify-center", tone)}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-semibold tabular-nums">
          {loading ? <Skeleton className="h-4 w-8" /> : compact(value)}
        </div>
      </div>
    </div>
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (s: SortKey) => void;
}) {
  const active = SORT_OPTIONS.find((o) => o.id === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 h-8 text-xs shadow-sm hover:bg-neutral-50"
        >
          <ArrowDownAZ className="size-3.5 text-muted-foreground" />
          <span>Sort: {active?.label ?? "—"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[180px] p-1 bg-white">
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-neutral-100",
              o.id === value && "bg-neutral-100 font-medium"
            )}
          >
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function AddPartnerButton({
  onAdd,
  disabled,
  selectedIds,
}: {
  onAdd: (p: StoredPartner) => void;
  disabled: boolean;
  selectedIds: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StoredPartner[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/stats/partner-search?q=${encodeURIComponent(query.trim())}`,
          { cache: "no-store" }
        );
        const d = await r.json();
        setResults(d.partners ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setQuery("");
          setResults([]);
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md h-8 px-3 text-xs shadow-sm transition-colors",
            disabled
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          <Plus className="size-3.5" />
          Add partner
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[300px] p-0 bg-white"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b px-2 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, store or city..."
            className="h-7 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
          {searching && (
            <Loader2 className="size-3.5 text-muted-foreground animate-spin" />
          )}
        </div>
        <ul className="max-h-[280px] overflow-y-auto py-1">
          {query.trim().length < 2 && (
            <li className="px-3 py-3 text-[11px] text-muted-foreground text-center">
              Type at least 2 characters to search
            </li>
          )}
          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <li className="px-3 py-3 text-[11px] text-muted-foreground text-center">
              No partners match "{query}"
            </li>
          )}
          {results.map((p) => {
            const already = selectedIds.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => {
                    onAdd(p);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs",
                    already
                      ? "text-muted-foreground cursor-not-allowed"
                      : "hover:bg-neutral-100"
                  )}
                >
                  <span className="truncate">
                    {p.name}
                    {p.district && (
                      <span className="text-muted-foreground"> · {p.district}</span>
                    )}
                  </span>
                  {already && (
                    <span className="text-[10px] text-muted-foreground">added</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

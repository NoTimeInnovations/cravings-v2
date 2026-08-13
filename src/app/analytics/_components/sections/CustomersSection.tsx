"use client";

/**
 * All Customers — a CRM roster of every partner with the sales/onboarding state
 * we track by hand (interest, menu-created, payment gateway, PG status,
 * delivery, QR setup) plus ONLINE-order stats (POS excluded) and the partner's
 * join date.
 *
 * Order stats are NOT live: they refresh only when "Sync list" is clicked
 * (POST /api/stats/customers/sync recomputes and stores them). This view reads
 * the stored rows (GET) and PATCHes the manual fields as they're edited.
 *
 * Built for slicing: a search box + a Filters panel (interest / menu / payment /
 * delivery / QR / order activity / join window) + sortable columns, so you can
 * pull almost any cut of the roster. To stay fast with 1000+ rows, each row is
 * memoized and only ~PAGE rows render at a time ("Load more" / "Show all").
 *
 * Blocked partners (test/junk) are hidden; block from the row, review/unblock in
 * the full-screen Block-list modal (shared with the Target tab). The whole table
 * also opens full-screen. Sticky header + sticky first (name) column throughout.
 */

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  RefreshCw,
  Loader2,
  Building2,
  Ban,
  ShieldBan,
  Undo2,
  ArrowUpDown,
  Sparkles,
  Maximize2,
  X,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./OverviewSection";
import type {
  CustomerEntry,
  CustomerInterest,
  CustomerPatch,
  BlocklistEntry,
} from "../types";
import { toast } from "sonner";

// ---------------------------------------------------------------- config
const WEEKS = 8;
const PAGE = 50;
const nf = (n: number) => Math.round(n).toLocaleString("en-IN");

const INTEREST_META: Record<CustomerInterest, { label: string; cls: string }> = {
  warm: { label: "Warm", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  hot: { label: "Hot", cls: "text-rose-700 bg-rose-50 border-rose-200" },
  active: { label: "Active", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};
const INTEREST_ORDER: CustomerInterest[] = ["warm", "hot", "active"];

const PAYMENT_PRESETS = ["cashfree", "razorpay", "manual"];
const PAYMENT_LABEL: Record<string, string> = {
  cashfree: "Cashfree",
  razorpay: "Razorpay",
  manual: "Manual",
};
const DELIVERY_PRESETS = ["porter", "rapido", "own", "mix"];
const DELIVERY_LABEL: Record<string, string> = {
  porter: "Porter",
  rapido: "Rapido",
  own: "Own",
  mix: "Mix",
};
const QR_FIELDS: { key: keyof CustomerEntry; label: string }[] = [
  { key: "qrTable", label: "Table QR" },
  { key: "qrCounter", label: "Counter QR" },
  { key: "qrSwiggyZomato", label: "Swiggy / Zomato card" },
  { key: "qrOwnParcels", label: "Own parcels card" },
];

// ---------------------------------------------------------------- filters
type Filters = {
  interest: string;
  menu: string;
  payment: string;
  delivery: string;
  qr: string;
  activity: string;
  joined: string;
};
const DEFAULT_FILTERS: Filters = {
  interest: "all",
  menu: "all",
  payment: "all",
  delivery: "all",
  qr: "all",
  activity: "all",
  joined: "all",
};
const FILTER_FACETS: {
  key: keyof Filters;
  label: string;
  options: { v: string; label: string }[];
}[] = [
  {
    key: "interest",
    label: "Interest",
    options: [
      { v: "all", label: "All" },
      { v: "warm", label: "Warm" },
      { v: "hot", label: "Hot" },
      { v: "active", label: "Active" },
    ],
  },
  {
    key: "menu",
    label: "Menu",
    options: [
      { v: "all", label: "All" },
      { v: "created", label: "Created" },
      { v: "pending", label: "Pending" },
    ],
  },
  {
    key: "payment",
    label: "Payment",
    options: [
      { v: "all", label: "All" },
      { v: "cashfree", label: "Cashfree" },
      { v: "razorpay", label: "Razorpay" },
      { v: "manual", label: "Manual" },
      { v: "other", label: "Other" },
      { v: "none", label: "Not set" },
    ],
  },
  {
    key: "delivery",
    label: "Delivery",
    options: [
      { v: "all", label: "All" },
      { v: "porter", label: "Porter" },
      { v: "rapido", label: "Rapido" },
      { v: "own", label: "Own" },
      { v: "mix", label: "Mix" },
      { v: "none", label: "Not set" },
    ],
  },
  {
    key: "qr",
    label: "QR setup",
    options: [
      { v: "all", label: "All" },
      { v: "any", label: "Any set" },
      { v: "complete", label: "Complete" },
      { v: "none", label: "None" },
    ],
  },
  {
    key: "activity",
    label: "Orders",
    options: [
      { v: "all", label: "All" },
      { v: "active_week", label: "Active this week" },
      { v: "has_orders", label: "Has orders" },
      { v: "no_orders", label: "No orders" },
      { v: "dormant", label: "Dormant (churned)" },
    ],
  },
  {
    key: "joined",
    label: "Joined",
    options: [
      { v: "all", label: "Any time" },
      { v: "7", label: "Last 7 days" },
      { v: "30", label: "Last 30 days" },
      { v: "90", label: "Last 90 days" },
      { v: "older", label: "Over 90 days" },
    ],
  },
];

const daysSince = (iso: string | null) =>
  iso ? (Date.now() - Date.parse(iso)) / 86_400_000 : NaN;

function matchesFilters(e: CustomerEntry, f: Filters): boolean {
  if (f.interest !== "all" && e.interest !== f.interest) return false;
  if (f.menu === "created" && !e.menuCreated) return false;
  if (f.menu === "pending" && e.menuCreated) return false;

  if (f.payment !== "all") {
    const pg = e.paymentGateway;
    if (f.payment === "none") {
      if (pg) return false;
    } else if (f.payment === "other") {
      if (!pg || PAYMENT_PRESETS.includes(pg)) return false;
    } else if (pg !== f.payment) {
      return false;
    }
  }

  if (f.delivery !== "all") {
    if (f.delivery === "none") {
      if (e.delivery) return false;
    } else if (e.delivery !== f.delivery) {
      return false;
    }
  }

  if (f.qr !== "all") {
    const arr = [e.qrTable, e.qrCounter, e.qrSwiggyZomato, e.qrOwnParcels];
    const anyT = arr.some(Boolean);
    const allT = arr.every(Boolean);
    if (f.qr === "any" && !anyT) return false;
    if (f.qr === "complete" && !allT) return false;
    if (f.qr === "none" && anyT) return false;
  }

  if (f.activity !== "all") {
    const sum8 = e.weekly.reduce((s, n) => s + n, 0);
    if (f.activity === "active_week" && !(e.weekly[0] > 0)) return false;
    if (f.activity === "has_orders" && !(e.totalOrders > 0)) return false;
    if (f.activity === "no_orders" && e.totalOrders !== 0) return false;
    if (f.activity === "dormant" && !(e.totalOrders > 0 && sum8 === 0)) return false;
  }

  if (f.joined !== "all") {
    const d = daysSince(e.joinedAt);
    if (Number.isNaN(d)) return false;
    if (f.joined === "older") {
      if (d <= 90) return false;
    } else if (d > Number(f.joined)) {
      return false;
    }
  }
  return true;
}
const activeFilterCount = (f: Filters) => Object.values(f).filter((v) => v !== "all").length;

// ---------------------------------------------------------------- sticky cell classes
const HEAD =
  "sticky top-0 z-20 bg-muted border-b px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap";
const HEAD_NUM = cn(HEAD, "text-right");
const NAME_HEAD =
  "sticky left-0 top-0 z-30 bg-muted border-b px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap shadow-[1px_0_0_0_rgb(229,231,235)]";
const NAME_CELL =
  "sticky left-0 z-10 bg-white border-b border-muted px-3 py-2.5 align-top shadow-[1px_0_0_0_rgb(229,231,235)]";
const CELL = "border-b border-muted px-3 py-2 align-top";

// ---------------------------------------------------------------- date helpers
const fmtShort = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
function weekRanges(ref: Date) {
  const day = 86_400_000;
  return Array.from({ length: WEEKS }, (_, i) => {
    const end = new Date(ref.getTime() - i * 7 * day);
    const start = new Date(ref.getTime() - (i + 1) * 7 * day);
    return {
      label: i === 0 ? "This wk" : `${i}w ago`,
      title: `${fmtShort(start)} – ${fmtShort(end)}`,
    };
  });
}
function fmtJoined(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return "—";
  }
}
function relJoined(iso: string | null): string {
  const d = daysSince(iso);
  if (Number.isNaN(d)) return "";
  if (d < 1) return "today";
  const days = Math.floor(d);
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ---------------------------------------------------------------- component
export default function CustomersSection() {
  const [entries, setEntries] = useState<CustomerEntry[] | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [sort, setSort] = useState<SortKey>("total_desc");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const [blocklist, setBlocklist] = useState<BlocklistEntry[] | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/stats/customers", { cache: "no-store" });
      const d = await r.json();
      setEntries(d.entries ?? []);
      setSyncedAt(d.syncedAt ?? null);
    } catch (e) {
      console.error("customers load failed", e);
      setEntries((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlocklist = useCallback(async () => {
    try {
      const r = await fetch("/api/stats/blocklist", { cache: "no-store" });
      const d = await r.json();
      setBlocklist(d.entries ?? []);
    } catch (e) {
      console.error("blocklist load failed", e);
      setBlocklist((prev) => prev ?? []);
    }
  }, []);

  // Load once — NOT real-time (stats only change on Sync).
  useEffect(() => {
    load();
    loadBlocklist();
  }, [load, loadBlocklist]);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const r = await fetch("/api/stats/customers/sync", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(d.error ?? "Sync failed");
        return;
      }
      const bits = [`${nf(d.partners ?? 0)} customers`];
      if (d.added > 0) bits.push(`${nf(d.added)} new`);
      bits.push(`${nf(d.withOrders ?? 0)} with online orders`);
      toast.success(`Synced — ${bits.join(", ")}.`);
      await load();
    } catch (e) {
      console.error("customers sync failed", e);
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const patch = useCallback(
    async (id: string, p: CustomerPatch) => {
      setEntries((prev) => (prev ? prev.map((e) => (e.id === id ? { ...e, ...p } : e)) : prev));
      const r = await fetch("/api/stats/customers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...p }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error ?? "Update failed");
        await load();
      }
    },
    [load]
  );

  const block = useCallback(
    async (partnerId: string, name: string) => {
      if (!confirm(`Block ${name}? It will be hidden here and kept out of all analytics.`)) return;
      setEntries((prev) => (prev ? prev.filter((e) => e.partnerId !== partnerId) : prev));
      const r = await fetch("/api/stats/blocklist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(d.error ?? "Couldn't block");
        await load();
        return;
      }
      toast.success(`Blocked ${name}`);
      await Promise.all([loadBlocklist(), load()]);
    },
    [load, loadBlocklist]
  );

  const unblock = useCallback(
    async (id: string, name: string) => {
      setBlocklist((prev) => (prev ? prev.filter((b) => b.id !== id) : prev));
      const r = await fetch(`/api/stats/blocklist?id=${id}`, { method: "DELETE" });
      if (!r.ok) {
        toast.error("Unblock failed");
        await loadBlocklist();
      } else {
        toast.success(`Unblocked ${name}`);
        await load(); // they reappear in the roster
      }
    },
    [load, loadBlocklist]
  );

  const list = entries ?? [];
  const blocked = blocklist ?? [];
  const ranges = useMemo(() => weekRanges(syncedAt ? new Date(syncedAt) : new Date()), [syncedAt]);

  // filter → search → sort (all client-side; the roster is already loaded)
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = list.filter(
      (e) =>
        matchesFilters(e, filters) &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          (e.district ?? "").toLowerCase().includes(q))
    );
    return sortRows(filtered, sort);
  }, [list, filters, search, sort]);

  // pagination resets on this key (sort/search/filters) — NOT on inline edits
  const filterKey = `${sort}|${search.trim().toLowerCase()}|${JSON.stringify(filters)}`;

  const counts = useMemo(() => {
    const c = { warm: 0, hot: 0, active: 0 };
    for (const e of list) c[e.interest]++;
    return c;
  }, [list]);

  const toolbar = (
    <CustomerToolbar
      search={search}
      setSearch={setSearch}
      filters={filters}
      setFilters={setFilters}
      sort={sort}
      setSort={setSort}
      total={list.length}
      filteredCount={rows.length}
    />
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="All Customers"
        subtitle="Every partner and where they are in onboarding — join date, menu, payments, delivery, QR. Order counts are online only (POS excluded) and refresh when you sync."
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-medium text-muted-foreground shadow-sm hover:bg-neutral-50"
              title="Open the table in full screen"
            >
              <Maximize2 className="size-3.5" />
              Full screen
            </button>
            <button
              type="button"
              onClick={() => setBlockOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-medium text-muted-foreground shadow-sm hover:bg-neutral-50"
              title="View / manage blocked accounts"
            >
              <ShieldBan className="size-3.5" />
              Block list
              {blocked.length > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
                  {nf(blocked.length)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
              title="Recompute order stats & pull in new partners"
            >
              {syncing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {syncing ? "Syncing…" : "Sync list"}
            </button>
          </div>
        }
      />

      {/* summary chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip label="Customers" value={nf(list.length)} />
        <Chip label="Warm" value={nf(counts.warm)} tone="amber" />
        <Chip label="Hot" value={nf(counts.hot)} tone="rose" />
        <Chip label="Active" value={nf(counts.active)} tone="emerald" />
        <span className="ml-auto text-[11px] text-muted-foreground">
          {syncedAt
            ? `Stats synced ${new Date(syncedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
            : "Not synced yet — hit Sync list"}
        </span>
      </div>

      <Card className="border bg-white p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
            Loading customers…
          </div>
        ) : list.length === 0 ? (
          <CustomersEmpty onSync={sync} syncing={syncing} />
        ) : (
          <>
            {toolbar}
            <PaginatedTable
              rows={rows}
              ranges={ranges}
              onPatch={patch}
              onBlock={block}
              filterKey={filterKey}
              scrollClassName="max-h-[72vh]"
            />
          </>
        )}
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Interest, menu, payments, delivery and QR are saved in the database and shared with everyone.
        Order counts are online orders (POS excluded) as of the last sync — click "Sync list" to
        refresh them and pull in newly-created partners.
      </p>

      <BlockListModal
        open={blockOpen}
        onOpenChange={setBlockOpen}
        entries={blocklist}
        onUnblock={unblock}
      />

      {/* full-screen table */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex flex-col gap-0 p-0 sm:h-[97vh] sm:max-w-[99vw]">
          <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b px-4 py-3 pr-14">
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              All Customers
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {nf(list.length)}
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={sync}
                disabled={syncing}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
                title="Recompute order stats & pull in new partners"
              >
                {syncing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {syncing ? "Syncing…" : "Sync list"}
              </button>
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-medium text-muted-foreground shadow-sm hover:bg-neutral-50"
                title="Exit full screen"
              >
                <X className="size-3.5" />
                Close
              </button>
            </div>
          </DialogHeader>
          {list.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No customers — sync the list first.
            </div>
          ) : (
            <>
              {toolbar}
              <div className="flex min-h-0 flex-1 flex-col">
                <PaginatedTable
                  rows={rows}
                  ranges={ranges}
                  onPatch={patch}
                  onBlock={block}
                  filterKey={filterKey}
                  wrapperClassName="flex-1"
                  scrollClassName="flex-1 min-h-0"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------- toolbar (search + filters + sort)
function CustomerToolbar({
  search,
  setSearch,
  filters,
  setFilters,
  sort,
  setSort,
  total,
  filteredCount,
}: {
  search: string;
  setSearch: (s: string) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  total: number;
  filteredCount: number;
}) {
  const active = activeFilterCount(filters);
  const narrowed = active > 0 || search.trim().length > 0;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white px-3 py-2">
      <div className="flex min-w-[180px] flex-1 items-center gap-2">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or district…"
          className="h-7 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
      <FiltersPopover filters={filters} setFilters={setFilters} active={active} />
      <SortSelect value={sort} onChange={setSort} />
      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
        {narrowed ? `${nf(filteredCount)} of ${nf(total)}` : `${nf(total)} customers`}
      </span>
    </div>
  );
}

function FiltersPopover({
  filters,
  setFilters,
  active,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  active: number;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-xs shadow-sm hover:bg-neutral-50"
        >
          <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          Filters
          {active > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
              {active}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[264px] space-y-2 bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Filters</span>
          {active > 0 && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-[11px] text-muted-foreground underline hover:text-foreground"
            >
              Reset all
            </button>
          )}
        </div>
        {FILTER_FACETS.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <select
              value={filters[f.key]}
              onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
              className="h-7 min-w-[132px] rounded-md border border-input bg-background px-2 text-xs shadow-sm"
            >
              {f.options.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------- table (shared inline + full screen)
function CustomerTable({
  rows,
  ranges,
  onPatch,
  onBlock,
}: {
  rows: CustomerEntry[];
  ranges: { label: string; title: string }[];
  onPatch: (id: string, p: CustomerPatch) => void;
  onBlock: (partnerId: string, name: string) => void;
}) {
  return (
    <table className="w-full min-w-[1820px] border-separate border-spacing-0 text-sm">
      <thead>
        <tr>
          <th className={NAME_HEAD}>Restaurant</th>
          <th className={HEAD}>Joined</th>
          <th className={HEAD}>Interest</th>
          <th className={HEAD}>Menu</th>
          <th className={HEAD}>Payment gateway</th>
          <th className={HEAD}>PG status</th>
          <th className={HEAD}>Delivery</th>
          <th className={HEAD}>QR setup</th>
          <th className={HEAD_NUM} title="All-time online orders (POS excluded)">
            Total orders
          </th>
          {ranges.map((r, i) => (
            <th key={i} className={HEAD_NUM} title={`Online orders · ${r.title}`}>
              {r.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <CustomerRow key={e.id} e={e} onPatch={onPatch} onBlock={onBlock} />
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------- paginated table
// Only ~PAGE rows render at a time; "Load more" reveals the next page. Resets to
// the first page when `filterKey` (sort/search/filters) changes — but NOT on
// inline edits, so loaded pages survive editing a cell.
function PaginatedTable({
  rows,
  ranges,
  onPatch,
  onBlock,
  filterKey,
  wrapperClassName,
  scrollClassName,
}: {
  rows: CustomerEntry[];
  ranges: { label: string; title: string }[];
  onPatch: (id: string, p: CustomerPatch) => void;
  onBlock: (partnerId: string, name: string) => void;
  filterKey: string;
  wrapperClassName?: string;
  scrollClassName?: string;
}) {
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => setVisible(PAGE), [filterKey]);

  const shown = rows.slice(0, visible);
  const remaining = rows.length - shown.length;

  return (
    <div className={cn("flex min-h-0 flex-col", wrapperClassName)}>
      <div className={cn("overflow-auto", scrollClassName)}>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No customers match these filters.
          </div>
        ) : (
          <>
            <CustomerTable rows={shown} ranges={ranges} onPatch={onPatch} onBlock={onBlock} />
            {remaining > 0 && (
              <div className="sticky left-0 flex flex-wrap items-center justify-center gap-3 border-t bg-muted/20 px-3 py-3">
                <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE)}>
                  Load {nf(Math.min(PAGE, remaining))} more
                </Button>
                <button
                  type="button"
                  onClick={() => setVisible(rows.length)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Show all {nf(rows.length)}
                </button>
                <span className="text-[11px] text-muted-foreground">{nf(remaining)} remaining</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- row
const CustomerRow = memo(function CustomerRow({
  e,
  onPatch,
  onBlock,
}: {
  e: CustomerEntry;
  onPatch: (id: string, p: CustomerPatch) => void;
  onBlock: (partnerId: string, name: string) => void;
}) {
  const save = (p: CustomerPatch) => onPatch(e.id, p);

  return (
    <tr className="group">
      {/* sticky name + block */}
      <td className={NAME_CELL}>
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Building2 className="size-3.5" />
          </div>
          <div className="min-w-0">
            {e.username ? (
              <a
                href={`/${e.username}`}
                target="_blank"
                rel="noreferrer"
                className="block max-w-[190px] truncate font-medium hover:text-primary hover:underline"
                title={e.name}
              >
                {e.name}
              </a>
            ) : (
              <span className="block max-w-[190px] truncate font-medium" title={e.name}>
                {e.name}
              </span>
            )}
            <div className="max-w-[190px] truncate text-[11px] text-muted-foreground">
              {e.district ?? "—"}
            </div>
            <button
              type="button"
              onClick={() => onBlock(e.partnerId, e.name)}
              className="mt-1 inline-flex items-center gap-1 rounded border border-transparent px-1 py-0.5 text-[10px] font-medium text-muted-foreground/80 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
              title="Block — hide and keep out of analytics"
            >
              <Ban className="size-2.5" />
              Block
            </button>
          </div>
        </div>
      </td>

      {/* joined */}
      <td className={CELL}>
        <div
          className="whitespace-nowrap text-xs font-medium"
          title={e.joinedAt ? new Date(e.joinedAt).toLocaleString("en-IN") : "unknown"}
        >
          {fmtJoined(e.joinedAt)}
        </div>
        <div className="text-[10px] text-muted-foreground">{relJoined(e.joinedAt)}</div>
      </td>

      {/* interest */}
      <td className={CELL}>
        <InterestSelect value={e.interest} onChange={(v) => save({ interest: v })} />
      </td>

      {/* menu */}
      <td className={CELL}>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={e.menuCreated}
            onChange={(ev) => save({ menuCreated: ev.target.checked })}
            className="size-4 accent-primary"
          />
          <span className="whitespace-nowrap text-[11px] text-muted-foreground">
            {e.menuCreated ? "Created" : "Pending"} · {nf(e.menuItemCount)} items
          </span>
        </label>
      </td>

      {/* payment gateway */}
      <td className={CELL}>
        <PaymentCell value={e.paymentGateway} onSave={(v) => save({ paymentGateway: v })} />
      </td>

      {/* PG status */}
      <td className={CELL}>
        <TextAreaCell
          value={e.pgStatus}
          placeholder="status…"
          onSave={(v) => save({ pgStatus: v })}
        />
      </td>

      {/* delivery */}
      <td className={CELL}>
        <DeliveryCell
          value={e.delivery}
          note={e.deliveryNote}
          onSaveDelivery={(v) => save({ delivery: v })}
          onSaveNote={(v) => save({ deliveryNote: v })}
        />
      </td>

      {/* QR setup */}
      <td className={CELL}>
        <div className="grid grid-cols-1 gap-1">
          {QR_FIELDS.map((f) => (
            <label key={f.key as string} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={!!e[f.key]}
                onChange={(ev) => save({ [f.key]: ev.target.checked } as CustomerPatch)}
                className="size-3.5 accent-primary"
              />
              <span className="whitespace-nowrap text-[11px] text-muted-foreground">{f.label}</span>
            </label>
          ))}
        </div>
      </td>

      {/* total */}
      <td className={cn(CELL, "text-right font-semibold tabular-nums")}>{nf(e.totalOrders)}</td>

      {/* weekly */}
      {Array.from({ length: WEEKS }, (_, i) => {
        const v = e.weekly[i] ?? 0;
        return (
          <td
            key={i}
            className={cn(
              CELL,
              "text-right tabular-nums",
              v === 0 ? "text-muted-foreground/50" : "text-foreground"
            )}
          >
            {nf(v)}
          </td>
        );
      })}
    </tr>
  );
});

// ---------------------------------------------------------------- editable cells
function InterestSelect({
  value,
  onChange,
}: {
  value: CustomerInterest;
  onChange: (v: CustomerInterest) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CustomerInterest)}
      className={cn(
        "h-7 appearance-none rounded-full border px-2.5 text-[11px] font-medium shadow-sm outline-none",
        INTEREST_META[value].cls
      )}
    >
      {INTEREST_ORDER.map((s) => (
        <option key={s} value={s} className="bg-white text-foreground">
          {INTEREST_META[s].label}
        </option>
      ))}
    </select>
  );
}

function PaymentCell({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
}) {
  const isOther = !!value && !PAYMENT_PRESETS.includes(value);
  const [mode, setMode] = useState<string>(value ? (isOther ? "other" : value) : "");
  const [custom, setCustom] = useState(isOther ? (value as string) : "");

  useEffect(() => {
    const other = !!value && !PAYMENT_PRESETS.includes(value);
    setMode(value ? (other ? "other" : (value as string)) : "");
    setCustom(other ? (value as string) : "");
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <select
        value={mode}
        onChange={(e) => {
          const v = e.target.value;
          setMode(v);
          if (v === "other") return; // wait for the custom input
          onSave(v || null);
        }}
        className="h-7 rounded-md border border-input bg-background px-2 text-[11px] shadow-sm"
      >
        <option value="">—</option>
        {PAYMENT_PRESETS.map((p) => (
          <option key={p} value={p}>
            {PAYMENT_LABEL[p]}
          </option>
        ))}
        <option value="other">Other…</option>
      </select>
      {mode === "other" && (
        <Input
          value={custom}
          autoFocus
          placeholder="type gateway…"
          maxLength={60}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={() => onSave(custom.trim() || null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="h-7 w-[120px] text-[11px]"
        />
      )}
    </div>
  );
}

function DeliveryCell({
  value,
  note,
  onSaveDelivery,
  onSaveNote,
}: {
  value: string | null;
  note: string | null;
  onSaveDelivery: (v: string | null) => void;
  onSaveNote: (v: string | null) => void;
}) {
  const [n, setN] = useState(note ?? "");
  useEffect(() => setN(note ?? ""), [note]);

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value ?? ""}
        onChange={(e) => onSaveDelivery(e.target.value || null)}
        className="h-7 rounded-md border border-input bg-background px-2 text-[11px] shadow-sm"
      >
        <option value="">—</option>
        {DELIVERY_PRESETS.map((p) => (
          <option key={p} value={p}>
            {DELIVERY_LABEL[p]}
          </option>
        ))}
      </select>
      {value === "mix" && (
        <Input
          value={n}
          placeholder="mix details…"
          maxLength={120}
          onChange={(e) => setN(e.target.value)}
          onBlur={() => {
            if ((note ?? "") !== n.trim()) onSaveNote(n.trim() || null);
          }}
          className="h-7 w-[130px] text-[11px]"
        />
      )}
    </div>
  );
}

function TextAreaCell({
  value,
  placeholder,
  onSave,
}: {
  value: string | null;
  placeholder?: string;
  onSave: (v: string | null) => void;
}) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <textarea
      value={v}
      placeholder={placeholder}
      maxLength={300}
      rows={2}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if ((value ?? "") !== v.trim()) onSave(v.trim() || null);
      }}
      className="min-h-[2.2rem] w-[150px] resize-y rounded-md border border-input bg-background px-2 py-1 text-[11px] shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

// ---------------------------------------------------------------- sorting
type SortKey =
  | "total_desc"
  | "week_desc"
  | "joined_desc"
  | "joined_asc"
  | "interest"
  | "name_asc";
const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "total_desc", label: "Total orders" },
  { id: "week_desc", label: "This week" },
  { id: "joined_desc", label: "Recently joined" },
  { id: "joined_asc", label: "Oldest joined" },
  { id: "interest", label: "Interest" },
  { id: "name_asc", label: "Name (A–Z)" },
];
function sortRows(rows: CustomerEntry[], sort: SortKey): CustomerEntry[] {
  const interestRank: Record<CustomerInterest, number> = { active: 0, hot: 1, warm: 2 };
  const t = (iso: string | null) => (iso ? Date.parse(iso) : NaN);
  const cmp: Record<SortKey, (a: CustomerEntry, b: CustomerEntry) => number> = {
    total_desc: (a, b) => b.totalOrders - a.totalOrders,
    week_desc: (a, b) => (b.weekly[0] ?? 0) - (a.weekly[0] ?? 0),
    joined_desc: (a, b) => {
      const ta = t(a.joinedAt);
      const tb = t(b.joinedAt);
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1; // nulls last
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    },
    joined_asc: (a, b) => {
      const ta = t(a.joinedAt);
      const tb = t(b.joinedAt);
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1; // nulls last
      if (Number.isNaN(tb)) return -1;
      return ta - tb;
    },
    interest: (a, b) =>
      interestRank[a.interest] - interestRank[b.interest] || b.totalOrders - a.totalOrders,
    name_asc: (a, b) => a.name.localeCompare(b.name),
  };
  return [...rows].sort(cmp[sort]);
}

function SortSelect({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  const active = SORT_OPTIONS.find((o) => o.id === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-xs shadow-sm hover:bg-neutral-50"
        >
          <ArrowUpDown className="size-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Sort:</span> {active?.label ?? "—"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[180px] p-1 bg-white">
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "w-full rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-neutral-100",
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

// ---------------------------------------------------------------- block-list modal
function BlockListModal({
  open,
  onOpenChange,
  entries,
  onUnblock,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entries: BlocklistEntry[] | null;
  onUnblock: (id: string, name: string) => void;
}) {
  const list = entries ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 sm:h-[90vh] sm:max-w-[95vw]">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ShieldBan className="size-4 text-amber-600" />
            Block list
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {nf(list.length)}
            </span>
          </DialogTitle>
          <p className="text-left text-xs text-muted-foreground">
            Test / junk accounts hidden from All Customers, the Target watchlist and every signup
            count. Unblock to bring one back — it reappears on the next load.
          </p>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-5">
          {entries === null ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
              Loading…
            </div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <ShieldBan className="size-5" />
              </div>
              <div className="text-base font-semibold">Nothing blocked</div>
              <div className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Use the "Block" button under any restaurant's name to keep test / junk accounts out of
                analytics.
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-medium">Restaurant</th>
                    <th className="px-3 py-2.5 text-left font-medium">Note</th>
                    <th className="px-3 py-2.5 text-left font-medium">Blocked on</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                            <ShieldBan className="size-3.5" />
                          </div>
                          <div className="min-w-0">
                            {b.username ? (
                              <a
                                href={`/${b.username}`}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate font-medium hover:text-primary hover:underline"
                              >
                                {b.name}
                              </a>
                            ) : (
                              <span className="truncate font-medium">{b.name}</span>
                            )}
                            <div className="truncate text-[11px] text-muted-foreground">
                              {b.district ?? "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{b.note ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {b.createdAt
                          ? new Date(b.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onUnblock(b.id, b.name)}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-neutral-50 hover:text-foreground"
                        >
                          <Undo2 className="size-3" />
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- small pieces
function CustomersEmpty({ onSync, syncing }: { onSync: () => void; syncing: boolean }) {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Users className="size-6" />
      </div>
      <div className="text-base font-semibold">No customers loaded yet</div>
      <div className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Click "Sync list" to pull in every partner with their online-order stats. You can then track
        interest, menu, payments, delivery and QR for each.
      </div>
      <Button onClick={onSync} disabled={syncing} className="mt-4">
        {syncing ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <Sparkles className="mr-1.5 size-3.5" />
        )}
        Sync list
      </Button>
    </div>
  );
}

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "amber" | "rose" | "emerald";
}) {
  const toneCls =
    tone === "amber"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : tone === "rose"
        ? "text-rose-700 bg-rose-50 border-rose-200"
        : tone === "emerald"
          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
          : "text-foreground bg-white";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        toneCls
      )}
    >
      {label}
      <b className="tabular-nums">{value}</b>
    </span>
  );
}

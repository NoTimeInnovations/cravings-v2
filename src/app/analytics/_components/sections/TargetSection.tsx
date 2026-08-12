"use client";

/**
 * Target — growth & activity for the team.
 *
 * The tab answers two questions, both DB-backed and identical for everyone:
 *   1. How many restaurants are *joining* over time? — "Customers joined",
 *      computed live from partners.created_at (test accounts excluded), with a
 *      custom date range and per-day / per-week / per-month rates.
 *   2. Which restaurants are *actually using* online ordering? — the shared
 *      watchlist. Only the selection (partner + plan + status + note) is stored
 *      in `analytics_watchlist`; all order stats are computed live from the
 *      orders table. "Online orders" here means POS / in-store billing is
 *      excluded — the watchlist is about online-ordering activity.
 *
 * The daily sales log (calls / free trials / paid customers) is shown and can be
 * added to here too; its full history + editing live on the Daily progress tab.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  X,
  Search,
  Loader2,
  Building2,
  RefreshCw,
  ArrowUpDown,
  Check,
  ChevronLeft,
  Pencil,
  Sparkles,
  CalendarRange,
  Ban,
  ShieldBan,
  Undo2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./OverviewSection";
import {
  ProgressSummaryTable,
  QuickLogForm,
  useDailyLogSummary,
  roundOrders,
} from "../progressShared";
import type {
  WatchlistEntry,
  WatchlistStatus,
  SignupsResponse,
  BlocklistEntry,
} from "../types";
import { toast } from "sonner";

// ---------------------------------------------------------------- config
const BASE_PLAN_INR = 3000;
const PLAN_OPTIONS = [3000, 5000];
const REFRESH_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 250;
const ACCENT = "#4f46e5";

const STATUS_META: Record<
  WatchlistStatus,
  { label: string; badge: string; dot: string }
> = {
  paid: {
    label: "Paid",
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  free_trial: {
    label: "Free trial",
    badge: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
};
const STATUS_ORDER: WatchlistStatus[] = ["paid", "free_trial"];

// ---------------------------------------------------------------- utils
const nf = (n: number) => Math.round(n).toLocaleString("en-IN");
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const istToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const addDaysStr = (dateStr: string, n: number) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
};
const fmtDayShort = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const fmtDayFull = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
// full ISO timestamp → "12 Aug 2026"
const fmtStamp = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

// ---------------------------------------------------------------- component
export default function TargetSection() {
  // ---- signups (growth over time)
  const [to, setTo] = useState(istToday);
  const [from, setFrom] = useState(() => addDaysStr(istToday(), -29));
  const [signups, setSignups] = useState<SignupsResponse | null>(null);
  const [signupsLoading, setSignupsLoading] = useState(true);

  const loadSignups = useCallback(
    async (f: string, t: string, soft = false) => {
      if (!soft) setSignupsLoading(true);
      try {
        const r = await fetch(`/api/stats/signups?from=${f}&to=${t}`, { cache: "no-store" });
        const d = await r.json();
        if (!d.error) setSignups(d);
      } catch (e) {
        console.error("signups load failed", e);
      } finally {
        setSignupsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadSignups(from, to);
    const id = setInterval(() => loadSignups(from, to, true), REFRESH_MS);
    return () => clearInterval(id);
  }, [from, to, loadSignups]);

  const setRange = useCallback((f: string, t: string) => {
    setFrom(f);
    setTo(t);
  }, []);

  // ---- watchlist
  const [entries, setEntries] = useState<WatchlistEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortKey>("total_desc");
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    try {
      const r = await fetch("/api/stats/watchlist", { cache: "no-store" });
      const d = await r.json();
      setEntries(d.entries ?? []);
    } catch (e) {
      console.error("watchlist load failed", e);
      if (!soft) setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // ---- block list (test / junk accounts kept out of every analytics number)
  const [blocklist, setBlocklist] = useState<BlocklistEntry[] | null>(null);
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
  useEffect(() => {
    loadBlocklist();
  }, [loadBlocklist]);

  const list = entries ?? [];
  const blocked = blocklist ?? [];
  const existingIds = useMemo(() => new Set(list.map((e) => e.partnerId)), [list]);
  const blockedIds = useMemo(() => new Set(blocked.map((b) => b.partnerId)), [blocked]);

  // ---- watchlist mutations
  const addEntry = useCallback(
    async (
      partnerId: string,
      planInr: number,
      status: WatchlistStatus,
      note: string | null
    ) => {
      const r = await fetch("/api/stats/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerId, planInr, status, note }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(d.error ?? "Couldn't add restaurant");
        return false;
      }
      toast.success("Added to watchlist");
      await load(true);
      return true;
    },
    [load]
  );

  // Sync the watchlist to reality: ADD restaurants with ≥ 2 online orders/week
  // over the last 30 days, and REMOVE the tracked ones that have fallen below
  // (paid restaurants are protected from auto-removal).
  const syncActive = useCallback(async () => {
    setSyncing(true);
    try {
      const r = await fetch("/api/stats/watchlist/sync", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(d.error ?? "Sync failed");
        return;
      }
      const parts: string[] = [];
      if (d.added > 0) parts.push(`added ${d.added}`);
      if (d.removed > 0) parts.push(`removed ${d.removed}`);
      if (parts.length) {
        toast.success(`Watchlist synced — ${parts.join(", ")}.`);
        await load(true);
      } else {
        toast(
          `Watchlist already up to date — ${nf(d.qualified ?? 0)} active restaurant${
            (d.qualified ?? 0) === 1 ? "" : "s"
          } (≥${d.minPerWeek ?? 2} online orders/week).`
        );
      }
      if (d.keptPaidBelow > 0) {
        toast(
          `${nf(d.keptPaidBelow)} paid restaurant${
            d.keptPaidBelow === 1 ? "" : "s"
          } kept despite low orders.`
        );
      }
    } catch (e) {
      console.error("watchlist sync failed", e);
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const patchEntry = useCallback(
    async (id: string, patch: Partial<Pick<WatchlistEntry, "planInr" | "status" | "note">>) => {
      setEntries((prev) =>
        prev ? prev.map((e) => (e.id === id ? { ...e, ...patch } : e)) : prev
      );
      const r = await fetch("/api/stats/watchlist", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error(d.error ?? "Update failed");
        await load(true);
      }
    },
    [load]
  );

  const removeEntry = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Remove ${name} from the watchlist?`)) return;
      setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
      const r = await fetch(`/api/stats/watchlist?id=${id}`, { method: "DELETE" });
      if (!r.ok) {
        toast.error("Remove failed");
        await load(true);
      } else {
        toast.success("Removed from watchlist");
      }
    },
    [load]
  );

  // Block a partner (from a watchlist row or the block-list search): adds them to
  // the block list and drops them from the watchlist. Returns success.
  const blockPartner = useCallback(
    async (partnerId: string, name: string): Promise<boolean> => {
      setEntries((prev) => (prev ? prev.filter((e) => e.partnerId !== partnerId) : prev));
      const r = await fetch("/api/stats/blocklist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(d.error ?? "Couldn't block");
        await load(true);
        return false;
      }
      toast.success(`Blocked ${name}`);
      await Promise.all([loadBlocklist(), load(true)]);
      return true;
    },
    [load, loadBlocklist]
  );

  const unblockPartner = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Unblock ${name}? It can be added to the watchlist and counted again.`)) return;
      setBlocklist((prev) => (prev ? prev.filter((b) => b.id !== id) : prev));
      const r = await fetch(`/api/stats/blocklist?id=${id}`, { method: "DELETE" });
      if (!r.ok) {
        toast.error("Unblock failed");
        await loadBlocklist();
      } else {
        toast.success(`Unblocked ${name}`);
      }
    },
    [loadBlocklist]
  );

  const sortedRows = useMemo(() => sortRows(list, sort), [list, sort]);

  // shared daily-progress summary (calls / free trials / paid customers)
  const { summary: progressSummary, loading: progressLoading, reload: reloadProgress } =
    useDailyLogSummary();

  const paidCount = useMemo(() => list.filter((e) => e.status === "paid").length, [list]);
  const freeTrialCount = list.length - paidCount;
  const ordersLast24h = list.reduce((s, e) => s + e.last24h, 0);

  const kpis = signups?.kpis;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="border bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <TrendingUp className="size-3.5" />
              Growth &amp; activity
            </div>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
              How fast are we growing?
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Track how many restaurants join us over time and spot which of them are actually
              taking online orders — so we spend our energy on the serious ones.
            </p>
          </div>
          <div className="shrink-0 rounded-xl border bg-muted/40 px-4 py-3 text-right">
            <div className="text-2xl font-semibold tabular-nums leading-none">
              {kpis ? nf(kpis.allTime) : "—"}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              restaurants joined · all-time
            </div>
          </div>
        </div>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={<Users className="size-4" />}
          label="Total partners"
          value={kpis ? nf(kpis.allTime) : "—"}
          sub="all-time signups"
        />
        <KpiTrendCard
          icon={<UserPlus className="size-4" />}
          label="Joined · last 7d"
          pair={kpis?.last7}
          prevLabel="prev 7d"
        />
        <KpiTrendCard
          icon={<UserPlus className="size-4" />}
          label="Joined · last 30d"
          pair={kpis?.last30}
          prevLabel="prev 30d"
        />
        <StatCard
          icon={<Building2 className="size-4" />}
          label="On watchlist"
          value={nf(list.length)}
          sub={`${nf(ordersLast24h)} online orders in 24h`}
        />
      </div>

      {/* Customers joined (signups over time) */}
      <SignupsPanel
        data={signups}
        loading={signupsLoading}
        from={from}
        to={to}
        onRange={setRange}
      />

      {/* Our progress — summary + quick add (full history on the Daily progress tab) */}
      <div className="space-y-4">
        <SectionHeader
          title="Our progress"
          subtitle="Calls done, new free trials and new paid customers — add an entry below or manage the full history on the Daily progress tab"
        />
        <Card className="border bg-white p-0 overflow-hidden">
          <ProgressSummaryTable summary={progressSummary} loading={progressLoading} />
          <QuickLogForm onSaved={reloadProgress} />
        </Card>
      </div>

      {/* Watchlist */}
      <div className="space-y-4">
        <SectionHeader
          title="Restaurant watchlist"
          subtitle="The restaurants actually using online ordering — POS / in-store billing is excluded. Sync keeps only the serious ones (≥ 2 online orders / week over the last 30 days)."
          right={
            <div className="flex items-center gap-3">
              <SortSelect value={sort} onChange={setSort} />
              <AddRestaurant existingIds={existingIds} blockedIds={blockedIds} onAdd={addEntry} />
              <button
                type="button"
                onClick={syncActive}
                disabled={syncing}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-medium text-muted-foreground shadow-sm hover:bg-neutral-50 disabled:opacity-60"
                title="Add restaurants with ≥2 online orders/week (last 30 days) and remove those that fell below (paid ones are kept)"
              >
                <Sparkles className={cn("size-3.5", syncing && "animate-pulse")} />
                {syncing ? "Syncing…" : "Sync watchlist"}
              </button>
              <button
                type="button"
                onClick={() => load(true)}
                className="inline-flex size-8 items-center justify-center rounded-md border bg-white text-muted-foreground shadow-sm hover:bg-neutral-50"
                title="Refresh stats"
              >
                <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
              </button>
            </div>
          }
        />

        {/* summary chips */}
        <div className="flex flex-wrap gap-2">
          <Chip label="Tracked" value={nf(list.length)} />
          <Chip label="Paid" value={nf(paidCount)} tone="emerald" />
          <Chip label="Free trial" value={nf(freeTrialCount)} tone="amber" />
          <Chip label="Online · 24h" value={nf(ordersLast24h)} />
        </div>

        <Card className="border bg-white p-0 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
              Loading watchlist…
            </div>
          ) : sortedRows.length === 0 ? (
            <WatchlistEmpty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-medium">Restaurant</th>
                    <th className="px-3 py-2.5 text-left font-medium">Plan</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium" title="Online orders only — POS / in-store excluded">
                      Online orders
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">Avg / day</th>
                    <th className="px-3 py-2.5 text-right font-medium">Avg / week</th>
                    <th className="px-3 py-2.5 text-right font-medium" title="Last 24 hours vs the 24 hours before">
                      Last 24h
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium" title="Last 7 days vs the 7 days before">
                      Last 7d
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium" title="Last 30 days vs the 30 days before">
                      Last 30d
                    </th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((e) => (
                    <WatchRow
                      key={e.id}
                      e={e}
                      onPatch={patchEntry}
                      onRemove={removeEntry}
                      onBlock={blockPartner}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          The selection (restaurant + plan + status) is stored in the database and shared with
          everyone. Order totals and trends are online orders, calculated live each time — nothing is
          cached or kept on this device.
        </p>
      </div>

      {/* Block list */}
      <div className="space-y-4">
        <SectionHeader
          title="Block list"
          subtitle="Test / junk accounts to keep out of analytics — never added to the watchlist or counted in signups."
          right={
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{nf(blocked.length)} blocked</span>
              <BlockRestaurant blockedIds={blockedIds} onBlock={blockPartner} />
            </div>
          }
        />
        <Card className="border bg-white p-0 overflow-hidden">
          {blocklist === null ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
              Loading block list…
            </div>
          ) : blocked.length === 0 ? (
            <BlocklistEmpty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-medium">Restaurant</th>
                    <th className="px-3 py-2.5 text-left font-medium">Note</th>
                    <th className="px-3 py-2.5 text-left font-medium">Blocked on</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {blocked.map((b) => (
                    <BlockRow key={b.id} b={b} onUnblock={unblockPartner} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- signups panel
function SignupsPanel({
  data,
  loading,
  from,
  to,
  onRange,
}: {
  data: SignupsResponse | null;
  loading: boolean;
  from: string;
  to: string;
  onRange: (from: string, to: string) => void;
}) {
  const today = istToday();
  const r = data?.range;
  const delta = r ? r.total - r.prevTotal : 0;
  const pctv = r && r.prevTotal > 0 ? (delta / r.prevTotal) * 100 : r && r.total > 0 ? 100 : 0;
  const tone = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const Icon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : Minus;
  const toneCls =
    tone === "up" ? "text-emerald-600" : tone === "down" ? "text-rose-600" : "text-muted-foreground";

  const PRESETS = [
    { label: "7 days", days: 7 },
    { label: "30 days", days: 30 },
    { label: "90 days", days: 90 },
  ];
  const activePreset = r
    ? PRESETS.find((p) => r.days === p.days && r.to === today)?.days ?? null
    : null;

  return (
    <Card className="border bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <UserPlus className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Customers joined</h3>
            <p className="text-[11px] text-muted-foreground">
              New restaurants over the selected period
            </p>
          </div>
        </div>

        {/* range selector: presets + custom dates */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => onRange(addDaysStr(today, -(p.days - 1)), today)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                activePreset === p.days
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-white text-muted-foreground hover:bg-neutral-50"
              )}
            >
              {p.label}
            </button>
          ))}
          <span className="mx-0.5 hidden text-muted-foreground/60 sm:inline">
            <CalendarRange className="size-3.5" />
          </span>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && onRange(e.target.value, to)}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => e.target.value && onRange(from, e.target.value)}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs shadow-sm"
          />
        </div>
      </div>

      {/* Joined in this period — total for the selected 7 / 30 / 90-day (or custom) range */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Joined in this period
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight tabular-nums text-primary">
            {r ? nf(r.total) : "—"}
          </span>
          {r && (
            <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", toneCls)}>
              <Icon className="size-3.5" />
              {r.prevTotal > 0 ? `${delta > 0 ? "+" : ""}${Math.round(pctv)}%` : r.total > 0 ? "new" : "—"}
            </span>
          )}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {r ? (
            <>
              {nf(r.prevTotal)} in the previous {r.days} day{r.days === 1 ? "" : "s"}
            </>
          ) : (
            "—"
          )}
        </div>
      </div>

      {/* daily chart */}
      <div className="mt-4 h-[240px] w-full">
        {loading && !data ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.series ?? []} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
              <CartesianGrid stroke="#eef0f5" vertical={false} />
              <XAxis
                dataKey="d"
                tickFormatter={fmtDayShort}
                tick={{ fontSize: 11, fill: "#6a7180" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e8ef" }}
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#6a7180" }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                cursor={{ fill: "rgba(79,70,229,0.06)" }}
                content={(p: any) => {
                  if (!p?.active || !p?.payload?.length) return null;
                  const d = p.payload[0]?.payload;
                  return (
                    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm">
                      <div className="mb-1 text-muted-foreground">{fmtDayFull(d.d)}</div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block size-2 rounded-full" style={{ background: ACCENT }} />
                          Joined
                        </span>
                        <b className="tabular-nums">{nf(d.count)}</b>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" fill={ACCENT} radius={[3, 3, 0, 0]} maxBarSize={38} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Based on the date each restaurant was created. Compared against the previous equal-length
        period so you can see whether joins are speeding up or slowing down.
      </p>

      {/* Recent momentum — independent of the range above; each window vs its own previous period */}
      <div className="mt-6 border-t pt-5">
        <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="size-3.5" />
          Recent momentum
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MomentumTile label="Per day" pair={data?.kpis.last24h} prevLabel="the previous day" />
          <MomentumTile label="Per week" pair={data?.kpis.last7} prevLabel="the previous 7 days" />
          <MomentumTile label="Per month" pair={data?.kpis.last30} prevLabel="the previous 30 days" />
        </div>
      </div>
    </Card>
  );
}

// A window (last 24h / 7d / 30d) shown against its own previous equal period.
function MomentumTile({
  label,
  pair,
  prevLabel,
}: {
  label: string;
  pair?: { curr: number; prev: number };
  prevLabel: string;
}) {
  const curr = pair?.curr ?? 0;
  const prev = pair?.prev ?? 0;
  const delta = curr - prev;
  const pctv = prev > 0 ? (delta / prev) * 100 : curr > 0 ? 100 : 0;
  const tone = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const Icon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : Minus;
  const toneCls =
    tone === "up" ? "text-emerald-600" : tone === "down" ? "text-rose-600" : "text-muted-foreground";
  const trend = prev > 0 ? `${delta > 0 ? "+" : ""}${Math.round(pctv)}%` : curr > 0 ? "new" : "—";
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {pair ? nf(curr) : "—"}
        </span>
        {pair && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", toneCls)}>
            <Icon className="size-3.5" />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {pair ? `${nf(prev)} in ${prevLabel}` : "—"}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- watchlist row
function WatchRow({
  e,
  onPatch,
  onRemove,
  onBlock,
}: {
  e: WatchlistEntry;
  onPatch: (
    id: string,
    patch: Partial<Pick<WatchlistEntry, "planInr" | "status" | "note">>
  ) => void;
  onRemove: (id: string, name: string) => void;
  onBlock: (partnerId: string, name: string) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal, setNoteVal] = useState(e.note ?? "");
  const planOptions = PLAN_OPTIONS.includes(e.planInr)
    ? PLAN_OPTIONS
    : [...PLAN_OPTIONS, e.planInr].sort((a, b) => a - b);

  const saveNote = () => {
    setEditingNote(false);
    const v = noteVal.trim();
    if ((e.note ?? "") !== v) onPatch(e.id, { note: v || null });
  };

  return (
    <tr className="border-b border-muted last:border-0 hover:bg-muted/30 align-top">
      {/* restaurant */}
      <td className="px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Building2 className="size-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {e.username ? (
                <a
                  href={`/${e.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-medium hover:text-primary hover:underline"
                >
                  {e.name}
                </a>
              ) : (
                <span className="truncate font-medium">{e.name}</span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {e.district ?? "—"}
            </div>
            {editingNote ? (
              <div className="mt-1 flex items-center gap-1">
                <Input
                  value={noteVal}
                  autoFocus
                  maxLength={200}
                  onChange={(ev) => setNoteVal(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") saveNote();
                    if (ev.key === "Escape") {
                      setNoteVal(e.note ?? "");
                      setEditingNote(false);
                    }
                  }}
                  onBlur={saveNote}
                  placeholder="Add a note…"
                  className="h-6 w-44 px-2 text-[11px]"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNoteVal(e.note ?? "");
                  setEditingNote(true);
                }}
                className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 hover:text-primary"
              >
                <Pencil className="size-2.5" />
                {e.note ? e.note : "note"}
              </button>
            )}
          </div>
        </div>
      </td>

      {/* plan */}
      <td className="px-3 py-2.5">
        <select
          value={e.planInr}
          onChange={(ev) => onPatch(e.id, { planInr: Number(ev.target.value) })}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm tabular-nums"
        >
          {planOptions.map((p) => (
            <option key={p} value={p}>
              {inr(p)}
            </option>
          ))}
        </select>
      </td>

      {/* status */}
      <td className="px-3 py-2.5">
        <div className="relative inline-flex">
          <select
            value={e.status}
            onChange={(ev) => onPatch(e.id, { status: ev.target.value as WatchlistStatus })}
            className={cn(
              "h-8 appearance-none rounded-full border px-3 pr-6 text-xs font-medium shadow-sm outline-none",
              STATUS_META[e.status].badge
            )}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s} className="bg-white text-foreground">
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
      </td>

      {/* total (online) */}
      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
        {nf(e.totalOrders)}
      </td>

      {/* avg/day, avg/week (orders — half-up rounding) */}
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
        {nf(roundOrders(e.avgDaily))}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
        {nf(roundOrders(e.avgWeekly))}
      </td>

      {/* trends */}
      <td className="px-3 py-2.5 text-right">
        <Trend curr={e.last24h} prev={e.prev24h} currLabel="last 24h" prevLabel="prev 24h" />
      </td>
      <td className="px-3 py-2.5 text-right">
        <Trend curr={e.week} prev={e.prevWeek} currLabel="last 7d" prevLabel="prev 7d" />
      </td>
      <td className="px-3 py-2.5 text-right">
        <Trend curr={e.month} prev={e.prevMonth} currLabel="last 30d" prevLabel="prev 30d" />
      </td>

      {/* actions */}
      <td className="px-3 py-2.5 text-right">
        <div className="inline-flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  `Block ${e.name}? It will be removed and never counted or re-added to the watchlist.`
                )
              )
                onBlock(e.partnerId, e.name);
            }}
            className="rounded p-1 text-muted-foreground hover:bg-amber-50 hover:text-amber-600"
            title="Block — remove and keep out of analytics"
          >
            <Ban className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(e.id, e.name)}
            className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
            title="Remove from watchlist"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------- trend cell
function Trend({
  curr,
  prev,
  currLabel,
  prevLabel,
}: {
  curr: number;
  prev: number;
  currLabel: string;
  prevLabel: string;
}) {
  const delta = curr - prev;
  const pctv = prev > 0 ? (delta / prev) * 100 : curr > 0 ? 100 : 0;
  const tone = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const Icon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : Minus;
  const toneCls =
    tone === "up"
      ? "text-emerald-600"
      : tone === "down"
        ? "text-rose-600"
        : "text-muted-foreground";
  const label =
    prev > 0
      ? `${delta > 0 ? "+" : ""}${Math.round(pctv)}%`
      : curr > 0
        ? "new"
        : "—";
  return (
    <div
      className="inline-flex flex-col items-end leading-tight"
      title={`${currLabel} ${nf(curr)} · ${prevLabel} ${nf(prev)}`}
    >
      <span className="font-medium tabular-nums">{nf(curr)}</span>
      <span className={cn("inline-flex items-center gap-0.5 text-[11px]", toneCls)}>
        <Icon className="size-3" />
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- sorting
type SortKey =
  | "total_desc"
  | "day_desc"
  | "week_desc"
  | "month_desc"
  | "status"
  | "name_asc";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "total_desc", label: "Online orders" },
  { id: "day_desc", label: "Last 24h" },
  { id: "week_desc", label: "Last 7 days" },
  { id: "month_desc", label: "Last 30 days" },
  { id: "status", label: "Status" },
  { id: "name_asc", label: "Name (A–Z)" },
];

function sortRows(rows: WatchlistEntry[], sort: SortKey): WatchlistEntry[] {
  const statusRank: Record<WatchlistStatus, number> = { paid: 0, free_trial: 1 };
  const cmp: Record<SortKey, (a: WatchlistEntry, b: WatchlistEntry) => number> = {
    total_desc: (a, b) => b.totalOrders - a.totalOrders,
    day_desc: (a, b) => b.last24h - a.last24h,
    week_desc: (a, b) => b.week - a.week,
    month_desc: (a, b) => b.month - a.month,
    status: (a, b) =>
      statusRank[a.status] - statusRank[b.status] || b.totalOrders - a.totalOrders,
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

// ---------------------------------------------------------------- add restaurant
type SearchResult = { id: string; name: string; district: string | null };

function AddRestaurant({
  existingIds,
  blockedIds,
  onAdd,
}: {
  existingIds: Set<string>;
  blockedIds: Set<string>;
  onAdd: (
    partnerId: string,
    planInr: number,
    status: WatchlistStatus,
    note: string | null
  ) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"search" | "form">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [plan, setPlan] = useState(BASE_PLAN_INR);
  const [status, setStatus] = useState<WatchlistStatus>("free_trial");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setStep("search");
    setQuery("");
    setResults([]);
    setPicked(null);
    setPlan(BASE_PLAN_INR);
    setStatus("free_trial");
    setNote("");
  };

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

  const choose = (p: SearchResult) => {
    setPicked(p);
    setPlan(BASE_PLAN_INR);
    setStatus("free_trial");
    setNote("");
    setStep("form");
  };

  const submit = async () => {
    if (!picked) return;
    setSubmitting(true);
    const ok = await onAdd(picked.id, plan, status, note.trim() || null);
    setSubmitting(false);
    if (ok) {
      setOpen(false);
      reset();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          reset();
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs text-primary-foreground shadow-sm transition-colors hover:opacity-90"
        >
          <Plus className="size-3.5" />
          Add restaurant
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[320px] p-0 bg-white"
        onOpenAutoFocus={(ev) => ev.preventDefault()}
      >
        {step === "search" ? (
          <>
            <div className="flex items-center gap-2 border-b px-2 py-1.5">
              <Search className="size-3.5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
                placeholder="Search by name, store or city…"
                className="h-7 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
              />
              {searching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            </div>
            <ul className="max-h-[280px] overflow-y-auto py-1">
              {query.trim().length < 2 && (
                <li className="px-3 py-3 text-center text-[11px] text-muted-foreground">
                  Type at least 2 characters to search
                </li>
              )}
              {query.trim().length >= 2 && !searching && results.length === 0 && (
                <li className="px-3 py-3 text-center text-[11px] text-muted-foreground">
                  No restaurants match "{query}"
                </li>
              )}
              {results.map((p) => {
                const already = existingIds.has(p.id);
                const isBlocked = blockedIds.has(p.id);
                const disabled = already || isBlocked;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => choose(p)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs",
                        disabled
                          ? "cursor-not-allowed text-muted-foreground"
                          : "hover:bg-neutral-100"
                      )}
                    >
                      <span className="truncate">
                        {p.name}
                        {p.district && (
                          <span className="text-muted-foreground"> · {p.district}</span>
                        )}
                      </span>
                      {isBlocked ? (
                        <span className="text-[10px] text-amber-600">blocked</span>
                      ) : already ? (
                        <span className="text-[10px] text-muted-foreground">added</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="p-3">
            <button
              type="button"
              onClick={() => setStep("search")}
              className="mb-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-3" /> Back to search
            </button>
            <div className="mb-3 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="truncate text-sm font-medium">{picked?.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {picked?.district ?? "—"}
              </div>
            </div>

            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Plan (₹ / month)
            </label>
            <div className="mb-3 flex gap-2">
              {PLAN_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium tabular-nums transition-colors",
                    plan === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-neutral-50"
                  )}
                >
                  {inr(p)}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Status
            </label>
            <div className="mb-3 flex gap-2">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                    status === s
                      ? STATUS_META[s].badge
                      : "hover:bg-neutral-50 text-muted-foreground"
                  )}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Note (optional)
            </label>
            <Input
              value={note}
              maxLength={200}
              onChange={(ev) => setNote(ev.target.value)}
              placeholder="e.g. onboarded via Kavaratti visit"
              className="mb-3 h-8 text-xs"
            />

            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 size-3.5" />
              )}
              Add to watchlist
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------- small pieces
function WatchlistEmpty() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Building2 className="size-5" />
      </div>
      <div className="text-base font-semibold">No restaurants tracked yet</div>
      <div className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Hit "Sync watchlist" to auto-add every restaurant taking ≥ 2 online orders a week, or use
        "Add restaurant" to track one by hand.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- block list
function BlockRestaurant({
  blockedIds,
  onBlock,
}: {
  blockedIds: Set<string>;
  onBlock: (partnerId: string, name: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [blockingId, setBlockingId] = useState<string | null>(null);
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

  const doBlock = async (p: SearchResult) => {
    setBlockingId(p.id);
    const ok = await onBlock(p.id, p.name);
    setBlockingId(null);
    if (ok) {
      setOpen(false);
      setQuery("");
      setResults([]);
    }
  };

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
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-medium text-muted-foreground shadow-sm hover:bg-neutral-50"
        >
          <Ban className="size-3.5" />
          Block a restaurant
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[320px] p-0 bg-white"
        onOpenAutoFocus={(ev) => ev.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b px-2 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            placeholder="Search a test account to block…"
            className="h-7 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
          {searching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
        </div>
        <ul className="max-h-[280px] overflow-y-auto py-1">
          {query.trim().length < 2 && (
            <li className="px-3 py-3 text-center text-[11px] text-muted-foreground">
              Type at least 2 characters to search
            </li>
          )}
          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <li className="px-3 py-3 text-center text-[11px] text-muted-foreground">
              No restaurants match "{query}"
            </li>
          )}
          {results.map((p) => {
            const already = blockedIds.has(p.id);
            const busy = blockingId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={already || busy}
                  onClick={() => doBlock(p)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs",
                    already ? "cursor-not-allowed text-muted-foreground" : "hover:bg-neutral-100"
                  )}
                >
                  <span className="truncate">
                    {p.name}
                    {p.district && (
                      <span className="text-muted-foreground"> · {p.district}</span>
                    )}
                  </span>
                  {already ? (
                    <span className="text-[10px] text-amber-600">blocked</span>
                  ) : busy ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">block</span>
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

function BlockRow({
  b,
  onUnblock,
}: {
  b: BlocklistEntry;
  onUnblock: (id: string, name: string) => void;
}) {
  return (
    <tr className="border-b border-muted last:border-0 hover:bg-muted/30">
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
            <div className="text-[11px] text-muted-foreground truncate">{b.district ?? "—"}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-muted-foreground">{b.note ?? "—"}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{fmtStamp(b.createdAt)}</td>
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          onClick={() => onUnblock(b.id, b.name)}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-neutral-50 hover:text-foreground"
          title="Unblock"
        >
          <Undo2 className="size-3" />
          Unblock
        </button>
      </td>
    </tr>
  );
}

function BlocklistEmpty() {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <ShieldBan className="size-5" />
      </div>
      <div className="text-base font-semibold">Nothing blocked</div>
      <div className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Use "Block a restaurant" — or the block icon on any watchlist row — to keep test / junk
        accounts out of the watchlist and the signup counts.
      </div>
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
  tone?: "emerald" | "amber" | "sky";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : tone === "amber"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : tone === "sky"
          ? "text-sky-700 bg-sky-50 border-sky-200"
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

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="relative overflow-hidden border bg-white p-4">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
      <div className="flex items-center gap-1.5 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">{sub}</div>
    </Card>
  );
}

function KpiTrendCard({
  icon,
  label,
  pair,
  prevLabel,
}: {
  icon?: React.ReactNode;
  label: string;
  pair?: { curr: number; prev: number };
  prevLabel: string;
}) {
  const curr = pair?.curr ?? 0;
  const prev = pair?.prev ?? 0;
  const delta = curr - prev;
  const pctv = prev > 0 ? (delta / prev) * 100 : curr > 0 ? 100 : 0;
  const tone = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const Icon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : Minus;
  const toneCls =
    tone === "up" ? "text-emerald-600" : tone === "down" ? "text-rose-600" : "text-muted-foreground";
  const label2 = prev > 0 ? `${delta > 0 ? "+" : ""}${Math.round(pctv)}%` : curr > 0 ? "new" : "—";
  return (
    <Card className="relative overflow-hidden border bg-white p-4">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
      <div className="flex items-center gap-1.5 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {pair ? nf(curr) : "—"}
        </span>
        {pair && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", toneCls)}>
            <Icon className="size-3.5" />
            {label2}
          </span>
        )}
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">{nf(prev)} in the {prevLabel}</div>
    </Card>
  );
}

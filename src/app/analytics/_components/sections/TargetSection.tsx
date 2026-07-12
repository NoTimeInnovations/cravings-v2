"use client";

/**
 * Target — the road to ₹10,00,000 / month, plus a shared watchlist of the
 * restaurants we're tracking.
 *
 * Everything here is DB-backed and identical for everyone:
 *  - The watchlist (which restaurants, their plan, and paying/test/free status)
 *    is stored in `analytics_watchlist` — only the selection is persisted.
 *  - Paying customers + MRR are derived from the watchlist (status = "paying").
 *  - Order stats (total / avg-per-day / avg-per-week and day/week/month trends)
 *    are computed live on every load from the orders table — nothing cached,
 *    nothing in localStorage.
 *
 * Money is all in INR. Target = ₹10,00,000/mo; at the ₹3,000 base plan that is
 * 334 paying customers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  Target as TargetIcon,
  Users,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  X,
  Search,
  Loader2,
  Building2,
  RefreshCw,
  IndianRupee,
  ArrowUpDown,
  Check,
  ChevronLeft,
  Pencil,
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
import { rupees } from "../format";
import { SectionHeader } from "./OverviewSection";
import type { WatchlistEntry, WatchlistStatus } from "../types";
import { toast } from "sonner";

// ---------------------------------------------------------------- config (shared for everyone)
const MONTHLY_TARGET_INR = 1_000_000; // ₹10,00,000 / month
const BASE_PLAN_INR = 3000; // headline: "if everyone paid this"
const PLAN_OPTIONS = [3000, 5000];
const PLAN_START = "2026-07-01";
const GOAL_DATE = "2026-12-31";
const DPW = 6; // working days / week
const REFRESH_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 250;

const TARGET_CUSTOMERS = Math.ceil(MONTHLY_TARGET_INR / BASE_PLAN_INR); // 334

const STATUS_META: Record<
  WatchlistStatus,
  { label: string; badge: string; dot: string }
> = {
  paying: {
    label: "Paying",
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  test: {
    label: "Test",
    badge: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
  free: {
    label: "Free",
    badge: "text-sky-700 bg-sky-50 border-sky-200",
    dot: "bg-sky-500",
  },
};
const STATUS_ORDER: WatchlistStatus[] = ["paying", "test", "free"];

// ---------------------------------------------------------------- utils
const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
const isoD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = (s: string) => {
  const p = s.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
};
const midnight = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const clampD = (d: Date, a: Date, b: Date) => (d < a ? a : d > b ? b : d);
const isWork = (d: Date, dpw: number) => {
  if (dpw >= 7) return true;
  const w = d.getDay();
  if (dpw <= 5) return w >= 1 && w <= 5;
  return w !== 0; // 6 → Mon–Sat
};
const countWork = (a: Date, b: Date, dpw: number) => {
  if (b < a) return 0;
  let n = 0;
  const d = midnight(a);
  const e = midnight(b);
  while (d <= e) {
    if (isWork(d, dpw)) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
};
const addWork = (a: Date, n: number, dpw: number) => {
  const d = midnight(a);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (isWork(d, dpw)) added++;
  }
  return d;
};
const nf = (n: number) => Math.round(n).toLocaleString("en-IN");
const nf1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-IN");
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const fmtD = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtDShort = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// ---------------------------------------------------------------- plan metrics
function computePlan(entries: WatchlistEntry[]) {
  const paying = entries.filter((e) => e.status === "paying");
  const payingCount = paying.length;
  const mrrInr = paying.reduce((s, e) => s + (e.planInr || 0), 0);
  const remainingMrr = Math.max(0, MONTHLY_TARGET_INR - mrrInr);
  const remainingCustomers = Math.ceil(remainingMrr / BASE_PLAN_INR);

  const start = parseD(PLAN_START);
  const goal = parseD(GOAL_DATE);
  const now = midnight(new Date());
  const eff = clampD(now, start, goal);
  const totalWD = Math.max(1, countWork(start, goal, DPW));
  const elapsedWD = now < start ? 0 : countWork(start, eff, DPW);
  const remWD = now > goal ? 0 : Math.max(0, countWork(eff, goal, DPW));

  const requiredByToday = MONTHLY_TARGET_INR * (elapsedWD / totalWD);
  const delta = mrrInr - requiredByToday;
  const weekWorth = (MONTHLY_TARGET_INR / totalWD) * DPW;

  const perDayMrr = remWD > 0 ? remainingMrr / remWD : remainingMrr;
  const perDayCust = perDayMrr / BASE_PLAN_INR;
  const perWeekCust = perDayCust * DPW;

  type Pace = { cls: "good" | "warn" | "bad" | "neutral"; label: string };
  let pace: Pace;
  if (now < start) pace = { cls: "neutral", label: "Not started" };
  else if (remainingMrr <= 0) pace = { cls: "good", label: "Goal reached 🎉" };
  else if (payingCount === 0) pace = { cls: "bad", label: "No paying customers yet" };
  else if (delta >= 0) pace = { cls: "good", label: "On / ahead of pace" };
  else if (delta >= -weekWorth) pace = { cls: "warn", label: "Slightly behind" };
  else pace = { cls: "bad", label: "Behind pace" };

  const rate = elapsedWD > 0 ? mrrInr / elapsedWD : 0; // ₹ per working day
  let projDate: Date | null = null;
  let projOnTime: boolean | null = null;
  if (remainingMrr <= 0) projOnTime = true;
  else if (rate > 0) {
    projDate = addWork(eff, Math.ceil(remainingMrr / rate), DPW);
    projOnTime = projDate <= goal;
  }

  return {
    start,
    goal,
    now,
    paying,
    payingCount,
    testCount: entries.filter((e) => e.status === "test").length,
    freeCount: entries.filter((e) => e.status === "free").length,
    mrrInr,
    remainingMrr,
    remainingCustomers,
    totalWD,
    elapsedWD,
    remWD,
    requiredByToday,
    delta,
    weekWorth,
    perDayCust,
    perWeekCust,
    pace,
    projDate,
    projOnTime,
  };
}
type PlanMetrics = ReturnType<typeof computePlan>;

// cumulative MRR (from paying entries) vs required linear pace
function buildChart(entries: WatchlistEntry[], m: PlanMetrics) {
  const t0 = m.start.getTime();
  const t1 = m.goal.getTime();
  const nowT = clampD(m.now, m.start, m.goal).getTime();

  const byDate: Record<string, number> = {};
  for (const e of m.paying) {
    const d = isoD(new Date(e.createdAt));
    byDate[d] = (byDate[d] || 0) + (e.planInr || 0);
  }

  const set = new Set<number>([t0, t1, nowT]);
  const cur = new Date(m.start.getFullYear(), m.start.getMonth(), 1);
  while (cur.getTime() <= t1) {
    const t = cur.getTime();
    if (t >= t0) set.add(t);
    cur.setMonth(cur.getMonth() + 1);
  }
  Object.keys(byDate).forEach((d) => {
    let t = parseD(d).getTime();
    if (t < t0) t = t0;
    if (t > t1) t = t1;
    set.add(t);
  });

  const xs = Array.from(set).sort((a, b) => a - b);
  const required = (t: number) => MONTHLY_TARGET_INR * ((t - t0) / Math.max(1, t1 - t0));
  const actualAt = (t: number) => {
    let v = 0;
    Object.keys(byDate).forEach((d) => {
      let dt = parseD(d).getTime();
      if (dt < t0) dt = t0;
      if (dt <= t) v += byDate[d];
    });
    return v;
  };
  return xs.map((t) => ({
    t,
    required: Math.round(required(t)),
    actual: t <= nowT ? actualAt(t) : null,
  }));
}

// ---------------------------------------------------------------- component
export default function TargetSection() {
  const [entries, setEntries] = useState<WatchlistEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortKey>("total_desc");

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

  const list = entries ?? [];
  const m = useMemo(() => computePlan(list), [list]);
  const chart = useMemo(() => buildChart(list, m), [list, m]);

  const existingIds = useMemo(
    () => new Set(list.map((e) => e.partnerId)),
    [list]
  );

  // ---- mutations
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

  const sortedRows = useMemo(() => sortRows(list, sort), [list, sort]);

  const mrrPct = Math.min(100, Math.round((m.mrrInr / MONTHLY_TARGET_INR) * 100));
  const custPct = Math.min(100, Math.round((m.payingCount / TARGET_CUSTOMERS) * 100));
  const ordersToday = list.reduce((s, e) => s + e.today, 0);

  return (
    <div className="space-y-6">
      {/* Thesis + countdown */}
      <Card className="border bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <TargetIcon className="size-3.5" />
              Revenue target
            </div>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
              The road to {inr(MONTHLY_TARGET_INR)} / month
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Reach <b className="text-foreground">{inr(MONTHLY_TARGET_INR)}/mo</b> by {fmtD(m.goal)} —
              about <b className="text-foreground">{nf(TARGET_CUSTOMERS)} paying customers</b> if everyone
              is on the {inr(BASE_PLAN_INR)} plan. You have{" "}
              <b className="text-foreground">{nf(m.payingCount)} paying</b> now, so the gap is{" "}
              <b className="text-foreground">{nf(m.remainingCustomers)} more</b> ({inr(m.remainingMrr)}/mo).
            </p>
          </div>
          <div className="shrink-0 rounded-xl border bg-muted/40 px-4 py-3 text-right">
            <div className="text-2xl font-semibold tabular-nums leading-none">
              {m.now > m.goal ? 0 : nf(m.remWD)}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              working days left · {fmtDShort(m.goal)}, {m.goal.getFullYear()}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Paying customers"
          value={nf(m.payingCount)}
          unit={`/ ${nf(TARGET_CUSTOMERS)}`}
          sub={`${nf(m.remainingCustomers)} more at ${inr(BASE_PLAN_INR)}`}
          progress={custPct}
        />
        <StatCard
          label="Current MRR"
          value={inr(m.mrrInr)}
          unit={`/ ${inr(MONTHLY_TARGET_INR)}`}
          sub={`${mrrPct}% of monthly target`}
          progress={mrrPct}
        />
        <Card className="relative overflow-hidden border bg-white p-4">
          <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Pace vs plan
          </div>
          <div className="mt-2.5">
            <PacePill cls={m.pace.cls} label={m.pace.label} />
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Target by today <b className="text-foreground">{inr(m.requiredByToday)}</b> · at{" "}
            <b className="text-foreground">{inr(m.mrrInr)}</b> ({m.delta >= 0 ? "+" : "−"}
            {inr(Math.abs(m.delta))})
          </div>
        </Card>
        <Card className="relative overflow-hidden border bg-white p-4">
          <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Projected finish
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {m.projDate
              ? fmtDShort(m.projDate)
              : m.remainingMrr <= 0
                ? "Done"
                : "—"}
            {m.projDate && (
              <span className="text-base font-medium text-muted-foreground">
                , {m.projDate.getFullYear()}
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {m.projOnTime === null ? (
              "Add paying customers to project"
            ) : m.projOnTime ? (
              <span className="text-emerald-600">On time ✓</span>
            ) : (
              <span className="text-rose-600">Later than goal</span>
            )}{" "}
            at current rate
          </div>
        </Card>
      </div>

      {/* What it takes */}
      <Card className="border bg-white p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">What it takes from here</h3>
          <span className="text-xs text-muted-foreground">
            {m.remainingMrr <= 0
              ? "Target reached — keep them paying!"
              : `To finish by ${fmtDShort(m.goal)}, each working day needs:`}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Focus
            icon={<Users className="size-4" />}
            label="New paying / day"
            big={nf1(Math.max(0, m.perDayCust))}
            note={`${nf(m.remainingCustomers)} left ÷ ${nf(m.remWD)} working days`}
            accent
          />
          <Focus
            icon={<CalendarClock className="size-4" />}
            label="New paying / week"
            big={nf1(Math.max(0, m.perWeekCust))}
            note={`${DPW} working days / week`}
          />
          <Focus
            icon={<IndianRupee className="size-4" />}
            label="MRR still to add"
            big={inr(m.remainingMrr)}
            note={`on top of ${inr(m.mrrInr)} today`}
          />
        </div>
      </Card>

      {/* Burn-up chart */}
      <Card className="border bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">MRR vs. required pace</h3>
          <span className="text-xs text-muted-foreground">
            {inr(0)} → {inr(MONTHLY_TARGET_INR)}
          </span>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 12, right: 16, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id="tgt-actual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eef0f5" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={[m.start.getTime(), m.goal.getTime()]}
                tickFormatter={(t: number) =>
                  new Date(t).toLocaleDateString("en-US", { month: "short" })
                }
                tick={{ fontSize: 11, fill: "#6a7180" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e8ef" }}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6a7180" }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: number) => rupees(v)}
                domain={[0, Math.ceil((MONTHLY_TARGET_INR * 1.05) / 100000) * 100000]}
              />
              <Tooltip
                content={(p: any) => {
                  if (!p?.active || !p?.payload?.length) return null;
                  const d = p.payload[0]?.payload;
                  return (
                    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm">
                      <div className="mb-1 text-muted-foreground">{fmtD(new Date(d.t))}</div>
                      {d.actual != null && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block size-2 rounded-full bg-[#4f46e5]" />
                            Actual MRR
                          </span>
                          <b className="tabular-nums">{inr(d.actual)}</b>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block size-2 rounded-full bg-[#94a3b8]" />
                          Required
                        </span>
                        <b className="tabular-nums">{inr(d.required)}</b>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={MONTHLY_TARGET_INR}
                stroke="#10b981"
                strokeDasharray="2 4"
                label={{
                  value: `Goal ${rupees(MONTHLY_TARGET_INR)}`,
                  position: "insideTopRight",
                  fill: "#059669",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
              {m.now >= m.start && m.now <= m.goal && (
                <ReferenceLine
                  x={clampD(m.now, m.start, m.goal).getTime()}
                  stroke="#94a3b8"
                  strokeDasharray="2 3"
                  label={{ value: "today", position: "top", fill: "#94a3b8", fontSize: 10 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#4f46e5"
                strokeWidth={2.4}
                fill="url(#tgt-actual)"
                connectNulls={false}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="required"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-foreground/80">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-[3px] w-3.5 rounded bg-[#4f46e5]" /> Actual MRR (paying
            customers)
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-[2px] w-3.5 rounded"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg,#94a3b8 0 5px,transparent 5px 9px)",
              }}
            />{" "}
            Required pace (linear to goal)
          </span>
        </div>
      </Card>

      {/* Watchlist */}
      <div className="space-y-4">
        <SectionHeader
          title="Restaurant watchlist"
          subtitle="Shared, saved in the database — track orders for the restaurants we onboard (paying, test or free)"
          right={
            <div className="flex items-center gap-3">
              <SortSelect value={sort} onChange={setSort} />
              <AddRestaurant existingIds={existingIds} onAdd={addEntry} />
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
          <Chip label="Paying" value={nf(m.payingCount)} tone="emerald" />
          <Chip label="Test" value={nf(m.testCount)} tone="amber" />
          <Chip label="Free" value={nf(m.freeCount)} tone="sky" />
          <Chip label="Orders today" value={nf(ordersToday)} />
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
                    <th className="px-3 py-2.5 text-right font-medium">Total orders</th>
                    <th className="px-3 py-2.5 text-right font-medium">Avg / day</th>
                    <th className="px-3 py-2.5 text-right font-medium">Avg / week</th>
                    <th className="px-3 py-2.5 text-right font-medium" title="Today vs yesterday">
                      Today
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
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          The selection (restaurant + plan + status) is stored in the database and shared with
          everyone. Order totals and trends are calculated live each time — nothing is cached or kept
          on this device.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- watchlist row
function WatchRow({
  e,
  onPatch,
  onRemove,
}: {
  e: WatchlistEntry;
  onPatch: (
    id: string,
    patch: Partial<Pick<WatchlistEntry, "planInr" | "status" | "note">>
  ) => void;
  onRemove: (id: string, name: string) => void;
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

      {/* total */}
      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
        {nf(e.totalOrders)}
      </td>

      {/* avg/day, avg/week */}
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
        {nf1(e.avgDaily)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
        {nf1(e.avgWeekly)}
      </td>

      {/* trends */}
      <td className="px-3 py-2.5 text-right">
        <Trend curr={e.today} prev={e.yesterday} currLabel="today" prevLabel="yesterday" />
      </td>
      <td className="px-3 py-2.5 text-right">
        <Trend curr={e.week} prev={e.prevWeek} currLabel="last 7d" prevLabel="prev 7d" />
      </td>
      <td className="px-3 py-2.5 text-right">
        <Trend curr={e.month} prev={e.prevMonth} currLabel="last 30d" prevLabel="prev 30d" />
      </td>

      {/* actions */}
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          onClick={() => onRemove(e.id, e.name)}
          className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
          title="Remove from watchlist"
        >
          <X className="size-3.5" />
        </button>
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
  { id: "total_desc", label: "Total orders" },
  { id: "day_desc", label: "Orders today" },
  { id: "week_desc", label: "This week" },
  { id: "month_desc", label: "This month" },
  { id: "status", label: "Status" },
  { id: "name_asc", label: "Name (A–Z)" },
];

function sortRows(rows: WatchlistEntry[], sort: SortKey): WatchlistEntry[] {
  const statusRank: Record<WatchlistStatus, number> = { paying: 0, test: 1, free: 2 };
  const cmp: Record<SortKey, (a: WatchlistEntry, b: WatchlistEntry) => number> = {
    total_desc: (a, b) => b.totalOrders - a.totalOrders,
    day_desc: (a, b) => b.today - a.today,
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
  onAdd,
}: {
  existingIds: Set<string>;
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
  const [status, setStatus] = useState<WatchlistStatus>("test");
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
    setStatus("test");
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
    setStatus("test");
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
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => choose(p)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs",
                        already
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
                      {already && (
                        <span className="text-[10px] text-muted-foreground">added</span>
                      )}
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
        Use "Add restaurant" to start your watchlist. Pick their plan and whether they're paying,
        testing or on free — the list is saved for everyone.
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
  label,
  value,
  unit,
  sub,
  progress,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  progress?: number;
}) {
  return (
    <Card className="relative overflow-hidden border bg-white p-4">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
      <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">{sub}</div>
      {progress != null && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </Card>
  );
}

function PacePill({
  cls,
  label,
}: {
  cls: "good" | "warn" | "bad" | "neutral";
  label: string;
}) {
  const styles: Record<string, string> = {
    good: "text-emerald-700 bg-emerald-50",
    warn: "text-amber-700 bg-amber-50",
    bad: "text-rose-700 bg-rose-50",
    neutral: "text-muted-foreground bg-muted",
  };
  const Icon = cls === "good" ? TrendingUp : cls === "neutral" ? CalendarClock : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold",
        styles[cls]
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

function Focus({
  icon,
  label,
  big,
  note,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  big: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-3xl font-semibold tracking-tight tabular-nums",
          accent && "text-primary"
        )}
      >
        {big}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{note}</div>
    </div>
  );
}

"use client";

/**
 * Target — a self-contained growth plan + daily tracker.
 *
 * Goal-driven view: pick a revenue target and date, and it derives how many
 * new paying customers (and calls) are needed per working day, tracks pace
 * against the required run-rate, and lets the team log calls / new customers /
 * payments each day. State is stored in this browser (localStorage) so there is
 * no server dependency; use Export/Import to back it up or move it. A shared,
 * DB-backed version can replace the storage layer without touching the UI.
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
  Phone,
  Users,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Download,
  Upload,
  RotateCcw,
  Pencil,
  X,
  Flag,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------- types
type Assumptions = {
  start: string;
  target: string;
  goalUsd: number;
  fx: number; // rupees per dollar
  priceInr: number;
  existing: number;
  dpw: number; // working days / week
  closePct: number; // new customers per 100 calls
};
type LogEntry = {
  id: number;
  date: string;
  calls: number;
  conv: number;
  pay: number;
  note: string;
};

const LS_A = "analytics.target.assumptions.v1";
const LS_L = "analytics.target.log.v1";

// ---------------------------------------------------------------- date/number utils
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
const nf = (n: number) => Math.round(n).toLocaleString("en-US");
const inrFull = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const usdFull = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const fmtD = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtDShort = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const clampNum = (v: string | number, min: number, def: number) => {
  const x = typeof v === "number" ? v : parseFloat(v);
  if (isNaN(x)) return def;
  return x < min ? min : x;
};

function defaults(): Assumptions {
  return {
    start: isoD(midnight(new Date())),
    target: "2026-12-31",
    goalUsd: 10000,
    fx: 105,
    priceInr: 3000,
    existing: 20,
    dpw: 6,
    closePct: 10,
  };
}

// ---------------------------------------------------------------- compute
function compute(A: Assumptions, log: LogEntry[]) {
  const start = parseD(A.start);
  const target = parseD(A.target);
  const now = midnight(new Date());
  const targetSubs = Math.max(A.existing, Math.ceil((A.goalUsd * A.fx) / A.priceInr));
  const netNew = Math.max(0, targetSubs - A.existing);
  const totalWD = Math.max(1, countWork(start, target, A.dpw));
  const eff = clampD(now, start, target);
  const elapsedWD = now < start ? 0 : countWork(start, eff, A.dpw);
  const remWD = now > target ? 0 : Math.max(0, countWork(eff, target, A.dpw));

  let sumConv = 0,
    sumCalls = 0,
    sumPay = 0;
  for (const e of log) {
    sumConv += +e.conv || 0;
    sumCalls += +e.calls || 0;
    sumPay += +e.pay || 0;
  }
  const achieved = sumConv;
  const remaining = Math.max(0, netNew - achieved);
  const currentSubs = A.existing + achieved;
  const mrrInr = currentSubs * A.priceInr;
  const mrrUsd = mrrInr / A.fx;
  const closeRate = Math.max(0.001, A.closePct / 100);
  const perDayConv = remWD > 0 ? remaining / remWD : remaining;
  const perDayCalls = perDayConv / closeRate;
  const totalCallsRem = remaining / closeRate;

  const expectedByToday = netNew * (elapsedWD / totalWD);
  const delta = achieved - expectedByToday;
  const weekTarget = (netNew / totalWD) * A.dpw;

  type Pace = { cls: "good" | "warn" | "bad" | "neutral"; label: string };
  let pace: Pace;
  if (now < start) pace = { cls: "neutral", label: "Not started" };
  else if (remaining <= 0) pace = { cls: "good", label: "Goal reached 🎉" };
  else if (delta >= 0) pace = { cls: "good", label: "On / ahead of pace" };
  else if (delta >= -weekTarget) pace = { cls: "warn", label: "Slightly behind" };
  else pace = { cls: "bad", label: "Behind pace" };

  const avgRate = elapsedWD > 0 ? achieved / elapsedWD : 0;
  let projDate: Date | null = null;
  let projOnTime: boolean | null = null;
  if (remaining <= 0) {
    projOnTime = true;
  } else if (avgRate > 0) {
    projDate = addWork(eff, Math.ceil(remaining / avgRate), A.dpw);
    projOnTime = projDate <= target;
  }

  return {
    start,
    target,
    now,
    targetSubs,
    netNew,
    totalWD,
    elapsedWD,
    remWD,
    sumConv,
    sumCalls,
    sumPay,
    achieved,
    remaining,
    currentSubs,
    mrrInr,
    mrrUsd,
    closeRate,
    perDayConv,
    perDayCalls,
    totalCallsRem,
    expectedByToday,
    delta,
    pace,
    avgRate,
    projDate,
    projOnTime,
  };
}
type Metrics = ReturnType<typeof compute>;

// cumulative-vs-required series for the burn-up chart
function buildChart(A: Assumptions, log: LogEntry[], m: Metrics) {
  const t0 = m.start.getTime();
  const t1 = m.target.getTime();
  const nowT = clampD(m.now, m.start, m.target).getTime();
  const byDate: Record<string, number> = {};
  for (const e of log) {
    if (!e.date) continue;
    byDate[e.date] = (byDate[e.date] || 0) + (+e.conv || 0);
  }
  // x anchors: month starts + log dates + endpoints + today
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
  const req = (t: number) =>
    A.existing + (m.targetSubs - A.existing) * ((t - t0) / Math.max(1, t1 - t0));
  const actualAt = (t: number) => {
    let v = A.existing;
    Object.keys(byDate)
      .sort()
      .forEach((d) => {
        if (parseD(d).getTime() <= t) v += byDate[d];
      });
    return v;
  };
  return xs.map((t) => ({
    t,
    required: Math.round(req(t) * 10) / 10,
    actual: t <= nowT ? actualAt(t) : null,
  }));
}

// ---------------------------------------------------------------- component
export default function TargetSection() {
  const [A, setA] = useState<Assumptions>(defaults);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showAssume, setShowAssume] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // form
  const [fDate, setFDate] = useState(() => isoD(midnight(new Date())));
  const [fCalls, setFCalls] = useState("");
  const [fConv, setFConv] = useState("");
  const [fPay, setFPay] = useState("");
  const [fNote, setFNote] = useState("");

  // load once (client only → no hydration mismatch)
  useEffect(() => {
    try {
      const a = localStorage.getItem(LS_A);
      const l = localStorage.getItem(LS_L);
      if (a) setA({ ...defaults(), ...JSON.parse(a) });
      if (l) setLog(JSON.parse(l));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // persist
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_A, JSON.stringify(A));
    } catch {
      /* ignore */
    }
  }, [A, loaded]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_L, JSON.stringify(log));
    } catch {
      /* ignore */
    }
  }, [log, loaded]);

  const m = useMemo(() => compute(A, log), [A, log]);
  const chart = useMemo(() => buildChart(A, log, m), [A, log, m]);

  const setAField = (k: keyof Assumptions, v: number | string) =>
    setA((p) => ({ ...p, [k]: v }));

  const resetForm = () => {
    setFCalls("");
    setFConv("");
    setFPay("");
    setFNote("");
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fDate) return;
    const entry: LogEntry = {
      id: editId ?? Date.now(),
      date: fDate,
      calls: clampNum(fCalls, 0, 0),
      conv: clampNum(fConv, 0, 0),
      pay: clampNum(fPay, 0, 0),
      note: fNote.trim(),
    };
    if (editId != null) {
      setLog((p) => p.map((x) => (x.id === editId ? entry : x)));
      setEditId(null);
    } else {
      setLog((p) => [...p, entry]);
    }
    resetForm();
  };
  const startEdit = (e: LogEntry) => {
    setEditId(e.id);
    setFDate(e.date);
    setFCalls(e.calls ? String(e.calls) : "");
    setFConv(e.conv ? String(e.conv) : "");
    setFPay(e.pay ? String(e.pay) : "");
    setFNote(e.note || "");
  };
  const del = (id: number) => {
    setLog((p) => p.filter((x) => x.id !== id));
    if (editId === id) {
      setEditId(null);
      resetForm();
    }
  };

  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({ assumptions: A, log, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `growth-plan-${isoD(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };
  const importData = (file: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const o = JSON.parse(String(rd.result));
        if (o.assumptions) setA({ ...defaults(), ...o.assumptions });
        if (Array.isArray(o.log)) setLog(o.log);
      } catch {
        alert("Couldn't read that file — make sure it's a growth-plan export.");
      }
    };
    rd.readAsText(file);
  };

  if (!loaded) {
    return <div className="h-96 rounded-xl border bg-white animate-pulse" />;
  }

  const started = m.now >= m.start && m.now <= m.target;
  const pct = Math.min(100, Math.round((m.achieved / Math.max(1, m.netNew)) * 100));
  const mrrPct = Math.min(100, Math.round((m.mrrUsd / Math.max(1, A.goalUsd)) * 100));
  const sorted = [...log].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  let run = A.existing;
  const rows = sorted.map((e) => {
    run += +e.conv || 0;
    return { e, cum: run };
  });
  rows.reverse();

  return (
    <div className="space-y-6">
      {/* Thesis + countdown */}
      <Card className="border bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <TargetIcon className="size-3.5" />
              Revenue growth plan
            </div>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
              The road to {usdFull(A.goalUsd)} / month
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Reach <b className="text-foreground">{usdFull(A.goalUsd)}/mo</b> by {fmtD(m.target)} —
              about <b className="text-foreground">{nf(m.targetSubs)} paying customers</b> at{" "}
              {inrFull(A.priceInr)}/mo. You have <b className="text-foreground">{nf(A.existing)}</b>,
              so the plan closes the gap of{" "}
              <b className="text-foreground">{nf(m.netNew)} new customers</b>.
            </p>
          </div>
          <div className="shrink-0 rounded-xl border bg-muted/40 px-4 py-3 text-right">
            <div className="text-2xl font-semibold tabular-nums leading-none">
              {m.now > m.target ? 0 : nf(m.remWD)}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              working days left · {fmtDShort(m.target)}, {m.target.getFullYear()}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="New customers won"
          value={nf(m.achieved)}
          unit={`/ ${nf(m.netNew)}`}
          sub={`${nf(m.remaining)} still to go`}
          progress={pct}
        />
        <StatCard
          label="Current MRR"
          value={usdFull(m.mrrUsd)}
          unit={`/ ${usdFull(A.goalUsd)}`}
          sub={`${inrFull(m.mrrInr)} · ${nf(m.currentSubs)} customers`}
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
            Target by today <b className="text-foreground">{nf(m.expectedByToday)}</b> · you&rsquo;re at{" "}
            <b className="text-foreground">{nf(m.achieved)}</b> ({m.delta >= 0 ? "+" : ""}
            {nf(m.delta)})
          </div>
        </Card>
        <Card className="relative overflow-hidden border bg-white p-4">
          <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Projected finish
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {m.projDate ? fmtDShort(m.projDate) : m.remaining <= 0 ? "Done" : "—"}
            {m.projDate && (
              <span className="text-base font-medium text-muted-foreground">
                , {m.projDate.getFullYear()}
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {m.projOnTime === null ? (
              "Log a few days to project"
            ) : m.projOnTime ? (
              <span className="text-emerald-600">On time ✓</span>
            ) : (
              <span className="text-rose-600">Later than goal</span>
            )}{" "}
            at current rate
          </div>
        </Card>
      </div>

      {/* Today's targets */}
      <Card className="border bg-white p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Today&rsquo;s targets</h3>
          <span className="text-xs text-muted-foreground">
            {m.remaining <= 0
              ? "Goal reached — keep them paying!"
              : started
                ? "To finish on time, each working day from today needs:"
                : m.now < m.start
                  ? `Plan hasn't started yet — starts ${fmtD(m.start)}`
                  : "Past the goal date."}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Focus
            icon={<Users className="size-4" />}
            label="New customers / day"
            big={Math.max(0, m.perDayConv).toFixed(1)}
            note={`${nf(m.remaining)} left ÷ ${nf(m.remWD)} working days`}
            accent
          />
          <Focus
            icon={<Phone className="size-4" />}
            label="Calls / day"
            big={nf(Math.ceil(m.perDayCalls))}
            note={`at ${A.closePct}% close rate (${nf(Math.round(1 / m.closeRate))} calls / customer)`}
          />
          <Focus
            icon={<CalendarClock className="size-4" />}
            label="Calls still to make"
            big={nf(Math.ceil(m.totalCallsRem))}
            note={`total, to land the remaining ${nf(m.remaining)}`}
          />
        </div>
      </Card>

      {/* Burn-up chart */}
      <Card className="border bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Paying customers vs. required pace</h3>
          <span className="text-xs text-muted-foreground">
            Start {nf(A.existing)} → Goal {nf(m.targetSubs)}
          </span>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 12, right: 16, bottom: 4, left: -8 }}>
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
                domain={[m.start.getTime(), m.target.getTime()]}
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
                width={44}
                domain={[0, Math.ceil((m.targetSubs * 1.05) / 50) * 50]}
              />
              <Tooltip
                content={(p: any) => {
                  if (!p?.active || !p?.payload?.length) return null;
                  const d = p.payload[0]?.payload;
                  return (
                    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm">
                      <div className="mb-1 text-muted-foreground">
                        {fmtD(new Date(d.t))}
                      </div>
                      {d.actual != null && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block size-2 rounded-full bg-[#4f46e5]" />
                            Actual
                          </span>
                          <b className="tabular-nums">{nf(d.actual)}</b>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block size-2 rounded-full bg-[#94a3b8]" />
                          Required
                        </span>
                        <b className="tabular-nums">{nf(d.required)}</b>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={m.targetSubs}
                stroke="#10b981"
                strokeDasharray="2 4"
                label={{
                  value: `Goal ${nf(m.targetSubs)}`,
                  position: "insideTopRight",
                  fill: "#059669",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
              {started && (
                <ReferenceLine
                  x={clampD(m.now, m.start, m.target).getTime()}
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
            <span className="inline-block h-[3px] w-3.5 rounded bg-[#4f46e5]" /> Actual paying
            customers
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

      {/* Daily log */}
      <Card className="border bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Daily log</h3>
          <span className="text-xs text-muted-foreground">
            Record calls made, new customers &amp; payments.
          </span>
        </div>
        <form
          onSubmit={submit}
          className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-[auto_1fr_1fr_1fr_1.4fr_auto]"
        >
          <Field label="Date">
            <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required />
          </Field>
          <Field label="Calls made">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0"
              value={fCalls}
              onChange={(e) => setFCalls(e.target.value)}
            />
          </Field>
          <Field label="New customers">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0"
              value={fConv}
              onChange={(e) => setFConv(e.target.value)}
            />
          </Field>
          <Field label="Payments received">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="0"
              value={fPay}
              onChange={(e) => setFPay(e.target.value)}
            />
          </Field>
          <Field label="Note (optional)">
            <Input
              type="text"
              maxLength={80}
              placeholder="e.g. Kavaratti market visit"
              value={fNote}
              onChange={(e) => setFNote(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" className="w-full">
              {editId != null ? "Update" : "Add"}
            </Button>
            {editId != null && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditId(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="mt-4 -mx-1 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Calls</th>
                <th className="px-3 py-2 text-right font-medium">New cust.</th>
                <th className="px-3 py-2 text-right font-medium">Payments</th>
                <th className="px-3 py-2 text-right font-medium">Cumulative</th>
                <th className="px-3 py-2 text-left font-medium">Note</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No entries yet. Log your first day above — even a few calls counts.
                  </td>
                </tr>
              ) : (
                rows.map(({ e, cum }) => (
                  <tr key={e.id} className="border-b border-muted hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-2 text-left">
                      {fmtDShort(parseD(e.date))}, {parseD(e.date).getFullYear()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{nf(+e.calls || 0)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-primary">
                      {nf(+e.conv || 0)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{nf(+e.pay || 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {nf(cum)}
                    </td>
                    <td className="px-3 py-2 text-left text-muted-foreground">{e.note}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => startEdit(e)}
                        className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => del(e.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                        title="Delete"
                      >
                        <X className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    Totals
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{nf(m.sumCalls)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-primary">
                    {nf(m.sumConv)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{nf(m.sumPay)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{nf(m.currentSubs)}</td>
                  <td
                    className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground"
                    colSpan={2}
                  >
                    ≈ {inrFull(m.sumPay * A.priceInr)} collected
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Assumptions */}
      <Card className="border bg-white p-5">
        <button
          type="button"
          onClick={() => setShowAssume((s) => !s)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Flag className="size-4 text-muted-foreground" /> Plan assumptions &amp; targets
          </span>
          <span className="text-xs text-muted-foreground">{showAssume ? "Hide" : "Edit"}</span>
        </button>
        {showAssume && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Plan start date">
                <Input type="date" value={A.start} onChange={(e) => setAField("start", e.target.value)} />
              </Field>
              <Field label="Goal date">
                <Input type="date" value={A.target} onChange={(e) => setAField("target", e.target.value)} />
              </Field>
              <Field label="Monthly goal ($)">
                <Input type="number" min={0} step={500} value={A.goalUsd}
                  onChange={(e) => setAField("goalUsd", clampNum(e.target.value, 0, 10000))} />
              </Field>
              <Field label="Exchange rate (₹ / $)">
                <Input type="number" min={1} step={0.5} value={A.fx}
                  onChange={(e) => setAField("fx", clampNum(e.target.value, 1, 105))} />
              </Field>
              <Field label="Subscription (₹ / mo)">
                <Input type="number" min={1} step={100} value={A.priceInr}
                  onChange={(e) => setAField("priceInr", clampNum(e.target.value, 1, 3000))} />
              </Field>
              <Field label="Existing customers">
                <Input type="number" min={0} step={1} value={A.existing}
                  onChange={(e) => setAField("existing", clampNum(e.target.value, 0, 20))} />
              </Field>
              <Field label="Working days / week">
                <select
                  value={A.dpw}
                  onChange={(e) => setAField("dpw", parseInt(e.target.value, 10) || 6)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  <option value={5}>5 (Mon–Fri)</option>
                  <option value={6}>6 (Mon–Sat)</option>
                  <option value={7}>7 (all days)</option>
                </select>
              </Field>
              <Field label="Close rate (per 100 calls)">
                <Input type="number" min={0.1} step={0.5} value={A.closePct}
                  onChange={(e) => setAField("closePct", clampNum(e.target.value, 0.1, 10))} />
              </Field>
            </div>
            <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
              Goal needs <b className="text-foreground">{nf(m.targetSubs)}</b> customers ({usdFull(A.goalUsd)}{" "}
              × ₹{A.fx} ÷ ₹{A.priceInr}). Gap after your {nf(A.existing)} existing ={" "}
              <b className="text-foreground">{nf(m.netNew)}</b>.{" "}
              <b className="text-foreground">{nf(m.totalWD)}</b> total working days ({A.dpw}/week).
            </p>
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="mr-1.5 size-3.5" /> Export data
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1.5 size-3.5" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importData(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground hover:text-rose-600"
            onClick={() => {
              if (
                confirm(
                  "Reset all assumptions and delete every logged day? This can't be undone (export first if unsure)."
                )
              ) {
                setA(defaults());
                setLog([]);
                setEditId(null);
                resetForm();
              }
            }}
          >
            <RotateCcw className="mr-1.5 size-3.5" /> Reset everything
          </Button>
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Saved in this browser only. Export regularly to back up or move to another device — a
        shared, team-wide version can be added later.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- small pieces
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
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </Card>
  );
}

function PacePill({ cls, label }: { cls: "good" | "warn" | "bad" | "neutral"; label: string }) {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

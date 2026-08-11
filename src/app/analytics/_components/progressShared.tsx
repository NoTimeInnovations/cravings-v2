"use client";

/**
 * Shared bits for the Target + Daily-progress views:
 *  - rounding rules (orders round half-up; customer counts round up past 0.1)
 *  - a trend cell (current value + % vs the prior period)
 *  - the progress summary table (calls / free trials / paid customers over
 *    last 24h / 7d / 30d, each compared to the prior equal period)
 */

import { useCallback, useEffect, useState } from "react";
import {
  Phone,
  Sparkles,
  BadgeCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  NotebookPen,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DailyLogSummary, TrendPair } from "./types";

// ---------------------------------------------------------------- rounding
export const nfIN = (n: number) => Math.round(n).toLocaleString("en-IN");

// orders: below .5 → down, .5 or above → up (normal half-up rounding)
export const roundOrders = (n: number) => {
  const f = n - Math.floor(n);
  return f >= 0.5 ? Math.ceil(n) : Math.floor(n);
};

// customers: anything above .1 rounds up — a customer is a whole person
export const roundCustomers = (n: number) => {
  const f = n - Math.floor(n);
  return f > 0.1 ? Math.ceil(n) : Math.floor(n);
};

// ---------------------------------------------------------------- trend cell
export function TrendCell({
  curr,
  prev,
  currLabel,
  prevLabel,
  strong,
}: {
  curr: number;
  prev: number;
  currLabel: string;
  prevLabel: string;
  strong?: boolean;
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
    prev > 0 ? `${delta > 0 ? "+" : ""}${Math.round(pctv)}%` : curr > 0 ? "new" : "—";
  return (
    <div
      className="inline-flex flex-col items-end leading-tight"
      title={`${currLabel} ${nfIN(curr)} · ${prevLabel} ${nfIN(prev)}`}
    >
      <span className={cn("tabular-nums", strong ? "text-base font-semibold" : "font-medium")}>
        {nfIN(curr)}
      </span>
      <span className={cn("inline-flex items-center gap-0.5 text-[11px]", toneCls)}>
        <Icon className="size-3" />
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- summary table
const METRICS: {
  key: keyof DailyLogSummary;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}[] = [
  { key: "calls", label: "Calls done", icon: Phone, tone: "text-indigo-600 bg-indigo-50" },
  { key: "freeTrials", label: "New free trials", icon: Sparkles, tone: "text-sky-600 bg-sky-50" },
  { key: "paidCustomers", label: "New paid customers", icon: BadgeCheck, tone: "text-emerald-600 bg-emerald-50" },
];

const COLS: { key: "d1" | "d7" | "d30"; label: string; curLabel: string; prevLabel: string }[] = [
  { key: "d1", label: "Last 24h", curLabel: "last 24h", prevLabel: "prev 24h" },
  { key: "d7", label: "Past 7 days", curLabel: "last 7d", prevLabel: "prev 7d" },
  { key: "d30", label: "Past 30 days", curLabel: "last 30d", prevLabel: "prev 30d" },
];

export function ProgressSummaryTable({
  summary,
  loading,
}: {
  summary: DailyLogSummary | null;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5 text-left font-medium">Metric</th>
            {COLS.map((c) => (
              <th key={c.key} className="px-3 py-2.5 text-right font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map(({ key, label, icon: Icon, tone }) => (
            <tr key={key} className="border-b border-muted last:border-0">
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn("flex size-6 items-center justify-center rounded-md", tone)}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="font-medium">{label}</span>
                </div>
              </td>
              {COLS.map((c) => {
                const p: TrendPair = summary ? summary[key][c.key] : { curr: 0, prev: 0 };
                return (
                  <td key={c.key} className="px-3 py-3 text-right">
                    {loading && !summary ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <TrendCell
                        curr={p.curr}
                        prev={p.prev}
                        currLabel={c.curLabel}
                        prevLabel={c.prevLabel}
                        strong
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- self-fetching card (for the Target tab)
export function useDailyLogSummary(refreshMs = 30_000) {
  const [summary, setSummary] = useState<DailyLogSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/stats/daily-log", { cache: "no-store" });
      const d = await r.json();
      if (d.summary) setSummary(d.summary);
    } catch (e) {
      console.error("daily-log summary load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [load, refreshMs]);

  return { summary, loading, reload: load };
}

// ---------------------------------------------------------------- quick log form
const istTodayStr = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const clampCount = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Compact add-only daily-progress form (calls done / new free trials / new paid
 * customers + optional note). POSTs to the shared daily-log; `onSaved` fires
 * after a successful save so the caller can refresh its summary. Full history
 * and editing live on the Daily progress tab.
 */
export function QuickLogForm({ onSaved }: { onSaved?: () => void }) {
  const [date, setDate] = useState(istTodayStr);
  const [calls, setCalls] = useState("");
  const [trials, setTrials] = useState("");
  const [paid, setPaid] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setDate(istTodayStr());
    setCalls("");
    setTrials("");
    setPaid("");
    setNote("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = clampCount(calls);
    const t = clampCount(trials);
    const p = clampCount(paid);
    const n = note.trim();
    if (c + t + p === 0 && !n) {
      toast.error("Enter at least one number or a note");
      return;
    }
    setSubmitting(true);
    const r = await fetch("/api/stats/daily-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        logDate: date,
        calls: c,
        freeTrials: t,
        paidCustomers: p,
        note: n || null,
      }),
    });
    setSubmitting(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Couldn't save");
      return;
    }
    toast.success("Logged");
    reset();
    onSaved?.();
  };

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-2 items-end gap-3 border-t bg-muted/20 px-4 py-4 sm:grid-cols-3 lg:grid-cols-[auto_1fr_1fr_1fr_1.6fr_auto]"
    >
      <QuickField label="Date">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </QuickField>
      <QuickField label="Calls done" icon={<Phone className="size-3" />}>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="0"
          value={calls}
          onChange={(e) => setCalls(e.target.value)}
        />
      </QuickField>
      <QuickField label="New free trials" icon={<Sparkles className="size-3" />}>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="0"
          value={trials}
          onChange={(e) => setTrials(e.target.value)}
        />
      </QuickField>
      <QuickField label="New paid customers" icon={<BadgeCheck className="size-3" />}>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="0"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
        />
      </QuickField>
      <QuickField label="Note (optional)">
        <Input
          type="text"
          maxLength={200}
          placeholder="e.g. Kavaratti market visit"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </QuickField>
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <NotebookPen className="mr-1.5 size-3.5" />}
        Log
      </Button>
    </form>
  );
}

function QuickField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

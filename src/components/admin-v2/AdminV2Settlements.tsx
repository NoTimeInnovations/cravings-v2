"use client";

/**
 * Daily revenue summary for the logged-in restaurant.
 *
 * One row per calendar day (in the restaurant's own timezone): number of
 * orders, how much was collected online up-front (prepaid), how much is cash /
 * pay-at-counter (COD), and the day's total revenue (prepaid + COD). Gated to
 * Cashfree-enabled partners, same as before.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Landmark,
  Download,
  RefreshCw,
  Info,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { getPartnerDailyRevenue, type DailyRevenueRow } from "@/app/actions/dailyRevenue";

type FilterKey = "today" | "yesterday" | "7d" | "month" | "custom";
type PresetKey = Exclude<FilterKey, "custom">;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];
/** Widest custom range we'll query in one go. */
const MAX_CUSTOM_DAYS = 366;

function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}
function isoUTC(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
/**
 * Today's calendar date in the partner's timezone. Days are bucketed by the
 * partner's local calendar on the server, so presets must be anchored to the
 * same timezone — not the browser's local day, which can be a day off.
 */
function nowParts(tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}
/** UTC-midnight Date standing in for today's local calendar day — a safe base for date math. */
function todayDate(tz: string) {
  const { y, m, d } = nowParts(tz);
  return new Date(Date.UTC(y, m - 1, d));
}
function addDays(d: Date, days: number) {
  const c = new Date(d.getTime());
  c.setUTCDate(c.getUTCDate() + days);
  return c;
}
/** Whole days covered by [start, end] inclusive (both YYYY-MM-DD). */
function spanDays(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
}
function presetRange(key: PresetKey, tz: string): { startDate: string; endDate: string } {
  const today = todayDate(tz);
  const end = isoUTC(today);
  if (key === "today") return { startDate: end, endDate: end };
  if (key === "yesterday") {
    const y = isoUTC(addDays(today, -1));
    return { startDate: y, endDate: y };
  }
  if (key === "7d") return { startDate: isoUTC(addDays(today, -6)), endDate: end };
  const { y, m } = nowParts(tz);
  return { startDate: isoUTC(new Date(Date.UTC(y, m - 1, 1))), endDate: end };
}

export function AdminV2Settlements() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;
  const currency = ((userData as any)?.currency as string) || "₹";
  const tz = ((userData as any)?.timezone as string) || "Asia/Kolkata";
  const enabled =
    !!(userData as any)?.accept_payments_via_cashfree && !!(userData as any)?.cashfree_merchant_id;

  const today = useMemo(() => isoUTC(todayDate(tz)), [tz]);
  const initialCustom = useMemo(() => presetRange("7d", tz), [tz]);

  const [filter, setFilter] = useState<FilterKey>("today");
  // Applied custom range (drives the query) vs. draft inputs (what's being typed).
  const [customStart, setCustomStart] = useState(initialCustom.startDate);
  const [customEnd, setCustomEnd] = useState(initialCustom.endDate);
  const [draftStart, setDraftStart] = useState(initialCustom.startDate);
  const [draftEnd, setDraftEnd] = useState(initialCustom.endDate);
  const [customError, setCustomError] = useState<string | null>(null);
  const [rows, setRows] = useState<DailyRevenueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const currentRange = useMemo<{ startDate: string; endDate: string } | null>(() => {
    if (filter === "custom") {
      if (!customStart || !customEnd) return null;
      return { startDate: customStart, endDate: customEnd };
    }
    return presetRange(filter, tz);
  }, [filter, customStart, customEnd, tz]);

  const money = useCallback(
    (n: number) =>
      `${currency}${(Math.round(n * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    [currency],
  );

  const load = useCallback(async () => {
    if (!partnerId || !enabled || !currentRange) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPartnerDailyRevenue(partnerId, currentRange);
      if (res.success) {
        setRows(res.rows);
        setTruncated(res.truncated);
      } else {
        setRows([]);
        setError(res.error);
      }
    } catch {
      setError("Something went wrong loading orders.");
    } finally {
      setLoading(false);
    }
  }, [partnerId, enabled, currentRange]);

  useEffect(() => {
    load();
  }, [load]);

  const selectPreset = useCallback((key: FilterKey) => {
    setCustomError(null);
    setFilter(key);
  }, []);

  // Validate + commit the draft dates: tolerate a reversed range, block future
  // days, and cap the span so a huge window can't hammer the orders query.
  const applyCustom = useCallback(() => {
    let s = draftStart;
    let e = draftEnd;
    if (!s || !e) {
      setCustomError("Pick both a start and end date.");
      return;
    }
    if (s > e) {
      const t = s;
      s = e;
      e = t;
    }
    if (s > today) s = today;
    if (e > today) e = today;
    if (spanDays(s, e) > MAX_CUSTOM_DAYS) {
      setCustomError(`Choose a range of ${MAX_CUSTOM_DAYS} days or fewer.`);
      return;
    }
    setCustomError(null);
    setDraftStart(s);
    setDraftEnd(e);
    setCustomStart(s);
    setCustomEnd(e);
    setFilter("custom");
  }, [draftStart, draftEnd, today]);

  const totals = useMemo(() => {
    let orders = 0,
      prepaid = 0,
      cod = 0,
      revenue = 0;
    for (const r of rows) {
      orders += r.orders;
      prepaid += r.prepaid;
      cod += r.cod;
      revenue += r.revenue;
    }
    return { orders, prepaid, cod, revenue };
  }, [rows]);

  const downloadCsv = () => {
    const head = ["Date", "Orders", "Prepaid", "COD", "Revenue"];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r) =>
      [r.date, r.orders, r.prepaid.toFixed(2), r.cod.toFixed(2), r.revenue.toFixed(2)].map(esc).join(","),
    );
    const rr = currentRange ?? { startDate: today, endDate: today };
    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-revenue_${rr.startDate}_to_${rr.endDate}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const fmtDate = (s: string) => {
    const d = new Date(`${s}T00:00:00Z`);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  if (!enabled) {
    return (
      <div className="max-w-2xl">
        <Header />
        <Card className="mt-4 border bg-white p-8 text-center">
          <Landmark className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">Cashfree isn&rsquo;t set up yet</h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Online payments and your daily revenue summary appear here once Cashfree is connected. Add
            your Cashfree Merchant ID and turn on online payments in{" "}
            <span className="font-medium text-foreground">Settings → Payments</span>.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => selectPreset(f.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCsv} disabled={loading || rows.length === 0}>
            <Download className="mr-1.5 size-3.5" />
            Download report
          </Button>
        </div>
      </div>

      {/* Custom date range */}
      {filter === "custom" && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="rev-from"
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              From
            </label>
            <input
              id="rev-from"
              type="date"
              value={draftStart}
              max={draftEnd || today}
              onChange={(e) => setDraftStart(e.target.value)}
              className="rounded-md border bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="rev-to"
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              To
            </label>
            <input
              id="rev-to"
              type="date"
              value={draftEnd}
              min={draftStart || undefined}
              max={today}
              onChange={(e) => setDraftEnd(e.target.value)}
              className="rounded-md border bg-white px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button size="sm" onClick={applyCustom} disabled={loading}>
            Apply
          </Button>
          {customError ? (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="size-3.5 shrink-0" /> {customError}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Showing {customStart} &rarr; {customEnd}
            </span>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={loading ? "—" : totals.orders.toLocaleString("en-IN")} />
        <Stat label="Prepaid" value={loading ? "—" : money(totals.prepaid)} />
        <Stat label="COD" value={loading ? "—" : money(totals.cod)} />
        <Stat label="Revenue" value={loading ? "—" : money(totals.revenue)} accent />
      </div>

      {/* Table */}
      <Card className="overflow-hidden border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-right font-medium">Orders</th>
                <th className="px-4 py-2.5 text-right font-medium">Prepaid</th>
                <th className="px-4 py-2.5 text-right font-medium">COD</th>
                <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <AlertCircle className="mx-auto size-6 text-amber-500" />
                    <div className="mt-2 text-sm text-muted-foreground">{error}</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="text-sm font-medium">No orders in this period</div>
                    <div className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                      Each day&rsquo;s orders and revenue show here as they come in.
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.date} className="border-b border-muted last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium">{fmtDate(r.date)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                      {r.orders.toLocaleString("en-IN")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{money(r.prepaid)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{money(r.cod)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-primary">
                      {money(r.revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && rows.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/20 font-semibold">
                  <td className="px-4 py-2.5 text-left">Total</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{totals.orders.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(totals.prepaid)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(totals.cod)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-primary">{money(totals.revenue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {!loading && !error && rows.length > 0 && truncated && (
          <div className="border-t px-4 py-3 text-xs text-amber-700">
            Some orders were capped for this range — narrow the dates for an exact total.
          </div>
        )}
      </Card>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Prepaid = orders paid online up-front; COD = cash / pay-at-counter orders. Revenue = Prepaid +
        COD. Days are grouped by your restaurant&rsquo;s local calendar day.
      </p>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Landmark className="size-6 text-primary" />
        Settlements
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Daily orders and revenue — prepaid (online) vs COD (cash), and the total collected each day.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className="border bg-white p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1.5 text-xl font-semibold tabular-nums tracking-tight", accent && "text-primary")}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </Card>
  );
}

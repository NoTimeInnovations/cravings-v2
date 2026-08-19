"use client";

/**
 * Settlements — daily takings for the logged-in restaurant, redesigned for v3.
 *
 * The data layer is admin-v2's, unchanged: getPartnerDailyRevenue returns one
 * row per calendar day in the PARTNER's timezone (never the browser's — those
 * can be a day apart), plus a per-order breakdown when the range is a single
 * day. Only the presentation is new.
 *
 * Gated on Cashfree, same as v2: without online payments there is no prepaid
 * side to settle against.
 */

import * as React from "react";
import { Download, Landmark, Loader2, RefreshCw } from "lucide-react";

import {
  getPartnerDailyRevenue,
  type DailyRevenueRow,
  type RevenueTransaction,
} from "@/app/actions/dailyRevenue";
import { getFeatures } from "@/lib/getFeatures";
import { posMethodLabel } from "@/lib/orderLabels";
import { cn } from "@/lib/utils";
import { Partner, useAuthStore } from "@/store/authStore";

import { AdminV3Button, StatusPill, V3Card } from "./ui/primitives";

/* --------------------------------------------------------------- date math */

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

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const isoUTC = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/**
 * Today's calendar date in the PARTNER's timezone.
 *
 * Days are bucketed by the partner's local calendar on the server, so the
 * presets must be anchored to the same zone — the browser's day can be one off.
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

function todayDate(tz: string) {
  const { y, m, d } = nowParts(tz);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(d: Date, days: number) {
  const c = new Date(d.getTime());
  c.setUTCDate(c.getUTCDate() + days);
  return c;
}

const spanDays = (start: string, end: string) =>
  Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000,
  ) + 1;

function presetRange(key: PresetKey, tz: string) {
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

/* ------------------------------------------------------------------ pieces */

const LABEL =
  "text-[11px] font-medium uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500";
const STAT =
  "mt-1.5 text-[20px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-zinc-950 dark:text-zinc-50";
const SUB = "mt-1.5 text-[12px] leading-none text-zinc-400 dark:text-zinc-500";

function Stat({
  label,
  value,
  sub,
  dim,
}: {
  label: string;
  value: string;
  sub?: string;
  dim?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className={LABEL}>{label}</div>
      <div className={cn(STAT, dim && "text-zinc-300 dark:text-zinc-600")}>{value}</div>
      {sub ? <div className={SUB}>{sub}</div> : null}
    </div>
  );
}

const TX_COLS =
  "grid-cols-[84px_92px_minmax(90px,1fr)_minmax(110px,1fr)_110px]";
const TX_COLS_NO_POS = "grid-cols-[92px_110px_minmax(120px,1fr)_120px]";

/* ------------------------------------------------------------------ screen */

export function AdminV3Settlements() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const partnerId = partner?.id;
  const currency = partner?.currency || "₹";
  const tz = partner?.timezone || "Asia/Kolkata";

  const enabled =
    !!(partner as any)?.accept_payments_via_cashfree &&
    !!(partner as any)?.cashfree_merchant_id;

  // The Source column only earns its width for partners who bill in store.
  // Independent of the Cashfree gate so POS-only partners still get it.
  const feats = getFeatures(partner?.feature_flags || null);
  const isPos = !!feats?.pos?.enabled || !!feats?.captainordering?.enabled;

  const today = React.useMemo(() => isoUTC(todayDate(tz)), [tz]);
  const initialCustom = React.useMemo(() => presetRange("7d", tz), [tz]);

  const [filter, setFilter] = React.useState<FilterKey>("today");
  const [customStart, setCustomStart] = React.useState(initialCustom.startDate);
  const [customEnd, setCustomEnd] = React.useState(initialCustom.endDate);
  const [draftStart, setDraftStart] = React.useState(initialCustom.startDate);
  const [draftEnd, setDraftEnd] = React.useState(initialCustom.endDate);
  const [customError, setCustomError] = React.useState<string | null>(null);

  const [rows, setRows] = React.useState<DailyRevenueRow[]>([]);
  const [txns, setTxns] = React.useState<RevenueTransaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [truncated, setTruncated] = React.useState(false);
  const [txFilter, setTxFilter] = React.useState<"all" | "prepaid" | "cash">("all");

  const range = React.useMemo(() => {
    if (filter === "custom") {
      if (!customStart || !customEnd) return null;
      return { startDate: customStart, endDate: customEnd };
    }
    return presetRange(filter, tz);
  }, [filter, customStart, customEnd, tz]);

  const money = React.useCallback(
    (n: number) =>
      `${currency}${(Math.round(n * 100) / 100).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    [currency],
  );

  const load = React.useCallback(async () => {
    if (!partnerId || !enabled || !range) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPartnerDailyRevenue(partnerId, range);
      if (res.success) {
        setRows(res.rows);
        setTxns(res.transactions ?? []);
        setTruncated(res.truncated);
      } else {
        setRows([]);
        setTxns([]);
        setError(res.error);
      }
    } catch {
      setError("Something went wrong loading orders.");
    } finally {
      setLoading(false);
    }
  }, [partnerId, enabled, range]);

  React.useEffect(() => {
    void load();
  }, [load]);

  /**
   * Commit the typed dates: a reversed range is tolerated by swapping, future
   * days are clamped, and the span is capped so one query cannot sweep years.
   */
  const applyCustom = () => {
    let s = draftStart;
    let e = draftEnd;
    if (!s || !e) {
      setCustomError("Pick both a start and end date.");
      return;
    }
    if (s > e) [s, e] = [e, s];
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
  };

  const totals = React.useMemo(() => {
    let orders = 0, prepaid = 0, cod = 0, revenue = 0;
    for (const r of rows) {
      orders += r.orders;
      prepaid += r.prepaid;
      cod += r.cod;
      revenue += r.revenue;
    }
    return { orders, prepaid, cod, revenue };
  }, [rows]);

  const pct = (part: number) =>
    totals.revenue > 0 ? Math.round((part / totals.revenue) * 100) : 0;

  // The per-order breakdown only exists for a single day — that is all the
  // server returns, so the table silently falls back to the daily rows.
  const isSingleDay = !!range && range.startDate === range.endDate;

  const shownTxns = React.useMemo(() => {
    if (txFilter === "all") return txns;
    return txns.filter((t) => (txFilter === "prepaid" ? t.prepaid : !t.prepaid));
  }, [txns, txFilter]);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
  };

  const fmtOrderNo = (t: RevenueTransaction) =>
    t.displayId != null ? `#${t.displayId}` : `#${t.id.slice(0, 8)}`;

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

  const downloadCsv = () => {
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rr = range ?? { startDate: today, endDate: today };
    let head: string[];
    let lines: string[];
    let name: string;

    if (isSingleDay) {
      head = isPos
        ? ["Time", "Order No.", "Source", "Payment", "Amount"]
        : ["Time", "Order No.", "Payment", "Amount"];
      lines = shownTxns.map((t) => {
        const pos = t.source === "pos";
        const pay = pos ? posMethodLabel(t.paymentMethod) : t.prepaid ? "Prepaid" : "COD";
        const cols = isPos
          ? [fmtTime(t.createdAt), fmtOrderNo(t), pos ? "POS" : "Customer", pay, t.amount.toFixed(2)]
          : [fmtTime(t.createdAt), fmtOrderNo(t), pay, t.amount.toFixed(2)];
        return cols.map(esc).join(",");
      });
      name = `transactions_${rr.startDate}`;
    } else {
      head = ["Date", "Orders", "Prepaid", "COD", "Revenue"];
      lines = rows.map((r) =>
        [r.date, r.orders, r.prepaid.toFixed(2), r.cod.toFixed(2), r.revenue.toFixed(2)]
          .map(esc)
          .join(","),
      );
      name = `daily-revenue_${rr.startDate}_to_${rr.endDate}`;
    }

    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  /* ------------------------------------------------------------- not set up */

  if (!enabled) {
    return (
      <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
        <V3Card className="px-4 py-14 text-center">
          <Landmark className="mx-auto h-7 w-7 text-zinc-300 dark:text-zinc-600" />
          <div className="mt-3 text-[14px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            Online payments are not set up yet
          </div>
          <p className="mx-auto mt-2 max-w-[420px] text-[12.5px] leading-[1.6] text-zinc-500 dark:text-zinc-400">
            Your daily takings appear here once online payment is on. Turn it on
            under Settings → Payments &amp; tax → Methods.
          </p>
        </V3Card>
      </div>
    );
  }

  /* ------------------------------------------------------------------ screen */

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 px-3.5 lg:px-0">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setCustomError(null);
                setFilter(f.key);
              }}
              className={cn(
                "h-[30px] shrink-0 rounded-md px-3 text-[12.5px] font-medium leading-none transition-colors",
                filter === f.key
                  ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <AdminV3Button
          variant="secondary"
          className="ml-auto h-[34px] px-3 text-[13px]"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </AdminV3Button>
        <AdminV3Button
          variant="secondary"
          className="h-[34px] px-3 text-[13px]"
          onClick={downloadCsv}
          disabled={loading || (isSingleDay ? txns.length === 0 : rows.length === 0)}
        >
          <Download className="h-3.5 w-3.5" />
          Download report
        </AdminV3Button>
      </div>

      {filter === "custom" ? (
        <V3Card className="flex flex-wrap items-end gap-3 px-4 py-3.5">
          <label className="min-w-0">
            <span className="block text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              From
            </span>
            <input
              type="date"
              value={draftStart}
              max={today}
              onChange={(e) => setDraftStart(e.target.value)}
              className="mt-1.5 h-9 rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] leading-none text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </label>
          <label className="min-w-0">
            <span className="block text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              To
            </span>
            <input
              type="date"
              value={draftEnd}
              max={today}
              onChange={(e) => setDraftEnd(e.target.value)}
              className="mt-1.5 h-9 rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] leading-none text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </label>
          <AdminV3Button
            variant="primary"
            className="h-9 px-3.5 text-[13px] font-medium"
            onClick={applyCustom}
          >
            Apply
          </AdminV3Button>
          {customError ? (
            <div className="basis-full text-[12px] text-amber-600 dark:text-amber-400">
              {customError}
            </div>
          ) : null}
        </V3Card>
      ) : null}

      {/* Summary */}
      <V3Card className="flex flex-wrap items-start gap-x-[38px] gap-y-4 px-4 py-4">
        <Stat label="Orders" value={loading ? "—" : String(totals.orders)} dim={loading} />
        <Stat
          label="Prepaid"
          value={loading ? "—" : money(totals.prepaid)}
          sub={loading ? undefined : `${pct(totals.prepaid)}% of takings`}
          dim={loading}
        />
        <Stat
          label="COD"
          value={loading ? "—" : money(totals.cod)}
          sub={loading ? undefined : `${pct(totals.cod)}% collected in cash`}
          dim={loading}
        />
        <Stat label="Collected" value={loading ? "—" : money(totals.revenue)} dim={loading} />
      </V3Card>

      {error ? (
        <V3Card className="px-4 py-3.5">
          <div className="text-[12.5px] text-red-600 dark:text-red-400">{error}</div>
        </V3Card>
      ) : null}

      {truncated ? (
        <V3Card className="px-4 py-3">
          <div className="text-[12px] leading-[1.5] text-amber-600 dark:text-amber-400">
            That range has more orders than one query returns — narrow it for an
            exact figure.
          </div>
        </V3Card>
      ) : null}

      {/* Detail */}
      <V3Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
          <span className="text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            {isSingleDay ? "Transactions" : "Daily takings"}
          </span>
          <StatusPill tone="neutral">
            {isSingleDay ? `${shownTxns.length} of ${txns.length}` : `${rows.length} days`}
          </StatusPill>

          {isSingleDay ? (
            <div className="ml-auto flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              {(["all", "prepaid", "cash"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTxFilter(k)}
                  className={cn(
                    "h-[26px] rounded-md px-2.5 text-[12px] font-medium capitalize leading-none transition-colors",
                    txFilter === k
                      ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="px-4 py-14 text-center">
            <Loader2 className="mx-auto h-[18px] w-[18px] animate-spin text-zinc-400 dark:text-zinc-500" />
          </div>
        ) : isSingleDay ? (
          shownTxns.length === 0 ? (
            <div className="px-4 py-14 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
              No orders in this range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div
                  className={cn(
                    "grid items-center bg-zinc-50 dark:bg-zinc-950",
                    isPos ? TX_COLS : TX_COLS_NO_POS,
                  )}
                >
                  {(isPos
                    ? ["Time", "Order no.", "Source", "Payment"]
                    : ["Time", "Order no.", "Payment"]
                  ).map((h) => (
                    <div
                      key={h}
                      className="whitespace-nowrap px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500"
                    >
                      {h}
                    </div>
                  ))}
                  <div className="whitespace-nowrap px-3.5 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
                    Amount
                  </div>
                </div>

                {shownTxns.map((t) => {
                  const pos = t.source === "pos";
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "grid items-center border-t border-zinc-100 dark:border-zinc-800",
                        isPos ? TX_COLS : TX_COLS_NO_POS,
                      )}
                    >
                      <div className="px-3.5 py-2.5 text-[12.5px] tabular-nums text-zinc-500 dark:text-zinc-400">
                        {fmtTime(t.createdAt)}
                      </div>
                      <div className="px-3.5 py-2.5 text-[12.5px] font-medium tabular-nums text-zinc-950 dark:text-zinc-50">
                        {fmtOrderNo(t)}
                      </div>
                      {isPos ? (
                        <div className="px-3.5 py-2.5">
                          <StatusPill tone="outline">{pos ? "POS" : "Customer"}</StatusPill>
                        </div>
                      ) : null}
                      <div className="px-3.5 py-2.5">
                        {pos ? (
                          <StatusPill tone={t.paymentMethod ? "blue" : "neutral"}>
                            {posMethodLabel(t.paymentMethod)}
                          </StatusPill>
                        ) : t.prepaid ? (
                          <StatusPill tone="green">Prepaid</StatusPill>
                        ) : (
                          <StatusPill tone="amber">COD</StatusPill>
                        )}
                      </div>
                      <div className="px-3.5 py-2.5 text-right text-[13px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                        {money(t.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : rows.length === 0 ? (
          <div className="px-4 py-14 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
            No orders in this range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[minmax(160px,1fr)_90px_120px_120px_120px] items-center bg-zinc-50 dark:bg-zinc-950">
                {["Date", "Orders", "Prepaid", "COD", "Revenue"].map((h, i) => (
                  <div
                    key={h}
                    className={cn(
                      "whitespace-nowrap px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500",
                      i > 0 && "text-right",
                    )}
                  >
                    {h}
                  </div>
                ))}
              </div>
              {rows.map((r) => (
                <div
                  key={r.date}
                  className="grid grid-cols-[minmax(160px,1fr)_90px_120px_120px_120px] items-center border-t border-zinc-100 dark:border-zinc-800"
                >
                  <div className="px-3.5 py-2.5 text-[12.5px] font-medium text-zinc-950 dark:text-zinc-50">
                    {fmtDate(r.date)}
                  </div>
                  <div className="px-3.5 py-2.5 text-right text-[12.5px] tabular-nums text-zinc-700 dark:text-zinc-300">
                    {r.orders}
                  </div>
                  <div className="px-3.5 py-2.5 text-right text-[12.5px] tabular-nums text-zinc-700 dark:text-zinc-300">
                    {money(r.prepaid)}
                  </div>
                  <div className="px-3.5 py-2.5 text-right text-[12.5px] tabular-nums text-zinc-700 dark:text-zinc-300">
                    {money(r.cod)}
                  </div>
                  <div className="px-3.5 py-2.5 text-right text-[13px] font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
                    {money(r.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </V3Card>

      <div className="px-3.5 text-[12px] leading-[1.5] text-zinc-400 lg:px-0 dark:text-zinc-500">
        Prepaid = paid online up front. COD = cash or pay-at-counter. Days are
        grouped by your restaurant&rsquo;s own calendar day.
      </div>
    </div>
  );
}

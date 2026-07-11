"use client";

/**
 * Cashfree settlements for the logged-in restaurant (sub-merchant).
 *
 * Read-only reconciliation view: per settled online payment it shows the gross
 * amount, Cashfree's fee (₹ + %, both base and GST-inclusive) and the net amount
 * settled to the restaurant's bank. Data comes from Cashfree AFTER settlement
 * (~T+1/T+2), so a just-paid order won't appear yet.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Landmark,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { getPartnerSettlements, type SettlementRow } from "@/app/actions/cfSettlements";

type FilterKey = "today" | "7d" | "month";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "month", label: "This month" },
];
const PAGE_SIZE = 25;

function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}
function iso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function rangeFor(key: FilterKey): { startDate: string; endDate: string } {
  const now = new Date();
  const end = iso(now);
  if (key === "today") return { startDate: end, endDate: end };
  if (key === "7d") {
    const s = new Date(now);
    s.setDate(s.getDate() - 6);
    return { startDate: iso(s), endDate: end };
  }
  return { startDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: end };
}

export function AdminV2Settlements() {
  const { userData } = useAuthStore();
  const partnerId = (userData as any)?.id as string | undefined;
  const currency = ((userData as any)?.currency as string) || "₹";
  const enabled =
    !!(userData as any)?.accept_payments_via_cashfree && !!(userData as any)?.cashfree_merchant_id;

  const [filter, setFilter] = useState<FilterKey>("7d");
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [page, setPage] = useState(0);

  const money = useCallback(
    (n: number) => `${currency}${(Math.round(n * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    [currency],
  );

  const load = useCallback(async () => {
    if (!partnerId || !enabled) return;
    setLoading(true);
    setError(null);
    setPage(0);
    try {
      const res = await getPartnerSettlements(partnerId, rangeFor(filter));
      if (res.success) {
        // newest settled first
        const sorted = [...res.rows].sort((a, b) => {
          const ta = a.transferTime || a.paymentTime || "";
          const tb = b.transferTime || b.paymentTime || "";
          return ta < tb ? 1 : ta > tb ? -1 : 0;
        });
        setRows(sorted);
        setTruncated(res.truncated);
      } else {
        setRows([]);
        setError(res.error);
      }
    } catch {
      setError("Something went wrong loading settlements.");
    } finally {
      setLoading(false);
    }
  }, [partnerId, enabled, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    let gross = 0,
      settled = 0,
      fee = 0;
    for (const r of rows) {
      gross += r.orderAmount;
      settled += r.settlementAmount;
      fee += r.serviceCharge + r.serviceTax;
    }
    return { count: rows.length, gross, settled, fee, effPct: gross > 0 ? (fee / gross) * 100 : 0 };
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const downloadCsv = () => {
    const head = [
      "Settled on",
      "Paid on",
      "Order ID",
      "CF Payment ID",
      "Settlement ID",
      "UTR",
      "Gross amount",
      "Fee (service charge)",
      "GST on fee",
      "Total fee",
      "Base fee %",
      "Effective fee %",
      "Net settled",
      "Status",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r) => {
      const totalFee = r.serviceCharge + r.serviceTax;
      const basePct = r.orderAmount > 0 ? (r.serviceCharge / r.orderAmount) * 100 : 0;
      const effPct = r.orderAmount > 0 ? (totalFee / r.orderAmount) * 100 : 0;
      return [
        r.transferTime,
        r.paymentTime,
        r.orderId,
        r.cfPaymentId,
        r.cfSettlementId,
        r.transferUtr,
        r.orderAmount.toFixed(2),
        r.serviceCharge.toFixed(2),
        r.serviceTax.toFixed(2),
        totalFee.toFixed(2),
        basePct.toFixed(2),
        effPct.toFixed(2),
        r.settlementAmount.toFixed(2),
        r.status,
      ]
        .map(esc)
        .join(",");
    });
    const r = rangeFor(filter);
    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cashfree-settlements_${r.startDate}_to_${r.endDate}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const fmtDate = (s: string | null) => {
    if (!s) return "—";
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // ---- not enabled ----
  if (!enabled) {
    return (
      <div className="max-w-2xl">
        <Header />
        <Card className="mt-4 border bg-white p-8 text-center">
          <Landmark className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">Cashfree isn&rsquo;t set up yet</h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Online payment settlements appear here once Cashfree is connected for your store. Add
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
        <div className="inline-flex rounded-lg border bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
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
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCsv}
            disabled={loading || rows.length === 0}
          >
            <Download className="mr-1.5 size-3.5" />
            Download report
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Transactions" value={loading ? "—" : totals.count.toLocaleString("en-IN")} />
        <Stat label="Gross amount" value={loading ? "—" : money(totals.gross)} />
        <Stat label="Net settled" value={loading ? "—" : money(totals.settled)} accent />
        <Stat
          label="Cashfree fee"
          value={loading ? "—" : money(totals.fee)}
          sub={loading ? undefined : `${totals.effPct.toFixed(2)}% effective`}
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Settled on</th>
                <th className="px-4 py-2.5 text-left font-medium">Order</th>
                <th className="px-4 py-2.5 text-right font-medium">Gross</th>
                <th className="px-4 py-2.5 text-right font-medium">Fee</th>
                <th className="px-4 py-2.5 text-right font-medium">Base %</th>
                <th className="px-4 py-2.5 text-right font-medium">Eff. % (GST)</th>
                <th className="px-4 py-2.5 text-right font-medium">Net settled</th>
                <th className="px-4 py-2.5 text-left font-medium">UTR</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <AlertCircle className="mx-auto size-6 text-amber-500" />
                    <div className="mt-2 text-sm text-muted-foreground">{error}</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="text-sm font-medium">No settlements in this period</div>
                    <div className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                      Cashfree settles online payments to your bank about 1&ndash;2 working days
                      after the customer pays, so today&rsquo;s payments usually appear here from
                      tomorrow.
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((r, i) => {
                  const totalFee = r.serviceCharge + r.serviceTax;
                  const basePct = r.orderAmount > 0 ? (r.serviceCharge / r.orderAmount) * 100 : 0;
                  const effPct = r.orderAmount > 0 ? (totalFee / r.orderAmount) * 100 : 0;
                  return (
                    <tr key={(r.cfPaymentId || r.orderId || "") + i} className="border-b border-muted last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-2.5">{fmtDate(r.transferTime || r.paymentTime)}</td>
                      <td className="max-w-[160px] truncate px-4 py-2.5 font-mono text-xs text-muted-foreground" title={r.orderId || ""}>
                        {r.orderId || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{money(r.orderAmount)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {money(totalFee)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {basePct.toFixed(2)}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums font-medium">
                        {effPct.toFixed(2)}%
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-primary">
                        {money(r.settlementAmount)}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-2.5 font-mono text-xs text-muted-foreground" title={r.transferUtr || ""}>
                        {r.transferUtr || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && !error && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, rows.length)} of{" "}
              {rows.length}
              {truncated && " (capped — narrow the date range)"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-muted-foreground">
                {page + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Settlement figures come from Cashfree after payout (about 1&ndash;2 working days). Fee % is
        computed from Cashfree&rsquo;s charge: base = fee ÷ amount, effective includes 18% GST on the
        fee.
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
        Online payments settled to your bank via Cashfree — amount, fees and net received.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className="border bg-white p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1.5 text-xl font-semibold tabular-nums tracking-tight", accent && "text-primary")}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </Card>
  );
}

"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import dayjs from "dayjs";
import dayjsUtc from "dayjs/plugin/utc";
import dayjsTimezone from "dayjs/plugin/timezone";
import {
  DollarSign,
  Download,
  ExternalLink,
  IndianRupee,
  Loader2,
  QrCode,
  RefreshCcw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

import { GET_SCAN_ANALYTICS } from "@/api/analytics";
import { GET_QR_CODES_BY_PARTNER } from "@/api/qrcodes";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { getFeatures } from "@/lib/getFeatures";
import { isFreePlan } from "@/lib/getPlanLimits";
import { fetchFromHasura } from "@/lib/hasuraClient";
import * as ptime from "@/lib/partnerTime";
import { cn } from "@/lib/utils";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import { Partner, useAuthStore } from "@/store/authStore";
import { downloadOrderReport } from "@/utils/downloadOrderReport";
import { AdminV3Button, V3Card } from "./ui/primitives";

dayjs.extend(dayjsUtc);
dayjs.extend(dayjsTimezone);

/**
 * admin-v3 Analytics.
 *
 * Same data contract as `AdminV2Analytics` — identical range tabs, identical
 * `statusFilterGql`, identical `sourceAggsGql` aggregate aliases, identical
 * top_items / category_stats shaping and the same GET_SCAN_ANALYTICS call — so
 * the two screens always reconcile. The only thing v3 computes that v2 did not
 * is the hourly revenue histogram, and even that reuses the `daily_sales` nodes
 * v2 already fetches (`{ created_at, total_price }`), bucketed by the PARTNER's
 * timezone exactly the way v2 buckets QR scans by `HH:00`.
 */

type RangeTab = "today" | "month" | "custom";
type StatusFilter = "completed" | "non_cancelled";

const formatDate = (d: Date) => format(d, "yyyy-MM-dd");

const buildRange = (
  tab: RangeTab,
  tz: string | null | undefined,
  customStart: Date,
  customEnd: Date,
): { start: string; end: string } => {
  if (tab === "today") {
    const r = ptime.todayRange(tz);
    return { start: r.startISO, end: r.endISO };
  }
  if (tab === "month") {
    return { start: ptime.monthRange(tz).startISO, end: ptime.todayRange(tz).endISO };
  }
  const r = ptime.dateRange(formatDate(customStart), formatDate(customEnd), tz);
  return { start: r.startISO, end: r.endISO };
};

/** Hour-of-day (0-23) of a UTC instant, in the partner's timezone. */
function hourInTz(iso: string, tz?: string | null): number | null {
  const d = dayjs(iso);
  if (!d.isValid()) return null;
  return d.tz(ptime.safeTz(tz)).hour();
}

/**
 * Smallest "round" number at or above `peak`, used for the chart's top gridline.
 * 630 → 700, 1 → 1, 34 → 40. Returns 0 for an empty series so callers can show
 * a flat axis instead of dividing by zero.
 */
function niceMax(peak: number): number {
  if (!(peak > 0)) return 0;
  const step = Math.pow(10, Math.floor(Math.log10(peak)));
  return Math.ceil(peak / step) * step;
}

/**
 * The hours the histogram shows: everything with data, one hour of breathing
 * room either side, widened to at least 8 columns so a single busy hour does
 * not render as one lonely bar. Falls back to the trading-day 08–20 when the
 * range has no revenue at all.
 */
function hourWindow(buckets: number[]): number[] {
  const active: number[] = [];
  buckets.forEach((v, i) => {
    if (v > 0) active.push(i);
  });
  let lo = 8;
  let hi = 20;
  if (active.length) {
    lo = Math.max(0, active[0] - 1);
    hi = Math.min(23, active[active.length - 1] + 1);
  }
  while (hi - lo + 1 < 8) {
    if (lo > 0) lo -= 1;
    else if (hi < 23) hi += 1;
    else break;
  }
  const out: number[] = [];
  for (let h = lo; h <= hi; h += 1) out.push(h);
  return out;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/* ------------------------------------------------------------------ pieces */

function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  className,
  fill = false,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
  /** Segments share the width equally instead of hugging their labels. */
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-800",
        fill ? "w-full lg:w-auto" : "shrink-0",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "h-7 whitespace-nowrap rounded-md border px-[11px] text-[12.5px] font-medium leading-none transition-colors",
              fill && "flex-1 lg:flex-none",
              active
                ? "border-zinc-200 bg-white text-zinc-950 shadow-[0_1px_2px_0_rgba(9,9,11,.05)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                : "border-transparent bg-transparent text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconClass: string;
}) {
  const Icon = icon;
  return (
    <V3Card className="min-w-0 px-[18px] py-4 lg:flex-[1_1_200px]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium leading-none text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <Icon size={15} strokeWidth={1.8} className={cn("ml-auto shrink-0", iconClass)} />
      </div>
      <div className="mt-2 whitespace-nowrap text-2xl font-semibold leading-none tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-[3px] text-xs leading-normal text-zinc-400 dark:text-zinc-500">
        {sub}
      </div>
    </V3Card>
  );
}

function CardHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="min-w-0 flex-[1_1_200px]">
      <div className="text-[14.5px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
        {title}
      </div>
      <div className="mt-0.5 text-[12.5px] leading-normal text-zinc-500 dark:text-zinc-400">
        {sub}
      </div>
    </div>
  );
}

/** One "dot + label + count + amount + bar" row (Order mix / Payments). */
function SplitRow({
  label,
  countLabel,
  amountLabel,
  pct,
  dotClass,
  barClass,
}: {
  label: string;
  countLabel: string;
  amountLabel: string;
  pct: number;
  dotClass: string;
  barClass: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-[2px]", dotClass)} />
        <span className="min-w-0 truncate text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
        <span className="ml-auto whitespace-nowrap text-[13px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
          {countLabel}
        </span>
        <span className="w-[58px] shrink-0 text-right text-xs leading-none text-zinc-400 dark:text-zinc-500">
          {amountLabel}
        </span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={cn("h-full rounded-full", barClass)}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

/** The shared bar histogram used by both "Revenue by hour" and "QR scans by hour". */
function HourHistogram({
  hours,
  values,
  axisMax,
  height,
  barMaxWidth,
  labelFor,
  axisLabels,
  barClass,
}: {
  hours: number[];
  values: number[];
  axisMax: number;
  height: number;
  barMaxWidth: number;
  labelFor: (h: number) => string;
  axisLabels: string[];
  barClass: string;
}) {
  return (
    <div className="flex gap-3.5 p-[18px]">
      <div
        className="flex shrink-0 flex-col items-end justify-between text-[10.5px] font-medium leading-none text-zinc-400 dark:text-zinc-500"
        style={{ height }}
      >
        {axisLabels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="flex min-w-[360px] items-end gap-1.5">
          {hours.map((h, i) => {
            const v = values[i] || 0;
            const px = axisMax > 0 ? Math.round((v / axisMax) * height) : 0;
            const barH = Math.max(3, px);
            const filled = v > 0;
            return (
              <div
                key={h}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                title={`${labelFor(h)} · ${v}`}
              >
                <div
                  className="flex w-full items-end"
                  style={{ height, maxWidth: barMaxWidth }}
                >
                  <div
                    className={cn(
                      "w-full",
                      filled
                        ? cn("rounded-b-[2px] rounded-t-[4px]", barClass)
                        : "rounded-[2px] bg-zinc-100 dark:bg-zinc-800",
                    )}
                    style={{ height: barH }}
                  />
                </div>
                <span className="text-[10.5px] font-medium leading-none text-zinc-400 dark:text-zinc-500">
                  {labelFor(h)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-[18px] py-10 text-center text-[13px] leading-normal text-zinc-400 dark:text-zinc-500">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ screen */

export function AdminV3Analytics() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const partnerId = partner?.id;
  const tz = (partner as any)?.timezone as string | undefined;
  const currency = partner?.currency || "₹";

  const planId = (userData as any)?.subscription_details?.plan?.id;
  const isOnFreePlan = isFreePlan(planId);

  const [mounted, setMounted] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<RangeTab>("today");
  const [orderStatusFilter, setOrderStatusFilter] =
    React.useState<StatusFilter>("non_cancelled");
  const [dateRange, setDateRange] = React.useState({
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
  });
  const [reportData, setReportData] = React.useState<any>(null);
  const [scanData, setScanData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [qrId, setQrId] = React.useState<string | null>(null);
  const [storeName, setStoreName] = React.useState("");

  React.useEffect(() => {
    setMounted(true);
    setDateRange({ startDate: subDays(new Date(), 7), endDate: new Date() });
  }, []);

  const features = getFeatures(partner?.feature_flags || null);
  const isAnyOrderingEnabled = !!(
    features?.ordering?.enabled ||
    features?.pos?.enabled ||
    features?.delivery?.enabled ||
    features?.captainordering?.enabled
  );
  const isPosEnabled = !!features?.pos?.enabled || !!features?.captainordering?.enabled;

  // ------------------------------------------------------------ queries (v2)

  const statusFilterGql =
    orderStatusFilter === "completed"
      ? `status: {_eq: "completed"}`
      : `_or: [{status: {_is_null: true}}, {status: {_nin: ["cancelled", "pending_payment", "expired"]}}]`;

  const sourceAggsGql = React.useCallback(
    (dateWhere: string) => {
      const base = `${dateWhere}, ${statusFilterGql}, partner_id: {_eq: "${partnerId}"}`;
      const agg = (alias: string, extra: string) =>
        `${alias}: orders_aggregate(where: {${base}${extra ? ", " + extra : ""}}) { aggregate { count sum { total_price } } }`;
      return `
        ${agg("pos_orders", `source: {_eq: "pos"}`)}
        ${agg("online_orders", `source: {_eq: "customer"}`)}
        ${agg("online_prepaid_orders", `source: {_eq: "customer"}, is_paid: {_eq: true}`)}
        ${agg("pos_cash", `source: {_eq: "pos"}, payment_method: {_eq: "cash"}`)}
        ${agg("pos_upi", `source: {_eq: "pos"}, payment_method: {_eq: "upi"}`)}
        ${agg("pos_card", `source: {_eq: "pos"}, payment_method: {_eq: "card"}`)}
        ${agg("pos_unspecified", `source: {_eq: "pos"}, payment_method: {_is_null: true}`)}
        ${agg("dinein_orders", `type: {_in: ["pos", "table_order"]}`)}
        ${agg("delivery_type_orders", `type: {_eq: "delivery"}, delivery_address: {_is_null: false}`)}
        ${agg("takeaway_orders", `type: {_eq: "delivery"}, delivery_address: {_is_null: true}`)}
      `;
    },
    [statusFilterGql, partnerId],
  );

  const buildOrdersQuery = React.useCallback(
    (dateWhere: string, header: string) => `
      query ${header} {
        orders_aggregate(where: {${dateWhere}, ${statusFilterGql}, partner_id: {_eq: "${partnerId}"}}) {
          aggregate { sum { total_price } count }
        }
        delivery_orders: orders_aggregate(where: {${dateWhere}, ${statusFilterGql}, type: {_eq: "delivery"}, partner_id: {_eq: "${partnerId}"}}) {
          aggregate { count }
        }
        cash_orders: orders_aggregate(where: {${dateWhere}, ${statusFilterGql}, payment_method: {_eq: "cash"}, partner_id: {_eq: "${partnerId}"}}) {
          aggregate { count sum { total_price } }
        }
        upi_orders: orders_aggregate(where: {${dateWhere}, ${statusFilterGql}, payment_method: {_eq: "upi"}, partner_id: {_eq: "${partnerId}"}}) {
          aggregate { count sum { total_price } }
        }
        card_orders: orders_aggregate(where: {${dateWhere}, ${statusFilterGql}, payment_method: {_eq: "card"}, partner_id: {_eq: "${partnerId}"}}) {
          aggregate { count sum { total_price } }
        }
        null_payment_orders: orders_aggregate(where: {${dateWhere}, ${statusFilterGql}, payment_method: {_is_null: true}, partner_id: {_eq: "${partnerId}"}}) {
          aggregate { count sum { total_price } }
        }
        ${sourceAggsGql(dateWhere)}
        daily_sales: orders_aggregate(
          where: {${dateWhere}, ${statusFilterGql}, partner_id: {_eq: "${partnerId}"}}
          order_by: {created_at: asc}
        ) {
          nodes { total_price, created_at }
        }
        top_items: order_items(where: {order: {${dateWhere}, ${statusFilterGql}, partner_id: {_eq: "${partnerId}"}}}) {
          menu { name, price, category { name } }
          quantity
        }
        category_stats: order_items(where: {order: {${dateWhere}, ${statusFilterGql}, partner_id: {_eq: "${partnerId}"}}}) {
          menu { category { name }, price }
          quantity
        }
      }
    `,
    [statusFilterGql, partnerId, sourceAggsGql],
  );

  const GET_ONE_QR = `
    query GetOneQr($partner_id: uuid!) {
      qr_codes(where: {partner_id: {_eq: $partner_id}}, limit: 1) {
        id
        partner { store_name }
      }
    }
  `;

  const fetchData = React.useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const { start, end } = buildRange(activeTab, tz, dateRange.startDate, dateRange.endDate);

      const fetchOrders = () => {
        if (activeTab === "custom") {
          return fetchFromHasura(
            buildOrdersQuery(
              `created_at: {_gte: $startDate, _lte: $endDate}`,
              `CustomDateOrders($startDate: timestamptz!, $endDate: timestamptz!)`,
            ),
            { startDate: start, endDate: end },
          );
        }
        return fetchFromHasura(
          buildOrdersQuery(
            `created_at: {_gte: "${start}", _lte: "${end}"}`,
            activeTab === "today" ? "TodayOrders" : "MonthlyOrders",
          ),
        );
      };

      const fetchScanAnalytics = async () => {
        const qrCodesRes = await fetchFromHasura(GET_QR_CODES_BY_PARTNER, {
          partner_id: partnerId,
        });
        const qrCodes = qrCodesRes?.qr_codes || [];
        if (!qrCodes.length) {
          return { total_scans: { aggregate: { count: 0 } }, scans_list: [] };
        }
        return fetchFromHasura(GET_SCAN_ANALYTICS, {
          qr_ids: qrCodes.map((q: any) => q.id),
          startDate: start,
          endDate: end,
        });
      };

      const fetchOneQr = async () => {
        if (qrId) return null;
        return fetchFromHasura(GET_ONE_QR, { partner_id: partnerId });
      };

      const [orderResult, scanResult, oneQrResult] = await Promise.all([
        fetchOrders(),
        fetchScanAnalytics(),
        fetchOneQr(),
      ]);

      if (orderResult) setReportData(orderResult);
      if (scanResult) setScanData(scanResult);
      if (oneQrResult?.qr_codes?.[0]) {
        setQrId(oneQrResult.qr_codes[0].id);
        setStoreName(oneQrResult.qr_codes[0].partner?.store_name || "");
      }
    } catch (err) {
      console.error("[V3 Analytics] fetch failed:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateRange.startDate, dateRange.endDate, partnerId, tz, buildOrdersQuery, qrId]);

  React.useEffect(() => {
    if (partnerId) fetchData();
  }, [fetchData, partnerId]);

  // ---------------------------------------------------------------- derived

  const money = React.useCallback(
    (n: number) => `${currency}${Math.round(n || 0).toLocaleString("en-IN")}`,
    [currency],
  );

  const totalEarnings = reportData?.orders_aggregate?.aggregate?.sum?.total_price || 0;
  const totalOrders = reportData?.orders_aggregate?.aggregate?.count || 0;
  const avgOrderValue = totalOrders ? totalEarnings / totalOrders : 0;

  const seg = (alias: string) => ({
    count: reportData?.[alias]?.aggregate?.count || 0,
    amount: reportData?.[alias]?.aggregate?.sum?.total_price || 0,
  });

  const pos = seg("pos_orders");
  const online = seg("online_orders");
  const showPos = isPosEnabled || pos.count > 0;
  const onlinePrepaid = seg("online_prepaid_orders");
  const onlineCod = {
    count: Math.max(0, online.count - onlinePrepaid.count),
    amount: Math.max(0, online.amount - onlinePrepaid.amount),
  };
  const dineIn = seg("dinein_orders");
  const delivery = seg("delivery_type_orders");
  const takeaway = seg("takeaway_orders");

  const rangeLabel =
    activeTab === "today" ? "Today" : activeTab === "month" ? "This month" : "Selected period";
  const rangeSuffix =
    activeTab === "today"
      ? "for today"
      : activeTab === "month"
        ? "for this month"
        : "for the selected period";

  /** Revenue bucketed by hour-of-day in the partner's timezone. */
  const revenueByHour = React.useMemo(() => {
    const buckets = new Array(24).fill(0) as number[];
    const nodes: any[] = reportData?.daily_sales?.nodes || [];
    nodes.forEach((o) => {
      const h = hourInTz(o?.created_at, tz);
      if (h == null) return;
      buckets[h] += o?.total_price || 0;
    });
    return buckets;
  }, [reportData, tz]);

  const revenueHours = React.useMemo(() => hourWindow(revenueByHour), [revenueByHour]);
  const revenuePeak = Math.max(0, ...revenueByHour);
  const revenueAxisMax = niceMax(revenuePeak);
  const peakHour = revenuePeak > 0 ? revenueByHour.indexOf(revenuePeak) : null;

  /** Best contiguous two-hour window by revenue — the design's "Busiest window". */
  const busiestWindow = React.useMemo(() => {
    if (revenuePeak <= 0) return null;
    let best = -1;
    let bestSum = -1;
    for (let h = 0; h < 23; h += 1) {
      const s = revenueByHour[h] + revenueByHour[h + 1];
      if (s > bestSum) {
        bestSum = s;
        best = h;
      }
    }
    return best >= 0 ? `${pad2(best)}–${pad2(Math.min(23, best + 2))}` : null;
  }, [revenueByHour, revenuePeak]);

  /** QR scans bucketed the same way v2 does (HH:00), in the partner's timezone. */
  const scansByHour = React.useMemo(() => {
    const buckets = new Array(24).fill(0) as number[];
    const list: any[] = scanData?.scans_list || [];
    list.forEach((s) => {
      const h = hourInTz(s?.created_at, tz);
      if (h == null) return;
      buckets[h] += 1;
    });
    return buckets;
  }, [scanData, tz]);

  const scanHours = React.useMemo(() => hourWindow(scansByHour), [scansByHour]);
  const scanPeak = Math.max(0, ...scansByHour);
  const scanAxisMax = niceMax(scanPeak);
  const totalScans = scanData?.total_scans?.aggregate?.count || 0;
  const scanToOrderRate = totalScans > 0 ? Math.round((totalOrders / totalScans) * 100) : null;

  const topItems = React.useMemo(() => {
    const rows: any[] = reportData?.top_items || [];
    const map = new Map<string, { quantity: number; category: string; revenue: number }>();
    rows.forEach((item) => {
      if (!item?.menu) return;
      const name = item.menu.name ?? "Unknown item";
      const category = item.menu.category?.name ?? "Uncategorized";
      const qty = item.quantity || 0;
      const cur = map.get(name) || { quantity: 0, category, revenue: 0 };
      map.set(name, {
        category: cur.category,
        quantity: cur.quantity + qty,
        revenue: cur.revenue + (item.menu.price || 0) * qty,
      });
    });
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, ...s }))
      .filter((i) => i.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);
  }, [reportData]);

  const categoryData = React.useMemo(() => {
    const rows: any[] = reportData?.category_stats || [];
    const map = new Map<string, { quantity: number; revenue: number }>();
    rows.forEach((item) => {
      if (!item?.menu) return;
      const name = item.menu.category?.name ?? "Uncategorized";
      const qty = item.quantity || 0;
      const cur = map.get(name) || { quantity: 0, revenue: 0 };
      map.set(name, { quantity: cur.quantity + qty, revenue: cur.revenue + (item.menu.price || 0) * qty });
    });
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [reportData]);

  const topItemMaxQty = topItems.length ? topItems[0].quantity : 0;
  const mixTotal = Math.max(1, delivery.amount + takeaway.amount + dineIn.amount);
  const payRows = [
    {
      label: "COD (pay on delivery)",
      seg: onlineCod,
      dot: "bg-orange-600",
      bar: "bg-orange-600",
    },
    {
      label: "Prepaid (paid online)",
      seg: onlinePrepaid,
      dot: "bg-green-700 dark:bg-green-500",
      bar: "bg-green-700 dark:bg-green-500",
    },
    ...(showPos
      ? [
          {
            label: "POS (collected at counter)",
            seg: pos,
            dot: "bg-zinc-900 dark:bg-zinc-100",
            bar: "bg-zinc-900 dark:bg-zinc-100",
          },
        ]
      : []),
  ];
  const payTotal = Math.max(1, payRows.reduce((s, r) => s + r.seg.amount, 0));

  const settlementNote = (() => {
    const cash = onlineCod.amount + (showPos ? pos.amount : 0);
    const bank = onlinePrepaid.amount;
    if (cash <= 0 && bank <= 0) return "No payments recorded in this period yet.";
    if (bank <= 0)
      return `All of this revenue is cash to collect — nothing settles to your bank yet.`;
    if (cash <= 0) return `All of this revenue is prepaid and settles to your bank.`;
    return `${money(bank)} settles to your bank · ${money(cash)} is cash you collect yourself.`;
  })();

  // ---------------------------------------------------------------- actions

  const allOrdersQuery = `
    query AllOrders($startDate: timestamptz!, $endDate: timestamptz!, $userId: uuid!) {
      orders(where: {created_at: {_gte: $startDate, _lte: $endDate}, ${statusFilterGql}, partner_id: {_eq: $userId}}, order_by: {created_at: desc}) {
        id
        created_at
        total_price
        table_number
        delivery_address
        extra_charges
        display_id
        status
        table_name
        type
        payment_method
        order_items { id quantity menu { name price } }
      }
    }
  `;

  const handleDownload = async () => {
    if (isOnFreePlan) {
      const { toast } = await import("sonner");
      toast.error("Upgrade to download reports");
      return;
    }
    setIsDownloading(true);
    try {
      const { start, end } = buildRange(activeTab, tz, dateRange.startDate, dateRange.endDate);
      const res = await fetchFromHasura(allOrdersQuery, {
        startDate: start,
        endDate: end,
        userId: partnerId,
      });
      await downloadOrderReport(
        reportData,
        topItems,
        activeTab,
        dateRange,
        partner ?? null,
        res?.orders || [],
      );
    } catch (err) {
      console.error("[V3 Analytics] report download failed:", err);
      const { toast } = await import("sonner");
      toast.error("Couldn't build the report");
    } finally {
      setIsDownloading(false);
    }
  };

  const openMenu = () => {
    if (partner?.username) {
      window.open(`/${partner.username}`, "_blank", "noopener,noreferrer");
    } else if (qrId) {
      window.open(
        `/qrScan/${(storeName || "").replace(/ /g, "-")}/${qrId}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  const canOpenMenu = !!partner?.username || !!qrId;
  const RevenueIcon = currency === "₹" ? IndianRupee : DollarSign;

  // ----------------------------------------------------------------- render

  if (!mounted || (loading && !reportData)) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-zinc-400 dark:text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[1240px] flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* -------------------------------------------------------- toolbar */}
      {/* Mobile stacks three FULL-WIDTH rows so both edges line up; the old
          flex-wrap left each control a different width and ragged on the right.
          From lg it is one inline row again, with the actions pushed right. */}
      <div className="flex flex-col gap-2 px-3.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2.5 lg:px-0">
        <SegmentedTabs<RangeTab>
          fill
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "today", label: "Today" },
            { value: "month", label: "This Month" },
            { value: "custom", label: "Custom" },
          ]}
        />
        <SegmentedTabs<StatusFilter>
          fill
          value={orderStatusFilter}
          onChange={setOrderStatusFilter}
          options={[
            { value: "completed", label: "Completed only" },
            { value: "non_cancelled", label: "All except cancelled" },
          ]}
        />
        {activeTab === "custom" && (
          <DateRangePicker
            align="start"
            initialDateFrom={dateRange.startDate}
            initialDateTo={dateRange.endDate}
            onUpdate={(r) => setDateRange({ startDate: r.startDate, endDate: r.endDate })}
          />
        )}

        <div className="flex items-center gap-2 lg:ml-auto">
          <AdminV3Button
            variant="icon"
            aria-label="Refresh analytics"
            onClick={() => fetchData()}
            disabled={loading}
          >
            <RefreshCcw size={16} strokeWidth={1.8} className={loading ? "animate-spin" : ""} />
          </AdminV3Button>
          {canOpenMenu && (
            <AdminV3Button
              variant="secondary"
              className="h-[34px] flex-1 px-[13px] text-[13px] lg:flex-none"
              onClick={openMenu}
            >
              <ExternalLink
                size={15}
                strokeWidth={1.8}
                className="text-zinc-500 dark:text-zinc-400"
              />
              View Menu
            </AdminV3Button>
          )}
          {isAnyOrderingEnabled && (
            <AdminV3Button
              variant="primary"
              className="h-[34px] flex-1 px-[14px] text-[13px] font-medium lg:flex-none"
              onClick={handleDownload}
              disabled={loading || isDownloading}
            >
              <Download size={15} strokeWidth={2} />
              {isDownloading ? "Downloading…" : "Download Report"}
            </AdminV3Button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- tiles */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        {isAnyOrderingEnabled && (
          <>
            <StatTile
              label="Total revenue"
              value={money(totalEarnings)}
              sub={
                onlineCod.amount > 0
                  ? `${rangeLabel} · COD ${money(onlineCod.amount)}`
                  : rangeLabel
              }
              icon={RevenueIcon}
              iconClass="text-zinc-900 dark:text-zinc-100"
            />
            <StatTile
              label="Orders"
              value={String(totalOrders)}
              sub={orderStatusFilter === "completed" ? "Completed only" : "All except cancelled"}
              icon={ShoppingBag}
              iconClass="text-zinc-400 dark:text-zinc-500"
            />
            <StatTile
              label="Avg. order value"
              value={money(avgOrderValue)}
              sub="Per order average"
              icon={TrendingUp}
              iconClass="text-green-700 dark:text-green-400"
            />
          </>
        )}
        <StatTile
          label="Menu scans"
          value={String(totalScans)}
          sub={
            activeTab === "today"
              ? "Scanned today"
              : activeTab === "month"
                ? "Scanned this month"
                : "In selected period"
          }
          icon={QrCode}
          iconClass="text-orange-600 dark:text-orange-400"
        />
      </div>

      {isAnyOrderingEnabled && (
        <>
          {/* --------------------------------------------- revenue by hour */}
          <V3Card>
            <div className="flex flex-wrap items-start gap-3 px-[18px] pt-4">
              <CardHead
                title="Revenue by hour"
                sub={`${rangeLabel} · ${totalOrders} ${totalOrders === 1 ? "order" : "orders"} · bucketed in your store's timezone`}
              />
              <div className="flex shrink-0 items-center gap-3.5">
                <div>
                  <div className="text-[11.5px] font-medium leading-none text-zinc-500 dark:text-zinc-400">
                    Peak hour
                  </div>
                  <div className="mt-1 text-[13.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                    {peakHour == null
                      ? "—"
                      : `${pad2(peakHour)}:00 · ${money(revenueByHour[peakHour])}`}
                  </div>
                </div>
                <div>
                  <div className="text-[11.5px] font-medium leading-none text-zinc-500 dark:text-zinc-400">
                    Busiest window
                  </div>
                  <div className="mt-1 text-[13.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                    {busiestWindow ?? "—"}
                  </div>
                </div>
              </div>
            </div>
            <HourHistogram
              hours={revenueHours}
              values={revenueHours.map((h) => revenueByHour[h])}
              axisMax={revenueAxisMax}
              height={150}
              barMaxWidth={34}
              labelFor={(h) => pad2(h)}
              axisLabels={[
                money(revenueAxisMax),
                money(revenueAxisMax / 2),
                money(0),
              ]}
              barClass="bg-zinc-900 dark:bg-zinc-100"
            />
          </V3Card>

          {/* -------------------------------------- order mix + payments */}
          <div className="flex flex-col gap-3.5 lg:flex-row lg:flex-wrap">
            <V3Card className="min-w-0 lg:flex-[1_1_320px]">
              <div className="flex items-start justify-between gap-3 px-[18px] pt-4">
                <div className="min-w-0">
                  <CardHead
                    title="Order types"
                    sub={`How the ${totalOrders} ${totalOrders === 1 ? "order was" : "orders were"} fulfilled`}
                  />
                </div>
                {/* Where the orders came from. A DIFFERENT axis from the rows
                    below — every order is counted once below by how it was
                    fulfilled and once here by where it was placed — so it sits
                    in the corner rather than becoming a fourth row, which would
                    read as double counting. */}
                <div className="flex shrink-0 items-center gap-3 text-right">
                  <div>
                    <div className="text-[10.5px] font-medium uppercase leading-none tracking-[0.04em] text-zinc-400 dark:text-zinc-500">
                      Offline
                    </div>
                    <div className="mt-1.5 text-[15px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
                      {pos.count}
                    </div>
                  </div>
                  <div className="h-7 w-px bg-zinc-200 dark:bg-zinc-800" />
                  <div>
                    <div className="text-[10.5px] font-medium uppercase leading-none tracking-[0.04em] text-zinc-400 dark:text-zinc-500">
                      Online
                    </div>
                    <div className="mt-1.5 text-[15px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
                      {online.count}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 px-[18px] pb-[18px] pt-3.5">
                <SplitRow
                  label="Delivery"
                  countLabel={String(delivery.count)}
                  amountLabel={money(delivery.amount)}
                  pct={(delivery.amount / mixTotal) * 100}
                  dotClass="bg-zinc-900 dark:bg-zinc-100"
                  barClass="bg-zinc-900 dark:bg-zinc-100"
                />
                <SplitRow
                  label="Takeaway"
                  countLabel={String(takeaway.count)}
                  amountLabel={money(takeaway.amount)}
                  pct={(takeaway.amount / mixTotal) * 100}
                  dotClass="bg-zinc-500 dark:bg-zinc-400"
                  barClass="bg-zinc-500 dark:bg-zinc-400"
                />
                <SplitRow
                  label="Dine-in"
                  countLabel={String(dineIn.count)}
                  amountLabel={money(dineIn.amount)}
                  pct={(dineIn.amount / mixTotal) * 100}
                  dotClass="bg-zinc-300 dark:bg-zinc-600"
                  barClass="bg-zinc-300 dark:bg-zinc-600"
                />
              </div>

            </V3Card>

            <V3Card className="min-w-0 lg:flex-[1_1_320px]">
              <div className="px-[18px] pt-4">
                <CardHead title="Payments" sub="Where the money settles" />
              </div>
              <div className="flex flex-col gap-3 px-[18px] pb-[18px] pt-3.5">
                {payRows.map((r) => (
                  <SplitRow
                    key={r.label}
                    label={r.label}
                    countLabel={`${r.seg.count} ${r.seg.count === 1 ? "order" : "orders"}`}
                    amountLabel={money(r.seg.amount)}
                    pct={(r.seg.amount / payTotal) * 100}
                    dotClass={r.dot}
                    barClass={r.bar}
                  />
                ))}
                <div className="text-xs leading-normal text-zinc-400 dark:text-zinc-500">
                  {settlementNote}
                </div>
              </div>
            </V3Card>
          </div>

          {/* ------------------------------- top items + category analysis */}
          <div className="flex flex-col gap-3.5 lg:flex-row lg:flex-wrap">
            <V3Card className="min-w-0 lg:flex-[1_1_340px]">
              <div className="px-[18px] pt-4">
                <CardHead title="Top selling items" sub="Most popular items for this period" />
              </div>
              {topItems.length === 0 ? (
                <EmptyNote>No items sold in this period.</EmptyNote>
              ) : (
                <div className="px-[18px] pb-3.5 pt-2">
                  {topItems.slice(0, 8).map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 border-t border-zinc-100 py-[11px] dark:border-zinc-800"
                    >
                      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[11.5px] font-semibold leading-none text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          translate="no"
                          className="notranslate truncate text-[13px] font-medium leading-tight text-zinc-950 dark:text-zinc-50"
                        >
                          {item.name}
                        </div>
                        <div
                          translate="no"
                          className="notranslate mt-0.5 truncate text-[11.5px] leading-tight text-zinc-400 dark:text-zinc-500"
                        >
                          {formatDisplayName(item.category)}
                        </div>
                      </div>
                      <div className="flex w-[90px] shrink-0 flex-col items-end gap-[5px]">
                        <span className="text-[12.5px] font-semibold leading-none text-zinc-950 dark:text-zinc-50">
                          {item.quantity} sold
                        </span>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                            style={{
                              width: `${topItemMaxQty ? (item.quantity / topItemMaxQty) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </V3Card>

            <V3Card className="min-w-0 lg:flex-[1_1_340px]">
              <div className="px-[18px] pt-4">
                <CardHead
                  title="Category analysis"
                  sub={`Sales breakdown by category ${rangeSuffix}`}
                />
              </div>
              {categoryData.length === 0 ? (
                <EmptyNote>No category sales in this period.</EmptyNote>
              ) : (
                <div className="px-[18px] pb-4 pt-2">
                  {categoryData.slice(0, 8).map((c) => {
                    const pct = totalEarnings > 0 ? (c.revenue / totalEarnings) * 100 : 0;
                    return (
                      <div
                        key={c.name}
                        className="flex flex-col gap-[7px] border-t border-zinc-100 py-3 dark:border-zinc-800"
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span
                            translate="no"
                            className="notranslate text-[13px] font-medium leading-tight text-zinc-950 dark:text-zinc-50"
                          >
                            {formatDisplayName(c.name)}
                          </span>
                          <span className="text-[11.5px] leading-tight text-zinc-400 dark:text-zinc-500">
                            {c.quantity} {c.quantity === 1 ? "item" : "items"} sold
                          </span>
                          <span className="ml-auto whitespace-nowrap text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
                            {money(c.revenue)}
                          </span>
                          <span className="w-[52px] shrink-0 text-right text-[11.5px] font-medium leading-tight text-zinc-500 dark:text-zinc-400">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </V3Card>
          </div>
        </>
      )}

      {/* ------------------------------------------------- QR scans by hour */}
      <V3Card>
        <div className="flex flex-wrap items-start gap-3 px-[18px] pt-4">
          <CardHead
            title="QR scans by hour"
            sub={
              totalScans === 0
                ? `No menu scans ${rangeSuffix}`
                : `${totalScans} ${totalScans === 1 ? "scan" : "scans"} ${rangeSuffix}`
            }
          />
          {isAnyOrderingEnabled && (
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11.5px] font-medium leading-none text-zinc-500 dark:text-zinc-400">
                Scan → order rate
              </span>
              <span className="rounded-full border border-orange-200 bg-orange-50 px-[9px] py-[3px] text-xs font-semibold leading-none text-orange-600 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-400">
                {scanToOrderRate == null ? "—" : `${scanToOrderRate}%`}
              </span>
            </div>
          )}
        </div>
        {totalScans === 0 ? (
          <EmptyNote>
            No QR scans recorded in this period. Scans are counted when a customer opens
            your menu from a printed QR code.
          </EmptyNote>
        ) : (
          <HourHistogram
            hours={scanHours}
            values={scanHours.map((h) => scansByHour[h])}
            axisMax={scanAxisMax}
            height={96}
            barMaxWidth={30}
            labelFor={(h) => `${pad2(h)}:00`}
            axisLabels={[String(scanAxisMax), "0"]}
            barClass="bg-orange-600"
          />
        )}
      </V3Card>
    </div>
  );
}

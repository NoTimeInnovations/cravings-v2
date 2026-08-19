"use client";

import * as React from "react";
import dayjs from "dayjs";
import dayjsUtc from "dayjs/plugin/utc";
import dayjsTimezone from "dayjs/plugin/timezone";
import {
  ChevronDown,
  Download,
  Info,
  Loader2,
  Phone,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx-js-style";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { formatPrice } from "@/lib/constants";
import { safeTz } from "@/lib/partnerTime";
import { Partner, useAuthStore } from "@/store/authStore";
import {
  SEGMENTS,
  SEGMENT_BY_ID,
  ORDER_TYPE_LABELS,
  CHANNEL_LABELS,
  DISCOUNT_DEPENDENT_RATIO,
  assignSegment,
  bucketChannel,
  bucketOrderType,
  computeVipFloor,
  type ChannelId,
  type OrderTypeId,
  type SegmentId,
} from "@/lib/customerSegments";
import { V3Card } from "./ui/primitives";

dayjs.extend(dayjsUtc);
dayjs.extend(dayjsTimezone);

/**
 * admin-v3 Customers.
 *
 * Same data and same segmentation rules as admin-v2's screen — it reuses
 * `getCustomerOrdersQuery` + the WhatsApp-contacts query and every helper in
 * `src/lib/customerSegments.ts`, so a customer's segment can never differ
 * between the two dashboards. What changed is the surface: a summary strip, a
 * segment picker that carries live counts, collapsible behavioural filters, a
 * collapsible rules legend, and a wide table with per-row contact actions.
 */

interface CustomerData {
  phone: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  lastOrderAt: number;
  discountedOrders: number;
  /** Buckets this customer has EVER ordered through — a filter matches if any
   *  of their orders qualifies, so a mixed customer shows under both. */
  orderTypes: Set<OrderTypeId>;
  channels: Set<ChannelId>;
  segment: SegmentId;
}

const getCustomerOrdersQuery = `
  query GetCustomerOrders($partner_id: uuid!) {
    orders(
      where: { partner_id: { _eq: $partner_id }, status: { _neq: "cancelled" } }
      order_by: { created_at: desc }
    ) {
      phone
      orderedby
      total_price
      created_at
      user_id
      type
      delivery_address
      order_channel
      discounts
      user {
        full_name
        phone
      }
    }
  }
`;

/** People who wrote to the restaurant on WhatsApp but may never have checked
 *  out. Queried separately from orders and merged on the phone below, because a
 *  lead has no order row to hang off. */
const getWhatsappContactsQuery = `
  query GetWhatsappContacts($partner_id: uuid!) {
    whatsapp_messages(
      where: { partner_id: { _eq: $partner_id }, direction: { _eq: "in" } }
      order_by: { created_at: desc }
    ) {
      contact_phone
      contact_name
      created_at
    }
  }
`;

/** Last 9 digits — collapses a local-format order phone and a country-code
 *  prefixed WhatsApp number for the same person into one customer. */
const phoneKey = (p: string) => String(p || "").replace(/\D/g, "").slice(-9);

type DiscountFilter = "all" | "dependent" | "full_price";

const DISCOUNT_LABELS: Record<DiscountFilter, string> = {
  all: "Any",
  dependent: "Discount-dependent",
  full_price: "Never used a discount",
};

/** Segment chip colours. The v2 palette (`SegmentMeta.className`) is light-only,
 *  so v3 restates the same hues with a dark pair for each. */
const SEGMENT_CHIP: Record<SegmentId, string> = {
  lead: "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950 dark:border-teal-900 dark:text-teal-400",
  vip: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950 dark:border-purple-900 dark:text-purple-400",
  regulars:
    "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-400",
  repeat: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400",
  new: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950 dark:border-sky-900 dark:text-sky-400",
  at_risk:
    "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-400",
  one_and_done:
    "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-900 dark:text-orange-400",
  lapsed: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-400",
};

const PAGE_SIZE = 100;

const initialsOf = (name: string, phone: string) => {
  const n = (name || "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
  }
  const d = String(phone || "").replace(/\D/g, "");
  return d ? d.slice(-2) : "?";
};

const agoLabel = (ms: number) => {
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return "";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
};

/* ------------------------------------------------------------- field label */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
      {children}
    </div>
  );
}

/** A stat in the summary strip. */
function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1 flex items-baseline gap-1.5 text-[19px] font-semibold leading-none tracking-[-0.02em] text-zinc-950 tabular-nums dark:text-zinc-50">
        {value}
        {sub ? (
          <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">{sub}</span>
        ) : null}
      </div>
    </div>
  );
}

/** A toolbar/filter button — the 36px control face used across this screen. */
const TOOLBAR_BTN =
  "inline-flex h-9 shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-50";

/** A native select dressed as the design's chevron button — keeps keyboard and
 *  mobile behaviour without hand-rolling a listbox. */
function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="min-w-0 flex-[1_1_180px]">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-9 w-full cursor-pointer appearance-none rounded-md border border-zinc-200 bg-white pl-[11px] pr-8 text-[13px] font-normal leading-none text-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus-visible:ring-zinc-50"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ screen */

export function AdminV3Customers() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const currency = partner?.currency || "₹";
  // `timezone` is a real partners column but is not in the Partner interface
  // (admin-v2 reads it the same loose way), so it is narrowed here rather than
  // by widening a shared type other screens depend on.
  const tz = safeTz((partner as unknown as { timezone?: string | null })?.timezone);

  const [customers, setCustomers] = React.useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [segment, setSegment] = React.useState<SegmentId | "all">("all");
  const [orderType, setOrderType] = React.useState<OrderTypeId | "all">("all");
  const [channel, setChannel] = React.useState<ChannelId | "all">("all");
  const [discountFilter, setDiscountFilter] = React.useState<DiscountFilter>("all");
  const [segOpen, setSegOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [legendOpen, setLegendOpen] = React.useState(false);
  const [visible, setVisible] = React.useState(PAGE_SIZE);

  const segRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!segOpen) return;
    const onDown = (e: MouseEvent) => {
      if (segRef.current && !segRef.current.contains(e.target as Node)) setSegOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [segOpen]);

  React.useEffect(() => {
    if (!userData?.id) return;
    let cancelled = false;

    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const [result, waResult] = await Promise.all([
          fetchFromHasura(getCustomerOrdersQuery, { partner_id: userData.id }),
          fetchFromHasura(getWhatsappContactsQuery, { partner_id: userData.id }).catch(
            () => null,
          ),
        ]);

        const orders = result?.orders || [];
        const customerMap = new Map<string, CustomerData>();

        for (const order of orders) {
          const customerPhone = order.user?.phone || order.phone || "";
          const customerName = order.user?.full_name || "";
          const key = order.user_id || customerPhone || "unknown";
          const existing = customerMap.get(key);

          const orderedAt = new Date(order.created_at).getTime();
          const typeBucket = bucketOrderType(order.type, order.delivery_address);
          const channelBucket = bucketChannel(order.order_channel);
          const hadDiscount =
            Array.isArray(order.discounts) && order.discounts.length > 0;

          if (existing) {
            existing.totalOrders += 1;
            existing.totalSpent += order.total_price || 0;
            existing.orderTypes.add(typeBucket);
            existing.channels.add(channelBucket);
            if (hadDiscount) existing.discountedOrders += 1;
            if (orderedAt > existing.lastOrderAt) {
              existing.lastOrderAt = orderedAt;
              existing.lastOrderDate = order.created_at;
            }
            if (!existing.name && customerName) existing.name = customerName;
            if ((!existing.phone || existing.phone === "N/A") && customerPhone) {
              existing.phone = customerPhone;
            }
          } else {
            customerMap.set(key, {
              phone: customerPhone || "N/A",
              name: customerName,
              totalOrders: 1,
              totalSpent: order.total_price || 0,
              lastOrderDate: order.created_at,
              lastOrderAt: orderedAt,
              discountedOrders: hadDiscount ? 1 : 0,
              orderTypes: new Set([typeBucket]),
              channels: new Set([channelBucket]),
              segment: "new",
            });
          }
        }

        // Fold in WhatsApp enquiries. Anyone who already has an order is skipped —
        // the order record is richer, and the phone match is what identifies them
        // as the same person. What remains are people who asked and never bought.
        const byPhone = new Map<string, CustomerData>();
        for (const c of customerMap.values()) {
          const k = phoneKey(c.phone);
          if (k) byPhone.set(k, c);
        }
        for (const m of waResult?.whatsapp_messages || []) {
          const k = phoneKey(m.contact_phone);
          if (!k || byPhone.has(k)) continue;
          const at = new Date(m.created_at).getTime();
          const seen = customerMap.get(`wa:${k}`);
          if (seen) {
            if (at > seen.lastOrderAt) {
              seen.lastOrderAt = at;
              seen.lastOrderDate = m.created_at;
            }
            if (!seen.name && m.contact_name) seen.name = m.contact_name;
            continue;
          }
          customerMap.set(`wa:${k}`, {
            phone: m.contact_phone || "N/A",
            name: m.contact_name || "",
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: m.created_at,
            lastOrderAt: at,
            discountedOrders: 0,
            orderTypes: new Set(),
            channels: new Set(["whatsapp"]),
            segment: "lead",
          });
        }

        const list = Array.from(customerMap.values());
        // The VIP cut-off is a percentile of THIS restaurant's customers, so it
        // can only be computed once the whole cohort is known.
        const vipFloor = computeVipFloor(list);
        const now = Date.now();
        for (const c of list) c.segment = assignSegment(c, vipFloor, now);

        list.sort(
          (a, b) => b.totalOrders - a.totalOrders || b.lastOrderAt - a.lastOrderAt,
        );
        if (!cancelled) setCustomers(list);
      } catch (error) {
        console.error("Failed to fetch customer data:", error);
        if (!cancelled) toast.error("Failed to load customer data");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchCustomers();
    return () => {
      cancelled = true;
    };
  }, [userData?.id]);

  /** Everything except the segment filter. The counts in the segment menu are
   *  computed from this, so a count always matches what picking it shows. */
  const withoutSegment = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (q && !c.phone.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q))
        return false;
      if (orderType !== "all" && !c.orderTypes.has(orderType)) return false;
      if (channel !== "all" && !c.channels.has(channel)) return false;
      if (discountFilter !== "all") {
        const ratio = c.totalOrders ? c.discountedOrders / c.totalOrders : 0;
        if (discountFilter === "dependent" && ratio < DISCOUNT_DEPENDENT_RATIO) return false;
        if (discountFilter === "full_price" && c.discountedOrders > 0) return false;
      }
      return true;
    });
  }, [customers, searchQuery, orderType, channel, discountFilter]);

  const segmentCounts = React.useMemo(() => {
    const counts = new Map<SegmentId, number>();
    for (const c of withoutSegment) counts.set(c.segment, (counts.get(c.segment) || 0) + 1);
    return counts;
  }, [withoutSegment]);

  const filteredCustomers = React.useMemo(
    () =>
      segment === "all"
        ? withoutSegment
        : withoutSegment.filter((c) => c.segment === segment),
    [withoutSegment, segment],
  );

  React.useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [segment, orderType, channel, discountFilter, searchQuery]);

  /** Summary strip. Averages and the repeat rate count BUYERS only — folding
   *  enquiries (0 orders) into an average would drag it toward zero and read as
   *  a drop in ordering rather than as extra leads. */
  const summary = React.useMemo(() => {
    const buyers = customers.filter((c) => c.totalOrders > 0);
    const totalOrders = buyers.reduce((s, c) => s + c.totalOrders, 0);
    const totalSpent = buyers.reduce((s, c) => s + c.totalSpent, 0);
    const repeat = buyers.filter((c) => c.totalOrders >= 2).length;
    return {
      people: customers.length,
      buyers: buyers.length,
      ordersEach: buyers.length ? totalOrders / buyers.length : 0,
      totalSpent,
      repeat,
      repeatPct: buyers.length ? Math.round((repeat / buyers.length) * 100) : 0,
    };
  }, [customers]);

  const segLabel =
    segment === "all"
      ? `All customers · ${withoutSegment.length}`
      : `${SEGMENT_BY_ID.get(segment)?.label ?? "Segment"} · ${segmentCounts.get(segment) || 0}`;

  const activeFilters =
    (orderType !== "all" ? 1 : 0) +
    (channel !== "all" ? 1 : 0) +
    (discountFilter !== "all" ? 1 : 0);

  const handleDownload = async () => {
    if (filteredCustomers.length === 0) {
      toast.error("No customer data to download");
      return;
    }
    setIsDownloading(true);
    try {
      const headerStyle = {
        font: { bold: true, sz: 12, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "FF4472C4" } },
        alignment: { horizontal: "center" as const },
        border: {
          top: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          bottom: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          left: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          right: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
        },
      };
      const cellStyle = {
        border: {
          top: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          bottom: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          left: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
          right: { style: "thin" as const, color: { rgb: "FFD3D3D3" } },
        },
      };

      // Exports exactly what is on screen, filters included, so a segment can be
      // handed straight to whoever is running the campaign.
      const wsData: any[][] = [
        [
          { v: "Phone", s: headerStyle },
          { v: "Name", s: headerStyle },
          { v: "Segment", s: headerStyle },
          { v: "Total Orders", s: headerStyle },
          { v: `Total Spent (${currency})`, s: headerStyle },
          { v: "Last Activity", s: headerStyle },
        ],
        ...filteredCustomers.map((c) => [
          { v: c.phone, s: cellStyle },
          { v: c.name || "N/A", s: cellStyle },
          { v: SEGMENT_BY_ID.get(c.segment)?.label || "", s: cellStyle },
          { v: c.totalOrders, s: cellStyle },
          { v: c.totalSpent, s: { ...cellStyle, numFmt: `${currency}#,##0.00` } },
          { v: new Date(c.lastOrderDate).toLocaleDateString(), s: cellStyle },
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 18 },
        { wch: 25 },
        { wch: 16 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customers");

      const timestamp = new Date().toISOString().split("T")[0];
      const suffix =
        segment === "all"
          ? ""
          : `_${(SEGMENT_BY_ID.get(segment)?.label || "").replace(/\s+/g, "")}`;
      XLSX.writeFile(
        wb,
        `Customers${suffix}_${partner?.store_name || "Report"}_${timestamp}.xlsx`,
      );
      toast.success("Customer data downloaded!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download customer data");
    } finally {
      setIsDownloading(false);
    }
  };

  const rows = filteredCustomers.slice(0, visible);
  const GRID =
    "grid grid-cols-[minmax(200px,1.6fr)_124px_86px_116px_116px_124px_84px] items-center";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
        <V3Card className="flex items-center justify-center py-20">
          <Loader2 size={22} className="animate-spin text-zinc-400 dark:text-zinc-500" />
        </V3Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 pb-10 pt-5 lg:px-[clamp(14px,3vw,28px)]">
      {/* Summary strip */}
      <V3Card className="flex flex-wrap items-center gap-x-[22px] gap-y-3.5 px-4 py-3.5">
        <Stat label="Customers" value={String(summary.people)} />
        <div className="hidden w-px self-stretch bg-zinc-100 sm:block dark:bg-zinc-800" />
        <Stat label="Orders each" value={summary.ordersEach.toFixed(1)} />
        <Stat
          label="Lifetime spend"
          value={`${currency}${formatPrice(summary.totalSpent, userData?.id)}`}
        />
        <Stat
          label="Ordered again"
          value={`${summary.repeatPct}%`}
          sub={`${summary.repeat} of ${summary.buyers}`}
        />
      </V3Card>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-[9px] gap-y-2.5 px-3 lg:px-0">
        <div className="flex h-9 min-w-0 max-w-[320px] flex-[1_1_220px] items-center gap-[9px] rounded-md border border-zinc-200 bg-white px-[11px] dark:border-zinc-700 dark:bg-zinc-800">
          <Search size={15} strokeWidth={1.8} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name or phone"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal leading-none text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>

        {/* Segment picker */}
        <div className="relative shrink-0" ref={segRef}>
          <button type="button" className={TOOLBAR_BTN} onClick={() => setSegOpen((v) => !v)}>
            {segLabel}
            <ChevronDown size={15} strokeWidth={2} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
          </button>
          {segOpen && (
            <div className="absolute left-0 top-[42px] z-20 w-[236px] rounded-xl border border-zinc-200 bg-white p-1.5 shadow-[0_12px_30px_rgba(9,9,11,.14)] dark:border-zinc-700 dark:bg-zinc-800">
              {(
                [
                  { id: "all" as const, label: "All customers", count: withoutSegment.length },
                  ...SEGMENTS.map((s) => ({
                    id: s.id,
                    label: s.label,
                    count: segmentCounts.get(s.id) || 0,
                  })),
                ]
              ).map((o) => {
                const active = segment === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setSegment(o.id);
                      setSegOpen(false);
                    }}
                    className={[
                      "flex w-full items-center gap-[9px] rounded-md px-[9px] py-2 text-left transition-colors",
                      active
                        ? "bg-zinc-100 dark:bg-zinc-700"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-700",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "min-w-0 flex-1 truncate text-[12.5px] leading-none",
                        active
                          ? "font-semibold text-zinc-950 dark:text-zinc-50"
                          : "font-normal text-zinc-700 dark:text-zinc-300",
                      ].join(" ")}
                    >
                      {o.label}
                    </span>
                    <span className="text-xs font-normal leading-none text-zinc-400 tabular-nums dark:text-zinc-500">
                      {o.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          className={TOOLBAR_BTN}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal size={15} strokeWidth={1.8} className="shrink-0 text-zinc-500 dark:text-zinc-400" />
          {activeFilters ? `Filters · ${activeFilters}` : "Filters"}
        </button>

        <button
          type="button"
          className={`${TOOLBAR_BTN} ml-auto`}
          onClick={() => setLegendOpen((v) => !v)}
        >
          <Info size={15} strokeWidth={1.8} className="shrink-0 text-zinc-500 dark:text-zinc-400" />
          Segment rules
        </button>

        <button
          type="button"
          className={TOOLBAR_BTN}
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Download size={15} strokeWidth={1.8} className="shrink-0 text-zinc-500 dark:text-zinc-400" />
          )}
          Export
        </button>
      </div>

      {/* Behavioural filters — these stack on top of the segment above. */}
      {filtersOpen && (
        <V3Card className="flex flex-wrap gap-3 px-4 py-3.5">
          <FilterSelect
            label="Order type"
            value={orderType}
            onChange={setOrderType}
            options={[
              { value: "all" as const, label: "Any" },
              ...(Object.keys(ORDER_TYPE_LABELS) as OrderTypeId[]).map((k) => ({
                value: k,
                label: ORDER_TYPE_LABELS[k],
              })),
            ]}
          />
          <FilterSelect
            label="Channel"
            value={channel}
            onChange={setChannel}
            options={[
              { value: "all" as const, label: "Any" },
              ...(Object.keys(CHANNEL_LABELS) as ChannelId[]).map((k) => ({
                value: k,
                label: CHANNEL_LABELS[k],
              })),
            ]}
          />
          <FilterSelect
            label="Used a discount"
            value={discountFilter}
            onChange={setDiscountFilter}
            options={(Object.keys(DISCOUNT_LABELS) as DiscountFilter[]).map((k) => ({
              value: k,
              label: DISCOUNT_LABELS[k],
            }))}
          />
        </V3Card>
      )}

      {/* Segment rules legend */}
      {legendOpen && (
        <V3Card>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
            <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
              What the segments mean
            </span>
            <button
              type="button"
              onClick={() => setLegendOpen(false)}
              className="text-[12.5px] font-medium leading-none text-zinc-600 underline underline-offset-2 dark:text-zinc-300"
            >
              Hide
            </button>
          </div>
          <div className="grid gap-2.5 px-4 py-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {SEGMENTS.map((s) => (
              <div key={s.id} className="flex items-start gap-[9px]">
                <span
                  className={`shrink-0 rounded-md border px-2 py-[3px] text-[11.5px] font-semibold leading-none ${SEGMENT_CHIP[s.id]}`}
                >
                  {s.label}
                </span>
                <span className="min-w-0 flex-1 text-xs font-normal leading-normal text-zinc-400 dark:text-zinc-500">
                  {s.definition}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-100 px-4 py-3 text-[11.5px] leading-normal text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
            Cancelled orders are excluded. A customer is matched by their account, or by
            phone number when they ordered as a guest.
          </div>
        </V3Card>
      )}

      {/* Table */}
      <V3Card>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
          <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            {segment === "all"
              ? "All customers"
              : SEGMENT_BY_ID.get(segment)?.label ?? "Customers"}
          </span>
          <span className="whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Most orders first
          </span>
        </div>

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className={`${GRID} bg-zinc-50 dark:bg-zinc-800/60`}>
                {[
                  { k: "Customer", right: false },
                  { k: "Segment", right: false },
                  { k: "Orders", right: true },
                  { k: "Spent", right: true },
                  { k: "Avg order", right: true },
                  { k: "Last order", right: false },
                  { k: "", right: true },
                ].map((h, i) => (
                  <div
                    key={i}
                    className={[
                      "whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500",
                      h.right ? "text-right" : "",
                    ].join(" ")}
                  >
                    {h.k}
                  </div>
                ))}
              </div>

              {rows.map((c, i) => {
                const meta = SEGMENT_BY_ID.get(c.segment);
                const digits = c.phone.replace(/\D/g, "");
                const avg = c.totalOrders ? c.totalSpent / c.totalOrders : 0;
                return (
                  <div
                    key={`${c.phone}-${i}`}
                    className={`${GRID} border-t border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50`}
                  >
                    <div className="flex min-w-0 items-center gap-[11px] px-4 py-3">
                      <span
                        translate="no"
                        className="notranslate flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[11.5px] font-semibold leading-none text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {initialsOf(c.name, c.phone)}
                      </span>
                      <div className="min-w-0">
                        <div
                          translate="no"
                          className="notranslate truncate text-[13px] font-medium leading-none text-zinc-950 dark:text-zinc-50"
                        >
                          {c.name || "Guest"}
                        </div>
                        <div
                          translate="no"
                          className="notranslate mt-1 text-xs font-normal leading-none text-zinc-400 tabular-nums dark:text-zinc-500"
                        >
                          {c.phone}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3">
                      {meta && (
                        <span
                          className={`inline-block rounded-md border px-2 py-[3px] text-[11.5px] font-semibold leading-none ${SEGMENT_CHIP[c.segment]}`}
                        >
                          {meta.label}
                        </span>
                      )}
                    </div>

                    <div className="px-4 py-3 text-right text-[13px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                      {c.totalOrders}
                    </div>
                    <div className="px-4 py-3 text-right text-[13px] font-medium leading-none text-zinc-950 tabular-nums dark:text-zinc-50">
                      {currency}
                      {formatPrice(c.totalSpent, userData?.id)}
                    </div>
                    <div className="px-4 py-3 text-right text-[13px] font-normal leading-none text-zinc-500 tabular-nums dark:text-zinc-400">
                      {c.totalOrders ? `${currency}${formatPrice(avg, userData?.id)}` : "—"}
                    </div>

                    <div className="px-4 py-3">
                      <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
                        {dayjs(c.lastOrderDate).tz(tz).format("D MMM YYYY")}
                      </div>
                      <div className="mt-1 text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
                        {agoLabel(c.lastOrderAt)}
                        {c.totalOrders === 0 ? " · messaged" : ""}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 px-4 py-3">
                      {digits ? (
                        <>
                          <a
                            href={`https://wa.me/${digits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Message on WhatsApp"
                            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.7}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-[15px] w-[15px]"
                            >
                              <path d="M20.5 11.8a8.2 8.2 0 0 1-12 7.2l-4.5 1.2 1.2-4.2a8.2 8.2 0 1 1 15.3-4.2Z" />
                            </svg>
                          </a>
                          <a
                            href={`tel:${c.phone}`}
                            title="Call"
                            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            <Phone size={15} strokeWidth={1.7} />
                          </a>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-5 py-11">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-500">
              <Users size={19} strokeWidth={1.7} />
            </span>
            <div className="text-[13.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
              {customers.length === 0
                ? "No customers yet"
                : "Nobody in this segment yet"}
            </div>
            <div className="text-xs font-normal leading-none text-zinc-400 dark:text-zinc-500">
              {customers.length === 0
                ? "They appear here as soon as someone orders or messages you."
                : "Switch to All customers to see everyone."}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50 px-4 py-3 text-xs font-normal leading-none text-zinc-400 lg:rounded-b-xl dark:bg-zinc-800/60 dark:text-zinc-500">
          <span>
            Showing {rows.length} of {filteredCustomers.length}
            {filteredCustomers.length !== customers.length
              ? ` (${customers.length} total)`
              : ""}{" "}
            {customers.length === 1 ? "customer" : "customers"}
          </span>
          {visible < filteredCustomers.length && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="ml-auto text-xs font-medium leading-none text-zinc-700 underline underline-offset-2 dark:text-zinc-300"
            >
              Show more
            </button>
          )}
        </div>
      </V3Card>
    </div>
  );
}

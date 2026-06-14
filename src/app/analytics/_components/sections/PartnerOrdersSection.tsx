"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronsUpDown,
  Clock,
  CreditCard,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  ReceiptText,
  Search,
  Smartphone,
  Table2,
} from "lucide-react";
import { format } from "date-fns";
import { compact, rupees } from "../format";
import { SectionHeader } from "./OverviewSection";
import PartnerOrderDetails, {
  getOrderStatusColor,
  orderTypeLabel,
} from "./PartnerOrderDetails";
import type {
  AnalyticsOrder,
  LivePartnerOption,
  PartnerOrdersStats,
} from "../types";

const REFRESH_MS = 30_000;

type Scope = "today" | "all";

/** Short channel tag for the invoice column: app / web / WA. */
function channelSuffix(orderChannel: string | null): string | null {
  if (orderChannel === "app") return "app";
  if (orderChannel === "web") return "web";
  if (orderChannel === "whatsapp" || orderChannel === "wa") return "WA";
  return null;
}

/**
 * Invoice number shown per order: "{orderNumber}-{channel}" (e.g. "2-web",
 * "2-app", "2-WA"). Falls back to a short id only when there's no display_id.
 */
function invoiceLabel(order: AnalyticsOrder): string {
  if (Number(order.displayId) > 0) {
    const sfx = channelSuffix(order.orderChannel);
    return sfx ? `${order.displayId}-${sfx}` : `${order.displayId}`;
  }
  return order.id.slice(0, 8);
}

export default function PartnerOrdersSection() {
  const [partnerOptions, setPartnerOptions] = useState<LivePartnerOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("today");
  const [page, setPage] = useState(1);
  // Monthly card selection — defaults to the current month.
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  // Channel-breakdown date range — empty = beginning / today.
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [data, setData] = useState<PartnerOrdersStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<AnalyticsOrder | null>(
    null
  );

  // Partner picker options — full list, loaded once.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/partner-orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d?.partners)) {
          setPartnerOptions(d.partners);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!partnerId) {
      setData(null);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const params = new URLSearchParams({
          partnerId: partnerId!,
          scope,
          page: String(page),
          month: String(month),
          year: String(year),
        });
        if (rangeFrom) params.set("from", rangeFrom);
        if (rangeTo) params.set("to", rangeTo);
        const r = await fetch(`/api/stats/partner-orders?${params}`, {
          cache: "no-store",
        });
        const d = await r.json();
        if (!cancelled && !d.error) {
          setData(d);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [partnerId, scope, page, month, year, rangeFrom, rangeTo, tick]);

  const selectedPartner = useMemo(
    () => partnerOptions.find((p) => p.id === partnerId) ?? null,
    [partnerOptions, partnerId]
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  if (selectedOrder && data) {
    return (
      <PartnerOrderDetails
        order={selectedOrder}
        partner={data.partner}
        onBack={() => setSelectedOrder(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Partner orders"
        subtitle="Pick a partner to see today's orders and their full order history — refreshed every 30s"
        right={
          <div className="flex flex-wrap items-center gap-3">
            <PartnerCombobox
              value={partnerId}
              onChange={(v) => {
                setLoading(true);
                setPage(1);
                setSelectedOrder(null);
                setPartnerId(v);
              }}
              options={partnerOptions}
              selected={selectedPartner}
              loading={optionsLoading}
            />
            {partnerId && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Live
              </div>
            )}
          </div>
        }
      />

      {!partnerId ? (
        <Card className="p-12 bg-white text-center">
          <Building2 className="size-8 mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">Select a partner</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a restaurant above to see their orders for today and their
            complete order history.
          </p>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard
              label="Today"
              icon={<CalendarDays className="size-4" />}
              accent="text-emerald-700 bg-emerald-50"
              count={data?.summary.today.count ?? 0}
              gmv={data?.summary.today.gmv ?? 0}
              loading={loading || !data}
            />
            <SummaryCard
              label="All time"
              icon={<ReceiptText className="size-4" />}
              accent="text-blue-700 bg-blue-50"
              count={data?.summary.all.count ?? 0}
              gmv={data?.summary.all.gmv ?? 0}
              loading={loading || !data}
            />
          </div>

          {/* Monthly + this-week (cancelled orders excluded) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 bg-white">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Selected month
                </div>
                <input
                  type="month"
                  value={`${year}-${String(month).padStart(2, "0")}`}
                  max={`${new Date().getFullYear()}-${String(
                    new Date().getMonth() + 1
                  ).padStart(2, "0")}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split("-").map(Number);
                    if (y && m) {
                      setYear(y);
                      setMonth(m);
                    }
                  }}
                  className="h-7 rounded-md border border-input bg-white px-2 text-xs shadow-sm"
                />
              </div>
              {loading || !data ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <>
                  <div className="mt-2 text-2xl font-semibold tabular-nums">
                    {compact(data.summary.month.count)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {rupees(data.summary.month.gmv)} GMV ·{" "}
                    {format(new Date(year, month - 1, 1), "MMM yyyy")}
                  </div>
                </>
              )}
            </Card>

            <SummaryCard
              label="This week"
              icon={<CalendarDays className="size-4" />}
              accent="text-violet-700 bg-violet-50"
              count={data?.summary.week.count ?? 0}
              gmv={data?.summary.week.gmv ?? 0}
              loading={loading || !data}
            />
          </div>

          {/* Channel breakdown — app / web / WhatsApp over a custom range */}
          <ChannelBreakdown
            channels={data?.channels ?? null}
            loading={loading || !data}
            from={rangeFrom}
            to={rangeTo}
            onFrom={setRangeFrom}
            onTo={setRangeTo}
          />

          {/* Orders list */}
          <Card className="p-5 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-base font-semibold">
                  {scope === "today" ? "Today's orders" : "All orders"}
                  {data && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      · {data.partner.name}
                      {data.partner.district ? ` (${data.partner.district})` : ""}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data
                    ? `${compact(data.totalCount)} order${data.totalCount === 1 ? "" : "s"}, newest first`
                    : "Loading…"}
                </div>
              </div>
              <ScopeSwitcher
                value={scope}
                onChange={(v) => {
                  setLoading(true);
                  setPage(1);
                  setScope(v);
                }}
              />
            </div>

            {loading || !data ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : data.orders.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {scope === "today"
                  ? "No orders yet today."
                  : "No orders found for this partner."}
              </div>
            ) : (
              <>
                {/* Desktop table — same columns as the admin-v2 Orders list */}
                <div className="hidden md:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Table / Location</TableHead>
                        <TableHead>Payment method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Order type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.orders.map((order) => (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <TableCell className="font-medium">
                            {invoiceLabel(order)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {order.tableName ||
                              order.tableNumber ||
                              order.deliveryAddress ||
                              "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-gray-50">
                              {order.paymentMethod || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(order.createdAt), "yyyy-MM-dd")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(order.createdAt), "hh:mm a")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="uppercase">
                              {orderTypeLabel(order)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getOrderStatusColor(order.status)}>
                              {order.status ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {rupees(order.totalPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {data.orders.map((order) => (
                    <Card
                      key={order.id}
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="bg-muted/40 p-3 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">
                            {Number(order.displayId) > 0
                              ? `Invoice No: ${invoiceLabel(order)}`
                              : `Order #${order.id.slice(0, 8)}`}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            ID: #{order.id.slice(0, 8)}
                          </p>
                        </div>
                        <Badge className={getOrderStatusColor(order.status)}>
                          {order.status ?? "—"}
                        </Badge>
                      </div>
                      <div className="p-3 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <div className="flex items-start gap-2 min-w-0">
                            {order.tableName || order.tableNumber ? (
                              <Table2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                            ) : (
                              <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                            )}
                            <span className="font-medium break-words">
                              {order.tableName ||
                                order.tableNumber ||
                                order.deliveryAddress ||
                                "N/A"}
                            </span>
                          </div>
                          <Badge variant="outline" className="capitalize text-xs shrink-0">
                            {orderTypeLabel(order)}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {format(new Date(order.createdAt), "dd MMM, hh:mm a")}
                            </span>
                          </div>
                          {order.paymentMethod && (
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="capitalize">
                                {order.paymentMethod}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end font-semibold tabular-nums">
                          {rupees(order.totalPrice)}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <span className="text-xs text-muted-foreground">
                      Page {data.page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLoading(true);
                        setPage((p) => Math.max(1, p - 1));
                      }}
                      disabled={data.page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLoading(true);
                        setPage((p) => p + 1);
                      }}
                      disabled={data.page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  icon,
  accent,
  count,
  gmv,
  loading,
}: {
  label: string;
  icon: React.ReactNode;
  accent: string;
  count: number;
  gmv: number;
  loading: boolean;
}) {
  return (
    <Card className="p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        <div className={cn("size-7 rounded-md flex items-center justify-center", accent)}>
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16 mt-2" />
      ) : (
        <>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {compact(count)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {rupees(gmv)} GMV
          </div>
        </>
      )}
    </Card>
  );
}

function ChannelBreakdown({
  channels,
  loading,
  from,
  to,
  onFrom,
  onTo,
}: {
  channels: PartnerOrdersStats["channels"] | null;
  loading: boolean;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const rows: {
    key: string;
    label: string;
    icon: React.ReactNode;
    accent: string;
    stat: { count: number; gmv: number };
  }[] = [
    {
      key: "app",
      label: "App",
      icon: <Smartphone className="size-4" />,
      accent: "text-green-700 bg-green-50",
      stat: channels?.app ?? { count: 0, gmv: 0 },
    },
    {
      key: "web",
      label: "Website",
      icon: <Globe className="size-4" />,
      accent: "text-gray-700 bg-gray-100",
      stat: channels?.web ?? { count: 0, gmv: 0 },
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="size-4" />,
      accent: "text-emerald-700 bg-emerald-50",
      stat: channels?.whatsapp ?? { count: 0, gmv: 0 },
    },
  ];

  return (
    <Card className="p-5 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-base font-semibold">Orders by channel</div>
          <div className="text-xs text-muted-foreground">
            App vs Website vs WhatsApp · cancelled orders excluded ·{" "}
            {from ? from : "from the beginning"} → {to ? to : "today"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarRange className="size-3.5" />
            From
          </div>
          <input
            type="date"
            value={from}
            max={to || today}
            onChange={(e) => onFrom(e.target.value)}
            className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm"
          />
          <span className="text-xs text-muted-foreground">To</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            max={today}
            onChange={(e) => onTo(e.target.value)}
            className="h-8 rounded-md border border-input bg-white px-2 text-xs shadow-sm"
          />
          {(from || to) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                onFrom("");
                onTo("");
              }}
            >
              All time
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {rows.map((row) => (
          <div
            key={row.key}
            className="rounded-md border p-4 flex items-start justify-between"
          >
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {row.label}
              </div>
              {loading ? (
                <Skeleton className="h-7 w-14 mt-2" />
              ) : (
                <>
                  <div className="mt-2 text-2xl font-semibold tabular-nums">
                    {compact(row.stat.count)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {rupees(row.stat.gmv)} GMV
                  </div>
                </>
              )}
            </div>
            <div
              className={cn(
                "size-7 rounded-md flex items-center justify-center shrink-0",
                row.accent
              )}
            >
              {row.icon}
            </div>
          </div>
        ))}
      </div>

      {!loading && channels && (
        <div className="mt-3 text-xs text-muted-foreground">
          Total in range:{" "}
          <span className="font-medium text-foreground">
            {compact(channels.total.count)} orders
          </span>{" "}
          · {rupees(channels.total.gmv)} GMV
        </div>
      )}
    </Card>
  );
}

function ScopeSwitcher({
  value,
  onChange,
}: {
  value: Scope;
  onChange: (v: Scope) => void;
}) {
  const options: { id: Scope; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "all", label: "All orders" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Order scope"
      className="inline-flex h-8 items-center rounded-md border border-input bg-white p-0.5 text-xs shadow-sm"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "h-7 rounded px-2.5 font-medium transition-colors",
              active
                ? "bg-neutral-900 text-white"
                : "text-muted-foreground hover:bg-neutral-100"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function PartnerCombobox({
  value,
  onChange,
  options,
  selected,
  loading,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: LivePartnerOption[];
  selected: LivePartnerOption | null;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((p) => {
      const haystack = `${p.name} ${p.district ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, options]);

  const triggerLabel = loading
    ? "Loading partners…"
    : selected
      ? `${selected.name}${selected.district ? ` · ${selected.district}` : ""}`
      : "Select a partner";

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setQuery("");
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-[240px] items-center justify-between rounded-md border border-input bg-white px-3 text-xs shadow-sm hover:bg-neutral-50"
        >
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {triggerLabel}
          </span>
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[280px] p-0 bg-white"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 border-b px-2 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search partners..."
            className="h-7 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <ul className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-muted-foreground">
              {loading ? "Loading…" : `No partners match "${query}"`}
            </li>
          ) : (
            filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-neutral-100",
                    value === p.id && "bg-neutral-100"
                  )}
                >
                  <span className="truncate">
                    {p.name}
                    {p.district && (
                      <span className="text-muted-foreground"> · {p.district}</span>
                    )}
                  </span>
                  {value === p.id && <Check className="size-3.5 shrink-0" />}
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

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
  Check,
  ChevronsUpDown,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  ReceiptText,
  Search,
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

export default function PartnerOrdersSection() {
  const [partnerOptions, setPartnerOptions] = useState<LivePartnerOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("today");
  const [page, setPage] = useState(1);
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
        });
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
  }, [partnerId, scope, page, tick]);

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
                            {Number(order.displayId) > 0
                              ? `${order.displayId}-${format(new Date(order.createdAt), "ddMMyy")}`
                              : order.id.slice(0, 8)}
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
                              ? `Invoice No: ${order.displayId}-${format(new Date(order.createdAt), "ddMMyy")}`
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

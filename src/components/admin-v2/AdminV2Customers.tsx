"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore, Partner } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Search, Loader2, Users, Info } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx-js-style";
import { formatPrice } from "@/lib/constants";
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

interface CustomerData {
  phone: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  lastOrderAt: number;
  discountedOrders: number;
  /** Which buckets this customer has EVER ordered through — a filter matches if
   *  any of their orders qualifies, so a mixed customer shows under both. */
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

type DiscountFilter = "all" | "dependent" | "full_price";

export function AdminV2Customers() {
  const { userData } = useAuthStore();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [segment, setSegment] = useState<SegmentId | "all">("all");
  const [orderType, setOrderType] = useState<OrderTypeId | "all">("all");
  const [channel, setChannel] = useState<ChannelId | "all">("all");
  const [discountFilter, setDiscountFilter] = useState<DiscountFilter>("all");

  const partner = userData as Partner;
  const currency = partner?.currency || "₹";

  useEffect(() => {
    if (!userData?.id) return;

    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const result = await fetchFromHasura(getCustomerOrdersQuery, {
          partner_id: userData.id,
        });

        const orders = result?.orders || [];
        const customerMap = new Map<string, CustomerData>();

        for (const order of orders) {
          // Use user_id as primary key for unique customers, fall back to phone
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
            // Orders arrive newest-first, but don't depend on it for recency.
            if (orderedAt > existing.lastOrderAt) {
              existing.lastOrderAt = orderedAt;
              existing.lastOrderDate = order.created_at;
            }
            // Update name if we didn't have one before
            if (!existing.name && customerName) {
              existing.name = customerName;
            }
            // Update phone if we didn't have one before
            if (
              (!existing.phone || existing.phone === "N/A") &&
              customerPhone
            ) {
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

        const list = Array.from(customerMap.values());
        // The VIP cut-off is a percentile of THIS restaurant's customers, so it
        // can only be computed once the whole cohort is known.
        const vipFloor = computeVipFloor(list);
        const now = Date.now();
        for (const c of list) c.segment = assignSegment(c, vipFloor, now);

        list.sort((a, b) => b.totalOrders - a.totalOrders);
        setCustomers(list);
      } catch (error) {
        console.error("Failed to fetch customer data:", error);
        toast.error("Failed to load customer data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [userData?.id]);

  /** Everything except the segment filter. The chip counts are computed from
   *  this, so the number on a chip always matches what clicking it shows. */
  const withoutSegment = useMemo(() => {
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

  const segmentCounts = useMemo(() => {
    const counts = new Map<SegmentId, number>();
    for (const c of withoutSegment) counts.set(c.segment, (counts.get(c.segment) || 0) + 1);
    return counts;
  }, [withoutSegment]);

  const filteredCustomers = useMemo(
    () =>
      segment === "all"
        ? withoutSegment
        : withoutSegment.filter((c) => c.segment === segment),
    [withoutSegment, segment],
  );

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
          { v: "Last Order", s: headerStyle },
        ],
        ...filteredCustomers.map((c) => [
          { v: c.phone, s: cellStyle },
          { v: c.name || "N/A", s: cellStyle },
          { v: SEGMENT_BY_ID.get(c.segment)?.label || "", s: cellStyle },
          { v: c.totalOrders, s: cellStyle },
          {
            v: c.totalSpent,
            s: { ...cellStyle, numFmt: `${currency}#,##0.00` },
          },
          {
            v: new Date(c.lastOrderDate).toLocaleDateString(),
            s: cellStyle,
          },
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
      const segLabel =
        segment === "all"
          ? ""
          : `_${(SEGMENT_BY_ID.get(segment)?.label || "").replace(/\s+/g, "")}`;
      XLSX.writeFile(
        wb,
        `Customers${segLabel}_${partner?.store_name || "Report"}_${timestamp}.xlsx`,
      );
      toast.success("Customer data downloaded!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download customer data");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers.length} unique customer
            {customers.length !== 1 ? "s" : ""}
            {filteredCustomers.length !== customers.length &&
              ` · ${filteredCustomers.length} shown`}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by phone or name..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isDownloading ? "" : "Download"}
          </Button>
        </div>
      </div>

      {/* Segments — one chip each, carrying its live count. Every customer falls
          in exactly one, so the chips add up to the "All" total. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={segment === "all" ? "default" : "outline"}
          onClick={() => setSegment("all")}
          className={segment === "all" ? "bg-orange-600 hover:bg-orange-700" : ""}
        >
          All
          <span className="ml-1.5 opacity-70">{withoutSegment.length}</span>
        </Button>
        {SEGMENTS.map((s) => {
          const count = segmentCounts.get(s.id) || 0;
          const active = segment === s.id;
          return (
            <Button
              key={s.id}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setSegment(active ? "all" : s.id)}
              className={active ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              {s.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </Button>
          );
        })}

        {/* The definitions, straight from the same rules the table applies. */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
              <Info className="h-4 w-4" />
              What do these mean?
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[min(92vw,26rem)] max-h-[70vh] overflow-y-auto"
          >
            <p className="text-sm font-semibold">How customers are segmented</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on how recently someone ordered, how often, and how much they
              spend. Every customer falls into exactly one segment.
            </p>
            <div className="mt-3 space-y-3">
              {SEGMENTS.map((s) => (
                <div key={s.id}>
                  <Badge className={s.className}>{s.label}</Badge>
                  <p className="mt-1 text-xs text-foreground">{s.definition}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.action}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">
              Cancelled orders are excluded. A customer is matched by their
              account, or by phone number when they ordered as a guest.
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {/* Behavioural filters — these stack on top of the segment above. */}
      <div className="flex flex-wrap gap-2">
        <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderTypeId | "all")}>
          <SelectTrigger className="w-[165px]">
            <SelectValue placeholder="Order type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All order types</SelectItem>
            {(Object.keys(ORDER_TYPE_LABELS) as OrderTypeId[]).map((k) => (
              <SelectItem key={k} value={k}>
                {ORDER_TYPE_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={channel} onValueChange={(v) => setChannel(v as ChannelId | "all")}>
          <SelectTrigger className="w-[165px]">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {(Object.keys(CHANNEL_LABELS) as ChannelId[]).map((k) => (
              <SelectItem key={k} value={k}>
                {CHANNEL_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={discountFilter}
          onValueChange={(v) => setDiscountFilter(v as DiscountFilter)}
        >
          <SelectTrigger className="w-[195px]">
            <SelectValue placeholder="Discounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Discounts: any</SelectItem>
            <SelectItem value="dependent">Discount-dependent</SelectItem>
            <SelectItem value="full_price">Never used a discount</SelectItem>
          </SelectContent>
        </Select>

        {(segment !== "all" ||
          orderType !== "all" ||
          channel !== "all" ||
          discountFilter !== "all") && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              setSegment("all");
              setOrderType("all");
              setChannel("all");
              setDiscountFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {customers.length === 0
              ? "No customer data yet."
              : "No customers match these filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Phone</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="hidden md:table-cell">
                  Last Order
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer, i) => {
                const meta = SEGMENT_BY_ID.get(customer.segment);
                return (
                  <TableRow key={`${customer.phone}-${i}`}>
                    <TableCell className="font-mono text-sm">
                      {customer.phone}
                    </TableCell>
                    <TableCell>{customer.name || "N/A"}</TableCell>
                    <TableCell>
                      {meta && (
                        <Badge className={`${meta.className} whitespace-nowrap`}>
                          {meta.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {customer.totalOrders}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {currency}
                      {formatPrice(customer.totalSpent, userData?.id)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(customer.lastOrderDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

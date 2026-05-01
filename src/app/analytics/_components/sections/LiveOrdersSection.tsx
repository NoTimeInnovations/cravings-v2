"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bike,
  ShoppingBag,
  UtensilsCrossed,
  Building2,
  Clock,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { compact, rupees } from "../format";
import { SectionHeader } from "./OverviewSection";
import type { LiveStats, LiveOrder, LivePartnerOption } from "../types";

const ALL_PARTNERS = "__all__";

const REFRESH_MS = 10_000;

const TYPE_LABELS: Record<string, { label: string; icon: any; tone: string }> = {
  delivery: { label: "Delivery", icon: Bike, tone: "text-blue-700 bg-blue-50" },
  deliveryPOS: {
    label: "POS Delivery",
    icon: Bike,
    tone: "text-violet-700 bg-violet-50",
  },
  takeawayPOS: {
    label: "POS Takeaway",
    icon: ShoppingBag,
    tone: "text-amber-700 bg-amber-50",
  },
  table: {
    label: "Dine-in",
    icon: UtensilsCrossed,
    tone: "text-emerald-700 bg-emerald-50",
  },
  table_order: {
    label: "Dine-in",
    icon: UtensilsCrossed,
    tone: "text-emerald-700 bg-emerald-50",
  },
  dineinPOS: {
    label: "POS Dine-in",
    icon: UtensilsCrossed,
    tone: "text-violet-700 bg-violet-50",
  },
};

const STATUS_TONE: Record<string, string> = {
  pending: "text-amber-700 bg-amber-50",
  accepted: "text-blue-700 bg-blue-50",
  ready: "text-violet-700 bg-violet-50",
  dispatched: "text-violet-700 bg-violet-50",
  completed: "text-emerald-700 bg-emerald-50",
  cancelled: "text-rose-700 bg-rose-50",
};

export default function LiveOrdersSection() {
  const [data, setData] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [partnerId, setPartnerId] = useState<string>(ALL_PARTNERS);
  const [partnerOptions, setPartnerOptions] = useState<LivePartnerOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const url =
          partnerId === ALL_PARTNERS
            ? `/api/stats/live`
            : `/api/stats/live?partnerId=${encodeURIComponent(partnerId)}`;
        const r = await fetch(url, { cache: "no-store" });
        const d = await r.json();
        if (!cancelled) {
          setData(d);
          // Keep dropdown options stable across partner-scoped reloads —
          // the response always returns the full active-partner list.
          if (Array.isArray(d?.partners) && d.partners.length > 0) {
            setPartnerOptions(d.partners);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tick, partnerId]);

  const selectedPartner = useMemo(
    () => partnerOptions.find((p) => p.id === partnerId) ?? null,
    [partnerOptions, partnerId]
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Live orders"
        subtitle="Delivery, takeaway and dine-in across active restaurants — refreshed every 10s"
        right={
          <div className="flex items-center gap-3">
            <Select
              value={partnerId}
              onValueChange={(v) => {
                setLoading(true);
                setPartnerId(v);
              }}
            >
              <SelectTrigger className="h-8 w-[220px] text-xs">
                <SelectValue placeholder="All partners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PARTNERS}>All partners</SelectItem>
                {partnerOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.district ? ` · ${p.district}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Live
            </div>
          </div>
        }
      />

      {/* Last hour summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Delivery (last 1h)"
          icon={<Bike className="size-4" />}
          accent="text-blue-700 bg-blue-50"
          count={data?.lastHour.delivery.count ?? 0}
          gmv={data?.lastHour.delivery.gmv ?? 0}
          loading={loading}
        />
        <SummaryCard
          label="Takeaway (last 1h)"
          icon={<ShoppingBag className="size-4" />}
          accent="text-amber-700 bg-amber-50"
          count={data?.lastHour.takeaway.count ?? 0}
          gmv={data?.lastHour.takeaway.gmv ?? 0}
          loading={loading}
        />
        <SummaryCard
          label="Dine-in (last 1h)"
          icon={<UtensilsCrossed className="size-4" />}
          accent="text-emerald-700 bg-emerald-50"
          count={data?.lastHour.dinein.count ?? 0}
          gmv={data?.lastHour.dinein.gmv ?? 0}
          loading={loading}
        />
        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Active right now
            </div>
            <Building2 className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {loading ? <Skeleton className="h-8 w-16" /> : compact(data?.activeRestaurantsToday ?? 0)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            restaurants with orders today
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
            <Clock className="size-3" />
            {compact(data?.pendingNow ?? 0)} pending
          </div>
        </Card>
      </div>

      {/* Recent orders feed */}
      <Card className="p-5 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-semibold">
              Recent orders
              {selectedPartner && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  · {selectedPartner.name}
                  {selectedPartner.district ? ` (${selectedPartner.district})` : ""}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Last hour, newest first ({data?.recentOrders.length ?? 0} shown)
            </div>
          </div>
          <Activity className="size-4 text-muted-foreground" />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.recentOrders.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No orders in the last hour. New orders will appear here as they come in.
          </div>
        ) : (
          <ol className="divide-y">
            {data.recentOrders.map((o) => (
              <OrderRow key={o.id} o={o} />
            ))}
          </ol>
        )}
      </Card>
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

function OrderRow({ o }: { o: LiveOrder }) {
  const meta = TYPE_LABELS[o.type ?? ""] ?? {
    label: o.type ?? "—",
    icon: ShoppingBag,
    tone: "text-muted-foreground bg-muted",
  };
  const Icon = meta.icon;
  const statusTone = STATUS_TONE[o.status ?? ""] ?? "text-muted-foreground bg-muted";

  let timeAgo = "just now";
  try {
    timeAgo = formatDistanceToNow(new Date(o.createdAt), { addSuffix: true });
  } catch {}

  const tableInfo =
    o.tableName ?? (o.tableNumber != null ? `Table ${o.tableNumber}` : null);

  return (
    <li className="py-3 flex items-center gap-3">
      <div className={cn("size-9 rounded-lg flex items-center justify-center", meta.tone)}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{o.partnerName}</span>
          {o.partnerDistrict && (
            <span className="text-xs text-muted-foreground">
              · {o.partnerDistrict}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{meta.label}</span>
          {tableInfo && (
            <span className="text-xs text-muted-foreground">· {tableInfo}</span>
          )}
          {o.displayId && (
            <span className="text-xs text-muted-foreground font-mono">
              · #{o.displayId}
            </span>
          )}
          <span className="text-xs text-muted-foreground">· {timeAgo}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-semibold tabular-nums text-sm">
          {rupees(o.totalPrice)}
        </div>
        {o.status && (
          <span
            className={cn(
              "inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5",
              statusTone
            )}
          >
            {o.status}
          </span>
        )}
      </div>
    </li>
  );
}

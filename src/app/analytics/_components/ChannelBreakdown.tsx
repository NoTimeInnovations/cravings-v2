"use client";

import { Card } from "@/components/ui/card";
import {
  Smartphone,
  Building2,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Bike,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Channels, ChannelTotals } from "./types";
import { compact, rupees, deltaLabel } from "./format";

type Props = {
  channels: Channels;
  totals: ChannelTotals;
};

export default function ChannelBreakdown({ channels, totals }: Props) {
  const grandOrders = totals.direct.orders + totals.pos.orders;
  const grandGmv = totals.direct.gmv + totals.pos.gmv;
  const directShare = grandOrders > 0 ? (totals.direct.orders / grandOrders) * 100 : 0;
  const posShare = grandOrders > 0 ? (totals.pos.orders / grandOrders) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">Order channels</h2>
          <p className="text-sm text-muted-foreground">
            Direct customer orders vs. POS / staff-entered orders
          </p>
        </div>
      </div>

      {/* Two hero cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HeroCard
          title="Direct customer orders"
          subtitle="Customer-placed via QR menu (delivery + dine-in)"
          orders={totals.direct.orders}
          gmv={totals.direct.gmv}
          ordersDelta={totals.direct.ordersDelta}
          gmvDelta={totals.direct.gmvDelta}
          share={directShare}
          accent="emerald"
          highlight
          icon={<Smartphone className="size-5" />}
        />
        <HeroCard
          title="POS / staff orders"
          subtitle="Entered by captain / admin (dine-in + takeaway + delivery)"
          orders={totals.pos.orders}
          gmv={totals.pos.gmv}
          ordersDelta={totals.pos.ordersDelta}
          gmvDelta={totals.pos.gmvDelta}
          share={posShare}
          accent="violet"
          icon={<Building2 className="size-5" />}
        />
      </div>

      {/* 5-channel breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <ChannelCard
          label="Direct delivery"
          group="direct"
          icon={<Bike className="size-4" />}
          channel={channels.directDelivery}
        />
        <ChannelCard
          label="Direct dine-in"
          group="direct"
          icon={<UtensilsCrossed className="size-4" />}
          channel={channels.directDinein}
        />
        <ChannelCard
          label="POS dine-in"
          group="pos"
          icon={<UtensilsCrossed className="size-4" />}
          channel={channels.posDinein}
        />
        <ChannelCard
          label="POS takeaway"
          group="pos"
          icon={<ShoppingBag className="size-4" />}
          channel={channels.posTakeaway}
        />
        <ChannelCard
          label="POS delivery"
          group="pos"
          icon={<Truck className="size-4" />}
          channel={channels.posDelivery}
        />
      </div>

      {/* Share bar */}
      <Card className="p-4 bg-white">
        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
          <span>
            <span className="inline-block size-2 rounded-full bg-emerald-500 mr-1.5 align-middle" />
            Direct {directShare.toFixed(1)}%
          </span>
          <span>
            POS {posShare.toFixed(1)}%
            <span className="inline-block size-2 rounded-full bg-violet-500 ml-1.5 align-middle" />
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${directShare}%` }}
          />
          <div
            className="h-full bg-violet-500"
            style={{ width: `${posShare}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {compact(grandOrders)} non-cancelled orders &middot; {rupees(grandGmv)} total
        </div>
      </Card>
    </div>
  );
}

function HeroCard({
  title,
  subtitle,
  orders,
  gmv,
  ordersDelta,
  gmvDelta,
  share,
  accent,
  highlight,
  icon,
}: {
  title: string;
  subtitle: string;
  orders: number;
  gmv: number;
  ordersDelta: number | null;
  gmvDelta: number | null;
  share: number;
  accent: "emerald" | "violet";
  highlight?: boolean;
  icon: React.ReactNode;
}) {
  const od = deltaLabel(ordersDelta);
  const gd = deltaLabel(gmvDelta);
  const accentBg = accent === "emerald" ? "bg-emerald-50" : "bg-violet-50";
  const accentText = accent === "emerald" ? "text-emerald-700" : "text-violet-700";
  const accentBar = accent === "emerald" ? "bg-emerald-500" : "bg-violet-500";

  return (
    <Card
      className={cn(
        "relative p-5 bg-white overflow-hidden",
        highlight && "ring-2 ring-emerald-500/20"
      )}
    >
      {highlight && (
        <div className="absolute top-3 right-3 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
          Strategic
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("size-9 rounded-lg flex items-center justify-center", accentBg, accentText)}>
          {icon}
        </div>
        <div>
          <div className="text-base font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Metric label="Orders" value={compact(orders)} delta={od} />
        <Metric label="GMV" value={rupees(gmv)} delta={gd} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Share of total orders</span>
          <span className="tabular-nums font-medium text-foreground">
            {share.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full", accentBar)} style={{ width: `${share}%` }} />
        </div>
      </div>
    </Card>
  );
}

function ChannelCard({
  label,
  group,
  icon,
  channel,
}: {
  label: string;
  group: "direct" | "pos";
  icon: React.ReactNode;
  channel: { orders: number; gmv: number; ordersDelta: number | null };
}) {
  const d = deltaLabel(channel.ordersDelta);
  const Icon = d.tone === "up" ? TrendingUp : d.tone === "down" ? TrendingDown : Minus;
  const dotColor = group === "direct" ? "bg-emerald-500" : "bg-violet-500";

  return (
    <Card className="p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("size-1.5 rounded-full", dotColor)} />
        <div className="text-muted-foreground">{icon}</div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="text-2xl font-semibold tabular-nums">
        {compact(channel.orders)}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {rupees(channel.gmv)} GMV
      </div>
      <div
        className={cn(
          "mt-2 inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5",
          d.tone === "up" && "text-emerald-700 bg-emerald-50",
          d.tone === "down" && "text-rose-700 bg-rose-50",
          d.tone === "muted" && "text-muted-foreground bg-muted"
        )}
      >
        <Icon className="size-3" />
        {d.text}
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: { text: string; tone: "up" | "down" | "muted" };
}) {
  const Icon = delta.tone === "up" ? TrendingUp : delta.tone === "down" ? TrendingDown : Minus;
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div
        className={cn(
          "mt-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5",
          delta.tone === "up" && "text-emerald-700 bg-emerald-50",
          delta.tone === "down" && "text-rose-700 bg-rose-50",
          delta.tone === "muted" && "text-muted-foreground bg-muted"
        )}
      >
        <Icon className="size-3" />
        {delta.text}
      </div>
    </div>
  );
}

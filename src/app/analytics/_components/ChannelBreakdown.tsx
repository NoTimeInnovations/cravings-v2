"use client";

import { Card } from "@/components/ui/card";
import {
  UtensilsCrossed,
  ShoppingBag,
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
  const grandOrders = totals.direct.orders;
  const grandGmv = totals.direct.gmv;
  const deliveryShare =
    grandOrders > 0 ? (channels.directDelivery.orders / grandOrders) * 100 : 0;
  const takeawayShare =
    grandOrders > 0 ? (channels.directTakeaway.orders / grandOrders) * 100 : 0;
  const dineinShare =
    grandOrders > 0 ? (channels.directDinein.orders / grandOrders) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">Order channels</h2>
          <p className="text-sm text-muted-foreground">
            Direct customer orders by channel (POS orders excluded)
          </p>
        </div>
      </div>

      {/* 3-channel breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChannelCard
          label="Delivery"
          accent="emerald"
          icon={<Bike className="size-4" />}
          channel={channels.directDelivery}
        />
        <ChannelCard
          label="Takeaway"
          accent="amber"
          icon={<ShoppingBag className="size-4" />}
          channel={channels.directTakeaway}
        />
        <ChannelCard
          label="Dine-in"
          accent="sky"
          icon={<UtensilsCrossed className="size-4" />}
          channel={channels.directDinein}
        />
      </div>

      {/* Share bar */}
      <Card className="p-4 bg-white">
        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
          <span>
            <span className="inline-block size-2 rounded-full bg-emerald-500 mr-1.5 align-middle" />
            Delivery {deliveryShare.toFixed(1)}%
          </span>
          <span>
            <span className="inline-block size-2 rounded-full bg-amber-500 mr-1.5 align-middle" />
            Takeaway {takeawayShare.toFixed(1)}%
          </span>
          <span>
            <span className="inline-block size-2 rounded-full bg-sky-500 mr-1.5 align-middle" />
            Dine-in {dineinShare.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${deliveryShare}%` }}
          />
          <div
            className="h-full bg-amber-500"
            style={{ width: `${takeawayShare}%` }}
          />
          <div
            className="h-full bg-sky-500"
            style={{ width: `${dineinShare}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {compact(grandOrders)} non-cancelled orders &middot; {rupees(grandGmv)} total
        </div>
      </Card>
    </div>
  );
}

const ACCENTS = {
  emerald: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  amber: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  sky: { dot: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50" },
} as const;

function ChannelCard({
  label,
  accent,
  icon,
  channel,
}: {
  label: string;
  accent: keyof typeof ACCENTS;
  icon: React.ReactNode;
  channel: { orders: number; gmv: number; ordersDelta: number | null };
}) {
  const d = deltaLabel(channel.ordersDelta);
  const Icon = d.tone === "up" ? TrendingUp : d.tone === "down" ? TrendingDown : Minus;
  const a = ACCENTS[accent];

  return (
    <Card className="p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn("size-1.5 rounded-full", a.dot)} />
        <div className={cn("size-6 rounded-md flex items-center justify-center", a.bg, a.text)}>
          {icon}
        </div>
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

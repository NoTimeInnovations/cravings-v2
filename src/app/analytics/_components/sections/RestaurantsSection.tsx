"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Coins } from "lucide-react";
import Leaderboard from "../Leaderboard";
import ChannelBreakdown from "../ChannelBreakdown";
import AreaChartCard from "../AreaChartCard";
import { compact, rupees } from "../format";
import { SectionHeader } from "./OverviewSection";
import type { PublicStats, Range } from "../types";

type ChannelMetric = "all" | "direct" | "pos";

const CHANNEL_COLORS: Record<ChannelMetric, string> = {
  all: "#a78bfa",
  direct: "#34d399",
  pos: "#a78bfa",
};

const CHANNEL_LABELS: Record<ChannelMetric, string> = {
  all: "All non-cancelled orders",
  direct: "Direct customer orders only",
  pos: "POS / staff-entered only",
};

export default function RestaurantsSection({
  hasura,
  range,
}: {
  hasura: PublicStats;
  range: Range;
}) {
  const [channelMetric, setChannelMetric] = useState<ChannelMetric>("all");

  const channelData = hasura.series.map((s) => {
    const v =
      channelMetric === "direct"
        ? s.direct
        : channelMetric === "pos"
          ? s.pos
          : s.orders;
    return { d: s.d, v };
  });

  const gmvData = hasura.series.map((s) => ({ d: s.d, v: s.gmv }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Restaurants"
        subtitle="Channel mix, top performers and most-scanned menus"
      />

      <ChannelBreakdown
        channels={hasura.channels}
        totals={hasura.channelTotals}
      />

      <AreaChartCard
        title="Restaurant order activity"
        caption={CHANNEL_LABELS[channelMetric]}
        icon={<Building2 className="size-4 text-muted-foreground" />}
        data={channelData}
        dataKey="v"
        range={range}
        color={CHANNEL_COLORS[channelMetric]}
        formatValue={compact}
        rightSlot={
          <Tabs
            value={channelMetric}
            onValueChange={(v) => setChannelMetric(v as ChannelMetric)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="direct">Direct</TabsTrigger>
              <TabsTrigger value="pos">POS</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <AreaChartCard
        title="GMV per restaurant network"
        caption="Daily order value across all active restaurants"
        icon={<Coins className="size-4 text-muted-foreground" />}
        data={gmvData}
        dataKey="v"
        range={range}
        color="#fbbf24"
        formatValue={rupees}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Leaderboard
          title="Top restaurants by orders"
          caption="Most non-cancelled orders in this window"
          rows={hasura.topPartnersByOrders}
          primary={(r) => r.name}
          secondary={(r) => r.district}
          value={(r) => `${compact(r.orders)} orders`}
        />
        <Leaderboard
          title="Top restaurants by GMV"
          caption="Highest order value in this window"
          rows={hasura.topPartnersByGmv}
          primary={(r) => r.name}
          secondary={(r) => r.district}
          value={(r) => rupees(r.gmv)}
        />
        <Leaderboard
          title="Most-scanned menus"
          caption="QR codes opened most"
          rows={hasura.topQr}
          primary={(r) => r.partner_name}
          secondary={(r) =>
            [
              r.district,
              r.table_name ??
                (r.table_number != null ? `Table ${r.table_number}` : null),
            ]
              .filter(Boolean)
              .join(" · ")
          }
          value={(r) => `${compact(r.count)} scans`}
        />
      </div>
    </div>
  );
}

"use client";

import { Card } from "@/components/ui/card";
import { Building2, Users, Coins, ShoppingBag } from "lucide-react";
import KpiCard from "../KpiCard";
import AreaChartCard from "../AreaChartCard";
import { compact, rupees } from "../format";
import { SectionHeader } from "./OverviewSection";
import type { PublicStats, SeriesPoint, Range } from "../types";

function spark(series: SeriesPoint[], key: keyof SeriesPoint): number[] {
  return series.map((p) => Number(p[key] ?? 0));
}

export default function GrowthSection({
  hasura,
  range,
}: {
  hasura: PublicStats;
  range: Range;
}) {
  const k = hasura.kpis;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Growth"
        subtitle="New onboardings, customer acquisition and GMV trajectory"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="New restaurants"
          value={compact(k.newPartners.value)}
          delta={k.newPartners.delta}
          spark={spark(hasura.series, "newPartners")}
          accent="emerald"
          caption="Onboarded in this period"
        />
        <KpiCard
          label="Active restaurants"
          value={compact(k.activePartners.value)}
          delta={k.activePartners.delta}
          accent="violet"
          caption="With non-cancelled orders"
        />
        <KpiCard
          label="Active customers"
          value={compact(k.activeCustomers.value)}
          delta={k.activeCustomers.delta}
          spark={spark(hasura.series, "customers")}
          accent="sky"
          caption="Unique customers ordering"
        />
        <KpiCard
          label="GMV"
          value={rupees(k.gmv.value)}
          delta={k.gmv.delta}
          spark={spark(hasura.series, "gmv")}
          accent="amber"
          caption="vs prior period"
        />
      </div>

      <AreaChartCard
        title="Restaurant onboardings"
        caption="New partners coming on Menuthere"
        icon={<Building2 className="size-4 text-muted-foreground" />}
        data={hasura.series.map((s) => ({ d: s.d, v: s.newPartners }))}
        dataKey="v"
        range={range}
        color="#34d399"
        formatValue={(n) => `${compact(n)} new`}
      />

      <AreaChartCard
        title="GMV trajectory"
        caption="Order value over time (cancelled excluded)"
        icon={<Coins className="size-4 text-muted-foreground" />}
        data={hasura.series.map((s) => ({ d: s.d, v: s.gmv }))}
        dataKey="v"
        range={range}
        color="#fbbf24"
        formatValue={rupees}
      />

      <AreaChartCard
        title="Customer activity"
        caption="Distinct customers ordering"
        icon={<Users className="size-4 text-muted-foreground" />}
        data={hasura.series.map((s) => ({ d: s.d, v: s.customers }))}
        dataKey="v"
        range={range}
        color="#7dd3fc"
        formatValue={compact}
      />

      <Card className="p-5 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="size-4 text-muted-foreground" />
          <div className="text-sm font-semibold">Network all-time</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total restaurants" value={compact(hasura.allTime.partners)} />
          <Stat label="Total customers" value={compact(hasura.allTime.users)} />
          <Stat label="Total orders" value={compact(hasura.allTime.orders)} />
          <Stat label="Total GMV" value={rupees(hasura.allTime.gmv)} />
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}

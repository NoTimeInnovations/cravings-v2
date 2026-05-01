"use client";

import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";
import KpiCard from "../KpiCard";
import EngagementChart from "../EngagementChart";
import { compact, rupees, pct } from "../format";
import type { PublicStats, PosthogStats, SeriesPoint, Range } from "../types";

function spark(series: SeriesPoint[], key: keyof SeriesPoint): number[] {
  return series.map((p) => Number(p[key] ?? 0));
}

export default function OverviewSection({
  hasura,
  posthog,
  range,
}: {
  hasura: PublicStats;
  posthog: PosthogStats | null;
  range: Range;
}) {
  const k = hasura.kpis;
  const visitors = posthog?.visitors ?? null;
  const visitorsDelta = posthog?.visitorsDelta ?? null;
  const visitorsSpark = (posthog?.daily ?? []).map((d) => d.visitors);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Overview"
        subtitle="Headline metrics across the Menuthere network"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4">
        <KpiCard
          label="Landing visits"
          value={
            posthog?.landingVisitors == null
              ? "—"
              : compact(posthog.landingVisitors)
          }
          delta={posthog?.landingDelta ?? null}
          spark={visitorsSpark}
          accent="rose"
          caption={
            posthog?.enabled === false
              ? "PostHog key not set"
              : `${compact(posthog?.landingPageviews ?? 0)} pageviews on /`
          }
        />
        <KpiCard
          label="Unique visitors"
          value={visitors === null ? "—" : compact(visitors)}
          delta={visitorsDelta}
          spark={visitorsSpark}
          accent="rose"
          caption={
            posthog?.enabled === false
              ? "PostHog key not set"
              : `${compact(posthog?.sessions ?? 0)} sessions`
          }
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
          label="Orders placed"
          value={compact(k.orders.value)}
          delta={k.orders.delta}
          spark={spark(hasura.series, "orders")}
          accent="violet"
          caption={`${pct(k.completionRate)} completion · cancelled excluded`}
        />
        <KpiCard
          label="GMV"
          value={rupees(k.gmv.value)}
          delta={k.gmv.delta}
          spark={spark(hasura.series, "gmv")}
          accent="emerald"
          caption="Total order value"
        />
        <KpiCard
          label="Menu scans"
          value={compact(k.scans.value)}
          delta={k.scans.delta}
          spark={spark(hasura.series, "scans")}
          accent="amber"
          caption="QR menu opens"
        />
      </div>

      <EngagementChart
        series={hasura.series}
        visitorsDaily={posthog?.daily ?? []}
        range={range}
      />

      <Card className="p-5 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="size-4 text-muted-foreground" />
          <div className="text-sm font-semibold">All-time on Menuthere</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Stat label="Restaurants" value={compact(hasura.allTime.partners)} />
          <Stat label="Customers" value={compact(hasura.allTime.users)} />
          <Stat label="Orders" value={compact(hasura.allTime.orders)} />
          <Stat label="GMV" value={rupees(hasura.allTime.gmv)} />
          <Stat label="Avg order" value={rupees(hasura.allTime.avgOrderValue)} />
          <Stat label="Menu scans" value={compact(hasura.allTime.qrScans)} />
          <Stat
            label="Avg rating"
            value={
              hasura.allTime.avgRating
                ? hasura.allTime.avgRating.toFixed(2)
                : "—"
            }
          />
        </div>
      </Card>
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

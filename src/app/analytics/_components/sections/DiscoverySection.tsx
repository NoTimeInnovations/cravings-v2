"use client";

import { Globe } from "lucide-react";
import Leaderboard from "../Leaderboard";
import KpiCard from "../KpiCard";
import AreaChartCard from "../AreaChartCard";
import { compact } from "../format";
import { SectionHeader } from "./OverviewSection";
import type { PublicStats, PosthogStats, Range } from "../types";

function flagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  const cc = code.toUpperCase();
  return String.fromCodePoint(
    A + (cc.charCodeAt(0) - 65),
    A + (cc.charCodeAt(1) - 65)
  );
}

export default function DiscoverySection({
  hasura,
  posthog,
  range,
}: {
  hasura: PublicStats;
  posthog: PosthogStats | null;
  range: Range;
}) {
  const enabled = posthog?.enabled === true;
  const visitorsSpark = (posthog?.daily ?? []).map((d) => d.visitors);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Discovery"
        subtitle="How users find Menuthere — searches, referrers, geography"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Unique visitors"
          value={posthog?.visitors == null ? "—" : compact(posthog.visitors)}
          delta={posthog?.visitorsDelta ?? null}
          spark={visitorsSpark}
          accent="rose"
          caption={enabled ? "In this window" : "PostHog not configured"}
        />
        <KpiCard
          label="Sessions"
          value={posthog?.sessions == null ? "—" : compact(posthog.sessions)}
          delta={null}
          accent="violet"
          caption={enabled ? "Distinct sessions" : "PostHog not configured"}
        />
        <KpiCard
          label="Pageviews"
          value={posthog?.pageviews == null ? "—" : compact(posthog.pageviews)}
          delta={null}
          accent="sky"
          caption={enabled ? "Total pageviews" : "PostHog not configured"}
        />
      </div>

      {enabled && posthog && posthog.daily.length > 0 && (
        <AreaChartCard
          title="Visitor trend"
          caption="Daily unique visitors"
          icon={<Globe className="size-4 text-muted-foreground" />}
          data={posthog.daily.map((d) => ({ d: d.d, v: d.visitors }))}
          dataKey="v"
          range={range}
          color="#f472b6"
          formatValue={compact}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Leaderboard
          title="Top countries"
          caption={
            enabled
              ? "Visitors by country (GeoIP)"
              : "PostHog not configured"
          }
          rows={posthog?.topCountries ?? []}
          primary={(r) => `${flagEmoji(r.code)}  ${r.country}`}
          value={(r) => compact(r.count)}
          emptyText={
            enabled
              ? "No country data yet"
              : "Enable PostHog to surface countries"
          }
        />
        <Leaderboard
          title="Top cities"
          caption={enabled ? "Visitors by city (GeoIP)" : "Restaurants by district"}
          rows={
            posthog?.topCities && posthog.topCities.length > 0
              ? posthog.topCities.map((c) => ({
                  city: c.city,
                  count: c.count,
                  isVisitor: true as const,
                }))
              : hasura.topCities.map((c) => ({
                  city: c.city,
                  count: c.count,
                  isVisitor: false as const,
                }))
          }
          primary={(r: any) => r.city}
          value={(r: any) =>
            `${compact(r.count)}${r.isVisitor ? "" : " restaurants"}`
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Leaderboard
          title="Top searches"
          caption={
            enabled
              ? "What users searched on menuthere.com"
              : "PostHog not configured"
          }
          rows={posthog?.topSearches ?? []}
          primary={(r) => `"${r.query}"`}
          value={(r) => compact(r.count)}
          emptyText={
            enabled
              ? "No searches captured yet — they'll appear as users search"
              : "Enable PostHog to surface searches"
          }
        />
        <Leaderboard
          title="Top referrers"
          caption={
            enabled ? "Where visitors come from" : "PostHog not configured"
          }
          rows={posthog?.topReferrers ?? []}
          primary={(r) => r.domain}
          value={(r) => compact(r.count)}
          emptyText={
            enabled
              ? "No referrer data yet"
              : "Enable PostHog to surface referrers"
          }
        />
      </div>
    </div>
  );
}

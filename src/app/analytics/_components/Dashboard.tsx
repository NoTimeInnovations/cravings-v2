"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import RangeSelector from "./RangeSelector";
import { DesktopSidebar, MobileTabs, TABS, type Tab } from "./Sidebar";
import OverviewSection from "./sections/OverviewSection";
import LiveOrdersSection from "./sections/LiveOrdersSection";
import GrowthSection from "./sections/GrowthSection";
import RestaurantsSection from "./sections/RestaurantsSection";
import DiscoverySection from "./sections/DiscoverySection";
import type { PublicStats, PosthogStats, Range } from "./types";

const REFRESH_MS = 30_000;
const VALID_TABS = new Set<Tab>([
  "overview",
  "live",
  "growth",
  "restaurants",
  "discovery",
]);

export default function Dashboard() {
  const sp = useSearchParams();
  const range = (sp?.get("range") ?? "30d") as Range;
  const tabParam = (sp?.get("tab") ?? "overview") as Tab;
  const tab: Tab = VALID_TABS.has(tabParam) ? tabParam : "overview";

  const [hasura, setHasura] = useState<PublicStats | null>(null);
  const [posthog, setPosthog] = useState<PosthogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const lastRange = useRef<Range>(range);

  useEffect(() => {
    let cancelled = false;
    const isRangeChange = lastRange.current !== range && hasura !== null;
    if (isRangeChange) setRefreshing(true);
    lastRange.current = range;

    async function load() {
      try {
        const [a, b] = await Promise.all([
          fetch(`/api/stats/public?range=${range}`, { cache: "no-store" }).then(
            (r) => r.json()
          ),
          fetch(`/api/stats/posthog?range=${range}`, { cache: "no-store" }).then(
            (r) => r.json()
          ),
        ]);
        if (cancelled) return;
        setHasura(a);
        setPosthog(b);
        setLoading(false);
        setRefreshing(false);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    load();
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, tick]);

  const activeTabMeta = TABS.find((t) => t.id === tab);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <DesktopSidebar current={tab} />

      <div className="min-w-0 space-y-6">
        <MobileTabs current={tab} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {activeTabMeta?.label}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
              {hasura ? (
                <SyncedAt at={hasura.syncedAt} />
              ) : (
                <span className="text-muted-foreground/60">Loading…</span>
              )}
              {refreshing && (
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <Loader2 className="size-3 animate-spin" />
                  Updating
                </span>
              )}
            </div>
          </div>
          {tab !== "live" && (
            <RangeSelector current={range} disabled={refreshing} />
          )}
          {tab === "live" && (
            <div className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-foreground">Today, real-time</span>
            </div>
          )}
        </div>

        {loading || !hasura ? (
          <SectionSkeleton />
        ) : (
          <div className="relative">
            {refreshing && (
              <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] rounded-xl flex items-start justify-center pt-24">
                <div className="flex items-center gap-2 rounded-full bg-white border shadow-sm px-4 py-2 text-sm">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="text-muted-foreground">
                    Loading {range}…
                  </span>
                </div>
              </div>
            )}

            {tab === "overview" && (
              <OverviewSection hasura={hasura} posthog={posthog} range={range} />
            )}
            {tab === "live" && <LiveOrdersSection />}
            {tab === "growth" && <GrowthSection hasura={hasura} range={range} />}
            {tab === "restaurants" && (
              <RestaurantsSection hasura={hasura} range={range} />
            )}
            {tab === "discovery" && (
              <DiscoverySection hasura={hasura} posthog={posthog} range={range} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SyncedAt({ at }: { at: string }) {
  const [, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(id);
  }, []);
  try {
    return (
      <span>
        synced {formatDistanceToNow(new Date(at), { addSuffix: true })}
      </span>
    );
  } catch {
    return <span>synced just now</span>;
  }
}

function SectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

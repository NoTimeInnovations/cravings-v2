"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import KpiCard from "../KpiCard";
import { compact } from "../format";
import { SectionHeader } from "./OverviewSection";
import type { Range, UsageRow, UsageStats } from "../types";

type SortKey =
  | "events"
  | "pageviews"
  | "visits"
  | "users"
  | "orders"
  | "scans"
  | "name";

const COLUMNS: { key: SortKey; label: string; help: string }[] = [
  { key: "name", label: "Restaurant", help: "Sorted by store name" },
  { key: "events", label: "Events", help: "All PostHog events on /<username>/* in this window" },
  { key: "pageviews", label: "Page views", help: "$pageview events on /<username>/*" },
  { key: "visits", label: "Visits", help: "Distinct PostHog sessions on /<username>/*" },
  { key: "users", label: "Users", help: "Distinct PostHog visitors on /<username>/*" },
  { key: "orders", label: "Orders", help: "Non-cancelled orders for the restaurant in this window" },
  { key: "scans", label: "QR scans", help: "QR code scans across the restaurant's QR codes in this window" },
];

export default function UsageSection({ range }: { range: Range }) {
  const [data, setData] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "events",
    dir: "desc",
  });
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/stats/usage?range=${range}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: UsageStats) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        console.error("usage fetch failed", e);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const filtered = useMemo<UsageRow[]>(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    const rows = term
      ? data.rows.filter(
          (r) =>
            r.name.toLowerCase().includes(term) ||
            r.username.toLowerCase().includes(term) ||
            (r.district ?? "").toLowerCase().includes(term)
        )
      : data.rows;

    const sorted = [...rows].sort((a, b) => {
      if (sort.key === "name") {
        return sort.dir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      const av = (a[sort.key] as number) ?? 0;
      const bv = (b[sort.key] as number) ?? 0;
      return sort.dir === "asc" ? av - bv : bv - av;
    });
    return sorted;
  }, [data, q, sort]);

  const totals = data?.totals;
  const totalRestaurants = data?.rows.length ?? 0;
  const activeRestaurants = totals?.restaurants ?? 0;

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" }
    );
  }

  const phDisabled = data && data.enabled === false;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Restaurant usage"
        subtitle="Per-restaurant traffic, orders and QR activity — based on visits to /<username>/*"
      />

      {phDisabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          PostHog isn't configured ({data?.reason ?? "missing keys"}). Showing
          Hasura-only counts. Set <code className="font-mono">POSTHOG_PROJECT_ID</code> and
          <code className="font-mono"> POSTHOG_PERSONAL_API_KEY</code> to populate
          events / page views / visits / users.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          label="Active restaurants"
          value={loading ? "…" : compact(activeRestaurants)}
          delta={null}
          caption={`${compact(totalRestaurants)} total with a username`}
          accent="violet"
        />
        <KpiCard
          label="Events"
          value={loading ? "…" : compact(totals?.events ?? 0)}
          delta={null}
          caption="All PostHog events tagged to a restaurant"
          accent="sky"
        />
        <KpiCard
          label="Page views"
          value={loading ? "…" : compact(totals?.pageviews ?? 0)}
          delta={null}
          caption="$pageview events on /<username>/*"
          accent="rose"
        />
        <KpiCard
          label="Visits"
          value={loading ? "…" : compact(totals?.visits ?? 0)}
          delta={null}
          caption="Distinct sessions"
          accent="emerald"
        />
        <KpiCard
          label="Unique users"
          value={loading ? "…" : compact(totals?.users ?? 0)}
          delta={null}
          caption="Distinct visitors"
          accent="amber"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 border-b">
          <div>
            <div className="text-sm font-semibold">By restaurant</div>
            <div className="text-xs text-muted-foreground">
              {compact(filtered.length)}
              {q ? ` of ${compact(totalRestaurants)}` : ""} restaurants
              {totals
                ? ` · ${compact(totals.orders)} orders · ${compact(
                    totals.scans
                  )} scans`
                : ""}
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search restaurant, username, city"
              className="pl-8 h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground border-b bg-neutral-50">
                {COLUMNS.map((col) => {
                  const active = sort.key === col.key;
                  const Icon = active
                    ? sort.dir === "asc"
                      ? ArrowUp
                      : ArrowDown
                    : ArrowUpDown;
                  return (
                    <th
                      key={col.key}
                      className={cn(
                        "px-4 py-2 whitespace-nowrap",
                        col.key !== "name" && "text-right",
                        col.key === "name" && "min-w-[200px]"
                      )}
                      title={col.help}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-foreground",
                          active && "text-foreground"
                        )}
                      >
                        {col.label}
                        <Icon className="size-3 opacity-60" />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    {COLUMNS.map((c) => (
                      <td key={c.key} className="px-4 py-3">
                        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-muted-foreground"
                    colSpan={COLUMNS.length}
                  >
                    No restaurants match.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.partnerId ?? r.username}
                    className="border-b last:border-b-0 hover:bg-neutral-50"
                  >
                    <td className="px-4 py-2.5 min-w-[200px]">
                      <div className="font-medium truncate" title={r.name}>
                        {r.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        @{r.username}
                        {r.district ? ` · ${r.district}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {compact(r.events)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {compact(r.pageviews)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {compact(r.visits)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {compact(r.users)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {compact(r.orders)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {compact(r.scans)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {data?.unmatched && data.unmatched.length > 0 && (
        <Card className="p-4">
          <div className="text-sm font-semibold">Unattributed paths</div>
          <div className="text-xs text-muted-foreground mb-3">
            Top first-path segments with PostHog activity that didn't match a
            known partner username.
          </div>
          <div className="flex flex-wrap gap-2">
            {data.unmatched.map((u) => (
              <div
                key={u.username}
                className="text-xs rounded-md border bg-white px-2 py-1 tabular-nums"
              >
                <span className="font-mono">/{u.username}</span>
                <span className="text-muted-foreground ml-1">
                  {compact(u.events)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

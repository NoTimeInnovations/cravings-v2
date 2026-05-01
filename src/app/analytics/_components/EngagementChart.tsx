"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AreaChartCard from "./AreaChartCard";
import type { SeriesPoint, Range } from "./types";
import { compact, rupees } from "./format";

type Metric = "orders" | "gmv" | "customers" | "scans" | "visitors";

type Props = {
  series: SeriesPoint[];
  visitorsDaily: Array<{ d: string; visitors: number; pageviews: number }>;
  range: Range;
};

const COLORS: Record<Metric, string> = {
  orders: "#a78bfa",
  gmv: "#34d399",
  customers: "#7dd3fc",
  scans: "#fbbf24",
  visitors: "#f472b6",
};

const LABELS: Record<Metric, string> = {
  orders: "Orders",
  gmv: "GMV",
  customers: "Customers",
  scans: "Menu scans",
  visitors: "Visitors",
};

export default function EngagementChart({
  series,
  visitorsDaily,
  range,
}: Props) {
  const [metric, setMetric] = useState<Metric>("orders");

  const data = useMemo(() => {
    if (metric === "visitors") {
      return visitorsDaily.map((v) => ({ d: v.d, v: v.visitors }));
    }
    return series.map((s) => ({ d: s.d, v: (s as any)[metric] ?? 0 }));
  }, [series, visitorsDaily, metric]);

  const fmt = metric === "gmv" ? rupees : compact;
  const hasVisitors = visitorsDaily && visitorsDaily.length > 0;

  return (
    <AreaChartCard
      title="Engagement"
      caption={`${LABELS[metric]} across the selected range`}
      data={data}
      dataKey="v"
      range={range}
      color={COLORS[metric]}
      formatValue={fmt}
      height={288}
      rightSlot={
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="gmv">GMV</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="scans">Menu scans</TabsTrigger>
            {hasVisitors && <TabsTrigger value="visitors">Visitors</TabsTrigger>}
          </TabsList>
        </Tabs>
      }
    />
  );
}

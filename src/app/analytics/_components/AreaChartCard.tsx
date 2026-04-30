"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { Range } from "./types";

type SeriesRow = { d: string; [key: string]: string | number };

type Props = {
  title?: string;
  caption?: string;
  data: SeriesRow[];
  dataKey: string;
  range: Range;
  color?: string;
  formatValue?: (n: number) => string;
  height?: number;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

function bucketize(
  data: SeriesRow[],
  dataKey: string,
  range: Range
): Array<{ label: string; v: number; raw: string }> {
  if (!data || data.length === 0) return [];

  if (range === "365d") {
    // Aggregate to monthly buckets
    const buckets: Record<string, number> = {};
    for (const row of data) {
      const m = row.d.slice(0, 7); // YYYY-MM
      buckets[m] = (buckets[m] ?? 0) + (Number(row[dataKey]) || 0);
    }
    const months = Object.keys(buckets).sort();
    return months.map((m) => {
      const date = new Date(m + "-01");
      const label = date.toLocaleString("en-US", { month: "short" });
      return { label, v: buckets[m], raw: m };
    });
  }

  if (range === "90d") {
    // Aggregate to weekly buckets
    const buckets: Array<{ label: string; v: number; raw: string }> = [];
    for (let i = 0; i < data.length; i += 7) {
      const slice = data.slice(i, i + 7);
      if (!slice.length) continue;
      const sum = slice.reduce((a, r) => a + (Number(r[dataKey]) || 0), 0);
      const start = new Date(slice[0].d);
      const label = start.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
      });
      buckets.push({ label, v: sum, raw: slice[0].d });
    }
    return buckets;
  }

  if (range === "30d") {
    return data.map((r) => {
      const date = new Date(r.d);
      return {
        label: date.toLocaleString("en-US", { day: "numeric", month: "short" }),
        v: Number(r[dataKey]) || 0,
        raw: r.d,
      };
    });
  }

  // 7d / 1d
  return data.map((r) => {
    const date = new Date(r.d);
    return {
      label: date.toLocaleString("en-US", { weekday: "short" }),
      v: Number(r[dataKey]) || 0,
      raw: r.d,
    };
  });
}

export default function AreaChartCard({
  title,
  caption,
  data,
  dataKey,
  range,
  color = "#7dd3fc",
  formatValue = (n) => String(n),
  height = 260,
  icon,
  rightSlot,
}: Props) {
  const buckets = useMemo(
    () => bucketize(data, dataKey, range),
    [data, dataKey, range]
  );
  const gradId = useMemo(
    () => `gr-${(title ?? dataKey).replace(/[^a-z0-9]/gi, "")}-${dataKey}`,
    [title, dataKey]
  );

  return (
    <Card className="p-5 bg-white">
      {(title || rightSlot) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <div className="text-base font-semibold flex items-center gap-2">
                {icon}
                {title}
              </div>
            )}
            {caption && (
              <div className="text-xs text-muted-foreground">{caption}</div>
            )}
          </div>
          {rightSlot}
        </div>
      )}

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={buckets}
            margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="#9ca3af"
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "3 3" }}
              contentStyle={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 12,
                padding: "6px 10px",
              }}
              labelStyle={{ color: "#64748b", fontSize: 11 }}
              formatter={(v: number) => [formatValue(v), ""] as any}
              separator=""
            />
            <Area
              type="linear"
              dataKey="v"
              stroke={color}
              strokeWidth={1.6}
              fill={`url(#${gradId})`}
              isAnimationActive={false}
              activeDot={{ r: 3, fill: color, stroke: "#fff", strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

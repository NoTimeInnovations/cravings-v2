"use client";

import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { cn } from "@/lib/utils";
import { deltaLabel } from "./format";

type Props = {
  label: string;
  value: string;
  delta: number | null;
  caption?: string;
  spark?: number[];
  axis?: "up" | "down";
  accent?: "violet" | "emerald" | "rose" | "amber" | "sky";
};

const ACCENTS: Record<NonNullable<Props["accent"]>, string> = {
  violet: "#8b5cf6",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  sky: "#0ea5e9",
};

export default function KpiCard({
  label,
  value,
  delta,
  caption,
  spark,
  axis = "up",
  accent = "violet",
}: Props) {
  const d = deltaLabel(delta, axis);
  const Icon = d.tone === "up" ? TrendingUp : d.tone === "down" ? TrendingDown : Minus;
  const color = ACCENTS[accent];

  const sparkData = (spark ?? []).map((v, i) => ({ i, v }));

  return (
    <Card className="relative overflow-hidden p-4 border bg-white">
      <div className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase truncate">
        {label}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <div className="text-2xl font-semibold tracking-tight tabular-nums truncate">
          {value}
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-1.5 py-0.5 shrink-0",
            d.tone === "up" && "text-emerald-700 bg-emerald-50",
            d.tone === "down" && "text-rose-700 bg-rose-50",
            d.tone === "muted" && "text-muted-foreground bg-muted"
          )}
        >
          <Icon className="size-3" />
          {d.text}
        </div>
      </div>

      {sparkData.length > 1 && (
        <div className="mt-2 -mx-1 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.6}
                fill={`url(#g-${label.replace(/\s/g, "")})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {caption && (
        <div
          className="mt-1 text-[11px] text-muted-foreground truncate"
          title={caption}
        >
          {caption}
        </div>
      )}
    </Card>
  );
}

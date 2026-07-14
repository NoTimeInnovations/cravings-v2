"use client";

import { useEffect, useMemo, useState } from "react";
import { CallLoggerApi, type CallRow } from "@/lib/callLogger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Range = "today" | "yesterday" | "custom";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function CallLogsTab({ partnerId }: { partnerId: string }) {
  const [range, setRange] = useState<Range>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rows, setRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (range === "today") return { from: startOfDay(now).toISOString(), to: now.toISOString() };
    if (range === "yesterday") {
      const startToday = startOfDay(now);
      const startYest = new Date(startToday);
      startYest.setDate(startYest.getDate() - 1);
      return { from: startYest.toISOString(), to: startToday.toISOString() };
    }
    const f = customFrom ? startOfDay(new Date(customFrom)) : new Date(0);
    const t = customTo ? new Date(startOfDay(new Date(customTo)).getTime() + 86_400_000) : now;
    return { from: f.toISOString(), to: t.toISOString() };
  }, [range, customFrom, customTo]);

  useEffect(() => {
    if (range === "custom" && (!customFrom || !customTo)) return;
    setLoading(true);
    CallLoggerApi.calls(partnerId, from, to)
      .then((r) => setRows(r.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [partnerId, from, to, range, customFrom, customTo]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["today", "yesterday", "custom"] as Range[]).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "default" : "outline"}
            onClick={() => setRange(r)}
          >
            {r[0].toUpperCase() + r.slice(1)}
          </Button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 w-auto"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 w-auto"
            />
          </div>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{rows.length} calls</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading &&
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.number_e164 || c.number_raw}</TableCell>
                  <TableCell className="text-muted-foreground">{c.cached_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.direction === "inbound" ? "default" : "secondary"}>
                      {c.call_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{c.duration_seconds}s</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(c.started_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No calls in this range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

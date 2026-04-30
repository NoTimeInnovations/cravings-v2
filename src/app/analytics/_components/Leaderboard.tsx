"use client";

import { Card } from "@/components/ui/card";

type Props<T> = {
  title: string;
  caption?: string;
  rows: T[];
  primary: (row: T) => string;
  secondary?: (row: T) => string | null;
  value: (row: T) => string;
  emptyText?: string;
};

export default function Leaderboard<T>({
  title,
  caption,
  rows,
  primary,
  secondary,
  value,
  emptyText = "No data yet",
}: Props<T>) {
  return (
    <Card className="p-5 bg-white">
      <div className="mb-3">
        <div className="text-sm font-semibold">{title}</div>
        {caption && (
          <div className="text-xs text-muted-foreground">{caption}</div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">
          {emptyText}
        </div>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row, i) => (
            <li
              key={i}
              className="flex items-center gap-3 text-sm py-1.5 border-b last:border-0"
            >
              <span className="size-5 rounded-full bg-muted text-[10px] font-semibold flex items-center justify-center text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{primary(row)}</div>
                {secondary && secondary(row) && (
                  <div className="truncate text-xs text-muted-foreground">
                    {secondary(row)}
                  </div>
                )}
              </div>
              <div className="font-semibold tabular-nums text-sm">
                {value(row)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

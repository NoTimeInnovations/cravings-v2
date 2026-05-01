"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Range } from "./types";

const OPTIONS: Array<{ value: Range; label: string }> = [
  { value: "1d", label: "Today" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "365d", label: "12mo" },
];

export default function RangeSelector({
  current,
  disabled = false,
}: {
  current: Range;
  disabled?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const setRange = (r: Range) => {
    if (disabled || r === current) return;
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.set("range", r);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border bg-white p-0.5 text-sm",
        disabled && "opacity-70"
      )}
    >
      {OPTIONS.map((o) => {
        const active = current === o.value;
        const showSpinner = disabled && active;
        return (
          <button
            key={o.value}
            disabled={disabled}
            onClick={() => setRange(o.value)}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
              disabled && !active && "cursor-not-allowed",
              disabled && active && "cursor-wait"
            )}
          >
            {showSpinner && <Loader2 className="size-3 animate-spin" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

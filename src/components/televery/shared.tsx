"use client";

import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Televery's outlets are all India-based, so money is always shown in INR. */
export const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

/**
 * Order-status pill colours. Same palette the compact dashboard used, plus the
 * dark-mode variants the admin-v2 chrome expects.
 */
export function statusBadgeClass(status: string | null): string {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-900/40";
    case "cancelled":
      return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-900/40";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-900/40";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

/**
 * Full-panel loader for a section that is still fetching. Mirrors the
 * `ViewLoading` fallback admin-v2 shows while a section mounts.
 */
export function TeleveryViewLoading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      <span className="text-sm text-muted-foreground">Loading…</span>
    </div>
  );
}

/**
 * One headline number. `min-w-0` + a truncating label keep long values (revenue
 * on a narrow phone) inside the grid cell instead of widening the page.
 */
export function TeleveryKpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="min-w-0 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 break-words text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </p>
    </Card>
  );
}

/** Placeholder for a list with nothing in it yet. */
export function TeleveryEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-4 py-12 text-center", className)}>
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/50" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

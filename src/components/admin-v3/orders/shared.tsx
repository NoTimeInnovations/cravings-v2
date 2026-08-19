"use client";

import * as React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { cn } from "@/lib/utils";
import { safeTz } from "@/lib/partnerTime";
import type { Order } from "@/store/orderStore";

/**
 * Shared vocabulary for the v3 Orders screen (list + detail + edit).
 *
 * The design draws these three views out of ONE small set of shapes: a 10px
 * card, a 13px card header with a grey meta pill, an 11px uppercase field
 * label, a 36px input and a dot-and-label status pill. They are collected here
 * rather than repeated so the three sub-views cannot drift apart.
 *
 * Nothing here is a replacement for ui/primitives — AdminV3Button and V3Card
 * still do the work wherever they fit. What these add is the two things the
 * primitives deliberately do not carry: the design's *inner* card (10px radius,
 * always rounded, sits INSIDE the page rather than being the page's own card)
 * and a status pill with a leading dot and a red tone, which a cancelled order
 * needs and StatusPill has no tone for.
 */

dayjs.extend(utc);
dayjs.extend(timezone);

/* --------------------------------------------------------------- formatting */

/**
 * Format an instant in the PARTNER's timezone, never the browser's — a partner
 * in Dubai reading a Kerala kitchen's screen must still see the kitchen's clock.
 */
export function fmtTz(
  iso: string | null | undefined,
  tz: string | null | undefined,
  pattern: string,
): string {
  if (!iso) return "";
  const d = dayjs(iso);
  if (!d.isValid()) return "";
  return d.tz(safeTz(tz)).format(pattern);
}

/** "₹420" / "₹420.00" — the currency symbol is the partner's, not a hard ₹. */
export const money = (currency: string, amount: number, dp = 0) =>
  `${currency}${Number.isFinite(amount) ? amount.toFixed(dp) : (0).toFixed(dp)}`;

/* ------------------------------------------------------------------ tokens */

/** The design's inner card: 10px radius, hairline border, 1px shadow. */
export const CARD =
  "rounded-[10px] border border-zinc-200 bg-white shadow-[0_1px_2px_0_rgba(9,9,11,.05)] dark:border-zinc-800 dark:bg-zinc-900";

/** Card header strip — 13px/16px, hairline bottom rule, wraps on narrow cards. */
export const CARD_HEAD =
  "flex flex-wrap items-center gap-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800";

export const CARD_TITLE =
  "text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50";

/** 11px uppercase caption above a value ("DELIVERY ADDRESS", "METHOD"). */
export const FIELD_LABEL =
  "text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500";

/** 36px text input / select face. */
export const INPUT =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

/** 34px bordered button — the design's default toolbar/header control. */
export const CONTROL =
  "inline-flex h-[34px] shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

/** 38px version of the same control — the list toolbar row. */
export const CONTROL_LG =
  "inline-flex h-[38px] shrink-0 items-center justify-center gap-[9px] whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

/** 30px square icon button used inside table rows and item rows. */
export const ICON_BTN =
  "inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

/* -------------------------------------------------------------- meta pills */

/** Small grey capsule: "1 item", "COD", "Delivery Bridge", "TAKEAWAY". */
export function MetaPill({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** The squared badge the table uses for Payment / Order type. */
export function TagBadge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border border-zinc-200 bg-zinc-100 px-[7px] py-[3px] text-[10.5px] font-semibold uppercase leading-none tracking-[0.05em] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ status pills */

export type StatusTone = "green" | "amber" | "blue" | "red" | "neutral";

const TONE_PILL: Record<StatusTone, string> = {
  green:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
  amber:
    "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  // Accepted: the order is in the kitchen's hands. Blue separates "we have it"
  // from amber "still waiting on you" and green "done" — and matches the blue
  // admin-v2's LiveOrderCard has always used for accepted.
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  neutral:
    "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

/** Saturated dots read the same on both grounds — left alone in dark mode. */
const TONE_DOT: Record<StatusTone, string> = {
  green: "bg-green-600",
  amber: "bg-amber-600",
  blue: "bg-blue-600",
  red: "bg-red-500",
  neutral: "bg-zinc-400",
};

/** Status capsule with the design's 6px leading dot. */
export function DotPill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-[10px] py-[3.5px] text-[11.5px] font-bold leading-none",
        TONE_PILL[tone],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      {children}
    </span>
  );
}

export const toneDotClass = (tone: StatusTone) => TONE_DOT[tone];
export const tonePillClass = (tone: StatusTone) => TONE_PILL[tone];

/* ------------------------------------------------------------ order status */

export const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: "Pending", tone: "amber" },
  accepted: { label: "Accepted", tone: "blue" },
  preparing: { label: "Preparing", tone: "amber" },
  food_ready: { label: "Food Ready", tone: "green" },
  dispatched: { label: "Dispatched", tone: "green" },
  in_transit: { label: "On the way", tone: "green" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
  pending_payment: { label: "Draft", tone: "neutral" },
};

export const statusMeta = (status?: string | null) =>
  STATUS_META[(status || "").trim().toLowerCase()] ?? {
    label: status || "Unknown",
    tone: "neutral" as StatusTone,
  };

/** Statuses an order can be moved to from the dashboard (same set as v2). */
export const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "food_ready", label: "Food Ready" },
  { value: "dispatched", label: "Dispatched" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/** Live = still needs the kitchen's attention. Same set the v3 dashboard uses. */
export const LIVE_ORDER_STATUSES = new Set([
  "pending",
  "accepted",
  "preparing",
  "food_ready",
  "dispatched",
  "in_transit",
]);

/* ----------------------------------------------------------------- labels */

/**
 * "Table / Location" column value, copied from AdminV2Orders so the two screens
 * never describe the same order differently:
 *  - dine-in / table order → "Table: <n>" (or the table's name if unnumbered)
 *  - takeaway (a delivery order with no drop address) → "Takeaway"
 *  - real delivery → the drop address
 */
export const getTableLocationLabel = (order: Order): string => {
  if (order.type === "table_order" || order.tableNumber != null || order.tableName) {
    if (order.tableNumber != null) return `Table: ${order.tableNumber}`;
    if (order.tableName) return order.tableName;
    return "Table";
  }
  if (order.type === "delivery" && !order.deliveryAddress) return "Takeaway";
  return order.deliveryAddress || "N/A";
};

/** True when the row's location is a physical drop address (pin icon vs bag). */
export const hasDropAddress = (order: Order): boolean =>
  !!order.deliveryAddress && !order.tableName && order.tableNumber == null;

/** Initials for the customer avatar — "Arati Nair" → "AN". */
export const initialsOf = (name?: string | null): string => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
};

/** wa.me target — bare 10-digit Indian numbers get the country code. */
export const whatsappHref = (phone?: string | null): string => {
  const p = (phone || "").replace(/\s+/g, "");
  if (!p) return "";
  const normalized = /^\+/.test(p) ? p : /^\d{10}$/.test(p) ? `+91${p}` : p;
  return `https://wa.me/${normalized}`;
};

/** Copy-to-clipboard with a 1.6s "Copied" flag, as the design's copy buttons do. */
export function useCopyFlag(): [boolean, (text: string) => void] {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = React.useCallback((text: string) => {
    if (!text) return;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    });
  }, []);

  return [copied, copy];
}

"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Small shapes shared by the v3 Delivery Pool screen and its performance tab.
 *
 * Nothing here is new vocabulary — it is the same segmented control, uppercase
 * grid header, empty block and 30px row button that AdminV3DeliveryBoys and the
 * Orders cluster already use. They live in their own file only so the screen and
 * its performance tab cannot drift apart.
 */

/**
 * admin-v2's `str`: a missing pool field reads as an em dash, never "undefined".
 * The pool API is a separate service and most of its fields are optional, so
 * every value that reaches the screen goes through this.
 */
export const str = (v: unknown) => (v == null ? "—" : String(v));

/* --------------------------------------------------------------- Segmented */

/** The design's inset pill group. Wraps rather than scrolls, so a phone puts the
 *  period and scope groups on one toolbar row. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-[3px] rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-800"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-[30px] whitespace-nowrap rounded-md px-3 text-[12.5px] leading-none transition-colors",
              active
                ? "border border-zinc-200 bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                : "border border-transparent bg-transparent font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** The dim count that rides after a tab label ("Linked riders 3"). */
export function TabCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 tabular-nums text-zinc-400 dark:text-zinc-500">
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- Card head */

/** 13.5px card title strip with an optional grey meta capsule on the right. */
export function CardHead({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
      <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
        {title}
      </span>
      {meta ? (
        <span className="whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {meta}
        </span>
      ) : null}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Empty */

/** The icon + headline + sentence block every empty list on this screen uses. */
export function EmptyBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-11 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-zinc-100 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
        {icon}
      </span>
      <div className="text-[13.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
        {title}
      </div>
      {body ? (
        <div className="max-w-sm text-xs font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
          {body}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- Grid header */

/** The 11px uppercase header strip above a grid table. */
export function GridHead({
  grid,
  cols,
}: {
  grid: string;
  cols: { label: string; right?: boolean }[];
}) {
  return (
    <div className={cn(grid, "bg-zinc-50 dark:bg-zinc-800/60")}>
      {cols.map((c, i) => (
        <div
          key={i}
          className={cn(
            "whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500",
            c.right && "text-right",
          )}
        >
          {c.label}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- Row buttons */

/** The 30×30 outlined row button — neutral by default, red-on-hover for a
 *  destructive action. Same control the v3 Delivery Boys rows use. */
export function RowIconButton({
  onClick,
  title,
  tone = "neutral",
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border bg-white p-0 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800",
        tone === "danger"
          ? "text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-500"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700",
      )}
    >
      {children}
    </button>
  );
}

/** A figure that opens the order-by-order breakdown behind it. */
export function FigureButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="See the orders behind this figure"
      className="text-zinc-950 underline decoration-dotted underline-offset-4 transition-colors hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300"
    >
      {children}
    </button>
  );
}

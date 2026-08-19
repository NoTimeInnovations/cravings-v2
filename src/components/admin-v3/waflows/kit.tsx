"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small shared pieces for the admin-v3 WhatsApp Flows screens.
 *
 * These live here rather than in ui/primitives.tsx because they are specific to
 * the Flows list + Flow editor blocks of the design (36px form controls, the
 * 38×22 / 34×20 pill toggles, the grey trigger chips) and nothing else in v3
 * uses them yet.
 */

/* ------------------------------------------------------------------ toggle */

/**
 * The pill switch the design uses for "flow on / off". Two sizes: `md` (38×22,
 * the list rows and the greeting card) and `sm` (34×20, the editor header).
 *
 * ON is zinc-900 / dark:zinc-50 rather than green so it matches every other
 * toggle in admin-v3 — the green in the design's `togBg` placeholder is carried
 * by the state pill next to it instead.
 */
export function FlowToggle({
  on,
  onClick,
  disabled,
  label,
  size = "md",
}: {
  on: boolean;
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center rounded-full transition-colors",
        size === "md" ? "h-[22px] w-[38px] p-[2px]" : "h-5 w-[34px] p-[2px]",
        on
          ? "justify-end bg-zinc-900 dark:bg-zinc-50"
          : "justify-start bg-zinc-200 dark:bg-zinc-700",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white dark:bg-zinc-900",
          size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4",
        )}
      />
    </button>
  );
}

/* -------------------------------------------------------------------- chip */

/** The 11px grey capsule used for triggers, step kinds and counts. */
export function Chip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700",
        "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ form controls */

export const fieldLabelCls =
  "text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300";

export const inputCls =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal leading-none text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-300 " +
  "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600";

export const textareaCls =
  "min-h-[84px] w-full resize-y rounded-md border border-zinc-200 bg-white px-[11px] py-[9px] text-[13px] font-normal leading-[1.55] text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-300 " +
  "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600";

/** Label + control + optional hint, at the design's 6px / 12.5px rhythm. */
export function Field({
  label,
  hint,
  right,
  className,
  children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {(label || right) && (
        <div className="flex items-baseline gap-2">
          {label && <span className={cn(fieldLabelCls, "flex-1")}>{label}</span>}
          {right && (
            <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
              {right}
            </span>
          )}
        </div>
      )}
      <div className={label || right ? "mt-1.5" : undefined}>{children}</div>
      {hint && (
        <div className="mt-1.5 text-[12px] font-normal leading-[1.5] text-zinc-400 dark:text-zinc-500">
          {hint}
        </div>
      )}
    </div>
  );
}

/**
 * Native <select> dressed as the design's 36px picker button. Native rather
 * than the shadcn Select because the editor's inspector is inside a scrolling
 * pane and, below lg, a bottom sheet — a portalled popover fights both, and the
 * OS picker is the better control on a phone anyway.
 */
export function SelectField({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          inputCls,
          "appearance-none pr-8 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        strokeWidth={2}
        className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
      />
    </div>
  );
}

/* ------------------------------------------------------------- segmented */

export function Segmented({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-[3px] rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-800",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-[30px] rounded-md px-3 text-[12.5px] leading-none transition-colors",
        active
          ? "border border-zinc-200 bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
          : "border border-transparent font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50",
      )}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- labels */

/** The uppercase 11px section label above a palette group / the preview box. */
export function GroupLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500",
        className,
      )}
    >
      {children}
    </div>
  );
}

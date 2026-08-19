"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * admin-v3's local primitives.
 *
 * These deliberately do NOT reuse src/components/ui/{button,badge,progress,
 * switch}: v3's design uses a different radius scale (6px buttons, fully-round
 * pills), different heights (38px / 34px / 32px), different weights (700 on
 * primary buttons) and a zinc/green/amber palette that is not the repo's shadcn
 * token set (--primary is #171717; v3's dark buttons are #18181B and #09090B).
 * Bending the shared primitives to fit would change them for admin-v2 too.
 *
 * Every colour here is a stock Tailwind value — the whole design maps onto the
 * zinc, green, amber and red scales, so there are no custom tokens.
 */

/* ------------------------------------------------------------------ Button */

type ButtonVariant =
  | "primary"
  | "strong"
  | "secondary"
  | "small"
  | "icon"
  | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  // #18181B with a soft shadow — "Mark Ready", the sidebar Settings button.
  // In dark mode it inverts rather than darkens: a near-black button on a
  // near-black card would disappear.
  primary:
    "h-[38px] px-4 rounded-md bg-zinc-900 dark:bg-zinc-50 border border-zinc-900 dark:border-zinc-50 text-white dark:text-zinc-900 text-[13px] font-bold shadow-[0_1px_2px_0_rgba(9,9,11,.08)] hover:bg-zinc-700 dark:hover:bg-zinc-200",
  // #09090B, no shadow — "Assign rider", "Notify customer", "Upgrade plan".
  strong:
    "h-[38px] px-4 rounded-md bg-zinc-950 dark:bg-zinc-50 border border-zinc-950 dark:border-zinc-50 text-white dark:text-zinc-900 text-[13px] font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200",
  secondary:
    "h-[38px] px-[15px] rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[13px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700",
  small:
    "h-8 px-3 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[12.5px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700",
  icon: "h-[34px] w-[34px] rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700",
  // Filled, not outlined. Cancel sits beside a solid Accept / Mark Ready, and
  // an outline reads as the lesser, more tentative control — but cancelling is
  // the destructive branch and should look like a deliberate choice, not a
  // whisper. Kept identical in dark mode: red-600 carries on both grounds.
  danger:
    "h-[38px] px-4 rounded-md bg-red-600 border border-red-600 text-white text-[13px] font-bold hover:bg-red-700 dark:hover:bg-red-700",
};

export const AdminV3Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(({ className, variant = "secondary", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-1.5 leading-none whitespace-nowrap transition-colors",
      "disabled:pointer-events-none disabled:opacity-50",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-50 focus-visible:ring-offset-2 dark:ring-offset-zinc-950",
      BUTTON_VARIANTS[variant],
      className,
    )}
    {...props}
  />
));
AdminV3Button.displayName = "AdminV3Button";

/* --------------------------------------------------------------- StatusPill */

type PillTone = "amber" | "green" | "blue" | "neutral" | "outline";

const PILL_TONES: Record<PillTone, string> = {
  amber:
    "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 border-amber-200 dark:border-amber-900",
  green:
    "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900",
  // Accepted — "the kitchen has it", distinct from amber "waiting on you".
  blue:
    "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900",
  // Order-type badge — bordered.
  outline:
    "text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
  // Count pill — borderless, so it reads as a number not a label.
  neutral:
    "text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border-transparent",
};

export function StatusPill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-[9px] py-[2.5px] text-[11px] font-bold leading-none whitespace-nowrap",
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------- MiniProgress */

export function MiniProgress({
  value,
  className,
  animated = true,
}: {
  /** 0–100. Clamped, so a bad denominator can't overflow the track. */
  value: number;
  className?: string;
  animated?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full bg-zinc-900 dark:bg-zinc-50", animated && "transition-[width] duration-[400ms] ease-out")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- V3Card */

export function V3Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Full-bleed below lg: square, no side borders. On a phone the dashboard
        // drops its horizontal padding so cards run edge to edge, and a rounded,
        // outlined card flush against the viewport edge reads as a rendering
        // glitch rather than a card — the border has nowhere to sit. From lg up
        // the padding comes back and so does the card treatment.
        "rounded-none border-x-0 lg:rounded-xl lg:border-x",
        "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_0_rgba(9,9,11,.05)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

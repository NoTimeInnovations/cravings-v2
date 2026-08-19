"use client";

import * as React from "react";
import { ArrowLeft, Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Form atoms shared by the Menu screen's sub-views (item add / edit,
 * availability, priority, add category).
 *
 * These are deliberately local to the menu cluster rather than pushed into
 * admin-v3/ui/primitives: they are form controls, and the shared primitives file
 * covers page chrome (card, button, pill, progress). Everything here is a stock
 * Tailwind colour with a dark: pair, matching the rest of v3.
 */

/* ------------------------------------------------------------------ Toggle */

/**
 * The design's pill switch. Two sizes:
 *  - "sm" 36×20 with a 16px knob — item/category rows in the menu list.
 *  - "md" 38×22 with an 18px knob — everywhere inside a form.
 */
export function V3Toggle({
  checked,
  onChange,
  disabled,
  size = "md",
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}) {
  const sm = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border-0 p-[2px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-50 dark:ring-offset-zinc-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sm ? "h-5 w-9" : "h-[22px] w-[38px]",
        checked
          ? "justify-end bg-zinc-900 dark:bg-zinc-50"
          : "justify-start bg-zinc-200 dark:bg-zinc-700",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white shadow-[0_1px_2px_0_rgba(9,9,11,.2)] dark:bg-zinc-900",
          sm ? "h-4 w-4" : "h-[18px] w-[18px]",
        )}
      />
    </button>
  );
}

/* ---------------------------------------------------------------- Checkbox */

export function V3Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded p-0 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-50 dark:ring-offset-zinc-900",
        checked
          ? "border border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
          : "border-[1.5px] border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800",
        className,
      )}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  );
}

/* ------------------------------------------------------------ Text inputs */

const FIELD_BASE =
  "w-full rounded-md border border-zinc-200 bg-white text-zinc-950 outline-none placeholder:text-zinc-400 " +
  "focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 " +
  "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 " +
  "dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500";

export const V3Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(FIELD_BASE, "h-9 px-3 text-[13.5px] font-normal leading-none", className)}
    {...props}
  />
));
V3Input.displayName = "V3Input";

export const V3Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      FIELD_BASE,
      "min-h-[84px] resize-y px-3 py-2.5 text-[13.5px] font-normal leading-[1.5]",
      className,
    )}
    {...props}
  />
));
V3Textarea.displayName = "V3Textarea";

export function V3Label({
  children,
  className,
  htmlFor,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "block text-[13px] font-medium leading-none text-zinc-700 dark:text-zinc-300",
        className,
      )}
    >
      {children}
    </label>
  );
}

export function V3Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 text-xs font-normal leading-[1.45] text-zinc-500 dark:text-zinc-400">
      {children}
    </p>
  );
}

/** Currency-prefixed number field: a joined [₹][ 30 ] pair. */
export function V3PriceInput({
  prefix,
  value,
  onChange,
  placeholder,
  disabled,
  width = "w-[84px]",
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: string;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <span className="flex h-[34px] items-center rounded-l-md border border-r-0 border-zinc-200 bg-zinc-50 px-2.5 text-[12.5px] font-medium leading-none text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        {prefix}
      </span>
      <input
        type="number"
        inputMode="decimal"
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          FIELD_BASE,
          "h-[34px] rounded-l-none rounded-r-md px-2.5 text-[13px] font-normal leading-none",
          width,
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------- Seg tabs */

/** The design's inset segmented control (Food Type, choice mode, priority mode). */
export function V3Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  disabled,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-md bg-zinc-100 p-1 dark:bg-zinc-800",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex h-8 flex-1 items-center justify-center gap-[7px] whitespace-nowrap rounded-[5px] px-3 text-[13px] font-medium leading-none transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? "bg-white text-zinc-950 shadow-[0_1px_2px_0_rgba(9,9,11,.08)] dark:bg-zinc-950 dark:text-zinc-50"
                : "bg-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ Sub-view chrome */

/**
 * The sticky bar every sub-view opens with: back arrow, title + subtitle, and
 * whatever actions the view needs on the right.
 *
 * `sticky top-0` works because the scroll container is `main` in the v3 shell,
 * not this component — the bar pins under the app header exactly as the design
 * shows.
 */
export function SubViewHeader({
  title,
  subtitle,
  onBack,
  children,
  translateTitle = true,
  backLabel = "Back",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack: () => void;
  children?: React.ReactNode;
  /** Set false when the title is a partner-owned string (dish / category name). */
  translateTitle?: boolean;
  /** Accessible name for the back button. Say where it goes when it is not obvious. */
  backLabel?: string;
}) {
  return (
    <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        <ArrowLeft size={16} strokeWidth={2} />
      </button>
      <div className="min-w-0 flex-[1_1_180px]">
        <div
          translate={translateTitle ? undefined : "no"}
          className={cn(
            "truncate text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50",
            !translateTitle && "notranslate",
          )}
        >
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </div>
        )}
      </div>
      {children && (
        <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>
      )}
    </div>
  );
}

/** A white card with the design's 18px padding, used for every form section. */
export function FormCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-none border border-x-0 border-zinc-200 bg-white shadow-[0_1px_2px_0_rgba(9,9,11,.05)] lg:rounded-[10px] lg:border-x",
        "dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormCardHead({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 gap-y-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
          {title}
        </div>
        {description && (
          <div className="mt-[3px] text-[12.5px] font-normal leading-[1.45] text-zinc-500 dark:text-zinc-400">
            {description}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

/** One labelled switch row inside a bordered group (Visibility, Pricing). */
export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  last,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 px-4 py-3.5",
        !last && "border-b border-zinc-100 dark:border-zinc-800",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium leading-tight text-zinc-950 dark:text-zinc-50">
          {title}
        </div>
        {description && (
          <div className="mt-0.5 text-xs font-normal leading-[1.45] text-zinc-500 dark:text-zinc-400">
            {description}
          </div>
        )}
      </div>
      <V3Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  );
}

/** The design's plain 32×32 ghost icon button (row actions, remove buttons). */
export function GhostIconButton({
  children,
  onClick,
  title,
  tone = "neutral",
  size = 32,
  type = "button",
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  tone?: "neutral" | "danger";
  size?: number;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "danger"
          ? "text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950"
          : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** The design's small outlined chip button (Add Option, Manage, Reset…). */
export function ChipButton({
  children,
  onClick,
  disabled,
  type = "button",
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-[34px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[12.5px] font-medium leading-none transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "danger"
          ? "border-zinc-200 bg-transparent text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:text-red-500 dark:hover:bg-red-950"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Rounded neutral count pill ("8 items", "2 variants"). */
export function CountPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[2.5px] text-[11.5px] font-medium leading-normal text-zinc-600",
        "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

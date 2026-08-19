"use client";

import * as React from "react";
import { ArrowLeft, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Form atoms for the admin-v3 Discounts cluster.
 *
 * Deliberately local (like the menu cluster's formKit): admin-v3/ui/primitives
 * covers page chrome — card, button, pill, progress — not form controls, and the
 * discount editor needs a switch, a segmented control, labelled fields and a
 * menu-item picker. Every colour is stock Tailwind with a dark: pair.
 */

/* ------------------------------------------------------------------ Toggle */

/** The design's 38×22 pill switch (18px knob). */
export function V3Toggle({
  checked,
  onChange,
  disabled,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
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
        "inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border-0 p-[2px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-50 dark:ring-offset-zinc-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "justify-end bg-zinc-900 dark:bg-zinc-50"
          : "justify-start bg-zinc-200 dark:bg-zinc-700",
        className,
      )}
    >
      <span className="h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_0_rgba(9,9,11,.2)] dark:bg-zinc-900" />
    </button>
  );
}

/* -------------------------------------------------------------- Segmented */

export function V3Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-[3px] rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-800",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              active
                ? "h-[30px] rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] font-semibold leading-none text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                : "h-[30px] rounded-md border border-transparent bg-transparent px-3 text-[12.5px] font-medium leading-none text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- Fields */

const FIELD_BASE =
  "box-border w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal text-zinc-950 outline-none " +
  "placeholder:text-zinc-400 focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 " +
  "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 " +
  "dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500";

export const V3Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(FIELD_BASE, "h-9 leading-none", className)} {...props} />
));
V3Input.displayName = "V3Input";

export const V3Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(FIELD_BASE, "min-h-[62px] resize-y py-[9px] leading-normal", className)}
    {...props}
  />
));
V3Textarea.displayName = "V3Textarea";

/** Field label with an optional grey hint sitting on the same baseline. */
export function V3Label({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
        {children}
      </span>
      {hint && (
        <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
          {hint}
        </span>
      )}
    </div>
  );
}

export function V3Hint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-[12px] font-normal leading-normal text-zinc-400 dark:text-zinc-500",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Label + input in one block, matching the design's 6px gap. */
export function V3Field({
  label,
  hint,
  below,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  below?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <V3Label hint={hint}>{label}</V3Label>
      <div className="mt-1.5">{children}</div>
      {below && <V3Hint className="mt-1.5">{below}</V3Hint>}
    </div>
  );
}

/* ------------------------------------------------------------- Card chrome */

export function CardHead({ title, right }: { title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
      <span className="flex-auto text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
        {title}
      </span>
      {right}
    </div>
  );
}

/** The small grey capsule the design uses for "All optional" / "Lower rank wins". */
export function MetaPill({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
    >
      {children}
    </span>
  );
}

/** A settings row: title, explanation, control on the right. */
export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  last,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-[11px]",
        !last && "border-b border-zinc-100 dark:border-zinc-800",
      )}
    >
      <div className="min-w-0 flex-auto">
        <div className="text-[13px] font-medium leading-tight text-zinc-950 dark:text-zinc-50">
          {title}
        </div>
        <div className="mt-0.5 text-[12px] font-normal leading-normal text-zinc-400 dark:text-zinc-500">
          {description}
        </div>
      </div>
      <V3Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  );
}

/* ------------------------------------------------------------ Sub-view bar */

export function SubViewHeader({
  title,
  subtitle,
  onBack,
  backLabel = "Back to discounts",
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack: () => void;
  backLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-[6] flex flex-wrap items-center gap-3 gap-y-2.5 border-b border-zinc-200 bg-white/90 px-[clamp(14px,3vw,28px)] py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        <ArrowLeft size={17} strokeWidth={1.8} />
      </button>
      <div className="min-w-0 flex-[1_1_200px]">
        <div className="truncate text-base font-semibold leading-tight tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-[12.5px] font-normal leading-tight text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </div>
        )}
      </div>
      {children && <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/* --------------------------------------------------------------- Chip / icon */

/** A tick-able chip — order types, weekday letters, quick value picks. */
export function ChipButton({
  active,
  onClick,
  className,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-[34px] shrink-0 items-center gap-[7px] rounded-md border px-3 text-[13px] font-medium leading-none transition-colors",
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** 30×30 outlined square button used for the row actions (copy / edit / delete). */
export function IconBtn({
  onClick,
  label,
  danger,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border p-0 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "border-zinc-200 bg-white text-zinc-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------- Menu item picker */

export type PickedItem = { id: string; name: string };

/**
 * Search-and-chip menu picker — the same selection model as admin-v2's, right
 * down to de-duplicating by NAME so a menu holding three "Veg Momo" rows offers
 * one choice rather than three identical-looking ones.
 */
export function MenuItemPicker({
  label,
  hint,
  menuItems,
  selected,
  onChange,
  currency,
}: {
  label: string;
  hint?: string;
  menuItems: { id: string; name: string; price: number }[];
  selected: PickedItem[];
  onChange: (next: PickedItem[]) => void;
  currency: string;
}) {
  const [search, setSearch] = React.useState("");

  const taken = new Set(selected.map((s) => s.name.trim().toLowerCase()));
  const seen = new Set<string>();
  const matches = menuItems.filter((item) => {
    const key = item.name.trim().toLowerCase();
    if (taken.has(key) || seen.has(key)) return false;
    if (!key.includes(search.trim().toLowerCase())) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="min-w-0">
      <V3Label hint={hint}>{label}</V3Label>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item.id}
              translate="no"
              className="notranslate inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-1 text-[12px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {item.name}
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                onClick={() => onChange(selected.filter((i) => i.id !== item.id))}
                className="text-zinc-400 transition-colors hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
              >
                <X size={12} strokeWidth={2.2} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative mt-2">
        <Search
          size={14}
          strokeWidth={1.8}
          className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
        />
        <V3Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu items…"
          className="pl-8"
        />
      </div>
      {search.trim() !== "" && (
        <div className="mt-1.5 max-h-40 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700">
          {matches.slice(0, 10).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChange([...selected, { id: item.id, name: item.name }]);
                setSearch("");
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] leading-tight text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span translate="no" className="notranslate truncate">
                {item.name}
              </span>
              <span className="shrink-0 text-[12px] tabular-nums text-zinc-400 dark:text-zinc-500">
                {currency}
                {item.price}
              </span>
            </button>
          ))}
          {matches.length === 0 && (
            <p className="px-3 py-2 text-[13px] text-zinc-400 dark:text-zinc-500">No items found</p>
          )}
        </div>
      )}
    </div>
  );
}

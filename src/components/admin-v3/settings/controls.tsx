"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";

import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { useAdminSettingsStore } from "@/store/adminSettingsStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

import { V3Card } from "../ui/primitives";

/**
 * The shared vocabulary of the v3 settings screens.
 *
 * Every section is the same five shapes — a card, a labelled field, a toggle
 * row, a segmented picker and a grey note — so they are defined once here and
 * never restyled per section. Sizes come straight from the design: 36px inputs,
 * 6px radius, 12.5px labels, 12px hints, 38x22 switches.
 */

/* --------------------------------------------------------------- sub-page */

/**
 * A section taking over the whole Settings screen — the map picker today.
 *
 * The section owns the state that opens it, but the BREADCRUMB and the tab bar
 * belong to AdminV3Settings one level up. Rather than lift the section's draft
 * out of the section, a section just declares "I am showing a sub-page called
 * X, and here is how to leave it"; the shell extends the breadcrumb to
 * `Settings / <section> / X`, hides the tab bar, and points its back arrow at
 * onBack.
 */
export interface SettingsSubPage {
  title: string;
  /** Replaces the section's hint under the breadcrumb. */
  hint?: string;
  onBack: () => void;
}

const SubPageCtx = React.createContext<(p: SettingsSubPage | null) => void>(
  () => {},
);

export const SettingsSubPageProvider = SubPageCtx.Provider;

/**
 * Declare a sub-page for as long as `page` is non-null.
 *
 * Passing null (or unmounting) clears it, so a section cannot leave the shell
 * stuck showing a breadcrumb for a screen that is no longer rendered.
 */
export function useDeclareSubPage(page: SettingsSubPage | null) {
  const declare = React.useContext(SubPageCtx);
  const title = page?.title ?? null;
  const hint = page?.hint;

  // onBack is an inline arrow at every call site, so it is a NEW function on
  // every render. Listing it as an effect dep would re-declare on every render
  // — and declaring sets state in the shell, which re-renders the section,
  // which makes another arrow: an infinite loop. Keep the latest one in a ref
  // and hand the shell a stable wrapper, so the effect only depends on the two
  // strings.
  const backRef = React.useRef(page?.onBack);
  backRef.current = page?.onBack;
  const onBack = React.useCallback(() => backRef.current?.(), []);

  React.useEffect(() => {
    declare(title ? { title, hint, onBack } : null);
    return () => declare(null);
  }, [declare, title, hint, onBack]);
}

/* ------------------------------------------------------------------ shell */

export function SettingsCard({
  title,
  meta,
  children,
  className,
  bodyClassName,
}: {
  /** Optional card header. Omitted, the card is body-only (the common case). */
  title?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Escape hatch for a card whose body is a full-bleed list, not a form. */
  bodyClassName?: string;
}) {
  return (
    <V3Card className={className}>
      {title ? (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-zinc-100 px-4 py-[13px] dark:border-zinc-800">
          <span className="flex-1 text-[13.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
            {title}
          </span>
          {meta}
        </div>
      ) : null}
      <div className={cn("flex flex-col gap-3.5 px-4 py-3.5", bodyClassName)}>
        {children}
      </div>
    </V3Card>
  );
}

/** The grey chip the design uses for counts and states. */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-100 px-[9px] py-[3px] text-[11px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  );
}

/** A tinted status chip — green when a thing is live, amber when it is not. */
export function StateChip({
  tone,
  children,
}: {
  tone: "green" | "amber" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none",
        tone === "green" &&
          "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
        tone === "amber" &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
        tone === "neutral" &&
          "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
      )}
    >
      {children}
    </span>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-[11px] dark:border-zinc-800 dark:bg-zinc-800/40">
      <Info className="mt-px h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
      <span className="text-[12px] leading-[1.55] text-zinc-500 dark:text-zinc-400">
        {children}
      </span>
    </div>
  );
}

export function EmptyBox({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3.5 py-5 text-center dark:border-zinc-700 dark:bg-zinc-800/40">
      <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
        {title}
      </div>
      {hint ? (
        <div className="mt-[3px] text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/** A row of fields that wrap at ~190px, matching `flex:1 1 190px` in the design. */
export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}

/* ----------------------------------------------------------------- fields */

const INPUT_CLASS =
  "mt-1.5 h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal leading-none text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      {hint ? (
        <span className="text-[12px] font-normal leading-none text-zinc-400 dark:text-zinc-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  disabled,
  translateNo,
  basis = "190px",
  inputMode,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "url" | "time" | "date";
  maxLength?: number;
  disabled?: boolean;
  /** Partner-owned text (store name, address) — never machine-translated. */
  translateNo?: boolean;
  basis?: string;
  inputMode?: "text" | "tel" | "url" | "email" | "numeric" | "decimal";
}) {
  return (
    <div className="min-w-0 flex-[1_1_var(--fb)]" style={{ "--fb": basis } as React.CSSProperties}>
      <FieldLabel label={label} hint={hint} />
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...(translateNo ? { translate: "no" as const } : {})}
        className={cn(INPUT_CLASS, translateNo && "notranslate")}
      />
    </div>
  );
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max,
  placeholder,
  disabled,
  basis = "190px",
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  basis?: string;
}) {
  return (
    <div className="min-w-0 flex-[1_1_var(--fb)]" style={{ "--fb": basis } as React.CSSProperties}>
      <FieldLabel label={label} hint={hint} />
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        disabled={disabled}
        placeholder={placeholder}
        value={Number.isFinite(value) ? String(value) : ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(min);
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          const clampedLow = Math.max(min, n);
          onChange(max != null ? Math.min(max, clampedLow) : clampedLow);
        }}
        className={cn(INPUT_CLASS, "tabular-nums")}
      />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
  basis = "190px",
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  basis?: string;
  disabled?: boolean;
}) {
  // A native select rather than a custom combobox: the currency and timezone
  // lists run to hundreds of entries, and every platform's own picker is faster
  // to search and far better on a phone than anything rebuilt here.
  return (
    <div className="min-w-0 flex-[1_1_var(--fb)]" style={{ "--fb": basis } as React.CSSProperties}>
      <FieldLabel label={label} hint={hint} />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(INPUT_CLASS, "cursor-pointer appearance-none bg-[length:16px] pr-8")}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------------------------------------------------------------- toggles */

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: "md" | "sm";
}) {
  const track = size === "md" ? "h-[22px] w-[38px]" : "h-5 w-[34px]";
  const knob = size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex shrink-0 items-center rounded-full p-[2px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-50 dark:ring-offset-zinc-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
        track,
        checked
          ? "justify-end bg-zinc-900 dark:bg-zinc-50"
          : "justify-start bg-zinc-200 dark:bg-zinc-700",
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white",
          knob,
          checked && "dark:bg-zinc-900",
        )}
      />
    </button>
  );
}

export function ToggleRow({
  title,
  desc,
  checked,
  onChange,
  disabled,
  divider,
}: {
  title: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-[11px]",
        divider && "border-b border-zinc-100 dark:border-zinc-800",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
          {title}
        </div>
        {desc ? (
          <div className="mt-1 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
            {desc}
          </div>
        ) : null}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

/* -------------------------------------------------------------- segmented */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-wrap gap-[3px] rounded-lg border border-zinc-200 bg-zinc-100 p-[3px] dark:border-zinc-700 dark:bg-zinc-800",
        className,
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "h-[30px] shrink-0 whitespace-nowrap rounded-md px-3 text-[12.5px] leading-none transition-colors",
              on
                ? "border border-zinc-200 bg-white font-semibold text-zinc-950 shadow-[0_1px_2px_rgba(9,9,11,.06)] dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-50"
                : "border border-transparent font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** A labelled segmented picker on its own line, as the design lays it out. */
export function SegmentedField<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <div className="text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300">
        {label}
      </div>
      {hint ? (
        <div className="mt-1 text-[12px] leading-[1.5] text-zinc-400 dark:text-zinc-500">
          {hint}
        </div>
      ) : null}
      <div className="mt-2">
        <Segmented value={value} onChange={onChange} options={options} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------- the save wiring */

/**
 * One section's draft, dirty state and save action.
 *
 * Identical mechanics to admin-v2: the section registers a save action on
 * `useAdminSettingsStore`, the chrome renders one Save button for it, and the
 * write is always `updatePartner` -> `revalidateTag` -> `setState` so the auth
 * store and the ISR cache agree with the row.
 *
 * `read` and `build` are module-level functions in every section: `read` runs on
 * each render (it is what dirty-checking compares against) and `build` is a
 * dependency of the save closure, so inline arrows would only add churn.
 */
export function useSectionDraft<T extends object>(
  read: (partner: any) => T,
  build: (draft: T, partner: any) => Record<string, unknown>,
  successMessage: string,
  /**
   * Ran after a successful write, for follow-up work the partner row alone
   * cannot do — pushing provider groups to the delivery bridge, say. Failures
   * are logged, never surfaced: the settings ARE saved by this point, and
   * reporting an error would tell the partner otherwise.
   */
  afterSave?: (partnerId: string) => void | Promise<void>,
) {
  const userData = useAuthStore((s) => s.userData);
  const setPartnerState = useAuthStore((s) => s.setState);
  const setSaveAction = useAdminSettingsStore((s) => s.setSaveAction);
  const setIsSaving = useAdminSettingsStore((s) => s.setIsSaving);
  const setHasChanges = useAdminSettingsStore((s) => s.setHasChanges);

  const stored = read(userData);
  const storedSig = JSON.stringify(stored);

  const [draft, setDraft] = React.useState<T>(stored);

  // Re-hydrate whenever the stored row actually changes value — on first load
  // (userData arrives async) and after a save writes back through setState.
  // Comparing the serialised value, not object identity, keeps an unrelated
  // auth-store update from throwing away what the partner is typing.
  const lastSigRef = React.useRef(storedSig);
  React.useEffect(() => {
    if (lastSigRef.current === storedSig) return;
    lastSigRef.current = storedSig;
    setDraft(JSON.parse(storedSig) as T);
  }, [storedSig]);

  const dirty = JSON.stringify(draft) !== storedSig;

  /**
   * `override` lets a caller save fields it just computed without waiting a
   * render for setDraft to land — the gateway page turns "Online payment" on as
   * part of its own save, and patching then saving would write the stale draft.
   */
  const save = React.useCallback(async (override?: Partial<T>) => {
    if (!userData) return;
    const effective = override ? ({ ...draft, ...override } as T) : draft;
    setIsSaving(true);
    try {
      const updates = build(effective, userData);
      await updatePartner((userData as any).id, updates);
      await revalidateTag((userData as any).id);
      setPartnerState(updates as any);
      if (override) setDraft(effective);
      toast.success(successMessage);
      if (afterSave) {
        try {
          await afterSave((userData as any).id);
        } catch (err) {
          console.warn("[admin-v3 settings] afterSave failed:", err);
        }
      }
    } catch (err) {
      console.error("[admin-v3 settings] save failed:", err);
      toast.error("Could not save — please try again");
    } finally {
      setIsSaving(false);
    }
  }, [draft, userData, build, successMessage, setIsSaving, setPartnerState, afterSave]);

  // The registered action is a STABLE wrapper over the latest `save`. Handing the
  // store a fresh closure on every keystroke would write to global state — and
  // so re-render the whole settings screen — on every character typed; this way
  // the store is touched only when the dirty flag actually flips.
  const saveRef = React.useRef(save);
  React.useEffect(() => {
    saveRef.current = save;
  }, [save]);
  const stableSave = React.useCallback(() => saveRef.current(), []);

  React.useEffect(() => {
    setSaveAction(dirty ? stableSave : null);
    setHasChanges(dirty);
  }, [dirty, stableSave, setSaveAction, setHasChanges]);

  // Leaving the section drops the pending save so the chrome's button can never
  // fire a write belonging to a screen that is no longer open.
  React.useEffect(
    () => () => {
      setSaveAction(null);
      setHasChanges(false);
    },
    [setSaveAction, setHasChanges],
  );

  const patch = React.useCallback(
    (p: Partial<T>) => setDraft((d) => ({ ...d, ...p }) as T),
    [],
  );

  return { partner: userData as any, draft, setDraft, patch, dirty, save };
}

/* ------------------------------------------------------------------ utils */

/** delivery_rules / storefront_settings / theme are jsonb that may be a string. */
export function parseJson(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, any>;
  try {
    const v = JSON.parse(String(raw));
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export function currencyOf(partner: any): string {
  return partner?.currency || "₹";
}

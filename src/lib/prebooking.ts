// Prebooking (scheduled orders) helpers shared by the checkout modals.
// All times are treated as restaurant-local; no timezone conversion is applied
// (the customer's device clock is used to filter past/too-soon slots).

import {
    PrebookingSettings,
    PrebookingWindow,
    OrderTypesEnabled,
    DEFAULT_ORDER_TYPES_ENABLED,
    DEFAULT_PREBOOKING_SETTINGS,
} from "@/store/orderStore";
import { getFeatures } from "@/lib/getFeatures";

/** Interval used only to back-fill legacy {from,to} windows into explicit slots. */
export const PREBOOK_SLOT_INTERVAL_MIN = 30;

export type PrebookOrderType = "delivery" | "takeaway" | "dine_in";

export function parsePrebookingSettings(raw: unknown): PrebookingSettings | null {
    if (!raw) return null;
    try {
        const p = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!p || typeof p !== "object") return null;
        return p as PrebookingSettings;
    } catch {
        return null;
    }
}

/** True when the partner has the prebooking flag enabled and valid settings. */
export function isPrebookingEnabled(featureFlags: string | null | undefined): boolean {
    return !!getFeatures(featureFlags || null).prebooking?.enabled;
}

/** Map a cravings order to the prebooking order-type key. */
export function resolvePrebookOrderType(
    type?: string | null,
    isTakeaway?: boolean
): PrebookOrderType {
    if (type === "table_order") return "dine_in";
    if (type === "delivery" && isTakeaway) return "takeaway";
    return "delivery";
}

export function isOrderTypeAllowed(
    settings: PrebookingSettings,
    orderType: PrebookOrderType
): boolean {
    return (settings.allowed_order_types ?? []).includes(orderType);
}

function toMinutes(hhmm: string): number {
    const [h, m] = (hhmm || "00:00").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

function fmt(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
}

/**
 * Explicit slot times for a window, normalized + sorted. Uses `win.slots` when
 * present; otherwise back-fills a legacy `{from,to}` window into 30-min times.
 */
export function windowSlotTimes(win: PrebookingWindow | undefined): string[] {
    if (!win) return [];
    let times: string[] = [];
    // Prefer explicit ranges (lunch+dinner etc.); fall back to a legacy single
    // {from,to}; finally legacy explicit slots.
    const ranges =
        win.ranges && win.ranges.length
            ? win.ranges
            : win.from && win.to
              ? [{ from: win.from, to: win.to }]
              : [];
    if (ranges.length) {
        for (const r of ranges) {
            const start = toMinutes(r.from);
            const end = toMinutes(r.to);
            for (let t = start; t <= end && end > start; t += PREBOOK_SLOT_INTERVAL_MIN) times.push(fmt(t));
        }
    } else if (Array.isArray(win.slots) && win.slots.length) {
        times = win.slots;
    }
    // normalize to zero-padded HH:MM, dedup, sort by time-of-day
    const norm = Array.from(new Set(times.map((t) => fmt(toMinutes(t)))));
    return norm.sort((a, b) => toMinutes(a) - toMinutes(b));
}

/**
 * Valid "HH:MM" slots for a given date: the weekday's explicit slot times,
 * filtered to those at least `min_lead_time_minutes` from now (absolute, so
 * multi-day lead times work). Returns [] when the day is disabled / has no slots.
 */
export function getPrebookingSlots(
    settings: PrebookingSettings,
    dateStr: string,
    now: Date = new Date(),
    opts: { dineIn?: boolean } = {}
): string[] {
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return [];
    const weekday = date.getDay();
    // Dine-in reservations use their own slot set; fall back to `windows` for
    // legacy configs saved before dine_in_windows existed.
    const windows = opts.dineIn
        ? (settings.dine_in_windows ?? settings.windows)
        : settings.windows;
    const win = (windows ?? []).find((w) => w.day === weekday);
    if (!win || !win.enabled) return [];

    const leadMinutes = opts.dineIn
        ? (settings.dine_in_min_lead_time_minutes ?? settings.min_lead_time_minutes ?? 0)
        : (settings.min_lead_time_minutes ?? 0);
    const earliestAbs = now.getTime() + leadMinutes * 60_000;
    return windowSlotTimes(win).filter(
        (hhmm) => new Date(`${dateStr}T${hhmm}:00`).getTime() >= earliestAbs
    );
}

/**
 * Selectable dates that have at least one valid slot. By default spans
 * today … max_advance_days, but `fromOffset` / `throughDay` let callers (e.g. the
 * checkout picker) override the window — the picker uses tomorrow … +30 days.
 */
export function getPrebookingDates(
    settings: PrebookingSettings,
    now: Date = new Date(),
    opts: { dineIn?: boolean; fromOffset?: number; throughDay?: number } = {}
): { value: string; label: string }[] {
    const out: { value: string; label: string }[] = [];
    const defaultMax = opts.dineIn
        ? (settings.dine_in_max_advance_days ?? settings.max_advance_days ?? 0)
        : (settings.max_advance_days ?? 0);
    const from = Math.max(0, opts.fromOffset ?? 0);
    const through = Math.max(from, opts.throughDay ?? defaultMax);
    for (let i = from; i <= through; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const dateStr = ymd(d);
        if (getPrebookingSlots(settings, dateStr, now, opts).length === 0) continue;
        const label =
            i === 0
                ? "Today"
                : i === 1
                  ? "Tomorrow"
                  : d.toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                    });
        out.push({ value: dateStr, label });
    }
    return out;
}

/**
 * The open ranges for a given date's weekday (e.g. lunch + dinner), as the
 * partner configured them. Handles new `ranges`, legacy single `from/to`, and
 * legacy explicit `slots` (collapsed into one range). Returns [] when the day is
 * disabled / unconfigured.
 */
export function getPrebookingRanges(
    settings: PrebookingSettings,
    dateStr: string,
    opts: { dineIn?: boolean } = {}
): { from: string; to: string }[] {
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return [];
    const weekday = date.getDay();
    const windows = opts.dineIn ? (settings.dine_in_windows ?? settings.windows) : settings.windows;
    const win = (windows ?? []).find((w) => w.day === weekday);
    if (!win || !win.enabled) return [];
    if (win.ranges && win.ranges.length) {
        return win.ranges.map((r) => ({ from: fmt(toMinutes(r.from)), to: fmt(toMinutes(r.to)) }));
    }
    if (win.from && win.to) return [{ from: fmt(toMinutes(win.from)), to: fmt(toMinutes(win.to)) }];
    const times = windowSlotTimes(win); // legacy discrete slots → one collapsed range
    if (times.length) return [{ from: times[0], to: times[times.length - 1] }];
    return [];
}

/** "14:30" -> "2:30 PM" for display. */
export function formatSlotLabel(hhmm: string): string {
    const [h24, m] = (hhmm || "00:00").split(":").map(Number);
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Normalize a saved window array onto the 7-day default, each day expressed as a
 * `ranges: [{from,to}]` list. Legacy configs (single from/to, or explicit slots)
 * are collapsed into a single range so they keep working.
 */
function normalizeWindows(
    saved: PrebookingWindow[] | undefined,
    base: PrebookingWindow[]
): PrebookingWindow[] {
    const byDay = new Map((saved ?? []).map((w) => [w.day, w]));
    return base.map((def) => {
        const s = byDay.get(def.day);
        if (!s) return def;
        let ranges = s.ranges?.length ? s.ranges : undefined;
        if (!ranges) {
            if (s.from && s.to) {
                ranges = [{ from: s.from, to: s.to }];
            } else if (Array.isArray(s.slots) && s.slots.length) {
                const times = windowSlotTimes(s); // sorted HH:MM
                if (times.length) ranges = [{ from: times[0], to: times[times.length - 1] }];
            }
        }
        return {
            day: def.day,
            enabled: s.enabled ?? true,
            ranges: ranges && ranges.length ? ranges : def.ranges,
        };
    });
}

/**
 * Parse + normalize a partner's `prebooking_settings` into a full config, filling
 * defaults and back-filling legacy fields (dine-in lead/max/slots inherit from the
 * shared prebooking values when absent). Shared by the Prebooking & Slot Booking tabs.
 */
export function mergePrebookingConfig(raw: unknown): PrebookingSettings {
    const base = structuredClone(DEFAULT_PREBOOKING_SETTINGS);
    let parsed: any = null;
    if (raw) {
        try {
            parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
            parsed = null;
        }
    }
    if (!parsed || typeof parsed !== "object") return base;
    const num = (v: any, fallback: number) => (typeof v === "number" ? v : fallback);
    return {
        // Independent master toggles (default ON for back-compat with existing partners).
        prebooking_enabled: parsed.prebooking_enabled !== false,
        slot_booking_enabled: parsed.slot_booking_enabled !== false,
        min_lead_time_minutes: num(parsed.min_lead_time_minutes, base.min_lead_time_minutes),
        max_advance_days: num(parsed.max_advance_days, base.max_advance_days),
        windows: normalizeWindows(parsed.windows, base.windows),
        allowed_order_types: parsed.allowed_order_types?.length
            ? parsed.allowed_order_types
            : base.allowed_order_types,
        dine_in_min_lead_time_minutes: num(
            parsed.dine_in_min_lead_time_minutes,
            num(parsed.min_lead_time_minutes, base.dine_in_min_lead_time_minutes)
        ),
        dine_in_max_advance_days: num(
            parsed.dine_in_max_advance_days,
            num(parsed.max_advance_days, base.dine_in_max_advance_days)
        ),
        dine_in_windows: normalizeWindows(parsed.dine_in_windows ?? parsed.windows, base.dine_in_windows),
    };
}

/** Parse partners.order_types_enabled JSON; NULL/invalid ⇒ all enabled (back-compat). */
export function parseOrderTypesEnabled(raw: unknown): OrderTypesEnabled {
    if (!raw) return { ...DEFAULT_ORDER_TYPES_ENABLED };
    try {
        const p = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!p || typeof p !== "object") return { ...DEFAULT_ORDER_TYPES_ENABLED };
        return {
            delivery: (p as any).delivery !== false,
            takeaway: (p as any).takeaway !== false,
            dine_in: (p as any).dine_in !== false,
        };
    } catch {
        return { ...DEFAULT_ORDER_TYPES_ENABLED };
    }
}

/** Convenience: is a given order type offered by this partner? */
export function isOrderTypeOffered(
    rawOrderTypesEnabled: unknown,
    type: PrebookOrderType
): boolean {
    return parseOrderTypesEnabled(rawOrderTypesEnabled)[type];
}

/**
 * Display label for a booked slot. Orders persist only the slot's start time, so
 * we resolve the full "from – to" range from the partner's settings (matching the
 * range whose start equals the saved time). Falls back to the single time when no
 * range matches (e.g. the partner changed their hours) or settings are missing.
 */
export function formatPrebookSlotLabel(
    settings: PrebookingSettings | null | undefined,
    dateStr: string,
    time: string | null | undefined,
    opts: { dineIn?: boolean; to?: string | null } = {}
): string {
    if (!time) return "";
    const from = fmt(toMinutes(time.slice(0, 5)));
    // Prefer the slot end stored on the order; fall back to resolving it from the
    // partner's current settings; finally show just the start time.
    let to = opts.to ? fmt(toMinutes(opts.to.slice(0, 5))) : null;
    if (!to && settings) {
        const r = getPrebookingRanges(settings, dateStr, opts).find((x) => x.from === from);
        if (r) to = r.to;
    }
    return to && to !== from ? `${formatSlotLabel(from)} – ${formatSlotLabel(to)}` : formatSlotLabel(from);
}

/** "2026-06-10" -> "Wed, 10 Jun" for display (or Today/Tomorrow). */
export function formatPrebookDateLabel(dateStr: string, now: Date = new Date()): string {
    if (!dateStr) return "";
    if (dateStr === ymd(now)) return "Today";
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (dateStr === ymd(tomorrow)) return "Tomorrow";
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

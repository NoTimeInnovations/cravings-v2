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
    if (Array.isArray(win.slots) && win.slots.length) {
        times = win.slots;
    } else if (win.from && win.to) {
        const start = toMinutes(win.from);
        const end = toMinutes(win.to);
        for (let t = start; t <= end && end > start; t += PREBOOK_SLOT_INTERVAL_MIN) times.push(fmt(t));
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

/** Selectable dates (today … max_advance_days) that have at least one valid slot. */
export function getPrebookingDates(
    settings: PrebookingSettings,
    now: Date = new Date(),
    opts: { dineIn?: boolean } = {}
): { value: string; label: string }[] {
    const out: { value: string; label: string }[] = [];
    const maxDays = Math.max(
        0,
        opts.dineIn
            ? (settings.dine_in_max_advance_days ?? settings.max_advance_days ?? 0)
            : (settings.max_advance_days ?? 0)
    );
    for (let i = 0; i <= maxDays; i++) {
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

/** "14:30" -> "2:30 PM" for display. */
export function formatSlotLabel(hhmm: string): string {
    const [h24, m] = (hhmm || "00:00").split(":").map(Number);
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Normalize a saved window array onto the 7-day default, each day expressed as a
 * `{from, to}` open range. Legacy configs that stored explicit `slots` are
 * collapsed into the earliest→latest range so they keep working.
 */
function normalizeWindows(
    saved: PrebookingWindow[] | undefined,
    base: PrebookingWindow[]
): PrebookingWindow[] {
    const byDay = new Map((saved ?? []).map((w) => [w.day, w]));
    return base.map((def) => {
        const s = byDay.get(def.day);
        if (!s) return def;
        let from = s.from;
        let to = s.to;
        if ((!from || !to) && Array.isArray(s.slots) && s.slots.length) {
            const times = windowSlotTimes(s); // sorted HH:MM
            from = from || times[0];
            to = to || times[times.length - 1];
        }
        return {
            day: def.day,
            enabled: s.enabled ?? true,
            from: from || def.from,
            to: to || def.to,
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

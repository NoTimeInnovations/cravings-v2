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

/** Local "YYYY-MM-DD" for a Date (device timezone). */
export function ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
}

/** Whole-day offset from `now`'s local date to a YYYY-MM-DD date (DST-safe via
 *  local-midnight diff). Returns null for a malformed date string. */
function dayOffsetFrom(now: Date, dateStr: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || "").trim());
    if (!m) return null;
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetMid = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
    return Math.round((targetMid - todayMid) / 86_400_000);
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

/** Rolling config for the given order kind (defaults: 15 min, 2 slots). */
function rollingConfig(settings: PrebookingSettings, dineIn?: boolean) {
    const mode = dineIn ? settings.dine_in_slot_mode : settings.slot_mode;
    const interval =
        (dineIn ? settings.dine_in_rolling_interval_minutes : settings.rolling_interval_minutes) ?? 15;
    const count =
        (dineIn ? settings.dine_in_rolling_slot_count : settings.rolling_slot_count) ?? 2;
    return { rolling: mode === "rolling", interval: Math.max(1, interval), count: Math.max(1, count) };
}

/**
 * Rolling slots: discrete pickup times at `now + interval`, `now + 2*interval`, …
 * up to `count`, within today. Each is a point-in-time slot (from === to). These
 * roll forward with the clock, so the checkout re-computes them periodically.
 */
export function getRollingSlots(
    intervalMin: number,
    count: number,
    now: Date = new Date()
): { from: string; to: string }[] {
    const base = now.getHours() * 60 + now.getMinutes();
    const out: { from: string; to: string }[] = [];
    for (let i = 1; i <= count; i++) {
        const m = base + intervalMin * i;
        if (m >= 24 * 60) break; // stay within today
        const t = fmt(m);
        out.push({ from: t, to: t });
    }
    return out;
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
    const rollingCfg = rollingConfig(settings, opts.dineIn);
    if (rollingCfg.rolling) {
        // Rolling slots are now-relative → offer only today (when it has slots).
        return getRollingSlots(rollingCfg.interval, rollingCfg.count, now).length > 0
            ? [{ value: ymd(now), label: "Today" }]
            : [];
    }
    const out: { value: string; label: string }[] = [];
    const todayOnly = opts.dineIn
        ? (settings.dine_in_today_only ?? false)
        : (settings.today_only ?? false);
    const defaultMax = opts.dineIn
        ? (settings.dine_in_max_advance_days ?? settings.max_advance_days ?? 0)
        : (settings.max_advance_days ?? 0);
    const startDate = opts.dineIn ? settings.dine_in_start_date : settings.start_date;
    const endDate = opts.dineIn ? settings.dine_in_end_date : settings.end_date;
    const startOff = startDate ? dayOffsetFrom(now, startDate) : null;
    const endOff = endDate ? dayOffsetFrom(now, endDate) : null;

    let from: number;
    let through: number;
    if (todayOnly) {
        from = 0;
        through = 0;
    } else if (startOff != null || endOff != null) {
        // An absolute calendar window from settings overrides the relative range.
        // No final Math.max(from, through): an end before the start (or already in
        // the past) intentionally yields zero selectable dates.
        from = startOff != null ? Math.max(0, startOff) : Math.max(0, opts.fromOffset ?? 0);
        // With no end_date, keep an open-ended window anchored at the start (a
        // fixed span from `from`) rather than max(from, throughDay), which would
        // collapse to a single day when the start is beyond the default horizon.
        through = endOff != null ? endOff : from + (opts.throughDay ?? defaultMax);
    } else {
        from = Math.max(0, opts.fromOffset ?? 0);
        through = Math.max(from, opts.throughDay ?? defaultMax);
    }
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
    opts: { dineIn?: boolean; now?: Date } = {}
): { from: string; to: string }[] {
    const rollingCfg = rollingConfig(settings, opts.dineIn);
    if (rollingCfg.rolling) {
        // Rolling slots are now-relative → only today has them.
        const rnow = opts.now ?? new Date();
        if (dateStr !== ymd(rnow)) return [];
        return getRollingSlots(rollingCfg.interval, rollingCfg.count, rnow);
    }
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return [];
    const weekday = date.getDay();
    const windows = opts.dineIn ? (settings.dine_in_windows ?? settings.windows) : settings.windows;
    const win = (windows ?? []).find((w) => w.day === weekday);
    if (!win || !win.enabled) return [];
    let ranges: { from: string; to: string }[];
    if (win.ranges && win.ranges.length) {
        ranges = win.ranges.map((r) => ({ from: fmt(toMinutes(r.from)), to: fmt(toMinutes(r.to)) }));
    } else if (win.from && win.to) {
        ranges = [{ from: fmt(toMinutes(win.from)), to: fmt(toMinutes(win.to)) }];
    } else {
        const times = windowSlotTimes(win); // legacy discrete slots → one collapsed range
        ranges = times.length ? [{ from: times[0], to: times[times.length - 1] }] : [];
    }
    // For today, drop past ranges and clamp an in-progress range's start to the
    // earliest valid time (now + lead) so we never offer / auto-default a past slot.
    const now = opts.now ?? new Date();
    if (dateStr === ymd(now)) {
        const leadMin = opts.dineIn
            ? (settings.dine_in_min_lead_time_minutes ?? settings.min_lead_time_minutes ?? 0)
            : (settings.min_lead_time_minutes ?? 0);
        const earliest = now.getHours() * 60 + now.getMinutes() + leadMin;
        ranges = ranges
            .filter((r) => toMinutes(r.to) > earliest)
            .map((r) => (toMinutes(r.from) < earliest ? { from: fmt(earliest), to: r.to } : r));
    }
    return ranges;
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
        today_only: parsed.today_only === true,
        start_date: typeof parsed.start_date === "string" ? parsed.start_date : undefined,
        end_date: typeof parsed.end_date === "string" ? parsed.end_date : undefined,
        picker_mode:
            parsed.picker_mode === "date_only" || parsed.picker_mode === "time_only"
                ? parsed.picker_mode
                : "both",
        slot_mode: parsed.slot_mode === "rolling" ? "rolling" : "windows",
        rolling_interval_minutes: num(parsed.rolling_interval_minutes, 15),
        rolling_slot_count: num(parsed.rolling_slot_count, 2),
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
        dine_in_today_only: parsed.dine_in_today_only === true,
        dine_in_start_date: typeof parsed.dine_in_start_date === "string" ? parsed.dine_in_start_date : undefined,
        dine_in_end_date: typeof parsed.dine_in_end_date === "string" ? parsed.dine_in_end_date : undefined,
        dine_in_picker_mode:
            parsed.dine_in_picker_mode === "date_only" || parsed.dine_in_picker_mode === "time_only"
                ? parsed.dine_in_picker_mode
                : "both",
        dine_in_slot_mode: parsed.dine_in_slot_mode === "rolling" ? "rolling" : "windows",
        dine_in_rolling_interval_minutes: num(parsed.dine_in_rolling_interval_minutes, 15),
        dine_in_rolling_slot_count: num(parsed.dine_in_rolling_slot_count, 2),
        dine_in_ask_people_count: parsed.dine_in_ask_people_count === true,
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

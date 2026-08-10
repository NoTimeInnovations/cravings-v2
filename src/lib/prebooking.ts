// Prebooking (scheduled orders) helpers shared by the checkout modals.
// All times are treated as restaurant-local; no timezone conversion is applied
// (the customer's device clock is used to filter past/too-soon slots).

import {
    PrebookingSettings,
    PrebookingWindow,
    ItemPreorderRule,
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

// ── Per-item preorder ────────────────────────────────────────────────────────
//
// A dish can be marked "needs notice" (a cake needing 24h, a Sunday-only
// biryani). The rules live in `prebooking_settings.item_preorder`, keyed by menu
// item id — see ItemPreorderRule in src/store/orderStore.ts for why they are not
// a column on `menu`.
//
// An order carries ONE schedule (orders.scheduled_date / scheduled_time), so a
// mixed cart cannot be split: the STRICTEST item wins for the whole order. That
// is the only behaviour the data model can express, and it is also the least
// surprising — the customer is told which dish set the date.

/** Defensive read of one rule. The checkout gets RAW parsed JSON (never
 *  mergePrebookingConfig), so every field here may be absent or the wrong type. */
function normalizeRule(raw: unknown): ItemPreorderRule | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as any;
    const lead = Number(r.lead_minutes);
    // A rule with no notice and no day restriction still means "preorder": it
    // forces a slot. Negative / NaN leads collapse to 0 rather than poisoning the
    // Math.max below with NaN, which would make every date unselectable.
    const lead_minutes = Number.isFinite(lead) && lead > 0 ? Math.floor(lead) : 0;
    const days = Array.isArray(r.days)
        ? Array.from(
              new Set(
                  r.days
                      .map((d: unknown) => Number(d))
                      .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6),
              ),
          ).sort((a, b) => (a as number) - (b as number)) as number[]
        : [];
    return { lead_minutes, days };
}

/** Normalize the whole `item_preorder` map; drops malformed entries. */
export function normalizeItemPreorder(raw: unknown): Record<string, ItemPreorderRule> {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: Record<string, ItemPreorderRule> = {};
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
        if (!id) continue;
        const rule = normalizeRule(value);
        if (rule) out[id] = rule;
    }
    return out;
}

/** Local "YYYY-MM-DD" in an IANA timezone, falling back to the device date when
 *  no/invalid zone. en-CA formats as YYYY-MM-DD, which is the shape everything
 *  else in this file speaks. */
function ymdInTimezone(now: Date, timezone?: string | null): string {
    if (!timezone) return ymd(now);
    try {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(now);
    } catch {
        return ymd(now);
    }
}

/** Whole days from one "YYYY-MM-DD" to another; null if either is malformed.
 *  Calendar arithmetic on the date parts only — no clock, so no DST hazard. */
function daysBetween(fromYmd: string, toYmd: string): number | null {
    const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromYmd);
    const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toYmd);
    if (!a || !b) return null;
    const ams = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
    const bms = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
    return Math.round((bms - ams) / 86_400_000);
}

/** The base menu id behind a cart line id ("<menuId>|<variant>", and POS's
 *  "<menuId>_custom_…"). Centralised so no caller can forget it — V1's
 *  incompatibleItems already skips the split and silently misses every variant. */
export function baseMenuId(cartItemId: string): string {
    return String(cartItemId || "").split("|")[0].split("_custom_")[0];
}

/** What a cart demands of the schedule, once every preorder item is considered. */
export interface CartPreorderRequirement {
    /** True when at least one cart line is a preorder item ⇒ a slot is mandatory. */
    required: boolean;
    /** The largest per-item notice in the cart, in minutes. */
    leadMinutes: number;
    /** Weekdays every preorder item in the cart allows (intersection).
     *  `null` = unrestricted. `[]` = the items contradict each other. */
    days: number[] | null;
    /** Base menu ids of the preorder lines, so the UI can name them. */
    itemIds: string[];
    /** The item with the longest notice, for a message that names one dish rather
     *  than five. Null when no item in the cart asks for notice at all. */
    strictestItemId: string | null;
    /** Every item that imposed a day restriction — NOT necessarily the notice
     *  item, and often more than one. Kept separate because attributing the days
     *  to `strictestItemId` produced a flatly false sentence: a 24h cake plus a
     *  Sunday-only biryani read as "Chocolate Cake needs 24 hours notice and is
     *  only made on Sundays". And naming just ONE of several is equally wrong —
     *  with a Sat+Sun dish and a Sun-only dish the surviving day is Sunday, which
     *  neither dish's own rule explains on its own. */
    daysItemIds: string[];
}

const NO_PREORDER: CartPreorderRequirement = {
    required: false,
    leadMinutes: 0,
    days: null,
    itemIds: [],
    strictestItemId: null,
    daysItemIds: [],
};

/**
 * Resolve the scheduling constraint a cart imposes.
 *
 * Accepts RAW cart line ids and does the base-id extraction itself. Duplicate
 * lines of the same dish (two variants of one cake) collapse to one rule — leads
 * are a MAX, never a sum.
 */
export function resolveCartPreorder(
    settings: PrebookingSettings | null | undefined,
    cartItemIds: Iterable<string> | null | undefined,
): CartPreorderRequirement {
    if (!settings || !cartItemIds) return NO_PREORDER;
    const rules = normalizeItemPreorder((settings as any).item_preorder);
    if (!Object.keys(rules).length) return NO_PREORDER;

    const seen = new Set<string>();
    let leadMinutes = 0;
    let strictestItemId: string | null = null;
    const daysItemIds: string[] = [];
    let days: number[] | null = null;
    for (const raw of cartItemIds) {
        const id = baseMenuId(raw);
        if (!id || seen.has(id)) continue;
        const rule = rules[id];
        if (!rule) continue;
        seen.add(id);
        if (rule.lead_minutes > leadMinutes) {
            leadMinutes = rule.lead_minutes;
            strictestItemId = id;
        }
        if (rule.days && rule.days.length) {
            days = days === null ? [...rule.days] : days.filter((d) => rule.days!.includes(d));
            daysItemIds.push(id);
        }
    }
    if (!seen.size) return NO_PREORDER;
    return {
        required: true,
        leadMinutes,
        days,
        itemIds: [...seen],
        // Fall back to the first preorder line when nothing asks for notice, so a
        // days-only or zero-notice cart still names a dish instead of "One of your
        // items". Previously this fallback lived in the loop condition, where it
        // let a 0-lead item claim the title before a 1440-lead one appeared.
        strictestItemId: strictestItemId ?? daysItemIds[0] ?? [...seen][0] ?? null,
        daysItemIds,
    };
}

/** "1440" -> "24 hours"; "90" -> "1.5 hours"; "45" -> "45 minutes". */
export function formatLeadTime(minutes: number): string {
    if (minutes <= 0) return "advance notice";
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    const hours = minutes / 60;
    if (hours < 48) {
        const h = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, "");
        return `${h} hour${hours === 1 ? "" : "s"}`;
    }
    const days = hours / 24;
    const d = Number.isInteger(days) ? String(days) : days.toFixed(1).replace(/\.0$/, "");
    return `${d} days`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "0,6" -> "Sundays and Saturdays" for customer-facing copy. */
export function formatAllowedDays(days: number[]): string {
    const names = days.filter((d) => d >= 0 && d <= 6).map((d) => `${DAY_NAMES[d]}s`);
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Why this cart cannot be placed with this selection — or null when it can.
 *
 * Called from EVERY placement handler in both checkout modals. It exists as one
 * function rather than five inline conditions because that duplication has
 * already failed once: V2's Razorpay handler shipped without the slot guard, and
 * the post-failure "Try Again" button reaches it directly.
 *
 * Client-side only, and deliberately described as such: this app ships the Hasura
 * admin secret to the browser, so nothing here is a security boundary. It stops
 * accidents, not attackers.
 */
export function preorderBlockReason(
    req: CartPreorderRequirement,
    selection: { date: string; time: string } | null | undefined,
    nameOf: (menuId: string) => string,
    now: Date = new Date(),
    /** Restaurant IANA timezone. Supply it whenever the caller has one: rolling
     *  slots are generated as minute-of-day in THIS zone, so re-checking them on
     *  the customer's device clock rejects perfectly good slots whenever the two
     *  differ (a Qatar store's Indian customer is 2.5 hours out — every slot on
     *  offer looks too soon). Omitted ⇒ device clock, i.e. exactly the basis the
     *  windows-mode range clamp already uses. */
    timezone?: string | null,
): string | null {
    if (!req.required) return null;
    const dish = req.strictestItemId ? nameOf(req.strictestItemId) : "One of your items";

    // Two preorder items whose allowed days don't overlap can never share an
    // order. Say so instead of showing an empty date list.
    if (req.days !== null && req.days.length === 0) {
        // Only the day-restricted dishes — listing every preorder line dragged in
        // items whose availability has nothing to do with the clash.
        const names = req.daysItemIds.map(nameOf).filter(Boolean);
        return `${names.join(" and ")} are available on different days, so they can't be ordered together. Please place them as separate orders.`;
    }

    if (!selection?.date || !selection?.time) {
        return req.leadMinutes > 0
            ? `${dish} needs ${formatLeadTime(req.leadMinutes)} notice — please pick a date and time.`
            : `${dish} is a preorder item — please pick a date and time.`;
    }

    // Re-check the chosen slot. The picker should never emit a violating one, but
    // a selection made minutes ago can go stale, and the payment-retry path
    // re-submits a selection captured before the cart was edited.
    //
    // Compared in WALL-CLOCK MINUTES, not milliseconds, and on the restaurant's
    // clock when one is known. Both details are load-bearing:
    //
    //  · minutes, because getPrebookingRanges clamps a range's start to whole
    //    wall-clock minutes (`H*60+M+lead`) — at 14:00:30 it offers, and
    //    auto-selects, 14:00 for a 24h dish. A millisecond comparison rejected
    //    that very slot, leaving the order unplaceable 59 seconds in every 60
    //    while the customer stared at the only slot on offer;
    //  · the restaurant's clock, because rolling slots are emitted as
    //    minute-of-day in that zone (getRollingSlots -> nowMinuteOfDay), so a
    //    device-clock comparison is wrong by the whole UTC offset difference.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selection.date) || !HHMM_RE.test(selection.time.slice(0, 5))) {
        return "That date and time isn't valid — please pick again.";
    }
    const nowDate = ymdInTimezone(now, timezone);
    const dayOffset = daysBetween(nowDate, selection.date);
    if (dayOffset === null) return "That date and time isn't valid — please pick again.";
    const slotMinutes = dayOffset * 1440 + toMinutes(selection.time.slice(0, 5));
    const nowMinutes = nowMinuteOfDay(now, timezone);
    // The picker recomputes its clamp on a 60-second tick, so the slot it is
    // currently OFFERING can be up to a minute behind this live clock. Without a
    // grace at least that wide, the customer is refused the only slot on screen
    // for part of every minute — the failure this guard exists to prevent, in
    // reverse. Two minutes clears the tick with room to spare and is far below
    // any staleness worth catching: a payment retry or a cart edited to add a
    // longer-notice dish misses by tens of minutes or hours, not by two.
    const GRACE_MINUTES = 2;
    if (req.leadMinutes > 0 && slotMinutes + GRACE_MINUTES < nowMinutes + req.leadMinutes) {
        return `${dish} needs ${formatLeadTime(req.leadMinutes)} notice — please pick a later slot.`;
    }
    if (req.days !== null && req.days.length) {
        const weekday = new Date(`${selection.date}T00:00:00`).getDay();
        if (!req.days.includes(weekday)) {
            // Name a dish only when exactly ONE imposed the restriction. With
            // several, the surviving days are an intersection that no single
            // dish's rule describes, so attributing them to one is false.
            const subject =
                req.daysItemIds.length === 1 ? nameOf(req.daysItemIds[0]) : "Your order";
            return `${subject} ${req.daysItemIds.length === 1 ? "is" : "can"} only ${req.daysItemIds.length === 1 ? "available" : "be made"} on ${formatAllowedDays(req.days)} — please pick another date.`;
        }
    }
    return null;
}

/**
 * The extra constraint a preorder cart puts on the slot maths, threaded through
 * every date/slot/validation entry point in this file.
 *
 * It has to reach ALL of them: the date list (getPrebookingSlots), the range list
 * (getPrebookingRanges) and the typed-time validator (validateCustomPrebookTime)
 * each read the lead time independently, and if only one learns about the per-item
 * notice the other two keep offering slots it forbids.
 */
export interface PreorderConstraint {
    /** Extra notice on top of the store's own min lead time, in minutes. */
    extraLeadMinutes?: number;
    /** Weekdays (0 = Sun … 6 = Sat) the cart permits. null/undefined = any. */
    allowedDays?: number[] | null;
    /** Skip the lead-time clamp entirely. For callers RESOLVING a slot that was
     *  already booked rather than OFFERING one — formatPrebookSlotLabel looks up
     *  the end time of an order placed weeks ago, and clamping against today's
     *  clock filters every range away, leaving the label as a bare start time. */
    ignoreLead?: boolean;
}

/** Store lead time and the cart's per-item notice combined. The item's notice is
 *  a FLOOR, not a replacement — a store that already demands 2h keeps it. */
function effectiveLead(
    settings: PrebookingSettings,
    opts: PreorderConstraint & { dineIn?: boolean },
): number {
    const base = opts.dineIn
        ? (settings.dine_in_min_lead_time_minutes ?? settings.min_lead_time_minutes ?? 0)
        : (settings.min_lead_time_minutes ?? 0);
    const extra = opts.extraLeadMinutes ?? 0;
    return Math.max(Number.isFinite(base) ? base : 0, Number.isFinite(extra) ? extra : 0);
}

function isDayAllowed(weekday: number, allowedDays: number[] | null | undefined): boolean {
    // An EMPTY list means the cart's preorder items contradict each other, so no
    // day works. Only null/undefined means "unrestricted" — conflating the two
    // would silently offer every date for an impossible cart.
    if (allowedDays === null || allowedDays === undefined) return true;
    return allowedDays.includes(weekday);
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
    opts: PreorderConstraint & { dineIn?: boolean } = {}
): string[] {
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return [];
    const weekday = date.getDay();
    // A preorder item may only be made on certain weekdays. Applied here so the
    // date LIST loses the day (getPrebookingDates drops any date with no slots)
    // rather than the customer picking a date and finding it empty.
    if (!isDayAllowed(weekday, opts.allowedDays)) return [];
    // Dine-in reservations use their own slot set; fall back to `windows` for
    // legacy configs saved before dine_in_windows existed.
    const windows = opts.dineIn
        ? (settings.dine_in_windows ?? settings.windows)
        : settings.windows;
    const win = (windows ?? []).find((w) => w.day === weekday);
    if (!win || !win.enabled) return [];

    const leadMinutes = effectiveLead(settings, opts);
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

/** A restaurant-local open window ("HH:MM"–"HH:MM") to clamp rolling slots to. */
export type ClampWindow = { from?: string | null; to?: string | null } | null | undefined;

/** True when minute-of-day `m` falls inside [from, to], overnight-aware (from > to
 *  wraps past midnight), mirroring src/lib/isWithinTimeWindow. No window ⇒ always true. */
function withinWindow(m: number, window: ClampWindow): boolean {
    if (!window?.from || !window?.to) return true; // no restriction
    const s = toMinutes(window.from);
    const e = toMinutes(window.to);
    return s <= e ? m >= s && m <= e : m >= s || m <= e;
}

/** Minute-of-day for `now` in the restaurant's IANA timezone, mirroring
 *  isWithinTimeWindow so rolling slots and their window clamp share ONE clock.
 *  The operating window (delivery_time_allowed/…) is restaurant-local, so when a
 *  timezone is supplied we read `now` in that zone rather than the device clock —
 *  otherwise an out-of-timezone customer's browser time could clamp away every
 *  valid slot. Falls back to the device clock when no/invalid zone (same-tz
 *  markets, e.g. all-India, are unaffected). */
export function restaurantMinuteOfDay(now: Date, timezone?: string | null): number {
    return nowMinuteOfDay(now, timezone);
}

function nowMinuteOfDay(now: Date, timezone?: string | null): number {
    if (!timezone) return now.getHours() * 60 + now.getMinutes();
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        }).formatToParts(now);
        const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
        const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
        return h * 60 + m;
    } catch {
        return now.getHours() * 60 + now.getMinutes();
    }
}

/**
 * Rolling slots: discrete pickup times at `now + interval`, `now + 2*interval`, …
 * up to `count`, within today. Each is a point-in-time slot (from === to). These
 * roll forward with the clock, so the checkout re-computes them periodically.
 *
 * When `window` is given (the order type's operating hours — delivery_time_allowed /
 * takeaway_time_allowed), only slots that fall inside it are emitted, so rolling
 * never offers a pickup time outside the delivery/takeaway open window.
 */
export function getRollingSlots(
    intervalMin: number,
    count: number,
    now: Date = new Date(),
    window: ClampWindow = null,
    timezone?: string | null,
    /** Earliest minute-of-day a slot may fall on — how a preorder item's notice
     *  reaches rolling mode. Read on the SAME clock as `base` (the restaurant's
     *  timezone) so the two can't disagree. */
    minMinuteOfDay: number = 0
): { from: string; to: string }[] {
    const base = nowMinuteOfDay(now, timezone);
    const out: { from: string; to: string }[] = [];
    for (let i = 1; i <= count; i++) {
        const m = base + intervalMin * i;
        if (m >= 24 * 60) break; // stay within today
        if (m < minMinuteOfDay) continue; // per-item notice not met yet
        if (!withinWindow(m, window)) continue; // clamp to the operating window
        const t = fmt(m);
        out.push({ from: t, to: t });
    }
    return out;
}

/** The rolling-mode floor implied by a preorder notice, as a minute-of-day.
 *  Rolling slots only ever exist today, so a notice longer than the rest of the
 *  day legitimately yields nothing — the picker says so rather than pretending.
 *
 *  Uses ONLY the per-item notice, never `effectiveLead`. Rolling slots have never
 *  honoured the store's own `min_lead_time_minutes` (the interval plays that role),
 *  and folding it in here would empty the slot list for every existing partner
 *  running rolling mode with a legacy non-zero lead — partners with no preorder
 *  items at all. */
function rollingFloor(
    now: Date,
    opts: PreorderConstraint & { timezone?: string | null },
): number {
    const lead = Math.max(0, opts.extraLeadMinutes ?? 0);
    return lead > 0 ? nowMinuteOfDay(now, opts.timezone) + lead : 0;
}

/**
 * Selectable dates that have at least one valid slot. By default spans
 * today … max_advance_days, but `fromOffset` / `throughDay` let callers (e.g. the
 * checkout picker) override the window — the picker uses tomorrow … +30 days.
 */
export function getPrebookingDates(
    settings: PrebookingSettings,
    now: Date = new Date(),
    opts: PreorderConstraint & { dineIn?: boolean; fromOffset?: number; throughDay?: number; clampWindow?: ClampWindow; timezone?: string | null } = {}
): { value: string; label: string }[] {
    const rollingCfg = rollingConfig(settings, opts.dineIn);
    if (rollingCfg.rolling) {
        // Rolling slots are now-relative → offer only today (when it has slots
        // inside the operating window). A preorder notice that runs past midnight
        // therefore leaves nothing bookable at all — correct, and surfaced as its
        // own message in the picker rather than a bare "no dates".
        if (!isDayAllowed(now.getDay(), opts.allowedDays)) return [];
        return getRollingSlots(
            rollingCfg.interval,
            rollingCfg.count,
            now,
            opts.clampWindow,
            opts.timezone,
            rollingFloor(now, opts),
        ).length > 0
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
    opts: PreorderConstraint & { dineIn?: boolean; now?: Date; clampWindow?: ClampWindow; timezone?: string | null } = {}
): { from: string; to: string }[] {
    const rollingCfg = rollingConfig(settings, opts.dineIn);
    if (rollingCfg.rolling) {
        // Rolling slots are now-relative → only today has them, clamped to the
        // order type's operating window when one is provided.
        const rnow = opts.now ?? new Date();
        if (dateStr !== ymd(rnow)) return [];
        if (!isDayAllowed(rnow.getDay(), opts.allowedDays)) return [];
        return getRollingSlots(
            rollingCfg.interval,
            rollingCfg.count,
            rnow,
            opts.clampWindow,
            opts.timezone,
            rollingFloor(rnow, opts),
        );
    }
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return [];
    const weekday = date.getDay();
    if (!isDayAllowed(weekday, opts.allowedDays)) return [];
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
    // Drop past ranges and clamp an in-progress range's start to the earliest
    // valid time (now + lead) so we never offer / auto-default a slot that's too
    // soon.
    //
    // This used to run only for today, which was harmless while the only lead was
    // the store's own (never more than a few hours). A per-item notice can span
    // days, so the clamp is now absolute: a 30-hour cake with a slot list for
    // TOMORROW must still lose tomorrow morning. `earliest` is derived from the
    // date being asked about, so for any date far enough out it goes negative and
    // nothing is clamped — identical to the old behaviour.
    const now = opts.now ?? new Date();
    const leadMin = effectiveLead(settings, opts);
    // Minute-of-day on THIS date at which the lead is satisfied, expressed by
    // shifting the wall clock back a whole day per day of offset. Deliberately
    // NOT (now + lead - midnightOf(dateStr)) in milliseconds: the range bounds
    // below are WALL-CLOCK minutes, and across a DST transition those two are an
    // hour apart. dayOffsetFrom is the file's existing DST-safe day difference,
    // and at offset 0 this reduces to exactly the H*60+M+lead the today-only
    // version used — so nothing moves for partners with no preorder items.
    const dayOffset = dayOffsetFrom(now, dateStr) ?? 0;
    const earliest = now.getHours() * 60 + now.getMinutes() + leadMin - dayOffset * 1440;
    if (earliest > 0 && !opts.ignoreLead) {
        ranges = ranges
            .filter((r) => toMinutes(r.to) > earliest)
            .map((r) => (toMinutes(r.from) < earliest ? { from: fmt(earliest), to: r.to } : r));
    }
    return ranges;
}

/** Strict 24h "HH:MM". Deliberately NOT `\d{1,2}:\d{2}` — that accepts "12:99",
 *  which `toMinutes` silently normalizes to 13:39 while the literal string is
 *  what gets emitted and stored (`scheduled_time = "12:99:00"` is rejected by the
 *  Postgres time column). `<input type="time">` always produces the padded form. */
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Overnight-aware check that a "HH:MM" time falls inside an operating window.
 *  Thin wrapper over `withinWindow` for the checkout's free "other time" input;
 *  a malformed time is never inside, no window means no restriction. */
function isTimeWithinWindow(hhmm: string, window: ClampWindow): boolean {
    const raw = (hhmm || "").trim();
    if (!HHMM_RE.test(raw)) return false;
    return withinWindow(toMinutes(raw), window);
}

/**
 * Validate a customer-TYPED "HH:MM" (the optional "other time" input) for a date.
 * Returns null when it's acceptable, else a short customer-facing reason.
 *
 * Checks, in order:
 *  1. parses as a time of day;
 *  2. inside the order type's operating window (delivery_time_allowed / …);
 *  3. windows mode only — inside one of the day's configured booking ranges.
 *     Rolling slots are now-relative points, not ranges, so there is nothing to
 *     bound a typed time with beyond the operating window;
 *  4. rolling mode only — respects the min lead time (in windows mode the ranges
 *     from (3) are already lead-clamped, so this would be redundant — and with a
 *     per-item preorder notice that clamp now covers future dates too, which is
 *     what stops a 24h-notice cake being typed in for this evening).
 *
 * Only ever applied to typed times: preset slot picks keep their existing path.
 */
export function validateCustomPrebookTime(
    settings: PrebookingSettings,
    dateStr: string,
    hhmm: string,
    opts: PreorderConstraint & { dineIn?: boolean; now?: Date; clampWindow?: ClampWindow; timezone?: string | null } = {}
): string | null {
    const raw = (hhmm || "").trim();
    // HHMM_RE already bounds the value to 00:00–23:59, so no range re-check below.
    if (!HHMM_RE.test(raw)) return "Enter a valid time.";
    if (!dateStr) return "Select a date first.";
    const m = toMinutes(raw);

    const now = opts.now ?? new Date();
    const isRolling = rollingConfig(settings, opts.dineIn).rolling;

    // A preorder item may restrict which weekdays it can be made for. Checked
    // before anything time-shaped: in rolling mode the range check below never
    // runs, so without this a Sunday-only dish could be typed in for a Tuesday.
    const typedWeekday = new Date(`${dateStr}T00:00:00`).getDay();
    if (!isDayAllowed(typedWeekday, opts.allowedDays)) {
        return opts.allowedDays && opts.allowedDays.length
            ? `Your order can only be made on ${formatAllowedDays(opts.allowedDays)}. Pick another date.`
            : "Your items can't be scheduled for the same day. Please order them separately.";
    }

    // The operating window is only the right bound in ROLLING mode, where the
    // offered slots are themselves clamped to it (getRollingSlots -> withinWindow).
    // In windows mode the partner's configured booking ranges are the authority
    // and are NOT clamped to the operating window, so applying it here would make
    // a slot the customer can PICK from the list impossible to TYPE — e.g. a
    // 09:00–23:00 Saturday range with delivery hours 10:00–22:00 offers 09:00 in
    // the sheet but would reject a typed 09:00. The range check below is the bound
    // in that mode.
    if (isRolling && !isTimeWithinWindow(raw, opts.clampWindow)) {
        const w = opts.clampWindow!; // non-null: isTimeWithinWindow only fails on a real window
        return `We're only open ${formatSlotLabel(w.from!)} – ${formatSlotLabel(w.to!)}. Pick a time in between.`;
    }

    if (!isRolling) {
        const ranges = getPrebookingRanges(settings, dateStr, { ...opts, now });
        if (ranges.length === 0) return "No booking times are available for this date.";
        const inRange = ranges.some((r) => withinWindow(m, r));
        if (!inRange) {
            return `Pick a time within ${ranges
                .map((r) => `${formatSlotLabel(r.from)} – ${formatSlotLabel(r.to)}`)
                .join(" or ")}.`;
        }
        return null;
    }

    // Store lead time, raised by any per-item preorder notice in the cart.
    const leadMinutes = effectiveLead(settings, opts);
    // Rolling slots only ever exist for today (getPrebookingRanges bails on any
    // other date), so the lead time is a minute-of-day comparison — and it must be
    // read on the SAME clock getRollingSlots uses, i.e. the restaurant's timezone.
    // Building an absolute Date from `dateStr` compared it on the device clock, so
    // an out-of-timezone customer had valid times rejected / stale ones accepted.
    const earliest = nowMinuteOfDay(now, opts.timezone) + leadMinutes;
    if (m < earliest) {
        return leadMinutes > 0
            ? `Pick a time at least ${formatLeadTime(leadMinutes)} from now.`
            : "Pick a time in the future.";
    }
    return null;
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
        prebooking_optional: parsed.prebooking_optional === true,
        // NOTE: this return is an explicit WHITELIST — both settings tabs save
        // JSON.stringify({ ...mergePrebookingConfig(raw), ...their changes }), so any
        // key missing here is dropped on the next save from either tab. Every new
        // setting MUST be listed or it silently erases itself.
        free_time_input: parsed.free_time_input === true,
        // Per-item preorder rules. Listed here for the reason spelled out above:
        // the Slot Booking tab saves {...mergePrebookingConfig(raw), ...dine-in
        // fields}, so leaving this out would erase every partner's preorder setup
        // the first time anyone opened that tab and pressed Save.
        item_preorder: normalizeItemPreorder(parsed.item_preorder),
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
        slot_booking_optional: parsed.slot_booking_optional === true,
        dine_in_free_time_input: parsed.dine_in_free_time_input === true,
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
        // ignoreLead: this is a lookup for an order that already exists, not an
        // offer of a slot. Without it, any order whose date has passed loses its
        // end time — the lead clamp filters every range away against today's
        // clock — and "7:00 PM – 9:00 PM" silently degrades to "7:00 PM" in the
        // dashboard order lists and on the customer's tracking page.
        const r = getPrebookingRanges(settings, dateStr, { ...opts, ignoreLead: true }).find(
            (x) => x.from === from,
        );
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

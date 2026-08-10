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

// ── Scoped scheduling ("preorder items") ─────────────────────────────────────
//
// A store can scope scheduling to specific dishes instead of every order: a cake
// that needs a day's notice is the only thing it makes sense to prebook, so the
// picker appears for baskets containing it and nowhere else. See PrebookingScope
// in src/store/orderStore.ts for why the dish list lives in partner settings
// rather than as a column on `menu`.
//
// An order carries ONE schedule (orders.scheduled_date / scheduled_time), so a
// basket cannot hold two. A listed dish is therefore an order-on-its-own product:
// alone (or with other listed dishes) it schedules; mixed with anything else the
// checkout refuses the basket and asks for it to be split.

/** One tab's scope config, read defensively: the checkout gets RAW parsed JSON
 *  (never mergePrebookingConfig), so every field here may be absent or the wrong
 *  type. */
function readScope(
    settings: PrebookingSettings,
    dineIn: boolean,
): { scoped: boolean; ids: Set<string>; leadMinutes: number; days: number[] } {
    const s = settings as any;
    const scope = dineIn ? s.dine_in_applies_to : s.applies_to;
    const rawIds = dineIn ? s.dine_in_preorder_item_ids : s.preorder_item_ids;
    const rawLead = Number(dineIn ? s.dine_in_preorder_lead_minutes : s.preorder_lead_minutes);
    const rawDays = dineIn ? s.dine_in_preorder_days : s.preorder_days;
    const ids = new Set<string>(
        Array.isArray(rawIds) ? rawIds.filter((x: unknown) => typeof x === "string" && x) : [],
    );
    const days = Array.isArray(rawDays)
        ? Array.from(
              new Set(
                  rawDays
                      .map((d: unknown) => Number(d))
                      .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6),
              ),
          ).sort((a, b) => (a as number) - (b as number)) as number[]
        : [];
    return {
        // "items" with an EMPTY list would otherwise mean "scheduling applies to
        // nothing", silently switching the store off. Treat it as unscoped until a
        // dish is actually picked.
        scoped: scope === "items" && ids.size > 0,
        ids,
        // NaN / negative would poison the Math.max downstream and make every date
        // unselectable.
        leadMinutes: Number.isFinite(rawLead) && rawLead > 0 ? Math.floor(rawLead) : 0,
        days,
    };
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

/** What a basket demands of the schedule. */
export interface CartPreorderRequirement {
    /** True when this order kind is scoped to specific dishes at all. */
    scoped: boolean;
    /** True when the basket actually contains one of them. */
    matched: boolean;
    /** A listed dish sharing the basket with something not on the list.
     *  Scheduling is offered for neither: a listed dish is an order-on-its-own
     *  product, so the basket has to be split before it can be placed. */
    mixed: boolean;
    /** Does scheduling apply to THIS basket? Unscoped stores: always. Scoped:
     *  only when the basket is made up entirely of listed dishes — no listed dish
     *  means an ordinary ASAP order, and a mix means no order at all until the
     *  customer splits it. */
    appliesToCart: boolean;
    /** Scheduling is mandatory for this basket. */
    required: boolean;
    /** Extra notice in minutes. */
    leadMinutes: number;
    /** Weekdays the listed dishes are made; `null` = unrestricted. */
    days: number[] | null;
    /** Base menu ids of the matching lines, so the UI can name them. */
    itemIds: string[];
}

const NO_SCOPE: CartPreorderRequirement = {
    scoped: false,
    matched: false,
    mixed: false,
    appliesToCart: true,
    required: false,
    leadMinutes: 0,
    days: null,
    itemIds: [],
};

/**
 * Resolve the scheduling constraint a basket imposes.
 *
 * Accepts RAW cart line ids and does the base-id extraction itself, so no caller
 * can forget the variant split. Duplicate lines of one dish collapse to one match.
 *
 * Three outcomes, in `appliesToCart` / `required` / `mixed`:
 *   no listed dish   -> ordinary ASAP order, no picker
 *   only listed dishes -> scheduling required, notice and days applied
 *   listed + other   -> `mixed`: no picker and no order until the basket is split
 */
export function resolveCartPreorder(
    settings: PrebookingSettings | null | undefined,
    dineIn: boolean,
    cartItemIds: Iterable<string> | null | undefined,
): CartPreorderRequirement {
    if (!settings) return NO_SCOPE;
    const scope = readScope(settings, dineIn);
    if (!scope.scoped) return NO_SCOPE;

    const seen = new Set<string>();
    let hasOther = false;
    for (const raw of cartItemIds ?? []) {
        const id = baseMenuId(raw);
        if (!id) continue;
        if (scope.ids.has(id)) seen.add(id);
        else hasOther = true;
    }
    const matched = seen.size > 0;
    // A listed dish alongside anything else. Scheduling is offered for neither:
    // these are order-on-its-own products, so scheduling the whole basket around
    // the cake would drag an unrelated pizza a day into the future, and NOT
    // scheduling it would hand the kitchen a 24-hour cake for tonight. The basket
    // gets split instead, and the checkout says so.
    const mixed = matched && hasOther;
    const applies = matched && !mixed;
    return {
        scoped: true,
        matched,
        mixed,
        appliesToCart: applies,
        required: applies,
        leadMinutes: applies ? scope.leadMinutes : 0,
        days: applies && scope.days.length ? scope.days : null,
        itemIds: [...seen],
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
    /** The clock the offered slot TIMES are expressed on — NOT simply "the
     *  restaurant's timezone". Pass the restaurant zone in ROLLING mode, where
     *  getRollingSlots builds times from nowMinuteOfDay(now, timezone); pass
     *  nothing in windows mode, where the range clamp reads the device clock.
     *  Getting this backwards is a live bug in both directions: supplying it in
     *  windows mode refuses every slot for an out-of-timezone customer, omitting
     *  it in rolling mode does the same. */
    slotTimeTimezone?: string | null,
): string | null {
    if (!req.required) return null;
    // One dish -> name it. Several -> "Your order", because listing four dishes in
    // a toast reads as an error dump rather than an instruction.
    const dish =
        req.itemIds.length === 1 ? nameOf(req.itemIds[0]) : "Your order";
    const verb = req.itemIds.length === 1 ? "needs" : "needs";

    if (!selection?.date || !selection?.time) {
        return req.leadMinutes > 0
            ? `${dish} ${verb} ${formatLeadTime(req.leadMinutes)} notice — please pick a date and time.`
            : `${dish} has to be scheduled — please pick a date and time.`;
    }

    // Re-check the chosen slot. The picker should never emit a violating one, but
    // a selection made minutes ago can go stale, and the payment-retry path
    // re-submits a selection captured before the cart was edited.
    //
    // Compared in WALL-CLOCK MINUTES, not milliseconds, and — critically — on the
    // SAME CLOCK that produced the slot being judged. Both details are load-bearing:
    //
    //  · minutes, because getPrebookingRanges clamps a range's start to whole
    //    wall-clock minutes (`H*60+M+lead`) — at 14:00:30 it offers, and
    //    auto-selects, 14:00 for a 24h dish. A millisecond comparison rejected
    //    that very slot, leaving the order unplaceable 59 seconds in every 60
    //    while the customer stared at the only slot on offer;
    //  · the matching clock, because the two slot modes do NOT share one. Rolling
    //    slot times come from getRollingSlots -> nowMinuteOfDay(now, timezone), the
    //    RESTAURANT's clock; windows-mode range starts come from the clamp in
    //    getPrebookingRanges, which reads `now.getHours()`, the DEVICE's. Judging
    //    windows-mode slots on the restaurant clock is wrong by the entire UTC
    //    offset — a Dubai customer of an IST store was refused the only slot on
    //    screen at every hour tested. Hence `slotTimeTimezone`, which callers set
    //    ONLY in rolling mode.
    //
    // The DATE side is always device-local: both branches of getPrebookingDates
    // emit `ymd(now)` / device-local calendar days, including the rolling branch,
    // so the day offset must be measured on that same calendar.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selection.date) || !HHMM_RE.test(selection.time.slice(0, 5))) {
        return "That date and time isn't valid — please pick again.";
    }
    const dayOffset = daysBetween(ymd(now), selection.date);
    if (dayOffset === null) return "That date and time isn't valid — please pick again.";
    const slotMinutes = dayOffset * 1440 + toMinutes(selection.time.slice(0, 5));
    const nowMinutes = nowMinuteOfDay(now, slotTimeTimezone);
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
            return req.itemIds.length === 1
                ? `${dish} is only available on ${formatAllowedDays(req.days)} — please pick another date.`
                : `Your order can only be made on ${formatAllowedDays(req.days)} — please pick another date.`;
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
    /** Menu ids, deduped; anything not a non-empty string is dropped. */
    const idList = (v: any): string[] =>
        Array.isArray(v) ? Array.from(new Set(v.filter((x) => typeof x === "string" && x))) : [];
    /**
     * One-way migration off the short-lived per-dish shape.
     *
     * An earlier build stored `item_preorder: { <menuId>: { lead_minutes, days } }`
     * with its own settings tab. That shipped, so a partner may have configured it
     * before the tab was replaced by the scope model. Without this the rules would
     * stop firing AND be dropped on the next save — silent data loss, and exactly
     * the failure the whitelist comment in this function warns about.
     *
     * Only applies when the new keys are absent, so it can never overwrite a
     * partner who has since used the new editor. The per-dish notices collapse to
     * their maximum and the day sets to their intersection, matching how the old
     * checkout combined a mixed basket.
     */
    const migrateLegacy = (): {
        applies_to?: "items";
        ids?: string[];
        lead?: number;
        days?: number[];
    } => {
        const raw = parsed.item_preorder;
        if (parsed.applies_to !== undefined || !raw || typeof raw !== "object" || Array.isArray(raw)) {
            return {};
        }
        const entries = Object.entries(raw as Record<string, any>).filter(
            ([id, r]) => id && r && typeof r === "object",
        );
        if (!entries.length) return {};
        let lead = 0;
        let days: number[] | null = null;
        for (const [, r] of entries) {
            const l = Number(r.lead_minutes);
            if (Number.isFinite(l) && l > lead) lead = Math.floor(l);
            const d = dayList(r.days);
            if (d.length) days = days === null ? d : days.filter((x) => d.includes(x));
        }
        return {
            applies_to: "items",
            ids: entries.map(([id]) => id),
            lead,
            // An empty intersection meant "these dishes clash"; there is no way to
            // express that now, so fall back to unrestricted rather than emitting
            // a list that would make every date unselectable.
            days: days && days.length ? days : [],
        };
    };

    /** Weekday numbers 0–6, deduped and sorted. */
    const dayList = (v: any): number[] =>
        Array.isArray(v)
            ? Array.from(new Set(v.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort(
                  (a, b) => a - b,
              )
            : [];
    const legacy = migrateLegacy();
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
        // Scoped scheduling. Listed here for the reason spelled out above: each
        // tab saves {...mergePrebookingConfig(raw), ...its own fields}, so a key
        // missing from this whitelist is erased the first time anyone opens the
        // OTHER tab and presses Save. Both tabs now own a scope, so all eight
        // fields have to survive a save from either.
        applies_to: legacy.applies_to ?? (parsed.applies_to === "items" ? "items" : "all"),
        preorder_item_ids: legacy.ids ?? idList(parsed.preorder_item_ids),
        preorder_lead_minutes: legacy.lead ?? num(parsed.preorder_lead_minutes, 0),
        preorder_days: legacy.days ?? dayList(parsed.preorder_days),
        dine_in_applies_to: parsed.dine_in_applies_to === "items" ? "items" : "all",
        dine_in_preorder_item_ids: idList(parsed.dine_in_preorder_item_ids),
        dine_in_preorder_lead_minutes: num(parsed.dine_in_preorder_lead_minutes, 0),
        dine_in_preorder_days: dayList(parsed.dine_in_preorder_days),
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

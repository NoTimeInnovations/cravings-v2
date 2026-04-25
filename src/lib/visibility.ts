export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type VisibilityConfig =
  | { type: "default"; hidden: boolean; hideItems?: boolean }
  | {
      type: "scheduled";
      days: Weekday[];
      from: string; // "HH:mm"
      to: string;   // "HH:mm"
      hideItems?: boolean;
    };

export const DEFAULT_VISIBILITY: VisibilityConfig = { type: "default", hidden: false };

const WEEKDAY_ORDER: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function normalize(config: unknown): VisibilityConfig {
  if (!config || typeof config !== "object") return DEFAULT_VISIBILITY;
  const c = config as any;
  // hideItems defaults to true (the historical behavior is to hide items entirely
  // when the category is not visible). Only `false` opts into the new
  // "show items as unavailable" mode.
  const hideItems = c.hideItems === false ? false : true;
  if (c.type === "scheduled" && Array.isArray(c.days) && typeof c.from === "string" && typeof c.to === "string") {
    return { type: "scheduled", days: c.days, from: c.from, to: c.to, hideItems };
  }
  if (c.type === "default") return { type: "default", hidden: !!c.hidden, hideItems };
  return DEFAULT_VISIBILITY;
}

function parseHHMM(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function nowInTimezone(tz: string, now: Date): { weekday: Weekday; minutes: number } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const wdStr = parts.find((p) => p.type === "weekday")?.value?.toLowerCase() ?? "mon";
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const weekday = (wdStr.slice(0, 3) as Weekday);
    return { weekday, minutes: (hour % 24) * 60 + minute };
  } catch {
    const weekday = WEEKDAY_ORDER[now.getDay()];
    return { weekday, minutes: now.getHours() * 60 + now.getMinutes() };
  }
}

function prevWeekday(w: Weekday): Weekday {
  const idx = WEEKDAY_ORDER.indexOf(w);
  return WEEKDAY_ORDER[(idx + 6) % 7];
}

export function isVisibleNow(config: VisibilityConfig | unknown, timezone: string = "Asia/Kolkata", now: Date = new Date()): boolean {
  const c = normalize(config);
  if (c.type === "default") return !c.hidden;

  const days = c.days;
  if (!days || days.length === 0) return false;
  const from = parseHHMM(c.from);
  const to = parseHHMM(c.to);
  if (from === null || to === null) return false;

  const { weekday, minutes } = nowInTimezone(timezone, now);

  if (from === to) return false;

  if (from < to) {
    // Same-day window
    return days.includes(weekday) && minutes >= from && minutes < to;
  }

  // Overnight: window spans midnight. Active from `from`..24:00 on scheduled day,
  // or 00:00..`to` on the day after a scheduled day.
  if (minutes >= from && days.includes(weekday)) return true;
  if (minutes < to && days.includes(prevWeekday(weekday))) return true;
  return false;
}

export interface ResolveResult {
  visible: boolean;
  reason: "category" | "item" | "both-visible" | "default";
  conflict: boolean; // item wanted visible but category hid it (or vice-versa)
}

export function resolveVisibility(
  itemConfig: VisibilityConfig | unknown,
  categoryConfig: VisibilityConfig | unknown,
  timezone: string = "Asia/Kolkata",
  now: Date = new Date()
): ResolveResult {
  const itemVisible = isVisibleNow(itemConfig, timezone, now);
  const categoryVisible = isVisibleNow(categoryConfig, timezone, now);

  const cNorm = normalize(categoryConfig);
  const iNorm = normalize(itemConfig);
  const categoryConfigured = !(cNorm.type === "default" && cNorm.hidden === false);
  const itemConfigured = !(iNorm.type === "default" && iNorm.hidden === false);

  // Category overrides
  if (!categoryVisible) {
    return {
      visible: false,
      reason: "category",
      conflict: itemConfigured && itemVisible,
    };
  }
  if (!itemVisible) {
    return {
      visible: false,
      reason: "item",
      conflict: false,
    };
  }
  return {
    visible: true,
    reason: categoryConfigured || itemConfigured ? "both-visible" : "default",
    conflict: false,
  };
}

const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export function formatSchedule(config: VisibilityConfig | unknown): string {
  const c = normalize(config);
  if (c.type === "default") return c.hidden ? "Hidden" : "Always visible";
  if (!c.days?.length) return "Never (no days selected)";
  const dayStr = c.days.slice().sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)).map((d) => WEEKDAY_LABEL[d]).join(", ");
  return `${dayStr} · ${c.from}–${c.to}`;
}

export function normalizeVisibility(config: unknown): VisibilityConfig {
  return normalize(config);
}

export type ItemDisplayState = "visible" | "hidden" | "unavailable";

// Returns how an item should be rendered on the storefront:
//   "visible"     — show normally
//   "hidden"      — drop from menu
//   "unavailable" — keep in menu but force is_available=false (show "Unavailable" badge)
//
// Resolution order (highest priority first):
//   1. category.is_active === false  →  "hidden"
//   2. item.is_available === false   →  governed by item's hideItems toggle
//      (per-item override; falls back to hotel.hide_unavailable, then `true`)
//   3. category schedule not visible →  governed by category's hideItems
//   4. item schedule not visible     →  governed by item's hideItems toggle
//   5. otherwise                     →  "visible"
export function getItemDisplayState(
  item: { visibility_config?: unknown; category?: { visibility_config?: unknown; is_active?: boolean } | null; is_available?: boolean },
  timezone: string = "Asia/Kolkata",
  now: Date = new Date(),
  hotelHideUnavailable?: boolean
): ItemDisplayState {
  if (item.category && item.category.is_active === false) return "hidden";

  const itemHideExplicit = (item.visibility_config as any)?.hideItems;
  const itemHide =
    itemHideExplicit === false
      ? false
      : itemHideExplicit === true
      ? true
      : hotelHideUnavailable !== false; // default true preserves hide-when-unset

  // Main availability toggle has top priority over schedules
  if (item.is_available === false) {
    return itemHide ? "hidden" : "unavailable";
  }

  // Category schedule
  if (!isVisibleNow(item.category?.visibility_config, timezone, now)) {
    const cat = normalize(item.category?.visibility_config);
    return cat.hideItems === false ? "unavailable" : "hidden";
  }

  // Item schedule
  if (!isVisibleNow(item.visibility_config, timezone, now)) {
    return itemHide ? "hidden" : "unavailable";
  }

  return "visible";
}

// Storefront helper: filter menu items by both their own and their category's visibility.
// Returns true for items that should remain in the menu list (visible OR unavailable).
export function isItemVisibleForStorefront(
  item: { visibility_config?: unknown; category?: { visibility_config?: unknown; is_active?: boolean } | null; is_available?: boolean },
  timezone: string = "Asia/Kolkata",
  now: Date = new Date(),
  hotelHideUnavailable?: boolean
): boolean {
  return getItemDisplayState(item, timezone, now, hotelHideUnavailable) !== "hidden";
}

// Storefront helper: drop hidden items and force is_available=false for items
// in the "show as unavailable" state. Use in place of any explicit
// `hide_unavailable && !is_available` filter — this helper centralises that
// rule and respects per-item / per-category overrides.
export function applyVisibilityState<T extends { visibility_config?: unknown; category?: any; is_available?: boolean }>(
  item: T,
  timezone: string = "Asia/Kolkata",
  now: Date = new Date(),
  hotelHideUnavailable?: boolean
): T | null {
  const state = getItemDisplayState(item as any, timezone, now, hotelHideUnavailable);
  if (state === "hidden") return null;
  if (state === "unavailable") return { ...item, is_available: false };
  return item;
}

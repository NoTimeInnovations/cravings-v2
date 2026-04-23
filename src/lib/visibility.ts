export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type VisibilityConfig =
  | { type: "default"; hidden: boolean }
  | {
      type: "scheduled";
      days: Weekday[];
      from: string; // "HH:mm"
      to: string;   // "HH:mm"
    };

export const DEFAULT_VISIBILITY: VisibilityConfig = { type: "default", hidden: false };

const WEEKDAY_ORDER: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function normalize(config: unknown): VisibilityConfig {
  if (!config || typeof config !== "object") return DEFAULT_VISIBILITY;
  const c = config as any;
  if (c.type === "scheduled" && Array.isArray(c.days) && typeof c.from === "string" && typeof c.to === "string") {
    return { type: "scheduled", days: c.days, from: c.from, to: c.to };
  }
  if (c.type === "default") return { type: "default", hidden: !!c.hidden };
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

// Storefront helper: filter menu items by both their own and their category's visibility.
export function isItemVisibleForStorefront(
  item: { visibility_config?: unknown; category?: { visibility_config?: unknown; is_active?: boolean } | null },
  timezone: string = "Asia/Kolkata",
  now: Date = new Date()
): boolean {
  if (item.category && item.category.is_active === false) return false;
  return resolveVisibility(item.visibility_config, item.category?.visibility_config, timezone, now).visible;
}

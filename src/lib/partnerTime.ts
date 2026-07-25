/**
 * Universal partner-timezone date helpers.
 *
 * Every partner-facing "today" / "this month" / date-range figure (analytics,
 * settlements, earnings, stats) MUST be bucketed by the PARTNER's own IANA
 * timezone (`partners.timezone`), not the browser's or the server's — otherwise
 * a partner in Dubai, London, or New York sees a "today" that is hours off.
 *
 * Built on dayjs + the utc/timezone plugins (already a dependency). This is
 * correct worldwide: it handles DST transitions and fractional offsets
 * (India +5:30, Nepal +5:45, Chatham +12:45) because the timezone plugin
 * resolves offsets via the Intl time-zone database.
 *
 * All functions return UTC ISO instants suitable for a Hasura
 * `created_at: { _gte: startISO, _lte: endISO }` filter.
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Fallback when a partner has no (or an invalid) timezone set. */
export const DEFAULT_TZ = "Asia/Kolkata";

export type UtcRange = { startISO: string; endISO: string };

/**
 * Resolve a usable IANA timezone: trims, validates against the Intl database,
 * and falls back to the default for empty/garbage values so callers never throw.
 */
export function safeTz(tz?: string | null): string {
  const z = typeof tz === "string" && tz.trim() ? tz.trim() : DEFAULT_TZ;
  try {
    // Throws for an unknown zone; cheap and correct across environments.
    dayjs().tz(z);
    return z;
  } catch {
    return DEFAULT_TZ;
  }
}

/** The current instant expressed in the partner's timezone. */
function nowInTz(tz?: string | null) {
  return dayjs().tz(safeTz(tz));
}

const rangeOf = (start: dayjs.Dayjs, end: dayjs.Dayjs): UtcRange => ({
  startISO: start.utc().toISOString(),
  endISO: end.utc().toISOString(),
});

/** [start,end] covering the partner's local "today". */
export function todayRange(tz?: string | null): UtcRange {
  const d = nowInTz(tz);
  return rangeOf(d.startOf("day"), d.endOf("day"));
}

/** [start,end] covering the partner's local "yesterday". */
export function yesterdayRange(tz?: string | null): UtcRange {
  const d = nowInTz(tz).subtract(1, "day");
  return rangeOf(d.startOf("day"), d.endOf("day"));
}

/**
 * [start,end] for a calendar month in the partner's timezone. `year`/`month`
 * (month = 1-12) default to the current month. Uses the last instant of the
 * month as the inclusive end.
 */
export function monthRange(tz?: string | null, year?: number, month?: number): UtcRange {
  const z = safeTz(tz);
  const base =
    year && month
      ? dayjs.tz(`${year}-${String(month).padStart(2, "0")}-01`, z)
      : nowInTz(z);
  return rangeOf(base.startOf("month"), base.endOf("month"));
}

/** [start,end] for the current week (Monday-based) in the partner's timezone. */
export function weekRange(tz?: string | null): UtcRange {
  const today = nowInTz(tz).startOf("day");
  const backToMonday = (today.day() + 6) % 7; // day(): 0=Sun … 6=Sat
  const start = today.subtract(backToMonday, "day");
  const end = start.add(6, "day").endOf("day");
  return rangeOf(start, end);
}

/**
 * [start,end] for an inclusive span of local calendar dates (both YYYY-MM-DD),
 * interpreted in the partner's timezone. Order-tolerant (swaps if reversed).
 */
export function dateRange(startDate: string, endDate: string, tz?: string | null): UtcRange {
  const z = safeTz(tz);
  let s = startDate;
  let e = endDate;
  if (s > e) [s, e] = [e, s];
  return rangeOf(dayjs.tz(s, z).startOf("day"), dayjs.tz(e, z).endOf("day"));
}

/** Today's local calendar date (YYYY-MM-DD) in the partner's timezone. */
export function todayLocalDate(tz?: string | null): string {
  return nowInTz(tz).format("YYYY-MM-DD");
}

/**
 * The local calendar date (YYYY-MM-DD) of a UTC instant, in the partner's
 * timezone — the inverse of the range helpers, for bucketing rows in code.
 */
export function localDateInTz(iso: string, tz?: string | null): string | null {
  const d = dayjs(iso);
  if (!d.isValid()) return null;
  return d.tz(safeTz(tz)).format("YYYY-MM-DD");
}

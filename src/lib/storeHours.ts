/**
 * STORE WORKING HOURS — when the shop is open, without anyone flipping a switch.
 *
 * A weekly schedule (each weekday open/closed with one or more time ranges) plus
 * dated exceptions that override a single day: a holiday closure, or different
 * hours just for that date. Evaluated in the STORE's timezone, never the
 * customer's — a Kerala restaurant closes at 11pm IST whether the phone looking
 * at it is in Dubai or Toronto.
 *
 * This is the one place that answers "is the shop open right now", so the
 * storefront modal, the settings preview and the WhatsApp "are you open?" reply
 * can never disagree.
 *
 * Absent or disabled config means ALWAYS OPEN. That is deliberate: the feature is
 * opt-in, and 1000+ existing stores have no schedule. A resolver that defaulted
 * to closed would shut every one of them the moment this shipped.
 */

/** 0 = Sunday … 6 = Saturday, matching Date.getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HoursRange {
  /** "HH:MM", 24h, store-local. */
  from: string;
  to: string;
}

export interface DaySchedule {
  /** Explicitly shut for the whole day. `ranges` is ignored when true. */
  closed?: boolean;
  ranges: HoursRange[];
}

/** A single dated override — a holiday, or one-off hours. */
export interface HoursException {
  /** "YYYY-MM-DD" in the store's timezone. */
  date: string;
  closed?: boolean;
  ranges?: HoursRange[];
  /** Shown to the partner in settings; never rendered to customers. */
  note?: string;
}

export interface StoreHours {
  enabled: boolean;
  /** Exactly 7 entries, index 0 = Sunday. */
  days: DaySchedule[];
  exceptions: HoursException[];
}

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** A sensible starting week for a partner switching this on: 9am–10pm daily. */
export function defaultStoreHours(): StoreHours {
  return {
    enabled: true,
    days: Array.from({ length: 7 }, () => ({ ranges: [{ from: "09:00", to: "22:00" }] })),
    exceptions: [],
  };
}

// ── Parsing ────────────────────────────────────────────────────────────────

const HHMM = /^(\d{1,2}):(\d{2})$/;

/** Minutes since midnight, or null when the string is not a valid time. */
export function toMinutes(v: unknown): number | null {
  const m = HHMM.exec(String(v ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function parseRanges(raw: unknown): HoursRange[] {
  if (!Array.isArray(raw)) return [];
  const out: HoursRange[] = [];
  for (const r of raw) {
    const from = String((r as any)?.from ?? "").trim();
    const to = String((r as any)?.to ?? "").trim();
    // A range whose ends do not parse cannot be evaluated, and guessing at it
    // would silently open or close a shop. Drop it instead.
    if (toMinutes(from) == null || toMinutes(to) == null) continue;
    out.push({ from, to });
  }
  return out;
}

/**
 * Normalise whatever is stored into a shape the resolver can trust, or null when
 * there is no usable schedule (which every caller treats as "always open").
 *
 * Accepts the JSON string form too: storefront_settings is a jsonb column that
 * this codebase has historically written stringified, so both shapes are live in
 * the database right now.
 */
export function parseStoreHours(raw: unknown): StoreHours | null {
  let src: any = raw;
  if (typeof src === "string") {
    try {
      src = JSON.parse(src);
    } catch {
      return null;
    }
  }
  if (!src || typeof src !== "object") return null;
  if (src.enabled === false) return null;

  const days: DaySchedule[] = Array.from({ length: 7 }, (_, i) => {
    const d = Array.isArray(src.days) ? src.days[i] : undefined;
    if (!d || typeof d !== "object") return { closed: false, ranges: [] };
    return { closed: !!d.closed, ranges: parseRanges(d.ranges) };
  });

  const exceptions: HoursException[] = Array.isArray(src.exceptions)
    ? src.exceptions
        .filter((e: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(e?.date ?? "")))
        .map((e: any) => ({
          date: String(e.date),
          closed: !!e.closed,
          ranges: parseRanges(e.ranges),
          ...(e.note ? { note: String(e.note) } : {}),
        }))
    : [];

  // A schedule where no day can ever open is almost certainly a half-finished
  // edit, not an instruction to shut the business permanently. Treat it as
  // unconfigured so the store keeps trading.
  const anyOpen =
    days.some((d) => !d.closed && d.ranges.length > 0) ||
    exceptions.some((e) => !e.closed && (e.ranges?.length ?? 0) > 0);
  if (!anyOpen) return null;

  return { enabled: true, days, exceptions };
}

/** Pull the schedule out of a partner's storefront_settings blob. */
export function storeHoursFromSettings(settings: unknown): StoreHours | null {
  let src: any = settings;
  if (typeof src === "string") {
    try {
      src = JSON.parse(src);
    } catch {
      return null;
    }
  }
  if (!src || typeof src !== "object") return null;
  return parseStoreHours(src.store_hours);
}

// ── Evaluation ─────────────────────────────────────────────────────────────

interface LocalNow {
  weekday: Weekday;
  minutes: number;
  /** "YYYY-MM-DD" in the store's zone. */
  date: string;
}

/** Where "now" falls in the STORE's timezone. */
export function localNow(timezone: string, now: Date = new Date()): LocalNow {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "Asia/Kolkata",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    const hour = get("hour") === "24" ? 0 : Number(get("hour"));
    return {
      weekday: (wd >= 0 ? wd : now.getDay()) as Weekday,
      minutes: hour * 60 + Number(get("minute")),
      date: `${get("year")}-${get("month")}-${get("day")}`,
    };
  } catch {
    // Unknown IANA zone — fall back to the runtime clock rather than refusing to
    // answer, which would read as "closed" on a bad timezone string.
    const d = now;
    const p = (n: number) => String(n).padStart(2, "0");
    return {
      weekday: d.getDay() as Weekday,
      minutes: d.getHours() * 60 + d.getMinutes(),
      date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    };
  }
}

/** The date string N days after the given one, in the same (store-local) frame. */
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const p = (v: number) => String(v).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

function weekdayOf(date: string): Weekday {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}

/**
 * What applies on a given store-local date: the dated exception if there is one,
 * otherwise that weekday's schedule. The LAST matching exception wins, so a row
 * edited later in the list is the one that counts.
 */
function scheduleFor(hours: StoreHours, date: string): DaySchedule {
  const ex = [...hours.exceptions].reverse().find((e) => e.date === date);
  if (ex) return { closed: !!ex.closed, ranges: ex.ranges ?? [] };
  return hours.days[weekdayOf(date)] ?? { closed: false, ranges: [] };
}

export interface OpenState {
  open: boolean;
  /** When closed: the next opening moment, store-local. Null if never in 14 days. */
  nextOpenDate: string | null;
  nextOpenTime: string | null;
  /** When open: the time it shuts, so the UI can warn "closes at 10 PM". */
  closesAt: string | null;
}

/**
 * Is the shop open at `now`?
 *
 * A range whose end is at or before its start SPANS MIDNIGHT (22:00–02:00), and
 * it belongs to the day it starts on — so Friday 22:00–02:00 keeps the shop open
 * into Saturday morning. Missing that is how a late-night kitchen shows as closed
 * to every customer ordering after midnight, which is most of them.
 */
export function isStoreOpen(
  hours: StoreHours | null | undefined,
  timezone: string,
  now: Date = new Date(),
): OpenState {
  if (!hours) return { open: true, nextOpenDate: null, nextOpenTime: null, closesAt: null };

  const at = localNow(timezone, now);

  const openNow = (date: string, minutes: number): { open: boolean; closesAt: string | null } => {
    // Today's own ranges…
    const today = scheduleFor(hours, date);
    if (!today.closed) {
      for (const r of today.ranges) {
        const from = toMinutes(r.from) as number;
        const to = toMinutes(r.to) as number;
        if (to > from) {
          if (minutes >= from && minutes < to) return { open: true, closesAt: r.to };
        } else {
          // Spans midnight: open from `from` until the end of the day.
          if (minutes >= from) return { open: true, closesAt: r.to };
        }
      }
    }
    // …and yesterday's overnight spill into this morning.
    const prev = scheduleFor(hours, addDays(date, -1));
    if (!prev.closed) {
      for (const r of prev.ranges) {
        const from = toMinutes(r.from) as number;
        const to = toMinutes(r.to) as number;
        if (to <= from && minutes < to) return { open: true, closesAt: r.to };
      }
    }
    return { open: false, closesAt: null };
  };

  const state = openNow(at.date, at.minutes);
  if (state.open) {
    return { open: true, nextOpenDate: null, nextOpenTime: null, closesAt: state.closesAt };
  }

  // Closed — find the next opening so the customer is told when to come back.
  // Two weeks is far enough to cross a holiday block and short enough to stay
  // cheap; beyond that the answer is "we don't know", not a wrong date.
  for (let i = 0; i < 14; i++) {
    const date = addDays(at.date, i);
    const day = scheduleFor(hours, date);
    if (day.closed) continue;
    const starts = day.ranges
      .map((r) => ({ mins: toMinutes(r.from) as number, from: r.from }))
      .filter((r) => i > 0 || r.mins > at.minutes)
      .sort((a, b) => a.mins - b.mins);
    if (starts.length) return { open: false, nextOpenDate: date, nextOpenTime: starts[0].from, closesAt: null };
  }
  return { open: false, nextOpenDate: null, nextOpenTime: null, closesAt: null };
}

// ── Presentation ───────────────────────────────────────────────────────────

/** "9:00 AM" from "09:00". */
export function formatTime12h(hhmm: string): string {
  const mins = toMinutes(hhmm);
  if (mins == null) return hhmm;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * "Opens today at 9:00 AM" / "Opens Monday at 9:00 AM" — for the closed modal.
 * Null when nothing is scheduled in the next fortnight, so the caller can fall
 * back to a plain "closed" rather than promising a reopening that isn't there.
 */
export function describeNextOpen(state: OpenState, todayDate: string): string | null {
  if (state.open || !state.nextOpenDate || !state.nextOpenTime) return null;
  const time = formatTime12h(state.nextOpenTime);
  if (state.nextOpenDate === todayDate) return `Opens today at ${time}`;
  if (state.nextOpenDate === addDays(todayDate, 1)) return `Opens tomorrow at ${time}`;
  return `Opens ${WEEKDAY_LABELS[weekdayOf(state.nextOpenDate)]} at ${time}`;
}

/** One day's hours as text: "9:00 AM – 10:00 PM" or "Closed". */
export function describeDay(day: DaySchedule): string {
  if (day.closed || day.ranges.length === 0) return "Closed";
  return day.ranges.map((r) => `${formatTime12h(r.from)} – ${formatTime12h(r.to)}`).join(", ");
}

/**
 * Recurrence helpers for scheduled notifications. SERVER-ONLY — imports
 * `cron-parser` (a Node lib). Never import this into a client component, or
 * cron-parser will be pulled into the browser bundle.
 *
 * A schedule's recurrence is stored as a 5-field cron expression plus an IANA
 * timezone. The UI works in friendly presets (daily / weekly + weekdays + time);
 * `buildCronExpr` converts a preset to cron, and the dispatcher cron uses
 * `computeNextRun` to advance `next_run_at` after each fire.
 */

import { CronExpressionParser } from "cron-parser";

export type Frequency = "daily" | "weekly";

export interface RecurrenceInput {
  frequency: Frequency;
  /** 24h "HH:MM" in the schedule's timezone. */
  time: string;
  /** 0=Sun … 6=Sat. Required (non-empty) for weekly. */
  daysOfWeek?: number[];
}

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/** Convert a friendly recurrence preset to a 5-field cron expression, or null if invalid. */
export function buildCronExpr(input: RecurrenceInput): string | null {
  const m = TIME_RE.exec((input.time || "").trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;

  if (input.frequency === "daily") {
    return `${mm} ${hh} * * *`;
  }

  if (input.frequency === "weekly") {
    const days = Array.from(
      new Set((input.daysOfWeek || []).filter((d) => d >= 0 && d <= 6))
    ).sort((a, b) => a - b);
    if (days.length === 0) return null;
    return `${mm} ${hh} * * ${days.join(",")}`;
  }

  return null;
}

/**
 * Next fire time (UTC) strictly after `after`, interpreting `cronExpr` in
 * `timezone`. Returns null if the expression is unparseable. Because the search
 * always starts from `after`, a schedule that was down for a while naturally
 * skips straight to the next *future* slot — no backlog of missed fires.
 */
export function computeNextRun(
  cronExpr: string,
  timezone: string,
  after: Date = new Date()
): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronExpr, {
      tz: timezone || "Asia/Kolkata",
      currentDate: after,
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}

/** True if `cronExpr` is a parseable 5-field cron expression. */
export function isValidCron(cronExpr: string, timezone = "Asia/Kolkata"): boolean {
  try {
    CronExpressionParser.parse(cronExpr, { tz: timezone });
    return true;
  } catch {
    return false;
  }
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Human-readable summary of a cron expression for display in the manage list. */
export function describeCron(cronExpr: string): string {
  const parts = (cronExpr || "").trim().split(/\s+/);
  if (parts.length !== 5) return cronExpr;
  const [mm, hh, , , dow] = parts;
  const time = `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
  if (dow === "*") return `Daily at ${time}`;
  const labels = dow
    .split(",")
    .map((d) => DOW[Number(d)] ?? d)
    .join(", ");
  // Mon–Fri shorthand
  if (dow.split(",").map(Number).sort().join(",") === "1,2,3,4,5") {
    return `Weekdays at ${time}`;
  }
  return `Weekly (${labels}) at ${time}`;
}

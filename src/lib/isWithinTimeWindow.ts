/**
 * Check if the current time is within a given time window for a specific timezone.
 * Handles overnight windows (e.g., 22:00 - 06:00).
 *
 * `timezone` is an IANA zone like "Asia/Kolkata". We resolve the wall-clock
 * hour:minute "now" in that zone via Intl.DateTimeFormat and compare against
 * the window. Defaults to Asia/Kolkata so legacy callers get the previous behavior.
 */
export function isWithinTimeWindow(
  timeWindow: { from: string; to: string } | null | undefined,
  timezone: string = "Asia/Kolkata",
): boolean {
  if (!timeWindow?.from || !timeWindow?.to) return true; // No restriction

  let nowH: number;
  let nowM: number;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    nowH = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    nowM = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  } catch {
    // Invalid IANA zone — fall back to the runtime's local time.
    const now = new Date();
    nowH = now.getHours();
    nowM = now.getMinutes();
  }

  const [fromH, fromM] = timeWindow.from.split(":").map(Number);
  const [toH, toM] = timeWindow.to.split(":").map(Number);

  const nowMinutes = nowH * 60 + nowM;
  const startMinutes = fromH * 60 + fromM;
  const endMinutes = toH * 60 + toM;

  // Overnight window (e.g., 22:00 - 06:00)
  if (startMinutes > endMinutes) {
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  }

  return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
}

/**
 * Format 24h time string to 12h display (e.g., "14:30" → "2:30 PM")
 */
export function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

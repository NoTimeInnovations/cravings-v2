/**
 * Check if the current time is within a given time window.
 * Handles overnight windows (e.g., 22:00 - 06:00).
 */
export function isWithinTimeWindow(
  timeWindow: { from: string; to: string } | null | undefined,
): boolean {
  if (!timeWindow?.from || !timeWindow?.to) return true; // No restriction

  const now = new Date();

  const [fromH, fromM] = timeWindow.from.split(":").map(Number);
  const [toH, toM] = timeWindow.to.split(":").map(Number);

  const start = new Date();
  start.setHours(fromH, fromM, 0, 0);

  const end = new Date();
  end.setHours(toH, toM, 0, 0);

  // Overnight window (e.g., 22:00 - 06:00)
  if (start > end) {
    return now >= start || now <= end;
  }

  // Regular window (e.g., 10:00 - 22:00)
  return now >= start && now <= end;
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

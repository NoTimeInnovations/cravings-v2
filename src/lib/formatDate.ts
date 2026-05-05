export function formatDate(input: string, timeZone?: string): string {
  const date = new Date(input);
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  };

  return date.toLocaleString("en-US", options);
}

export function getDateOnly(input: string, timeZone?: string): string {
  // e.g.: JUN 2
  const date = new Date(input);
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: tz,
  };
  return date.toLocaleDateString("en-US", options);
}

// e.g. "1-Apr 23" — short id + short month + day
export function formatOrderShortId(
  displayId: string | number | null | undefined,
  id: string | null | undefined,
  createdAt: string | null | undefined,
): string {
  const date = new Date(createdAt || Date.now());
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const shortId =
    (displayId !== null && displayId !== undefined && displayId !== ""
      ? String(displayId)
      : id?.slice(0, 4).toUpperCase()) || "N/A";
  return `${shortId}-${month} ${day}`;
}


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


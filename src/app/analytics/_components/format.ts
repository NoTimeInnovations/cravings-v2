export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return n.toLocaleString("en-IN");
}

export function rupees(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (n >= 1_00_00_000) return "₹" + (n / 1_00_00_000).toFixed(1) + "Cr";
  if (n >= 1_00_000) return "₹" + (n / 1_00_000).toFixed(1) + "L";
  if (n >= 1_000) return "₹" + (n / 1_000).toFixed(1) + "K";
  return "₹" + n.toLocaleString("en-IN");
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits) + "%";
}

export function deltaLabel(delta: number | null | undefined, axis: "up" | "down" = "up") {
  if (delta === null || delta === undefined) return { text: "—", tone: "muted" as const };
  const sign = delta > 0 ? "+" : "";
  const tone =
    axis === "up"
      ? delta > 0
        ? ("up" as const)
        : delta < 0
          ? ("down" as const)
          : ("muted" as const)
      : delta < 0
        ? ("up" as const)
        : delta > 0
          ? ("down" as const)
          : ("muted" as const);
  return { text: `${sign}${delta.toFixed(1)}%`, tone };
}

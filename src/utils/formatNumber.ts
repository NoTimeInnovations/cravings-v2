// lib/utils.ts

/**
 * Formats a number into a compact, human-readable string (e.g., 1.2K, 1.5M).
 * @param num The number to format.
 * @returns A formatted string.
 */
export const formatCompactNumber = (num: number): string => {
  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1);
    // Remove '.0' for whole numbers (e.g., 1.0M -> 1M)
    return formatted.endsWith(".0")
      ? formatted.slice(0, -2) + "M"
      : formatted + "M";
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(1);
    // Remove '.0' for whole numbers (e.g., 10.0K -> 10K)
    return formatted.endsWith(".0")
      ? formatted.slice(0, -2) + "K"
      : formatted + "K";
  }
  return num.toString();
};
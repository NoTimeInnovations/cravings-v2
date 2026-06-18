// Helpers to show human-friendly place names (Swiggy/Zomato style) instead of
// raw geocoder output. Google often prefixes addresses with a "plus code"
// (e.g. "28QW+QW2") which customers don't understand — we hide it and surface
// the recognizable locality name (e.g. "Kollamkudimugal").

// A plus code looks like "28QW+QW2" / "VR7X+MMH".
const PLUS_CODE_RE = /^[A-Z0-9]{2,}\+[A-Z0-9]{2,}$/i;

export function isPlusCode(s: string): boolean {
  return PLUS_CODE_RE.test(s.trim());
}

/** Remove plus-code segments from a full address string. */
export function stripPlusCode(address?: string | null): string {
  if (!address) return "";
  return address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !isPlusCode(p))
    .join(", ");
}

/**
 * Best-effort recognizable place name from a full address — the first segment
 * that isn't a plus code, pincode or country. Used as a fallback when an
 * explicit `placeName` wasn't captured at save time.
 */
export function extractPlaceName(address?: string | null): string {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const isPincode = (s: string) => /^\d{3,7}$/.test(s);
  const skip = new Set(["india"]);
  for (const p of parts) {
    if (isPlusCode(p)) continue;
    if (isPincode(p)) continue;
    if (skip.has(p.toLowerCase())) continue;
    if (p.length < 2) continue;
    return p;
  }
  return stripPlusCode(address).split(",")[0]?.trim() || address.trim();
}

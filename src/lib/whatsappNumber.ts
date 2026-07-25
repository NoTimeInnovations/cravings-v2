// Shared WhatsApp-number normalisation + validation.
//
// A valid WhatsApp number is required to book a Porter delivery, and Settings →
// Delivery blocks saving without one. These helpers are the single source of
// truth for that rule so other settings screens can warn about a missing/invalid
// number before the partner hits the save-time error.

/**
 * Normalise a phone / WhatsApp number to the bare local form: strips spaces,
 * "+", dashes, brackets, the country code, and any leading trunk "0". So
 * "+91 98765 43210", "098765 43210", "0 98765 43210" all become "9876543210".
 * Returns whatever digits remain if it can't reach 10 (the caller validates
 * length), so a genuinely-short entry still fails loudly.
 */
export function sanitizeLocalPhone(raw: string, countryCode?: string): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  const cc = String(countryCode ?? "").replace(/\D/g, "");
  if (cc && d.length > 10 && d.startsWith(cc)) d = d.slice(cc.length);
  d = d.replace(/^0+/, "");
  // India local numbers are exactly 10 digits — keep the 10-digit-tail cleanup
  // for India only. Other countries have shorter/longer local numbers (UAE 9,
  // Qatar/Oman 8, …), so truncating to 10 would corrupt a valid number.
  const isIndia = !cc || cc === "91";
  if (isIndia && d.length > 10) d = d.slice(-10);
  return d;
}

/**
 * True when `raw` is a valid local WhatsApp number for the given country code —
 * mirrors the length check in Settings → Delivery: India (country code empty or
 * 91) needs exactly 10 digits; other countries need 6–15.
 */
export function isValidLocalWhatsappNumber(raw: string, countryCode?: string): boolean {
  const number = sanitizeLocalPhone(raw, countryCode);
  if (!number) return false;
  const cc = String(countryCode ?? "").replace(/\D/g, "");
  const isIndia = !cc || cc === "91";
  return isIndia ? number.length === 10 : number.length >= 6 && number.length <= 15;
}

type WhatsappEntry = { number?: string | null; area?: string | null };

/**
 * True when the partner has at least one WhatsApp number and every entry is
 * valid — i.e. a Delivery save would pass the WhatsApp check. Returns false when
 * none are set or any is malformed (space, country code, wrong length).
 */
export function hasValidWhatsappNumbers(
  numbers?: WhatsappEntry[] | null,
  countryCode?: string,
): boolean {
  if (!Array.isArray(numbers) || numbers.length === 0) return false;
  return numbers.every((n) => isValidLocalWhatsappNumber(n?.number ?? "", countryCode));
}

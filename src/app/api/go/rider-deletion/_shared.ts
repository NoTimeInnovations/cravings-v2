// Shared helpers for the Menuthere Go rider self-service account-deletion flow.
// These routes proxy to the delivery pool (server-side) so the pool API stays
// origin-locked and the rider's token never reaches the browser.
export const POOL = process.env.DELIVERY_POOL_URL || "";

// Accept a 10-digit Indian number, "91XXXXXXXXXX", or a "+<E.164>"; return E.164
// (e.g. "+9199XXXXXXXX") or null. The pool requires E.164.
export function toE164(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  const digits = s.replace(/[^0-9]/g, "");
  if (s.startsWith("+") && /^\+[1-9]\d{7,14}$/.test("+" + digits)) return "+" + digits;
  if (digits.length === 10) return "+91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
  return null;
}

const COOKIE = "rd_tok";
const COOKIE_PATH = "/api/go/rider-deletion";

export const cookieName = COOKIE;
export const cookiePath = COOKIE_PATH;

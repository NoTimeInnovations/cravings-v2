/**
 * Country-aware phone handling for Comeback Messages.
 *
 * The shared normalizePhone() in whatsapp-broadcast.ts is India-centric by
 * design: it prepends "91" to any 10-digit string. That is correct for the
 * partners it was written for and wrong for the Qatar, UAE and Maldives partners
 * on this platform — a 10-digit Maldivian number would be sent to a nonexistent
 * Indian one. Comeback runs unattended against hundreds of numbers at a time, so
 * it resolves the dial code from the PARTNER's country instead of assuming.
 *
 * The other job here is refusing junk. Customer phone rows include placeholders
 * like "000000000" and "........" — sending to those produces guaranteed
 * failures, and failures are exactly what Meta's quality rating punishes.
 */

import { MARKETING_BLOCKED_DIAL_CODES } from "./config";

/** ISO-3166 alpha-2 → dial code, for the countries this platform actually serves. */
const DIAL_BY_COUNTRY: Record<string, string> = {
  IN: "91",
  AE: "971",
  QA: "974",
  SA: "966",
  OM: "968",
  KW: "965",
  BH: "973",
  MV: "960",
  LK: "94",
  GB: "44",
  US: "1",
  CA: "1",
  AU: "61",
  SG: "65",
  MY: "60",
};

/** National number lengths per dial code, used to tell "already prefixed" from "not". */
const NATIONAL_LEN: Record<string, number[]> = {
  "91": [10],
  "971": [9],
  "974": [8],
  "966": [9],
  "968": [8],
  "965": [8],
  "973": [8],
  "960": [7],
  "94": [9],
  "44": [10],
  "1": [10],
  "61": [9],
  "65": [8],
  "60": [9, 10],
};

export interface PartnerDialContext {
  country?: string | null;
  country_code?: string | null;
}

/**
 * The partner's dial code. country_code may be stored either as a dial code
 * ("91", "+91") or as an ISO country ("IN"), so both shapes are accepted before
 * falling back to India — the overwhelming majority here.
 */
export function partnerDialCode(partner: PartnerDialContext | null | undefined): string {
  const raw = (partner?.country_code || "").trim().replace(/^\+/, "");
  if (raw && /^\d{1,4}$/.test(raw)) return raw;
  const iso = (raw || partner?.country || "").trim().toUpperCase();
  if (iso && DIAL_BY_COUNTRY[iso]) return DIAL_BY_COUNTRY[iso];
  return "91";
}

/** Digits only. */
export function digits(phone: string | null | undefined): string {
  return String(phone || "").replace(/\D/g, "");
}

export type PhoneRejection = "empty" | "too_short" | "too_long" | "placeholder" | "marketing_blocked";

export interface NormalizedPhone {
  /** Country-qualified digits ready for the Graph API, e.g. "919846012345". */
  e164: string;
  /** National part, for display and for matching this codebase's local-keyed users. */
  national: string;
  dialCode: string;
}

/**
 * Placeholder numbers that exist in the users table. These are not typos to be
 * repaired — they are fields somebody had to fill in, and they must never be sent to.
 */
function isPlaceholder(d: string): boolean {
  if (/^(\d)\1+$/.test(d)) return true; // 0000000000, 1111111111
  if (d === "1234567890" || d === "0123456789") return true;
  return false;
}

/**
 * Resolve one stored phone to something safe to send to, or explain the refusal.
 * Accepts local ("9846012345"), prefixed ("919846012345") and messy ("+91 98460 12345")
 * forms and converges them, so a customer who appears in both shapes folds to one person.
 */
export function normalizeForPartner(
  phone: string | null | undefined,
  partner: PartnerDialContext | null | undefined,
): { ok: true; value: NormalizedPhone } | { ok: false; reason: PhoneRejection } {
  const d = digits(phone);
  if (!d) return { ok: false, reason: "empty" };
  if (isPlaceholder(d)) return { ok: false, reason: "placeholder" };

  const dial = partnerDialCode(partner);
  const lens = NATIONAL_LEN[dial] || [10];

  let national = d;
  if (d.startsWith(dial) && lens.includes(d.length - dial.length)) {
    // Already country-qualified.
    national = d.slice(dial.length);
  } else if (d.startsWith("0") && lens.includes(d.length - 1)) {
    // Trunk prefix: "09846012345" → "9846012345".
    national = d.slice(1);
  } else if (lens.includes(d.length)) {
    national = d;
  } else if (d.length > (lens[0] ?? 10)) {
    // Longer than a national number and not our dial code: another country's
    // number stored in full. Trust it as already qualified rather than mangling it.
    const foreign = Object.keys(NATIONAL_LEN).find(
      (dc) => d.startsWith(dc) && (NATIONAL_LEN[dc] || []).includes(d.length - dc.length),
    );
    if (foreign) {
      if (MARKETING_BLOCKED_DIAL_CODES.includes(foreign)) {
        return { ok: false, reason: "marketing_blocked" };
      }
      return {
        ok: true,
        value: { e164: d, national: d.slice(foreign.length), dialCode: foreign },
      };
    }
    return { ok: false, reason: "too_long" };
  } else {
    return { ok: false, reason: "too_short" };
  }

  if (MARKETING_BLOCKED_DIAL_CODES.includes(dial)) {
    return { ok: false, reason: "marketing_blocked" };
  }
  return { ok: true, value: { e164: dial + national, national, dialCode: dial } };
}

/**
 * Key used to decide "is this the same human". Two rows for one person — a guest
 * checkout storing local digits and a signed-in account storing the +91 form —
 * must collapse, or that person gets the same campaign twice in one batch.
 *
 * The last 9 digits are compared rather than the full national number because
 * stored leading zeros and trunk prefixes are inconsistent across the sources
 * that write here, and 9 digits is long enough that a collision between two real
 * customers of one restaurant is not a practical concern.
 */
export function identityKey(e164: string): string {
  return e164.slice(-9);
}

/** Human-readable refusal, shown in the exclusion breakdown. */
export const REJECTION_LABELS: Record<PhoneRejection, string> = {
  empty: "no phone number",
  too_short: "phone number looks incomplete",
  too_long: "phone number looks invalid",
  placeholder: "placeholder phone number",
  marketing_blocked: "WhatsApp does not deliver marketing to this country",
};

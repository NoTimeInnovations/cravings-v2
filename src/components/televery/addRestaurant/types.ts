// Form state + small pure helpers shared by the "Add a restaurant" steps.
//
// The phone/country/currency helpers are deliberately the SAME rules the public
// /get-started wizard uses (digit count per dial code, country → dial + currency
// auto-fill, currency stored as a SYMBOL) so a restaurant an operator creates
// here is indistinguishable from one the owner created themselves.

import _PHONE_DIGITS_BY_CODE from "@/data/phoneDigitsByCode.json";
import { ALL_COUNTRIES } from "@/lib/countries";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";

const PHONE_DIGITS_BY_CODE = _PHONE_DIGITS_BY_CODE as Record<string, number>;

/** One menu row the operator is about to create. `image_url` is optional. */
export interface DraftItem {
  /** Client-only key — menu rows have no id until the partner is created. */
  key: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image_url: string;
  variants?: { name: string; price: number }[];
}

/** Everything the modal collects, minus the menu (which lives in its own state). */
export interface AddRestaurantForm {
  /**
   * Google place_id of a *business listing* the operator picked in step 1. This
   * is the switch that selects the richer Google create path, so nothing else
   * may write to it — a place_id that came from reverse-geocoding a map click
   * is usually a street address or plus-code, and feeding one to the Google
   * signup would build the restaurant from the wrong entity.
   */
  placeId: string;
  /** Listing labels, kept only so the picker can show what was chosen. */
  listingName: string;
  listingAddress: string;
  /**
   * The business name Google itself returned for the listing. The Google create
   * path derives the username from THIS, not from the (editable) `name` below —
   * so it's what the URL preview has to be built from, or the preview promises a
   * URL that will never exist. Empty when the lookup failed.
   */
  listingBusinessName: string;

  name: string;
  email: string;
  /** Local digits only — no dial code. Matches partners.phone everywhere else. */
  phone: string;
  /** E.164 dial code with the leading "+" — becomes partners.country_code. */
  phoneCode: string;
  country: string;
  /** partners.currency stores the SYMBOL (₹ / $ / €), never the ISO code. */
  currency: string;

  address: string;
  /** null until the operator drops a pin (or a Google listing supplies one). */
  lat: number | null;
  lng: number | null;
  /**
   * place_id the map picker resolved for the pin. Stored on the partner so the
   * storefront's "Open in Maps" link points at a real place — but, unlike
   * `placeId`, it never selects a create path.
   */
  pinPlaceId: string;
  district: string;
  state: string;
}

export const EMPTY_FORM: AddRestaurantForm = {
  placeId: "",
  listingName: "",
  listingAddress: "",
  listingBusinessName: "",
  name: "",
  email: "",
  phone: "",
  // Televery's outlets are India-based, so default the dial code + currency to
  // India; both stay fully editable.
  phoneCode: "+91",
  country: "India",
  currency: "₹",
  address: "",
  lat: null,
  lng: null,
  pinPlaceId: "",
  district: "",
  state: "",
};

// --- phone ---------------------------------------------------------------

export const getPhoneDigits = (phone: string) => phone.replace(/\D/g, "");

/** Max digits we accept for a dial code (15 = E.164 ceiling when unknown). */
export const maxPhoneDigits = (phoneCode: string) =>
  PHONE_DIGITS_BY_CODE[phoneCode] || 15;

/**
 * Same rule as /get-started: when we know the country's national length the
 * number must match it exactly; otherwise fall back to the E.164 7–15 range.
 */
export function isPhoneValid(phone: string, phoneCode: string): boolean {
  const digits = getPhoneDigits(phone);
  if (!digits) return false;
  const expected = PHONE_DIGITS_BY_CODE[phoneCode];
  if (!expected) return digits.length >= 7 && digits.length <= 15;
  return digits.length === expected;
}

/** Strip a leading dial code the operator may have pasted along with the number. */
export function sanitizePhone(phone: string, phoneCode: string): string {
  let cleaned = phone.trim();
  if (phoneCode && cleaned.startsWith(phoneCode)) {
    cleaned = cleaned.slice(phoneCode.length).trim();
  } else if (phoneCode && cleaned.startsWith(phoneCode.replace("+", ""))) {
    cleaned = cleaned.slice(phoneCode.replace("+", "").length).trim();
  }
  return getPhoneDigits(cleaned).slice(0, maxPhoneDigits(phoneCode));
}

export const isEmailShaped = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// --- dropdown option sets -------------------------------------------------

/** Country picker — searchable by name, ISO code or dial code. */
export const COUNTRY_OPTIONS: SearchableSelectOption[] = ALL_COUNTRIES.map(
  (c) => ({
    value: c.name,
    label: c.name,
    hint: c.dial,
    keywords: `${c.name} ${c.iso} ${c.dial}`,
  }),
);

/**
 * Dial-code picker. Several countries share a code (+1 → US/CA/…), so entries
 * are de-duplicated by dial and every sharing country's name folds into the
 * search keywords — typing "United States" still finds "+1".
 */
export const DIAL_OPTIONS: SearchableSelectOption[] = (() => {
  const byDial = new Map<string, { label: string; keywords: string[] }>();
  for (const c of ALL_COUNTRIES) {
    if (!c.dial) continue;
    const existing = byDial.get(c.dial);
    if (existing) existing.keywords.push(c.name, c.iso);
    else
      byDial.set(c.dial, {
        label: `${c.dial} · ${c.name}`,
        keywords: [c.dial, c.name, c.iso],
      });
  }
  return Array.from(byDial.entries())
    .map(([dial, v]) => ({
      value: dial,
      label: v.label,
      keywords: v.keywords.join(" "),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
})();

// --- username -------------------------------------------------------------

/**
 * Client-side preview of the username the server will derive. Mirrors
 * storeNameToUsername in src/app/actions/checkUsername.ts — the server still has
 * the last word (it appends a number when the slug is taken).
 */
export function slugifyUsername(storeName: string): string {
  return storeName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// --- images ---------------------------------------------------------------

/**
 * ImageGridModalV2's Upload/Paste tabs hand back a `blob:` object URL, which
 * only exists in this tab's memory. Convert it to a data URL so it can be
 * shipped to uploadFileToS3 and become a real, permanent image.
 */
export async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export const isLocalImage = (url: string) =>
  url.startsWith("blob:") || url.startsWith("data:");

let itemKeySeq = 0;
export const nextItemKey = () => `draft-${Date.now()}-${itemKeySeq++}`;

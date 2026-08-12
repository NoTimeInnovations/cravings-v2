// Locale model for the public marketing pages.
//
// Deliberately cookie-based with NO URL prefix: every locale shares one URL.
// The cost of that is SEO — Googlebot crawls without cookies, so exactly one
// language per URL is ever indexed. That was a product decision; the code below
// is written to make it work well for on-site visitors, not for organic search.
//
// Nothing here is admin- or storefront-facing. Partner-authored content (menus,
// blog posts, storefronts) is stored in one language and is NOT translated.

export const LOCALES = ["en", "hi", "ar", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Locales written right-to-left. Drives <html dir> and the logical-property CSS. */
const RTL_LOCALES = new Set<Locale>(["ar"]);

export const isRtl = (locale: Locale): boolean => RTL_LOCALES.has(locale);
export const dirOf = (locale: Locale): "ltr" | "rtl" => (isRtl(locale) ? "rtl" : "ltr");

export const isLocale = (v: unknown): v is Locale =>
  typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** What the switcher shows. Endonyms — a reader looking for their own language
 *  is looking for "العربية", not "Arabic". */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  ar: "العربية",
  es: "Español",
};

/**
 * Country → locale, used ONLY to pick a first guess for a visitor who has never
 * chosen. An explicit choice always wins and is remembered.
 *
 * India resolves to English, not Hindi, on purpose: English is the working
 * language of the restaurant-owner audience this site sells to, and flipping
 * every existing Indian visitor to Hindi overnight would be a regression for
 * them. Hindi is one click away in the switcher. Change the "IN" entry if that
 * call turns out to be wrong — it is the only line that has to move.
 */
const GCC = ["AE", "SA", "QA", "KW", "OM", "BH"] as const;
const ARABIC_SPEAKING = [...GCC, "EG", "JO", "LB", "IQ", "MA", "DZ", "TN", "LY", "SY", "YE", "SD", "PS"];
const SPANISH_SPEAKING = [
  "ES", "MX", "AR", "CO", "CL", "PE", "VE", "EC", "GT", "CU", "BO", "DO",
  "HN", "PY", "SV", "NI", "CR", "PA", "UY", "GQ",
];

export const COUNTRY_LOCALE: Record<string, Locale> = {
  IN: "en",
  ...Object.fromEntries(ARABIC_SPEAKING.map((c) => [c, "ar" as Locale])),
  ...Object.fromEntries(SPANISH_SPEAKING.map((c) => [c, "es" as Locale])),
};

/** First guess for a visitor with no stored preference. Unknown country ⇒ English. */
export function localeForCountry(country: string | null | undefined): Locale {
  if (!country) return DEFAULT_LOCALE;
  return COUNTRY_LOCALE[country.toUpperCase()] ?? DEFAULT_LOCALE;
}

/** Cookie holding an EXPLICIT choice. Absent means "never chose" — which is why
 *  the country guess must not write it; otherwise a guess becomes indistinguishable
 *  from a decision and the visitor can never be re-guessed after travelling. */
export const LOCALE_COOKIE = "menuthere_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Header the proxy sets so Server Components can read the resolved locale
 *  without re-deriving it. Mirrors the existing x-user-country convention. */
export const LOCALE_HEADER = "x-user-locale";

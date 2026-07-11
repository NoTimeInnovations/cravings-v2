import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";
import COUNTRY_CURRENCY from "@/data/countryCurrency.json";
import { WORLD_CURRENCIES } from "@/lib/worldCurrencies";

export interface CountryInfo {
  /** English display name, e.g. "United Arab Emirates". */
  name: string;
  /** ISO 3166-1 alpha-2 code, e.g. "AE". Unique. */
  iso: string;
  /** E.164 calling code with a leading "+", e.g. "+971". */
  dial: string;
  /** Locale currency symbol for the country, e.g. "₹" — falls back to "$". */
  currencySymbol: string;
}

// Comprehensive list of every country & territory, derived at module load from
// libphonenumber-js (the ISO codes + calling codes it supports), Intl (English
// names) and the bundled ISO→currency map — no hand-maintained list. Mirrors the
// runtime-derived approach in worldCurrencies.ts. Computed once at module load.
function buildCountries(): CountryInfo[] {
  const currencyByIso = COUNTRY_CURRENCY as Record<string, string>;
  const symbolByCode = new Map(WORLD_CURRENCIES.map((c) => [c.code, c.symbol]));

  let regionNames: Intl.DisplayNames | null = null;
  try {
    regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    regionNames = null;
  }

  let isoCodes: CountryCode[] = [];
  try {
    isoCodes = getCountries();
  } catch {
    isoCodes = [];
  }

  const list = isoCodes.map((iso): CountryInfo => {
    const name = regionNames?.of(iso) || iso;
    let dial = "";
    try {
      dial = "+" + getCountryCallingCode(iso);
    } catch {
      dial = "";
    }
    const currencyCode = currencyByIso[iso];
    const currencySymbol =
      (currencyCode && symbolByCode.get(currencyCode)) || currencyCode || "$";
    return { name, iso, dial, currencySymbol };
  });

  // A couple of ISO codes can resolve to the same display name; keep the first
  // so the dropdown and the name→country lookup stay unambiguous.
  const seenNames = new Set<string>();
  return list
    .filter((c) => {
      const key = c.name.toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Every country & territory, sorted alphabetically by display name. */
export const ALL_COUNTRIES: CountryInfo[] = buildCountries();

/** Just the display names — handy for a simple combobox `options` array. */
export const COUNTRY_NAMES: string[] = ALL_COUNTRIES.map((c) => c.name);

const BY_NAME = new Map(ALL_COUNTRIES.map((c) => [c.name.toLowerCase(), c]));
const BY_DIAL = new Map(ALL_COUNTRIES.map((c) => [c.dial, c]));
const BY_ISO = new Map(ALL_COUNTRIES.map((c) => [c.iso, c]));

/** Resolve a country by its (case-insensitive) display name. */
export function getCountryByName(name?: string): CountryInfo | undefined {
  return name ? BY_NAME.get(name.trim().toLowerCase()) : undefined;
}

/** Resolve a country by its ISO 3166-1 alpha-2 code (e.g. a geo header). */
export function getCountryByIso(iso?: string): CountryInfo | undefined {
  return iso ? BY_ISO.get(iso.trim().toUpperCase()) : undefined;
}

/** First country matching a dialing code (e.g. to label a "+1" phone picker). */
export function getCountryByDial(dial?: string): CountryInfo | undefined {
  return dial ? BY_DIAL.get(dial) : undefined;
}

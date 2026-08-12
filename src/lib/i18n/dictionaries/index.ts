import { DEFAULT_LOCALE, type Locale } from "../config";
import en, { type Dictionary } from "./en";
import hi from "./hi";
import ar from "./ar";
import es from "./es";

export type { Dictionary };

/**
 * All dictionaries are imported statically rather than dynamically await-ed.
 *
 * They are small (a few KB of strings) and the switcher changes locale on the
 * CLIENT without a navigation, so a dynamic import would mean a network round
 * trip and a flash of the previous language every time someone switches. The
 * whole set costs less than one of this page's hero images.
 */
const DICTIONARIES: Record<Locale, Dictionary> = { en, hi, ar, es };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Fill {placeholders} in a translated string.
 *
 *   interpolate(t.hero.searchPlaceholder, { name: "Burger Town" })
 *
 * A missing value leaves the token visible on purpose — a literal "{name}" on
 * screen is a bug report; silently blanking it hides one.
 */
export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

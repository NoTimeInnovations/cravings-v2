import { DEFAULT_LOCALE, type Locale } from "../config";
import en, { type Dictionary } from "./en";
import hi from "./hi";
import ar from "./ar";
import es from "./es";
import ml from "./ml";
import ta from "./ta";
import bn from "./bn";
import ur from "./ur";
import pt from "./pt";
import fr from "./fr";
import de from "./de";
import ru from "./ru";
import tr from "./tr";
import id from "./id";
import zh from "./zh";

export type { Dictionary };

/**
 * All dictionaries are imported statically rather than dynamically await-ed.
 *
 * They are small (a few KB of strings) and the switcher changes locale on the
 * CLIENT without a navigation, so a dynamic import would mean a network round
 * trip and a flash of the previous language every time someone switches.
 *
 * The map is PARTIAL on purpose: LOCALES lists every language the switcher
 * offers, and translations land one at a time. A locale with no dictionary yet
 * renders English rather than failing to build — but note that each dictionary
 * which DOES exist is typed `Dictionary`, so it cannot be half-filled. The
 * choice is "English or complete", never "half English".
 */
const DICTIONARIES: Partial<Record<Locale, Dictionary>> = {
  en, hi, ml, ta, bn, ur, ar, es, pt, fr, de, ru, tr, id, zh,
};

/** Locales that actually have a dictionary today. The switcher uses this so it
 *  cannot offer a language that would silently render English. */
export const TRANSLATED_LOCALES = Object.keys(DICTIONARIES) as Locale[];

export const hasDictionary = (locale: Locale): boolean => locale in DICTIONARIES;

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE] ?? en;
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

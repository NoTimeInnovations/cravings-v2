import type { Locale } from "./config";

// The solutions pages render their body copy from JSON in src/content/solutions.
// Each translated page has sibling files named <slug>.<locale>.json.
//
// Imported STATICALLY rather than with a dynamic import(): these are Server
// Components, the files are a few KB, and a dynamic import would make every
// caller await a module load to render its own hero.
//
// A slug with no translation for a locale falls back to English. That is the
// correct behaviour, not a gap to paper over — /solutions/[slug] serves seven
// slugs and only two are translated so far, so the untranslated ones must keep
// rendering rather than 404 or blank.
import ownersEn from "@/content/solutions/owners.json";
import ownersHi from "@/content/solutions/owners.hi.json";
import ownersAr from "@/content/solutions/owners.ar.json";
import ownersEs from "@/content/solutions/owners.es.json";
import agenciesEn from "@/content/solutions/agencies.json";
import agenciesHi from "@/content/solutions/agencies.hi.json";
import agenciesAr from "@/content/solutions/agencies.ar.json";
import agenciesEs from "@/content/solutions/agencies.es.json";

type ByLocale = Partial<Record<Locale, unknown>> & { en: unknown };

const CONTENT: Record<string, ByLocale> = {
  owners: { en: ownersEn, hi: ownersHi, ar: ownersAr, es: ownersEs },
  agencies: { en: agenciesEn, hi: agenciesHi, ar: agenciesAr, es: agenciesEs },
};

/**
 * The content document for a solutions slug in the requested locale, falling
 * back to English.
 *
 * Returns the SAME shape whichever locale wins — the translated files were
 * validated key-for-key against their English source — so callers can keep
 * their existing property access unchanged.
 */
export function getSolutionContent<T>(slug: string, locale: Locale, fallback: T): T {
  const entry = CONTENT[slug];
  if (!entry) return fallback;
  return ((entry[locale] ?? entry.en) as T) ?? fallback;
}

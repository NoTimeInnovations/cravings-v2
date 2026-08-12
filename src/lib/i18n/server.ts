import "server-only";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  localeForCountry,
  type Locale,
} from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

/**
 * The locale for THIS request, on the server.
 *
 * Order matters and is the whole contract:
 *   1. an explicit choice in the cookie — a decision, never overridden
 *   2. the locale the proxy resolved from the country header
 *   3. the country header itself, in case the proxy did not run for this route
 *   4. English
 *
 * Reading cookies()/headers() makes the caller dynamic. That costs nothing here:
 * src/app/layout.tsx already awaits headers() for x-is-custom-domain, so every
 * page under it is server-rendered on demand already.
 */
export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);

  const chosen = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const resolved = headerList.get(LOCALE_HEADER);
  if (isLocale(resolved)) return resolved;

  return localeForCountry(headerList.get("x-user-country")) ?? DEFAULT_LOCALE;
}

/** Locale + its copy, for a Server Component or generateMetadata. */
export async function getT(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}

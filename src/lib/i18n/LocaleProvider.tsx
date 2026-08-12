"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  dirOf,
  type Locale,
} from "./config";
import { getDictionary, interpolate, type Dictionary } from "./dictionaries";

type Ctx = {
  locale: Locale;
  t: Dictionary;
  dir: "ltr" | "rtl";
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<Ctx | null>(null);

/**
 * Holds the locale for client components.
 *
 * The server resolved the locale for this request and passes it in, so the
 * first paint is already in the right language — there is no flash of English
 * while JavaScript boots, which is the usual failure of cookie-based i18n.
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    // Write the cookie before touching state so a refresh mid-transition still
    // lands on the chosen language. Not HttpOnly: the switcher is a client
    // component and this is a display preference, not a credential.
    document.cookie = [
      `${LOCALE_COOKIE}=${next}`,
      "path=/",
      `max-age=${LOCALE_COOKIE_MAX_AGE}`,
      "samesite=lax",
    ].join("; ");

    setLocaleState(next);

    // <html> lives above React's tree, so it is updated directly. Both matter:
    // `lang` drives screen-reader pronunciation and font fallback, `dir` flips
    // the entire layout for Arabic.
    const html = document.documentElement;
    html.lang = next;
    html.dir = dirOf(next);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ locale, t: getDictionary(locale), dir: dirOf(locale), setLocale }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Copy for a client component.
 *
 * Falls back to English rather than throwing when used outside the provider:
 * this chrome is rendered on admin and storefront routes too, and a missing
 * provider should degrade to English, never blank the navbar.
 */
export function useT(): Ctx {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: DEFAULT_LOCALE,
    t: getDictionary(DEFAULT_LOCALE),
    dir: "ltr",
    setLocale: () => {},
  };
}

export { interpolate };

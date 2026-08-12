"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { TRANSLATED_LOCALES } from "@/lib/i18n/dictionaries";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * Manual language control.
 *
 * Switching is instant and does NOT navigate: the locale lives in a cookie and
 * React re-renders with the new dictionary, so scroll position and any open
 * form state survive. Nothing about the URL changes.
 *
 * Styling uses LOGICAL properties (ms/me, start/end) throughout so the menu
 * anchors correctly when the page flips to RTL for Arabic.
 */
export function LanguageSwitcher({
  className = "",
  align = "end",
}: {
  className?: string;
  /** Which edge the dropdown hangs from, in logical terms. */
  align?: "start" | "end";
}) {
  const { locale, t, setLocale } = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape — a bare dropdown that traps the page
  // is worse than no dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.common.changeLanguage}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
      >
        <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
        {/* The current language, written in itself — someone hunting for their
            own language scans for "العربية", not for "Arabic". */}
        <span>{LOCALE_LABELS[locale]}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t.common.language}
          className={`absolute z-50 mt-2 min-w-[10rem] overflow-hidden rounded-xl border border-black/10 bg-white py-1 shadow-lg ${
            align === "end" ? "end-0" : "start-0"
          }`}
        >
          {/* Only languages with a dictionary — offering one without would
              silently render English and read as a broken switcher. */}
          {TRANSLATED_LOCALES.map((code) => {
            const active = code === locale;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(code)}
                  // lang on the option so the browser picks the right font and
                  // a screen reader switches voice per entry.
                  lang={code}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm transition-colors hover:bg-black/[0.04] ${
                    active ? "font-semibold text-gray-900" : "text-gray-700"
                  }`}
                >
                  <span>{LOCALE_LABELS[code]}</span>
                  {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default LanguageSwitcher;

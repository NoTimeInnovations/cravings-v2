"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useMenuLanguageStore } from "@/store/menuLanguageStore";
import { currencySymbolForLang } from "@/lib/currencyDisplay";

/**
 * Renders a menu price as `amount` followed by the currency symbol, e.g.
 * "14 QAR" (English) / "14 ر.ق" (Arabic).
 *
 * - The symbol ALWAYS comes after the number.
 * - The symbol is language-aware: the Latin/international form for every
 *   language except Arabic, which uses the native short symbol. It re-renders
 *   live when the storefront language switcher changes the language.
 * - `dir="ltr"` + bidi isolation keep the number-then-symbol order even on an
 *   RTL (Arabic) page.
 * - The symbol is wrapped in a `notranslate` span so Google Translate never
 *   touches it.
 *
 * `amount` is the already-formatted number (string / number / node) — pass the
 * same `formatPrice(...)` / `.toFixed()` expression the call site used.
 */
export function MenuPrice({
  currency,
  amount,
  className,
  symbolClassName,
}: {
  currency?: string | null;
  amount: React.ReactNode;
  /** Applied to the wrapper span (carry over the old price element's classes). */
  className?: string;
  /** Extra classes for the currency-symbol span only. */
  symbolClassName?: string;
}) {
  const lang = useMenuLanguageStore((s) => s.lang);
  const symbol = currencySymbolForLang(currency, lang);
  const showSymbol = !!symbol && symbol !== "🚫";

  return (
    <span dir="ltr" style={{ unicodeBidi: "isolate" }} className={className}>
      {amount}
      {showSymbol && (
        <>
          {" "}
          <span translate="no" className={cn("notranslate", symbolClassName)}>
            {symbol}
          </span>
        </>
      )}
    </span>
  );
}

export default MenuPrice;

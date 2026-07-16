import { create } from "zustand";

// The customer-menu display language (the storefront language switcher's current
// selection). Google Translate translates item text in place, but the currency
// symbol lives in a `notranslate` span, so prices read this store to decide
// whether to show the Latin (e.g. "QAR") or native (e.g. "ر.ق") symbol and
// re-render live when the language changes. Default "en"; the LanguageSwitcher
// syncs it from Google's `googtrans` cookie on mount and on every switch.

function langFromGoogtransCookie(): string {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/googtrans=([^;]+)/);
  if (!m) return "en";
  // cookie looks like "/en/ar"
  const parts = decodeURIComponent(m[1]).split("/");
  return parts[2] || "en";
}

interface MenuLanguageState {
  /** Current menu language code, e.g. "en" | "ar" | "hi". */
  lang: string;
  setLang: (lang: string | null | undefined) => void;
  /** Re-read the language from Google's cookie (call on mount / after reload). */
  syncFromCookie: () => void;
}

export const useMenuLanguageStore = create<MenuLanguageState>((set) => ({
  lang: "en",
  setLang: (lang) => set({ lang: lang || "en" }),
  syncFromCookie: () => set({ lang: langFromGoogtransCookie() }),
}));

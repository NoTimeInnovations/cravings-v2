// Short, native currency symbols for the storefront menu.
//
// `partner.currency` stores a display SYMBOL derived at settings time from
// Intl.NumberFormat("en", …). For many currencies that "en" symbol is just the
// 3-letter ISO code (e.g. QAR, AED, SAR, THB) rather than a glyph. When the menu
// is machine-translated (Google Translate on the storefront), those Latin codes
// get EXPANDED into full words — e.g. "QAR" → "ريال قطري" ("Qatari Riyal") in
// Arabic — which is exactly what we don't want on a price.
//
// This module maps any stored currency (an ISO code OR a symbol/glyph) to its
// SHORTEST NATIVE symbol (QAR → "ر.ق"). Native short symbols are either
// non-Latin glyphs or compact abbreviations that translation engines leave
// alone, so the price stays tight and unchanged in every language.
//
// Framework-free (no React / no DOM) so both components and the zustand order
// store can import it.

import CURRENCIES from "@/data/currencies.json";
import { WORLD_CURRENCIES } from "@/lib/worldCurrencies";

// The hide-price sentinel — partners who don't show prices store this. Never
// touch it.
const HIDE_PRICE = "🚫";

// ISO-4217 code → shortest native/compact symbol. Arabic-script currencies use
// their native abbreviations (the whole point of this change); the rest use the
// widely recognised glyph or compact abbreviation. Anything not listed falls
// back to whatever was stored (already a glyph for most currencies).
export const CURRENCY_NATIVE_SYMBOL: Record<string, string> = {
  // ── Middle East & North Africa (Arabic script) ──
  AED: "د.إ",
  SAR: "ر.س",
  SR: "ر.س", // legacy alias used by the app's fallback currency list
  QAR: "ر.ق",
  KWD: "د.ك",
  BHD: "د.ب",
  OMR: "ر.ع.",
  YER: "﷼",
  JOD: "د.ا",
  IQD: "ع.د",
  LBP: "ل.ل",
  SYP: "ل.س",
  EGP: "ج.م",
  LYD: "ل.د",
  DZD: "د.ج",
  MAD: "د.م.",
  TND: "د.ت",
  SDG: "ج.س.",
  IRR: "﷼",
  AFN: "؋",

  // ── South Asia ──
  INR: "₹",
  PKR: "₨",
  NPR: "रू",
  LKR: "Rs",
  BDT: "৳",
  BTN: "Nu.",
  MVR: "Rf",

  // ── East & South-East Asia ──
  CNY: "¥",
  JPY: "¥",
  KRW: "₩",
  THB: "฿",
  VND: "₫",
  IDR: "Rp",
  MYR: "RM",
  PHP: "₱",
  SGD: "$",
  HKD: "$",
  TWD: "NT$",
  MMK: "K",
  KHR: "៛",
  LAK: "₭",
  MNT: "₮",
  BND: "$",
  MOP: "MOP$",

  // ── Europe ──
  EUR: "€",
  GBP: "£",
  CHF: "Fr.",
  RUB: "₽",
  UAH: "₴",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  ISK: "kr",
  RON: "lei",
  BGN: "лв",
  RSD: "дин.",
  TRY: "₺",
  GEL: "₾",
  AZN: "₼",
  AMD: "֏",
  BYN: "Br",
  MDL: "L",
  MKD: "ден",
  ALL: "L",
  BAM: "KM",

  // ── Americas ──
  USD: "$",
  CAD: "$",
  MXN: "$",
  BRL: "R$",
  ARS: "$",
  CLP: "$",
  COP: "$",
  PEN: "S/",
  UYU: "$",
  PYG: "₲",
  BOB: "Bs",
  VES: "Bs",
  GTQ: "Q",
  HNL: "L",
  NIO: "C$",
  CRC: "₡",
  PAB: "B/.",
  DOP: "RD$",
  CUP: "$",
  JMD: "$",
  TTD: "$",
  BBD: "$",
  BSD: "$",
  BZD: "$",
  XCD: "$",
  GYD: "$",
  SRD: "$",
  HTG: "G",

  // ── Africa ──
  ZAR: "R",
  NGN: "₦",
  GHS: "₵",
  KES: "KSh",
  UGX: "USh",
  TZS: "TSh",
  ETB: "Br",
  XOF: "CFA",
  XAF: "FCFA",
  RWF: "FRw",
  MWK: "MK",
  ZMW: "ZK",
  MZN: "MT",
  AOA: "Kz",
  BWP: "P",
  NAD: "$",
  MUR: "₨",
  SCR: "₨",
  MGA: "Ar",

  // ── Oceania ──
  AUD: "$",
  NZD: "$",
  FJD: "$",
  PGK: "K",
  XPF: "₣",

  // ── Other ──
  ILS: "₪",
  KZT: "₸",
};

// Build symbol → ISO reverse lookups so a stored SYMBOL (glyph or the "en" Intl
// code) can be resolved back to an ISO code, then to its native symbol.
//
//  1. the world list (Intl "en" symbols, e.g. "$" → USD, "QAR" → QAR)
//  2. the small bundled fallback (currencies.json: value → label)
//  3. our native symbols above (so an already-native value round-trips)
//
// Earlier sources win, so glyphs shared by many currencies (e.g. "$") resolve to
// a sensible default whose native symbol is the same glyph anyway.
const SYMBOL_TO_ISO: Record<string, string> = {};
const remember = (symbol: string | undefined, iso: string) => {
  const key = (symbol || "").trim();
  if (key && !(key in SYMBOL_TO_ISO)) SYMBOL_TO_ISO[key] = iso;
};

for (const c of WORLD_CURRENCIES) remember(c.symbol, c.code);
for (const c of CURRENCIES as Array<{ label: string; value: string }>) {
  remember(c.value, c.label);
}
for (const [iso, symbol] of Object.entries(CURRENCY_NATIVE_SYMBOL)) {
  remember(symbol, iso);
}

/** Resolve any stored currency string to its ISO-4217 code, or null. */
export function currencyIsoFromSymbol(stored?: string | null): string | null {
  const s = (stored || "").trim();
  if (!s || s === HIDE_PRICE) return null;
  const up = s.toUpperCase();
  // Already an ISO code we know (covers QAR/AED/THB… stored as their "en" code).
  if (CURRENCY_NATIVE_SYMBOL[up] && /^[A-Z]{2,3}$/.test(up)) return up;
  return SYMBOL_TO_ISO[s] ?? (/^[A-Z]{3}$/.test(up) ? up : null);
}

/**
 * The shortest native symbol for a stored currency value. Accepts an ISO code
 * or any symbol/glyph. Returns the hide-price sentinel and empty/unknown values
 * unchanged so existing fallbacks (e.g. `currency || "₹"`) still apply.
 */
export function shortCurrencySymbol(stored?: string | null): string {
  if (stored == null) return "";
  const s = stored.trim();
  if (!s || s === HIDE_PRICE) return stored;
  const iso = currencyIsoFromSymbol(s);
  if (iso && CURRENCY_NATIVE_SYMBOL[iso]) return CURRENCY_NATIVE_SYMBOL[iso];
  return stored;
}

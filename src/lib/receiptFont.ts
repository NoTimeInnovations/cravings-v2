// Arabic-capable webfont for thermal receipts (bill + KOT).
//
// The receipt containers render Latin text in "monospace" so columns stay
// aligned. Monospace fonts (and the fallback a thermal-print path lands on)
// have NO Arabic glyphs, so partners with Arabic item names (e.g. AL BASHA)
// lost the Arabic when the page was rasterized to the printer.
//
// next/font self-hosts this at build time, so it is guaranteed available on
// the print device without a runtime network request. Use it as a PER-GLYPH
// fallback after "monospace": Latin keeps the monospace look, Arabic letters
// fall through to Noto Sans Arabic.
import { Noto_Sans_Arabic } from "next/font/google";

export const receiptArabicFont = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
});

// font-family value for a receipt container: monospace first (Latin/columns),
// Arabic glyphs served by the self-hosted Noto Sans Arabic fallback.
export const RECEIPT_FONT_FAMILY = `monospace, ${receiptArabicFont.style.fontFamily}`;

// Sanitize text for thermal/POS printers: strip bidi/zero-width/control
// characters, map common non-ASCII punctuation to ASCII equivalents, and
// collapse whitespace. Most thermal printers cannot render the original
// glyphs and will print garbage (e.g. boxes or "?") otherwise.

// Map non-ASCII punctuation/whitespace code points to ASCII equivalents.
const PUNCTUATION_MAP: Record<string, string> = {
  "،": ",", // Arabic comma
  "؛": ";", // Arabic semicolon
  "؟": "?", // Arabic question mark
  "«": '"', // left-pointing double angle quote
  "»": '"', // right-pointing double angle quote
  "“": '"', // left double quotation mark
  "”": '"', // right double quotation mark
  "„": '"', // double low-9 quotation mark
  "‘": "'", // left single quotation mark
  "’": "'", // right single quotation mark
  "‚": "'", // single low-9 quotation mark
  "–": "-", // en dash
  "—": "-", // em dash
  "−": "-", // minus sign
  "•": "*", // bullet
  "·": ".", // middle dot
  "…": "...", // horizontal ellipsis
  " ": " ", // no-break space
  " ": " ", // en space
  " ": " ", // em space
  " ": " ", // thin space
  " ": " ", // hair space
  " ": " ", // narrow no-break space
  "　": " ", // ideographic space
};

// Bidi controls, zero-width chars, BOM, and other format chars that survive
// JSON transport but break printing:
//   U+200B-U+200F  zero-width + LRM/RLM
//   U+202A-U+202E  bidi embeddings/overrides
//   U+2060-U+2069  word joiner + isolate marks
//   U+FEFF         BOM / zero-width no-break space
const INVISIBLE_CHARS_RE =
  /[​-‏‪-‮⁠-⁩﻿]/g;

// Combining diacritics left over after NFKD normalization (U+0300-U+036F).
const COMBINING_MARKS_RE = /[̀-ͯ]/g;

const PUNCTUATION_RE = new RegExp(
  `[${Object.keys(PUNCTUATION_MAP).join("")}]`,
  "g"
);

// Anything outside printable ASCII + newline. Run last to drop whatever
// could not be mapped (e.g. non-Latin scripts that the printer cannot render).
const NON_PRINTABLE_ASCII_RE = /[^\x20-\x7E\n]/g;

export const sanitizePrintText = (
  text: string | null | undefined
): string => {
  if (!text) return "";

  let out = text.normalize("NFKD");
  out = out.replace(COMBINING_MARKS_RE, "");
  out = out.replace(INVISIBLE_CHARS_RE, "");
  out = out.replace(PUNCTUATION_RE, (m) => PUNCTUATION_MAP[m] ?? m);
  out = out.replace(NON_PRINTABLE_ASCII_RE, "");

  // Tidy whitespace and stray comma spacing introduced by stripped chars.
  out = out
    .replace(/[ \t]+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();

  return out;
};

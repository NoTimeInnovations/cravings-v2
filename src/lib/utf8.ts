/**
 * Remove unpaired UTF-16 surrogate code units from a string.
 *
 * JavaScript strings are UTF-16; astral characters (emoji, etc.) are stored as a
 * high+low surrogate PAIR. Editing / autofilling / pasting on some devices can
 * leave a LONE surrogate (U+D800–U+DFFF with no partner) in user input — e.g.
 * half of an emoji left behind in a customer's name. A lone surrogate has no
 * valid UTF-8 encoding, so serializing it into a request body produces invalid
 * bytes and third-party APIs reject the call. Razorpay's Orders API, for one,
 * fails order creation with: "The notes field should contain valid UTF-8
 * encoded characters."
 *
 * This strips only the broken halves; well-formed surrogate pairs (real emoji)
 * are preserved. Returns "" for null / undefined.
 */
export function stripLoneSurrogates(value: unknown): string {
  return String(value ?? "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "") // high surrogate with no following low
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ""); // low surrogate with no preceding high
}

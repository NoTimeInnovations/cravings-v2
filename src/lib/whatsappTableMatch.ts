import { encryptPhoneToken, identityTokensAllowed } from "@/lib/whatsappFlow/orderLink";

/**
 * Match a table from an inbound WhatsApp message ("I want to order from Table 5").
 *
 * The customer is sitting AT the table reading a printed prompt, so the phrasing
 * is taught at the point of use — but they will still type it a dozen ways, and
 * the surrounding traffic is hostile: of 162 inbound messages containing the
 * substring "table", 119 are "vegetables" or "comfortable" and 43 are
 * reservations ("can u reserve table for 20members"). None of those may match.
 *
 * Two properties do the heavy lifting:
 *
 *  1. WHOLE-TOKEN matching (same rule as matchBranchCandidate in the Meta
 *     webhook) — "vegetables" tokenizes to one token that is not "table", so the
 *     substring trap disappears entirely.
 *  2. A table word must be FOLLOWED by a label, with only a tight set of
 *     qualifiers allowed in between. "table no 5" matches; "table for 4" does
 *     not, because "for" is not a qualifier — which is exactly how reservation
 *     traffic is refused.
 *
 * Being wrong is expensive, not merely untidy: qr_codes.price_adjustment rewrites
 * every menu, variant and offer price on the qrScan render, so linking the wrong
 * table changes what the customer PAYS. That is why an ambiguous label refuses
 * rather than guesses.
 */

export interface TableCandidate {
  id: string;
  table_number: number | null;
  table_name: string | null;
}

export type TableMatch =
  | { kind: "hit"; table: TableCandidate; label: string }
  /** Label resolved to more than one table — prod has duplicate
   *  (partner_id, table_number) rows and no unique index, so this is reachable. */
  | { kind: "ambiguous"; label: string }
  | null;

/** Words that introduce a table label. "room" is included because hotel
 *  properties are the only ones whose guests already message this way. */
const TABLE_WORDS = new Set(["table", "tbl", "tble", "room", "seat", "cabin"]);

/** The ONLY tokens allowed between the table word and its label. Deliberately
 *  excludes "for" — "table for 4" is a reservation, not a table-5 order. */
const TABLE_QUALIFIERS = new Set(["no", "nos", "number", "num", "nu", "nmbr", "nambar"]);

const NUMBER_WORDS = new Map<string, number>([
  ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5],
  ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10],
  ["eleven", 11], ["twelve", 12], ["thirteen", 13], ["fourteen", 14],
  ["fifteen", 15], ["sixteen", 16], ["seventeen", 17], ["eighteen", 18],
  ["nineteen", 19], ["twenty", 20],
]);

/** A message longer than this is prose, not a table request. */
const MAX_TOKENS = 40;

const tokenize = (s: string | null | undefined): string[] =>
  (s || "").toLowerCase().match(/[a-z0-9]+/g) || [];

/** "007" and "7" name the same table; compare on a canonical form. */
const canonical = (s: string): string => {
  const t = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return /^\d+$/.test(t) ? String(parseInt(t, 10)) : t;
};

/** Is this token usable as a table label? Accepts "5", "five", and short
 *  alphanumeric codes like "a1"/"b12" — 46% of named tables in production use
 *  that convention, so excluding them would gut the feature. */
function labelFromToken(token: string): string | null {
  if (/^\d{1,4}$/.test(token)) return token;
  const word = NUMBER_WORDS.get(token);
  if (word !== undefined) return String(word);
  if (/^[a-z]{1,2}\d{1,3}$/.test(token)) return token;
  return null;
}

/**
 * Extract the table label the customer named, or null.
 * Exported for tests — the extraction is where the false positives live.
 */
export function extractTableLabel(normalizedText: string): string | null {
  const tokens = tokenize(normalizedText);
  if (!tokens.length || tokens.length > MAX_TOKENS) return null;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // Glued: "table5", "room101". The tokenizer already stripped "#" and "-",
    // so "Table #5" arrives as two tokens and is handled by the separated form.
    const glued = /^(?:table|tbl|room|seat|cabin)([a-z]?\d{1,4})$/.exec(tok);
    if (glued) {
      const label = labelFromToken(glued[1]);
      if (label) return label;
      continue;
    }

    if (!TABLE_WORDS.has(tok)) continue;

    // Separated: skip AT MOST ONE qualifier, then the next token must be a
    // label. Anything else (like "for") ends this occurrence — that refusal is
    // the whole defence against reservation traffic.
    let j = i + 1;
    if (j < tokens.length && TABLE_QUALIFIERS.has(tokens[j])) j++;
    if (j >= tokens.length) continue;

    const label = labelFromToken(tokens[j]);
    if (label) return label;
  }
  return null;
}

/**
 * Resolve a message to one of the partner's tables.
 *
 * Resolution is two-pass because a partner's `table_name` frequently does NOT
 * equal its `table_number` — in production 78% of numerically-named tables are
 * labelled "204"/"401" while table_number runs 1..N. Matching only on
 * table_number would silently fail exactly the partners who bothered to name
 * their tables.
 */
export function matchTableCandidate(
  normalizedText: string,
  candidates: TableCandidate[],
): TableMatch {
  const label = extractTableLabel(normalizedText);
  if (!label) return null;

  // table_number 0 is the storefront/delivery QR sentinel, never a real table.
  const asNumber = /^\d+$/.test(label) ? parseInt(label, 10) : null;
  if (asNumber !== null && (asNumber === 0 || asNumber > 9999)) return null;

  const usable = candidates.filter(
    (c) => c.table_number !== null && c.table_number !== 0,
  );

  let hits =
    asNumber === null
      ? []
      : usable.filter((c) => c.table_number === asNumber);

  if (!hits.length) {
    const want = canonical(label);
    hits = usable.filter(
      (c) => c.table_name && canonical(c.table_name) === want,
    );
  }

  if (hits.length === 1) return { kind: "hit", table: hits[0], label };
  if (hits.length > 1) return { kind: "ambiguous", label };
  return null;
}

/** The order link for a scanned table, matching what the printed QR encodes. */
export function buildTableOrderLink(
  domain: string,
  storeName: string | null | undefined,
  qrId: string,
  /** Mints the same signed auto-login token buildOrderLink uses, so the order is
   *  attributed to the number that ASKED for the link.
   *
   *  Without it the table link is anonymous, and /qrScan simply orders as
   *  whoever the browser is already signed in as — the restaurant owner testing
   *  from their own phone, or the previous customer on a shared device. That is
   *  a silent mis-attribution: wrong phone on the ticket, wrong order history,
   *  loyalty points to a stranger.
   *
   *  Local phone, NOT the country-coded one: auto-login keys the account on
   *  `${local}@user.com`, so a prefixed number mints a session for a brand-new
   *  empty account and loses the customer's address, history and balance. */
  opts?: { partnerId?: string | null; phone?: string | null; ttlMinutes?: number },
): string {
  const slug = (storeName || "store").trim().replace(/\s+/g, "-");
  const base = `https://${domain}/qrScan/${slug}/${qrId}`;
  const partnerId = opts?.partnerId?.trim();
  const phone = opts?.phone?.trim();
  if (!partnerId || !phone) return base;
  // Same gate buildOrderLink applies: with no real META_APP_SECRET the signing
  // key is the public fallback, so an identity token would be both forgeable and
  // refused by the verifier. Fall back to a plain table link instead of minting
  // a customer's phone under a key anyone can derive.
  if (!identityTokensAllowed()) return base;
  return `${base}?olt=${encryptPhoneToken(partnerId, phone, opts?.ttlMinutes ?? 23 * 60)}`;
}

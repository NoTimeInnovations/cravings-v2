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
 *
 * A SECOND form exists because the rules above only fire on the word "table":
 * partners name their tables "AC 1", "T1", "F 10", and the customer is reading
 * that name off the tent card, so that is what they type. 5 partners and 61
 * tables in production are named this way, and every one of those messages used
 * to get silence. matchBareTableName handles the no-table-word case — see the
 * guards on it, which are what keep it from eating ordinary traffic.
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

    // "table G 1" — partners label tables with a space ("G 1", "F 10"), which
    // is how it reads on the table tent, so that is what customers type. Join a
    // short bare letter to the digits that follow it. Bounded to 1-2 letters so
    // ordinary words can't be swallowed, and the qualifier skip above already
    // consumed "no"/"number", which would otherwise glue into "no5".
    if (/^[a-z]{1,2}$/.test(tokens[j]) && j + 1 < tokens.length && /^\d{1,3}$/.test(tokens[j + 1])) {
      return tokens[j] + tokens[j + 1];
    }

    const label = labelFromToken(tokens[j]);
    if (label) return label;
  }
  return null;
}

/** Words that signal the customer is trying to ORDER, required for a bare
 *  (no "table" word) match. Measured against 91,343 real inbound messages: the
 *  bare rules below fire 91 times without this gate and 5 times with it — and
 *  all 5 are genuine table requests. It is what rejects "606, B5, Chandragiri
 *  BDA", a delivery address at a partner whose tables really are named B5. */
const ORDER_INTENT = new Set([
  "order", "orders", "ordering", "oder", "ordr", "odr", "menu", "want", "need",
  "book", "booking",
]);

/** Never the letter half of a spaced label. "a" is the English article, and
 *  "order a 2 cups" / "the cost of a 24-day meal plan" would otherwise resolve
 *  to tables A2 and A24. This single exclusion removes the large majority of
 *  spaced-form false positives. */
const BARE_LETTER_STOP = new Set([
  "a", "i", "e", "o", "u", "an", "the", "to", "of", "my", "me", "we", "is", "it",
  "in", "on", "at",
]);

/**
 * Match a table the customer named WITHOUT any table word — "i want to order
 * from AC 1", "order T3".
 *
 * Safe only because it matches against the partner's ACTUAL table names, never
 * a pattern: "ac1" means something here purely because this partner has a table
 * called "AC 1". Three further guards, each earning its place against real
 * traffic:
 *
 *  1. The name must contain BOTH a letter and a digit. A bare "5" is a quantity,
 *     a price or a time far more often than a table, so purely numeric names
 *     keep requiring the word "table".
 *  2. The message must carry an ORDER_INTENT word.
 *  3. The label must END the message. "order a 2 cups" and "a 24-day meal plan"
 *     both die here.
 */
function matchBareTableName(
  normalizedText: string,
  usable: TableCandidate[],
): TableMatch {
  const byName = new Map<string, TableCandidate[]>();
  for (const c of usable) {
    if (!c.table_name) continue;
    const key = canonical(c.table_name);
    // Guard 1 — letter AND digit.
    if (!/[a-z]/.test(key) || !/\d/.test(key)) continue;
    const arr = byName.get(key) || [];
    arr.push(c);
    byName.set(key, arr);
  }
  if (!byName.size) return null;

  const tokens = tokenize(normalizedText);
  if (!tokens.length || tokens.length > MAX_TOKENS) return null;
  // Guard 2 — the customer has to be asking to order.
  if (!tokens.some((t) => ORDER_INTENT.has(t))) return null;

  const resolve = (key: string): TableMatch => {
    const hits = byName.get(key);
    if (!hits) return null;
    // Same refusal as the table-word path: a duplicated name must not be guessed,
    // because the wrong table rewrites prices.
    if (hits.length > 1) return { kind: "ambiguous", label: key };
    return { kind: "hit", table: hits[0], label: hits[0].table_name!.trim() };
  };

  // Guard 3 — only the label at the very end of the message is considered.
  const last = tokens.length - 1;
  const glued = resolve(tokens[last]);
  if (glued) return glued;

  // Spaced form, "… ac 1" — the letter half must not be an article.
  if (
    tokens.length >= 2 &&
    /^[a-z]{1,3}$/.test(tokens[last - 1]) &&
    !BARE_LETTER_STOP.has(tokens[last - 1]) &&
    /^\d{1,3}$/.test(tokens[last])
  ) {
    return resolve(tokens[last - 1] + tokens[last]);
  }
  return null;
}

/**
 * Cheap "is it worth looking up this partner's tables?" test — string work only,
 * no query. The webhook runs this on EVERY inbound message, so it must stay
 * cheap; matchTableCandidate is what actually decides.
 */
export function mayNameTable(normalizedText: string): boolean {
  if (extractTableLabel(normalizedText)) return true;
  const tokens = tokenize(normalizedText);
  if (!tokens.length || tokens.length > MAX_TOKENS) return false;
  if (!tokens.some((t) => ORDER_INTENT.has(t))) return false;
  const last = tokens.length - 1;
  // A trailing "a1"-shaped token, or a trailing "a 1"-shaped pair.
  if (/^[a-z]{1,3}\d{1,3}$/.test(tokens[last])) return true;
  return (
    tokens.length >= 2 &&
    /^[a-z]{1,3}$/.test(tokens[last - 1]) &&
    !BARE_LETTER_STOP.has(tokens[last - 1]) &&
    /^\d{1,3}$/.test(tokens[last])
  );
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
  const usable = candidates.filter(
    (c) => c.table_number !== null && c.table_number !== 0,
  );

  const label = extractTableLabel(normalizedText);
  // No table word at all — the customer may still have named the table by the
  // name printed on it ("order from AC 1").
  if (!label) return matchBareTableName(normalizedText, usable);

  // table_number 0 is the storefront/delivery QR sentinel, never a real table.
  const asNumber = /^\d+$/.test(label) ? parseInt(label, 10) : null;
  if (asNumber !== null && (asNumber === 0 || asNumber > 9999)) return null;

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
  // The message said "table" but the label matched nothing — it may still name
  // the table the other way ("table AC 1" at a partner numbering 1..N).
  return matchBareTableName(normalizedText, usable);
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

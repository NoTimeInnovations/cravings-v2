/**
 * Invoice numbering (`orders.display_id`).
 *
 * `display_id` is the PARTNER's own invoice number: a per-store counter that
 * restarts at 1 every store-local day. It is what staff shout across a counter
 * and what gets printed on the bill, so it has to read as an unbroken
 * 1, 2, 3, … run. (It is deliberately never shown to a customer — see
 * `customerOrderRef`.)
 *
 * Draft orders — `status = "pending_payment"`, an online order inserted BEFORE
 * the customer pays so it is never lost — used to draw from that same counter.
 * Most drafts are never paid, so every abandoned one punched a permanent hole in
 * the day's sequence and partners saw 12, 10, 8, 7, 6 … in their orders list.
 *
 * So drafts get their OWN namespace: "D1", "D2", … A real invoice number is
 * issued only when the payment lands and the draft becomes a live order
 * (`finalizeCfOrder`), which is the first moment the order is worth a number.
 *
 * Both counters are derived from the same one-query snapshot of the store's day
 * (`dayInvoiceNumbersQuery` + the two reducers below) so the client and the
 * payment webhooks number orders identically.
 */

/** Prefix that marks a value as a draft number rather than a real invoice number. */
export const DRAFT_INVOICE_PREFIX = "D";

/**
 * Statuses that are not a real order and therefore must not consume an invoice
 * number: `pending_payment` is an unpaid draft, `expired` is a draft the partner
 * cleared or the reconciler gave up on. Same list the order feeds filter on.
 */
export const NON_INVOICED_STATUSES = ["pending_payment", "expired"];

export interface InvoiceNumberRow {
  id?: string | null;
  display_id?: string | number | null;
  status?: string | null;
}

/** The numeric value of a real invoice number, or null if this is not one. */
export function parseRealInvoiceNo(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  // Strict digits: "D3" is a draft, not invoice 3, and parseInt would happily
  // read "3x" as 3.
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** The numeric value behind a "D7" draft number, or null if this is not one. */
export function parseDraftInvoiceNo(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  const m = /^D(\d+)$/i.exec(String(value).trim());
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isDraftInvoiceNo(value: string | number | null | undefined): boolean {
  return parseDraftInvoiceNo(value) !== null;
}

/**
 * Whether this order has a number worth showing at all — real or draft. Replaces
 * the `Number(display_id) > 0` checks, which read "D7" as NaN and fell back to a
 * uuid slice.
 */
export function hasInvoiceNo(value: string | number | null | undefined): boolean {
  return parseRealInvoiceNo(value) !== null || parseDraftInvoiceNo(value) !== null;
}

export function formatDraftInvoiceNo(n: number): string {
  return `${DRAFT_INVOICE_PREFIX}${n}`;
}

// ── The store's day ────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** Milliseconds `tz` is ahead of UTC at the given instant. */
function tzOffsetMs(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const hour = get("hour") === 24 ? 0 : get("hour");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  // Drop sub-second precision from the source instant: the formatted parts have
  // none, and leaving it in would leak milliseconds into the offset.
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The UTC instant of midnight starting the given local calendar date in `tz`. */
function localMidnightUtc(tz: string, naiveMidnight: number): number {
  // Two passes: the offset a day-length away from the target is normally the
  // offset at midnight too, but a DST change between the two shifts it, so
  // re-read the offset at the first guess.
  const guess = naiveMidnight - tzOffsetMs(tz, new Date(naiveMidnight));
  return naiveMidnight - tzOffsetMs(tz, new Date(guess));
}

/**
 * The UTC instants bounding the store-local calendar day that `at` falls in.
 *
 * The invoice counter resets at the STORE's midnight, not the browser's — a
 * partner checking their dashboard while travelling, and a payment webhook
 * running on a UTC server, have to agree on which day an order belongs to.
 */
export function storeDayBounds(
  timezone: string | null | undefined,
  at: Date = new Date(),
): { from: string; to: string } {
  const tz = timezone || "Asia/Kolkata";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const naiveMidnight = Date.UTC(get("year"), get("month") - 1, get("day"), 0, 0, 0, 0);
    const start = localMidnightUtc(tz, naiveMidnight);
    // The day ENDS at the next local midnight, not start + 24h: a DST-transition
    // day is 23 or 25 hours long, and a fixed 24h window would either spill into
    // the next day or clip the last hour off this one.
    const end = localMidnightUtc(tz, naiveMidnight + DAY_MS);
    return {
      from: new Date(start).toISOString(),
      to: new Date(end - 1).toISOString(),
    };
  } catch {
    // Unknown IANA zone — fall back to the runtime clock's own day rather than
    // refusing to number the order.
    const d = new Date(at);
    return {
      from: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString(),
      to: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString(),
    };
  }
}

// ── Next number ────────────────────────────────────────────────────────────

/**
 * Every number already handed out on one store-day. One query feeds both
 * counters, so a checkout that needs the real number and one that needs the
 * draft number cost the same single round trip.
 */
export const dayInvoiceNumbersQuery = `
  query DayInvoiceNumbers($partnerId: uuid!, $from: timestamptz!, $to: timestamptz!) {
    # Deliberately NOT filtered by deletion_status: a soft-deleted order's number
    # is already printed on a bill/KOT, so reissuing it would duplicate an invoice.
    orders(
      where: {
        partner_id: { _eq: $partnerId },
        created_at: { _gte: $from, _lte: $to }
      },
      order_by: { created_at: desc },
      limit: 2000
    ) {
      id
      display_id
      status
    }
  }
`;

/**
 * Whether a real invoice number is already held by some order OTHER than
 * `exceptId` — i.e. handing it out again would print two bills with one number.
 */
export function isInvoiceNoTaken(
  rows: InvoiceNumberRow[],
  invoiceNo: number,
  exceptId?: string | null,
): boolean {
  return (rows || []).some(
    (row) =>
      row?.id !== exceptId &&
      !NON_INVOICED_STATUSES.includes(String(row?.status ?? "")) &&
      parseRealInvoiceNo(row?.display_id) === invoiceNo,
  );
}

/**
 * The next real invoice number for the day.
 *
 * MAX, not last-created + 1: a draft is numbered when its payment lands but keeps
 * the `created_at` it was placed at, so the newest row is not the highest number.
 */
export function nextRealInvoiceNo(rows: InvoiceNumberRow[]): number {
  let max = 0;
  for (const row of rows || []) {
    if (NON_INVOICED_STATUSES.includes(String(row?.status ?? ""))) continue;
    const n = parseRealInvoiceNo(row?.display_id);
    if (n !== null && n > max) max = n;
  }
  return max + 1;
}

/**
 * The next draft number for the day, e.g. "D3".
 *
 * A promoted draft trades its "D" number for a real one, so the highest draft
 * number of the day can occasionally be reused by a later draft. That label only
 * ever appears in the Draft Orders view, which the promoted order has already
 * left, so nothing shows two "D3"s at once.
 */
export function nextDraftInvoiceNo(rows: InvoiceNumberRow[]): string {
  let max = 0;
  for (const row of rows || []) {
    const n = parseDraftInvoiceNo(row?.display_id);
    if (n !== null && n > max) max = n;
  }
  return formatDraftInvoiceNo(max + 1);
}

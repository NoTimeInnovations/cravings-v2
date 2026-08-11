/**
 * The order reference shown to a CUSTOMER.
 *
 * Never `display_id`. That column is a per-store counter that starts at 1, so
 * "#4" on a WhatsApp message tells the customer this restaurant has taken four
 * orders ever — and anyone who orders twice can measure the volume in between.
 * It is a business metric, and it does not belong in the customer's pocket.
 *
 * `short_id` identifies the order just as precisely without counting anything:
 * it is the first 8 characters of the order's uuid, stamped at placement. Orders
 * placed before that column existed fall back to slicing the uuid here, which
 * produces the identical string — so this is stable for old and new orders alike,
 * and support can still match what the customer quotes to a row.
 *
 * The partner's own surfaces — dashboard, POS, kitchen ticket, rider push — keep
 * `display_id` on purpose. It is their own number, it is what staff shout across
 * a counter, and it never leaves the store.
 */
export function customerOrderRef(
  order:
    | { short_id?: string | null; id?: string | null }
    | null
    | undefined,
): string {
  const short = String(order?.short_id ?? "").trim();
  if (short) return short;
  const id = String(order?.id ?? "").trim();
  return id ? id.slice(0, 8) : "";
}

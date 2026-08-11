/**
 * Dispatch history across re-dispatches.
 *
 * `delivery_provider_meta.dispatchId` is a POINTER to the current dispatch, and
 * Hasura's `_append` is a shallow jsonb merge (`||`) — writing the same key
 * REPLACES it. So every re-dispatch silently orphaned the previous dispatch and
 * every rider booked under it: a Porter cancel followed by "Cancel & rebook"
 * left the order showing one rider and no trace of the cancelled one. That is
 * precisely what the rider-history block was written to prevent.
 *
 * `dispatchIds` keeps the full list alongside the pointer, so everything that
 * already reads `dispatchId` keeps working untouched.
 *
 * ── Why these live here and not in porterBridge.ts ────────────────────────────
 *
 * That file is `"use server"`, where EVERY export must be an async function —
 * Next.js treats each one as a callable Server Action and fails the build with
 * "Server Actions must be async functions." These are synchronous pure helpers,
 * so they belong in a plain module. Keeping them out also means they are unit
 * testable without dragging in Hasura or the bridge transport.
 */

/** Plenty for any real order; a bound so a pathological retry loop cannot grow
 *  the jsonb blob without limit. */
export const MAX_TRACKED_DISPATCHES = 20;

/** How many earlier dispatches to actually fetch when rendering. Each one is a
 *  bridge round trip on a 5s poll, so the tail is capped — the newest are the
 *  ones anybody is looking for. */
export const MAX_PRIOR_DISPATCH_FETCH = 5;

export interface DispatchHistoryRow {
  bookingId: string;
  provider: string;
  status: string;
  crn: string | null;
  driver: {
    name?: string;
    phone?: string;
    vehicleNumber?: string;
    vehicleModel?: string;
    photoUrl?: string;
  } | null;
  fareAmount: number | null;
  /** Set only for a deliberate partner/customer/operator cancel, so the row can
   *  say WHO cancelled rather than a bare "Cancelled". */
  cancelledBy?: string | null;
  cancelReason?: string | null;
  /** null = a rider was never assigned (the search timed out) as opposed to a
   *  rider taking the job and then dropping it. */
  assignedAt?: number | null;
  /** Porter reported cancelled for a booking that HAD a rider, with no
   *  reallocation to follow. Porter's own app has been observed still showing
   *  that rider en route, so this is "uncertain", not "definitively dead". */
  cancelSuspect?: boolean;
  /** Set when we followed a Porter reallocation onto a new CRN — the old one. */
  reallocatedFrom?: string | null;
  createdAt: number;
  updatedAt?: number;
}

/**
 * Every dispatch id this order has had, oldest first, with `newId` last.
 *
 * Call this with the meta as it exists BEFORE the new pointer is written — the
 * current `dispatchId` is what back-fills orders that were dispatched before
 * the list existed, so it must still be the old value when this runs.
 */
export function mergeDispatchIds(
  meta: { dispatchId?: unknown; dispatchIds?: unknown } | null | undefined,
  newId: string,
): string[] {
  const prior = Array.isArray(meta?.dispatchIds) ? meta.dispatchIds : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of [...prior, meta?.dispatchId, newId]) {
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  // Drop from the OLDEST end — the recent dispatches are the interesting ones.
  return out.slice(-MAX_TRACKED_DISPATCHES);
}

/** Newest first, one row per booking. Bookings are unique per dispatch, but a
 *  re-fetch overlap must never render the same rider twice. */
export function mergeDispatchHistory(
  ...groups: Array<DispatchHistoryRow[] | undefined>
): DispatchHistoryRow[] {
  const seen = new Set<string>();
  const rows: DispatchHistoryRow[] = [];
  for (const group of groups) {
    for (const h of group ?? []) {
      if (!h?.bookingId || seen.has(h.bookingId)) continue;
      seen.add(h.bookingId);
      rows.push(h);
    }
  }
  return rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

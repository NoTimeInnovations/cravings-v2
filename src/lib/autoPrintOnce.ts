/**
 * Remembers which orders this TAB has already auto-printed.
 *
 * Two independent things can now decide to auto-print the same order:
 *   - updateOrderStatus, when the status was changed on this device, and
 *   - the live order subscription, when auto-accept moved the order
 *     server-side and no device made the change at all.
 *
 * With auto-accept on, the second is normally the only one that fires. But a
 * partner can still beat the server to it by tapping Accept, and then both see
 * the same transition — one from making it, one from observing it — and the
 * till prints the bill twice. Claiming the (order, document) pair first makes
 * whichever gets there first the only one that prints.
 *
 * Deliberately in memory, per tab: it guards a print job, which is itself a
 * per-tab act. A reload cannot resurrect a stale claim, and the subscription
 * only ever considers orders created in the last few minutes, so the set stays
 * small and self-limiting.
 *
 * NOT a cross-device lock. Two dashboards open on two machines each hold their
 * own set and will each print — see OrderSubscriptionManager, where that case is
 * documented.
 */
const claimed = new Set<string>();

const key = (orderId: string, doc: string) => `${orderId}:${doc}`;

/**
 * Claim the right to print `doc` for `orderId`. Returns the documents this
 * caller actually won — print exactly those, and nothing if it comes back empty.
 */
export function claimAutoPrint<T extends string>(orderId: string, docs: T[]): T[] {
  if (!orderId) return [];
  const won: T[] = [];
  for (const doc of docs) {
    const k = key(orderId, doc);
    if (claimed.has(k)) continue;
    claimed.add(k);
    won.push(doc);
  }
  return won;
}

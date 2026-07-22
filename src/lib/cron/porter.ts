import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";

/**
 * Books riders for orders whose DELAYED porter dispatch is now due.
 *
 * When a partner sets delivery_rules.porter_dispatch_delay_min > 0, the trigger
 * stamps orders.porter_dispatch_due_at = now + delay instead of booking
 * immediately. This atomically CLAIMS every due row (nulls its due_at in the same
 * mutation so an overlapping tick can't re-claim it), then books each via the
 * same dispatchViaDeliveryBridge used everywhere else. Only rows with
 * delivery_provider_state IS NULL (never dispatched) and a live status are
 * claimed, so a cancelled or already-dispatched order is never booked.
 *
 * Lives in lib so it can be called both by the standalone
 * /api/cron/dispatch-due-porter route and by the merged /api/cron/dispatch.
 */
const CLAIM_DUE = `
  mutation ClaimDuePorterDispatch($now: timestamptz!) {
    update_orders(
      where: {
        porter_dispatch_due_at: { _lte: $now, _is_null: false }
        delivery_provider_state: { _is_null: true }
        status: { _nin: ["cancelled", "completed"] }
      }
      _set: { porter_dispatch_due_at: null }
    ) {
      returning { id display_id }
    }
  }
`;

// Throws only on a fatal claim-query failure; per-order errors are logged, not thrown.
export async function runPorter() {
  const now = new Date().toISOString();
  const res = (await fetchFromHasuraServer(CLAIM_DUE, { now })) as any;
  const due: Array<{ id: string }> = res?.update_orders?.returning ?? [];

  // No work this tick — skip loading the delivery-bridge dep entirely.
  if (due.length === 0) return { claimed: 0, dispatched: 0 };

  const { dispatchViaDeliveryBridge } = await import("@/app/actions/porterBridge");

  let dispatched = 0;
  for (const o of due) {
    try {
      const r = await dispatchViaDeliveryBridge(o.id);
      if (r.ok) dispatched++;
      else console.warn(`[dispatch-due-porter] ${o.id} dispatch failed: ${r.message}`);
    } catch (e: any) {
      console.warn(`[dispatch-due-porter] ${o.id} threw: ${e?.message || e}`);
    }
  }

  return { claimed: due.length, dispatched };
}

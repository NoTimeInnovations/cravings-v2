import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { dispatchViaDeliveryBridge } from "@/app/actions/porterBridge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Books riders for orders whose DELAYED porter dispatch is now due.
 *
 * When a partner sets delivery_rules.porter_dispatch_delay_min > 0, the trigger
 * (accepted / food_ready — in cravings-v2 orderStore or pp_menu_insert) stamps
 * orders.porter_dispatch_due_at = now + delay instead of booking immediately.
 * This cron runs every minute, atomically CLAIMS every due row (nulls its
 * due_at in the same mutation so an overlapping tick can't re-claim it), then
 * books each via the same dispatchViaDeliveryBridge used everywhere else.
 *
 * Only rows with delivery_provider_state IS NULL (never dispatched) and a live
 * status are claimed, so a cancelled order (whose due_at was already cleared)
 * or an already-dispatched one is never booked.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (Vercel sends it; absent = allowed,
 * mirroring the other cron routes).
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

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date().toISOString();
    const res = (await fetchFromHasuraServer(CLAIM_DUE, { now })) as any;
    const due: Array<{ id: string }> = res?.update_orders?.returning ?? [];

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

    return NextResponse.json({ ok: true, claimed: due.length, dispatched });
  } catch (e: any) {
    console.error("[dispatch-due-porter] failed:", e?.message || e);
    return NextResponse.json({ error: "dispatch_due_failed" }, { status: 500 });
  }
}

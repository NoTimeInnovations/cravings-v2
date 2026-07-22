import { NextRequest, NextResponse } from "next/server";
import { runPorter } from "@/lib/cron/porter";
import { runNotifications } from "@/lib/cron/notifications";
import { runBroadcasts } from "@/lib/cron/broadcasts";

export const dynamic = "force-dynamic";
// Broadcasts can send a large batch; give the combined tick headroom. Each task
// is resumable (per-item atomic claims), so a timeout mid-run is safe.
export const maxDuration = 120;

/**
 * Consolidated every-minute dispatcher. Replaces three separate every-minute
 * crons (dispatch-due-porter, dispatch-notifications, dispatch-broadcasts) with
 * ONE invocation that runs all three tasks sequentially.
 *
 * Safety:
 *  - Each task runs in its OWN try/catch and the route ALWAYS returns 200, so a
 *    failure in one task never blocks the others.
 *  - Ordering is porter -> notifications -> broadcasts: the time-sensitive rider
 *    booking runs first; broadcasts (self-resuming, least time-sensitive) run
 *    last, so if the tick ever hits maxDuration only broadcasts are cut and they
 *    continue on the next tick.
 *  - Each run* function only loads its heavy send/dispatch deps when it actually
 *    has work, so idle ticks stay cheap.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (Vercel sends it automatically when
 * CRON_SECRET is set; absent = allowed, mirroring the other cron routes).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const results: Record<string, unknown> = {};

  try {
    results.porter = await runPorter();
  } catch (e: any) {
    results.porter = { error: e?.message || String(e) };
    console.error("[dispatch] porter failed:", e?.message || e);
  }

  try {
    results.notifications = await runNotifications();
  } catch (e: any) {
    results.notifications = { error: e?.message || String(e) };
    console.error("[dispatch] notifications failed:", e?.message || e);
  }

  try {
    results.broadcasts = await runBroadcasts();
  } catch (e: any) {
    results.broadcasts = { error: e?.message || String(e) };
    console.error("[dispatch] broadcasts failed:", e?.message || e);
  }

  console.log("[dispatch]", JSON.stringify(results));
  return NextResponse.json({ ok: true, ...results });
}

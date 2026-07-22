import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { cleanupAllExpiredCustomItems } from "@/api/offers";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

/**
 * Marks expired "custom" menu items (one-off items whose attached offer has
 * ended) as deleted, across ALL partners, in a single mutation.
 *
 * This replaces the per-partner cleanup that used to run as a DB WRITE on every
 * storefront render (src/lib/hotelDataFetcher + src/app/hotels/[...id]). Running
 * it on a cron is far cheaper and — unlike the old on-view approach — also cleans
 * up partners whose page nobody happens to view.
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

  try {
    const res = (await fetchFromHasuraServer(cleanupAllExpiredCustomItems, {})) as any;
    const affected = res?.update_menu?.affected_rows ?? 0;
    if (affected > 0) {
      console.log("[cleanup-expired-custom-items]", JSON.stringify({ affected }));
    }
    return NextResponse.json({ ok: true, affected });
  } catch (e: any) {
    console.error("[cleanup-expired-custom-items] failed:", e?.message || e);
    return NextResponse.json({ error: "cleanup_failed" }, { status: 500 });
  }
}

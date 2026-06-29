import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Auto-reactivate menu items whose scheduled-availability time has passed.
// Items are turned OFF from Manage Availability with a `reactivate_at` timestamp
// (the Scheduled Availability feature); this cron flips them back ON once due.
// "Never" schedules store reactivate_at = null and are skipped (a null column
// never satisfies `_lte`, so they're naturally excluded).
const M_REACTIVATE_DUE_ITEMS = `
  mutation ReactivateDueItems($now: timestamptz!) {
    update_menu(
      where: {
        _and: [
          { reactivate_at: { _lte: $now } },
          { is_available: { _eq: false } },
          { deletion_status: { _eq: 0 } }
        ]
      },
      _set: { is_available: true, reactivate_at: null }
    ) {
      affected_rows
    }
  }
`;

export async function GET(req: NextRequest) {
  // Vercel cron sends `Authorization: Bearer <CRON_SECRET>`. If CRON_SECRET is
  // unset we allow (so it works before the secret is configured) — mirrors the
  // other cron routes.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date().toISOString();
    const res = await fetchFromHasura(M_REACTIVATE_DUE_ITEMS, { now });
    const reactivated = res?.update_menu?.affected_rows ?? 0;
    return NextResponse.json({ ok: true, reactivated });
  } catch (e: any) {
    console.error("[reactivate-items] failed:", e?.message || e);
    return NextResponse.json({ error: "reactivate_failed" }, { status: 500 });
  }
}

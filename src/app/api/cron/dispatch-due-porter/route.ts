import { NextRequest, NextResponse } from "next/server";
import { runPorter } from "@/lib/cron/porter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Standalone endpoint kept for manual runs / rollback. The scheduled cron now
// goes through the merged /api/cron/dispatch. Core logic lives in @/lib/cron.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await runPorter();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e: any) {
    console.error("[dispatch-due-porter] failed:", e?.message || e);
    return NextResponse.json({ error: "dispatch_due_failed" }, { status: 500 });
  }
}

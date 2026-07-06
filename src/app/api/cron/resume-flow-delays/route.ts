import { NextRequest, NextResponse } from "next/server";
import { resumeDueDelayedFlows } from "@/lib/whatsappFlow/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Wakes WhatsApp-flow runs parked on a "delay" step whose wait has elapsed.
 * Runs every 10 minutes on a Vercel cron — delays are typically long (e.g. an
 * order-follow-up ~23.5h out), so a message landing up to ~10 min after its due
 * time is fine and keeps invocations low (144/day vs 1,440/day at 1-min). A
 * customer message that arrives after the delay lapses also wakes the run
 * immediately, so short delays still feel responsive.
 *
 * A flow's Delay step (seconds → 24h) parks its run in a SLEEPING state
 * (status stays "active", but a non-null `resume_at` marks it as sleeping
 * rather than awaiting a customer reply). Each tick continues every due run
 * from the node AFTER its delay — sending queued messages, chaining into a
 * further delay, parking on a reply, or finishing. Every advance is guarded by
 * the run's version CAS, so overlapping ticks (or a customer message that
 * arrives right as the delay lapses) can never double-send.
 *
 * Auth: send `Authorization: Bearer <CRON_SECRET>`. Vercel cron sends this
 * automatically when CRON_SECRET is configured; if it is unset we allow (so it
 * works before configuration), mirroring the other cron routes.
 */
// Runs woken per tick. Each wake is a few sequential Hasura round-trips, so we
// stay well under maxDuration; any overflow is CAS-safe and drains next tick.
const BATCH = 50;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await resumeDueDelayedFlows(BATCH);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("[resume-flow-delays] failed:", e?.message || e);
    return NextResponse.json({ error: "resume_failed" }, { status: 500 });
  }
}

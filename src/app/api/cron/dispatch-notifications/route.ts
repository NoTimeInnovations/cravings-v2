import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { sendBroadcast } from "@/lib/notify/broadcast";
import { computeNextRun } from "@/lib/notify/recurrence";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Dispatcher for scheduled & recurring partner notifications. Runs every minute
 * on a Vercel cron. Each tick:
 *   1. finds active schedules whose next_run_at is due (bounded batch),
 *   2. atomically *claims* each due slot by inserting its run row — the
 *      UNIQUE(schedule_id, run_at) constraint guarantees only one invocation
 *      ever sends a given slot, even if two ticks overlap,
 *   3. sends via the shared server-side broadcast path,
 *   4. re-arms recurring schedules (next_run_at = next future slot) or marks
 *      one-time / exhausted schedules completed.
 *
 * Auth: send `Authorization: Bearer <CRON_SECRET>`. Vercel cron sends this
 * automatically when CRON_SECRET is configured; if it is unset we allow (so it
 * works before configuration), mirroring /api/cron/reconcile-cf-orders.
 */

const BATCH = 50; // schedules processed per tick; the rest drain on later ticks
const GRACE_MS = 60 * 60 * 1000; // due slots older than this are skipped, not sent (no stale blasts)

const DUE_QUERY = `
  query DueSchedules($now: timestamptz!, $limit: Int!) {
    scheduled_notifications(
      where: { status: { _eq: "active" }, next_run_at: { _lte: $now } }
      order_by: { next_run_at: asc }
      limit: $limit
    ) {
      id
      partner_id
      title
      body
      image_url
      audience
      schedule_type
      cron_expr
      timezone
      end_at
      max_runs
      run_count
      next_run_at
    }
  }
`;

// Claim a slot. on_conflict do-nothing -> returns null if another tick already
// claimed this (schedule_id, run_at), in which case we skip.
const CLAIM_RUN = `
  mutation ClaimRun($schedule_id: uuid!, $run_at: timestamptz!) {
    insert_scheduled_notification_runs_one(
      object: { schedule_id: $schedule_id, run_at: $run_at, status: "sent" }
      on_conflict: { constraint: scheduled_notification_runs_schedule_run_key, update_columns: [] }
    ) {
      id
    }
  }
`;

const UPDATE_RUN = `
  mutation UpdateRun($id: uuid!, $status: String!, $recipients: Int!, $error: String) {
    update_scheduled_notification_runs_by_pk(
      pk_columns: { id: $id }
      _set: { status: $status, recipients_count: $recipients, error: $error }
    ) {
      id
    }
  }
`;

const ADVANCE = `
  mutation Advance($id: uuid!, $set: scheduled_notifications_set_input!) {
    update_scheduled_notifications_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

interface DueSchedule {
  id: string;
  partner_id: string;
  title: string;
  body: string;
  image_url: string | null;
  audience: "app" | "followers";
  schedule_type: "once" | "recurring";
  cron_expr: string | null;
  timezone: string;
  end_at: string | null;
  max_runs: number | null;
  run_count: number;
  next_run_at: string;
}

async function advance(
  s: DueSchedule,
  now: Date
): Promise<void> {
  const set: Record<string, unknown> = {
    last_run_at: now.toISOString(),
    run_count: s.run_count + 1,
    locked_at: null,
  };

  if (s.schedule_type === "once" || !s.cron_expr) {
    set.status = "completed";
    set.next_run_at = null;
  } else {
    const next = computeNextRun(s.cron_expr, s.timezone, now);
    const newCount = s.run_count + 1;
    const endAt = s.end_at ? new Date(s.end_at) : null;
    const reachedMax = s.max_runs != null && newCount >= s.max_runs;
    if (!next || reachedMax || (endAt && next > endAt)) {
      set.status = "completed";
      set.next_run_at = null;
    } else {
      set.next_run_at = next.toISOString();
    }
  }

  await fetchFromHasuraServer(ADVANCE, { id: s.id, set });
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const summary = {
    due: 0,
    sent: 0,
    failed: 0,
    skippedStale: 0,
    alreadyClaimed: 0,
    errors: 0,
  };

  let due: DueSchedule[] = [];
  try {
    const data = await fetchFromHasuraServer(DUE_QUERY, {
      now: now.toISOString(),
      limit: BATCH,
    });
    due = (data?.scheduled_notifications || []) as DueSchedule[];
  } catch (e: any) {
    console.error("[dispatch-notifications] due query failed:", e?.message || e);
    return NextResponse.json({ error: "due_query_failed" }, { status: 500 });
  }

  summary.due = due.length;

  for (const s of due) {
    try {
      const runAt = s.next_run_at;

      // Claim the slot (idempotent across overlapping ticks).
      const claim = await fetchFromHasuraServer(CLAIM_RUN, {
        schedule_id: s.id,
        run_at: runAt,
      });
      const runRow = claim?.insert_scheduled_notification_runs_one;
      if (!runRow?.id) {
        summary.alreadyClaimed++;
        continue;
      }
      const runId = runRow.id as string;

      // Skip stale slots (e.g. dispatcher was down) rather than sending late.
      const lateMs = now.getTime() - new Date(runAt).getTime();
      if (lateMs > GRACE_MS) {
        await fetchFromHasuraServer(UPDATE_RUN, {
          id: runId,
          status: "skipped",
          recipients: 0,
          error: "stale slot — missed send window",
        });
        await advance(s, now);
        summary.skippedStale++;
        continue;
      }

      const res = await sendBroadcast({
        partnerId: s.partner_id,
        title: s.title,
        body: s.body,
        imageUrl: s.image_url,
        audience: s.audience,
      });

      await fetchFromHasuraServer(UPDATE_RUN, {
        id: runId,
        status: res.ok ? "sent" : "failed",
        recipients: res.recipients || 0,
        error: res.ok ? null : res.error || "send failed",
      });

      if (res.ok) summary.sent++;
      else summary.failed++;

      await advance(s, now);
    } catch (e: any) {
      console.error(
        `[dispatch-notifications] error on schedule=${s.id}:`,
        e?.message || e
      );
      summary.errors++;
    }
  }

  console.log("[dispatch-notifications]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}

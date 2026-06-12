"use server";

/**
 * Server actions for the partner "Notify" feature: immediate send, recipient
 * count, and CRUD for scheduled / recurring notifications.
 *
 * The acting partner is always derived from the auth cookie server-side — the
 * client never gets to assert which partner it is. All reads/writes go through
 * the server-only admin client (hasuraServerClient); the browser-exposed admin
 * secret is not used on this path.
 */

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { getAuthCookie } from "@/app/auth/actions";
import {
  sendBroadcast,
  resolveBroadcastTokens,
  type NotifyAudience,
} from "@/lib/notify/broadcast";
import {
  buildCronExpr,
  computeNextRun,
  describeCron,
  type Frequency,
} from "@/lib/notify/recurrence";

async function requirePartnerId(): Promise<string> {
  const auth = await getAuthCookie();
  if (!auth?.id || (auth.role !== "partner" && auth.role !== "superadmin")) {
    throw new Error("Not authorized");
  }
  return auth.id;
}

// ---------------------------------------------------------------------------
// Immediate send + recipient count
// ---------------------------------------------------------------------------

export async function countBroadcastRecipientsAction(
  audience: NotifyAudience
): Promise<number> {
  const partnerId = await requirePartnerId();
  try {
    const tokens = await resolveBroadcastTokens(audience, partnerId);
    return tokens.length;
  } catch {
    return 0;
  }
}

export async function sendBroadcastNowAction(input: {
  title: string;
  body: string;
  imageUrl?: string | null;
  audience: NotifyAudience;
}): Promise<{ ok: boolean; recipients: number; skipped?: boolean; error?: string }> {
  const partnerId = await requirePartnerId();
  return sendBroadcast({
    partnerId,
    title: input.title,
    body: input.body,
    imageUrl: input.imageUrl,
    audience: input.audience,
  });
}

// ---------------------------------------------------------------------------
// Schedule CRUD
// ---------------------------------------------------------------------------

export interface CreateScheduleInput {
  title: string;
  body: string;
  imageUrl?: string | null;
  audience: NotifyAudience;
  scheduleType: "once" | "recurring";
  /** ISO UTC timestamp — for scheduleType "once". */
  scheduledAt?: string;
  /** for scheduleType "recurring" */
  frequency?: Frequency;
  time?: string; // "HH:MM"
  daysOfWeek?: number[];
  timezone?: string; // IANA; defaults Asia/Kolkata
  /** ISO UTC — optional stop bound for recurring. */
  endAt?: string | null;
  maxRuns?: number | null;
}

const INSERT_SCHEDULE = `
  mutation InsertSchedule($obj: scheduled_notifications_insert_input!) {
    insert_scheduled_notifications_one(object: $obj) {
      id
      next_run_at
    }
  }
`;

export async function createScheduledNotificationAction(
  input: CreateScheduleInput
): Promise<{ ok: boolean; id?: string; nextRunAt?: string | null; error?: string }> {
  let partnerId: string;
  try {
    partnerId = await requirePartnerId();
  } catch (e: any) {
    return { ok: false, error: e?.message || "Not authorized" };
  }

  const title = input.title?.trim();
  const body = input.body?.trim();
  if (!title || !body) return { ok: false, error: "Title and message are required." };

  const timezone = input.timezone || "Asia/Kolkata";
  const obj: Record<string, unknown> = {
    partner_id: partnerId,
    title,
    body,
    image_url: input.imageUrl?.trim() || null,
    audience: input.audience,
    schedule_type: input.scheduleType,
    timezone,
    end_at: input.endAt || null,
    max_runs: input.maxRuns ?? null,
    created_by: partnerId,
    status: "active",
  };

  if (input.scheduleType === "once") {
    if (!input.scheduledAt) return { ok: false, error: "Pick a date and time." };
    const when = new Date(input.scheduledAt);
    if (isNaN(when.getTime())) return { ok: false, error: "Invalid date/time." };
    if (when.getTime() < Date.now() - 60_000) {
      return { ok: false, error: "Scheduled time is in the past." };
    }
    obj.scheduled_at = input.scheduledAt;
    obj.next_run_at = input.scheduledAt;
  } else {
    const cron = buildCronExpr({
      frequency: input.frequency as Frequency,
      time: input.time || "",
      daysOfWeek: input.daysOfWeek,
    });
    if (!cron) return { ok: false, error: "Choose a valid frequency, time, and days." };
    const next = computeNextRun(cron, timezone, new Date());
    if (!next) return { ok: false, error: "Could not compute the next run time." };
    obj.cron_expr = cron;
    obj.next_run_at = next.toISOString();
  }

  try {
    const data = await fetchFromHasuraServer(INSERT_SCHEDULE, { obj });
    const row = data?.insert_scheduled_notifications_one;
    return { ok: true, id: row?.id, nextRunAt: row?.next_run_at ?? null };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to create schedule." };
  }
}

const LIST_SCHEDULES = `
  query ListSchedules($partnerId: uuid!) {
    scheduled_notifications(
      where: { partner_id: { _eq: $partnerId } }
      order_by: { created_at: desc }
    ) {
      id
      title
      body
      image_url
      audience
      schedule_type
      scheduled_at
      cron_expr
      timezone
      next_run_at
      last_run_at
      run_count
      max_runs
      end_at
      status
      created_at
      runs(order_by: { created_at: desc }, limit: 5) {
        id
        run_at
        status
        recipients_count
        error
        created_at
      }
    }
  }
`;

export interface ScheduleRow {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  audience: NotifyAudience;
  schedule_type: "once" | "recurring";
  scheduled_at: string | null;
  cron_expr: string | null;
  timezone: string;
  next_run_at: string | null;
  last_run_at: string | null;
  run_count: number;
  max_runs: number | null;
  end_at: string | null;
  status: "active" | "paused" | "completed" | "cancelled";
  created_at: string;
  description: string;
  runs: Array<{
    id: string;
    run_at: string;
    status: "sent" | "failed" | "skipped";
    recipients_count: number;
    error: string | null;
    created_at: string;
  }>;
}

export async function listScheduledNotificationsAction(): Promise<ScheduleRow[]> {
  const partnerId = await requirePartnerId();
  const data = await fetchFromHasuraServer(LIST_SCHEDULES, { partnerId });
  const rows = (data?.scheduled_notifications || []) as any[];
  return rows.map((r) => ({
    ...r,
    description:
      r.schedule_type === "recurring" && r.cron_expr
        ? describeCron(r.cron_expr)
        : "One-time",
  })) as ScheduleRow[];
}

const GET_SCHEDULE = `
  query GetSchedule($id: uuid!, $partnerId: uuid!) {
    scheduled_notifications(where: { id: { _eq: $id }, partner_id: { _eq: $partnerId } }) {
      id
      schedule_type
      cron_expr
      timezone
      scheduled_at
      end_at
      max_runs
      run_count
    }
  }
`;

const UPDATE_SCHEDULE = `
  mutation UpdateSchedule($id: uuid!, $partnerId: uuid!, $set: scheduled_notifications_set_input!) {
    update_scheduled_notifications(
      where: { id: { _eq: $id }, partner_id: { _eq: $partnerId } }
      _set: $set
    ) {
      affected_rows
    }
  }
`;

/** pause | resume | cancel. Resume recomputes next_run_at to the next future slot. */
export async function setScheduleStatusAction(
  id: string,
  action: "pause" | "resume" | "cancel"
): Promise<{ ok: boolean; error?: string }> {
  let partnerId: string;
  try {
    partnerId = await requirePartnerId();
  } catch (e: any) {
    return { ok: false, error: e?.message || "Not authorized" };
  }

  try {
    if (action === "pause") {
      await fetchFromHasuraServer(UPDATE_SCHEDULE, {
        id,
        partnerId,
        set: { status: "paused" },
      });
      return { ok: true };
    }

    if (action === "cancel") {
      await fetchFromHasuraServer(UPDATE_SCHEDULE, {
        id,
        partnerId,
        set: { status: "cancelled", next_run_at: null },
      });
      return { ok: true };
    }

    // resume — recompute next_run_at
    const data = await fetchFromHasuraServer(GET_SCHEDULE, { id, partnerId });
    const row = data?.scheduled_notifications?.[0];
    if (!row) return { ok: false, error: "Schedule not found." };

    let nextRunAt: string | null = null;
    if (row.schedule_type === "recurring" && row.cron_expr) {
      const next = computeNextRun(row.cron_expr, row.timezone, new Date());
      if (!next) return { ok: false, error: "Could not compute next run." };
      const endAt = row.end_at ? new Date(row.end_at) : null;
      const reachedMax = row.max_runs != null && row.run_count >= row.max_runs;
      if (reachedMax || (endAt && next > endAt)) {
        return { ok: false, error: "Schedule has already reached its end." };
      }
      nextRunAt = next.toISOString();
    } else {
      // once: keep its scheduled time (cron will skip it if long past)
      nextRunAt = row.scheduled_at;
    }

    await fetchFromHasuraServer(UPDATE_SCHEDULE, {
      id,
      partnerId,
      set: { status: "active", next_run_at: nextRunAt },
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to update schedule." };
  }
}

const DELETE_SCHEDULE = `
  mutation DeleteSchedule($id: uuid!, $partnerId: uuid!) {
    delete_scheduled_notifications(
      where: { id: { _eq: $id }, partner_id: { _eq: $partnerId } }
    ) {
      affected_rows
    }
  }
`;

export interface UpdateScheduleInput {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  audience: NotifyAudience;
  scheduleType: "once" | "recurring";
  /** ISO/local datetime — for "once". */
  scheduledAt?: string;
  /** for "recurring" */
  frequency?: Frequency;
  time?: string;
  daysOfWeek?: number[];
  timezone?: string;
  endAt?: string | null;
}

/**
 * Edit a scheduled / recurring notification's content and timing. Recomputes
 * cron_expr + next_run_at from the new schedule (so a time change takes effect
 * on the next run). Status is left as-is — a paused schedule stays paused.
 */
export async function updateScheduledNotificationAction(
  input: UpdateScheduleInput
): Promise<{ ok: boolean; error?: string }> {
  let partnerId: string;
  try {
    partnerId = await requirePartnerId();
  } catch (e: any) {
    return { ok: false, error: e?.message || "Not authorized" };
  }

  const title = input.title?.trim();
  const body = input.body?.trim();
  if (!title || !body) return { ok: false, error: "Title and message are required." };

  const timezone = input.timezone || "Asia/Kolkata";
  const set: Record<string, unknown> = {
    title,
    body,
    image_url: input.imageUrl?.trim() || null,
    audience: input.audience,
    schedule_type: input.scheduleType,
    timezone,
    end_at: input.endAt || null,
    updated_at: new Date().toISOString(),
  };

  if (input.scheduleType === "once") {
    if (!input.scheduledAt) return { ok: false, error: "Pick a date and time." };
    const when = new Date(input.scheduledAt);
    if (isNaN(when.getTime())) return { ok: false, error: "Invalid date/time." };
    set.scheduled_at = input.scheduledAt;
    set.next_run_at = input.scheduledAt;
    set.cron_expr = null;
  } else {
    const cron = buildCronExpr({
      frequency: input.frequency as Frequency,
      time: input.time || "",
      daysOfWeek: input.daysOfWeek,
    });
    if (!cron) return { ok: false, error: "Choose a valid frequency, time, and days." };
    const next = computeNextRun(cron, timezone, new Date());
    if (!next) return { ok: false, error: "Could not compute the next run time." };
    set.cron_expr = cron;
    set.next_run_at = next.toISOString();
    set.scheduled_at = null;
  }

  try {
    await fetchFromHasuraServer(UPDATE_SCHEDULE, { id: input.id, partnerId, set });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to update schedule." };
  }
}

export async function deleteScheduledNotificationAction(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  let partnerId: string;
  try {
    partnerId = await requirePartnerId();
  } catch (e: any) {
    return { ok: false, error: e?.message || "Not authorized" };
  }
  try {
    await fetchFromHasuraServer(DELETE_SCHEDULE, { id, partnerId });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to delete schedule." };
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import {
  sendBroadcastTemplate,
  getPartnerWhatsApp,
  countSentToday,
  type VariableMapItem,
} from "@/lib/whatsapp-broadcast";
import { isWhatsappEnabled } from "@/lib/whatsapp-features";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Worker for WhatsApp broadcasts. Runs every minute on a Vercel cron. Each tick:
 *   1. finds due broadcasts (scheduled/sending, scheduled_at <= now) that aren't
 *      locked by another concurrent tick,
 *   2. claims one by setting locked_at + status='sending' (the claim UPDATE only
 *      matches when the lock is free/stale, so overlapping ticks can't double-send),
 *   3. enforces the per-partner daily cap (default 250) — pauses with a warning
 *      when the cap is hit and recipients remain,
 *   4. sends a bounded batch of pending recipients via the partner's WABA number
 *      (Menuthere fallback), updating per-recipient + aggregate counters,
 *   5. marks the broadcast completed when no pending recipients remain.
 *
 * Auth: send `Authorization: Bearer <CRON_SECRET>`. Vercel cron sends this when
 * CRON_SECRET is configured; if unset we allow (mirrors the other crons).
 */

const BATCH = 10; // broadcasts inspected per tick
const PER_TICK = 50; // max messages sent per broadcast per tick
const STALE_LOCK_MS = 5 * 60 * 1000; // a lock older than this is considered abandoned

const DUE_QUERY = `
  query DueBroadcasts($now: timestamptz!, $stale: timestamptz!, $limit: Int!) {
    whatsapp_broadcasts(
      where: {
        status: { _in: ["scheduled", "sending"] }
        scheduled_at: { _lte: $now }
        _or: [{ locked_at: { _is_null: true } }, { locked_at: { _lt: $stale } }]
      }
      order_by: { scheduled_at: asc }
      limit: $limit
    ) {
      id
      partner_id
      template_name
      language
      variable_map
      header_params
      header_media_url
      header_media_type
      daily_limit
      sent_count
      failed_count
    }
  }
`;

// Claim: only succeeds when the lock is still free/stale. affected_rows=1 -> we own it.
const CLAIM = `
  mutation ClaimBroadcast($id: uuid!, $now: timestamptz!, $stale: timestamptz!) {
    update_whatsapp_broadcasts(
      where: {
        id: { _eq: $id }
        status: { _in: ["scheduled", "sending"] }
        _or: [{ locked_at: { _is_null: true } }, { locked_at: { _lt: $stale } }]
      }
      _set: { status: "sending", locked_at: $now, started_at: $now }
    ) {
      affected_rows
    }
  }
`;

const PENDING_RECIPIENTS = `
  query PendingRecipients($broadcast_id: uuid!, $limit: Int!) {
    whatsapp_broadcast_recipients(
      where: { broadcast_id: { _eq: $broadcast_id }, status: { _eq: "pending" } }
      limit: $limit
    ) {
      id
      name
      phone
    }
  }
`;

const PENDING_COUNT = `
  query PendingCount($broadcast_id: uuid!) {
    whatsapp_broadcast_recipients_aggregate(
      where: { broadcast_id: { _eq: $broadcast_id }, status: { _eq: "pending" } }
    ) {
      aggregate { count }
    }
  }
`;

const UPDATE_RECIPIENT = `
  mutation UpdateRecipient($id: uuid!, $set: whatsapp_broadcast_recipients_set_input!) {
    update_whatsapp_broadcast_recipients_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const UPDATE_BROADCAST = `
  mutation UpdateBroadcast($id: uuid!, $set: whatsapp_broadcasts_set_input!) {
    update_whatsapp_broadcasts_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

interface DueBroadcast {
  id: string;
  partner_id: string;
  template_name: string;
  language: string;
  variable_map: VariableMapItem[];
  header_params: string[] | null;
  header_media_url: string | null;
  header_media_type: string | null;
  daily_limit: number;
  sent_count: number;
  failed_count: number;
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
  const nowIso = now.toISOString();
  const staleIso = new Date(now.getTime() - STALE_LOCK_MS).toISOString();
  const summary = { due: 0, processed: 0, sent: 0, failed: 0, paused: 0, completed: 0, errors: 0 };

  let due: DueBroadcast[] = [];
  try {
    const data = await fetchFromHasuraServer(DUE_QUERY, {
      now: nowIso,
      stale: staleIso,
      limit: BATCH,
    });
    due = (data?.whatsapp_broadcasts || []) as DueBroadcast[];
  } catch (e: any) {
    console.error("[dispatch-broadcasts] due query failed:", e?.message || e);
    return NextResponse.json({ error: "due_query_failed" }, { status: 500 });
  }
  summary.due = due.length;

  for (const b of due) {
    try {
      // Claim it (idempotent across overlapping ticks).
      const claim = await fetchFromHasuraServer(CLAIM, {
        id: b.id,
        now: nowIso,
        stale: staleIso,
      });
      if (!(claim?.update_whatsapp_broadcasts?.affected_rows > 0)) continue; // someone else owns it
      summary.processed++;

      // Master gate: if WhatsApp Ordering is OFF for this partner, don't send.
      // Pause so it can resume if the feature is turned back on (instead of
      // silently failing every tick).
      if (!(await isWhatsappEnabled(b.partner_id))) {
        await fetchFromHasuraServer(UPDATE_BROADCAST, {
          id: b.id,
          set: {
            status: "paused",
            locked_at: null,
            last_error:
              "WhatsApp is turned off for this account — enable WhatsApp Ordering to resume.",
          },
        });
        summary.paused++;
        continue;
      }

      // Daily cap for this partner.
      const sentToday = await countSentToday(b.partner_id);
      const dailyLimit = b.daily_limit || 250;
      const remainingQuota = Math.max(0, dailyLimit - sentToday);

      // How many recipients still pending?
      const pc = await fetchFromHasuraServer(PENDING_COUNT, { broadcast_id: b.id });
      const pendingTotal =
        pc?.whatsapp_broadcast_recipients_aggregate?.aggregate?.count || 0;

      if (pendingTotal === 0) {
        await fetchFromHasuraServer(UPDATE_BROADCAST, {
          id: b.id,
          set: { status: "completed", completed_at: nowIso, locked_at: null },
        });
        summary.completed++;
        continue;
      }

      if (remainingQuota <= 0) {
        // Hit the daily cap with recipients left — stop & warn.
        await fetchFromHasuraServer(UPDATE_BROADCAST, {
          id: b.id,
          set: {
            status: "paused",
            locked_at: null,
            last_error: `Daily ${dailyLimit}-message limit reached — resume tomorrow to send the remaining ${pendingTotal}.`,
          },
        });
        summary.paused++;
        continue;
      }

      const batchSize = Math.min(remainingQuota, PER_TICK, pendingTotal);
      const rq = await fetchFromHasuraServer(PENDING_RECIPIENTS, {
        broadcast_id: b.id,
        limit: batchSize,
      });
      const recipients = (rq?.whatsapp_broadcast_recipients || []) as {
        id: string;
        name: string | null;
        phone: string;
      }[];

      const partnerWa = await getPartnerWhatsApp(b.partner_id);
      let sent = 0;
      let failed = 0;

      for (const r of recipients) {
        const result = await sendBroadcastTemplate(
          {
            partnerId: b.partner_id,
            templateName: b.template_name,
            language: b.language,
            variableMap: b.variable_map || [],
            headerParams: b.header_params,
            headerMediaUrl: b.header_media_url,
            headerMediaType: (b.header_media_type as
              | "image"
              | "video"
              | "document"
              | null) || null,
          },
          r,
          partnerWa,
        );
        await fetchFromHasuraServer(UPDATE_RECIPIENT, {
          id: r.id,
          set: result.ok
            ? { status: "sent", meta_message_id: result.metaMessageId || null, sent_at: new Date().toISOString(), error: null }
            : { status: "failed", error: result.error || "send failed", sent_at: new Date().toISOString() },
        });
        if (result.ok) sent++;
        else failed++;
      }

      summary.sent += sent;
      summary.failed += failed;

      // Did we drain the list this tick?
      const remainingAfter = pendingTotal - recipients.length;
      const hitCapThisTick = sent >= remainingQuota && remainingAfter > 0;

      const set: Record<string, unknown> = {
        sent_count: b.sent_count + sent,
        failed_count: b.failed_count + failed,
        locked_at: null,
        updated_at: nowIso,
      };
      if (remainingAfter <= 0) {
        set.status = "completed";
        set.completed_at = nowIso;
        summary.completed++;
      } else if (hitCapThisTick) {
        set.status = "paused";
        set.last_error = `Daily ${dailyLimit}-message limit reached — resume tomorrow to send the remaining ${remainingAfter}.`;
        summary.paused++;
      } else {
        // More to send and quota left; keep it as 'sending' so the next tick continues.
        set.status = "sending";
      }
      await fetchFromHasuraServer(UPDATE_BROADCAST, { id: b.id, set });
    } catch (e: any) {
      console.error(`[dispatch-broadcasts] error on broadcast=${b.id}:`, e?.message || e);
      summary.errors++;
      // Best-effort lock release so it isn't stuck until the stale window.
      await fetchFromHasuraServer(UPDATE_BROADCAST, {
        id: b.id,
        set: { locked_at: null },
      }).catch(() => {});
    }
  }

  console.log("[dispatch-broadcasts]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}

import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import {
  sendBroadcastTemplate,
  getPartnerWhatsApp,
  getPartnerOptOuts,
  countSentToday,
  normalizePhone,
  type VariableMapItem,
} from "@/lib/whatsapp-broadcast";
import { isWhatsappEnabled } from "@/lib/whatsapp-features";
import { explainWhatsAppError, categoryForCode } from "@/lib/whatsapp-errors";
import {
  BENIGN_ERROR_CODES,
  CONSECUTIVE_FAILURE_ABORT,
  BATCH_FAILURE_ABORT_RATIO,
} from "@/lib/comeback/config";
import { comebackLinkSuffix } from "@/lib/comeback/orderLinkSuffix";

// Is this broadcast a Comeback batch, and does its template carry a dynamic URL
// button? Looked up ONCE per broadcast rather than per recipient. A plain manual
// broadcast matches nothing here and is sent exactly as before.
const COMEBACK_CONTEXT = `
  query ComebackContextForBroadcast($broadcast_id: uuid!) {
    comeback_batches(where: { broadcast_id: { _eq: $broadcast_id } }, limit: 1) {
      partner_id
      partner { username custom_domain country country_code }
    }
  }
`;

const COMEBACK_BUTTON_INDEX = `
  query ComebackButtonIndex($partner_id: uuid!) {
    comeback_settings_by_pk(partner_id: $partner_id) { url_button_index }
  }
`;

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
      send_from_phone_number_id
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
  send_from_phone_number_id: string | null;
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
  const summary = { due: 0, processed: 0, sent: 0, failed: 0, skipped: 0, paused: 0, completed: 0, errors: 0 };

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

      // Daily cap for the SENDING number (Meta's limit is per-number). Legacy
      // broadcasts with no send-from number fall back to the partner-wide count.
      const sentToday = await countSentToday(
        b.partner_id,
        b.send_from_phone_number_id,
      );
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

      const partnerWa = await getPartnerWhatsApp(
        b.partner_id,
        b.send_from_phone_number_id,
      );

      // Comeback batches get a per-recipient signed-in link in the template's URL
      // button, and never fall back to the shared Menuthere number.
      let comebackLink:
        | { partnerId: string; username: string | null; customDomain: string | null; country: string | null; country_code: string | null }
        | null = null;
      let urlButtonIndex: number | null = null;
      let isComeback = false;
      try {
        const cc = await fetchFromHasuraServer(COMEBACK_CONTEXT, { broadcast_id: b.id });
        const row = cc?.comeback_batches?.[0];
        if (row) {
          isComeback = true;
          const idx = await fetchFromHasuraServer(COMEBACK_BUTTON_INDEX, {
            partner_id: row.partner_id,
          });
          urlButtonIndex = idx?.comeback_settings_by_pk?.url_button_index ?? null;
          if (urlButtonIndex != null) {
            comebackLink = {
              partnerId: row.partner_id,
              username: row.partner?.username ?? null,
              customDomain: row.partner?.custom_domain ?? null,
              country: row.partner?.country ?? null,
              country_code: row.partner?.country_code ?? null,
            };
          }
        }
      } catch (e: any) {
        // Not knowing is not a reason to send the wrong thing: without the
        // context we simply send without a button parameter, which is what a
        // template with a static button expects anyway.
        console.error("[dispatch-broadcasts] comeback context lookup failed:", e?.message || e);
      }
      // Send-time blocklist gate: never message a customer who has opted out —
      // even if they replied STOP AFTER this broadcast was created/queued.
      const optedOut = await getPartnerOptOuts(b.partner_id);
      let sent = 0;
      let failed = 0;
      let skipped = 0;

      // Circuit breaker. Meta's quality rating is a rolling score that can turn
      // between the moment a batch is queued and the moment it runs, and once a
      // number is rate-limited or restricted every further send is both wasted
      // and actively harmful — failures are what the rating punishes. So the tick
      // stops on the first error that says "the NUMBER is the problem", rather
      // than working through the remaining recipients into a wall.
      //
      // Per-recipient errors that say nothing about the number are excluded:
      // 131049 (that user's own marketing cap), 130472 (Meta's holdout
      // experiment) and 131050 (that user opted out) are all expected at some
      // rate in any marketing batch and must not trip anything.
      let abortReason: string | null = null;
      let consecutive = 0;
      let attempted = 0; // sends actually made — denominator for the failure ratio
      let processed = 0; // rows taken off the pending list, including skips

      for (const r of recipients) {
        if (abortReason) break;
        if (optedOut.has(normalizePhone(r.phone))) {
          await fetchFromHasuraServer(UPDATE_RECIPIENT, {
            id: r.id,
            set: {
              status: "skipped",
              error: "Recipient opted out (STOP)",
              sent_at: new Date().toISOString(),
            },
          }).catch(() => {});
          skipped++;
          processed++;
          continue;
        }
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
            // Marketing must never reach the shared number — see the note on
            // allowSharedFallback in whatsapp-broadcast.ts.
            allowSharedFallback: !isComeback,
            urlButtonIndex: urlButtonIndex ?? 0,
            urlButtonSuffix: comebackLink
              ? (rec) => comebackLinkSuffix(comebackLink!, rec.phone)
              : null,
          },
          r,
          partnerWa,
        );
        const fullSet: Record<string, unknown> = result.ok
          ? {
              status: "sent",
              meta_message_id: result.metaMessageId || null,
              sent_at: new Date().toISOString(),
              error: null,
              sent_from_phone_number_id: result.sentFromPhoneNumberId || null,
            }
          : {
              status: "failed",
              error: result.error || "send failed",
              sent_at: new Date().toISOString(),
              sent_from_phone_number_id: result.sentFromPhoneNumberId || null,
            };
        try {
          await fetchFromHasuraServer(UPDATE_RECIPIENT, { id: r.id, set: fullSet });
        } catch (e) {
          // The sent_from column may not be exposed yet (migration/metadata not
          // reloaded). Retry WITHOUT it so a just-sent message is still marked
          // sent — never leave it 'pending', which would re-send (and re-charge).
          const { sent_from_phone_number_id, ...legacy } = fullSet;
          await fetchFromHasuraServer(UPDATE_RECIPIENT, { id: r.id, set: legacy });
        }
        attempted++;
        processed++;
        if (result.ok) {
          sent++;
          consecutive = 0;
          continue;
        }
        failed++;

        const { code } = explainWhatsAppError(null, result.error);
        const codeStr = code == null ? "" : String(code);
        if (BENIGN_ERROR_CODES.includes(codeStr)) continue;

        const category = categoryForCode(code);
        if (category === "quality_rate") {
          abortReason =
            "Paused: WhatsApp is rate-limiting this number right now. The rest will go out when you resume.";
        } else if (category === "auth") {
          abortReason =
            "Paused: this number's WhatsApp connection needs reconnecting in Settings.";
        } else {
          consecutive++;
          if (consecutive >= CONSECUTIVE_FAILURE_ABORT) {
            abortReason = `Paused after ${consecutive} sends in a row failed. The rest will go out when you resume.`;
          } else if (
            attempted >= 10 &&
            failed / attempted > BATCH_FAILURE_ABORT_RATIO
          ) {
            abortReason = `Paused: ${failed} of the first ${attempted} sends failed. The rest will go out when you resume.`;
          }
        }
      }

      summary.sent += sent;
      summary.failed += failed;
      summary.skipped += skipped;

      // Did we drain the list this tick? Count what we actually ATTEMPTED, not the
      // batch we fetched — the breaker may have stopped us partway, and the
      // untouched recipients are still pending.
      const remainingAfter = pendingTotal - processed;
      const hitCapThisTick = sent >= remainingQuota && remainingAfter > 0;

      const set: Record<string, unknown> = {
        sent_count: b.sent_count + sent,
        failed_count: b.failed_count + failed,
        locked_at: null,
        updated_at: nowIso,
      };
      if (abortReason) {
        // Stop the whole broadcast, not just this tick — leaving it 'sending'
        // would have the next tick walk straight back into the same wall a
        // minute later.
        set.status = "paused";
        set.last_error = abortReason;
        summary.paused++;
      } else if (remainingAfter <= 0) {
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

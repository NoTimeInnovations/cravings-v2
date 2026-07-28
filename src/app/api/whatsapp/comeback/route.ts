import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { isWhatsappEnabled } from "@/lib/whatsapp-features";
import { buildBatch, recipientCap, previewExpiry, nextSendAt } from "@/lib/comeback/batch";
import { checkNumberQuality, qualityBlocks } from "@/lib/comeback/guards";
import { getPartnerWhatsApp } from "@/lib/whatsapp-broadcast";
import { partnerWabaToken } from "@/lib/whatsapp-meta";
import { ATTRIBUTION_WINDOW_DAYS, EST_MARKETING_COST_INR } from "@/lib/comeback/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Comeback Messages — settings, batch previews, and the approve/discard decision.
 *
 * Approving does NOT introduce a second sender. It writes an ordinary
 * whatsapp_broadcasts row plus its recipients and lets /api/cron/dispatch-broadcasts
 * do the sending, so comeback traffic inherits delivery receipts, cost
 * reconciliation, cancel/resume and — importantly — the same daily-cap accounting
 * as every other message on the number.
 */

const PARTNER = `
  query ComebackPartner($id: uuid!) {
    partners_by_pk(id: $id) {
      id store_name username currency timezone country country_code custom_domain
    }
    comeback_settings_by_pk(partner_id: $id) {
      partner_id enabled auto_send trigger_days check_every_hours segments min_visits
      template_id template_name template_language
      url_button_index send_from_phone_number_id monthly_message_cap last_built_at
    }
    comeback_segment_templates(where: { partner_id: { _eq: $id } }) {
      segment enabled template_id template_name template_language url_button_index trigger_days
    }
    comeback_batches(
      where: { partner_id: { _eq: $id } }
      order_by: { created_at: desc }
      limit: 20
    ) {
      id status blocked_reason blocked_detail breakdown treatment_count holdout_count
      est_cost est_cost_currency est_discount_exposure template_name message_preview
      phone_coverage store_cadence_days built_at expires_at approved_at scheduled_at
      measured_at results broadcast_id created_at
    }
  }
`;

const UPSERT_SETTINGS = `
  mutation ComebackUpsertSettings($object: comeback_settings_insert_input!) {
    insert_comeback_settings_one(
      object: $object
      on_conflict: {
        constraint: comeback_settings_pkey
        update_columns: [enabled, segments, min_visits, template_id, template_name,
                         template_language, url_button_index, send_from_phone_number_id,
                         monthly_message_cap, auto_send, trigger_days, check_every_hours,
                         updated_at]
      }
    ) { partner_id }
  }
`;

const INSERT_BATCH = `
  mutation ComebackInsertBatch($object: comeback_batches_insert_input!) {
    insert_comeback_batches_one(object: $object) { id }
  }
`;

const INSERT_RECIPIENTS = `
  mutation ComebackInsertRecipients($objects: [comeback_recipients_insert_input!]!) {
    insert_comeback_recipients(objects: $objects) { affected_rows }
  }
`;

/**
 * Hold every person in the batch — treatment AND holdout — for the cooldown
 * window, at BUILD time.
 *
 * Writing this only at approval would let tonight's build and tomorrow's build
 * both contain the same people (the ledger being empty in between), and
 * approving both would message them twice.
 */
const RESERVE_LEDGER = `
  mutation ComebackReserve($objects: [comeback_contact_log_insert_input!]!) {
    insert_comeback_contact_log(
      objects: $objects
      on_conflict: {
        constraint: comeback_contact_log_pkey
        update_columns: [reserved_until, updated_at]
      }
    ) { affected_rows }
  }
`;

const CLAIM_BATCH = `
  mutation ComebackClaim($id: uuid!, $now: timestamptz!) {
    update_comeback_batches(
      where: { id: { _eq: $id }, status: { _eq: "preview" }, expires_at: { _gt: $now } }
      _set: { status: "approving", approved_at: $now }
    ) { affected_rows returning { id partner_id } }
  }
`;

const BATCH_DETAIL = `
  query ComebackBatch($id: uuid!) {
    comeback_batches_by_pk(id: $id) {
      id partner_id status template_name template_language send_from_phone_number_id
      treatment_count est_cost
    }
    comeback_recipients(where: { batch_id: { _eq: $id }, arm: { _eq: "treatment" } }) {
      identity_key phone name segment
    }
    comeback_settings_by_pk(partner_id: $id) { auto_send }
  }
`;

const SET_BATCH = `
  mutation ComebackSetBatch($id: uuid!, $set: comeback_batches_set_input!) {
    update_comeback_batches_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const INSERT_BROADCAST = `
  mutation ComebackInsertBroadcast($object: whatsapp_broadcasts_insert_input!) {
    insert_whatsapp_broadcasts_one(object: $object) { id }
  }
`;

const INSERT_BROADCAST_RECIPIENTS = `
  mutation ComebackInsertBroadcastRecipients($objects: [whatsapp_broadcast_recipients_insert_input!]!) {
    insert_whatsapp_broadcast_recipients(objects: $objects) { affected_rows }
  }
`;

const COMMIT_LEDGER = `
  mutation ComebackCommitLedger($objects: [comeback_contact_log_insert_input!]!) {
    insert_comeback_contact_log(
      objects: $objects
      on_conflict: {
        constraint: comeback_contact_log_pkey
        update_columns: [attempts, last_contact_at, reserved_until, sunset_until, virtual_send, updated_at]
      }
    ) { affected_rows }
  }
`;

// ─────────────────────────── GET ───────────────────────────

export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId");
  if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });
  try {
    const data = await fetchFromHasuraServer(PARTNER, { id: partnerId });
    return NextResponse.json({
      partner: data?.partners_by_pk || null,
      settings: data?.comeback_settings_by_pk || null,
      segmentTemplates: data?.comeback_segment_templates || [],
      batches: data?.comeback_batches || [],
    });
  } catch (e: any) {
    console.error("[comeback] GET failed:", e?.message || e);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}

// ─────────────────────────── POST ───────────────────────────

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const { action, partnerId } = body || {};
  if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });

  switch (action) {
    case "saveSettings":
      return saveSettings(partnerId, body);
    case "saveSegmentTemplate":
      return saveSegmentTemplate(partnerId, body);
    case "build":
      return build(partnerId, body);
    case "approve":
      return approve(body.batchId, body.approvedBy);
    case "discard":
      return discard(body.batchId);
    default:
      return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }
}

const UPSERT_SEGMENT_TEMPLATE = `
  mutation ComebackUpsertSegTpl($object: comeback_segment_templates_insert_input!) {
    insert_comeback_segment_templates_one(
      object: $object
      on_conflict: {
        constraint: comeback_segment_templates_pkey
        update_columns: [enabled, template_id, template_name, template_language,
                         url_button_index, trigger_days, updated_at]
      }
    ) { segment }
  }
`;

/** One message per segment: what you say to a lapsed regular is not what you say
 *  to someone who enquired and never ordered. */
async function saveSegmentTemplate(partnerId: string, body: any) {
  if (!body.segment) {
    return NextResponse.json({ error: "segment required" }, { status: 400 });
  }
  try {
    await fetchFromHasuraServer(UPSERT_SEGMENT_TEMPLATE, {
      object: {
        partner_id: partnerId,
        segment: body.segment,
        enabled: body.enabled !== false,
        template_id: body.templateId || null,
        template_name: body.templateName || null,
        template_language: body.templateLanguage || "en",
        url_button_index: body.urlButtonIndex ?? null,
        trigger_days: body.triggerDays ?? null,
        updated_at: new Date().toISOString(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[comeback] saveSegmentTemplate failed:", e?.message || e);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

async function saveSettings(partnerId: string, body: any) {
  try {
    await fetchFromHasuraServer(UPSERT_SETTINGS, {
      object: {
        partner_id: partnerId,
        enabled: !!body.enabled,
        segments: body.segments || [],
        min_visits: body.minVisits ?? 2,
        template_id: body.templateId || null,
        template_name: body.templateName || null,
        template_language: body.templateLanguage || "en",
        url_button_index: body.urlButtonIndex ?? null,
        send_from_phone_number_id: body.sendFromPhoneNumberId || null,
        monthly_message_cap: body.monthlyMessageCap ?? 400,
        auto_send: !!body.autoSend,
        trigger_days: body.triggerDays ?? null,
        check_every_hours: body.checkEveryHours ?? 24,
        updated_at: new Date().toISOString(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[comeback] saveSettings failed:", e?.message || e);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

/** Build a preview. Refuses, with a readable reason, rather than half-working. */
async function build(partnerId: string, body: any) {
  try {
    const ctx = await fetchFromHasuraServer(PARTNER, { id: partnerId });
    const partner = ctx?.partners_by_pk;
    const settings = ctx?.comeback_settings_by_pk;
    if (!partner) return NextResponse.json({ error: "partner_not_found" }, { status: 404 });

    const blockRow = async (reason: string, detail: string) => {
      const ins = await fetchFromHasuraServer(INSERT_BATCH, {
        object: {
          partner_id: partnerId, status: "blocked",
          blocked_reason: reason, blocked_detail: detail,
          expires_at: previewExpiry().toISOString(),
        },
      });
      return NextResponse.json({ ok: false, blocked: { reason, detail }, batchId: ins?.insert_comeback_batches_one?.id });
    };

    // One undecided batch at a time. A partial unique index enforces this in the
    // database, so without the check a second build would surface as a raw
    // constraint violation instead of a sentence the partner can act on.
    const liveRes = await fetchFromHasuraServer(
      `query ComebackLive($id: uuid!) {
         comeback_batches(where: { partner_id: { _eq: $id }, status: { _in: ["preview","approving"] } }, limit: 1) { id }
       }`,
      { id: partnerId },
    );
    const existing = liveRes?.comeback_batches?.[0];
    if (existing) {
      return NextResponse.json({ ok: true, batchId: existing.id, alreadyPending: true });
    }

    if (!(await isWhatsappEnabled(partnerId))) {
      return blockRow("whatsapp_off", "WhatsApp is turned off for this account.");
    }
    // One message per segment. A segment with no template simply is not messaged,
    // which is also how a partner turns a segment off.
    const segTpls: any[] = (ctx?.comeback_segment_templates || []).filter(
      (t: any) => t.enabled && t.template_name,
    );
    if (!segTpls.length) {
      return blockRow(
        "no_template",
        "Write a message for at least one customer group first.",
      );
    }
    const activeSegments = segTpls.map((t) => t.segment);
    const triggerBySegment: Record<string, number> = {};
    for (const t of segTpls) {
      if (t.trigger_days != null) triggerBySegment[t.segment] = t.trigger_days;
    }

    const phoneNumberId = settings.send_from_phone_number_id || null;
    const wa = await getPartnerWhatsApp(partnerId, phoneNumberId);
    if (!wa.partnerPhoneNumberId) {
      return blockRow("no_number", "Connect your own WhatsApp number to send comeback messages.");
    }

    // Live quality, not the local mirror — a rolling score can move overnight.
    const { quality, status } = await checkNumberQuality(
      wa.partnerPhoneNumberId,
      partnerWabaToken({ access_token: wa.partnerToken }),
    );
    const qBlock = qualityBlocks(quality, status);
    if (qBlock) return blockRow("quality_low", `Paused because ${qBlock}.`);

    const cap = await recipientCap(partnerId, wa.partnerPhoneNumberId);
    if (cap <= 0) {
      return blockRow("quota_low", "Today's WhatsApp allowance is reserved for order messages.");
    }

    const built = await buildBatch({
      partnerId,
      partner,
      minVisits: settings?.min_visits ?? 2,
      segments: activeSegments,
      triggerBySegment,
      triggerDays: settings?.trigger_days ?? null,
      phoneNumberId: wa.partnerPhoneNumberId,
      requireConsent: !!body.requireConsent,
      maxRecipients: cap,
    });
    if (built.blocked) return blockRow(built.blocked.reason, built.blocked.detail);

    const now = new Date();
    const scheduledAt = nextSendAt(partnerId, partner.timezone || "Asia/Kolkata", now);
    const ins = await fetchFromHasuraServer(INSERT_BATCH, {
      object: {
        partner_id: partnerId,
        status: "preview",
        breakdown: built.breakdown,
        treatment_count: built.treatment.length,
        holdout_count: built.holdout.length,
        est_cost: built.estCost,
        est_cost_currency: partner.currency || "₹",
        est_discount_exposure: 0,
        template_name: segTpls.map((t) => t.template_name).join(", "),
        template_language: segTpls[0]?.template_language || "en",
        message_preview: body.messagePreview || null,
        send_from_phone_number_id: wa.partnerPhoneNumberId,
        phone_coverage: built.phoneCoverage,
        store_cadence_days: built.storeCadenceDays,
        built_at: now.toISOString(),
        expires_at: previewExpiry(now).toISOString(),
        scheduled_at: scheduledAt.toISOString(),
      },
    });
    const batchId = ins?.insert_comeback_batches_one?.id;

    const rows = [
      ...built.treatment.map((m) => ({ ...toRecipient(batchId, m), arm: "treatment" })),
      ...built.holdout.map((m) => ({ ...toRecipient(batchId, m), arm: "holdout" })),
    ];
    if (rows.length) await fetchFromHasuraServer(INSERT_RECIPIENTS, { objects: rows });

    // Hold everyone now, so the next build cannot re-pick them.
    const reserveUntil = previewExpiry(now).toISOString();
    await fetchFromHasuraServer(RESERVE_LEDGER, {
      objects: built.members.map((m) => ({
        partner_id: partnerId,
        identity_key: m.key,
        reserved_until: reserveUntil,
        updated_at: now.toISOString(),
      })),
    });

    // When the partner has turned auto-send on, the rule IS the decision — there
    // is no preview to sit and wait for approval.
    if (settings?.auto_send) {
      const res = await approve(batchId, "auto");
      const j = await res.json();
      return NextResponse.json({
        ok: true, batchId, autoSent: true, ...j, ...summarise(built),
      });
    }
    return NextResponse.json({ ok: true, batchId, capped: built.capped, ...summarise(built) });
  } catch (e: any) {
    console.error("[comeback] build failed:", e?.message || e);
    return NextResponse.json({ error: "build_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}

function toRecipient(batchId: string, m: any) {
  return {
    batch_id: batchId,
    identity_key: m.key,
    phone: m.phone,
    name: m.name,
    segment: m.segment,
    visits: m.visits,
    total_spent: m.totalSpent,
    days_quiet: m.daysQuiet,
    cadence_days: m.cadenceDays,
    trigger_days: m.triggerDays,
  };
}

function summarise(b: any) {
  return {
    treatment: b.treatment.length,
    holdout: b.holdout.length,
    breakdown: b.breakdown,
    estCost: b.estCost,
    phoneCoverage: b.phoneCoverage,
  };
}

/**
 * Approve → become a real broadcast.
 *
 * The first statement is a guarded status transition that only matches a batch
 * still in 'preview'. A double-tapped confirm or a retried fetch loses the race
 * and returns the already-approved result instead of inserting a second broadcast
 * and charging the partner twice.
 */
async function approve(batchId: string, approvedBy?: string) {
  if (!batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });
  const now = new Date();
  try {
    const claim = await fetchFromHasuraServer(CLAIM_BATCH, {
      id: batchId,
      now: now.toISOString(),
    });
    if (!(claim?.update_comeback_batches?.affected_rows > 0)) {
      return NextResponse.json({ ok: true, alreadyHandled: true });
    }

    const d = await fetchFromHasuraServer(BATCH_DETAIL, { id: batchId });
    const batch = d?.comeback_batches_by_pk;
    const recipients = d?.comeback_recipients || [];
    if (!batch || !recipients.length) {
      await fetchFromHasuraServer(SET_BATCH, {
        id: batchId,
        set: { status: "discarded", blocked_detail: "Nothing left to send." },
      });
      return NextResponse.json({ ok: false, error: "empty_batch" });
    }

    // Each segment goes out on its own template, so a batch becomes one broadcast
    // per segment rather than one for everybody.
    const tplRes = await fetchFromHasuraServer(
      `query ComebackSegTpls($pid: uuid!) {
         comeback_segment_templates(where: { partner_id: { _eq: $pid }, enabled: { _eq: true } }) {
           segment template_name template_language
         }
       }`,
      { pid: batch.partner_id },
    );
    const tplBySegment = new Map<string, any>(
      (tplRes?.comeback_segment_templates || []).map((t: any) => [t.segment, t]),
    );

    const bySegment = new Map<string, any[]>();
    for (const r of recipients) {
      const seg = r.segment || "unknown";
      if (!tplBySegment.has(seg)) continue; // segment switched off since the build
      (bySegment.get(seg) || bySegment.set(seg, []).get(seg)!).push(r);
    }

    const broadcastIds: string[] = [];
    let queued = 0;
    for (const [seg, rows] of bySegment) {
      const tpl = tplBySegment.get(seg);
      const bc = await fetchFromHasuraServer(INSERT_BROADCAST, {
        object: {
          partner_id: batch.partner_id,
          template_name: tpl.template_name,
          language: tpl.template_language || "en",
          category: "MARKETING",
          variable_map: [{ source: "name" }],
          status: "scheduled",
          scheduled_at: now.toISOString(),
          total_recipients: rows.length,
          send_from_phone_number_id: batch.send_from_phone_number_id,
          created_by: approvedBy || "comeback",
        },
      });
      const bid = bc?.insert_whatsapp_broadcasts_one?.id;
      if (!bid) continue;
      broadcastIds.push(bid);
      queued += rows.length;
      await fetchFromHasuraServer(INSERT_BROADCAST_RECIPIENTS, {
        objects: rows.map((r: any) => ({
          broadcast_id: bid, name: r.name, phone: r.phone, status: "pending",
        })),
      });
    }
    const broadcastId = broadcastIds[0] || null;

    // Commit the ledger for BOTH arms. The holdout gets a virtual send so the
    // control group ages out of the pool at the same rate as the treatment — a
    // control that never gets suppressed would slowly fill with the chronically
    // unresponsive and stop being comparable.
    const all = await fetchFromHasuraServer(
      `query ComebackAllArms($id: uuid!) {
         comeback_recipients(where: { batch_id: { _eq: $id } }) { identity_key arm }
       }`,
      { id: batchId },
    );
    const sunset = new Date(now.getTime() + 180 * 86_400_000).toISOString();
    await fetchFromHasuraServer(COMMIT_LEDGER, {
      objects: (all?.comeback_recipients || []).map((r: any) => ({
        partner_id: batch.partner_id,
        identity_key: r.identity_key,
        attempts: 1,
        last_contact_at: now.toISOString(),
        reserved_until: null,
        sunset_until: sunset,
        virtual_send: r.arm === "holdout",
        updated_at: now.toISOString(),
      })),
    });

    await fetchFromHasuraServer(SET_BATCH, {
      id: batchId,
      set: {
        status: "sent",
        broadcast_id: broadcastId,
        approved_by: approvedBy || null,
        measure_due_at: new Date(now.getTime() + ATTRIBUTION_WINDOW_DAYS * 86_400_000).toISOString(),
        updated_at: now.toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      broadcastId,
      broadcasts: broadcastIds.length,
      queued,
      estCost: queued * EST_MARKETING_COST_INR,
    });
  } catch (e: any) {
    console.error("[comeback] approve failed:", e?.message || e);
    // Release the claim so a retry can proceed rather than the batch sticking.
    await fetchFromHasuraServer(SET_BATCH, {
      id: batchId,
      set: { status: "preview", approved_at: null },
    }).catch(() => {});
    return NextResponse.json({ error: "approve_failed" }, { status: 500 });
  }
}

/** Discard a preview and release everyone it was holding. */
async function discard(batchId: string) {
  if (!batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });
  try {
    const d = await fetchFromHasuraServer(
      `query ComebackDiscardScope($id: uuid!) {
         comeback_batches_by_pk(id: $id) { partner_id status }
         comeback_recipients(where: { batch_id: { _eq: $id } }) { identity_key }
       }`,
      { id: batchId },
    );
    const partnerId = d?.comeback_batches_by_pk?.partner_id;
    await fetchFromHasuraServer(SET_BATCH, {
      id: batchId,
      set: { status: "discarded", updated_at: new Date().toISOString() },
    });
    if (partnerId) {
      // Clearing the hold puts these customers straight back in the pool, which
      // is what "not this batch" should mean.
      await fetchFromHasuraServer(RESERVE_LEDGER, {
        objects: (d?.comeback_recipients || []).map((r: any) => ({
          partner_id: partnerId,
          identity_key: r.identity_key,
          reserved_until: null,
          updated_at: new Date().toISOString(),
        })),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[comeback] discard failed:", e?.message || e);
    return NextResponse.json({ error: "discard_failed" }, { status: 500 });
  }
}

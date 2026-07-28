import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { normalizeForPartner, identityKey } from "@/lib/comeback/phone";
import {
  ATTRIBUTION_WINDOW_DAYS, MIN_BATCH_INTERVAL_DAYS, MIN_PHONE_COVERAGE_FOR_HEADLINE,
  NON_SALE_STATUSES, ERR_USER_MARKETING_OPTOUT,
} from "@/lib/comeback/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Comeback Messages worker. Three jobs per tick, cheapest first:
 *
 *   1. sweep permanent opt-outs — Meta error 131050 means the customer used
 *      WhatsApp's own "stop marketing from this business" control. It is
 *      irreversible from our side and retrying damages the number's quality
 *      rating, so it is promoted to a real opt-out immediately rather than at
 *      measurement time two weeks later;
 *   2. measure batches whose attribution window has closed;
 *   3. run the rule for partners who are due — find who has gone quiet past
 *      their group's limit and send. There is no preview and no approval; the
 *      partner switching the rule on was the decision.
 *
 * The run is last and strictly bounded because it is by far the most expensive
 * step: an unbounded loop over every enabled partner would be killed partway
 * through by the 60s limit, and the partners after the cut-off would silently
 * never be run.
 */

const BATCH_LIMIT = 5; // partners built per tick
const STALE_LOCK_MS = 10 * 60 * 1000;

const SWEEP_OPTOUTS = `
  query ComebackSweepOptouts($since: timestamptz!, $code: String!) {
    whatsapp_broadcast_recipients(
      where: { error_code: { _eq: $code }, failed_at: { _gte: $since } }
      limit: 200
    ) {
      phone
      broadcast { partner_id }
    }
  }
`;

// Dedupe on (partner_id, phone), NOT on the id primary key: the sweep re-reads a
// 3-day window every tick, so keying on a generated uuid would never collide and
// would pile up a duplicate row per tick for every opted-out customer.
const INSERT_OPTOUTS = `
  mutation ComebackInsertOptouts($objects: [whatsapp_broadcast_optouts_insert_input!]!) {
    insert_whatsapp_broadcast_optouts(objects: $objects, on_conflict: {
      constraint: whatsapp_broadcast_optouts_partner_id_phone_key, update_columns: []
    }) { affected_rows }
  }
`;

const DUE_MEASURE = `
  query ComebackDueMeasure($now: timestamptz!) {
    comeback_batches(
      where: { status: { _eq: "sent" }, measure_due_at: { _lte: $now } }
      order_by: { measure_due_at: asc }
      limit: 5
    ) {
      id partner_id approved_at phone_coverage
      partner { country country_code }
    }
  }
`;

const BATCH_ARMS = `
  query ComebackArms($id: uuid!) {
    comeback_recipients(where: { batch_id: { _eq: $id } }) {
      id identity_key phone arm
    }
  }
`;

const RETURNS_SINCE = `
  query ComebackReturns($partner_id: uuid!, $since: timestamptz!, $until: timestamptz!, $exclude: [String!]!) {
    orders(
      where: {
        partner_id: { _eq: $partner_id }
        created_at: { _gte: $since, _lte: $until }
        _not: { status: { _in: $exclude } }
      }
    ) {
      phone total_price created_at
      user { phone }
    }
  }
`;

const SET_BATCH = `
  mutation ComebackSetBatch($id: uuid!, $set: comeback_batches_set_input!) {
    update_comeback_batches_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

const MARK_RETURNED = `
  mutation ComebackMarkReturned($id: uuid!, $at: timestamptz!, $value: numeric!) {
    update_comeback_recipients_by_pk(
      pk_columns: { id: $id }
      _set: { returned: true, returned_at: $at, return_value: $value }
    ) { id }
  }
`;

const DUE_BUILD = `
  query ComebackDueBuild($cutoff: timestamptz!, $stale: timestamptz!, $limit: Int!) {
    comeback_settings(
      where: {
        enabled: { _eq: true }
        _or: [{ last_built_at: { _is_null: true } }, { last_built_at: { _lt: $cutoff } }]
        _and: [{ _or: [{ locked_at: { _is_null: true } }, { locked_at: { _lt: $stale } }] }]
      }
      order_by: { last_built_at: asc_nulls_first }
      limit: $limit
    ) { partner_id }
  }
`;

const CLAIM_PARTNER = `
  mutation ComebackClaimPartner($pid: uuid!, $now: timestamptz!, $stale: timestamptz!) {
    update_comeback_settings(
      where: {
        partner_id: { _eq: $pid }
        enabled: { _eq: true }
        _or: [{ locked_at: { _is_null: true } }, { locked_at: { _lt: $stale } }]
      }
      _set: { locked_at: $now }
    ) { affected_rows }
  }
`;

const RELEASE_PARTNER = `
  mutation ComebackRelease($pid: uuid!, $now: timestamptz!) {
    update_comeback_settings_by_pk(
      pk_columns: { partner_id: $pid }
      _set: { locked_at: null, last_built_at: $now }
    ) { partner_id }
  }
`;

/** Guards against a run still in flight — one at a time per partner. */
const HAS_LIVE = `
  query ComebackHasLive($pid: uuid!) {
    comeback_batches_aggregate(
      where: { partner_id: { _eq: $pid }, status: { _in: ["preview", "approving"] } }
    ) { aggregate { count } }
  }
`;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const summary = { optouts: 0, measured: 0, built: 0, skipped: 0, errors: 0 };

  // ── 1. permanent opt-out sweep ──
  try {
    const since = new Date(now.getTime() - 3 * 86_400_000).toISOString();
    const d = await fetchFromHasuraServer(SWEEP_OPTOUTS, {
      since,
      code: ERR_USER_MARKETING_OPTOUT,
    });
    const rows = (d?.whatsapp_broadcast_recipients || [])
      .filter((r: any) => r?.broadcast?.partner_id && r?.phone)
      .map((r: any) => ({
        partner_id: r.broadcast.partner_id,
        phone: String(r.phone),
        reason: "META_MARKETING_OPTOUT",
      }));
    if (rows.length) {
      await fetchFromHasuraServer(INSERT_OPTOUTS, { objects: rows }).catch(() => {});
      summary.optouts = rows.length;
    }
  } catch (e: any) {
    console.error("[comeback-cron] optout sweep failed:", e?.message || e);
    summary.errors++;
  }

  // ── 2. measure ──
  try {
    const due = await fetchFromHasuraServer(DUE_MEASURE, { now: now.toISOString() });
    for (const b of due?.comeback_batches || []) {
      try {
        const arms = await fetchFromHasuraServer(BATCH_ARMS, { id: b.id });
        const recipients = arms?.comeback_recipients || [];
        const sentAt = new Date(b.approved_at || now);
        const until = new Date(sentAt.getTime() + ATTRIBUTION_WINDOW_DAYS * 86_400_000);

        const ord = await fetchFromHasuraServer(RETURNS_SINCE, {
          partner_id: b.partner_id,
          since: sentAt.toISOString(),
          until: until.toISOString(),
          exclude: NON_SALE_STATUSES,
        });

        // Index the window's orders by identity so both arms are scored the same way.
        const byIdentity = new Map<string, { at: string; value: number }>();
        for (const o of ord?.orders || []) {
          const raw = o.user?.phone || o.phone;
          if (!raw) continue;
          const n = normalizeForPartner(raw, b.partner || {});
          if (!n.ok) continue;
          const k = identityKey(n.value.e164);
          const prev = byIdentity.get(k);
          const value = Number(o.total_price) || 0;
          if (!prev) byIdentity.set(k, { at: o.created_at, value });
          else prev.value += value;
        }

        let tTotal = 0, tBack = 0, tValue = 0, hTotal = 0, hBack = 0;
        for (const r of recipients) {
          const hit = byIdentity.get(r.identity_key);
          if (r.arm === "holdout") {
            hTotal++;
            if (hit) hBack++;
          } else {
            tTotal++;
            if (hit) {
              tBack++;
              tValue += hit.value;
              await fetchFromHasuraServer(MARK_RETURNED, {
                id: r.id, at: hit.at, value: hit.value,
              }).catch(() => {});
            }
          }
        }

        // Incrementality: the treatment's return rate minus the control's, applied
        // to the treated population. Only published when there IS a control and
        // when enough orders carry a phone for returns to be visible at all.
        const measurable =
          (b.phone_coverage ?? 1) >= MIN_PHONE_COVERAGE_FOR_HEADLINE && hTotal > 0;
        const tRate = tTotal ? tBack / tTotal : 0;
        const hRate = hTotal ? hBack / hTotal : 0;
        const extraOrders = measurable ? Math.round((tRate - hRate) * tTotal) : null;

        await fetchFromHasuraServer(SET_BATCH, {
          id: b.id,
          set: {
            status: "measured",
            measured_at: now.toISOString(),
            results: {
              treated: tTotal, returned: tBack, revenue: tValue,
              holdout: hTotal, holdoutReturned: hBack,
              treatmentRate: tRate, holdoutRate: hRate,
              extraOrders,
              measurable,
              note: measurable
                ? null
                : hTotal === 0
                  ? "Too few customers to hold a comparison group back, so this is a raw count, not a measured effect."
                  : "Most of your orders don't record a phone number, so customers who came back in person aren't counted here.",
            },
          },
        });
        summary.measured++;
      } catch (e: any) {
        console.error(`[comeback-cron] measure failed batch=${b.id}:`, e?.message || e);
        summary.errors++;
      }
    }
  } catch (e: any) {
    console.error("[comeback-cron] measure query failed:", e?.message || e);
    summary.errors++;
  }

  // ── 3. build ──
  try {
    const cutoff = new Date(now.getTime() - MIN_BATCH_INTERVAL_DAYS * 86_400_000).toISOString();
    const stale = new Date(now.getTime() - STALE_LOCK_MS).toISOString();
    const due = await fetchFromHasuraServer(DUE_BUILD, {
      cutoff, stale, limit: BATCH_LIMIT,
    });
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://menuthere.com";

    for (const s of due?.comeback_settings || []) {
      const pid = s.partner_id;
      try {
        const claim = await fetchFromHasuraServer(CLAIM_PARTNER, {
          pid, now: now.toISOString(), stale,
        });
        if (!(claim?.update_comeback_settings?.affected_rows > 0)) continue;

        const liveRes = await fetchFromHasuraServer(HAS_LIVE, { pid });
        if ((liveRes?.comeback_batches_aggregate?.aggregate?.count || 0) > 0) {
          // A previous run has not finished converting to broadcasts yet. Starting
          // a second would double-book the same customers, so release the lock
          // without stamping last_built_at and pick this partner up next tick.
          await fetchFromHasuraServer(
            `mutation ComebackUnlock($pid: uuid!) {
               update_comeback_settings_by_pk(pk_columns: {partner_id: $pid}, _set: {locked_at: null}) { partner_id }
             }`,
            { pid },
          ).catch(() => {});
          summary.skipped++;
          continue;
        }

        // Reuse the same build path the dashboard button uses, so there is exactly
        // one implementation of the guards and the audience rules.
        const res = await fetch(`${origin}/api/whatsapp/comeback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "build", partnerId: pid }),
        }).then((r) => r.json()).catch(() => null);

        if (res?.ok) summary.built++;
        else summary.skipped++;

        await fetchFromHasuraServer(RELEASE_PARTNER, {
          pid, now: now.toISOString(),
        }).catch(() => {});
      } catch (e: any) {
        console.error(`[comeback-cron] build failed partner=${pid}:`, e?.message || e);
        summary.errors++;
        await fetchFromHasuraServer(RELEASE_PARTNER, {
          pid, now: now.toISOString(),
        }).catch(() => {});
      }
    }
  } catch (e: any) {
    console.error("[comeback-cron] build query failed:", e?.message || e);
    summary.errors++;
  }

  console.log("[comeback-cron]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}

import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { sendPartnerPush } from "@/lib/notify/orderPush";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Kitchen reminders for prebooked (scheduled) orders. Runs every 5 minutes on a
 * Vercel cron. Each tick:
 *   1. pulls a coarse batch of prebooked orders whose `scheduled_date` is within
 *      ±1 day of today (a date filter Hasura can index; the ±1 day slack covers
 *      every timezone offset on Earth, from UTC-12 to UTC+14),
 *   2. converts each order's restaurant-local wall clock into a real UTC
 *      instant `T` using the partner's IANA timezone,
 *   3. fires "t_minus_1h" once T-1h is reached and "due" once T is reached,
 *   4. CLAIMS each reminder in `order_reminders` *before* sending, so a given
 *      (order, kind) is delivered exactly once even if two ticks overlap.
 *
 * Auth: send `Authorization: Bearer <CRON_SECRET>`. Vercel cron sends this
 * automatically when CRON_SECRET is configured; if it is unset we allow (so it
 * works before configuration), mirroring the other cron routes.
 */

const BATCH = 500; // orders scanned per tick
const LEAD_MS = 4 * 60 * 1000; // fire a reminder whose instant lands within the next tick
const GRACE_MS = 15 * 60 * 1000; // reminders later than this are recorded but NOT sent

/**
 * Coarse candidate query. Deliberately dumb: Postgres cannot evaluate the
 * per-partner timezone maths, so we over-fetch by date and filter precisely in
 * JS below. Terminal / not-yet-real statuses are excluded — there is no kitchen
 * work to prep for a cancelled, completed, unpaid or expired order.
 */
const CANDIDATES_QUERY = `
  query PrebookedOrdersAround($from: date!, $to: date!, $limit: Int!) {
    orders(
      where: {
        scheduled_date: { _gte: $from, _lte: $to }
        scheduled_time: { _is_null: false }
        status: { _nin: ["cancelled", "completed", "pending_payment", "expired"] }
      }
      order_by: { scheduled_date: asc, scheduled_time: asc }
      limit: $limit
    ) {
      id
      display_id
      partner_id
      scheduled_date
      scheduled_time
      scheduled_time_to
      booking_persons
      type
      delivery_address
      partner {
        timezone
        store_name
      }
    }
  }
`;

/** Reminders already on file for the candidate orders — see the prefetch note
 *  in GET. Read-only; the claim below remains the source of truth. */
const EXISTING_REMINDERS_QUERY = `
  query ExistingOrderReminders($orderIds: [uuid!]!) {
    order_reminders(where: { order_id: { _in: $orderIds } }) {
      order_id
      kind
    }
  }
`;

/**
 * Claim a reminder. `on_conflict … update_columns: []` makes this a
 * do-nothing-on-conflict insert: a null return means another tick (or an
 * earlier run) already owns this (order_id, kind), so we skip. Same
 * claim-by-insert pattern as /api/cron/dispatch-notifications.
 */
const CLAIM_REMINDER = `
  mutation ClaimOrderReminder($order_id: uuid!, $kind: String!) {
    insert_order_reminders_one(
      object: { order_id: $order_id, kind: $kind }
      on_conflict: { constraint: order_reminders_order_kind_key, update_columns: [] }
    ) {
      id
    }
  }
`;

type ReminderKind = "t_minus_1h" | "due";

interface CandidateOrder {
  id: string;
  display_id: string | null;
  partner_id: string;
  scheduled_date: string; // "YYYY-MM-DD" (restaurant-local calendar day)
  scheduled_time: string; // "HH:MM:SS" (restaurant-local wall clock)
  scheduled_time_to: string | null;
  booking_persons: number | null;
  type: string | null;
  delivery_address: string | null;
  partner: { timezone: string | null; store_name: string | null } | null;
}

/**
 * How far ahead of UTC the zone is, in ms, *at a given instant*. Derived by
 * formatting the instant in the target zone and re-reading the parts as if they
 * were UTC — the difference is the offset. This is the only way to get a zone
 * offset in Node without a tz library.
 */
function zoneOffsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asIfUtc - instant.getTime();
}

/**
 * Convert a restaurant-LOCAL wall clock (`scheduled_date` + `scheduled_time`,
 * stored with no timezone — see src/store/orderStore.ts) into the real UTC
 * instant it denotes, given the partner's IANA `timezone`.
 *
 * WHY this matters: comparing the raw wall clock to `now` would silently treat
 * it as UTC (or as the server's zone), so a 2 PM slot in Asia/Kolkata would be
 * evaluated 5h30m late and every kitchen in the country would be alerted at the
 * wrong hour. There is no local→UTC helper in the repo (prebooking.ts and
 * visibility.ts only go UTC→local), hence this one.
 *
 * Algorithm: pretend the wall clock is UTC, probe the zone's offset at that
 * approximate instant, subtract it, then re-probe at the resulting instant. The
 * second probe is what makes DST correct: near a transition the offset at the
 * first guess can differ from the offset actually in force at the true instant
 * (e.g. America/New_York -4h in July vs -5h in January). Two passes converge
 * for every real zone. The two degenerate wall clocks a DST switch creates
 * resolve deterministically rather than throwing: a repeated hour (fall back)
 * takes its first, still-DST occurrence, and a skipped hour (spring forward,
 * a time that never happens) is mapped with the post-transition offset. Both
 * are at most an hour off for a slot the restaurant could not have booked.
 *
 * Returns null for malformed input so the caller can skip the row.
 *
 * Deliberately NOT exported: Next's route type-gen rejects any export from a
 * route file other than the HTTP verbs and the segment-config keys.
 */
function zonedWallClockToUtc(
  dateStr: string,
  timeStr: string,
  tz?: string | null
): Date | null {
  if (!dateStr || !timeStr) return null;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.slice(0, 5).split(":").map(Number);
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(d) ||
    !Number.isFinite(hh) ||
    !Number.isFinite(mm)
  ) {
    return null;
  }

  // The wall clock read as if it were UTC — an offset away from the truth.
  const naive = Date.UTC(y, mo - 1, d, hh, mm, 0, 0);

  // Default matches the rest of the notify stack (src/lib/notify/recurrence.ts).
  const zone = tz || "Asia/Kolkata";
  try {
    const firstGuess = naive - zoneOffsetMs(new Date(naive), zone);
    const refined = naive - zoneOffsetMs(new Date(firstGuess), zone);
    return new Date(refined);
  } catch {
    // Invalid IANA zone on the partner row — fall back to IST rather than
    // dropping the reminder entirely (the vast majority of partners are +05:30).
    try {
      const firstGuess = naive - zoneOffsetMs(new Date(naive), "Asia/Kolkata");
      return new Date(naive - zoneOffsetMs(new Date(firstGuess), "Asia/Kolkata"));
    } catch {
      return null;
    }
  }
}

/** "14:30" / "14:30:00" -> "2:30 PM". Local copy of prebooking.ts's
 *  formatSlotLabel: that module imports the (client-side) order store, which we
 *  must not drag into a route handler. */
function slotLabel(hhmm: string): string {
  const [h24, m] = (hhmm || "00:00").slice(0, 5).split(":").map(Number);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** "2:30 PM" or "2:30 PM – 3:00 PM" when the order carries a slot end. */
function slotRangeLabel(from: string, to: string | null): string {
  const a = slotLabel(from);
  if (!to) return a;
  const b = slotLabel(to);
  return b !== a ? `${a} – ${b}` : a;
}

/**
 * `orders.type` is NOT the checkout order type. The column only ever holds
 * "delivery" | "table_order" | "pos" (see the type assignment in
 * src/store/orderStore.ts) — notably a TAKEAWAY order is persisted as
 * "delivery", so the column alone cannot tell the kitchen whether to pack it
 * for a rider or for counter pickup. `delivery_address` is the discriminator:
 * real deliveries carry one, takeaway/self-pickup do not.
 */
function orderTypeLabel(o: CandidateOrder): string {
  if (o.type === "table_order") return "Dine-in";
  if (o.type === "delivery") return o.delivery_address ? "Delivery" : "Takeaway";
  return "Order";
}

/**
 * Copy has to be actionable at a glance on a busy kitchen screen: what, when,
 * and how long they have. Dine-in reservations (booking_persons set) are a
 * TABLE to hold, not food to cook — they read differently on purpose.
 */
function buildMessage(
  o: CandidateOrder,
  kind: ReminderKind
): { title: string; body: string } {
  const slot = slotRangeLabel(o.scheduled_time, o.scheduled_time_to);
  const ref = o.display_id ? `#${o.display_id}` : "A prebooked order";
  const isReservation = o.booking_persons != null;

  if (isReservation) {
    const guests = `${o.booking_persons} ${o.booking_persons === 1 ? "guest" : "guests"}`;
    return kind === "t_minus_1h"
      ? {
          title: "Table booking in 1 hour",
          body: `${ref} — table for ${guests} at ${slot}. Get it ready.`,
        }
      : {
          title: "Table booking is due now",
          body: `${ref} — table for ${guests}, slot ${slot} starts now.`,
        };
  }

  const typeLabel = orderTypeLabel(o);
  return kind === "t_minus_1h"
    ? {
        title: "Prebooked order due in 1 hour",
        body: `${ref} — ${typeLabel} scheduled for ${slot}. Start prepping.`,
      }
    : {
        title: "Prebooked order is due now",
        body: `${ref} — ${typeLabel} scheduled for ${slot} is due now.`,
      };
}

/** "YYYY-MM-DD" for a UTC date shifted by `dayOffset` days. */
function ymdUtc(base: Date, dayOffset: number): string {
  const d = new Date(base.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
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
    scanned: 0,
    claimed: 0,
    sent: 0,
    skippedStale: 0,
    failed: 0,
    alreadyClaimed: 0,
    errors: 0,
  };

  let orders: CandidateOrder[] = [];
  try {
    const data = await fetchFromHasuraServer(CANDIDATES_QUERY, {
      from: ymdUtc(now, -1),
      to: ymdUtc(now, 1),
      limit: BATCH,
    });
    orders = (data?.orders || []) as CandidateOrder[];
  } catch (e: any) {
    console.error("[prebooking-reminders] candidate query failed:", e?.message || e);
    return NextResponse.json({ error: "candidate_query_failed" }, { status: 500 });
  }

  summary.scanned = orders.length;

  // Resolve every order's slot into a real instant and collect the reminders
  // that are due. Fire once the target instant is reached, or lands inside the
  // next tick (LEAD_MS ≈ the 5-minute cadence) so a reminder is never pushed a
  // whole tick late. There is deliberately NO lower bound: if the cron was down,
  // a long-past target is still processed — but only to CLAIM it, so it can
  // never fire late. See the staleness guard below.
  const dueNow: Array<{ order: CandidateOrder; kind: ReminderKind; at: number }> = [];
  for (const o of orders) {
    const slotStart = zonedWallClockToUtc(
      o.scheduled_date,
      o.scheduled_time,
      o.partner?.timezone
    );
    if (!slotStart) continue;

    const targets: Array<{ kind: ReminderKind; at: number }> = [
      { kind: "t_minus_1h", at: slotStart.getTime() - 60 * 60 * 1000 },
      { kind: "due", at: slotStart.getTime() },
    ];
    for (const t of targets) {
      if (t.at - now.getTime() > LEAD_MS) continue;
      dueNow.push({ order: o, kind: t.kind, at: t.at });
    }
  }

  if (dueNow.length === 0) {
    console.log("[prebooking-reminders]", JSON.stringify(summary));
    return NextResponse.json({ ok: true, ...summary });
  }

  // Pre-read the reminders already on file for these orders. This is purely an
  // optimisation — the claim insert below is still what guarantees exactly-once
  // — but without it every tick would re-issue a claim mutation for every order
  // it has already reminded about, which is most of the batch on most ticks.
  const alreadySent = new Set<string>();
  try {
    const data = await fetchFromHasuraServer(EXISTING_REMINDERS_QUERY, {
      orderIds: Array.from(new Set(dueNow.map((d) => d.order.id))),
    });
    for (const r of data?.order_reminders || []) {
      alreadySent.add(`${r.order_id}:${r.kind}`);
    }
  } catch (e: any) {
    // Non-fatal: fall through and let the claim inserts do the deduping.
    console.error(
      "[prebooking-reminders] existing-reminder prefetch failed:",
      e?.message || e
    );
  }

  for (const { order: o, kind, at } of dueNow) {
    if (alreadySent.has(`${o.id}:${kind}`)) {
      summary.alreadyClaimed++;
      continue;
    }

    // CLAIM BEFORE SENDING. The claim row is the only thing that makes this
    // exactly-once; if we sent first and the insert then failed (or a second
    // tick raced us between the prefetch above and here), the kitchen would get
    // the same alert twice. A duplicate *missed* alert is recoverable; a
    // duplicate *sent* one is noise the partner cannot undo.
    let claimed = false;
    try {
      const res = await fetchFromHasuraServer(CLAIM_REMINDER, {
        order_id: o.id,
        kind,
      });
      claimed = Boolean(res?.insert_order_reminders_one?.id);
    } catch (e: any) {
      console.error(
        `[prebooking-reminders] claim failed order=${o.id} kind=${kind}:`,
        e?.message || e
      );
      summary.errors++;
      continue;
    }

    if (!claimed) {
      // Another tick already owns this reminder.
      summary.alreadyClaimed++;
      continue;
    }
    summary.claimed++;

    // STALENESS GUARD: the claim above is permanent, so a stale reminder is now
    // recorded and will never fire on a later tick. We deliberately do NOT send
    // it — telling a kitchen at 2 PM that a 1 PM order is "due in 1 hour" is
    // worse than silence.
    if (now.getTime() - at > GRACE_MS) {
      summary.skippedStale++;
      continue;
    }

    const { title, body } = buildMessage(o, kind);
    const res = await sendPartnerPush({
      partnerId: o.partner_id,
      title,
      body,
      url: "https://menuthere.com/admin-v2",
      data: {
        order_id: o.id,
        type: "prebooking_reminder",
        reminder_kind: kind,
      },
    });

    if (res.ok) summary.sent++;
    else summary.failed++;
  }

  console.log("[prebooking-reminders]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}

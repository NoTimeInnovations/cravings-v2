"use server";

import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { sendPartnerPush } from "@/lib/notify/orderPush";
import {
  MAX_SELF_COURIER_EVENTS,
  SELF_COURIER_PROVIDER,
  SELF_COURIER_STATE,
  brandLabel,
  brandBySlug,
  isTakeawayOrder,
  orderHandoverRef,
  parseSelfCourier,
  readSelfCourierRules,
  wouldChargeTwiceForDelivery,
  type SelfCourierBrandSlug,
  type SelfCourierRecord,
} from "@/lib/selfCourier";

/**
 * Recording that a customer arranged their own courier.
 *
 * Every export here is a PUBLIC RPC endpoint — a `"use server"` function is
 * directly callable by anyone who can reach the site, so each one re-reads the
 * order and re-checks every precondition server-side rather than trusting what
 * the panel believed when it rendered. The reasoning is the same one
 * src/app/actions/deliveryConnect.ts already writes down.
 *
 * All reads and writes go through fetchFromHasuraServer. Never the browser
 * client — that one ships NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET to the page.
 */

type Result =
  | { ok: true; record: SelfCourierRecord }
  | { ok: false; reason: string; message: string };

const fail = (reason: string, message: string): Result => ({ ok: false, reason, message });

const ORDER_QUERY = `
  query SelfCourierOrder($id: uuid!) {
    orders_by_pk(id: $id) {
      id
      status
      type
      delivery_address
      extra_charges
      is_paid
      total_price
      display_id
      partner_id
      user_id
      delivery_boy_id
      delivery_agent
      delivery_provider
      delivery_provider_meta
      delivery_provider_last_event_at
      partner { id store_name delivery_rules feature_flags }
    }
  }
`;

/**
 * Optimistic concurrency on delivery_provider_last_event_at.
 *
 * Two people can hold this link — it gets forwarded in WhatsApp groups — and
 * `_append` is a read-modify-write at the jsonb level. Without the guard, two
 * simultaneous confirms would silently clobber one another's events array.
 */
const WRITE_MUTATION = `
  mutation RecordSelfCourier(
    $where: orders_bool_exp!, $state: String!, $meta: jsonb!, $now: timestamptz!
  ) {
    update_orders(
      where: $where,
      _set: {
        delivery_provider: "customer_self",
        delivery_provider_state: $state,
        delivery_provider_last_event_at: $now
      },
      _append: { delivery_provider_meta: $meta }
    ) { affected_rows }
  }
`;

/** The same write, but leaving delivery_provider NULL — see offerSelfCourier. */
const OFFER_MUTATION = `
  mutation OfferSelfCourier($where: orders_bool_exp!, $meta: jsonb!, $now: timestamptz!) {
    update_orders(
      where: $where,
      _set: { delivery_provider_last_event_at: $now },
      _append: { delivery_provider_meta: $meta }
    ) { affected_rows }
  }
`;

/**
 * The optimistic-concurrency guard, as a where-clause.
 *
 * Built in TS rather than inlined with a nullable `$seen`, because Hasura
 * rejects `_eq: null` on a timestamptz as a validation error — it does not
 * treat it as "matches nothing". Inlining it would have failed every FIRST
 * write, which is the common case.
 */
function concurrencyWhere(orderId: string, seen: string | null) {
  return {
    id: { _eq: orderId },
    delivery_provider_last_event_at: seen ? { _eq: seen } : { _is_null: true },
  };
}

const OFFERABLE_STATUSES = ["food_ready", "ready", "dispatched"];

const clean = (v: unknown, max: number): string | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.slice(0, max);
};

const cleanPhone = (v: unknown): string | null => {
  const s = String(v ?? "").replace(/[^\d+]/g, "").trim();
  return s ? s.slice(0, 20) : null;
};

async function loadOrder(orderId: string) {
  const d = await fetchFromHasuraServer(ORDER_QUERY, { id: orderId });
  return d?.orders_by_pk ?? null;
}

/** Feature flags are a CSV string on the partner row; we only need two keys. */
function dispatchFlagOn(featureFlags: unknown, key: string): boolean {
  return String(featureFlags ?? "")
    .split(",")
    .some((p) => p.trim() === `${key}-true`);
}

/**
 * Is this order still eligible, judged from a freshly-read row?
 *
 * Mirrors the panel's gate exactly. If the two ever disagree the server wins,
 * and the customer sees a plain message rather than a write that half-succeeds.
 */
function eligibility(order: any): { ok: true } | { ok: false; reason: string; message: string } {
  if (!order) return { ok: false, reason: "not_found", message: "We couldn't find that order." };

  const rules = readSelfCourierRules(order.partner ?? {});
  if (!rules.enabled) {
    return { ok: false, reason: "disabled", message: "This restaurant hasn't turned this on." };
  }
  if (!OFFERABLE_STATUSES.includes(String(order.status))) {
    return {
      ok: false,
      reason: "status",
      message: "This order isn't ready for collection yet.",
    };
  }
  if (wouldChargeTwiceForDelivery({
    type: order.type,
    delivery_address: order.delivery_address,
    extra_charges: order.extra_charges,
  })) {
    return {
      ok: false,
      reason: "delivery_fee",
      message: "You've already paid this restaurant for delivery.",
    };
  }

  const existing = parseSelfCourier(order.delivery_provider_meta);
  const takeaway = isTakeawayOrder({
    type: order.type,
    delivery_address: order.delivery_address,
  });
  if (!takeaway && !(rules.types === "both" && existing?.stage === "offered")) {
    return {
      ok: false,
      reason: "not_offered",
      message: "The restaurant hasn't opened this option for this order.",
    };
  }

  // One courier story per order. Anything else already arranged wins.
  if (order.delivery_boy_id || order.delivery_agent) {
    return { ok: false, reason: "rider_exists", message: "A rider is already assigned to this order." };
  }
  const meta = (order.delivery_provider_meta ?? {}) as Record<string, unknown>;
  if (meta.dispatchId) {
    return { ok: false, reason: "dispatch_exists", message: "The restaurant is already booking a rider." };
  }
  if (order.delivery_provider && order.delivery_provider !== SELF_COURIER_PROVIDER) {
    return { ok: false, reason: "provider_exists", message: "A courier is already arranged for this order." };
  }
  // Writing a non-null delivery_provider_state would permanently block a pending
  // delayed Porter booking — the dispatch cron claims only null-state rows.
  if (
    dispatchFlagOn(order.partner?.feature_flags, "porter_bridge") ||
    dispatchFlagOn(order.partner?.feature_flags, "delivery_pool")
  ) {
    return { ok: false, reason: "auto_dispatch", message: "This restaurant books riders automatically." };
  }
  if ((existing?.events?.length ?? 0) >= MAX_SELF_COURIER_EVENTS) {
    return {
      ok: false,
      reason: "too_many",
      message: "This order has been updated too many times. Please call the restaurant.",
    };
  }
  return { ok: true };
}

function nextEvents(
  existing: SelfCourierRecord | null,
  event: SelfCourierRecord["events"] extends (infer E)[] | undefined ? E : never,
) {
  const prior = existing?.events ?? [];
  return [...prior, event].slice(-MAX_SELF_COURIER_EVENTS);
}

/* ========================================================== record (customer) */

/**
 * The customer says they booked a courier.
 *
 * No auth cookie required, and that is deliberate: roughly 60% of orders are
 * guests with a null user_id, and the person holding the tracking link IS the
 * customer here. The order UUID is the capability, exactly as it already is for
 * everything else on /order/[id]. The cookie is read opportunistically only to
 * stamp who did it.
 */
export async function recordSelfCourier(
  orderId: string,
  input: {
    provider: SelfCourierBrandSlug;
    reference?: string | null;
    riderName?: string | null;
    riderPhone?: string | null;
  },
): Promise<Result> {
  if (!orderId) return fail("bad_input", "Missing order.");
  if (!brandBySlug(input?.provider)) return fail("bad_input", "Pick which courier you booked.");

  let order: any;
  try {
    order = await loadOrder(orderId);
  } catch (e) {
    console.error("[selfCourier] order read failed:", e);
    return fail("read_failed", "We couldn't reach the order just now. Try again.");
  }

  const elig = eligibility(order);
  if (!elig.ok) return fail(elig.reason, elig.message);

  const existing = parseSelfCourier(order.delivery_provider_meta);
  const auth = await getAuthCookie().catch(() => null);
  const now = new Date().toISOString();

  const record: SelfCourierRecord = {
    v: 1,
    stage: "booked",
    provider: input.provider,
    providerLabel: brandLabel(input.provider),
    riderName: clean(input.riderName, 60),
    riderPhone: cleanPhone(input.riderPhone),
    reference: clean(input.reference, 40),
    arrangedBy: auth?.id ? `user:${auth.id}` : "guest",
    arrangedAt: now,
    notified: null,
    events: nextEvents(existing, {
      at: now,
      stage: "booked",
      by: "customer",
      provider: input.provider,
    }),
  };

  try {
    const res = await fetchFromHasuraServer(WRITE_MUTATION, {
      where: concurrencyWhere(orderId, order.delivery_provider_last_event_at ?? null),
      state: SELF_COURIER_STATE.booked,
      meta: { selfCourier: record },
      now,
    });
    if (!res?.update_orders?.affected_rows) {
      return fail("conflict", "Someone else updated this order. Reload and try again.");
    }
  } catch (e) {
    console.error("[selfCourier] write failed:", e);
    return fail("write_failed", "We couldn't save that. Try again.");
  }

  /**
   * AWAITED, not floated.
   *
   * A serverless invocation is finalized the moment the response returns, so a
   * floating promise is routinely killed — cancelOrder.ts documents the same
   * thing. And the panel is about to tell the customer "the restaurant has been
   * told", which must not be a claim we never verified. sendPartnerPush never
   * throws, so awaiting costs latency and nothing else.
   */
  const ref = orderHandoverRef(order);
  const store = order.partner?.store_name || "the restaurant";
  const label = brandLabel(input.provider);
  const paid = order.is_paid === true;
  const push = await sendPartnerPush({
    partnerId: order.partner_id,
    title: `Courier coming for order ${ref}`,
    body: paid
      ? `The customer booked a ${label} courier themselves. Hand it to whoever quotes ${ref}. Don't book a rider.`
      : `NOT MARKED PAID — collect ${order.total_price} before handing over. The customer booked a ${label} courier for order ${ref}.`,
    url: "https://menuthere.com/admin-v2?view=Orders",
    data: { order_id: String(order.id), type: "self_courier" },
  }).catch((e) => {
    console.error("[selfCourier] push failed:", e);
    return { ok: false, recipients: 0 } as { ok: boolean; recipients: number };
  });

  const notified = { pushed: !!push?.ok, recipients: Number(push?.recipients ?? 0) };
  const finalRecord = { ...record, notified };

  // Second write purely to record whether the restaurant was actually reached.
  // Best-effort: the booking itself is already saved, and a failure here must
  // not turn a successful record into an error for the customer.
  try {
    await fetchFromHasuraServer(WRITE_MUTATION, {
      where: concurrencyWhere(orderId, now),
      state: SELF_COURIER_STATE.booked,
      meta: { selfCourier: finalRecord },
      now: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[selfCourier] notified flag not persisted:", e);
  }

  return { ok: true, record: finalRecord };
}

/* ============================================================ clear / no-show */

/**
 * Undo, or the partner reporting that nobody turned up.
 *
 * `delivery_provider` deliberately stays "customer_self" — the order remains
 * countable as one that went out this way, and erasing the record would hide
 * from the partner that a stranger may still arrive.
 */
export async function clearSelfCourier(
  orderId: string,
  input: { stage: "cancelled" | "no_show"; reason?: string | null },
): Promise<Result> {
  if (!orderId) return fail("bad_input", "Missing order.");
  const stage = input?.stage;
  if (stage !== "cancelled" && stage !== "no_show") {
    return fail("bad_input", "Unknown update.");
  }

  let order: any;
  try {
    order = await loadOrder(orderId);
  } catch (e) {
    console.error("[selfCourier] order read failed:", e);
    return fail("read_failed", "We couldn't reach the order just now. Try again.");
  }
  if (!order) return fail("not_found", "We couldn't find that order.");

  // "Didn't arrive" is a claim about the customer's courier, so only the
  // restaurant may make it. Cancelling is the customer's own to do.
  if (stage === "no_show") {
    const auth = await getAuthCookie().catch(() => null);
    const allowed =
      auth &&
      (auth.role === "superadmin" ||
        (auth.role === "partner" && auth.id === order.partner_id));
    if (!allowed) return fail("forbidden", "Not authorized.");
  }

  const existing = parseSelfCourier(order.delivery_provider_meta);
  if (!existing || existing.stage === "offered") {
    return fail("nothing_to_clear", "There's no courier recorded on this order.");
  }
  if ((existing.events?.length ?? 0) >= MAX_SELF_COURIER_EVENTS) {
    return fail("too_many", "This order has been updated too many times.");
  }

  const now = new Date().toISOString();
  const record: SelfCourierRecord = {
    ...existing,
    stage,
    events: nextEvents(existing, {
      at: now,
      stage,
      by: stage === "no_show" ? "partner" : "customer",
      provider: existing.provider,
    }),
  };

  try {
    const res = await fetchFromHasuraServer(WRITE_MUTATION, {
      where: concurrencyWhere(orderId, order.delivery_provider_last_event_at ?? null),
      state: SELF_COURIER_STATE[stage],
      meta: { selfCourier: record },
      now,
    });
    if (!res?.update_orders?.affected_rows) {
      return fail("conflict", "Someone else updated this order. Reload and try again.");
    }
  } catch (e) {
    console.error("[selfCourier] clear failed:", e);
    return fail("write_failed", "We couldn't save that. Try again.");
  }

  return { ok: true, record };
}

/* ================================================================ offer (partner) */

/**
 * The partner opens the option on a real delivery order they cannot deliver.
 *
 * Leaves `delivery_provider` NULL on purpose: cancelOrder short-circuits on a
 * null provider, and an order merely *offered* a courier has nothing to unwind.
 */
export async function offerSelfCourier(orderId: string): Promise<Result> {
  if (!orderId) return fail("bad_input", "Missing order.");

  let order: any;
  try {
    order = await loadOrder(orderId);
  } catch (e) {
    console.error("[selfCourier] order read failed:", e);
    return fail("read_failed", "We couldn't reach the order just now. Try again.");
  }
  if (!order) return fail("not_found", "We couldn't find that order.");

  const auth = await getAuthCookie().catch(() => null);
  const allowed =
    auth &&
    (auth.role === "superadmin" ||
      (auth.role === "partner" && auth.id === order.partner_id));
  if (!allowed) return fail("forbidden", "Not authorized.");

  const rules = readSelfCourierRules(order.partner ?? {});
  if (!rules.enabled || rules.types !== "both") {
    return fail("disabled", "Turn on customer-booked couriers for delivery orders first.");
  }
  if (isTakeawayOrder({ type: order.type, delivery_address: order.delivery_address })) {
    return fail("takeaway", "Pickup orders already offer this automatically.");
  }
  if (wouldChargeTwiceForDelivery({
    type: order.type,
    delivery_address: order.delivery_address,
    extra_charges: order.extra_charges,
  })) {
    return fail(
      "delivery_fee",
      "Refund the delivery charge first — we can't ask the customer to pay twice.",
    );
  }

  const existing = parseSelfCourier(order.delivery_provider_meta);
  if (existing) return fail("already", "This order already offers a courier.");

  const now = new Date().toISOString();
  const record: SelfCourierRecord = {
    v: 1,
    stage: "offered",
    provider: null,
    providerLabel: null,
    riderName: null,
    riderPhone: null,
    reference: null,
    arrangedBy: "partner",
    arrangedAt: now,
    notified: null,
    events: [{ at: now, stage: "offered", by: "partner", provider: null }],
  };

  try {
    const res = await fetchFromHasuraServer(OFFER_MUTATION, {
      where: concurrencyWhere(orderId, order.delivery_provider_last_event_at ?? null),
      meta: { selfCourier: record },
      now,
    });
    if (!res?.update_orders?.affected_rows) {
      return fail("conflict", "Someone else updated this order. Reload and try again.");
    }
  } catch (e) {
    console.error("[selfCourier] offer failed:", e);
    return fail("write_failed", "We couldn't save that. Try again.");
  }

  return { ok: true, record };
}

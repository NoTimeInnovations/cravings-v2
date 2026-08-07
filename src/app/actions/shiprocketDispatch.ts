"use server";

// Ship an order through the partner's own Shiprocket account.
//
// THE THING TO UNDERSTAND BEFORE CHANGING ANYTHING HERE
// -----------------------------------------------------
// A Shiprocket order reference is burned permanently the first time it is used —
// including on an order that was later cancelled — and every accepted send bills
// the merchant's wallet. Three callers can fire for the same order at the same
// moment: the auto-dispatch hook in orderStore.updateOrderStatus, the manual Ship
// button, and a partner double-tapping either. So the claim is won in Postgres,
// not in JavaScript: shiprocket_shipments.order_id is the primary key, and the
// INSERT that wins is the only caller allowed to talk to Shiprocket.
//
// Retries are deliberate, not free. A row that ended `failed` or `cancelled` can be
// re-claimed by a conditional UPDATE whose WHERE clause decides the winner; that
// bumps `attempt`, which changes the reference we send, because Shiprocket will
// never accept the old one again. A row in any other state is never re-sent.
//
// Everything here is fire-and-forget from the caller's side: failures are persisted
// onto the shipment row so the admin can see why, and never thrown.

import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { shiprocketCredsForPartner } from "@/lib/shiprocket/creds";
import {
  assignAwb,
  cancelShiprocketOrder,
  createAdhocOrder,
  generateLabel,
  getOrderStatus,
  listCouriersForOrder,
  requestPickup,
} from "@/lib/shiprocket/client";
import { resolveDestination } from "@/lib/shiprocket/address";
import {
  cancelShipmentCore,
  getShipmentRow,
  persistShipment,
  persistShipmentUnlessCancelled,
} from "@/lib/shiprocket/shipments";
import type { ShipmentStatus, ShipmentView, ShiprocketConfig } from "@/lib/shiprocket/types";

export type DispatchResult =
  | { ok: true; skipped?: string; awb?: string | null; courier?: string | null; shipmentId?: string | null }
  | { ok: false; message: string; status?: number };

// ── Authorization ──────────────────────────────────────────────────────────
// Every export below is a public RPC endpoint that spends a real merchant's
// Shiprocket wallet, so each one proves the caller owns the order FIRST. The
// caller never names a partner — the identity comes from the session cookie and
// the ownership from the order row, so an attacker holding someone else's order
// UUID gets nothing.

/** The acting user's id when they may act on this order, otherwise null. */
async function requireOrderActor(orderId: string): Promise<string | null> {
  if (!orderId) return null;
  // Inside the try: getAuthCookie decrypts the session cookie and THROWS on a
  // stale or tampered one (e.g. after an encryption-key rotation). Letting that
  // escape turns an intended "Not authorized" into a rejected server action —
  // which the fire-and-forget dispatch path swallows entirely, so the counter is
  // told nothing while the parcel silently never books.
  let auth: Awaited<ReturnType<typeof getAuthCookie>>;
  try {
    auth = await getAuthCookie();
  } catch {
    return null;
  }
  if (!auth?.id) return null;
  if (auth.role === "superadmin") return auth.id;
  if (auth.role !== "partner" && auth.role !== "captain") return null;

  try {
    const data = await fetchFromHasuraServer(
      `query OrderOwner($id: uuid!) { orders_by_pk(id: $id) { partner_id } }`,
      { id: orderId },
    );
    const ownerId = (data as any)?.orders_by_pk?.partner_id;
    if (!ownerId) return null;
    if (auth.role === "partner") return ownerId === auth.id ? auth.id : null;

    // A captain belongs to exactly one store. Without this second lookup the
    // captain branch would assert only that the order EXISTS, which would let a
    // captain of any store ship — and bill — another partner's order.
    //
    // No captain UI reaches this today (the captain session carries no
    // feature_flags, so the orderStore hook never fires for them, and the manual
    // panel lives only in admin-v2). The check is here because a server action is
    // a public RPC endpoint regardless of which UI exists.
    const cap = await fetchFromHasuraServer(
      `query CaptainStore($id: uuid!) { captain_by_pk(id: $id) { partner_id } }`,
      { id: auth.id },
    );
    return (cap as any)?.captain_by_pk?.partner_id === ownerId ? auth.id : null;
  } catch {
    return null;
  }
}

// ── Order loading ──────────────────────────────────────────────────────────

interface OrderForShipping {
  id: string;
  display_id: string | null;
  total_price: number | null;
  type: string | null;
  status: string | null;
  delivery_address: string | null;
  phone: string | null;
  partner_id: string;
  created_at: string | null;
  is_paid: boolean | null;
  payment_method: string | null;
  delivery_location: { coordinates: [number, number] } | null;
  user: { full_name: string | null; phone: string | null; email: string | null } | null;
  order_items: Array<{
    quantity: number | null;
    item: any;
    menu: { id: string; name: string | null; price: number | null } | null;
  }> | null;
  partner: {
    id: string;
    store_name: string | null;
    phone: string | null;
    email: string | null;
    district: string | null;
    state: string | null;
    location: string | null;
    /** IANA zone; order_date must be stamped in the store's day, not the server's. */
    timezone: string | null;
    geo_location: { coordinates: [number, number] } | null;
  } | null;
}

const ORDER_FOR_SHIPPING = `
  query OrderForShiprocket($id: uuid!) {
    orders_by_pk(id: $id) {
      id
      display_id
      total_price
      type
      status
      delivery_address
      delivery_location
      phone
      partner_id
      created_at
      is_paid
      payment_method
      user { full_name phone email }
      order_items { quantity item menu { id name price } }
      partner {
        id
        store_name
        phone
        email
        district
        state
        location
        timezone
        geo_location
      }
    }
  }
`;

// ── Claim / persistence ────────────────────────────────────────────────────

/** A claim that never finished within this long is treated as lost, not in flight. */
const STALE_CLAIM_MS = 15 * 60 * 1000;

type Claim =
  /** Nothing exists upstream — build and send a whole new order. */
  | { ok: true; kind: "create"; attempt: number }
  /** The Shiprocket order already exists; only the courier is missing. */
  | {
      ok: true;
      kind: "resume";
      attempt: number;
      shipmentId: string;
      srOrderId: string | null;
      /** The mode this shipment was CREATED under, which may not be today's setting. */
      mode: string | null;
    }
  | { ok: false; reason: string };

/**
 * Win the right to ship this order, or explain why we didn't.
 *
 * Every step is decided by the database, never by JavaScript:
 *   1. INSERT ... ON CONFLICT DO NOTHING. Hasura returns null from insert_one when
 *      nothing was inserted, so a non-null result means we are the ONLY claimant.
 *   2. A conditional UPDATE whose WHERE clause names the states we may take over.
 *      Postgres serialises those, so exactly one concurrent caller sees
 *      affected_rows > 0 and everybody else stops.
 *
 * `force` (the manual button) widens which states may be taken over. It never
 * weakens the claim itself — there is no path that skips it.
 */
async function claimShipment(
  orderId: string,
  partnerId: string,
  mode: string,
  force: boolean,
): Promise<Claim> {
  const now = new Date().toISOString();

  // 1. First writer wins. `update_columns: []` makes this ON CONFLICT DO NOTHING,
  //    and Hasura's insert_one returns null when nothing was inserted — so a
  //    non-null return here means we, and only we, created the row.
  const inserted = await fetchFromHasuraServer(
    `mutation ClaimShipment($obj: shiprocket_shipments_insert_input!) {
      insert_shiprocket_shipments_one(object: $obj, on_conflict: {
        constraint: shiprocket_shipments_pkey,
        update_columns: []
      }) { order_id attempt }
    }`,
    {
      obj: {
        order_id: orderId,
        partner_id: partnerId,
        mode,
        status: "claimed",
        attempt: 1,
        created_at: now,
        updated_at: now,
      },
    },
  );
  if ((inserted as any)?.insert_shiprocket_shipments_one) {
    return { ok: true, kind: "create", attempt: 1 };
  }

  // 2. A claim that died mid-flight (deploy, timeout, crash) would otherwise wedge
  //    the order forever. Age it out into `unknown` rather than straight back into
  //    the retry pool: we genuinely do not know whether Shiprocket accepted it, and
  //    an automatic re-send would be a second real parcel.
  //    WHICH state it ages into depends on whether we already know the Shiprocket
  //    order — and getting this wrong costs a second parcel. A claim carrying a
  //    shipment_id came from the RESUME path: the order demonstrably exists
  //    upstream and only its courier was missing, so it goes back to `created`,
  //    from which a retry resumes at the AWB step and re-bills nothing. Only a
  //    claim with no shipment_id is genuinely ambiguous, and that is the one that
  //    becomes `unknown` — whose sole exit re-creates from scratch, NULLing the
  //    ids and sending a fresh reference Shiprocket cannot dedupe.
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
  await fetchFromHasuraServer(
    `mutation AgeOutStaleClaim($id: uuid!, $before: timestamptz!, $now: timestamptz!) {
      resumable: update_shiprocket_shipments(
        where: {
          order_id: { _eq: $id }, status: { _eq: "claimed" },
          updated_at: { _lt: $before }, shipment_id: { _is_null: false }
        },
        _set: {
          status: "created",
          updated_at: $now,
          last_error: "The previous send did not finish. The order exists at Shiprocket without a courier — shipping again finishes it without creating a second one."
        }
      ) { affected_rows }
      ambiguous: update_shiprocket_shipments(
        where: {
          order_id: { _eq: $id }, status: { _eq: "claimed" },
          updated_at: { _lt: $before }, shipment_id: { _is_null: true }
        },
        _set: {
          status: "unknown",
          updated_at: $now,
          last_error: "The previous send did not finish, so we cannot tell whether Shiprocket accepted it. Check your Shiprocket panel before shipping again."
        }
      ) { affected_rows }
    }`,
    { id: orderId, before: staleBefore, now },
  ).catch(() => {});

  // 3. Resume: the Shiprocket order exists but never got a courier. Assigning an
  //    AWB to that same shipment is finishing the job, not starting a second one,
  //    so there is nothing to re-create and `attempt` does not move. Manual only —
  //    a later status change should not quietly re-poke Shiprocket.
  if (force) {
    const resumed = await fetchFromHasuraServer(
      `mutation ResumeShipment($id: uuid!, $now: timestamptz!) {
        update_shiprocket_shipments(
          where: {
            order_id: { _eq: $id },
            status: { _eq: "created" },
            shipment_id: { _is_null: false }
          },
          _set: { status: "claimed", last_error: null, updated_at: $now }
        ) { affected_rows returning { attempt shipment_id sr_order_id mode } }
      }`,
      { id: orderId, now },
    );
    const r = (resumed as any)?.update_shiprocket_shipments;
    if (r?.affected_rows > 0) {
      return {
        ok: true,
        kind: "resume",
        attempt: r.returning?.[0]?.attempt ?? 1,
        shipmentId: String(r.returning?.[0]?.shipment_id),
        srOrderId: r.returning?.[0]?.sr_order_id ? String(r.returning[0].sr_order_id) : null,
        mode: r.returning?.[0]?.mode ?? null,
      };
    }
  }

  // 4. Re-create. Only from states where we KNOW nothing shippable exists upstream.
  //    `failed` means Shiprocket rejected the request outright. `cancelled` and
  //    `unknown` are re-creatable only by a human pressing the button, because in
  //    both cases a real parcel may exist and the new reference is one Shiprocket
  //    cannot recognise as a duplicate.
  const reclaimable = force ? ["failed", "cancelled", "unknown"] : ["failed"];
  const retried = await fetchFromHasuraServer(
    `mutation ReclaimShipment($id: uuid!, $mode: String!, $now: timestamptz!, $states: [String!]!) {
      update_shiprocket_shipments(
        where: { order_id: { _eq: $id }, status: { _in: $states } },
        _inc: { attempt: 1 },
        _set: {
          status: "claimed", mode: $mode, last_error: null, updated_at: $now,
          sr_order_id: null, shipment_id: null, awb_code: null, courier_name: null,
          courier_company_id: null, label_url: null, tracking_url: null
        }
      ) { affected_rows returning { attempt } }
    }`,
    { id: orderId, mode, now, states: reclaimable },
  );
  const rows = (retried as any)?.update_shiprocket_shipments;
  if (rows?.affected_rows > 0) {
    return { ok: true, kind: "create", attempt: rows.returning?.[0]?.attempt ?? 2 };
  }

  // 5. Nothing claimable. Say which, so the caller can word it usefully.
  const current = await getShipmentRow(orderId);
  const state = current?.status ?? "unknown";
  if (state === "claimed") {
    return { ok: false, reason: "This order is being sent to Shiprocket right now." };
  }
  if (state === "unknown" || state === "cancelled" || state === "created") {
    return {
      ok: false,
      reason: `This order needs a manual retry (${state}). Open the order and press Try again.`,
    };
  }
  return { ok: false, reason: "This order has already been shipped." };
}

/** Mark the claim failed so a retry is possible and the admin can see the reason. */
async function failShipment(orderId: string, message: string): Promise<DispatchResult> {
  await persistShipment(orderId, { status: "failed" as ShipmentStatus, last_error: message.slice(0, 500) });
  console.warn(`[shiprocket] order=${orderId} dispatch failed: ${message}`);
  return { ok: false, message };
}

// ── Payload building ───────────────────────────────────────────────────────

function latLng(
  geo: { coordinates: [number, number] } | null | undefined,
): { lat: number; lng: number } | null {
  const c = geo?.coordinates;
  if (!Array.isArray(c) || c.length !== 2) return null;
  const [lng, lat] = c;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function tenDigit(p: string | null | undefined): string | null {
  const d = String(p ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.slice(-10);
}

/**
 * `yyyy-mm-dd HH:MM`, the format Shiprocket's order_date accepts, rendered in the
 * STORE's timezone.
 *
 * The server runs in UTC, so formatting off the local clock stamps an evening
 * order in India with the previous day's date — which then shows as a late order
 * in the merchant's Shiprocket panel and skews their own reporting.
 */
function shiprocketDate(iso: string | null | undefined, timeZone?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(safe);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    // en-CA gives ISO-ordered date parts; hour can come back as "24" at midnight.
    const hour = get("hour") === "24" ? "00" : get("hour");
    return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}`;
  } catch {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${safe.getUTCFullYear()}-${p(safe.getUTCMonth() + 1)}-${p(safe.getUTCDate())} ${p(safe.getUTCHours())}:${p(safe.getUTCMinutes())}`;
  }
}

/**
 * The reference Shiprocket stores as its `order_id`.
 *
 * Attempt 1 is the bare reference; a retry gets an -R2 suffix, because the
 * original is permanently spent even though the shipment it created never
 * happened. Without the suffix every retry is rejected as a duplicate.
 */
function orderRef(order: OrderForShipping, attempt: number): string {
  // 12 UUID characters, not 4. display_id restarts per store and repeats across
  // months, so "MT-12-a1b2" could genuinely be produced by two different orders —
  // and the webhook finds the row BY this reference, so a collision delivers one
  // parcel's "Delivered" onto the other parcel's order. 12 hex chars makes that
  // vanishingly unlikely while staying inside Shiprocket's length limit.
  const base = order.display_id
    ? `MT-${order.display_id}-${order.id.slice(0, 12)}`
    : `MT-${order.id.slice(0, 16)}`;
  return attempt > 1 ? `${base}-R${attempt}` : base;
}

function buildOrderPayload(
  order: OrderForShipping,
  cfg: ShiprocketConfig,
  dest: { pincode: string; city: string; state: string; country: string },
  ref: string,
): Record<string, unknown> {
  // Shiprocket rejects an order that repeats a SKU ("SKU cannot be repeated"),
  // so uniqueness across the lines is our problem to guarantee, not a nicety.
  const seenSkus = new Set<string>();
  const items = (order.order_items ?? []).map((line, i) => {
    const name = line.item?.name || line.menu?.name || `Item ${i + 1}`;
    const price = Number(line.item?.price ?? line.menu?.price ?? 0) || 0;
    // Our menu rows have no SKU concept. `item.id` is the VARIANT id
    // ("<menuId>|Small"), which is what actually distinguishes two lines of the
    // same dish — `menu.id` is shared by every variant of it, so a cart holding a
    // Small and a Large of one drink would send the same SKU twice and be refused.
    const baseSku = String(line.item?.id ?? line.menu?.id ?? `ITEM-${i + 1}`).slice(0, 46);
    // Even variant ids can collide (the same variant added twice as separate lines
    // with different notes), so position is the last resort. Suffixed after the
    // slice, or two long ids sharing a prefix would collide again.
    let sku = baseSku;
    for (let n = 2; seenSkus.has(sku); n += 1) sku = `${baseSku}-${n}`;
    seenSkus.add(sku);
    return {
      name: String(name).slice(0, 100),
      sku,
      units: Math.max(1, Number(line.quantity) || 1),
      selling_price: price,
      // Hyperlocal only, and it belongs HERE rather than on the order: Shiprocket
      // reads the category off each line item and ignores a top-level one entirely.
      // Verified against the live API — a top-level `category_name` is rejected
      // exactly like sending nothing. Parcel orders must not carry it.
      ...(cfg.mode === "hyperlocal" ? { category_name: cfg.category } : {}),
    };
  });

  // Shiprocket does NOT compute sub_total. Sending the order total keeps the
  // declared value consistent with what the customer actually paid, including
  // delivery and discounts, which is what an insurance claim would be measured on.
  const subTotal = Number(order.total_price) || items.reduce((s, i) => s + i.selling_price * i.units, 0);

  const customerName = (order.user?.full_name || "Customer").trim();
  const [first, ...rest] = customerName.split(/\s+/);
  const phone = tenDigit(order.phone) || tenDigit(order.user?.phone) || "";
  const drop = latLng(order.delivery_location);

  const payload: Record<string, unknown> = {
    order_id: ref,
    order_date: shiprocketDate(order.created_at, order.partner?.timezone),
    pickup_location: cfg.pickup_location,
    billing_customer_name: first || "Customer",
    billing_last_name: rest.join(" ") || "",
    billing_address: String(order.delivery_address ?? "").slice(0, 200) || "NA",
    billing_city: dest.city.slice(0, 30),
    billing_pincode: dest.pincode,
    billing_state: dest.state,
    billing_country: dest.country,
    billing_email: order.user?.email || order.partner?.email || "",
    billing_phone: phone,
    shipping_is_billing: true,
    order_items: items,
    // is_paid comes from our own payment flow; an unpaid order is collected on
    // delivery, which is exactly what Shiprocket means by COD.
    payment_method: order.is_paid ? "Prepaid" : "COD",
    sub_total: subTotal,
    length: cfg.package.length,
    breadth: cfg.package.breadth,
    height: cfg.package.height,
    weight: cfg.package.weight,
  };

  if (cfg.channel_id) payload.channel_id = cfg.channel_id;

  // Hyperlocal needs the drop pin on the order itself AND shipping_method: "HL".
  // Without the shipping_method, Shiprocket accepts the order but files it as an
  // ordinary parcel — the merchant gets a courier booking where they expected a
  // same-city rider, and nothing in the response says so.
  if (cfg.mode === "hyperlocal") {
    payload.shipping_method = "HL";
    // The category that hyperlocal demands is set per line item above, not here.
    if (drop) {
      payload.latitude = drop.lat;
      payload.longitude = drop.lng;
    }
  }

  return payload;
}

// ── Public: dispatch ───────────────────────────────────────────────────────

/**
 * Ship an order. Safe to call more than once — the second call is refused by the
 * claim, not by a race.
 *
 * `force` only relaxes the auto-dispatch/trigger checks (it is what the manual
 * button passes); it never relaxes the claim, so it cannot double-ship.
 */
async function dispatchShiprocket(
  orderId: string,
  opts: { force?: boolean; expectStatus?: string } = {},
): Promise<DispatchResult> {
  if (!orderId) return { ok: false, message: "orderId required" };

  let order: OrderForShipping | null = null;
  try {
    const data = await fetchFromHasuraServer(ORDER_FOR_SHIPPING, { id: orderId });
    order = (data as any)?.orders_by_pk ?? null;
  } catch (e) {
    return { ok: false, message: `hasura: ${(e as Error)?.message}` };
  }
  if (!order) return { ok: false, message: `order ${orderId} not found` };
  if (!order.partner) return { ok: false, message: `partner missing on order ${orderId}` };

  // Gate + credentials in one read. Returns null when the flag is off, so a store
  // that was switched off mid-flight stops here rather than at Shiprocket.
  const creds = await shiprocketCredsForPartner(order.partner_id);
  if (!creds) {
    return { ok: true, skipped: "Shiprocket is not enabled or configured for this store" };
  }
  const cfg = creds.config;

  // ORDER OF THESE GATES MATTERS. The cheap "this transition isn't for us" skips
  // run FIRST, so a store that is simply not shipping this order returns a quiet
  // skip. Putting the config check first meant every status change on every order
  // — dine-in included — popped a red "no pickup location" toast at the counter.
  if (!opts.force) {
    if (!cfg.auto_dispatch) {
      return { ok: true, skipped: "auto-dispatch is off for this store" };
    }
    // The trigger is compared against the order's REAL status from the row we just
    // loaded, not the status the caller claimed. A caller-supplied value would let
    // anyone assert "accepted" for an order still sitting at pending.
    const actual = order.status ?? "";
    if (opts.expectStatus && opts.expectStatus !== actual) {
      return { ok: true, skipped: "order status changed since this was queued" };
    }
    if (actual !== cfg.dispatch_trigger) {
      // Worth a log line rather than a silent skip: if the order raced PAST the
      // trigger (two devices advancing it at once), auto-dispatch quietly does
      // nothing and only the manual button recovers it. Being able to see that in
      // the logs is the difference between a known gap and a mystery.
      if (opts.expectStatus) {
        console.log(
          `[shiprocket] order=${orderId} not dispatched — status=${actual}, trigger=${cfg.dispatch_trigger}`,
        );
      }
      return { ok: true, skipped: `trigger is ${cfg.dispatch_trigger}` };
    }
  }

  // Only real deliveries ship. Takeaway is stored as type="delivery" with no
  // address, and dine-in/POS never leaves the building.
  const hasAddress = !!order.delivery_address && order.delivery_address.trim().length > 0;
  if (order.type !== "delivery" || !hasAddress) {
    return { ok: true, skipped: "not a delivery order with an address" };
  }

  if (!cfg.pickup_location) {
    return { ok: false, message: "No Shiprocket pickup location is selected for this store." };
  }

  const drop = latLng(order.delivery_location);
  if (cfg.mode === "hyperlocal" && !drop) {
    return {
      ok: false,
      message:
        "Shiprocket Quick needs the delivery pin. This order's address has no map location.",
    };
  }

  // ---- Past this point we are allowed to spend the merchant's money. ----
  const claim = await claimShipment(orderId, order.partner_id, cfg.mode, !!opts.force);
  if (!claim.ok) {
    // Not an error the caller should retry — the order is already handled, or it
    // needs a human. Reported as a skip so auto-dispatch does not alarm the counter.
    return { ok: true, skipped: claim.reason };
  }

  // The mode a shipment FINISHES in must be the one it started in. A partner who
  // switches the store from parcel to Quick between the create and the retry would
  // otherwise have us hunt for a hyperlocal rider for an order Shiprocket holds as
  // a parcel — the courier classes are not interchangeable, and the order was
  // already filed upstream under the old one.
  const effectiveMode =
    claim.kind === "resume" && (claim.mode === "parcel" || claim.mode === "hyperlocal")
      ? claim.mode
      : cfg.mode;
  if (claim.kind === "resume" && claim.mode && claim.mode !== cfg.mode) {
    console.log(
      `[shiprocket] order=${orderId} resuming as ${claim.mode} (store is now ${cfg.mode})`,
    );
  }

  let shipmentId: string;
  let srOrderId: string | null;

  if (claim.kind === "resume") {
    // The Shiprocket order already exists; we are only finishing the courier step.
    // Nothing is re-created and nothing is re-billed for the order itself.
    shipmentId = claim.shipmentId;
    srOrderId = claim.srOrderId;

    // ...unless it was cancelled in the Shiprocket panel behind our back. That
    // order can never take a courier, and resume outranks re-create, so without
    // this check the row is stuck: every retry assigns against a dead order and
    // reports "order is in cancelled state" forever.
    //
    // We move it to `cancelled` and STOP rather than re-creating in the same call.
    // Re-creating means a new reference, a new billable parcel, and Shiprocket has
    // no way to recognise it as a duplicate — that has to be someone's decision,
    // not the silent second half of a retry. `cancelled` is re-claimable by the
    // manual button, so the very next press books a fresh order.
    if (srOrderId) {
      const upstream = await getOrderStatus(order.partner_id, srOrderId);
      if (upstream.ok && upstream.data.cancelled) {
        const msg =
          `This order was cancelled at Shiprocket (${upstream.data.status ?? "cancelled"}), so it can no longer be given a courier. ` +
          `Press Ship again to book a NEW Shiprocket order — it gets a new reference and is billed separately.`;
        await persistShipment(orderId, {
          status: "cancelled" as ShipmentStatus,
          last_error: msg,
        });
        // Reported as a SKIP, not a failure. Nothing went wrong: the row has been
        // moved to a state the button can re-create from, and the only thing left
        // is for a human to decide to pay for a second parcel. Returning ok:false
        // put a red "could not ship" toast on what is really a prompt.
        return { ok: true, skipped: msg };
      }
    }
  } else {
    // Resolved AFTER the claim, because it is a billable Google Geocoding call —
    // every attempt the claim refuses (a double-tap, auto-dispatch racing the
    // manual button, a re-triggered status change) would otherwise pay for a
    // lookup it never uses. Routed through failShipment so "no PIN code" lands on
    // the row the order panel reads, instead of a toast that disappears.
    const dest = await resolveDestination({
      address: order.delivery_address,
      coords: drop,
      partnerId: order.partner_id,
      fallback: {
        city: order.partner.district,
        state: order.partner.state,
        country: "India",
      },
    });
    if (!dest.ok) return failShipment(orderId, dest.message);

    const ref = orderRef(order, claim.attempt);
    const payload = buildOrderPayload(order, cfg, dest.data, ref);
    await persistShipment(orderId, { sr_order_ref: ref, mode: cfg.mode });

    const created = await createAdhocOrder(order.partner_id, payload);
    if (!created.ok) {
      // A REJECTED request and an UNANSWERED one are not the same thing, and
      // conflating them is how a merchant ends up paying for two parcels.
      //
      // 4xx means Shiprocket looked at the request and refused it: nothing was
      // created, so the row goes to `failed` and may be retried automatically.
      //
      // A timeout, a 5xx, or a 200 we could not parse means we never found out.
      // The order may well exist upstream, and a retry would send a DIFFERENT
      // reference (the -R suffix) that Shiprocket cannot recognise as a duplicate
      // — a second real parcel, billed again. Those go to `unknown`, which only a
      // human can clear.
      //
      // The unparseable-200 case is not hypothetical: Shiprocket answers "order
      // already exists" with HTTP 200 and an embedded status_code, which arrives
      // here as code "unknown" with no order id. Filing that as `failed` would put
      // it in the one state auto-dispatch re-claims on its own.
      const ambiguous =
        created.code === "network" ||
        created.code === "server" ||
        created.code === "unknown";
      if (ambiguous) {
        await persistShipment(orderId, {
          status: "unknown" as ShipmentStatus,
          last_error:
            `Shiprocket did not answer (${created.message}). The order may or may not have been created — ` +
            `check your Shiprocket panel for reference ${ref} before shipping this again.`,
        });
        return {
          ok: false,
          message:
            "Shiprocket did not respond, so we cannot tell whether the order was created. Check your Shiprocket panel before retrying.",
        };
      }
      return failShipment(orderId, created.message);
    }

    shipmentId = created.data.shipmentId;
    srOrderId = created.data.orderId;
    // GUARDED, not a plain write. The order was cancelled here while we were
    // talking to Shiprocket if this comes back false — in which case the parcel we
    // just created is one nobody wants, and we withdraw it rather than going on to
    // book a courier for an order that no longer exists.
    const stillWanted = await persistShipmentUnlessCancelled(orderId, {
      status: "created" as ShipmentStatus,
      sr_order_id: created.data.orderId,
      shipment_id: created.data.shipmentId,
      last_error: null,
    });
    if (!stillWanted) {
      const undo = await cancelShiprocketOrder(order.partner_id, created.data.orderId);
      await persistShipment(orderId, {
        sr_order_id: created.data.orderId,
        shipment_id: created.data.shipmentId,
        last_error: undo.ok
          ? "Order was cancelled while it was being sent; the Shiprocket order was withdrawn."
          : `Order was cancelled while it was being sent, and withdrawing it at Shiprocket failed: ${undo.message}. Check reference ${ref} in your Shiprocket panel.`,
      });
      console.warn(`[shiprocket] order=${orderId} cancelled mid-dispatch; upstream undo ok=${undo.ok}`);
      return { ok: true, skipped: "order was cancelled while it was being sent" };
    }
  }

  // AWB assignment is a separate call and can fail on its own (no serviceable
  // courier, empty wallet, unverified pickup phone). The order EXISTS at Shiprocket
  // by now, so the row rests at `created` — a state the manual Try again button
  // RESUMES from rather than re-creating, so a stuck order is recoverable without
  // paying for a second one.
  // WHICH courier, and why we cannot let Shiprocket decide on hyperlocal.
  //
  // Left to itself, /courier/assign/awb takes Shiprocket's own recommendation, and
  // that recommendation is a PARCEL courier even for an order filed as HL — on the
  // order that exposed this, `recommended_courier_company_id` was Blue Dart Air
  // while the Quick riders sat further down the same list. Assigning a parcel
  // courier to a hyperlocal shipment does not error: it returns HTTP 200 with no
  // AWB and no awb_assign_error, i.e. a shipment that looks booked and has no
  // rider. So for hyperlocal we name the courier ourselves.
  let courierId = cfg.courier_id;
  if (effectiveMode === "hyperlocal" && !courierId) {
    if (!srOrderId) {
      const msg =
        "Order created at Shiprocket, but we have no Shiprocket order id to look up a rider with. Assign a courier from the Shiprocket panel.";
      await persistShipment(orderId, { status: "created" as ShipmentStatus, last_error: msg });
      return { ok: false, message: msg };
    }
    const couriers = await listCouriersForOrder(order.partner_id, srOrderId);
    if (!couriers.ok) {
      const msg = `Order created at Shiprocket, but its courier list could not be read: ${couriers.message}`;
      await persistShipment(orderId, { status: "created" as ShipmentStatus, last_error: msg });
      return { ok: false, message: msg };
    }
    // Cheapest rider wins. A null rate sorts last rather than being treated as
    // free, so a courier that quoted nothing is never picked over one that did.
    const hyperlocal = couriers.data
      .filter((c) => c.isHyperlocal)
      .sort((a, b) => (a.rate ?? Infinity) - (b.rate ?? Infinity));
    if (hyperlocal.length === 0) {
      const msg =
        "Order created at Shiprocket, but no Shiprocket Quick rider serves this route right now. " +
        "It can be shipped from the Shiprocket panel, or retried later.";
      await persistShipment(orderId, { status: "created" as ShipmentStatus, last_error: msg });
      return { ok: false, message: msg };
    }
    courierId = hyperlocal[0].id;
    console.log(
      `[shiprocket] order=${orderId} hyperlocal courier ${hyperlocal[0].name} (${courierId}) at ${hyperlocal[0].rate ?? "?"}`,
    );
  }

  const awb = await assignAwb(order.partner_id, shipmentId, courierId);
  if (!awb.ok) {
    // A hyperlocal AWB is NOT issued synchronously. Shiprocket Quick answers the
    // assign with no AWB and parks the order at "SEARCHING FOR RIDER" (code 95)
    // until a rider actually accepts, which may be minutes later or never. That is
    // a live, unbilled dispatch — not the failure the empty response looks like.
    // Verified by polling a real order: status 95, cost 0.00, wallet untouched.
    if (effectiveMode === "hyperlocal" && srOrderId) {
      const upstream = await getOrderStatus(order.partner_id, srOrderId);
      if (upstream.ok && upstream.data.statusCode === 95) {
        const msg =
          "Sent to Shiprocket Quick — searching for a rider. The tracking number appears once one accepts; " +
          "nothing is charged until then.";
        await persistShipment(orderId, { status: "created" as ShipmentStatus, last_error: msg });
        return { ok: true, skipped: msg };
      }
    }
    const msg = `Order created at Shiprocket, but no courier could be assigned: ${awb.message}`;
    await persistShipment(orderId, { status: "created" as ShipmentStatus, last_error: msg });
    return { ok: false, message: msg };
  }

  // Same guard on the far side of the courier call: a cancel that lands between
  // the create and the AWB must not end with a rider on the way.
  const stillWantedAfterAwb = await persistShipmentUnlessCancelled(orderId, {
    status: "awb_assigned" as ShipmentStatus,
    awb_code: awb.data.awbCode,
    courier_name: awb.data.courierName,
    courier_company_id: awb.data.courierId,
    tracking_url: awb.data.awbCode ? `https://shiprocket.co/tracking/${awb.data.awbCode}` : null,
    last_error: null,
  });
  if (!stillWantedAfterAwb) {
    const undo = srOrderId ? await cancelShiprocketOrder(order.partner_id, srOrderId) : null;
    await persistShipment(orderId, {
      awb_code: awb.data.awbCode,
      courier_name: awb.data.courierName,
      last_error:
        undo && undo.ok
          ? `Order was cancelled while a courier was being assigned; the Shiprocket order was withdrawn (AWB ${awb.data.awbCode ?? "-"}).`
          : `Order was cancelled while a courier was being assigned, and withdrawing it at Shiprocket failed. AWB ${awb.data.awbCode ?? "-"} may still be live — cancel it in your Shiprocket panel.`,
    });
    console.warn(`[shiprocket] order=${orderId} cancelled after AWB; upstream undo ok=${undo?.ok}`);
    return { ok: true, skipped: "order was cancelled while a courier was being assigned" };
  }

  // Pickup + label are conveniences. Neither failing invalidates a shipment that
  // already has an AWB, so both are best-effort and never flip the row to failed.
  if (cfg.request_pickup) {
    const pickup = await requestPickup(order.partner_id, shipmentId);
    if (pickup.ok) {
      await persistShipment(orderId, { status: "pickup_requested" as ShipmentStatus });
    } else {
      console.warn(`[shiprocket] order=${orderId} pickup request failed: ${pickup.message}`);
    }
  }

  // Awaited, not fired-and-forgotten: a serverless invocation is finalized the
  // moment the action returns, so a detached promise here is routinely killed
  // mid-flight — and nothing else ever generates a label, so "Print label" would
  // simply never appear. Its failure is still harmless; the AWB already exists.
  try {
    const label = await generateLabel(order.partner_id, shipmentId);
    if (label.ok && label.data.labelUrl) {
      await persistShipment(orderId, { label_url: label.data.labelUrl });
    }
  } catch {
    /* the parcel is booked; a missing label is not worth failing the dispatch */
  }

  console.log(
    `[shiprocket] order=${orderId} shipped mode=${effectiveMode} kind=${claim.kind} awb=${awb.data.awbCode ?? "-"} courier=${awb.data.courierName ?? "-"}`,
  );

  return {
    ok: true,
    awb: awb.data.awbCode,
    courier: awb.data.courierName,
    shipmentId,
  };
}

/**
 * Auto-dispatch entry point for orderStore.updateOrderStatus.
 *
 * The trigger comparison happens HERE rather than in the client, because the
 * configured trigger lives beside the credentials in a server-only table and the
 * browser has no business reading that row.
 */
export async function dispatchShiprocketOnStatus(
  orderId: string,
  newStatus: string,
): Promise<DispatchResult> {
  if (!(await requireOrderActor(orderId))) return { ok: false, message: "Not authorized" };
  return dispatchShiprocket(orderId, { expectStatus: newStatus });
}

/** Manual "Ship now" from the dashboard. Bypasses only the auto/trigger checks. */
export async function shipOrderNow(orderId: string): Promise<DispatchResult> {
  if (!(await requireOrderActor(orderId))) return { ok: false, message: "Not authorized" };
  return dispatchShiprocket(orderId, { force: true });
}

// ── Public: read / cancel ──────────────────────────────────────────────────

/**
 * The shipment attached to an order, for the admin panel. No secrets — but it does
 * carry the AWB and the label URL, which are a customer's name and address on a
 * PDF, so it is scoped to the store that owns the order.
 */
export async function getShipmentForOrder(orderId: string): Promise<ShipmentView | null> {
  if (!(await requireOrderActor(orderId))) return null;
  return getShipmentRow(orderId);
}

/**
 * Cancel the Shiprocket shipment when ours is cancelled.
 *
 * Most cancels do NOT arrive here — the dashboard's cancel dialog goes through
 * cancelOrderAction, which calls cancelShipmentCore directly (it has already
 * authorized the actor, and a customer cancelling their own order cannot satisfy
 * requireOrderActor). This export covers the status-change path in orderStore.
 * See src/lib/shiprocket/shipments.ts for the behaviour itself.
 */
export async function cancelShiprocketShipment(orderId: string): Promise<DispatchResult> {
  if (!(await requireOrderActor(orderId))) return { ok: false, message: "Not authorized" };
  return cancelShipmentCore(orderId);
}

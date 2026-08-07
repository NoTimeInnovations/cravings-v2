import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { persistShipment } from "@/lib/shiprocket/shipments";
import { defaultStatusHistory, setStatusHistory } from "@/lib/statusHistory";
import type { ShipmentStatus } from "@/lib/shiprocket/types";

/* ──────────────────────────────────────────────────────────────
 * Shiprocket — inbound status webhook.
 *
 * Configured per merchant at app.shiprocket.in → Settings → API → Webhooks,
 * pointing at  https://<host>/api/webhook/parcel-status/<that store's token>.
 * Shiprocket POSTs every tracking transition here:
 * AWB assigned, picked up, in transit, out for delivery, delivered, RTO, cancelled.
 *
 * THE PATH IS "parcel-status" ON PURPOSE. Shiprocket's own webhook screen refuses
 * URLs containing "shiprocket", "kartrocket", "sr" or "kr", so the obvious name for
 * this route cannot be saved on their side. Do not rename it back.
 *
 * This is the ONLY way a hyperlocal shipment's AWB ever reaches us. Shiprocket
 * Quick does not return one from /courier/assign/awb — the order sits at
 * "SEARCHING FOR RIDER" and the AWB is issued when a rider accepts, minutes later
 * or never. Without this route the partner's panel shows a shipment that is
 * permanently courier-less even after the parcel has been delivered.
 *
 * SCOPING. EVERY STORE GETS ITS OWN URL, because Shiprocket's callback contains
 * nothing that identifies the sending account. With one shared token, any merchant
 * holding it could post an event for another merchant's order and march it to
 * completed — and our references (MT-<display_id>-<uuid prefix>) are guessable
 * enough to try. The token in the path names the partner, and partner_id then goes
 * into the shipment WHERE clause, so a callback can only ever reach its own store's
 * orders. Rotating one store's token affects only that store.
 *
 * ALWAYS 200. A non-2xx makes Shiprocket retry, and a retry of an event we simply
 * do not recognise is noise forever. Failures are logged, not signalled.
 * ────────────────────────────────────────────────────────────── */

/** Which store owns this webhook URL. The token IS the identity. */
const FIND_PARTNER_BY_TOKEN = `
  query PartnerByWebhookToken($token: jsonb!) {
    partner_shiprocket_credentials(where: { config: { _contains: $token } }, limit: 2) {
      partner_id
    }
  }
`;

// partner_id is part of the WHERE, not a check afterwards: it is what stops one
// merchant's callback from touching another merchant's order.
const FIND_SHIPMENT = `
  query FindShipmentForWebhook($partnerId: uuid!, $ref: String, $awb: String, $srOrderId: String) {
    shiprocket_shipments(
      where: {
        partner_id: { _eq: $partnerId },
        _or: [
          { sr_order_ref: { _eq: $ref } },
          { awb_code: { _eq: $awb } },
          { sr_order_id: { _eq: $srOrderId } }
        ]
      },
      limit: 1
    ) {
      order_id status awb_code sr_order_ref
    }
  }
`;

const ORDER_STATUS_HISTORY = `
  query OrderStatusForWebhook($id: uuid!) {
    orders_by_pk(id: $id) { id status status_history }
  }
`;

const SET_ORDER_STATUS = `
  mutation SetOrderStatusFromShiprocket($id: uuid!, $history: json!, $status: String!) {
    update_orders_by_pk(
      pk_columns: { id: $id },
      _set: { status_history: $history, status: $status }
    ) { id }
  }
`;

/**
 * Shiprocket's label → our shipment state, and whether the customer's order should
 * move with it.
 *
 * Matched on the LABEL rather than status_code: the numeric codes are undocumented
 * and we have only ever confirmed two of them by observation (5 = CANCELED,
 * 95 = SEARCHING FOR RIDER), whereas the labels are what Shiprocket shows in its
 * own panel. An unrecognised label deliberately returns nulls — we still record
 * the AWB and courier from the event, but we do not invent a state transition for
 * a string we do not understand.
 */
function mapStatus(label: string): {
  shipment: ShipmentStatus | null;
  order: "dispatched" | "completed" | null;
} {
  const s = label.toLowerCase();
  // RTO first: "RTO DELIVERED" contains "delivered" but means the exact opposite.
  if (s.includes("rto")) return { shipment: "rto", order: null };
  if (s.includes("cancel")) return { shipment: "cancelled", order: null };
  if (s.includes("delivered")) return { shipment: "delivered", order: "completed" };
  if (s.includes("out for delivery")) return { shipment: "out_for_delivery", order: "dispatched" };
  if (s.includes("in transit") || s.includes("picked up") || s.includes("shipped")) {
    return { shipment: "in_transit", order: "dispatched" };
  }
  if (s.includes("searching for rider")) return { shipment: "created", order: null };
  if (s.includes("pickup") || s.includes("awb") || s.includes("rider assigned")) {
    return { shipment: "awb_assigned", order: null };
  }
  // Undelivered / lost / damaged / on hold: real, but not states this table models.
  // The raw label lands in meta and last_error so the partner can see it.
  return { shipment: null, order: null };
}

/**
 * Resolve the store from the token in the URL, or null.
 *
 * A token that matches nothing gets null and a 401 — there is no "unset means
 * allow" mode here, because the token is not an optional extra check, it is the
 * only thing that says whose orders this caller may touch.
 */
async function partnerForToken(token: string): Promise<string | null> {
  if (!token || token.length < 16) return null;
  try {
    const data = await fetchFromHasuraServer(FIND_PARTNER_BY_TOKEN, {
      token: { webhook_token: token },
    });
    const rows = (data as any)?.partner_shiprocket_credentials ?? [];
    // Two stores on one token should be impossible; if it ever happens, refuse
    // rather than guess which merchant's orders to write.
    if (rows.length !== 1) return null;
    return rows[0]?.partner_id ?? null;
  } catch (e) {
    console.warn("[shiprocket-webhook] token lookup failed", (e as Error)?.message);
    return null;
  }
}

/**
 * Shiprocket's form also sends the token as a header. When it is present it must
 * agree with the one in the path — a mismatch means the merchant pasted two
 * different values and their setup is not what they think it is. Absent is fine:
 * the path already authenticated the call.
 */
function headerAgrees(req: NextRequest, token: string): boolean {
  const got = req.headers.get("x-api-key");
  if (!got) return true;
  const a = Buffer.from(got);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// A value no column can hold, for the identifier fields an event omits. It must
// not be empty string (which can match a blank column) and must not be NUL,
// which Postgres rejects outright inside a text comparison.
const NO_MATCH = "__no_match__";

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const partnerId = await partnerForToken(token);
  if (!partnerId) {
    console.warn("[shiprocket-webhook] rejected: unknown webhook token");
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!headerAgrees(req, token)) {
    console.warn(`[shiprocket-webhook] partner=${partnerId} rejected: x-api-key does not match the URL token`);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, ignored: "unparseable body" });
  }

  // Shiprocket has sent both a bare object and an array of events depending on the
  // account; treat one as a list of one rather than guessing which we are on.
  const events: any[] = Array.isArray(body) ? body : [body];
  for (const e of events) {
    try {
      await handleEvent(e, partnerId);
    } catch (err) {
      console.warn("[shiprocket-webhook] event failed:", (err as Error)?.message);
    }
  }
  return NextResponse.json({ ok: true });
}

async function handleEvent(e: any, partnerId: string): Promise<void> {
  // Field names per Shiprocket's published sample payload:
  //   https://kr-multichannel.s3.ap-southeast-1.amazonaws.com/webhook/docs/sample.json
  //
  // `awb` arrives as a NUMBER there (59629792084), not a string — str() normalises
  // it, and it must stay a string or it will never match the text column.
  const awb = str(e?.awb) ?? str(e?.awb_code);
  // THE TWO ID FIELDS ARE EASY TO SWAP, AND SWAPPING THEM BREAKS HYPERLOCAL.
  //   order_id         = SHIPROCKET's own order id  -> our sr_order_id
  //   channel_order_id = the reference WE sent      -> our sr_order_ref
  // Matching on the reference is not optional: a Quick shipment's first event is
  // the one that finally brings the AWB, so at that moment the AWB is a value we
  // have never seen and cannot look up by.
  const ref = str(e?.channel_order_id) ?? str(e?.client_order_id);
  const srOrderId = str(e?.order_id) ?? str(e?.sr_order_id);
  // Title case in the sample ("Delivered"); mapStatus lowercases before matching.
  const label = str(e?.current_status) ?? str(e?.shipment_status) ?? str(e?.status) ?? "";
  const courier = str(e?.courier_name) ?? str(e?.courier);
  // Freshest scan line ("SHIPMENT OUT FOR DELIVERY", "PATIALA") — the human detail
  // behind the status, kept in meta for the panel and for diagnosing odd events.
  const scan = Array.isArray(e?.scans) && e.scans.length ? e.scans[0] : null;

  if (!awb && !ref && !srOrderId) {
    console.warn("[shiprocket-webhook] event with no identifier, ignored");
    return;
  }

  const found = await fetchFromHasuraServer(FIND_SHIPMENT, {
    partnerId,
    ref: ref ?? NO_MATCH,
    awb: awb ?? NO_MATCH,
    srOrderId: srOrderId ?? NO_MATCH,
  });
  const row = (found as any)?.shiprocket_shipments?.[0];
  if (!row) {
    // Not ours: another integration on the same Shiprocket account, or an order
    // created before this feature existed. Not an error.
    console.log(`[shiprocket-webhook] no shipment for ref=${ref} awb=${awb} — ignored`);
    return;
  }

  const mapped = mapStatus(label);
  const patch: Record<string, unknown> = {};
  // The AWB is the whole point of this route for hyperlocal — record it whatever
  // the status says, but never blank one we already hold.
  if (awb) patch.awb_code = awb;
  if (courier) patch.courier_name = courier;
  if (awb) patch.tracking_url = `https://shiprocket.co/tracking/${awb}`;
  if (mapped.shipment) patch.status = mapped.shipment;
  if (label) {
    patch.meta = {
      last_webhook_status: label,
      last_webhook_at: new Date().toISOString(),
      ...(scan ? { last_scan: { activity: scan.activity ?? null, location: scan.location ?? null, date: scan.date ?? null } } : {}),
    };
    // An unmapped label is worth surfacing (UNDELIVERED, LOST, ON HOLD all land
    // here) rather than being swallowed as an unchanged row.
    if (!mapped.shipment) patch.last_error = `Shiprocket: ${label}`;
    else if (mapped.shipment !== "rto") patch.last_error = null;
  }

  if (Object.keys(patch).length > 0) {
    await persistShipment(row.order_id, patch);
  }
  console.log(
    `[shiprocket-webhook] order=${row.order_id} "${label}" -> ${mapped.shipment ?? "(no state change)"} awb=${awb ?? "-"}`,
  );

  if (mapped.order) {
    await mirrorOrderStatus(row.order_id, mapped.order);
  }
}

/**
 * Move the customer-facing order alongside the parcel.
 *
 * Writes status_history as well as status, because status_history is what the
 * order UIs actually read — setting `status` alone leaves the tracking page
 * showing an order that never progressed. Mirrors what orderStore does by hand.
 */
async function mirrorOrderStatus(orderId: string, next: "dispatched" | "completed"): Promise<void> {
  const data = await fetchFromHasuraServer(ORDER_STATUS_HISTORY, { id: orderId });
  const order = (data as any)?.orders_by_pk;
  if (!order) return;
  // Never walk an order backwards: a late "in transit" event arriving after the
  // partner already completed the order must not un-complete it.
  if (order.status === "completed" || order.status === "cancelled") return;
  if (next === "dispatched" && order.status === "dispatched") return;

  let history = order.status_history || defaultStatusHistory;
  // Reaching a stage implies the ones before it — an order that goes straight to
  // delivered was accepted and dispatched too, and a half-filled history renders
  // as a stalled timeline.
  history = setStatusHistory(history, "accepted", { isCompleted: true });
  history = setStatusHistory(history, "dispatched", { isCompleted: true });
  if (next === "completed") history = setStatusHistory(history, "completed", { isCompleted: true });

  await fetchFromHasuraServer(SET_ORDER_STATUS, { id: orderId, history, status: next });
  console.log(`[shiprocket-webhook] order=${orderId} status -> ${next}`);
}

// Shiprocket pings the URL when it is saved. Answer only for a real token, so the
// endpoint cannot be used to discover whether the path exists.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const partnerId = await partnerForToken(token);
  if (!partnerId) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, service: "parcel-status-webhook" });
}

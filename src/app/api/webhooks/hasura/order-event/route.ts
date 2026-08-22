import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { sendOrderWebhook } from "@/app/actions/sendOrderWebhook";
import {
  dispatchViaDeliveryBridge,
  scheduleDelayedDispatch,
} from "@/app/actions/porterBridge";
import { dispatchDeliveryPool } from "@/app/actions/deliveryPoolDispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Hasura event trigger → the partner's order.created webhook.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * order.created used to be fired from ONE line in the browser
 * (orderStore.ts, `void sendOrderWebhook(orderId)`), which meant:
 *
 *   - POS, the captain app, the public API and every admin-side creation path
 *     sent nothing at all, because none of them run that line;
 *   - online orders fired at INSERT, while the row was still `pending_payment`
 *     and unpaid, and then nothing when payment actually landed — so the POS
 *     could not tell a real order from an abandoned checkout;
 *   - the call was un-awaited from a device that may lose network or be closed,
 *     with one attempt, no retry and no record.
 *
 * Hooking the DATABASE instead means every path is covered by construction: an
 * order exists, therefore the event fires. Hasura owns the retries.
 *
 * ── What counts as "created" ─────────────────────────────────────────────────
 *
 * The moment the order becomes REAL to the restaurant, which is not always the
 * insert:
 *   - cash / COD  → inserted straight into a live status. Fire on INSERT.
 *   - online      → inserted as `pending_payment`; it becomes real when payment
 *                   confirms and finalizeCfOrder moves it off that status.
 *                   Fire on that UPDATE, not on the insert.
 * An order abandoned at `pending_payment` and later `expired` therefore never
 * produces an order.created at all, which is the correct answer.
 */

/** Statuses that mean "not a real order yet". */
const NOT_YET_REAL = new Set(["pending_payment", "expired", "draft"]);

type HasuraEventBody = {
  event?: {
    op?: "INSERT" | "UPDATE" | "DELETE" | "MANUAL";
    data?: { old?: Record<string, unknown> | null; new?: Record<string, unknown> | null };
  };
  table?: { name?: string };
  id?: string;
};

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

/**
 * Auto-accept, for partners who have opted in.
 *
 * Lives HERE, in the database event, rather than at the point of sale for the
 * same reason order.created does: the browser is only one of the ways an order
 * comes into being. POS, the captain app and the public API all insert orders
 * too, and none of them run the checkout code. Hooking the row means every path
 * is covered by construction, and Hasura owns the retries.
 *
 * It also lands on the right MOMENT for free. An online order is inserted as
 * `pending_payment`, and auto-accepting it there would accept an order nobody
 * has paid for; this runs on the transition that makes the order real, so cash
 * accepts at insert and online accepts when payment confirms.
 *
 * Only `pending` is touched. An order that arrived in any other live status was
 * put there deliberately — a POS sale rung up as completed must not be dragged
 * backwards to accepted.
 *
 * Idempotent by construction: the update is conditional on the row still being
 * `pending`, so a Hasura retry (or two racers finalizing the same online order)
 * changes nothing the second time. It also cannot loop — flipping pending →
 * accepted is an UPDATE whose OLD status is not in NOT_YET_REAL, so `fire` is
 * false for it and this route stops there.
 */
async function maybeAutoAccept(
  orderId: string,
  partnerId: string,
  status: string,
): Promise<{ accepted: boolean; rules: Record<string, unknown> }> {
  const none = { accepted: false, rules: {} as Record<string, unknown> };
  if (!partnerId || status !== "pending") return none;
  try {
    const p: any = await fetchFromHasuraServer(
      `query AutoAcceptFlag($id: uuid!) {
         partners_by_pk(id: $id) { delivery_rules }
       }`,
      { id: partnerId },
    );
    const rules = p?.partners_by_pk?.delivery_rules;
    const on =
      rules && typeof rules === "object"
        ? !!(rules as Record<string, unknown>).auto_accept_orders
        : false;
    if (!on) return none;

    const res: any = await fetchFromHasuraServer(
      `mutation AutoAccept($id: uuid!) {
         update_orders(
           where: { id: { _eq: $id }, status: { _eq: "pending" } }
           _set: { status: "accepted" }
         ) { affected_rows }
       }`,
      { id: orderId },
    );
    return {
      accepted: (res?.update_orders?.affected_rows ?? 0) > 0,
      rules: rules as Record<string, unknown>,
    };
  } catch (e) {
    // Never fail the event over this. A partner who does not get an auto-accept
    // is left with an order to accept by hand, which is the pre-existing
    // behaviour; failing here would make Hasura retry and re-send order.created.
    console.warn("[order-event] auto-accept failed:", e);
    return none;
  }
}

/**
 * The consequences of accepting, for an accept that no device made.
 *
 * Accepting an order is not just a status: it books the rider. All of that
 * hangs off updateOrderStatus in the order store, which by definition only runs
 * when a DEVICE changed the status — so an auto-accepted order was reaching
 * `accepted` with none of it firing. The visible symptom was a missing dispatch
 * countdown; the real one was that no rider was ever booked.
 *
 * Both entry points below re-read the order and gate themselves — the bridge on
 * the partner's own bridge config and drop coordinates, the pool on
 * feature_flags — so calling them for an order that wants neither is a cheap
 * refusal rather than something this route has to predict.
 *
 * Fire-and-forget, like the client does. A dispatch that fails must not fail the
 * event: Hasura would retry it and re-send order.created.
 */
function dispatchAfterAutoAccept(orderId: string, rules: Record<string, unknown>) {
  // Porter / Rapido bridge. Mirrors the trigger logic in orderStore: auto-book
  // defaults ON, the trigger status is a partner choice, and a delay defers the
  // booking by stamping porter_dispatch_due_at for the dispatch-due cron — which
  // is also what the countdown in the order page reads.
  const autoBook = rules.porter_auto_dispatch !== false;
  const trigger =
    rules.porter_dispatch_trigger === "food_ready" ? "food_ready" : "accepted";
  const delayMin = Math.max(
    0,
    Math.min(120, Number(rules.porter_dispatch_delay_min) || 0),
  );
  if (autoBook && trigger === "accepted") {
    const book =
      delayMin > 0
        ? scheduleDelayedDispatch(orderId, delayMin)
        : dispatchViaDeliveryBridge(orderId);
    void book
      .then((r: { ok: boolean; message?: string }) => {
        if (!r.ok) console.warn(`[auto-accept] bridge dispatch: ${r.message}`);
      })
      .catch((e) => console.warn("[auto-accept] bridge dispatch threw:", e));
  }

  // Menuthere delivery pool — independent network, same accept trigger.
  void dispatchDeliveryPool(orderId)
    .then((r: { ok: boolean; message?: string }) => {
      if (!r.ok) console.warn(`[auto-accept] pool dispatch: ${r.message}`);
    })
    .catch((e) => console.warn("[auto-accept] pool dispatch threw:", e));
}

export async function POST(req: NextRequest) {
  // Shared secret: without it this route is an open "send a webhook" endpoint,
  // and it runs with the admin secret behind it.
  const expected = process.env.HASURA_EVENT_SECRET;
  if (!expected) {
    console.error("[order-event] HASURA_EVENT_SECRET is not set — refusing");
    return unauthorized();
  }
  if (req.headers.get("x-hasura-event-secret") !== expected) return unauthorized();

  let body: HasuraEventBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const op = body?.event?.op;
  const before = body?.event?.data?.old ?? null;
  const after = body?.event?.data?.new ?? null;
  const orderId = (after?.id as string) || "";
  if (!orderId) return NextResponse.json({ ok: true, skipped: "no order id" });

  const newStatus = String(after?.status ?? "");
  const oldStatus = before ? String(before.status ?? "") : "";

  // Is this the transition that makes the order real?
  let fire = false;
  if (op === "INSERT" || op === "MANUAL") {
    fire = !NOT_YET_REAL.has(newStatus);
  } else if (op === "UPDATE") {
    fire = NOT_YET_REAL.has(oldStatus) && !NOT_YET_REAL.has(newStatus);
  }
  if (!fire) {
    return NextResponse.json({ ok: true, skipped: `${op} ${oldStatus || "-"}->${newStatus}` });
  }

  // Idempotency. Hasura retries on any non-2xx, and the same order can also be
  // finalized by more than one racer (the customer returning, the Cashfree
  // webhook, the reconcile cron). deliveryId is stable per order, so one
  // successful row means this event is already out and must not be repeated.
  try {
    const seen: any = await fetchFromHasuraServer(
      `query AlreadySent($d: String!) {
         webhook_deliveries(where: { delivery_id: { _eq: $d }, ok: { _eq: true } }, limit: 1) { id }
       }`,
      { d: `order.created:${orderId}` },
    );
    if (seen?.webhook_deliveries?.length) {
      return NextResponse.json({ ok: true, skipped: "already delivered" });
    }
  } catch {
    /* if the check fails, prefer sending twice over never sending — the
       envelope id lets a conforming receiver de-duplicate */
  }

  // Auto-accept BEFORE the webhook. sendOrderWebhook re-reads the order, so
  // doing it in this order means the single order.created the partner receives
  // already carries `accepted` — rather than announcing `pending` and never
  // following up, since nothing server-side sends a status webhook.
  const auto = await maybeAutoAccept(
    orderId,
    String(after?.partner_id ?? ""),
    newStatus,
  );
  // Accepting books the rider. Only on a real transition — the update is
  // conditional on `pending`, so a retry reports false and cannot double-book.
  if (auto.accepted) dispatchAfterAutoAccept(orderId, auto.rules);
  const autoAccepted = auto.accepted;

  // sendOrderWebhook re-reads the order from Hasura, so the payload always
  // reflects what was STORED (real invoice number, post-loyalty total), not the
  // half-built row that happened to trigger this event.
  const result = await sendOrderWebhook(orderId);
  return NextResponse.json({
    ok: true,
    delivered: result.ok,
    autoAccepted,
    detail: result.error ?? null,
  });
}

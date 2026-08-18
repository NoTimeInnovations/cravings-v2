import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { sendOrderWebhook } from "@/app/actions/sendOrderWebhook";

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

  // sendOrderWebhook re-reads the order from Hasura, so the payload always
  // reflects what was STORED (real invoice number, post-loyalty total), not the
  // half-built row that happened to trigger this event.
  const result = await sendOrderWebhook(orderId);
  return NextResponse.json({ ok: true, delivered: result.ok, detail: result.error ?? null });
}

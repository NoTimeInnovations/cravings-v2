import { NextRequest, NextResponse } from "next/server";
import {
  authenticate,
  requireScope,
  checkRateLimit,
  clientIp,
  logRequest,
  apiError,
} from "@/lib/publicApi/gate";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { sendOrderStatusWebhook } from "@/app/actions/sendPartnerWebhook";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PATH = "/api/v1/orders/{id}/status";

/**
 * POST /api/v1/orders/{id}/status
 *
 * Lets a partner's own POS drive an order's status, so the webhook is a two-way
 * integration rather than a read-only feed: we tell them an order arrived, they
 * tell us when the kitchen accepted it and when it went out.
 *
 * Auth: Authorization: Bearer <api_key>, scope "orders".
 * Body: { "status": "accepted" }
 *
 * The order is re-checked against the KEY's partner_id, never a partner_id in
 * the body — otherwise any partner could move another restaurant's orders by
 * guessing a uuid. The gate already binds the key to one partner; this makes the
 * object-level check explicit rather than implied.
 */

// The states a partner may set. Deliberately excludes anything that has money or
// stock consequences we would have to unwind:
//   - "cancelled" triggers restock + loyalty refund + 3PL cancellation, so it
//     gets its own endpoint rather than riding in on a status string.
//   - "pending_payment" is owned by the payment gateway callbacks.
const ALLOWED = new Set(["accepted", "food_ready", "dispatched", "in_transit", "completed"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await authenticate(req);
  if ("res" in authed) return authed.res;
  const auth = authed.auth;
  const ip = clientIp(req);
  const log = (status: number) =>
    logRequest({ keyId: auth.keyId, partnerId: auth.partnerId, method: "POST", path: PATH, status, ip });

  const scopeErr = requireScope(auth, "orders");
  if (scopeErr) {
    log(403);
    return scopeErr;
  }

  const rl = await checkRateLimit(auth);
  if (rl) {
    log(429);
    return rl;
  }

  const { id: orderId } = await params;
  if (!orderId) {
    log(400);
    return apiError(400, "missing_order_id", "Provide the order id in the path.");
  }

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    log(400);
    return apiError(400, "invalid_json", "The request body must be JSON.");
  }

  const status = String(body?.status ?? "").trim().toLowerCase();
  if (!status) {
    log(400);
    return apiError(400, "missing_status", "Provide a 'status' in the body.");
  }
  if (!ALLOWED.has(status)) {
    log(400);
    return apiError(
      400,
      "unsupported_status",
      `'${status}' cannot be set through this endpoint. Allowed: ${[...ALLOWED].join(", ")}.`,
    );
  }

  // Read the order FIRST, scoped to this key's partner. A 404 for someone
  // else's order — rather than a 403 — avoids confirming that the id exists.
  let existing: { id: string; status: string | null } | undefined;
  try {
    const data: any = await fetchFromHasuraServer(
      `query OrderForApi($id: uuid!, $p: uuid!) {
        orders(where: { id: { _eq: $id }, partner_id: { _eq: $p } }, limit: 1) {
          id
          status
        }
      }`,
      { id: orderId, p: auth.partnerId },
    );
    existing = data?.orders?.[0];
  } catch {
    log(503);
    return apiError(503, "lookup_failed", "Could not read the order. Try again.");
  }

  if (!existing) {
    log(404);
    return apiError(404, "order_not_found", "No order with that id belongs to this account.");
  }

  // Already there — succeed without writing, so a POS that retries a delivery it
  // is unsure about does not generate a second status event downstream.
  if (existing.status === status) {
    log(200);
    return NextResponse.json({ ok: true, order_id: orderId, status, changed: false });
  }

  try {
    const res: any = await fetchFromHasuraServer(
      `mutation SetOrderStatus($id: uuid!, $p: uuid!, $s: String!) {
        update_orders(where: { id: { _eq: $id }, partner_id: { _eq: $p } }, _set: { status: $s }) {
          affected_rows
        }
      }`,
      { id: orderId, p: auth.partnerId, s: status },
    );
    if (!res?.update_orders?.affected_rows) {
      log(404);
      return apiError(404, "order_not_found", "No order with that id belongs to this account.");
    }
  } catch {
    log(503);
    return apiError(503, "update_failed", "Could not update the order. Try again.");
  }

  // Echo the change back out as a webhook so a partner running more than one
  // system (POS + a tablet, say) sees it everywhere, not only where it was made.
  try {
    void sendOrderStatusWebhook(orderId, status, existing.status ?? null);
  } catch {
    /* the caller's own change must not fail because their endpoint is down */
  }

  log(200);
  return NextResponse.json({
    ok: true,
    order_id: orderId,
    previous_status: existing.status ?? null,
    status,
    changed: true,
  });
}

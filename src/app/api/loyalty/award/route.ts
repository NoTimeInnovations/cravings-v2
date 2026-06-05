import { NextRequest, NextResponse } from "next/server";
import { awardLoyaltyForOrder } from "@/app/actions/loyalty";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Loyalty earn webhook — an OPTIONAL bulletproof backstop to the in-app hooks in
 * orderStore/posStore. Wire a Hasura event trigger on `orders` (UPDATE) to POST here
 * so points are awarded the instant any path marks an order completed — even a direct
 * DB update or a path we don't yet cover.
 *
 * Auth: send `Authorization: Bearer <CRON_SECRET>` (configure the same secret as the
 * trigger header). If CRON_SECRET is unset we allow (so it works before configuration).
 *
 * Accepts either:
 *   - a Hasura event payload: { event: { data: { new: { id, status } } } }
 *   - a plain body: { orderId: "<uuid>" }
 *
 * awardLoyaltyForOrder is idempotent and self-gating, so duplicate/irrelevant calls
 * are harmless no-ops.
 */
async function handle(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const newRow = body?.event?.data?.new;
  const orderId: string | undefined = newRow?.id || body?.orderId || body?.order_id;
  if (!orderId) {
    return NextResponse.json({ error: "no order id" }, { status: 400 });
  }

  // If this came from an event trigger, only act on the completed transition.
  if (newRow && newRow.status && newRow.status !== "completed") {
    return NextResponse.json({ ok: true, skipped: "not completed" });
  }

  const result = await awardLoyaltyForOrder(orderId);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

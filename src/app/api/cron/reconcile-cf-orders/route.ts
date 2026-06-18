import { NextRequest, NextResponse } from "next/server";
import {
  getStalePendingCfOrders,
  finalizeCfOrder,
} from "@/app/actions/cfOrders";
import { verifyCashfreePayment } from "@/app/actions/cashfree";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Backstop reconciler for online (Cashfree) orders stuck in pending_payment.
// Runs on a Vercel cron. For each order whose payment never finalized (missed
// webhook, customer never returned), it asks Cashfree for the current status:
//   - PAID   -> finalizeCfOrder (mark paid, push to Petpooja, notify)
//   - unpaid -> left as a draft. Drafts are NO LONGER auto-expired here;
//               partners clear them manually from the Draft Orders view.
// This guarantees no paid order is ever lost even if both the webhook and the
// client-return path fail.

const PENDING_MIN = 2; // only evaluate orders at least this old (avoid racing checkout)

export async function GET(req: NextRequest) {
  // Protect the endpoint. Vercel cron can be configured to send
  // `Authorization: Bearer <CRON_SECRET>`; if CRON_SECRET is unset we allow
  // (so it still works before the secret is configured).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = Date.now();
  const before = new Date(now - PENDING_MIN * 60_000).toISOString();

  let orders: Awaited<ReturnType<typeof getStalePendingCfOrders>> = [];
  try {
    orders = await getStalePendingCfOrders(before);
  } catch (e: any) {
    console.error("[reconcile-cf-orders] failed to list pending orders:", e?.message || e);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  const summary = { scanned: orders.length, finalized: 0, expired: 0, stillPending: 0, errors: 0 };

  for (const o of orders) {
    try {
      const verify = await verifyCashfreePayment(o.partner_id, o.cashfree_order_id, { quick: true });
      if (verify.success && verify.paid) {
        const fin = await finalizeCfOrder(o.id, verify.cfPaymentId || null);
        if (fin.ok) summary.finalized++;
        else summary.errors++;
        continue;
      }

      // Not paid yet — leave it as a draft. Drafts are no longer auto-expired;
      // partners clear them manually from the Draft Orders view.
      summary.stillPending++;
    } catch (e: any) {
      console.error(`[reconcile-cf-orders] error on order=${o.id}:`, e?.message || e);
      summary.errors++;
    }
  }

  console.log("[reconcile-cf-orders]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}

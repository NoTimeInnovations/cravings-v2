import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { AUTO_PROGRESS_PARTNER_IDS } from "@/lib/demoPartner";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Demo-only: automatically walk a test partner's orders through the lifecycle
// (Accepted → Food ready → Dispatched → Completed) — one step per tick — when
// they've enabled "Auto-progress orders (demo)". Each status UPDATE fires the
// existing Hasura order-event trigger, so the customer WhatsApp notifications
// flow just like a real staff-driven progression. Scoped to AUTO_PROGRESS_PARTNER_IDS.

const NEXT: Record<string, string> = {
  pending: "accepted",
  accepted: "food_ready",
  food_ready: "dispatched",
  dispatched: "completed",
};

const Q_PARTNERS = `
  query AutoProgressPartners($ids: [uuid!]!) {
    partners(where: { id: { _in: $ids } }) { id storefront_settings }
  }
`;

// Only recent orders (last 6h) so flipping the toggle on can't resurrect a pile
// of old test orders.
const Q_ORDERS = `
  query AutoProgressOrders($pid: uuid!, $statuses: [String!]!, $since: timestamptz!) {
    orders(
      where: { partner_id: { _eq: $pid }, status: { _in: $statuses }, created_at: { _gt: $since } }
      order_by: { created_at: asc }
      limit: 200
    ) { id status }
  }
`;

const M_ADVANCE = `
  mutation AdvanceOrder($id: uuid!, $status: String!) {
    update_orders_by_pk(pk_columns: { id: $id }, _set: { status: $status }) { id }
  }
`;

function autoProgressOn(sfRaw: any): boolean {
  try {
    const sf = typeof sfRaw === "string" ? JSON.parse(sfRaw) : sfRaw;
    return !!sf?.autoProgressOrders;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!AUTO_PROGRESS_PARTNER_IDS.length) {
    return NextResponse.json({ ok: true, partners: 0, advanced: 0 });
  }

  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const summary = { partners: 0, advanced: 0 };

  try {
    const pres = await fetchFromHasuraServer(Q_PARTNERS, { ids: AUTO_PROGRESS_PARTNER_IDS });
    const partners = (pres?.partners || []) as Array<{ id: string; storefront_settings: any }>;

    for (const p of partners) {
      if (!autoProgressOn(p.storefront_settings)) continue;
      summary.partners++;

      const ores = await fetchFromHasuraServer(Q_ORDERS, {
        pid: p.id,
        statuses: Object.keys(NEXT),
        since,
      });
      const orders = (ores?.orders || []) as Array<{ id: string; status: string }>;

      for (const o of orders) {
        const next = NEXT[o.status];
        if (!next) continue;
        await fetchFromHasuraServer(M_ADVANCE, { id: o.id, status: next }).catch((e) =>
          console.error("[auto-progress-orders] advance failed", o.id, e?.message || e),
        );
        summary.advanced++;
      }
    }
  } catch (e: any) {
    console.error("[auto-progress-orders]", e?.message || e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  console.log("[auto-progress-orders]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}

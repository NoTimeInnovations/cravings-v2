import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { AUTO_PROGRESS_PARTNER_IDS } from "@/lib/demoPartner";

export const dynamic = "force-dynamic";
// One invocation runs a few passes 20s apart (see PASSES/GAP_MS), so it needs
// to stay alive longer than the passes take.
export const maxDuration = 70;

// Demo-only: automatically walk a test partner's orders through the lifecycle
// (Accepted → Food ready → Dispatched → Completed) when they've enabled
// "Auto-progress orders (demo)". Each status UPDATE fires the existing Hasura
// order-event trigger, so the customer WhatsApp notifications flow just like a
// real staff-driven progression. Scoped to AUTO_PROGRESS_PARTNER_IDS.
//
// Cadence: Vercel cron can't fire faster than once a minute, so each invocation
// makes 3 passes 20s apart (at 0s/20s/40s). Combined with the every-minute
// schedule that lands a pass every 20 seconds continuously — one status step
// per order every ~20s.

const NEXT: Record<string, string> = {
  pending: "accepted",
  accepted: "food_ready",
  food_ready: "dispatched",
  dispatched: "completed",
};

const PASSES = 3; // passes per invocation
const GAP_MS = 20_000; // 20s between passes
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

// One pass: advance every active order of every enabled partner by one step.
async function runPass(enabledPartnerIds: string[], sinceIso: string): Promise<number> {
  let advanced = 0;
  for (const pid of enabledPartnerIds) {
    const ores = await fetchFromHasuraServer(Q_ORDERS, {
      pid,
      statuses: Object.keys(NEXT),
      since: sinceIso,
    });
    const orders = (ores?.orders || []) as Array<{ id: string; status: string }>;
    for (const o of orders) {
      const next = NEXT[o.status];
      if (!next) continue;
      await fetchFromHasuraServer(M_ADVANCE, { id: o.id, status: next }).catch((e) =>
        console.error("[auto-progress-orders] advance failed", o.id, e?.message || e),
      );
      advanced++;
    }
  }
  return advanced;
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

  const sinceIso = new Date(Date.now() - 6 * 3600 * 1000).toISOString();

  // Resolve which allow-listed partners have the toggle on (once per invocation).
  let enabled: string[] = [];
  try {
    const pres = await fetchFromHasuraServer(Q_PARTNERS, { ids: AUTO_PROGRESS_PARTNER_IDS });
    enabled = ((pres?.partners || []) as Array<{ id: string; storefront_settings: any }>)
      .filter((p) => autoProgressOn(p.storefront_settings))
      .map((p) => p.id);
  } catch (e: any) {
    console.error("[auto-progress-orders] partners query failed", e?.message || e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  if (!enabled.length) {
    return NextResponse.json({ ok: true, partners: 0, advanced: 0 });
  }

  let advanced = 0;
  for (let i = 0; i < PASSES; i++) {
    advanced += await runPass(enabled, sinceIso);
    if (i < PASSES - 1) await sleep(GAP_MS);
  }

  console.log("[auto-progress-orders]", JSON.stringify({ partners: enabled.length, passes: PASSES, advanced }));
  return NextResponse.json({ ok: true, partners: enabled.length, passes: PASSES, advanced });
}

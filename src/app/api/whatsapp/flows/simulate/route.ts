import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { extractTriggers } from "@/lib/whatsappFlow/validate";
import {
  buildMessageRunVars,
  simulateFlow,
  type PartnerInfo,
} from "@/lib/whatsappFlow/engine";
import type { FlowGraph, TriggerDef } from "@/lib/whatsappFlow/types";

// POST /api/whatsapp/flows/simulate
// Body: { partnerId, graph }
// Dry-runs the flow's highest-priority trigger against the partner's LIVE
// situation (shop open/closed, delivery/takeaway windows) — or sample order /
// loyalty data for event triggers — and returns the messages a customer would
// receive right now. Powers the builder's "Test this flow" button. Never sends
// anything or writes to the DB.

// Mirror the engine's Q_PARTNER_INFO so message-run variables (incl. the
// catalogue thumbnail from the sibling menu selection) resolve the same way.
const Q_PARTNER = `
  query SimPartner($id: uuid!) {
    partners_by_pk(id: $id) {
      store_name username currency country_code custom_domain delivery_rules timezone wa_catalog_id is_shop_open
    }
    menu(
      where: {
        partner_id: { _eq: $id }
        deletion_status: { _eq: 0 }
        is_available: { _eq: true }
        wa_catalog_synced_at: { _is_null: false }
        wa_catalog_excluded: { _eq: false }
        image_url: { _is_null: false }
      }
      order_by: { priority: asc }
      limit: 1
    ) { id }
  }
`;

const ORDER_STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  accepted: "Accepted",
  food_ready: "Food ready",
  dispatched: "Dispatched",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Representative order variables so an order-triggered flow can be previewed
// without a real order. store_name / currency come from the partner.
function sampleOrderVars(
  partner: PartnerInfo,
  status: string,
): Record<string, unknown> {
  const cur = partner.currency || "₹";
  const site = partner.username ? `https://menuthere.com/${partner.username}` : "https://menuthere.com";
  return {
    store_name: partner.store_name || "your store",
    order_id: "TEST1234",
    order_status: ORDER_STATUS_LABELS[status] || status || "updated",
    customer_name: "Rahul",
    items: `1. Veg Meals × 2 — ${cur}240\n2. Payasam × 1 — ${cur}60`,
    subtotal: `${cur}300`,
    gst: `${cur}0`,
    charges: `${cur}0`,
    discount: `${cur}0`,
    total: `${cur}300`,
    bill: `Veg Meals × 2 — ${cur}240\nPayasam × 1 — ${cur}60\nTotal: ${cur}300`,
    order_url: `${site}/order/TEST1234`,
    review_url: `${site}?review=TEST1234`,
    driver_name: "Suresh",
    driver_phone: "9876543210",
    driver_details: "Suresh · 9876543210",
    tracking_url: `${site}/track/TEST1234`,
    order_type: "delivery",
    currency: cur,
  };
}

// Representative loyalty variables for previewing a loyalty-triggered flow.
function sampleLoyaltyVars(
  partner: PartnerInfo,
  event: string,
): Record<string, unknown> {
  const cur = partner.currency || "₹";
  const earned = event === "redeemed";
  return {
    store_name: partner.store_name || "your store",
    customer_name: "Rahul",
    points: earned ? "50" : "30",
    points_value: earned ? `${cur}50` : `${cur}30`,
    points_balance: "120",
    balance_value: `${cur}120`,
    lifetime_earned: "450",
    order_id: "TEST1234",
    currency: cur,
  };
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const partnerId = String(body?.partnerId || "");
  const graph = body?.graph as FlowGraph | undefined;
  if (!partnerId || !graph || typeof graph !== "object") {
    return NextResponse.json({ error: "Missing partnerId or graph" }, { status: 400 });
  }

  // Pick the trigger to start from: caller-supplied node id, else the
  // highest-priority (lowest number) trigger in the graph.
  const triggers = extractTriggers(graph);
  if (!triggers.length) {
    return NextResponse.json(
      { error: "This flow has no trigger step yet — add one to test it." },
      { status: 400 },
    );
  }
  const chosen: TriggerDef =
    (body?.triggerNodeId &&
      triggers.find((t) => t.nodeId === body.triggerNodeId)) ||
    [...triggers].sort((a, b) => a.priority - b.priority)[0];

  let partner: PartnerInfo | null = null;
  try {
    const res = await fetchFromHasura(Q_PARTNER, { id: partnerId });
    const row = res?.partners_by_pk as PartnerInfo | null;
    // Inject the catalogue thumbnail from the sibling menu selection, exactly as
    // startNewRun does, so a send_catalog node previews with its real card.
    partner = row ? { ...row, catalog_thumbnail_id: res?.menu?.[0]?.id ?? null } : null;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Could not load store settings" },
      { status: 500 },
    );
  }
  if (!partner) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const mode: "message" | "order" | "loyalty" =
    chosen.matchType === "order"
      ? "order"
      : chosen.matchType === "loyalty"
        ? "loyalty"
        : "message";

  let variables: Record<string, unknown>;
  if (mode === "order") {
    variables = sampleOrderVars(partner, chosen.orderStatus || "placed");
  } else if (mode === "loyalty") {
    variables = sampleLoyaltyVars(partner, chosen.loyaltyEvent || "earned");
  } else {
    // Live message-run variables (shop_open, delivery/takeaway now, hours,
    // order_link, …). No phone in a test, so the order link carries no
    // auto-login prefill — it's still a valid, tappable menu link.
    variables = buildMessageRunVars(partnerId, "", partner, null);
  }

  const { steps, endedBy } = simulateFlow(graph, variables, chosen.nodeId || null);

  // A compact "current situation" summary the UI shows above the preview, so the
  // partner understands WHY this particular branch was taken.
  const situation =
    mode === "message"
      ? {
          shop_open: variables.shop_open,
          can_order_now: variables.can_order_now,
          delivery_available_now: variables.delivery_available_now,
          takeaway_available_now: variables.takeaway_available_now,
          delivery_hours: variables.delivery_hours,
          takeaway_hours: variables.takeaway_hours,
        }
      : null;

  return NextResponse.json({
    ok: true,
    mode,
    trigger: {
      matchType: chosen.matchType,
      keywords: chosen.keywords || [],
      orderStatus: chosen.orderStatus,
      loyaltyEvent: chosen.loyaltyEvent,
    },
    situation,
    steps,
    endedBy,
  });
}

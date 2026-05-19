import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for live rider location.
 *
 * Flow:
 *   1. Look up the order's delivery_boy_id from Hasura.
 *   2. Hit the delivery-agents-server hub's
 *      GET /v1/agents/deliveryBoy/{id} — backed by cloud Redis with a
 *      30s TTL. Returns 404 when no fresh sample exists; the caller can
 *      then fall back to whatever's in delivery_boys.current_lat/lng.
 *   3. Wrap into a small JSON shape for the polling hook.
 *
 * The hub key never reaches the browser — this route owns it.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;
const HUB_URL = process.env.DELIVERY_AGENTS_SERVER_URL?.replace(/\/+$/, "") || "";
const HUB_KEY = process.env.DELIVERY_AGENTS_SERVER_API_KEY || "";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "bad_order_id" }, { status: 400 });
  }
  if (!HUB_URL || !HUB_KEY) {
    return NextResponse.json(
      { error: "hub_not_configured" },
      { status: 500 },
    );
  }

  // Resolve the rider for this order. Cached lookup would be a fine
  // optimisation later — for now the polling cadence is 3s and Hasura is
  // local enough that the extra hop is < 50ms.
  const lookup = await fetch(HASURA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_SECRET,
    },
    body: JSON.stringify({
      query: `query GetRider($id: uuid!) {
        orders_by_pk(id: $id) { id delivery_boy_id status }
      }`,
      variables: { id },
    }),
    cache: "no-store",
  });
  if (!lookup.ok) {
    return NextResponse.json({ error: "hasura_lookup_failed" }, { status: 502 });
  }
  const order = (await lookup.json())?.data?.orders_by_pk as
    | { delivery_boy_id: string | null; status: string | null }
    | null;
  if (!order?.delivery_boy_id) {
    return NextResponse.json({ error: "no_rider_assigned" }, { status: 404 });
  }

  const hubRes = await fetch(
    `${HUB_URL}/v1/agents/deliveryBoy/${order.delivery_boy_id}`,
    {
      method: "GET",
      headers: { "x-api-key": HUB_KEY },
      cache: "no-store",
      // Cap the wait so a hub hiccup doesn't stall the customer page poller.
      signal: AbortSignal.timeout(5_000),
    },
  ).catch(() => null);

  if (!hubRes) {
    return NextResponse.json({ error: "hub_unreachable" }, { status: 504 });
  }
  if (hubRes.status === 404) {
    return NextResponse.json({ error: "no_live_position" }, { status: 404 });
  }
  if (!hubRes.ok) {
    return NextResponse.json(
      { error: `hub_${hubRes.status}` },
      { status: 502 },
    );
  }

  const live = (await hubRes.json()) as {
    lat: number;
    lng: number;
    tsMs: number;
    ageSec: number;
    deliveryBoyId: string;
    source: string;
  };

  return NextResponse.json({
    lat: live.lat,
    lng: live.lng,
    tsMs: live.tsMs,
    ageSec: live.ageSec,
    deliveryBoyId: live.deliveryBoyId,
    orderStatus: order.status,
  });
}

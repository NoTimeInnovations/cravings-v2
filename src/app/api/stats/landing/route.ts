import { NextResponse } from "next/server";

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET!;

const QUERY = `
  query LandingStats($since: timestamptz!) {
    orders_aggregate(where: {
      created_at: { _gte: $since },
      status: { _in: ["completed", "accepted"] }
    }) {
      aggregate {
        count
        sum { total_price }
        avg { total_price }
      }
    }
  }
`;

// Cache for 30 days
export const revalidate = 2592000;

export async function GET() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const res = await fetch(HASURA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": HASURA_SECRET,
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { since: since.toISOString() },
      }),
      next: { revalidate: 2592000 },
    });

    const json = await res.json();
    const agg = json?.data?.orders_aggregate?.aggregate;

    if (!agg) {
      return NextResponse.json(
        { error: "No data" },
        { status: 500 }
      );
    }

    const totalOrders = agg.count ?? 0;
    const totalRevenue = Math.round(agg.sum?.total_price ?? 0);
    const avgOrderValue = Math.round(agg.avg?.total_price ?? 0);

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      avgOrderValue,
      cachedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Landing stats fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

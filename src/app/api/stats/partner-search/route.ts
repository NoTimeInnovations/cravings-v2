import { NextRequest, NextResponse } from "next/server";
import { EXCLUDED_PARTNER_IDS } from "../_excluded";

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ENDPOINT!;
const HASURA_SECRET = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET!;

export const revalidate = 0;
export const dynamic = "force-dynamic";

const SEARCH_QUERY = `
  query PartnerSearch($pattern: String!, $excluded: [uuid!]!) {
    partners(
      where: {
        id: { _nin: $excluded },
        _or: [
          { name: { _ilike: $pattern } },
          { store_name: { _ilike: $pattern } },
          { username: { _ilike: $pattern } },
          { district: { _ilike: $pattern } }
        ]
      }
      order_by: { name: asc }
      limit: 25
    ) {
      id
      name
      store_name
      district
    }
  }
`;

async function hasura(query: string, variables: Record<string, unknown>) {
  const res = await fetch(HASURA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_SECRET,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.errors) {
    console.error("partner-search Hasura errors:", JSON.stringify(json.errors));
  }
  return json.data ?? {};
}

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ partners: [] });
    }

    const data = await hasura(SEARCH_QUERY, {
      pattern: `%${q}%`,
      excluded: EXCLUDED_PARTNER_IDS,
    });

    const partners = (data.partners ?? []).map((p: any) => ({
      id: p.id,
      name: p.name ?? p.store_name ?? "—",
      district: p.district ?? null,
    }));

    return NextResponse.json({ partners });
  } catch (e: any) {
    console.error("partner-search failed", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}

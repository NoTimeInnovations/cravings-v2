import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

async function removeDomainFromVercel(domain: string) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return;

  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`
    : `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`;

  await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { partnerId } = await req.json();

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId is required" }, { status: 400 });
    }

    // Get current domain before clearing it
    const query = `
      query GetPartnerDomain($partnerId: uuid!) {
        partners_by_pk(id: $partnerId) { custom_domain }
      }
    `;
    const current = await fetchFromHasura(query, { partnerId });
    const domain = current?.partners_by_pk?.custom_domain;

    // Clear from DB
    const mutation = `
      mutation ClearCustomDomain($partnerId: uuid!) {
        update_partners_by_pk(
          pk_columns: { id: $partnerId }
          _set: { custom_domain: null }
        ) { id }
      }
    `;
    await fetchFromHasura(mutation, { partnerId });

    // Remove from Vercel
    if (domain) await removeDomainFromVercel(domain);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Remove domain error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

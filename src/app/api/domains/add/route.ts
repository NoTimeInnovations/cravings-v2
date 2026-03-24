import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

async function addDomainToVercel(domain: string) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return null;

  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`
    : `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { partnerId, domain } = await req.json();

    if (!partnerId || !domain) {
      return NextResponse.json({ error: "partnerId and domain are required" }, { status: 400 });
    }

    // Normalize domain (strip protocol and trailing slash)
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

    // Save to DB
    const mutation = `
      mutation SetCustomDomain($partnerId: uuid!, $domain: String!) {
        update_partners_by_pk(
          pk_columns: { id: $partnerId }
          _set: { custom_domain: $domain }
        ) {
          id
          custom_domain
          username
        }
      }
    `;
    const dbResult = await fetchFromHasura(mutation, { partnerId, domain: cleanDomain });

    if (!dbResult?.update_partners_by_pk) {
      return NextResponse.json({ error: "Failed to save domain" }, { status: 500 });
    }

    // Register with Vercel (provisions SSL automatically)
    const vercelResult = await addDomainToVercel(cleanDomain);

    // Extract all required DNS records from Vercel's response
    const dnsRecords: { type: string; name: string; value: string }[] = [];
    const aEntry = vercelResult?.verification?.find((v: any) => v.type === "A");
    if (aEntry) {
      dnsRecords.push({ type: "A", name: "@", value: aEntry.value || "76.76.21.21" });
    } else {
      dnsRecords.push({
        type: "CNAME",
        name: cleanDomain.split(".").length > 2 ? cleanDomain.split(".")[0] : "@",
        value:
          vercelResult?.cnames?.[0] ||
          vercelResult?.verification?.find((v: any) => v.type === "CNAME")?.value ||
          "cname.vercel-dns.com",
      });
    }
    const txtEntry = vercelResult?.verification?.find((v: any) => v.type === "TXT");
    if (txtEntry) {
      dnsRecords.push({ type: "TXT", name: txtEntry.domain || "_vercel", value: txtEntry.value });
    }

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      dnsRecords,
      dnsRecord: dnsRecords[0],
      // Legacy field kept for compatibility
      cname: dnsRecords.find((r) => r.type === "CNAME")?.value,
      vercel: vercelResult,
    });
  } catch (error: any) {
    console.error("Add domain error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

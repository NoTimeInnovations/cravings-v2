import { NextRequest, NextResponse } from "next/server";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

function extractDnsRecords(data: any, domain: string) {
  const records: { type: string; name: string; value: string }[] = [];

  // Primary record: A or CNAME
  const aEntry = data?.verification?.find((v: any) => v.type === "A");
  if (aEntry) {
    records.push({ type: "A", name: "@", value: aEntry.value || "76.76.21.21" });
  } else {
    const cnameValue =
      data?.cnames?.[0] ||
      data?.verification?.find((v: any) => v.type === "CNAME")?.value ||
      "cname.vercel-dns.com";
    const parts = domain.split(".");
    records.push({ type: "CNAME", name: parts.length > 2 ? parts[0] : "@", value: cnameValue });
  }

  // TXT record (ownership verification — Vercel sometimes requires this)
  const txtEntry = data?.verification?.find((v: any) => v.type === "TXT");
  if (txtEntry) {
    records.push({ type: "TXT", name: txtEntry.domain || `_vercel`, value: txtEntry.value });
  }

  return records;
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return NextResponse.json({ error: "Vercel not configured" }, { status: 500 });
  }

  try {
    const url = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });

    const data = await res.json();
    const dnsRecords = extractDnsRecords(data, domain);

    return NextResponse.json({
      verified: data.verified === true,
      dnsRecords,
      // Legacy field kept for compatibility
      cname: dnsRecords.find((r) => r.type === "CNAME")?.value,
      dnsRecord: dnsRecords[0],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

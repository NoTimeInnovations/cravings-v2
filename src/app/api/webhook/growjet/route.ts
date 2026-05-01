import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });

  const raw = await req.text();
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // not json — keep as raw text
  }

  console.log("[growjet-webhook] headers:", JSON.stringify(headers));
  console.log("[growjet-webhook] body:", JSON.stringify(parsed));

  return NextResponse.json({ status: "ok" });
}

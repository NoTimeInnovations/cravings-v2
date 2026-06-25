import { NextRequest, NextResponse } from "next/server";
import { POOL, toE164 } from "../_shared";

// Step 1: send a WhatsApp OTP to the rider's number.
export async function POST(req: NextRequest) {
  if (!POOL) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const { phone } = await req.json().catch(() => ({}) as Record<string, unknown>);
  const e164 = toE164(phone);
  if (!e164) {
    return NextResponse.json({ error: "Enter a valid 10-digit phone number." }, { status: 400 });
  }
  try {
    const res = await fetch(`${POOL}/delivery/v1/auth/otp/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: e164 }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}) as Record<string, unknown>);
      const status = res.status >= 400 && res.status < 500 ? res.status : 502;
      return NextResponse.json({ error: (b as { message?: string })?.message || "Could not send the code. Try again." }, { status });
    }
    return NextResponse.json({ ok: true, phone: e164 });
  } catch {
    return NextResponse.json({ error: "Network error. Try again." }, { status: 502 });
  }
}

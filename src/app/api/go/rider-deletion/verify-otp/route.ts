import { NextRequest, NextResponse } from "next/server";
import { POOL, toE164, cookieName, cookiePath } from "../_shared";

// Step 2: verify the OTP. On success the pool returns an access token; we keep it
// in an httpOnly cookie (not exposed to the browser) for the delete step.
export async function POST(req: NextRequest) {
  if (!POOL) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const { phone, code } = await req.json().catch(() => ({}) as Record<string, unknown>);
  const e164 = toE164(phone);
  if (!e164 || !/^\d{6}$/.test(String(code ?? ""))) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }
  let data: Record<string, unknown> = {};
  try {
    const res = await fetch(`${POOL}/delivery/v1/auth/otp/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: e164,
        code: String(code),
        device: { platform: "android", model: "web-account-deletion" },
      }),
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const status = res.status >= 400 && res.status < 500 ? res.status : 502;
      return NextResponse.json({ error: (data as { message?: string })?.message || "Invalid or expired code." }, { status });
    }
  } catch {
    return NextResponse.json({ error: "Network error. Try again." }, { status: 502 });
  }
  const token = (data as { access_token?: string })?.access_token;
  if (!token) return NextResponse.json({ error: "Verification failed. Try again." }, { status: 502 });

  const out = NextResponse.json({ ok: true });
  out.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: cookiePath,
    maxAge: 600, // 10 minutes to confirm
  });
  return out;
}

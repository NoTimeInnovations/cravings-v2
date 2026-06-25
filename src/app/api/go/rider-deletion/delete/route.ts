import { NextRequest, NextResponse } from "next/server";
import { POOL, cookieName, cookiePath } from "../_shared";

// Step 3: schedule deletion. Uses the verified token from the httpOnly cookie to
// call the pool's DELETE /riders/me, which deactivates now + purges after 30 days.
export async function POST(req: NextRequest) {
  if (!POOL) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const token = req.cookies.get(cookieName)?.value;
  if (!token) {
    return NextResponse.json({ error: "Your verification expired. Please verify your number again." }, { status: 401 });
  }
  let data: Record<string, unknown> = {};
  try {
    const res = await fetch(`${POOL}/delivery/v1/riders/me`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const status = res.status >= 400 && res.status < 500 ? res.status : 502;
      return NextResponse.json({ error: (data as { message?: string })?.message || "Could not delete the account." }, { status });
    }
  } catch {
    return NextResponse.json({ error: "Network error. Try again." }, { status: 502 });
  }
  const out = NextResponse.json({ ok: true, purgeAfter: (data as { purgeAfter?: string })?.purgeAfter ?? null });
  // burn the token
  out.cookies.set(cookieName, "", { httpOnly: true, path: cookiePath, maxAge: 0 });
  return out;
}

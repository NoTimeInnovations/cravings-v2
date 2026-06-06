"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { sendOtpEmail } from "@/lib/email";

// OTP state must survive across Vercel serverless invocations: `sendOtp` and
// `verifyOtp` can be handled by different (or recycled) Lambda instances, so an
// in-process Map is unreliable — the verify call frequently lands on an instance
// that never saw the code. Instead we keep the state in a signed, httpOnly cookie
// that round-trips with the browser. The HMAC signature (server-only secret)
// stops a client from forging a valid {code, expiry} pair.
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const COOKIE_PREFIX = "otp_";

// Server-only secret for the HMAC. Never use a NEXT_PUBLIC_* value here — that
// would let a client forge the cookie. RESEND_API_KEY is guaranteed present
// whenever OTP email works, so it's a safe last-resort fallback.
function otpSecret(): string {
  return (
    process.env.OTP_SECRET ||
    process.env.CANCEL_AUTH_SECRET ||
    process.env.RESEND_API_KEY ||
    "dev-otp-secret"
  );
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cookieName(email: string): string {
  // Stable per-email cookie name; hash to keep it cookie-safe.
  const h = crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
  return `${COOKIE_PREFIX}${h}`;
}

function sign(email: string, code: string, expiresAt: number): string {
  return crypto
    .createHmac("sha256", otpSecret())
    .update(`${email.trim().toLowerCase()}.${code}.${expiresAt}`)
    .digest("hex");
}

export async function sendOtp(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const code = generateOtp();
    const expiresAt = Date.now() + OTP_TTL_MS;
    const sig = sign(email, code, expiresAt);

    // Store {expiry, signature} in an httpOnly cookie. The plaintext code is
    // NOT stored — only its HMAC — so the cookie can't be read off the wire to
    // skip the email, and can't be forged without the server secret.
    const jar = await cookies();
    jar.set(cookieName(email), `${expiresAt}.${sig}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Math.floor(OTP_TTL_MS / 1000),
      path: "/",
    });

    // Dev-mode visibility: always print the OTP to the server console so
    // local testing works even if Resend rejects the send (unverified
    // sender domain etc.). In prod we still rely on the email delivery.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[OTP] code for ${email} = ${code} (expires in 5 min)`);
    }

    try {
      await sendOtpEmail(email, code);
    } catch (mailErr) {
      // In dev, the OTP is on the server console — let the user proceed.
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[OTP] email send failed in dev — code is logged above. Proceeding.",
        );
      } else {
        throw mailErr;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send OTP:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send verification code";
    return { success: false, error: message };
  }
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const jar = await cookies();
  const name = cookieName(email);
  const cookie = jar.get(name);

  if (!cookie?.value) {
    return {
      success: false,
      error: "Verification code expired or not found. Please request a new one.",
    };
  }

  const [expStr, sig] = cookie.value.split(".");
  const expiresAt = Number(expStr);

  if (!expiresAt || !sig) {
    jar.delete(name);
    return {
      success: false,
      error: "Verification code expired or not found. Please request a new one.",
    };
  }

  if (expiresAt < Date.now()) {
    jar.delete(name);
    return {
      success: false,
      error: "Verification code has expired. Please request a new one.",
    };
  }

  const expected = sign(email, code, expiresAt);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  const matches =
    sigBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(sigBuf, expectedBuf);

  if (!matches) {
    return { success: false, error: "Invalid verification code. Please try again." };
  }

  // Single-use: clear the cookie once verified.
  jar.delete(name);
  return { success: true };
}

"use server";

import { sendOtpEmail } from "@/lib/email";

// In-memory OTP store with expiry
const otpStore = new Map<string, { code: string; expiresAt: number }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, value] of otpStore) {
    if (value.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}

export async function sendOtp(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    cleanExpired();

    const code = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(email.toLowerCase(), { code, expiresAt });

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

export async function verifyOtp(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  cleanExpired();

  const stored = otpStore.get(email.toLowerCase());

  if (!stored) {
    return { success: false, error: "Verification code expired or not found. Please request a new one." };
  }

  if (stored.expiresAt < Date.now()) {
    otpStore.delete(email.toLowerCase());
    return { success: false, error: "Verification code has expired. Please request a new one." };
  }

  if (stored.code !== code) {
    return { success: false, error: "Invalid verification code. Please try again." };
  }

  otpStore.delete(email.toLowerCase());
  return { success: true };
}

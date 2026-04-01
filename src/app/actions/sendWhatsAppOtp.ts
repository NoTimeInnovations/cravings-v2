"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

// Test phone numbers — skip OTP sending and verification
const TEST_PHONES = ["0000000000", "6282826684", "9809873068"];

function isTestPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, "");
  return TEST_PHONES.some((tp) => cleaned.endsWith(tp));
}

// In-memory OTP store with expiry
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// Log OTP message to database (fire-and-forget)
function logOtpMessage(phone: string, status: "sent" | "failed", partnerId?: string, metaMessageId?: string, errorDetails?: string) {
  const mutation = `
    mutation LogOtpMessage($object: whatsapp_message_logs_insert_input!) {
      insert_whatsapp_message_logs_one(object: $object) { id }
    }
  `;
  fetchFromHasura(mutation, {
    object: {
      phone,
      partner_id: partnerId || null,
      template_name: "otp_message_v2",
      message_type: "template",
      category: "otp",
      status,
      meta_message_id: metaMessageId || null,
      error_details: errorDetails || null,
    },
  }).catch((err) => console.error("Failed to log OTP message:", err));
}

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

function formatPhone(phone: string): string {
  let formatted = phone.replace(/[\s\-\+\(\)]/g, "");
  if (formatted.startsWith("0")) {
    formatted = "91" + formatted.slice(1);
  }
  if (formatted.length === 10) {
    formatted = "91" + formatted;
  }
  return formatted;
}

export async function sendWhatsAppOtp(
  phone: string,
  partnerId?: string
): Promise<{ success: boolean; error?: string; skipOtp?: boolean }> {
  if (isTestPhone(phone)) {
    return { success: true, skipOtp: true };
  }

  const formattedPhone = formatPhone(phone);
  try {
    cleanExpired();
    const code = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(formattedPhone, { code, expiresAt });

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

    const messagePayload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "otp_message_v2",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: code }],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: code }],
          },
        ],
      },
    };

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("WhatsApp OTP send error:", res.status, errBody);
      logOtpMessage(formattedPhone, "failed", partnerId, undefined, errBody);
      return { success: false, error: "Failed to send OTP via WhatsApp" };
    }

    const result = await res.json();
    logOtpMessage(formattedPhone, "sent", partnerId, result.messages?.[0]?.id);

    return { success: true };
  } catch (error) {
    console.error("Failed to send WhatsApp OTP:", error);
    logOtpMessage(formattedPhone, "failed", partnerId, undefined, String(error));
    return { success: false, error: "Failed to send verification code" };
  }
}

export async function verifyWhatsAppOtp(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (isTestPhone(phone)) {
    return { success: true };
  }

  cleanExpired();

  const formattedPhone = formatPhone(phone);
  const stored = otpStore.get(formattedPhone);

  if (!stored) {
    return {
      success: false,
      error: "Verification code expired or not found. Please request a new one.",
    };
  }

  if (stored.expiresAt < Date.now()) {
    otpStore.delete(formattedPhone);
    return {
      success: false,
      error: "Verification code has expired. Please request a new one.",
    };
  }

  if (stored.code !== code) {
    return { success: false, error: "Invalid verification code. Please try again." };
  }

  otpStore.delete(formattedPhone);
  return { success: true };
}

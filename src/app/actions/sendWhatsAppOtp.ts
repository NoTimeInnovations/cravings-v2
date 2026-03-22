"use server";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

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
  phone: string
): Promise<{ success: boolean; error?: string }> {
  try {
    cleanExpired();

    const formattedPhone = formatPhone(phone);
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
      return { success: false, error: "Failed to send OTP via WhatsApp" };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send WhatsApp OTP:", error);
    return { success: false, error: "Failed to send verification code" };
  }
}

export async function verifyWhatsAppOtp(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
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

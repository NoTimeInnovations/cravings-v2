"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { getPartnerWabaIntegration } from "@/lib/whatsapp-meta";

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v22.0";

// Test account for App Store review — accepts hardcoded OTP 123456
const TEST_PHONE = "0000000000";
function isTestPhone(phone: string): boolean {
  return phone.replace(/[\s\-\+\(\)]/g, "").endsWith(TEST_PHONE);
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

// Per-partner OTP sender preference. Defaults to "menuthere" (our shared number)
// unless the partner has explicitly opted into sending from their own connected
// WhatsApp via the Integrations settings toggle.
async function getPartnerOtpSender(partnerId: string): Promise<string> {
  try {
    const res = await fetchFromHasura(
      `query GetOtpSender($id: uuid!) { partners_by_pk(id: $id) { otp_sender } }`,
      { id: partnerId },
    );
    return res?.partners_by_pk?.otp_sender || "menuthere";
  } catch {
    return "menuthere";
  }
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
): Promise<{ success: boolean; error?: string }> {
  const formattedPhone = formatPhone(phone);

  // Test account: store hardcoded OTP, skip WhatsApp message
  if (isTestPhone(phone)) {
    otpStore.set(formattedPhone, { code: "123456", expiresAt: Date.now() + 5 * 60 * 1000 });
    return { success: true };
  }

  try {
    cleanExpired();
    const code = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(formattedPhone, { code, expiresAt });

    // Default sender: Menuthere's shared WhatsApp number.
    const menutherePhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    // Sending always uses our messaging-capable system-user token. A partner's
    // own connected token is scoped to whatsapp_business_manage_events
    // (Coexistence) and can't call /messages — so even when we send from the
    // partner's number we authenticate with WHATSAPP_ACCESS_TOKEN.
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

    // Sender preference: default is Menuthere's number. Only send from the
    // partner's OWN connected WhatsApp when they've opted in (otp_sender = "own")
    // AND have a connected integration. Even then we fall back to Menuthere if
    // the send fails (no send access, or otp_message_v2 not approved on their
    // WABA), so the OTP always lands and login is never blocked.
    let partnerPhoneNumberId: string | null = null;
    if (partnerId) {
      try {
        const otpSender = await getPartnerOtpSender(partnerId);
        if (otpSender === "own") {
          const integration = await getPartnerWabaIntegration(partnerId);
          if (integration?.phone_number_id) {
            partnerPhoneNumberId = integration.phone_number_id;
          }
        }
      } catch {
        // ignore — fall back to Menuthere's number
      }
    }

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

    const sendFrom = (fromPhoneNumberId: string) =>
      fetch(
        `https://graph.facebook.com/${API_VERSION}/${fromPhoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messagePayload),
        }
      );

    // Try the partner's own number first; if it fails (no send access, or the
    // template isn't approved on their WABA yet), retry from Menuthere's shared
    // number so the OTP still lands and login isn't blocked.
    let res = await sendFrom(partnerPhoneNumberId || menutherePhoneNumberId);
    if (!res.ok && partnerPhoneNumberId) {
      const errBody = await res.text();
      console.warn(
        "OTP via partner number failed, retrying from Menuthere:",
        res.status,
        errBody
      );
      res = await sendFrom(menutherePhoneNumberId);
    }

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

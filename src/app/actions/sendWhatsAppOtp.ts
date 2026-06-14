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

// The language code of the partner's APPROVED otp_message_v2 template. Templates
// are per-WABA and the partner may have created theirs as en_US (the template
// creator's default) — sending with a mismatched language code fails, so we use
// whatever they actually got approved. Defaults to "en".
async function getPartnerOtpTemplateLang(partnerId: string): Promise<string> {
  try {
    const res = await fetchFromHasura(
      `query OtpTemplateLang($p: uuid!) {
        whatsapp_message_templates(
          where: { partner_id: { _eq: $p }, name: { _eq: "otp_message_v2" }, status: { _eq: "APPROVED" } }
          limit: 1
        ) { language }
      }`,
      { p: partnerId },
    );
    return res?.whatsapp_message_templates?.[0]?.language || "en";
  } catch {
    return "en";
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

    // Default sender: Menuthere's shared WhatsApp number, with our token.
    const menutherePhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    const menuthereToken = process.env.WHATSAPP_ACCESS_TOKEN!;

    // Sender preference: default is Menuthere's number. Only send from the
    // partner's OWN connected WhatsApp when they've opted in (otp_sender = "own")
    // AND have a connected integration. The partner's number must be sent with
    // the partner's OWN Embedded Signup token (the Tech Provider per-customer
    // token that has a role on their WABA) — our system-user token has none.
    // Even then we fall back to Menuthere if the send fails (no send access, or
    // otp_message_v2 not approved on their WABA), so the OTP always lands.
    let partnerPhoneNumberId: string | null = null;
    let partnerToken: string | null = null;
    let partnerLang = "en";
    if (partnerId) {
      try {
        const otpSender = await getPartnerOtpSender(partnerId);
        if (otpSender === "own") {
          const integration = await getPartnerWabaIntegration(partnerId);
          if (integration?.phone_number_id) {
            partnerPhoneNumberId = integration.phone_number_id;
            partnerToken = integration.access_token || null;
            // Use the partner's own approved template language (e.g. en_US),
            // not a hardcoded "en", or the send fails on a language mismatch.
            partnerLang = await getPartnerOtpTemplateLang(partnerId);
          }
        }
      } catch {
        // ignore — fall back to Menuthere's number
      }
    }

    const buildPayload = (language: string) => ({
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: "otp_message_v2",
        language: { code: language },
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
    });

    const sendFrom = (fromPhoneNumberId: string, token: string, language: string) =>
      fetch(
        `https://graph.facebook.com/${API_VERSION}/${fromPhoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildPayload(language)),
        }
      );

    // Partner number uses their own token + their template language; if it fails
    // (no send access, or otp_message_v2 not approved on their WABA), retry from
    // Menuthere's shared number (our token + "en" template) so the OTP lands.
    let res = partnerPhoneNumberId
      ? await sendFrom(partnerPhoneNumberId, partnerToken || menuthereToken, partnerLang)
      : await sendFrom(menutherePhoneNumberId, menuthereToken, "en");
    if (!res.ok && partnerPhoneNumberId) {
      const errBody = await res.text();
      console.warn(
        "OTP via partner number failed, retrying from Menuthere:",
        res.status,
        errBody
      );
      res = await sendFrom(menutherePhoneNumberId, menuthereToken, "en");
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

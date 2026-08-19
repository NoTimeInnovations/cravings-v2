/**
 * Types + constants shared by the v3 Templates list and its editor.
 *
 * Everything here is copied verbatim from
 * `src/components/admin-v2/AdminV2WhatsAppTemplates.tsx` so both dashboards
 * speak exactly the same shape to `/api/whatsapp/templates`. Nothing about the
 * payloads changed — only the chrome around them.
 */

export type HeaderFormat = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
export type ButtonKind = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";

export interface ButtonDraft {
  type: ButtonKind;
  text: string;
  url?: string;
  /**
   * URL buttons are static (one fixed link) or dynamic (the link ends with a
   * {{1}} variable filled per message). Dynamic links require an example.
   */
  urlType?: "static" | "dynamic";
  urlExample?: string;
  phone_number?: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  meta_template_id: string | null;
  rejection_reason: string | null;
  components: any[];
  created_at: string;
}

export interface WaNumber {
  id: string;
  phone_number_id: string;
  display_phone: string | null;
  is_primary: boolean;
}

export const LANGUAGES = [
  { code: "en_US", label: "English (US)" },
  { code: "en", label: "English" },
  { code: "en_GB", label: "English (UK)" },
  { code: "hi", label: "Hindi" },
  { code: "ml", label: "Malayalam" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bengali" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "ar", label: "Arabic" },
];

export const CATEGORIES: Array<{
  value: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  label: string;
  hint: string;
}> = [
  { value: "UTILITY", label: "Utility", hint: "Order updates, account alerts, receipts" },
  { value: "MARKETING", label: "Marketing", hint: "Promotions, offers, announcements" },
  { value: "AUTHENTICATION", label: "Authentication", hint: "One-time passcodes, login codes" },
];

/**
 * Default footer prefilled on new templates — gives every marketing/utility
 * template a built-in opt-out line (the webhook treats "STOP" replies as
 * unsubscribes). Editable / removable per template.
 */
export const DEFAULT_FOOTER = "Reply STOP to unsubscribe";

/**
 * The standard OTP / login-code template the app sends verification codes with
 * (see `src/app/actions/sendWhatsAppOtp.ts` → name "otp_message_v2"). It is
 * identical for every partner, so it is offered as one click rather than making
 * each partner hand-build an AUTHENTICATION template.
 */
export const OTP_TEMPLATE_NAME = "otp_message_v2";
export const OTP_TEMPLATE_PAYLOAD = {
  name: OTP_TEMPLATE_NAME,
  language: "en_US",
  category: "AUTHENTICATION" as const,
  components: [
    { type: "BODY", add_security_recommendation: true },
    { type: "FOOTER", code_expiration_minutes: 5 },
    { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
  ],
};

/** Fill {{n}} placeholders with their example values for the chat preview. */
export function previewText(body: string, samples: string[]) {
  return body.replace(/\{\{(\d+)\}\}/g, (_m, idx) => {
    const i = parseInt(idx, 10) - 1;
    return samples[i] ? samples[i] : `{{${idx}}}`;
  });
}

/** How many DISTINCT {{n}} variables a body uses. */
export function variableCount(body: string): number {
  const matches = body.match(/\{\{(\d+)\}\}/g) || [];
  const indices = new Set<number>();
  matches.forEach((m) => {
    const n = parseInt(m.replace(/[{}]/g, ""), 10);
    if (!isNaN(n)) indices.add(n);
  });
  return indices.size;
}

/** Meta's raw status → the design's three tones. */
export function statusTone(status: string): "green" | "amber" | "red" | "neutral" {
  switch (status) {
    case "APPROVED":
      return "green";
    case "PENDING":
    case "DRAFT":
    case "PENDING_DELETION":
      return "amber";
    case "REJECTED":
    case "DISABLED":
    case "PAUSED":
      return "red";
    default:
      return "neutral";
  }
}

/** Sentence-case label for a Meta status ("PENDING" → "In review"). */
export function statusLabel(status: string): string {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "PENDING":
      return "In review";
    case "DRAFT":
      return "Draft";
    case "REJECTED":
      return "Rejected";
    case "DISABLED":
      return "Disabled";
    case "PAUSED":
      return "Paused";
    case "PENDING_DELETION":
      return "Deleting";
    default:
      return status
        ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")
        : "Unknown";
  }
}

/** "Utility" from "UTILITY" — the category pill in the row. */
export function categoryLabel(category: string): string {
  const known = CATEGORIES.find((c) => c.value === category);
  if (known) return known.label;
  return category
    ? category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ")
    : "—";
}

/**
 * Human-friendly explanations for WhatsApp Cloud API send/delivery errors.
 *
 * Meta returns numeric error codes (in status webhooks `errors[].code`, or inside
 * the raw error body when a send is rejected). This maps the common ones to
 * plain language a restaurant owner can act on, with a short suggested action.
 * Unknown codes fall back to the raw Meta message.
 */

export interface ExplainedError {
  code: number | null;
  /** Short, plain-English summary of what happened. */
  summary: string;
  /** Optional next step the owner can take. */
  action?: string;
}

const MAP: Record<number, { summary: string; action?: string }> = {
  131049: {
    summary:
      "WhatsApp is pacing marketing messages to this person right now to protect engagement, so it wasn't delivered.",
    action: "Normal for marketing. Try later, or focus on customers who engage with you.",
  },
  130472: {
    summary:
      "This user was excluded from marketing messages by WhatsApp (part of a Meta experiment).",
    action: "Nothing to fix — Meta limits some marketing delivery automatically.",
  },
  131026: {
    summary:
      "The message couldn't be delivered — the number may not be on WhatsApp or can't receive this message.",
    action: "Check the number is correct and active on WhatsApp.",
  },
  131047: {
    summary:
      "Couldn't re-engage this contact — the 24-hour window is closed (templates should bypass this).",
    action: "Make sure you're sending an approved template.",
  },
  131048: {
    summary:
      "Sending was blocked because this number hit WhatsApp's spam/quality rate limit.",
    action: "Slow down sends and improve message quality to lift the limit.",
  },
  131056: {
    summary:
      "Too many messages were sent to this same number too quickly (pair rate limit).",
    action: "It will clear shortly — avoid repeat sends to one number.",
  },
  130429: {
    summary: "Your number sent messages faster than its current throughput allows.",
    action: "The broadcast paces itself; remaining messages continue automatically.",
  },
  132000: {
    summary: "The template was sent with the wrong number of variables.",
    action: "Re-check the template's variable mapping.",
  },
  132001: {
    summary:
      "The template doesn't exist or isn't approved on this WhatsApp number.",
    action: "Confirm the template is approved on the connected number.",
  },
  132005: {
    summary: "A filled-in template value was too long for WhatsApp.",
    action: "Shorten the variable values.",
  },
  132007: {
    summary: "The template content violated WhatsApp's formatting or policy rules.",
    action: "Edit the template to meet WhatsApp policy and resubmit.",
  },
  132012: {
    summary: "A template variable's format didn't match what the template expects.",
    action: "Re-check the variable mapping.",
  },
  132015: {
    summary: "This template is paused by WhatsApp due to low quality.",
    action: "Wait for it to resume or improve and resubmit the template.",
  },
  132016: {
    summary: "This template was disabled by WhatsApp for policy/quality reasons.",
    action: "Create a new compliant template.",
  },
  133010: {
    summary: "The sender number isn't registered on the WhatsApp Cloud API yet.",
    action: "Finish connecting/registering the number in Settings → WhatsApp.",
  },
  133004: {
    summary: "WhatsApp's servers were temporarily unavailable.",
    action: "Temporary — remaining messages retry automatically.",
  },
  190: {
    summary: "The WhatsApp connection token expired.",
    action: "Reconnect WhatsApp Business in Settings.",
  },
  368: {
    summary: "The number is temporarily restricted by WhatsApp for policy violations.",
    action: "Reduce marketing volume and improve quality, then try again.",
  },
  100: {
    summary: "WhatsApp rejected a parameter in the request.",
    action: "Re-check the template and recipient details.",
  },
  131000: {
    summary: "Something went wrong on WhatsApp's side while sending.",
    action: "Temporary — try again.",
  },
};

// ─── Categorisation ──────────────────────────────────────────────
// Group Meta error codes into a handful of actionable buckets so a broadcast's
// failures can be summarised ("12 recipient-side, 4 Meta throttle, 1 template").
export type ErrorCategory =
  | "recipient"
  | "meta_policy"
  | "quality_rate"
  | "template"
  | "auth"
  | "setup"
  | "transient"
  | "other";

export interface CategoryMeta {
  /** Short bucket label for the UI. */
  label: string;
  /** Who/what the failure is on. */
  side: "Recipient" | "Meta policy" | "Your number" | "You" | "Temporary" | "Other";
  /** Whether resending could plausibly succeed. */
  retryable: boolean;
}

export const ERROR_CATEGORY_META: Record<ErrorCategory, CategoryMeta> = {
  recipient: { label: "Recipient can't receive", side: "Recipient", retryable: false },
  meta_policy: { label: "Meta policy / throttle", side: "Meta policy", retryable: false },
  quality_rate: { label: "Rate / quality limit", side: "Your number", retryable: true },
  template: { label: "Template problem", side: "You", retryable: false },
  auth: { label: "Connection / token", side: "You", retryable: false },
  setup: { label: "Number setup", side: "You", retryable: false },
  transient: { label: "Temporary glitch", side: "Temporary", retryable: true },
  other: { label: "Other / unknown", side: "Other", retryable: false },
};

const CODE_CATEGORY: Record<number, ErrorCategory> = {
  131026: "recipient", // undeliverable (not on WA / can't receive)
  131047: "recipient", // re-engagement window
  131049: "meta_policy", // marketing frequency cap
  130472: "meta_policy", // user in Meta experiment
  131048: "quality_rate", // spam/quality rate limit
  131056: "quality_rate", // pair rate limit
  130429: "quality_rate", // throughput cap
  368: "quality_rate", // temporarily restricted (policy/volume)
  132000: "template",
  132001: "template",
  132005: "template",
  132007: "template",
  132012: "template",
  132015: "template",
  132016: "template",
  190: "auth", // token expired
  133010: "setup", // number not registered on Cloud API
  131000: "transient", // generic WA-side error
  133004: "transient", // WA servers unavailable
  1: "transient",
  2: "transient",
};

export function categoryForCode(code?: number | string | null): ErrorCategory {
  if (code == null || code === "") return "other";
  const n = typeof code === "number" ? code : parseInt(String(code), 10);
  if (Number.isNaN(n)) return "other";
  return CODE_CATEGORY[n] ?? "other";
}

// Pull a numeric Meta error code out of a raw error string/JSON if present.
function extractCode(raw?: string | null): number | null {
  if (!raw) return null;
  const str = String(raw);
  // Try JSON shapes: {"error":{"code":131049,...}} or "(#131049) ..."
  const jsonMatch = str.match(/"code"\s*:\s*(\d{2,6})/);
  if (jsonMatch) return parseInt(jsonMatch[1], 10);
  const hashMatch = str.match(/\(#(\d{2,6})\)/);
  if (hashMatch) return parseInt(hashMatch[1], 10);
  return null;
}

export function explainWhatsAppError(
  code?: number | string | null,
  rawMessage?: string | null,
): ExplainedError {
  let numCode: number | null = null;
  if (code != null && code !== "") {
    const n = typeof code === "number" ? code : parseInt(String(code), 10);
    if (!Number.isNaN(n)) numCode = n;
  }
  if (numCode == null) numCode = extractCode(rawMessage);

  if (numCode != null && MAP[numCode]) {
    return { code: numCode, ...MAP[numCode] };
  }

  // Fallback: surface the cleanest bit of the raw Meta message.
  let summary = "The message could not be delivered.";
  if (rawMessage) {
    const m = String(rawMessage);
    // Prefer a human "message" field if the raw is JSON.
    const msgMatch = m.match(/"message"\s*:\s*"([^"]+)"/);
    summary = (msgMatch ? msgMatch[1] : m).slice(0, 200);
  }
  return { code: numCode, summary };
}

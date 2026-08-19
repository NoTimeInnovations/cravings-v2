/**
 * Shared types, helpers and class constants for the v3 Broadcast screen.
 *
 * Everything here is a straight port of the logic in
 * `src/components/admin-v2/AdminV2WhatsAppBroadcast.tsx` — same endpoints, same
 * parsing, same limits. Only the presentation changed, so a broadcast created
 * from v3 is byte-for-byte the same request admin-v2 would have sent.
 */

import { parsePhoneNumberFromString } from "libphonenumber-js";

/** Fallback cap when Meta's per-number tier can't be read. Matches admin-v2. */
export const DAILY_LIMIT = 250;

export type VarSource = "phone" | "name" | "fixed";

export interface VarMapItem {
  source: VarSource;
  value?: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: any[];
}

export interface BroadcastRow {
  id: string;
  template_name: string;
  language: string;
  category: string;
  status: string;
  scheduled_at: string | null;
  daily_limit: number;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  total_cost: number;
  cost_currency: string | null;
  cost_source: string | null;
  cost_reconciled_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface DetailBroadcast {
  id: string;
  template_name: string;
  language: string;
  category: string;
  status: string;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  total_cost: number;
  cost_estimated: number | null;
  cost_currency: string | null;
  cost_source: string | null;
  cost_reconciled_at: string | null;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PhoneQuality {
  connected: boolean;
  currency?: string;
  usage?: { sentToday: number; dailyLimit: number; remaining?: number };
  phone?: {
    verifiedName: string | null;
    displayPhoneNumber: string | null;
    qualityRating: string | null;
    messagingLimitTier: string | null;
  } | null;
  actualSpend?: {
    amount: number;
    currency: string | null;
    periodLabel: string;
  } | null;
}

export interface RecipientRow {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error: string | null;
  error_code: string | null;
  error_title: string | null;
  cost_amount: number | null;
  cost_currency: string | null;
  cost_source: string | null;
  pricing_category: string | null;
}

export interface ErrorBucket {
  code: string | null;
  count: number;
  category: string;
  categoryLabel: string;
  side: string;
  retryable: boolean;
  summary: string;
  action?: string;
  metaTitle: string | null;
}

export interface ParsedRecipient {
  phone: string;
  name: string;
}

/** A connected WhatsApp number the partner can broadcast from. */
export interface WaNumber {
  id: string;
  phone_number_id: string;
  display_phone: string | null;
  is_primary: boolean;
}

export interface PhoneCorrection {
  original: string;
  corrected: string;
  name: string;
  valid: boolean;
  changed: boolean;
}

/**
 * Clean + normalise one recipient phone to E.164 before sending. Strips stray
 * spaces/dashes/brackets, turns a leading 00 into +, and validates with
 * libphonenumber (default region India, matching the send path). `valid` is
 * false when it still can't be parsed into a real number — the UI flags those
 * so the owner can fix or drop them before the broadcast starts.
 */
export function correctRecipientPhone(r: ParsedRecipient): PhoneCorrection {
  const original = (r.phone || "").trim();
  let cleaned = original.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
  const parsed = cleaned.startsWith("+")
    ? parsePhoneNumberFromString(cleaned)
    : parsePhoneNumberFromString(cleaned, "IN");
  if (parsed && parsed.isValid()) {
    const e164 = parsed.number;
    return {
      original,
      corrected: e164,
      name: r.name || "",
      valid: true,
      changed: e164 !== original,
    };
  }
  const fallback = cleaned || original;
  return {
    original,
    corrected: fallback,
    name: r.name || "",
    valid: false,
    changed: fallback !== original,
  };
}

/**
 * "Send now" creates a broadcast with status="scheduled" + scheduled_at=now;
 * the per-minute cron then dispatches it. Show such due broadcasts as "queued"
 * (not "scheduled", which is reserved for ones genuinely set for a future time).
 */
export function broadcastStatusLabel(
  status: string,
  scheduledAt: string | null,
): string {
  if (status === "scheduled") {
    const due = !scheduledAt || new Date(scheduledAt).getTime() <= Date.now();
    return due ? "queued" : "scheduled";
  }
  return status;
}

/** Tone for `StatusPill` given a display status. */
export function statusTone(label: string): "green" | "amber" | "outline" | "neutral" {
  switch (label) {
    case "completed":
      return "green";
    case "sending":
    case "queued":
    case "scheduled":
    case "paused":
      return "amber";
    case "failed":
      return "outline";
    default:
      return "neutral";
  }
}

/** Sentence-case a raw status for display ("sending" → "Sending"). */
export function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Format a Date as an `<input type="datetime-local">` value (LOCAL time,
 * "YYYY-MM-DDTHH:mm") — the schedule picker's min + sensible default.
 */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function fmtTime(s: string | null | undefined): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

/** Count distinct {{n}} placeholders in a BODY component, ordered ascending. */
export function bodyVarIndices(components: any[]): number[] {
  const body = (components || []).find((c) => c?.type === "BODY");
  const text: string = body?.text || "";
  const indices = new Set<number>();
  (text.match(/\{\{(\d+)\}\}/g) || []).forEach((m) => {
    const n = parseInt(m.replace(/[{}]/g, ""), 10);
    if (!isNaN(n)) indices.add(n);
  });
  return [...indices].sort((a, b) => a - b);
}

export function bodyText(components: any[]): string {
  return (components || []).find((c) => c?.type === "BODY")?.text || "";
}

/** Meta allows a single {{1}} in a TEXT header. */
export function headerHasVar(components: any[]): boolean {
  const h = (components || []).find((c) => c?.type === "HEADER");
  return h?.format === "TEXT" && /\{\{\d+\}\}/.test(h?.text || "");
}

/**
 * Media header type for the template (image/video/document) — the broadcast
 * must attach a media URL when present (sent as {<type>: { link }}).
 */
export function headerMediaType(
  components: any[],
): "image" | "video" | "document" | null {
  const h = (components || []).find((c) => c?.type === "HEADER");
  const fmt = String(h?.format || "").toUpperCase();
  return ["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)
    ? (fmt.toLowerCase() as "image" | "video" | "document")
    : null;
}

export function qualityLabel(rating: string | null | undefined): {
  text: string;
  cls: string;
} {
  switch ((rating || "").toUpperCase()) {
    case "GREEN":
      return {
        text: "High quality",
        cls: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
      };
    case "YELLOW":
      return {
        text: "Medium quality",
        cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
      };
    case "RED":
      return {
        text: "Low quality",
        cls: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
      };
    default:
      return {
        text: "Not rated",
        cls: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
      };
  }
}

export function tierLabel(tier: string | null | undefined): string {
  switch ((tier || "").toUpperCase()) {
    case "TIER_50":
      return "50 customers / day";
    case "TIER_250":
      return "250 customers / day";
    case "TIER_1K":
      return "1,000 customers / day";
    case "TIER_10K":
      return "10,000 customers / day";
    case "TIER_100K":
      return "100,000 customers / day";
    case "TIER_UNLIMITED":
      return "Unlimited";
    default:
      return "—";
  }
}

/** Pull the partner's customers (phone + name) from their non-cancelled orders. */
export const BROADCAST_CUSTOMERS_QUERY = `
  query BroadcastCustomers($partner_id: uuid!) {
    orders(
      where: { partner_id: { _eq: $partner_id }, status: { _neq: "cancelled" } }
      order_by: { created_at: desc }
      limit: 5000
    ) {
      phone
      user { full_name phone }
    }
  }
`;

/* ------------------------------------------------------------- class kit */

/** 36px text input / select face — same as the rest of admin-v3. */
export const INPUT =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-[11px] text-[13px] font-normal text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500";

/** 34px bordered button — the design's default toolbar control. */
export const CONTROL =
  "inline-flex h-[34px] shrink-0 items-center justify-center gap-[7px] whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

/** 11px uppercase caption above a stat value. */
export const FIELD_LABEL =
  "text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500";

/** Small form label inside the dialogs. */
export const FORM_LABEL =
  "text-[12.5px] font-medium leading-none text-zinc-700 dark:text-zinc-300";

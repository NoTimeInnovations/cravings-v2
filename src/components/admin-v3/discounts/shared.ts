import type { BxgyBuyType, BxgyRewardType } from "@/lib/bxgy";

/**
 * Types + pure helpers shared by the v3 Discounts list, editor and rules views.
 *
 * The row shape is admin-v2's verbatim — same table, same columns, same
 * `discountFields` selection — so a discount written by either dashboard reads
 * identically in the other.
 */

export type DiscountType = "percentage" | "flat" | "freebie" | "bxgy";

export interface Discount {
  id: string;
  code: string;
  description: string | null;
  terms_conditions: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  per_user_usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  valid_days: string | null;
  valid_time_from: string | null;
  valid_time_to: string | null;
  discount_order_types: string | null;
  discount_on_total: boolean;
  has_coupon: boolean;
  applicable_on: string | null;
  category_item_ids: string | null;
  rank: number | null;
  freebie_item_count: number | null;
  freebie_item_ids: string | null;
  pp_discount_id: string | null;
  pp_overwrite_enabled: boolean;
  show_on_storefront: boolean;
  show_in_checkout: boolean;
  banner_text: string | null;
  bxgy_buy_type: string | null;
  bxgy_buy_item_ids: string | null;
  bxgy_buy_quantity: number | null;
  bxgy_buy_value: number | null;
  bxgy_reward_type: string | null;
  bxgy_reward_value: number | null;
  bxgy_max_repeat: number | null;
  created_at: string;
}

export interface MenuItemLite {
  id: string;
  name: string;
  price: number;
}

/** The editor's draft. Everything numeric is a string until save. */
export interface DiscountForm {
  code: string;
  description: string;
  terms_conditions: string;
  discount_type: DiscountType;
  discount_value: string;
  min_order_value: string;
  max_discount_amount: string;
  usage_limit: string;
  per_user_usage_limit: string;
  starts_at: string;
  expires_at: string;
  discount_order_types: string[];
  discount_on_total: boolean;
  has_coupon: boolean;
  applicable_on: string;
  category_item_ids: string;
  rank: string;
  freebie_item_ids: string;
  freebie_item_count: string;
  show_on_storefront: boolean;
  show_in_checkout: boolean;
  banner_text: string;
  bxgy_buy_type: BxgyBuyType;
  bxgy_buy_item_ids: string;
  bxgy_buy_quantity: string;
  bxgy_buy_value: string;
  bxgy_reward_type: BxgyRewardType;
  bxgy_reward_value: string;
  bxgy_max_repeat: string;
}

export const EMPTY_FORM: DiscountForm = {
  code: "",
  description: "",
  terms_conditions: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_value: "",
  max_discount_amount: "",
  usage_limit: "",
  per_user_usage_limit: "",
  starts_at: "",
  expires_at: "",
  discount_order_types: ["1", "2", "3"],
  discount_on_total: true,
  has_coupon: true,
  applicable_on: "All",
  category_item_ids: "",
  rank: "",
  freebie_item_ids: "",
  freebie_item_count: "",
  show_on_storefront: true,
  show_in_checkout: true,
  banner_text: "",
  bxgy_buy_type: "items",
  bxgy_buy_item_ids: "",
  bxgy_buy_quantity: "2",
  bxgy_buy_value: "",
  bxgy_reward_type: "freebie",
  bxgy_reward_value: "",
  bxgy_max_repeat: "1",
};

export const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const ORDER_TYPES: { value: string; label: string }[] = [
  { value: "1", label: "Delivery" },
  { value: "2", label: "Pickup" },
  { value: "3", label: "Dine-in" },
];

export function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** ISO → the `datetime-local` input's value, in the browser's own offset. */
export function toLocalDatetime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/** now + n days, as a `datetime-local` value. */
export function localDatetimeIn(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function formatOrderTypes(types: string | null): string {
  if (!types) return "All";
  const map: Record<string, string> = { "1": "Delivery", "2": "Pickup", "3": "Dine-in" };
  return types
    .split(",")
    .map((t) => map[t.trim()] || t.trim())
    .filter(Boolean)
    .join(", ");
}

export function daysOf(validDays: string | null): string[] {
  if (!validDays || validDays === "All") return [];
  return validDays
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

export function isExpired(d: Discount, now = Date.now()): boolean {
  return !!d.expires_at && new Date(d.expires_at).getTime() < now;
}

export function isScheduled(d: Discount, now = Date.now()): boolean {
  return !!d.starts_at && new Date(d.starts_at).getTime() > now;
}

export function isLimitReached(d: Discount): boolean {
  return d.usage_limit != null && d.used_count >= d.usage_limit;
}

/** Short human label for the discount's value — the grey chip beside the code. */
export function valueLabel(d: Discount, currency: string, bxgyText?: string): string {
  if (d.discount_type === "bxgy") return bxgyText || "Buy X get Y";
  if (d.discount_type === "freebie") {
    const n = d.freebie_item_count ?? 1;
    return n > 1 ? `Free item ×${n}` : "Free item";
  }
  if (d.discount_type === "percentage") return `${d.discount_value}% off`;
  return `${currency}${d.discount_value} off`;
}

/** Date range as the design writes it: "3 Mar → 5 Mar 2026". */
export function rangeLabel(
  startsAt: string | null,
  expiresAt: string | null,
  tz: string,
): string | null {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  };
  const from = startsAt ? fmt(startsAt) : null;
  const to = expiresAt ? fmt(expiresAt) : null;
  if (from && to) return `${from} → ${to}`;
  if (to) return `Until ${to}`;
  if (from) return `From ${from}`;
  return null;
}

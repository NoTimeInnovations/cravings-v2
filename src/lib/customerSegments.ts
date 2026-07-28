/**
 * Customer segmentation for the admin-v2 Customers screen.
 *
 * Seven mutually-exclusive segments derived from RFM (recency / frequency /
 * monetary) — every customer lands in exactly one, so the chip counts always
 * add up to the total. The definitions live here (not in the component) so the
 * table, the info panel and the spreadsheet export can never drift apart.
 */

/** A customer is "active" if they ordered within this many days. */
export const ACTIVE_DAYS = 30;
/** Past this, a repeat customer is considered gone rather than just quiet. */
export const LAPSED_DAYS = 90;
/** A single-order customer who hasn't returned in this long never came back. */
export const ONE_AND_DONE_DAYS = 30;
/** "Regulars" start at this many lifetime orders. */
export const REGULAR_MIN_ORDERS = 5;
/** Top N% by lifetime spend qualify as VIP. */
export const VIP_TOP_PERCENT = 10;

export type SegmentId =
  | "vip"
  | "regulars"
  | "repeat"
  | "new"
  | "at_risk"
  | "one_and_done"
  | "lapsed";

export interface SegmentMeta {
  id: SegmentId;
  label: string;
  /** Shown in the info panel — the exact rule, in plain language. */
  definition: string;
  /** Why a restaurant should care / what to do about it. */
  action: string;
  /** Tailwind classes for the chip + row badge. */
  className: string;
}

export const SEGMENTS: SegmentMeta[] = [
  {
    id: "vip",
    label: "VIPs",
    definition: `Top ${VIP_TOP_PERCENT}% by lifetime spend, with 2+ orders, who haven't gone quiet for more than ${LAPSED_DAYS} days.`,
    action: "Your best customers. Give them perks and early access — don't waste discounts on people already paying full price.",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  },
  {
    id: "regulars",
    label: "Regulars",
    definition: `${REGULAR_MIN_ORDERS}+ orders and ordered within the last ${ACTIVE_DAYS} days.`,
    action: "Your base. Protect the experience; they need reminders far less than they need consistency.",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
  {
    id: "repeat",
    label: "Repeat",
    definition: `2–${REGULAR_MIN_ORDERS - 1} orders and ordered within the last ${ACTIVE_DAYS} days.`,
    action: "Building a habit. A well-timed nudge here is what turns them into regulars.",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  {
    id: "new",
    label: "New",
    definition: `Exactly 1 order, placed within the last ${ACTIVE_DAYS} days.`,
    action: "Getting the second order is the highest-leverage moment you have. Follow up while you're still remembered.",
    className: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  },
  {
    id: "at_risk",
    label: "At risk",
    definition: `2+ orders, but nothing in ${ACTIVE_DAYS}–${LAPSED_DAYS} days.`,
    action: "They used to come back and stopped. Cheapest customers you will ever save — reach them before they lapse.",
    className: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  },
  {
    id: "one_and_done",
    label: "One-and-done",
    definition: `Exactly 1 order, and nothing since — more than ${ONE_AND_DONE_DAYS} days ago.`,
    action: "Tried you once and never returned. A large count here points at the first experience, not at marketing.",
    className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  },
  {
    id: "lapsed",
    label: "Lapsed",
    definition: `2+ orders, but nothing in over ${LAPSED_DAYS} days.`,
    action: "Gone, but they liked you once. Worth a win-back offer — and worth asking what changed.",
    className: "bg-rose-100 text-rose-800 hover:bg-rose-100",
  },
];

export const SEGMENT_BY_ID = new Map(SEGMENTS.map((s) => [s.id, s]));

/** Order-type buckets. `type` alone can't tell delivery from takeaway — both are
 *  stored as "delivery"; only the presence of a drop address separates them. */
export type OrderTypeId = "delivery" | "takeaway" | "dine_in" | "counter";

export const ORDER_TYPE_LABELS: Record<OrderTypeId, string> = {
  delivery: "Delivery",
  takeaway: "Takeaway",
  dine_in: "Dine-in",
  counter: "Counter / POS",
};

export function bucketOrderType(type?: string | null, deliveryAddress?: string | null): OrderTypeId {
  const t = (type || "").toLowerCase();
  if (t === "pos") return "counter";
  if (t.includes("table") || t.includes("dinein")) return "dine_in";
  // Takeaway is persisted as "delivery" with no drop address (verified in prod:
  // 7.7k such rows vs 6.1k with an address), so the address is the discriminator.
  return deliveryAddress ? "delivery" : "takeaway";
}

export type ChannelId = "whatsapp" | "app" | "web" | "other";

export const CHANNEL_LABELS: Record<ChannelId, string> = {
  whatsapp: "WhatsApp",
  app: "App",
  web: "Web",
  other: "Other / in-store",
};

export function bucketChannel(orderChannel?: string | null): ChannelId {
  const c = (orderChannel || "").toLowerCase();
  if (c === "whatsapp") return "whatsapp";
  if (c === "app") return "app";
  if (c === "web") return "web";
  // Most rows predate order_channel or came from the POS, so they aren't a
  // customer-facing channel at all — bucketed rather than dropped.
  return "other";
}

/** Share of a customer's orders that carried a discount, at or above which we
 *  call them discount-dependent. */
export const DISCOUNT_DEPENDENT_RATIO = 0.5;

export interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  /** ms epoch */
  lastOrderAt: number;
  discountedOrders: number;
}

/**
 * Assign the single primary segment. Order of checks IS the priority:
 * VIP first (a big spender is a VIP whether or not they're also "at risk"),
 * then the active tiers, then the dormant ones.
 *
 * `vipSpendFloor` comes from the cohort (see computeVipFloor) — it is a
 * percentile across THIS restaurant's customers, not an absolute rupee amount,
 * so it means the same thing for a tiffin counter and a fine-dining room.
 */
export function assignSegment(
  c: CustomerStats,
  vipSpendFloor: number,
  now: number = Date.now(),
): SegmentId {
  const days = (now - c.lastOrderAt) / 86_400_000;

  if (c.totalOrders >= 2 && days <= LAPSED_DAYS && vipSpendFloor > 0 && c.totalSpent >= vipSpendFloor) {
    return "vip";
  }
  if (days <= ACTIVE_DAYS) {
    if (c.totalOrders >= REGULAR_MIN_ORDERS) return "regulars";
    if (c.totalOrders >= 2) return "repeat";
    return "new";
  }
  // Dormant. Single-order customers are called out separately from lapsed
  // repeat customers: "never came back after one try" is a different problem
  // (and a different fix) from "was a regular and drifted away".
  if (c.totalOrders === 1) {
    return days > ONE_AND_DONE_DAYS ? "one_and_done" : "new";
  }
  return days > LAPSED_DAYS ? "lapsed" : "at_risk";
}

/**
 * Lifetime-spend threshold for the top VIP_TOP_PERCENT of repeat customers.
 * Returns 0 when the cohort is too small to rank meaningfully, which makes
 * assignSegment skip the VIP tier entirely rather than crowning someone on
 * the strength of two orders.
 */
export function computeVipFloor(customers: CustomerStats[]): number {
  const eligible = customers.filter((c) => c.totalOrders >= 2).map((c) => c.totalSpent);
  if (eligible.length < 10) return 0;
  eligible.sort((a, b) => b - a);
  const cutIndex = Math.max(0, Math.ceil((eligible.length * VIP_TOP_PERCENT) / 100) - 1);
  return eligible[cutIndex] ?? 0;
}

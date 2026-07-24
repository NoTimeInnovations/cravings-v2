/**
 * Loyalty configuration + pure math helpers.
 *
 * CLIENT-SAFE: this module contains no secrets and no node crypto, so it can be
 * imported from both client components (settings form, checkout) and server
 * actions. All ledger signing lives in the server-only `./ledger` module.
 *
 * Money model (locked for this build): 1 point = ₹`point_value` (default ₹1).
 * Earning is `earn_percent`% of the order total, floored to whole points.
 */

export type LoyaltyTxnType =
  | "earn"
  | "redeem"
  | "refund"
  | "adjust_credit"
  | "adjust_debit";

/** Signed sign of the balance delta implied by each transaction type. */
export const DELTA_SIGN: Record<LoyaltyTxnType, 1 | -1> = {
  earn: 1,
  refund: 1,
  adjust_credit: 1,
  redeem: -1,
  adjust_debit: -1,
};

export interface LoyaltySettings {
  /** % of the order total awarded as points on completion (1 point = ₹point_value). */
  earn_percent: number;
  /** Minimum order total (₹) required to earn any points. */
  min_order_amount: number;
  /** Max % of an order's bill that may be paid with points. */
  max_redeem_percent: number;
  /** Minimum points a customer must spend to redeem on an order. */
  min_redeem_points: number;
  /** ₹ value of one point. Fixed at 1 in this build but kept configurable internally. */
  point_value: number;
}

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  earn_percent: 2,
  min_order_amount: 0,
  max_redeem_percent: 100,
  min_redeem_points: 1,
  point_value: 1,
};

// ---------------------------------------------------------------------------
// Per-order-type loyalty (delivery / takeaway / dine_in). Each order type has
// its OWN rules + its OWN on/off toggle; point_value stays global. Stored in
// partners.loyalty_settings as { point_value, per_type: { delivery, takeaway,
// dine_in } }. Legacy flat rows (no per_type) are read as the same values for
// all three types, all enabled — so existing partners are unchanged.
// ---------------------------------------------------------------------------

export type LoyaltyOrderType = "delivery" | "takeaway" | "dine_in";

export const LOYALTY_ORDER_TYPES: LoyaltyOrderType[] = [
  "delivery",
  "takeaway",
  "dine_in",
];

/** Per-order-type loyalty rules (everything except the global point_value). */
export interface PerTypeLoyalty {
  /** When false, this order type earns AND redeems nothing. */
  enabled: boolean;
  earn_percent: number;
  min_order_amount: number;
  max_redeem_percent: number;
  min_redeem_points: number;
}

/** The on-disk loyalty_settings shape: a global point_value + one rules block per order type. */
export interface LoyaltySettingsV2 {
  point_value: number;
  per_type: Record<LoyaltyOrderType, PerTypeLoyalty>;
}

export const DEFAULT_PER_TYPE: PerTypeLoyalty = {
  enabled: true,
  earn_percent: DEFAULT_LOYALTY_SETTINGS.earn_percent,
  min_order_amount: DEFAULT_LOYALTY_SETTINGS.min_order_amount,
  max_redeem_percent: DEFAULT_LOYALTY_SETTINGS.max_redeem_percent,
  min_redeem_points: DEFAULT_LOYALTY_SETTINGS.min_redeem_points,
};

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Parse the partner's `loyalty_settings` JSON column into a fully-populated config. */
export function parseLoyaltySettings(raw: string | null | undefined): LoyaltySettings {
  if (!raw) return { ...DEFAULT_LOYALTY_SETTINGS };
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : (raw as any);
    return {
      earn_percent: clampNum(o.earn_percent, 0, 100, DEFAULT_LOYALTY_SETTINGS.earn_percent),
      min_order_amount: clampNum(o.min_order_amount, 0, 1e9, DEFAULT_LOYALTY_SETTINGS.min_order_amount),
      max_redeem_percent: clampNum(o.max_redeem_percent, 0, 100, DEFAULT_LOYALTY_SETTINGS.max_redeem_percent),
      min_redeem_points: Math.round(clampNum(o.min_redeem_points, 0, 1e9, DEFAULT_LOYALTY_SETTINGS.min_redeem_points)),
      point_value: clampNum(o.point_value, 0.01, 1e6, DEFAULT_LOYALTY_SETTINGS.point_value),
    };
  } catch {
    return { ...DEFAULT_LOYALTY_SETTINGS };
  }
}

export function serializeLoyaltySettings(s: LoyaltySettings): string {
  return JSON.stringify(s);
}

/** Parse loyalty_settings into the per-type shape. Accepts BOTH the new nested
 *  shape and the legacy flat shape (flat = the same rules for all 3 types, all
 *  enabled), so existing partners keep their exact behaviour. */
export function parseLoyaltySettingsV2(raw: string | null | undefined): LoyaltySettingsV2 {
  const parseType = (o: any, base: PerTypeLoyalty): PerTypeLoyalty => ({
    enabled: o?.enabled !== false,
    earn_percent: clampNum(o?.earn_percent, 0, 100, base.earn_percent),
    min_order_amount: clampNum(o?.min_order_amount, 0, 1e9, base.min_order_amount),
    max_redeem_percent: clampNum(o?.max_redeem_percent, 0, 100, base.max_redeem_percent),
    min_redeem_points: Math.round(clampNum(o?.min_redeem_points, 0, 1e9, base.min_redeem_points)),
  });
  const allTypes = (block: PerTypeLoyalty): Record<LoyaltyOrderType, PerTypeLoyalty> => ({
    delivery: { ...block },
    takeaway: { ...block },
    dine_in: { ...block },
  });
  if (!raw) {
    return { point_value: DEFAULT_LOYALTY_SETTINGS.point_value, per_type: allTypes(DEFAULT_PER_TYPE) };
  }
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : (raw as any);
    const point_value = clampNum(o?.point_value, 0.01, 1e6, DEFAULT_LOYALTY_SETTINGS.point_value);
    if (o?.per_type && typeof o.per_type === "object") {
      return {
        point_value,
        per_type: {
          delivery: parseType(o.per_type.delivery, DEFAULT_PER_TYPE),
          takeaway: parseType(o.per_type.takeaway, DEFAULT_PER_TYPE),
          dine_in: parseType(o.per_type.dine_in, DEFAULT_PER_TYPE),
        },
      };
    }
    // Legacy flat row → fan the flat fields out to all three types, all enabled.
    return { point_value, per_type: allTypes(parseType(o, DEFAULT_PER_TYPE)) };
  } catch {
    return { point_value: DEFAULT_LOYALTY_SETTINGS.point_value, per_type: allTypes(DEFAULT_PER_TYPE) };
  }
}

export function serializeLoyaltySettingsV2(s: LoyaltySettingsV2): string {
  return JSON.stringify(s);
}

/** Resolve the flat LoyaltySettings (per-type rules + global point_value) the
 *  math helpers expect, for one order type, plus that type's enabled flag. */
export function resolveLoyaltyForType(
  v2: LoyaltySettingsV2,
  orderType: LoyaltyOrderType,
): { enabled: boolean; settings: LoyaltySettings } {
  const t = v2.per_type[orderType] ?? v2.per_type.delivery ?? DEFAULT_PER_TYPE;
  return {
    enabled: t.enabled !== false,
    settings: {
      earn_percent: t.earn_percent,
      min_order_amount: t.min_order_amount,
      max_redeem_percent: t.max_redeem_percent,
      min_redeem_points: t.min_redeem_points,
      point_value: v2.point_value,
    },
  };
}

/** True when at least one order type has loyalty enabled (for order-type-agnostic
 *  surfaces like the balance badge). */
export function anyLoyaltyTypeEnabled(v2: LoyaltySettingsV2): boolean {
  return LOYALTY_ORDER_TYPES.some((t) => v2.per_type[t].enabled);
}

/** Map an order row's stored type + delivery address to the logical loyalty
 *  order type. Storefront/POS both persist takeaway AND delivery as
 *  type="delivery" (takeaway has no delivery_address); dine-in is stored as
 *  "table_order" (storefront) or "pos". Unknown/legacy → "delivery". */
export function deriveLoyaltyOrderType(
  type: string | null | undefined,
  deliveryAddress: string | null | undefined,
  deliveryLocation?: { coordinates?: unknown } | null,
): LoyaltyOrderType {
  if (type === "table_order" || type === "pos" || type === "dine_in") return "dine_in";
  if (type === "delivery") {
    // Delivery and takeaway both persist as type="delivery"; only delivery has a
    // real destination. Don't rely on the address text alone — it is
    // print-sanitized, so a non-Latin address can be emptied to "" — also accept
    // real (non-[0,0]) delivery_location coordinates as the delivery signal.
    const hasAddr = !!(deliveryAddress && String(deliveryAddress).trim());
    const coords = (deliveryLocation as { coordinates?: unknown } | null | undefined)?.coordinates;
    const hasCoords =
      Array.isArray(coords) &&
      coords.length === 2 &&
      Number.isFinite(Number(coords[0])) &&
      Number.isFinite(Number(coords[1])) &&
      (Number(coords[0]) !== 0 || Number(coords[1]) !== 0);
    return hasAddr || hasCoords ? "delivery" : "takeaway";
  }
  return "delivery";
}

/** Whole points earned for a completed order total (floored). */
export function computeEarnPoints(orderTotal: number, s: LoyaltySettings): number {
  if (!isFinite(orderTotal) || orderTotal <= 0) return 0;
  if (orderTotal < s.min_order_amount) return 0;
  const pv = s.point_value > 0 ? s.point_value : 1;
  return Math.max(0, Math.floor((orderTotal * s.earn_percent) / 100 / pv));
}

/**
 * Max whole points a customer can apply to one order, bounded by:
 *  - their available balance, and
 *  - `max_redeem_percent` of the order's pre-redemption total.
 * Returns 0 when below `min_redeem_points` so the UI can hide the option.
 */
export function computeMaxRedeemable(
  orderTotalBeforeRedeem: number,
  balance: number,
  s: LoyaltySettings
): number {
  if (balance <= 0 || !isFinite(orderTotalBeforeRedeem) || orderTotalBeforeRedeem <= 0) return 0;
  const pv = s.point_value > 0 ? s.point_value : 1;
  const capByBill = Math.floor((orderTotalBeforeRedeem * s.max_redeem_percent) / 100 / pv);
  const max = Math.max(0, Math.min(Math.floor(balance), capByBill));
  return max < s.min_redeem_points ? 0 : max;
}

/** ₹ value of a number of points. */
export function pointsToValue(points: number, s: LoyaltySettings): number {
  const pv = s.point_value > 0 ? s.point_value : 1;
  const v = Math.max(0, Math.floor(points)) * pv;
  // Round to 2 dp to avoid float dust in the payable amount.
  return Math.round(v * 100) / 100;
}

// ---------------------------------------------------------------------------
// Display shapes returned by the loyalty server actions (client-safe).
// ---------------------------------------------------------------------------

/** Current customer's standing at one partner. */
export interface LoyaltyBalanceView {
  enabled: boolean;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  pointValue: number;
}

/** One ledger entry, customer-facing. */
export interface LoyaltyTxnView {
  id: string;
  type: LoyaltyTxnType;
  delta: number;
  balanceAfter: number;
  createdAt: string;
  note: string | null;
  orderId: string | null;
  orderDisplayId: string | null;
}

/** A customer row in the partner's loyalty admin list. */
export interface LoyaltyMemberView {
  userId: string;
  name: string;
  phone: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: string;
  flagged: boolean;
}

/** Headline numbers for the partner loyalty dashboard. */
export interface LoyaltyPartnerSummary {
  members: number;
  outstandingPoints: number;
  outstandingValue: number;
  lifetimeIssued: number;
  lifetimeRedeemed: number;
}

/** Result of applying points to an order (authoritative, server-computed). */
export interface RedeemResult {
  ok: boolean;
  points: number;
  value: number;
  /** Order total after the (possibly clamped) redemption was applied. */
  orderTotal: number;
  newBalance: number;
  message?: string;
}

/** Human label for a transaction type. */
export function loyaltyTxnLabel(type: LoyaltyTxnType): string {
  switch (type) {
    case "earn":
      return "Earned";
    case "redeem":
      return "Redeemed";
    case "refund":
      return "Refunded";
    case "adjust_credit":
      return "Added by store";
    case "adjust_debit":
      return "Removed by store";
    default:
      return type;
  }
}

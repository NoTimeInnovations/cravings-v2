import { getFeatures } from "@/lib/getFeatures";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";

/**
 * Can this storefront take an order right now, and through which channel?
 *
 * This is the CHANNEL gate — feature flags, table context and the partner's
 * opening windows. It deliberately says nothing about a specific item (stock,
 * price, availability): those rules legitimately differ between menu styles,
 * and each card keeps its own. The channel rule does NOT differ, and that is
 * exactly why it lives here.
 *
 * It exists because it was previously inlined in eleven places — six item cards
 * and four search overlays — and they drifted. V3SearchItems and V6SearchItems
 * checked the feature flag and the table but never the opening windows, so a
 * closed restaurant showed an ADD button in search while the menu behind it
 * correctly showed none. Three more callers passed no timezone and silently
 * evaluated the partner's hours in the CUSTOMER's zone.
 *
 * A customer who adds from search and then can't check out is a worse outcome
 * than one who never saw the button, so search must be at least as strict as
 * the menu — never looser.
 */

export interface OrderingChannelsInput {
  /** CSV feature-flag string; several cards receive this as a prop rather than
   *  off the hotel row, so it is passed explicitly. */
  featureFlags?: string | null;
  deliveryRules?: {
    isDeliveryActive?: boolean | null;
    delivery_time_allowed?: { from: string; to: string } | null;
    takeaway_time_allowed?: { from: string; to: string } | null;
  } | null;
  /** IANA zone off the partner row. Absent falls back to Asia/Kolkata, which is
   *  what isWithinTimeWindow already defaulted to — so omitting it can never
   *  change behaviour for an Indian partner, only fix it for everyone else. */
  timezone?: string | null;
  /** 0 = not seated at a table (storefront / delivery / takeaway browsing).
   *  Non-zero = scanned a table QR, i.e. physically in the restaurant. */
  tableNumber: number;
}

export interface OrderingChannels {
  hasOrderingFeature: boolean;
  hasDeliveryFeature: boolean;
  /** Either channel is open — the usual gate for showing an ADD button. */
  canOrder: boolean;
  isDeliveryTimeOpen: boolean;
  isTakeawayTimeOpen: boolean;
}

export function orderingChannels({
  featureFlags,
  deliveryRules,
  timezone,
  tableNumber,
}: OrderingChannelsInput): OrderingChannels {
  const features = getFeatures(featureFlags || "");
  const tz = timezone || "Asia/Kolkata";

  // isDeliveryActive is the partner's manual "delivery off" switch and is
  // folded in here rather than at the call site — every caller that checked the
  // window also needed this, and the two that forgot it let a partner who had
  // switched delivery off still collect delivery orders.
  const isDeliveryTimeOpen =
    deliveryRules?.isDeliveryActive !== false &&
    isWithinTimeWindow(deliveryRules?.delivery_time_allowed, tz);
  const isTakeawayTimeOpen = isWithinTimeWindow(
    deliveryRules?.takeaway_time_allowed,
    tz,
  );

  // A seated customer (tableNumber !== 0) bypasses the takeaway window on
  // purpose: they are already inside the restaurant, so counter hours are not
  // their constraint. Off-table, the takeaway window is what gates ordering.
  const hasOrderingFeature =
    !!features?.ordering?.enabled && (tableNumber !== 0 || isTakeawayTimeOpen);
  const hasDeliveryFeature =
    !!features?.delivery?.enabled && tableNumber === 0 && isDeliveryTimeOpen;

  return {
    hasOrderingFeature,
    hasDeliveryFeature,
    canOrder: hasOrderingFeature || hasDeliveryFeature,
    isDeliveryTimeOpen,
    isTakeawayTimeOpen,
  };
}

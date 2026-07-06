// Single source of truth for the packaging/parcel charge shown at checkout and
// saved with the order. Both checkout modals (V1 PlaceOrderModal, V2
// PlaceOrderModalV2) use this so the displayed charge and the persisted charge
// can never diverge.
//
// In "itemwise" mode the real amounts live in `parcel_charge_items` (keyed by
// base menu id) and `parcel_charge` is only the DEFAULT for items not listed
// there. So a partner can legitimately set parcel_charge=0 yet still charge a
// few items (e.g. Chick & Co: default 0, one item ₹10). The old guard
// `parcel_charge > 0` short-circuited the whole calculation for those partners,
// hiding the charge entirely — this computes it from the cart instead.

export type ParcelCartItem = { id: string; quantity: number };

export function computeParcelCharge(
  rules: any,
  cart: ParcelCartItem[] | undefined | null,
): number {
  if (!rules) return 0;
  const chargeType = rules.parcel_charge_type || "fixed";
  const defaultCharge = Number(rules.parcel_charge) || 0;
  const customCharges = rules.parcel_charge_items || {};
  const hasItemwiseCustom =
    chargeType === "itemwise" && Object.keys(customCharges).length > 0;
  // Nothing configured (no default, no per-item overrides) → no charge.
  if (defaultCharge <= 0 && !hasItemwiseCustom) return 0;

  if (chargeType === "itemwise") {
    return (cart || []).reduce((acc, item) => {
      const charge = customCharges[item.id.split("|")[0]] ?? defaultCharge;
      return acc + charge * item.quantity;
    }, 0);
  }
  const itemCount = (cart || []).reduce((a, i) => a + i.quantity, 0);
  return chargeType === "variable" ? itemCount * defaultCharge : defaultCharge;
}

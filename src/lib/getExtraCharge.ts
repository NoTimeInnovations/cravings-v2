import { PricingRule } from "@/app/admin/qr-management/page";
import { OrderItem } from "@/store/orderStore";

export const getExtraCharge = (
  items: OrderItem[],
  extraCharge: PricingRule[] | number,
  chargeType: "PER_ITEM" | "FLAT_FEE"
) => {
  if (!extraCharge || items.length === 0) return 0;

  // Handle backward compatibility for old numeric format
  if (typeof extraCharge === "number") {
    if (extraCharge <= 0) return 0;
    return chargeType === "PER_ITEM"
      ? items.reduce((acc, item) => acc + item.quantity, 0) * extraCharge
      : extraCharge;
  }

  // Handle new step-based pricing format
  if (!Array.isArray(extraCharge) || extraCharge.length === 0) return 0;

  // Calculate the subtotal of all items
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Find the appropriate pricing rule based on the subtotal
  const applicableRule = extraCharge.find((rule) => {
    const meetsMinimum = subtotal >= rule.min_amount;
    const meetsMaximum =
      rule.max_amount === null || subtotal <= rule.max_amount;
    return meetsMinimum && meetsMaximum;
  });

  if (!applicableRule || applicableRule.charge <= 0) return 0;

  // Apply the charge based on the charge type
  return chargeType === "PER_ITEM"
    ? items.reduce((acc, item) => acc + item.quantity, 0) *
        applicableRule.charge
    : applicableRule.charge;
};

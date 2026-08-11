"use client";

import React from "react";
import { Truck, Sparkles } from "lucide-react";
import { MenuPrice } from "@/components/hotelDetail/MenuPrice";
import { freeDeliveryConfig, type DeliveryBenefit } from "@/lib/freeDelivery";
import { progressPct, deliverySavings } from "@/lib/deliveryBenefitDisplay";
import type { DeliveryRules } from "@/store/orderStore";

/**
 * The conversion nudge: "Add ₹120 more for free delivery", with a progress bar
 * that fills as the cart grows — and a resting celebratory line once the perk is
 * unlocked. The single most sales-driving element of this feature.
 *
 * Renders nothing when the perk isn't configured, when the drop is beyond the
 * distance cap (amountToUnlock is 0 and it can never qualify — don't tease), or
 * for non-delivery orders (the caller gates on orderType). Consumes the same
 * DeliveryBenefit the checkout already computed, so the bar and the fee can't
 * disagree.
 */
export function FreeDeliveryNudge({
  rules,
  benefit,
  subtotal,
  currency,
  accent,
  className = "",
}: {
  rules: DeliveryRules | null | undefined;
  benefit: DeliveryBenefit;
  subtotal: number;
  currency?: string | null;
  accent: string;
  className?: string;
}) {
  const cfg = freeDeliveryConfig(rules);
  if (!cfg) return null;

  const reduced = cfg.mode === "reduced";

  const wrapperClass = `rounded-2xl px-3 py-2.5 ${className}`;
  const wrapperStyle = { backgroundColor: `${accent}14` } as React.CSSProperties;

  const Bar = ({ pct }: { pct: number }) => (
    <div
      className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: `${accent}26` }}
    >
      <div
        className="h-full origin-left rounded-full transition-transform duration-500 ease-out"
        style={{ backgroundColor: accent, transform: `scaleX(${Math.max(0, Math.min(1, pct / 100))})` }}
      />
    </div>
  );

  // Unlocked → resting celebratory state.
  if (benefit.qualifies) {
    const saved = deliverySavings(benefit);
    return (
      <div className={wrapperClass} style={wrapperStyle}>
        <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: accent }}>
          <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2.4} />
          <span>
            {reduced && saved > 0 ? (
              <>
                You saved <MenuPrice currency={currency} amount={saved.toFixed(0)} /> on delivery
              </>
            ) : (
              "Free delivery unlocked!"
            )}
          </span>
        </div>
        <Bar pct={100} />
      </div>
    );
  }

  // Reachable → the "add more" nudge.
  if (benefit.amountToUnlock > 0) {
    return (
      <div className={wrapperClass} style={wrapperStyle}>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
          <Truck className="h-4 w-4 shrink-0" style={{ color: accent }} strokeWidth={2.2} />
          <span>
            Add{" "}
            <span className="font-extrabold" style={{ color: accent }}>
              <MenuPrice currency={currency} amount={benefit.amountToUnlock.toFixed(0)} />
            </span>{" "}
            more{" "}
            {reduced ? (
              <>
                for{" "}
                <span className="font-extrabold" style={{ color: accent }}>
                  <MenuPrice currency={currency} amount={cfg.discount.toFixed(0)} />
                </span>{" "}
                off delivery
              </>
            ) : (
              "for free delivery"
            )}
          </span>
        </div>
        <Bar pct={progressPct(subtotal, cfg.minOrder)} />
      </div>
    );
  }

  return null;
}

export default FreeDeliveryNudge;

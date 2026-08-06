"use client";

import React from "react";
import { MenuPrice } from "@/components/hotelDetail/MenuPrice";
import { FreeBadge } from "./FreeBadge";
import type { DeliveryBenefitKind } from "@/lib/freeDelivery";

/**
 * The VALUE cell of a checkout "Delivery Charges" row. Drops into each of the
 * three delivery rows (own-pricing / delivery-agent / Porter) so all of them get
 * the same free/reduced treatment without disturbing their differing guards and
 * distance/ETA sub-labels.
 *
 * - free    → original fee struck through + the animated FREE badge
 * - reduced → original struck through + the reduced fee in the accent colour
 * - none    → today's behaviour (plain amount, or "Free" when the fee is 0 for
 *             any other reason, e.g. a range-gap or hidden charge)
 */
export function DeliveryFeeValue({
  benefit,
  originalFare,
  finalFare,
  currency,
  accent,
}: {
  benefit: DeliveryBenefitKind;
  originalFare: number;
  finalFare: number;
  currency?: string | null;
  accent: string;
}) {
  if (benefit === "free") {
    return (
      <span className="inline-flex items-center gap-1.5">
        {originalFare > 0 && (
          <span className="text-gray-400 line-through">
            <MenuPrice currency={currency} amount={originalFare.toFixed(0)} />
          </span>
        )}
        <FreeBadge accent={accent} />
      </span>
    );
  }

  if (benefit === "reduced") {
    return (
      <span className="inline-flex items-center gap-1.5">
        {originalFare > finalFare && (
          <span className="text-gray-400 line-through">
            <MenuPrice currency={currency} amount={originalFare.toFixed(0)} />
          </span>
        )}
        <span className="font-semibold" style={{ color: accent }}>
          <MenuPrice currency={currency} amount={finalFare.toFixed(0)} />
        </span>
      </span>
    );
  }

  // benefit === "none"
  if (finalFare > 0) {
    return (
      <span className="text-gray-900">
        <MenuPrice currency={currency} amount={finalFare.toFixed(0)} />
      </span>
    );
  }
  return (
    <span className="font-semibold" style={{ color: accent }}>
      Free
    </span>
  );
}

export default DeliveryFeeValue;

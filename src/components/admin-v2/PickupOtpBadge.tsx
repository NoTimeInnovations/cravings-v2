"use client";

import { KeyRound } from "lucide-react";

/**
 * Compact pickup-OTP chip for the admin order list rows. Reads the handover PIN
 * that the delivery-bridge booking exposes (Rapido sets a 4-digit pickup PIN at
 * book time; persisted onto the order's `delivery_provider_meta.pickupPin` by
 * getDispatchProgress). Renders nothing unless a pin is present and the order is
 * still in flight. Admin-only — never shown on the customer order page.
 */
export function PickupOtpBadge({
  meta,
  status,
  className = "",
}: {
  meta?: { pickupPin?: string | null; [k: string]: unknown } | null;
  status?: string | null;
  className?: string;
}) {
  const pin = meta?.pickupPin;
  if (!pin) return null;
  if (status === "completed" || status === "cancelled") return null;
  return (
    <span
      className={`inline-flex w-fit self-start items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ${className}`}
      title="Give this OTP to the delivery rider at pickup"
    >
      <KeyRound className="h-3 w-3 flex-shrink-0" />
      Pickup OTP
      <span className="font-mono font-bold tracking-widest text-amber-900">
        {pin}
      </span>
    </span>
  );
}

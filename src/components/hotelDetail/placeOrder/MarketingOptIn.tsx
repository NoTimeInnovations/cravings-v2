"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Opt-in to hear from this restaurant on WhatsApp.
 *
 * Unticked by default, and it never blocks the order — consent that is a
 * condition of checking out is not consent. It names the specific restaurant
 * rather than "our partners", because that is the thing being agreed to, and the
 * wording shown here is stored with the record.
 *
 * Written the moment the box is ticked rather than when the order is placed:
 * ticking IS the act of consenting, and it keeps this out of the three separate
 * payment paths in the checkout modal.
 */
export function MarketingOptIn({
  partnerId,
  phone,
  storeName,
}: {
  partnerId?: string | null;
  phone?: string | null;
  storeName?: string | null;
}) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  // Nothing to attach consent to without both a restaurant and a number.
  if (!partnerId || !phone) return null;

  const label = `Send me offers and updates from ${storeName || "this restaurant"} on WhatsApp`;

  const toggle = async (next: boolean) => {
    setChecked(next);
    setSaving(true);
    try {
      await fetch("/api/marketing-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          phone,
          granted: next,
          consentText: label,
          source: "checkout",
        }),
      });
    } catch {
      // Silent by design: this must never get between a customer and their order.
      // An unrecorded opt-in simply means they are not messaged, which is the
      // safe direction to fail in.
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className="flex cursor-pointer items-start gap-2.5 py-2 text-left">
      <Checkbox
        checked={checked}
        disabled={saving}
        onCheckedChange={(v) => toggle(v === true)}
        className="mt-0.5"
      />
      <span className="text-xs leading-relaxed text-gray-500">
        {label}. You can stop them anytime by replying STOP.
      </span>
    </label>
  );
}

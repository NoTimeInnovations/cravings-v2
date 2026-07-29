"use client";

import { useEffect, useRef } from "react";

/**
 * Marketing consent, recorded implicitly.
 *
 * There is no checkbox: the partner's decision is that ordering from a
 * restaurant is itself agreement to hear from that restaurant, so consent
 * defaults to granted rather than being asked for.
 *
 * The record is still written, and written HONESTLY — source "checkout_implied"
 * and a consent_text that says it was implied by placing an order, never that a
 * box was ticked. If this is ever questioned, the row should describe what
 * actually happened.
 *
 * Renders nothing. It stays mounted in both checkout modals because that is the
 * one place where a partner and a customer phone are both in hand.
 *
 * Still per-restaurant: this grants consent for THIS partner only, which is what
 * keeps the shared-number case safe — 32 partners send from one WhatsApp number,
 * and ordering from one of them is not agreement to hear from the other 31.
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
  // Once per mount per (partner, phone) — re-recording on every keystroke or
  // re-render would hammer the endpoint for no benefit.
  const recorded = useRef<string | null>(null);

  useEffect(() => {
    if (!partnerId || !phone) return;
    const key = `${partnerId}:${phone}`;
    if (recorded.current === key) return;
    recorded.current = key;

    fetch("/api/marketing-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId,
        phone,
        granted: true,
        source: "checkout_implied",
        consentText: `Implied by placing an order with ${storeName || "this restaurant"}. No explicit opt-in was shown.`,
      }),
      // Silent by design: this must never get between a customer and their order.
    }).catch(() => {});
  }, [partnerId, phone, storeName]);

  return null;
}

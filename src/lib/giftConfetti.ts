"use client";

import confetti from "canvas-confetti";

// Celebration for the moment a customer EARNS a free item at checkout — a BXGY
// reward tipping over, or a freebie discount landing.
//
// Deliberately smaller than UpgradeSuccessModal's 2.5s side-cannon routine.
// That fires once, on a paid upgrade. This one sits in a live cart the customer
// is still editing, so it has to read as a quick "nice, you got something" and
// get out of the way — a long burst would become noise the third time they
// change a quantity.

const GIFT_COLORS = ["#EA580C", "#F59E0B", "#FBBF24", "#10B981", "#3B82F6"];

/**
 * One short burst, optionally aimed at a point on screen (normalised 0-1, the
 * shape canvas-confetti expects). Defaults to just below centre, roughly where
 * the free-item row sits in the checkout sheet.
 *
 * No-ops during SSR, and canvas-confetti honours prefers-reduced-motion for us
 * via disableForReducedMotion — someone who has asked their OS for less motion
 * still gets the free item, just not the fanfare.
 */
export function fireGiftConfetti(origin?: { x: number; y: number }) {
  if (typeof window === "undefined") return;

  const at = origin ?? { x: 0.5, y: 0.62 };
  const base = {
    origin: at,
    colors: GIFT_COLORS,
    disableForReducedMotion: true,
    scalar: 0.9,
    zIndex: 10000, // above the checkout sheet, which sits high itself
  };

  confetti({ ...base, particleCount: 60, spread: 65, startVelocity: 32 });
  // A second, wider puff a beat later gives the burst some depth without
  // running long enough to feel like a takeover.
  window.setTimeout(() => {
    confetti({ ...base, particleCount: 30, spread: 90, startVelocity: 22, decay: 0.92 });
  }, 120);
}

/**
 * The element's centre as canvas-confetti origin coordinates, so the burst can
 * come out of the free-item row itself rather than an arbitrary point. Returns
 * undefined when the node isn't on screen, letting the caller fall back.
 */
export function originOf(el: HTMLElement | null): { x: number; y: number } | undefined {
  if (!el || typeof window === "undefined") return undefined;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return undefined;
  return {
    x: (r.left + r.width / 2) / window.innerWidth,
    y: (r.top + r.height / 2) / window.innerHeight,
  };
}

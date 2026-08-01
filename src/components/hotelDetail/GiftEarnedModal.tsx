"use client";

import { useEffect } from "react";
import { Gift, X } from "lucide-react";
import { MenuPrice } from "@/components/hotelDetail/MenuPrice";

export type GiftItem = {
  id: string;
  name: string;
  price?: number | null;
  image_url?: string | null;
  /**
   * Units of THIS item. Carried per item because a stacked order can earn one
   * free item from each of several offers — showing a single shared count made
   * two 1-unit gifts both read "×2".
   */
  units?: number;
};

type GiftEarnedModalProps = {
  open: boolean;
  onClose: () => void;
  /** The item(s) the customer just earned. */
  items: GiftItem[];
  /** Fallback units, used when an item doesn't carry its own count. */
  units: number;
  currency: string;
  /** Storefront brand colour, so the card matches the menu it opened over. */
  accent: string;
};

/** How long the card stays up before dismissing itself. */
const AUTO_DISMISS_MS = 2000;

/**
 * The "you just earned a free item" moment at checkout.
 *
 * Sits alongside the confetti (src/lib/giftConfetti.ts): the burst catches the
 * eye, this says WHAT was won. Without it the customer only sees the money come
 * off the total and has to work out which item is free — which is the exact
 * confusion this pair exists to fix.
 *
 * Self-dismisses after AUTO_DISMISS_MS, with a bar draining in step so the card
 * never just vanishes on someone mid-read. The bar's animation duration is
 * driven by the same constant as the timer, so the two cannot drift apart.
 *
 * Deliberately not a Radix Dialog. This fires inside the checkout sheet, which
 * is itself a portalled overlay with its own focus trap; nesting a second trap
 * inside it fought the sheet for focus and left the page scroll-locked when both
 * closed. A plain fixed overlay layered above it behaves.
 */
export function GiftEarnedModal({
  open,
  onClose,
  items,
  units,
  currency,
  accent,
}: GiftEarnedModalProps) {
  // Escape closes it, matching every other dismissable layer in the storefront.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Auto-dismiss. Cleared on close/unmount so a card dismissed by hand can't
  // fire a second onClose at a modal that has since been reopened.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  if (!open || items.length === 0) return null;

  const unitsOf = (item: GiftItem) => item.units ?? units;
  const many = items.some((i) => unitsOf(i) > 1);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      // Above the checkout sheet, below the confetti canvas (z-10000) so the
      // particles fall in front of the card rather than behind it.
      style={{ zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
      aria-label="You earned a free gift"
    >
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[320px] rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 fade-in duration-300 overflow-hidden">
        <style>{`
          @keyframes giftAutoDismiss {
            from { transform: scaleX(1); }
            to   { transform: scaleX(0); }
          }
        `}</style>

        {/* Drains in step with the auto-dismiss timer, so the card is visibly
            counting down rather than disappearing without warning. */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gray-100">
          <div
            className="h-full origin-left"
            style={{
              backgroundColor: accent,
              animation: `giftAutoDismiss ${AUTO_DISMISS_MS}ms linear forwards`,
            }}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2.5 top-2.5 z-10 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className="flex flex-col items-center px-5 pt-6 pb-4 text-center"
          style={{ background: `linear-gradient(180deg, ${accent}1A 0%, transparent 100%)` }}
        >
          <div
            className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}26`, color: accent }}
          >
            <Gift className="h-6 w-6" />
          </div>
          <p className="text-base font-extrabold text-gray-900">
            You got a free gift!
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {many ? "Added to your order" : "It's on the house"}
          </p>
        </div>

        <div className="space-y-2 px-4 pb-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-2.5"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${accent}1A`, color: accent }}
                >
                  <Gift className="h-5 w-5" />
                </div>
              )}

              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
                {item.price ? (
                  <p className="text-xs text-gray-400 line-through">
                    <MenuPrice currency={currency} amount={Number(item.price).toFixed(2)} />
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {unitsOf(item) > 1 && (
                  <span className="text-xs font-semibold text-gray-500">×{unitsOf(item)}</span>
                )}
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-extrabold"
                  style={{ backgroundColor: `${accent}1A`, color: accent }}
                >
                  FREE
                </span>
              </div>
            </div>
          ))}

          {/* Dismisses immediately rather than waiting out the bar. The timer is
              cleared on close, so tapping this can't leave a stray onClose to
              fire at a card that has since reopened. */}
          <button
            type="button"
            onClick={onClose}
            className="mt-1 w-full rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-[0.98]"
            style={{ backgroundColor: accent }}
          >
            Yay!
          </button>
        </div>
      </div>
    </div>
  );
}

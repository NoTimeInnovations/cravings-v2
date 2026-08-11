"use client";

import { useEffect } from "react";
import { X, PartyPopper } from "lucide-react";
import { MenuPrice } from "@/components/hotelDetail/MenuPrice";

/** How long the card stays up before dismissing itself. */
const AUTO_DISMISS_MS = 2600;

/**
 * The "you just unlocked free delivery" moment at checkout — the sibling of the
 * confetti burst (src/lib/giftConfetti.ts): the particles catch the eye, this
 * says WHAT was won and how much it saved. Mirrors GiftEarnedModal's shell (a
 * plain fixed overlay with a draining bar, deliberately NOT a Radix Dialog, so
 * it doesn't fight the checkout sheet's focus trap) so the two celebrations feel
 * like one product.
 */
export function DeliveryUnlockedCard({
  open,
  onClose,
  benefit,
  savedAmount,
  currency,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  benefit: "free" | "reduced";
  /** The amount saved on delivery (waived fee, or the reduction). */
  savedAmount: number;
  currency: string;
  accent: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  const reduced = benefit === "reduced";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      // Above the checkout sheet, below the confetti canvas (z-10000).
      style={{ zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
      aria-label="You unlocked free delivery"
    >
      <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-[320px] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 fade-in duration-300">
        <style>{`
          @keyframes deliveryUnlockDrain {
            from { transform: scaleX(1); }
            to   { transform: scaleX(0); }
          }
        `}</style>

        <div className="absolute inset-x-0 top-0 h-1 bg-gray-100">
          <div
            className="h-full origin-left"
            style={{ backgroundColor: accent, animation: `deliveryUnlockDrain ${AUTO_DISMISS_MS}ms linear forwards` }}
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
          className="flex flex-col items-center px-5 pt-6 pb-5 text-center"
          style={{ background: `linear-gradient(180deg, ${accent}1A 0%, transparent 100%)` }}
        >
          <div
            className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}26`, color: accent }}
          >
            <PartyPopper className="h-6 w-6" />
          </div>
          <p className="text-base font-extrabold text-gray-900">
            {reduced ? "Delivery discount unlocked!" : "🎉 Free delivery unlocked!"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {savedAmount > 0 ? (
              <>
                You saved{" "}
                <span className="font-bold" style={{ color: accent }}>
                  <MenuPrice currency={currency} amount={savedAmount.toFixed(0)} />
                </span>{" "}
                on delivery
              </>
            ) : reduced ? (
              "Your delivery fee just dropped"
            ) : (
              "This one's on the house"
            )}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-[0.98]"
            style={{ backgroundColor: accent }}
          >
            Nice!
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeliveryUnlockedCard;

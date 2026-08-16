"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { MapPin, Check, Pencil, X } from "lucide-react";

/**
 * "Deliver to this address?" — shown once per cart when a customer taps View
 * Cart on a DELIVERY order, before checkout opens.
 *
 * The address is chosen early (often at the onboarding overlay, sometimes from a
 * saved one) and then sits behind a small line of text at the top of the menu
 * while the customer spends minutes browsing. Confirming it at the moment the
 * order becomes real is the cheapest place to catch a wrong door — after
 * checkout the address is one line among the bill, the payment method and the
 * slot picker, and it stops being read.
 *
 * Deliberately NOT a hard gate: "Deliver here" is a single tap and is the
 * default action, so the common case costs one tap. Only delivery orders see
 * it — a takeaway or dine-in customer has no address to check.
 */
export default function DeliveryLocationConfirmSheet({
  open,
  address,
  accent,
  onConfirm,
  onChange,
  onClose,
}: {
  open: boolean;
  /** The address as it will be sent to the restaurant. Empty = none chosen. */
  address: string;
  accent: string;
  onConfirm: () => void;
  /** Open the location picker instead of continuing. */
  onChange: () => void;
  onClose: () => void;
}) {
  // Escape closes (same as tapping the backdrop) and the page behind must not
  // scroll while the sheet is up — on iOS a scrolling backdrop reads as the
  // sheet being unresponsive.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const hasAddress = !!address.trim();

  return createPortal(
    <div
      // Above the floating View Cart bar (z-200) that opened this, so the bar
      // cannot be tapped again underneath the sheet.
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-confirm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-6 shadow-2xl sm:mb-6 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="delivery-confirm-title"
            className="text-base font-bold text-gray-900"
          >
            {hasAddress ? "Deliver to this address?" : "Where should we deliver?"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 flex items-start gap-3 rounded-xl bg-gray-50 p-3.5">
          <MapPin
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: accent }}
          />
          {hasAddress ? (
            // No truncation: a half-shown address defeats the entire purpose of
            // asking the customer to check it.
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-800">
              {address}
            </p>
          ) : (
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-500">
              No delivery address chosen yet.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {hasAddress && (
            <button
              type="button"
              onClick={onConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition active:scale-[0.99]"
              style={{ backgroundColor: accent }}
            >
              <Check className="h-4 w-4" />
              Deliver here
            </button>
          )}
          <button
            type="button"
            onClick={onChange}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99] ${
              hasAddress
                ? "border border-gray-200 text-gray-700"
                : "text-white"
            }`}
            style={hasAddress ? undefined : { backgroundColor: accent }}
          >
            <Pencil className="h-4 w-4" />
            {hasAddress ? "Change location" : "Choose location"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

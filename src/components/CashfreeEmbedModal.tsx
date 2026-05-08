"use client";

import { forwardRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  accent?: string;
  banner?: string | null;
  partnerName?: string;
}

const CashfreeEmbedModal = forwardRef<HTMLDivElement, Props>(
  ({ open, onClose, accent = "#ea580c", banner, partnerName = "Restaurant" }, ref) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-[10000] bg-white flex flex-col w-screen h-[100dvh]">
        <div
          className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
          style={{ backgroundColor: accent }}
        >
          <div className="w-9 h-9 rounded-full bg-white flex-shrink-0 overflow-hidden flex items-center justify-center">
            {banner ? (
              <img src={banner} alt={partnerName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold" style={{ color: accent }}>
                {partnerName.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 text-white">
            <p className="text-[11px] uppercase tracking-wide opacity-80">Pay to</p>
            <p className="text-sm font-semibold truncate">{partnerName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close payment"
            className="text-white/90 hover:text-white text-2xl leading-none px-2"
          >
            ×
          </button>
        </div>
        <div ref={ref} className="cf-embed-container flex-1 overflow-y-auto bg-white w-full" />
        <style jsx global>{`
          .cf-embed-container > iframe,
          .cf-embed-container iframe {
            width: 100% !important;
            min-width: 100% !important;
            border: 0 !important;
            display: block !important;
          }
        `}</style>
      </div>
    );
  }
);

CashfreeEmbedModal.displayName = "CashfreeEmbedModal";

export default CashfreeEmbedModal;

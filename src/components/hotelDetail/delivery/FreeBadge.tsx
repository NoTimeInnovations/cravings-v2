"use client";

import React from "react";

/**
 * The little accent "FREE" chip that lands on the delivery line the moment an
 * order unlocks free delivery. One-shot pop + a single shimmer sweep, then it
 * rests — transform/opacity only (GPU-friendly), and silenced under
 * prefers-reduced-motion so it appears statically for those users.
 *
 * Visual language matches the FREE chip in GiftEarnedModal (accent tint at ~10%,
 * accent text) so the two "you earned something" moments feel like one product.
 */
export function FreeBadge({
  accent,
  label = "FREE",
  className = "",
}: {
  accent: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`fd-badge relative inline-flex items-center overflow-hidden rounded-md px-2 py-0.5 text-[11px] font-extrabold ${className}`}
      style={{ backgroundColor: `${accent}1A`, color: accent }}
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .fd-badge { animation: fdPop 380ms cubic-bezier(0.2,0.8,0.2,1) both; }
          .fd-badge > .fd-shimmer { animation: fdShimmer 700ms ease-out 120ms 1 both; }
        }
        @keyframes fdPop {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes fdShimmer {
          from { transform: translateX(-160%); }
          to   { transform: translateX(160%); }
        }
      `}</style>
      <span className="relative z-10">{label}</span>
      {/* One diagonal light sweep across the chip. */}
      <span
        aria-hidden="true"
        className="fd-shimmer pointer-events-none absolute inset-y-0 -left-1/2 z-0 w-1/2 -skew-x-12"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
        }}
      />
    </span>
  );
}

export default FreeBadge;

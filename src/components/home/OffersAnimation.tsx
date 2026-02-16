"use client";

import { useEffect, useState, useRef } from "react";

const OFFERS = [
  { item: "Butter Chicken", original: "$12.00", discounted: "$8.40", badge: "30% OFF", emoji: "🍛" },
  { item: "Margherita Pizza", original: "$10.00", discounted: "$6.00", badge: "40% OFF", emoji: "🍕" },
];

function CursorIcon({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none">
      <path
        d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 00-.85.35z"
        fill="#1a1a1a"
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
}

type Phase = "enter" | "hover-button" | "clicking" | "applying" | "applied";

function OffersAnimationInner({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<Phase>("enter");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Update cursor target position based on phase
  useEffect(() => {
    const container = containerRef.current;
    const button = buttonRef.current;
    if (!container || !button) return;

    const cRect = container.getBoundingClientRect();
    const bRect = button.getBoundingClientRect();

    if (phase === "enter") {
      // Start at top-right corner
      setCursorPos({ x: cRect.width + 10, y: -10 });
    } else if (phase === "hover-button" || phase === "clicking") {
      // Center of the button
      const bx = bRect.left - cRect.left + bRect.width * 0.55;
      const by = bRect.top - cRect.top + bRect.height * 0.55;
      setCursorPos({ x: bx, y: by });
    } else if (phase === "applying") {
      // Exit to bottom-left
      setCursorPos({ x: -30, y: cRect.height + 30 });
    }
  }, [phase]);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Start moving cursor toward button
    timers.push(setTimeout(() => setPhase("hover-button"), 200));
    // Cursor clicks
    timers.push(setTimeout(() => setPhase("clicking"), 2200));
    // Button starts applying, cursor exits
    timers.push(setTimeout(() => setPhase("applying"), 2400));
    // Offer applied
    timers.push(setTimeout(() => setPhase("applied"), 3200));
    // Restart cycle
    timers.push(setTimeout(onComplete, 5500));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const applied = phase === "applied";
  const showCursor = phase !== "applied";

  // Cursor transition duration per phase
  const cursorDuration = phase === "enter"
    ? "0ms"
    : phase === "hover-button"
      ? "2000ms"
      : phase === "clicking"
        ? "100ms"
        : "800ms";

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-2 md:gap-4 w-full max-w-[220px] md:max-w-[380px] px-2 md:px-4">
      {/* Menu items card */}
      <div className="w-full bg-[#fcfbf7] rounded-xl md:rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        <div className="flex flex-col divide-y divide-stone-100">
          {OFFERS.map((offer) => (
            <div
              key={offer.item}
              className="flex gap-2 md:gap-4 p-2.5 md:p-5"
            >
              <div className="flex-1 flex flex-col justify-between min-h-[50px] md:min-h-[80px]">
                <div>
                  <p className="font-semibold text-xs md:text-base text-stone-900 mb-0.5 md:mb-1">
                    {offer.item}
                  </p>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <span className={`text-xs md:text-lg font-bold transition-all duration-500 ${
                      applied ? "text-stone-400 line-through text-[10px] md:text-sm font-normal" : "text-stone-800"
                    }`}>
                      {offer.original}
                    </span>
                    {applied && (
                      <span className="text-xs md:text-lg font-bold text-[#a64e2a] animate-[fadeSlideIn_0.4s_ease-out]">
                        {offer.discounted}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`inline-block text-[7px] md:text-[10px] font-bold px-1.5 md:px-2.5 py-0.5 rounded-full w-fit mt-1 md:mt-2 transition-all duration-400 ${
                  applied
                    ? "bg-[#a64e2a] text-white opacity-100"
                    : "bg-transparent text-transparent opacity-0"
                }`}>
                  {offer.badge}
                </span>
              </div>
              <div className="w-10 h-10 md:w-18 md:h-18 rounded-lg md:rounded-xl flex-shrink-0 bg-[#a64e2a]/10 flex items-center justify-center text-xl md:text-4xl">
                {offer.emoji}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Offer button */}
      <div ref={buttonRef} className="w-full bg-[#fcfbf7] rounded-lg md:rounded-xl shadow-md border border-stone-200 px-3 md:px-5 py-2 md:py-3">
        <div className={`w-full flex items-center justify-center gap-1.5 md:gap-2 rounded-md md:rounded-lg py-1.5 md:py-2.5 px-3 md:px-4 transition-all duration-300 ${
          phase === "clicking"
            ? "bg-[#a64e2a] scale-95"
            : phase === "applying"
              ? "bg-[#a64e2a] scale-95"
              : "bg-[#a64e2a]"
        }`}>
          {phase === "applying" ? (
            <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : applied ? (
            <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          )}
          <span className="text-[9px] md:text-xs font-semibold text-white">
            {applied ? "Offer Applied!" : phase === "applying" ? "Applying..." : "Create Offer"}
          </span>
        </div>
      </div>

      {/* Cursor */}
      {showCursor && (
        <CursorIcon
          className="absolute z-20 w-4 h-4 md:w-6 md:h-6 drop-shadow-md pointer-events-none"
          style={{
            top: 0,
            left: 0,
            transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)${phase === "clicking" ? " scale(0.85)" : ""}`,
            opacity: phase === "applying" ? 0 : 1,
            transition: `transform ${cursorDuration} cubic-bezier(0.25, 0.1, 0.25, 1), opacity ${cursorDuration} ease-out`,
          }}
        />
      )}
    </div>
  );
}

export default function OffersAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <OffersAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}

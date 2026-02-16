"use client";

import { useEffect, useState } from "react";

const OFFERS = [
  { item: "Butter Chicken", original: "$12.00", discounted: "$8.40", badge: "30% OFF", emoji: "🍛" },
  { item: "Margherita Pizza", original: "$10.00", discounted: "$6.00", badge: "40% OFF", emoji: "🍕" },
  { item: "Truffle Pasta", original: "$15.00", discounted: "$10.50", badge: "30% OFF", emoji: "🍝" },
];

export default function OffersAnimation() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (phase === "enter") {
      timeout = setTimeout(() => setPhase("show"), 400);
    } else if (phase === "show") {
      timeout = setTimeout(() => setPhase("exit"), 2500);
    } else {
      timeout = setTimeout(() => {
        setIndex((i) => (i + 1) % OFFERS.length);
        setPhase("enter");
      }, 400);
    }

    return () => clearTimeout(timeout);
  }, [phase]);

  const offer = OFFERS[index];

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />

      <div className="relative flex flex-col items-center gap-2 md:gap-5 w-full max-w-[220px] md:max-w-[380px] px-2 md:px-4">
        {/* Offer card */}
        <div
          className={`w-full bg-[#fcfbf7] rounded-xl md:rounded-3xl shadow-lg border border-stone-100 overflow-hidden transition-all duration-400 ${
            phase === "exit"
              ? "opacity-0 scale-95"
              : phase === "enter"
                ? "opacity-0 scale-95"
                : "opacity-100 scale-100"
          }`}
        >
          <div className="flex gap-2 md:gap-4 p-2.5 md:p-6">
            <div className="flex-1 flex flex-col justify-between min-h-[70px] md:min-h-[120px]">
              <div>
                <p className="font-semibold text-xs md:text-lg text-stone-900 mb-1 md:mb-2">
                  {offer.item}
                </p>
                <div className="flex items-center gap-1.5 md:gap-2.5">
                  <span className="text-[10px] md:text-sm text-stone-400 line-through">
                    {offer.original}
                  </span>
                  <span className="text-sm md:text-xl font-bold text-[#a64e2a]">
                    {offer.discounted}
                  </span>
                </div>
              </div>
              <div className="mt-1.5 md:mt-3">
                <span className="inline-block bg-[#a64e2a] text-white text-[9px] md:text-xs font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                  {offer.badge}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 md:w-24 md:h-24 rounded-lg md:rounded-2xl flex-shrink-0 bg-[#a64e2a]/10 flex items-center justify-center text-2xl md:text-5xl">
              {offer.emoji}
            </div>
          </div>
        </div>

        {/* Timer bar */}
        <div className="w-full bg-[#fcfbf7] rounded-lg md:rounded-xl shadow-md border border-stone-200 px-3 md:px-5 py-2 md:py-4">
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <span className="text-[8px] md:text-xs font-medium text-stone-400 uppercase tracking-wide">
              Flash Deal
            </span>
            <span className="text-[8px] md:text-xs font-medium text-[#a64e2a]">
              Ends in 2h 30m
            </span>
          </div>
          <div className="w-full h-1 md:h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-[#a64e2a] rounded-full transition-all ease-linear ${
                phase === "show" ? "duration-[2500ms] w-full" : "duration-0 w-[15%]"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

const MENU_ITEMS = [
  { name: "Butter Chicken", price: "$12.00", emoji: "🍛" },
  { name: "Caesar Salad", price: "$8.50", emoji: "🥗" },
];

function SmartQRAnimationInner({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"scan" | "loading" | "menu">("scan");
  const [visibleItems, setVisibleItems] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setPhase("loading"), 1200));
    timers.push(setTimeout(() => setPhase("menu"), 2200));
    timers.push(setTimeout(() => setVisibleItems(1), 2600));
    timers.push(setTimeout(() => setVisibleItems(2), 2900));
    timers.push(setTimeout(onComplete, 5500));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="relative flex flex-col items-center gap-2 md:gap-5 w-full max-w-[200px] md:max-w-[360px] px-2 md:px-4">
      {/* Phone frame */}
      <div className="w-full bg-[#fcfbf7] rounded-xl md:rounded-3xl shadow-lg border border-stone-100 overflow-hidden">
        {/* Phone top bar */}
        <div className="flex items-center justify-center py-1 md:py-2 bg-stone-50 border-b border-stone-100">
          <div className="w-8 md:w-12 h-0.5 md:h-1 bg-stone-300 rounded-full" />
        </div>

        <div className="p-2.5 md:p-5 min-h-[120px] md:min-h-[200px]">
          {phase === "scan" && (
            <div className="flex flex-col items-center justify-center h-[100px] md:h-[180px] gap-2 md:gap-3">
              {/* QR code icon */}
              <div className="relative">
                <svg
                  className="w-10 h-10 md:w-16 md:h-16 text-stone-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm14 3h.01M17 14h.01M14 17h.01M14 14h3v3h-3v-3zm0 3h3v3h-3v-3zm3-3h3v3h-3v-3z"
                  />
                </svg>
                <div className="absolute inset-0 border-2 border-orange-600 rounded-lg animate-pulse" />
              </div>
              <p className="text-[9px] md:text-xs text-stone-400 font-medium">
                Scanning QR Code...
              </p>
            </div>
          )}

          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center h-[100px] md:h-[180px] gap-2 md:gap-3">
              <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-[9px] md:text-xs text-stone-400 font-medium">
                Loading menu...
              </p>
            </div>
          )}

          {phase === "menu" && (
            <div className="flex flex-col gap-1.5 md:gap-3 h-[100px] md:h-[180px] justify-center">
              <p className="text-[10px] md:text-sm font-semibold text-stone-900 mb-0.5 md:mb-1">
                Digital Menu
              </p>
              {MENU_ITEMS.map((item, i) => (
                <div
                  key={item.name}
                  className={`flex items-center gap-1.5 md:gap-3 p-1.5 md:p-3 rounded-lg md:rounded-xl bg-stone-50 border border-stone-100 transition-all duration-300 ${
                    i < visibleItems
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                >
                  <div className="w-7 h-7 md:w-11 md:h-11 rounded-md md:rounded-lg bg-orange-600/10 flex items-center justify-center text-sm md:text-xl flex-shrink-0">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] md:text-xs font-medium text-stone-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-[8px] md:text-[11px] font-semibold text-orange-600">
                      {item.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Menu link bar */}
      <div className="w-full bg-[#fcfbf7] rounded-lg md:rounded-xl shadow-md border border-stone-200 px-3 md:px-5 py-2 md:py-3">
        <div className="flex items-center gap-1.5 md:gap-2">
          <svg className="w-2.5 h-2.5 md:w-4 md:h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-[10px] md:text-sm text-stone-600 truncate">
            menuthere.com/your-restaurant
          </span>
        </div>
      </div>

    </div>
  );
}

export default function SmartQRAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <SmartQRAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}

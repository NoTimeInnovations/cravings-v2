"use client";

import { useEffect, useState } from "react";

const MENU_ITEMS = [
  { name: "Paneer Tikka", price: "₹249", emoji: "🧀" },
  { name: "Chicken Biryani", price: "₹349", emoji: "🍛" },
  { name: "Masala Dosa", price: "₹149", emoji: "🥞" },
];

const STEPS = [
  { label: "Menu synced", icon: "menu" },
  { label: "Order received", icon: "order" },
  { label: "Pushed to POS", icon: "pos" },
];

function PetpoojaAnimationInner({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [visibleItems, setVisibleItems] = useState(0);
  const [activeStep, setActiveStep] = useState(-1);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Animate menu items appearing
    MENU_ITEMS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleItems(i + 1), 400 + i * 350));
    });

    // Animate sync steps
    const stepsStart = 400 + MENU_ITEMS.length * 350 + 400;
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i), stepsStart + i * 600));
    });

    timers.push(
      setTimeout(() => setShowSuccess(true), stepsStart + STEPS.length * 600 + 300)
    );
    timers.push(setTimeout(onComplete, 6500));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="relative flex flex-col items-center w-full max-w-[220px] md:max-w-[380px] px-2 md:px-4 gap-2 md:gap-4">
      {/* POS Card */}
      <div className="w-full bg-[#fcfbf7] rounded-xl md:rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-1.5 md:gap-2.5 px-2.5 md:px-4 py-1.5 md:py-3 bg-stone-900">
          <div className="w-4 h-4 md:w-6 md:h-6 rounded-md bg-orange-600 flex items-center justify-center">
            <svg
              className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-[9px] md:text-xs font-semibold text-white">
            Menuthere
          </span>
          <svg
            className="w-2.5 h-2.5 md:w-4 md:h-4 text-stone-400 mx-0.5 md:mx-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
          <div className="w-4 h-4 md:w-6 md:h-6 rounded-md bg-[#e8372c] flex items-center justify-center">
            <span className="text-[7px] md:text-[9px] font-bold text-white">
              PP
            </span>
          </div>
          <span className="text-[9px] md:text-xs font-semibold text-white">
            Petpooja
          </span>
        </div>

        {/* Menu items syncing */}
        <div className="p-2 md:p-4 flex flex-col gap-1 md:gap-2">
          {MENU_ITEMS.map((item, i) => (
            <div
              key={item.name}
              className={`flex items-center gap-1.5 md:gap-3 p-1.5 md:p-2.5 rounded-lg bg-stone-50 border border-stone-100 transition-all duration-300 ${
                i < visibleItems
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-3"
              }`}
            >
              <div className="w-6 h-6 md:w-9 md:h-9 rounded-md bg-orange-600/10 flex items-center justify-center text-xs md:text-base flex-shrink-0">
                {item.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] md:text-[11px] font-medium text-stone-900 truncate">
                  {item.name}
                </p>
                <p className="text-[7px] md:text-[10px] font-semibold text-orange-600">
                  {item.price}
                </p>
              </div>
              {i < visibleItems && (
                <svg
                  className="w-2.5 h-2.5 md:w-4 md:h-4 text-green-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sync steps */}
      <div className="w-full flex items-center justify-between px-1 md:px-2">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center gap-0.5 md:gap-1">
            <div
              className={`w-4 h-4 md:w-6 md:h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                i <= activeStep
                  ? "bg-green-500 scale-100"
                  : "bg-stone-200 scale-90"
              }`}
            >
              {i <= activeStep ? (
                <svg
                  className="w-2 h-2 md:w-3 md:h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-stone-400" />
              )}
            </div>
            <span
              className={`text-[7px] md:text-[10px] font-medium transition-colors duration-300 ${
                i <= activeStep ? "text-green-700" : "text-stone-400"
              }`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`w-3 md:w-6 h-px mx-0.5 md:mx-1 transition-colors duration-300 ${
                  i < activeStep ? "bg-green-400" : "bg-stone-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Success badge */}
      <div
        className={`px-3 md:px-5 py-1.5 md:py-2.5 bg-green-50 border border-green-200 rounded-lg md:rounded-xl transition-all duration-500 ${
          showSuccess
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-3 scale-95"
        }`}
      >
        <p className="text-[9px] md:text-sm font-semibold text-green-700 text-center">
          Real-time sync with Petpooja POS
        </p>
      </div>
    </div>
  );
}

export default function PetpoojaAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <PetpoojaAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}

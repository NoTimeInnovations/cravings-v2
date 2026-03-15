"use client";

import { useEffect, useState } from "react";

const ROWS = [
  { label: "Commission", aggregator: "30%", direct: "1%" },
  { label: "Customer data", aggregator: "Theirs", direct: "Yours" },
  { label: "Pricing", aggregator: "Locked", direct: "Free" },
  { label: "Brand loyalty", aggregator: "Lost", direct: "Yours" },
];

function AggregatorAnimationInner({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [visibleRows, setVisibleRows] = useState(0);
  const [showSavings, setShowSavings] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    ROWS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleRows(i + 1), 600 + i * 400));
    });

    timers.push(setTimeout(() => setShowSavings(true), 600 + ROWS.length * 400 + 300));
    timers.push(setTimeout(onComplete, 6000));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="relative flex flex-col items-center w-full max-w-[220px] md:max-w-[380px] px-2 md:px-4">
      {/* Comparison card */}
      <div className="w-full bg-[#fcfbf7] rounded-xl md:rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 bg-stone-900 text-white text-[8px] md:text-xs">
          <div className="p-1.5 md:p-3 font-medium" />
          <div className="p-1.5 md:p-3 font-medium text-center border-l border-stone-700">
            Aggregators
          </div>
          <div className="p-1.5 md:p-3 font-medium text-center border-l border-stone-700">
            Menuthere
          </div>
        </div>

        {/* Rows */}
        {ROWS.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-3 text-[8px] md:text-xs transition-all duration-300 ${
              i < visibleRows
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            } ${i < ROWS.length - 1 ? "border-b border-stone-100" : ""}`}
          >
            <div className="p-1.5 md:p-3 text-stone-700 font-medium">
              {row.label}
            </div>
            <div className="p-1.5 md:p-3 text-center border-l border-stone-100 text-red-600 font-medium">
              {row.aggregator}
            </div>
            <div className="p-1.5 md:p-3 text-center border-l border-stone-100 text-green-600 font-medium">
              {row.direct}
            </div>
          </div>
        ))}
      </div>

      {/* Savings badge */}
      <div
        className={`mt-2 md:mt-4 px-3 md:px-5 py-1.5 md:py-2.5 bg-green-50 border border-green-200 rounded-lg md:rounded-xl transition-all duration-500 ${
          showSavings
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-3 scale-95"
        }`}
      >
        <p className="text-[9px] md:text-sm font-semibold text-green-700 text-center">
          Save up to 29% per order
        </p>
      </div>
    </div>
  );
}

export default function AggregatorAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <AggregatorAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

const BARS = [
  { label: "Mon", target: 65 },
  { label: "Tue", target: 85 },
  { label: "Wed", target: 45 },
  { label: "Thu", target: 90 },
  { label: "Fri", target: 70 },
  { label: "Sat", target: 95 },
  { label: "Sun", target: 55 },
];

const STATS = [
  { label: "Total Scans", target: 1247 },
  { label: "Peak Hour", target: 0, display: "7–9 PM" },
  { label: "Top Item", target: 0, display: "Butter Chicken" },
];

function useCountUp(target: number, duration: number, delay: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const startTime = Date.now() + delay;
    let frame: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) {
        frame = requestAnimationFrame(animate);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay]);

  return value;
}

function AnimatedBar({
  target,
  delay,
  label,
}: {
  target: number;
  delay: number;
  label: string;
}) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setHeight(target), delay);
    return () => clearTimeout(timeout);
  }, [target, delay]);

  return (
    <div className="flex flex-col items-center gap-0.5 md:gap-1 flex-1">
      <div className="w-full h-16 md:h-28 bg-stone-50 rounded-sm md:rounded relative overflow-hidden flex items-end">
        <div
          className="w-full bg-orange-600 rounded-t-sm md:rounded-t transition-all duration-1000 ease-out"
          style={{ height: `${height}%` }}
        />
      </div>
      <span className="text-[7px] md:text-[10px] text-stone-400 font-medium">
        {label}
      </span>
    </div>
  );
}

function AnalyticsAnimationInner({ onComplete }: { onComplete: () => void }) {
  const scanCount = useCountUp(1247, 1500, 300);

  useEffect(() => {
    const timeout = setTimeout(onComplete, 4000);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div className="relative flex flex-col items-center gap-2 md:gap-5 w-full max-w-[230px] md:max-w-[400px] px-2 md:px-4">
      {/* Chart card */}
      <div className="w-full bg-[#fcfbf7] rounded-xl md:rounded-3xl shadow-lg border border-stone-100 overflow-hidden p-3 md:p-6">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <span className="text-[10px] md:text-sm font-semibold text-stone-900">
            Daily Scans
          </span>
          <span className="text-[9px] md:text-xs text-stone-400">This Week</span>
        </div>
        <div className="flex gap-1 md:gap-2">
          {BARS.map((bar, i) => (
            <AnimatedBar
              key={bar.label}
              target={bar.target}
              delay={300 + i * 150}
              label={bar.label}
            />
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="w-full grid grid-cols-3 gap-1.5 md:gap-3">
        <div className="bg-[#fcfbf7] rounded-lg md:rounded-xl shadow-md border border-stone-200 px-2 md:px-3 py-1.5 md:py-3 text-center">
          <p className="text-xs md:text-lg font-bold text-stone-900">
            {scanCount.toLocaleString()}
          </p>
          <p className="text-[7px] md:text-[10px] text-stone-400 font-medium">
            Total Scans
          </p>
        </div>
        <div className="bg-[#fcfbf7] rounded-lg md:rounded-xl shadow-md border border-stone-200 px-2 md:px-3 py-1.5 md:py-3 text-center">
          <p className="text-xs md:text-lg font-bold text-stone-900">7–9 PM</p>
          <p className="text-[7px] md:text-[10px] text-stone-400 font-medium">
            Peak Hour
          </p>
        </div>
        <div className="bg-[#fcfbf7] rounded-lg md:rounded-xl shadow-md border border-stone-200 px-2 md:px-3 py-1.5 md:py-3 text-center">
          <p className="text-[10px] md:text-sm font-bold text-stone-900 leading-tight">
            Butter Chicken
          </p>
          <p className="text-[7px] md:text-[10px] text-stone-400 font-medium">
            Top Item
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <AnalyticsAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}

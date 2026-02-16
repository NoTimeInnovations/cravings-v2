"use client";

import { useEffect, useState } from "react";

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={`${className} transition-all duration-300 ${
        filled ? "text-[#a64e2a] scale-110" : "text-stone-200 scale-100"
      }`}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

function useCountUp(target: number, duration: number, delay: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
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

function ReviewsAnimationInner({ onComplete }: { onComplete: () => void }) {
  const [filledStars, setFilledStars] = useState(0);
  const reviewCount = useCountUp(127, 1200, 800);

  useEffect(() => {
    if (filledStars < 5) {
      const timeout = setTimeout(
        () => setFilledStars((s) => s + 1),
        300 + filledStars * 250
      );
      return () => clearTimeout(timeout);
    }
  }, [filledStars]);

  useEffect(() => {
    const timeout = setTimeout(onComplete, 5000);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div className="relative flex flex-col items-center gap-2 md:gap-5 w-full max-w-[220px] md:max-w-[380px] px-2 md:px-4">
      {/* Rating card */}
      <div className="w-full bg-[#fcfbf7] rounded-xl md:rounded-3xl shadow-lg border border-stone-100 overflow-hidden p-3 md:p-6">
        <div className="flex flex-col items-center gap-1.5 md:gap-3">
          <p className="text-2xl md:text-5xl font-bold text-stone-900">4.8</p>
          <div className="flex gap-0.5 md:gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <StarIcon
                key={i}
                filled={i < filledStars}
                className="w-4 h-4 md:w-7 md:h-7"
              />
            ))}
          </div>
          <p className="text-[10px] md:text-sm text-stone-400">
            {reviewCount} Google Reviews
          </p>
        </div>
      </div>

      {/* Recent review */}
      <div className="w-full bg-[#fcfbf7] rounded-lg md:rounded-xl shadow-md border border-stone-200 px-3 md:px-5 py-2.5 md:py-4">
        <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
          <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-[#a64e2a]/15 flex items-center justify-center text-[10px] md:text-xs font-bold text-[#a64e2a]">
            S
          </div>
          <span className="text-[10px] md:text-xs font-medium text-stone-700">
            Sarah M.
          </span>
          <div className="flex gap-px ml-auto">
            {[0, 1, 2, 3, 4].map((i) => (
              <StarIcon
                key={i}
                filled={i < filledStars}
                className="w-2 h-2 md:w-3.5 md:h-3.5"
              />
            ))}
          </div>
        </div>
        <p className="text-[9px] md:text-xs text-stone-500 leading-relaxed line-clamp-2">
          &ldquo;Love the QR menu! So easy to browse and order. The food was
          amazing too!&rdquo;
        </p>
      </div>
    </div>
  );
}

export default function ReviewsAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <ReviewsAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}

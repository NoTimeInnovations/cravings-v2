"use client";

import { useEffect, useState } from "react";

function useTypeDeleteLoop(text: string, typeSpeed: number, deleteSpeed: number, pauseDuration: number) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let charIndex = 0;
    let phase: "typing" | "pause-after-type" | "deleting" | "pause-after-delete" = "typing";

    const step = () => {
      switch (phase) {
        case "typing":
          if (charIndex < text.length) {
            charIndex++;
            setDisplayed(text.slice(0, charIndex));
            timeout = setTimeout(step, typeSpeed);
          } else {
            phase = "pause-after-type";
            timeout = setTimeout(step, pauseDuration);
          }
          break;
        case "pause-after-type":
          phase = "deleting";
          timeout = setTimeout(step, deleteSpeed);
          break;
        case "deleting":
          if (charIndex > 0) {
            charIndex--;
            setDisplayed(text.slice(0, charIndex));
            timeout = setTimeout(step, deleteSpeed);
          } else {
            phase = "pause-after-delete";
            timeout = setTimeout(step, pauseDuration);
          }
          break;
        case "pause-after-delete":
          phase = "typing";
          timeout = setTimeout(step, typeSpeed);
          break;
      }
    };

    timeout = setTimeout(step, 500);

    return () => clearTimeout(timeout);
  }, [text, typeSpeed, deleteSpeed, pauseDuration]);

  return displayed;
}

function RealTimeMenuAnimationInner() {
  const displayed = useTypeDeleteLoop("Red Velvet Cake", 80, 50, 1000);

  return (
    <div className="relative flex flex-col items-center gap-2 md:gap-7 w-full max-w-[220px] md:max-w-[420px] px-2 md:px-4">
      {/* Menu item card */}
      <div className="w-full bg-[#fcfbf7] rounded-xl md:rounded-3xl shadow-lg border border-stone-100 overflow-hidden">
        <div className="flex gap-2 md:gap-5 p-2.5 md:p-7">
          <div className="flex-1 flex flex-col justify-between min-h-[60px] md:min-h-[130px]">
            <div>
              <p className="font-semibold text-xs md:text-xl text-stone-900 mb-1 md:mb-3 min-h-[16px] md:min-h-[32px]">
                {displayed}
                <span className="inline-block w-[1.5px] md:w-[2px] h-[12px] md:h-[20px] bg-stone-400 ml-[1px] animate-pulse align-middle" />
              </p>
              <p className="text-[10px] md:text-base text-stone-500 leading-relaxed line-clamp-2 md:line-clamp-none">
                Moist red velvet cake, cream cheese frosting and classic
                dessert.
              </p>
            </div>
            <p className="text-sm md:text-2xl font-bold text-[#a64e2a] mt-1 md:mt-4">$3.00</p>
          </div>
          <div className="w-10 h-10 md:w-28 md:h-28 rounded-lg md:rounded-2xl overflow-hidden flex-shrink-0 bg-[#a64e2a]/10 flex items-center justify-center text-xl md:text-6xl">
            🍰
          </div>
        </div>
      </div>

      {/* Edit menu title input */}
      <div className="w-full bg-[#fcfbf7] rounded-lg md:rounded-xl shadow-md border border-stone-200 px-3 md:px-6 py-2 md:py-5 flex flex-col gap-0.5 md:gap-2">
        <span className="text-[8px] md:text-xs font-medium text-stone-400 uppercase tracking-wide">
          Menu Item Title
        </span>
        <div className="flex items-center gap-1.5 md:gap-2.5">
          <svg
            className="w-3 h-3 md:w-5 md:h-5 text-stone-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          <span className="text-xs md:text-base text-stone-800 min-h-[16px] md:min-h-[24px]">
            {displayed}
            <span className="inline-block w-[1.5px] md:w-[2px] h-[12px] md:h-[16px] bg-stone-400 ml-[1px] animate-pulse align-middle" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RealTimeMenuAnimation() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <RealTimeMenuAnimationInner />
    </div>
  );
}

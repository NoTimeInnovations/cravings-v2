"use client";

import { useEffect, useState } from "react";

function BrandedAppAnimationInner({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<
    "store" | "download" | "splash" | "app"
  >("store");
  const [showItems, setShowItems] = useState(0);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setPhase("download"), 1200));
    timers.push(setTimeout(() => setPhase("splash"), 2200));
    timers.push(setTimeout(() => setPhase("app"), 3200));
    timers.push(setTimeout(() => setShowItems(1), 3600));
    timers.push(setTimeout(() => setShowItems(2), 3900));
    timers.push(setTimeout(() => setShowNotif(true), 4400));
    timers.push(setTimeout(onComplete, 6500));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="relative flex flex-col items-center gap-2 md:gap-4 w-full max-w-[200px] md:max-w-[360px] px-2 md:px-4">
      {/* Phone frame with theme glow */}
      <div
        className={`w-full bg-[#fcfbf7] rounded-xl md:rounded-3xl shadow-lg border border-stone-100 overflow-hidden transition-shadow duration-700 ${
          phase === "download"
            ? "shadow-[0_0_24px_rgba(234,88,12,0.15)]"
            : phase === "splash"
              ? "shadow-[0_0_30px_rgba(234,88,12,0.2)]"
              : phase === "app"
                ? "shadow-[0_0_16px_rgba(234,88,12,0.1)]"
                : ""
        }`}
      >
        {/* Phone notch */}
        <div className="flex items-center justify-center py-1 md:py-2 bg-stone-50 border-b border-stone-100">
          <div className="w-8 md:w-12 h-0.5 md:h-1 bg-stone-300 rounded-full" />
        </div>

        <div className="p-2.5 md:p-5 min-h-[120px] md:min-h-[200px]">
          {/* App Store listing */}
          {phase === "store" && (
            <div className="flex flex-col items-center justify-center h-[100px] md:h-[180px] gap-2 md:gap-3 animate-[fadeIn_0.4s_ease-out]">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-orange-600 flex items-center justify-center shadow-md animate-[subtleFloat_3s_ease-in-out_infinite]">
                <span className="text-white font-bold text-sm md:text-xl">
                  YR
                </span>
              </div>
              <p className="text-[9px] md:text-xs font-semibold text-stone-900">
                Your Restaurant
              </p>
              <p className="text-[7px] md:text-[10px] text-stone-400">
                Food & Drink
              </p>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg
                    key={s}
                    className="w-2 h-2 md:w-3 md:h-3 text-orange-400"
                    style={{ animationDelay: `${s * 80}ms` }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          )}

          {/* Downloading */}
          {phase === "download" && (
            <div className="flex flex-col items-center justify-center h-[100px] md:h-[180px] gap-2 md:gap-3 animate-[fadeIn_0.3s_ease-out]">
              <div className="relative">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-orange-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm md:text-xl">
                    YR
                  </span>
                </div>
                {/* Animated ring around icon */}
                <div className="absolute -inset-1.5 md:-inset-2 rounded-2xl md:rounded-3xl border-2 border-orange-400/40 animate-ping" />
                <div className="absolute -bottom-0.5 left-1 right-1 h-1 md:h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full animate-[progress_1s_ease-in-out_forwards]" />
                </div>
              </div>
              <p className="text-[9px] md:text-xs text-stone-400 font-medium">
                Installing...
              </p>
            </div>
          )}

          {/* Splash screen */}
          {phase === "splash" && (
            <div className="flex flex-col items-center justify-center h-[100px] md:h-[180px] gap-2 md:gap-3 animate-[fadeIn_0.3s_ease-out]">
              <div className="relative">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg animate-[splashPulse_1s_ease-in-out]">
                  <span className="text-white font-bold text-lg md:text-2xl">
                    YR
                  </span>
                </div>
                {/* Orange glow ring */}
                <div className="absolute -inset-2 md:-inset-3 rounded-2xl md:rounded-3xl bg-orange-500/10 animate-[glowExpand_1s_ease-out_forwards]" />
              </div>
              <p className="text-[10px] md:text-sm font-semibold text-stone-900">
                Your Restaurant
              </p>
            </div>
          )}

          {/* App home */}
          {phase === "app" && (
            <div className="flex flex-col gap-1.5 md:gap-3 h-[100px] md:h-[180px] justify-center animate-[fadeIn_0.4s_ease-out]">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] md:text-sm font-semibold text-stone-900">
                  Order Now
                </p>
                <div
                  className={`transition-all duration-300 ${showNotif ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
                >
                  <div className="relative">
                    <svg
                      className="w-3 h-3 md:w-5 md:h-5 text-stone-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-orange-600 rounded-full flex items-center justify-center">
                      <span className="text-[5px] md:text-[7px] text-white font-bold">
                        1
                      </span>
                    </div>
                    {/* Notification ping */}
                    {showNotif && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-orange-600 rounded-full animate-ping opacity-50" />
                    )}
                  </div>
                </div>
              </div>
              {[
                { name: "Butter Chicken", price: "₹349", emoji: "🍛" },
                { name: "Masala Dosa", price: "₹149", emoji: "🥞" },
              ].map((item, i) => (
                <div
                  key={item.name}
                  className={`flex items-center gap-1.5 md:gap-3 p-1.5 md:p-2.5 rounded-lg bg-stone-50 border border-stone-100 transition-all duration-500 ${
                    i < showItems
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-3 scale-95"
                  }`}
                  style={{ transitionDelay: i < showItems ? `${i * 100}ms` : "0ms" }}
                >
                  <div className="w-7 h-7 md:w-10 md:h-10 rounded-md md:rounded-lg bg-orange-600/10 flex items-center justify-center text-sm md:text-lg flex-shrink-0">
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
                  <div className={`w-5 h-5 md:w-7 md:h-7 rounded-md bg-orange-600 flex items-center justify-center flex-shrink-0 transition-shadow duration-300 ${
                    i < showItems ? "shadow-[0_0_8px_rgba(234,88,12,0.2)]" : ""
                  }`}>
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom badge */}
      <div className="w-full flex items-center justify-center gap-2 md:gap-3">
        <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-stone-50 border border-stone-200 rounded-lg transition-all duration-300 hover:border-orange-200 hover:shadow-sm">
          <svg
            className="w-2.5 h-2.5 md:w-4 md:h-4 text-stone-600"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          <span className="text-[7px] md:text-[10px] font-medium text-stone-600">
            App Store
          </span>
        </div>
        <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-stone-50 border border-stone-200 rounded-lg transition-all duration-300 hover:border-orange-200 hover:shadow-sm">
          <svg
            className="w-2.5 h-2.5 md:w-4 md:h-4 text-stone-600"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.5 1.45a1 1 0 010 1.486l-2.5 1.45-2.537-2.537 2.537-2.849zM5.864 3.458L16.8 9.79l-2.302 2.302-8.634-8.634z" />
          </svg>
          <span className="text-[7px] md:text-[10px] font-medium text-stone-600">
            Play Store
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BrandedAppAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes splashPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes glowExpand {
          from { opacity: 0.6; transform: scale(0.8); }
          to { opacity: 0; transform: scale(1.3); }
        }
      `}</style>
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <BrandedAppAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}

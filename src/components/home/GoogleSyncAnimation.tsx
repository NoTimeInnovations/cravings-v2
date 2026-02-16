"use client";

import { useEffect, useState } from "react";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  );
}

const SYNC_STEPS = [
  { label: "Categories", count: "12 synced" },
  { label: "Menu Items", count: "48 synced" },
  { label: "Photos", count: "36 synced" },
  { label: "Prices", count: "48 synced" },
];

function GoogleSyncAnimationInner({ onComplete }: { onComplete: () => void }) {
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    if (completedSteps < SYNC_STEPS.length) {
      const timeout = setTimeout(
        () => setCompletedSteps((s) => s + 1),
        600 + completedSteps * 700
      );
      return () => clearTimeout(timeout);
    }
  }, [completedSteps]);

  useEffect(() => {
    const timeout = setTimeout(onComplete, 5000);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div className="relative flex flex-col items-center gap-2 md:gap-5 w-full max-w-[220px] md:max-w-[380px] px-2 md:px-4">
      {/* Sync card */}
      <div className="w-full bg-[#fcfbf7] rounded-xl md:rounded-3xl shadow-lg border border-stone-100 overflow-hidden p-3 md:p-6">
        <div className="flex items-center gap-1.5 md:gap-2.5 mb-2.5 md:mb-5">
          <svg className="w-3.5 h-3.5 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-[10px] md:text-sm font-semibold text-stone-900">
            Google Business Sync
          </span>
        </div>

        <div className="flex flex-col gap-1.5 md:gap-3">
          {SYNC_STEPS.map((step, i) => {
            const done = i < completedSteps;
            const active = i === completedSteps;

            return (
              <div
                key={step.label}
                className={`flex items-center justify-between px-2 md:px-3 py-1.5 md:py-2.5 rounded-md md:rounded-lg transition-all duration-500 ${
                  done
                    ? "bg-[#a64e2a]/10 border border-[#a64e2a]/30"
                    : active
                      ? "bg-[#a64e2a]/5 border border-[#a64e2a]/20"
                      : "bg-stone-50 border border-stone-100"
                }`}
              >
                <div className="flex items-center gap-1.5 md:gap-2">
                  {done ? (
                    <CheckIcon className="w-3 h-3 md:w-4 md:h-4 text-[#a64e2a]" />
                  ) : active ? (
                    <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-[#a64e2a] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-stone-300" />
                  )}
                  <span
                    className={`text-[10px] md:text-xs font-medium ${
                      done ? "text-[#a64e2a]" : active ? "text-[#a64e2a]/70" : "text-stone-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                <span
                  className={`text-[9px] md:text-[11px] ${
                    done ? "text-[#a64e2a]" : "text-stone-300"
                  }`}
                >
                  {done ? step.count : "pending"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync button */}
      <div className="w-full bg-[#fcfbf7] rounded-lg md:rounded-xl shadow-md border border-stone-200 px-3 md:px-5 py-2 md:py-3">
        <div className={`w-full flex items-center justify-center gap-1.5 md:gap-2 rounded-md md:rounded-lg py-1.5 md:py-2.5 px-3 md:px-4 transition-all duration-300 ${
          completedSteps >= SYNC_STEPS.length ? "bg-[#a64e2a]" : "bg-[#a64e2a]"
        }`}>
          {completedSteps < SYNC_STEPS.length ? (
            <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span className="text-[9px] md:text-xs font-semibold text-white">
            {completedSteps >= SYNC_STEPS.length ? "Sync Complete!" : "Syncing to Google..."}
          </span>
        </div>
      </div>

    </div>
  );
}

export default function GoogleSyncAnimation() {
  const [cycle, setCycle] = useState(0);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(circle,#a8a29e_1px,transparent_1px)] bg-[size:10px_10px] opacity-20" />
      <GoogleSyncAnimationInner
        key={cycle}
        onComplete={() => setCycle((c) => c + 1)}
      />
    </div>
  );
}

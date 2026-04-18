"use client";

import { useState, useEffect } from "react";

function getPathInitial(): string {
  try {
    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);
    if (segments.length > 0) {
      const username = segments[0] === "qrScan" || segments[0] === "hotels"
        ? segments[1] || segments[0]
        : segments[0];
      return username.charAt(0).toUpperCase();
    }
  } catch {}
  return "M";
}

export default function SplashLoader() {
  const [phase, setPhase] = useState<"logo" | "splash">("logo");
  const [storeBanner, setStoreBanner] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [initial, setInitial] = useState<string>("M");

  useEffect(() => {
    setInitial(getPathInitial());
    try {
      const raw = localStorage.getItem("hotelTheme");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.storeBanner) setStoreBanner(parsed.storeBanner);
        if (parsed.storeName) setStoreName(parsed.storeName);
      }
    } catch {}
    try {
      const cookieStr = document.cookie.split("; ").find((c) => c.startsWith("store_theme="));
      if (cookieStr) {
        const parsed = JSON.parse(decodeURIComponent(cookieStr.split("=")[1]));
        if (!storeName && parsed.name) setStoreName(parsed.name);
        if (!storeBanner && parsed.banner) setStoreBanner(parsed.banner);
      }
    } catch {}
    const timer = setTimeout(() => setPhase("splash"), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9998] bg-[#fafafa] flex flex-col items-center justify-center overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes splashLogoIn {
          0% { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashLogoShrink {
          0% { width: 96px; height: 96px; border-radius: 50%; transform: translateY(0); }
          100% { width: 76px; height: 76px; border-radius: 50%; transform: translateY(0); }
        }
        @keyframes splashContentIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {phase === "logo" && (
        <div
          className="flex items-center justify-center"
          style={{ animation: "splashLogoIn 0.5s ease-out forwards" }}
        >
          <div className="w-24 h-24 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-md overflow-hidden">
            {storeBanner ? (
              <img
                src={storeBanner}
                alt={storeName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="text-4xl font-medium text-gray-900"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {initial}
              </span>
            )}
          </div>
        </div>
      )}

      {phase === "splash" && (
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1 overflow-auto pt-24 pb-32">
            {/* Logo - shrunk to splash position */}
            <div className="text-center px-5">
              <div
                className="w-[76px] h-[76px] rounded-full mx-auto mb-5 bg-white border border-gray-200 flex items-center justify-center shadow-sm overflow-hidden"
                style={{ animation: "splashLogoShrink 0.4s ease-out forwards" }}
              >
                {storeBanner ? (
                  <img
                    src={storeBanner}
                    alt={storeName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className="text-3xl font-medium text-gray-900"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {initial}
                  </span>
                )}
              </div>

              <div style={{ animation: "splashContentIn 0.4s ease-out 0.1s both" }}>
                {storeName ? (
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-900 leading-tight">
                    Welcome to{" "}
                    <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500 }}>
                      {storeName}
                    </span>
                  </h1>
                ) : (
                  <div className="h-8 w-48 mx-auto rounded-lg bg-gray-200 animate-pulse" />
                )}
              </div>

              <div style={{ animation: "splashContentIn 0.4s ease-out 0.2s both" }}>
                <p className="mt-4 text-sm text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                  Loading menu...
                </p>
              </div>
            </div>

            {/* Skeleton info card */}
            <div className="px-5 mt-8" style={{ animation: "splashContentIn 0.4s ease-out 0.3s both" }}>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-gray-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-20 rounded bg-gray-100 animate-pulse" />
                    <div className="h-2.5 w-14 rounded bg-gray-100 animate-pulse" />
                  </div>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-gray-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse" />
                    <div className="h-2.5 w-16 rounded bg-gray-100 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Skeleton CTA */}
          <div className="absolute left-0 right-0 bottom-0 px-4 pt-3.5 pb-8 bg-white/95 backdrop-blur-lg border-t border-gray-100 z-30"
            style={{ animation: "splashContentIn 0.4s ease-out 0.35s both" }}
          >
            <div className="w-full h-[52px] rounded-[14px] bg-gray-200 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}

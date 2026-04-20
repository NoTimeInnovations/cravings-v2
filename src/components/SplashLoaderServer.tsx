"use client";

import { useState, useEffect } from "react";

interface SplashLoaderServerProps {
  initial: string;
  storeName?: string;
  storeBanner?: string;
}

export default function SplashLoaderServer({ initial, storeName, storeBanner }: SplashLoaderServerProps) {
  const [displayLogo, setDisplayLogo] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [displayInitial, setDisplayInitial] = useState(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const username = window.location.pathname.split("/").filter(Boolean)[0];
      if (username) {
        const saved = localStorage.getItem(`store-logo-${username}`);
        if (saved) {
          const { logo, name } = JSON.parse(saved);
          setDisplayLogo(logo || "");
          setDisplayName(name || "");
          setDisplayInitial(name ? name.charAt(0).toUpperCase() : username.charAt(0).toUpperCase());
          setReady(true);
          return;
        }
        setDisplayInitial(username.charAt(0).toUpperCase());
      }
    } catch {}
    setDisplayLogo(storeBanner || "");
    setDisplayName(storeName || "");
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] bg-[#fafafa] flex flex-col items-center justify-center overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="flex flex-col items-center gap-5 px-8 text-center animate-pulse">
        <div
          className="w-20 h-20 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
        >
          {displayLogo ? (
            <img
              src={displayLogo}
              alt={displayName || ""}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className="text-4xl font-medium text-gray-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {displayInitial}
            </span>
          )}
        </div>
        {displayName ? (
          <p className="text-lg font-semibold text-gray-900 tracking-tight">{displayName}</p>
        ) : (
          <div className="h-5 w-32 rounded-lg bg-gray-200" />
        )}
        <p className="text-xs text-gray-400">Loading menu...</p>
      </div>
    </div>
  );
}

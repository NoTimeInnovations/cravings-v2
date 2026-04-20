"use client";

interface SplashLoaderServerProps {
  initial: string;
}

export default function SplashLoaderServer({ initial: fallback }: SplashLoaderServerProps) {
  let initial = fallback;
  if (typeof window !== "undefined") {
    const username = window.location.pathname.split("/").filter(Boolean)[0];
    if (username) initial = username.charAt(0).toUpperCase();
  }

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
          <span
            className="text-4xl font-medium text-gray-900"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {initial}
          </span>
        </div>
        <div className="h-5 w-32 rounded-lg bg-gray-200" />
        <p className="text-xs text-gray-400">Loading menu...</p>
      </div>
    </div>
  );
}

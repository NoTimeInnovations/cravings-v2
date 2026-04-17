import { Loader2 } from "lucide-react";
import React from "react";

const OfferLoadinPage = ({ message, storeBanner, bg }: { message: string; storeBanner?: string | null; bg?: string }) => {
  const bgColor = bg || "#fff7ed";
  // Determine if bg is dark to pick white or black text
  const isDark = (() => {
    const hex = bgColor.replace("#", "");
    if (hex.length < 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  })();
  const textColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex flex-col items-center gap-4">
        {storeBanner ? (
          <img
            src={storeBanner}
            alt="Store"
            className="w-20 h-20 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <img
            src="/menuthere-logo-new.png"
            alt="Menuthere"
            className="w-16 h-16 object-contain"
          />
        )}
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: textColor }} />
          <span className="text-base" style={{ color: textColor }}>{message}</span>
        </div>
      </div>
    </div>
  );
};

export default OfferLoadinPage;

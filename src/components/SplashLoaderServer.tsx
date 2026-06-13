import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";
import { parseBannerLogo } from "@/lib/bannerLogo";

interface SplashLoaderServerProps {
  initial: string;
  storeName?: string;
  storeBanner?: string;
  storefrontSettings?: unknown;
  username?: string;
}

export default function SplashLoaderServer({ initial, storeName, storeBanner, storefrontSettings, username }: SplashLoaderServerProps) {
  // When the banner is a video, an <img> can't render it — use the generated
  // thumbnail jpg (same as the page metadata does) so the logo still shows.
  const logoSrc = storeBanner
    ? isVideoUrl(storeBanner)
      ? getVideoThumbnailUrl(storeBanner)
      : storeBanner
    : null;
  // Reuse the partner's banner-logo display settings (zoom + background color)
  // so the splash logo matches the storefront instead of being cropped to fill.
  const bannerLogo = parseBannerLogo(storefrontSettings);
  const useNilaFont = username === "nila";

  return (
    <div
      className="fixed inset-0 z-[9998] bg-[#fafafa] flex flex-col items-center justify-center overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="flex flex-col items-center gap-5 px-8 text-center animate-pulse">
        <div
          className="w-20 h-20 rounded-full border border-gray-200 flex items-center justify-center overflow-hidden"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)", background: bannerLogo.bgColor || "#ffffff" }}
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={storeName || ""}
              className="w-full h-full object-contain"
              style={{ transform: `scale(${bannerLogo.scale})` }}
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
        {storeName ? (
          <p
            className={`text-lg font-semibold text-gray-900 tracking-tight${
              useNilaFont ? " font-tango-bt" : ""
            }`}
          >
            {storeName}
          </p>
        ) : (
          <div className="h-5 w-32 rounded-lg bg-gray-200" />
        )}
        <p className="text-xs text-gray-400">Loading menu...</p>
      </div>
    </div>
  );
}

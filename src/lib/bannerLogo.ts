// Banner-logo display settings, configured in admin Branding settings and
// persisted at `partners.storefront_settings.bannerLogo = { scale, bgColor }`.
//
//  - scale:   stored as a percent (50–500, default 100). Normalised here to a
//             CSS transform factor (0.5–5).
//  - bgColor: background fill behind the logo. null when unset.
//
// Keep the clamp range in sync with BANNER_LOGO_SCALE_MIN/MAX in
// BrandingSettings.tsx and the derivation in V3.tsx.
export interface BannerLogoStyle {
  scale: number; // CSS transform factor, 0.5–5
  bgColor: string | null;
}

export function parseBannerLogo(storefrontSettings: unknown): BannerLogoStyle {
  let parsed: any = null;
  try {
    parsed =
      typeof storefrontSettings === "string"
        ? JSON.parse(storefrontSettings)
        : storefrontSettings;
  } catch {
    parsed = null;
  }
  const bl = parsed?.bannerLogo;
  const rawScale = typeof bl?.scale === "number" ? bl.scale : 100;
  const scale = Math.min(5, Math.max(0.5, rawScale / 100));
  const bgColor =
    typeof bl?.bgColor === "string" && bl.bgColor ? bl.bgColor : null;
  return { scale, bgColor };
}

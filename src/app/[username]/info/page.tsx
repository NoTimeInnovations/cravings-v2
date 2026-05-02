import { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getPartnerInfoByUsernameQuery } from "@/api/partners";
import { fetchFromHasura } from "@/lib/hasuraClient";
import DownloadAppButton from "./DownloadAppButton";

const BRAND_COLOR_MAP: Record<string, string> = {
  "burnt-orange": "#e85d04",
  "obsidian-gold": "#b8860b",
  "royal-burgundy": "#8b1a4a",
  "midnight-emerald": "#0d6b4e",
  sapphire: "#1e4db7",
  "charcoal-noir": "#2c2c2c",
  "deep-violet": "#6b21a8",
  "rose-blush": "#be185d",
  "teal-luxe": "#0f766e",
  "warm-copper": "#b45309",
};

const FALLBACK_BRAND = "#ff6a13";
const FALLBACK_BG = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200";

const TAG_KEYS = ["direct-order", "dine-in", "takeaway", "delivery", "no-fees"] as const;
type TagKey = typeof TAG_KEYS[number];

const SOCIAL_KEYS = ["whatsapp", "instagram", "location", "phone", "facebook"] as const;
type SocialKey = typeof SOCIAL_KEYS[number];

const TAG_LABELS: Record<TagKey, string> = {
  "direct-order": "Direct order",
  "dine-in": "Dine-in price",
  takeaway: "Takeaway",
  delivery: "Delivery",
  "no-fees": "No service fees",
};

interface PartnerInfo {
  id: string;
  username: string;
  store_name: string;
  store_tagline: string | null;
  store_banner: string | null;
  description: string | null;
  phone: string | null;
  country_code: string | null;
  whatsapp_numbers: { number: string; area?: string }[] | null;
  social_links: unknown;
  location: string | null;
  place_id: string | null;
  theme: unknown;
  storefront_settings: unknown;
}

interface InfoPageSettings {
  bgImage?: string;
  buttonColor?: string;
  cuisine?: string;
  city?: string;
  ctaSubtitle?: string;
  showOpenStatus?: boolean;
  openStatusText?: string;
  tags?: Partial<Record<TagKey, boolean>>;
  socials?: Partial<Record<SocialKey, boolean>>;
}

interface SocialLinksData {
  instagram?: string;
  facebook?: string;
  zomato?: string;
  uberEats?: string;
  talabat?: string;
  doordash?: string;
  playstore?: string;
  appstore?: string;
}

function isValidUrl(u: string | undefined): boolean {
  if (!u) return false;
  return /^https?:\/\//i.test(u.trim());
}

function safeParseJson<T = any>(input: unknown): T | null {
  if (input == null) return null;
  if (typeof input !== "string") return input as T;
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

function resolveStorefrontSettings(partner: PartnerInfo): {
  brandColor: string;
  info: InfoPageSettings;
} {
  const sf = safeParseJson<{ brandColor?: string; infoPage?: InfoPageSettings }>(
    partner.storefront_settings
  );
  let brandColor = FALLBACK_BRAND;
  const bc = sf?.brandColor;
  if (bc) {
    if (bc.startsWith("custom:")) {
      const hex = bc.slice("custom:".length).trim();
      if (/^#?[0-9a-fA-F]{3,8}$/.test(hex)) {
        brandColor = hex.startsWith("#") ? hex : `#${hex}`;
      }
    } else if (BRAND_COLOR_MAP[bc]) {
      brandColor = BRAND_COLOR_MAP[bc];
    }
  } else {
    const theme = safeParseJson<{ colors?: { bg?: string } }>(partner.theme);
    if (theme?.colors?.bg) brandColor = theme.colors.bg;
  }
  return { brandColor, info: sf?.infoPage || {} };
}

function buildWhatsappUrl(partner: PartnerInfo): string | null {
  const cc = partner.country_code || "+91";
  const number =
    partner.whatsapp_numbers?.[0]?.number?.toString().trim() ||
    partner.phone?.toString().trim();
  if (!number) return null;
  const cleaned = number.replace(/[^\d+]/g, "");
  return `https://wa.me/${cc.replace("+", "")}${cleaned.replace("+", "")}`;
}

function buildPhoneUrl(partner: PartnerInfo): string | null {
  const cc = partner.country_code || "";
  const number = partner.phone?.toString().trim();
  if (!number) return null;
  const cleaned = number.replace(/[^\d+]/g, "");
  return `tel:${cc}${cleaned}`;
}

async function getPartnerInfo(username: string): Promise<PartnerInfo | null> {
  try {
    const res = await fetchFromHasura(getPartnerInfoByUsernameQuery, { username });
    return res?.partners?.[0] || null;
  } catch (e) {
    console.error("Error fetching partner info:", e);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const partner = await getPartnerInfo(username);
  if (!partner) return { title: "Not Found" };

  const title = partner.store_tagline
    ? `${partner.store_name} — ${partner.store_tagline}`
    : partner.store_name;
  const description =
    partner.description?.trim() ||
    partner.store_tagline?.trim() ||
    `Discover ${partner.store_name}.`;

  return {
    title,
    description,
    icons: partner.store_banner ? [partner.store_banner] : undefined,
    openGraph: {
      title,
      description,
      images: partner.store_banner ? [partner.store_banner] : undefined,
    },
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Viewport> {
  const { username } = await params;
  const partner = await getPartnerInfo(username);
  if (!partner) return { themeColor: "#ffffff" };
  const { brandColor } = resolveStorefrontSettings(partner);
  return { themeColor: brandColor };
}

/* ── Tiny inline SVG icons (server-rendered) ─────────────────────── */
const TagIcon = ({ k, color }: { k: TagKey; color: string }) => {
  const common = {
    width: 12,
    height: 12,
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (k) {
    case "direct-order":
      return (
        <svg {...common}>
          <path d="M2 6h7M6 3l3 3-3 3" />
        </svg>
      );
    case "dine-in":
      return (
        <svg {...common}>
          <path d="M3 2v8M3 2c0 1.5 1 2 1.5 2S6 3.5 6 2M9 2v3a1.5 1.5 0 003 0V2M9 5v5" />
        </svg>
      );
    case "takeaway":
      return (
        <svg {...common}>
          <path d="M2.5 4h7l-.5 6h-6L2.5 4zM4 4V2.5h4V4" />
        </svg>
      );
    case "delivery":
      return (
        <svg {...common}>
          <path d="M1 8V4h6v4M7 6h2.5L11 7.5V8M3 10a1 1 0 100-2 1 1 0 000 2zM9 10a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      );
    case "no-fees":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.5" />
          <path d="M3.5 8.5l5-5" />
        </svg>
      );
  }
};

const SocialIcon = ({ k, color }: { k: SocialKey; color: string }) => {
  switch (k) {
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill={color} aria-hidden>
          <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.9-2-.2-.5-.5-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.2 0 1.3.9 2.6 1.1 2.7.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.7.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.2.8.8-3.1-.2-.3c-.9-1.4-1.4-3-1.4-4.7 0-4.5 3.7-8.2 8.2-8.2s8.2 3.7 8.2 8.2-3.6 8.2-8.2 8.2z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={color} strokeWidth={1.8} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill={color} stroke="none" />
        </svg>
      );
    case "location":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill={color} aria-hidden>
          <path d="M20 15.5c-1.2 0-2.4-.2-3.5-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.7-6.5-6.5l2.2-2.2c.3-.3.4-.7.2-1-.4-1.1-.6-2.3-.6-3.5C8.6 3.5 8.1 3 7.5 3H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.5-.5-1-1-1z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill={color} aria-hidden>
          <path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12z" />
        </svg>
      );
  }
};

export default async function PartnerInfoPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const partner = await getPartnerInfo(username);
  if (!partner) notFound();

  const { brandColor, info } = resolveStorefrontSettings(partner);
  const rawButtonColor = info.buttonColor?.trim() || "";
  const buttonColor = /^#[0-9a-fA-F]{3,8}$/.test(rawButtonColor) ? rawButtonColor : brandColor;

  let socialsRaw = safeParseJson<SocialLinksData | string>(partner.social_links);
  if (typeof socialsRaw === "string") socialsRaw = { instagram: socialsRaw };
  const s = (socialsRaw || {}) as SocialLinksData;

  const whatsappUrl = buildWhatsappUrl(partner);
  const phoneUrl = buildPhoneUrl(partner);

  // Resolve which tags & socials to display (default = all on if URL/data exists)
  const tagsEnabled = TAG_KEYS.filter((k) => info.tags?.[k] !== false);

  const socialResolved: { k: SocialKey; href: string }[] = [];
  if (info.socials?.whatsapp !== false && whatsappUrl) socialResolved.push({ k: "whatsapp", href: whatsappUrl });
  if (info.socials?.instagram !== false && s.instagram) socialResolved.push({ k: "instagram", href: s.instagram });
  if (info.socials?.location !== false && partner.location) socialResolved.push({ k: "location", href: partner.location });
  if (info.socials?.phone !== false && phoneUrl) socialResolved.push({ k: "phone", href: phoneUrl });
  if (info.socials?.facebook !== false && s.facebook) socialResolved.push({ k: "facebook", href: s.facebook });

  const heroImage = info.bgImage || partner.store_banner || FALLBACK_BG;
  const logoImage = partner.store_banner || info.bgImage || null;
  const initial = partner.store_name?.charAt(0)?.toUpperCase() || "M";

  const cuisine = info.cuisine?.trim() || partner.store_tagline?.trim() || "";
  const city = info.city?.trim() || "";
  const subtitle = [cuisine, city].filter(Boolean).join(" · ");

  const playstoreUrl = isValidUrl(s.playstore) ? s.playstore!.trim() : "";
  const appstoreUrl = isValidUrl(s.appstore) ? s.appstore!.trim() : "";
  const hasStoreLink = !!(playstoreUrl || appstoreUrl);
  const ctaSubtitle =
    info.ctaSubtitle?.trim() || "Order, pay, and earn rewards · iOS & Android";
  const showOpenStatus = info.showOpenStatus !== false;
  const openStatusText = info.openStatusText?.trim() || "Open now";

  return (
    <div
      className="flex min-h-[100dvh] w-full items-stretch justify-center bg-neutral-900"
      style={{ backgroundColor: "#0d0a08" }}
    >
      {/* Inline keyframes + Fraunces font */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
            @keyframes infoPulseDot { 0%,100%{opacity:1} 50%{opacity:.55} }
            .info-btn-press { transition: transform .12s ease, filter .15s ease; }
            .info-btn-press:active { transform: translateY(1px) scale(0.99); }
            .info-social-btn { transition: transform .15s ease, background .15s ease; }
            .info-social-btn:active { transform: scale(0.94); }
            .info-tag-chip { transition: transform .12s ease; }
            .info-tag-chip:active { transform: scale(0.96); }
          `,
        }}
      />

      <div
        className="relative w-full max-w-[440px] overflow-hidden text-white"
        style={{
          background: "#0d0a08",
          fontFamily: "var(--font-inter), Inter, -apple-system, system-ui, sans-serif",
          minHeight: "100dvh",
        }}
      >
        {/* Hero photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt=""
          className="pointer-events-none absolute left-0 top-0 w-full object-cover"
          style={{ height: "62%" }}
        />

        {/* Top darken for status bar legibility */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-0"
          style={{
            height: 160,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)",
          }}
        />

        {/* Photo → sheet blend */}
        <div
          className="pointer-events-none absolute left-0 right-0"
          style={{
            top: "40%",
            height: "28%",
            background:
              "linear-gradient(180deg, rgba(255,253,250,0) 0%, rgba(255,253,250,0.4) 50%, #fffdfa 100%)",
          }}
        />

        {/* Open badge */}
        {showOpenStatus && (
          <div
            className="absolute z-10"
            style={{ top: 24, right: 16 }}
          >
            <div
              className="inline-flex items-center gap-1.5 rounded-full text-white"
              style={{
                padding: "5px 10px 5px 9px",
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(10px)",
                fontSize: 11.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: "#22c55e",
                  animation: "infoPulseDot 1.6s ease-in-out infinite",
                }}
              />
              {openStatusText}
            </div>
          </div>
        )}

        {/* Logo block — sits over photo's lower third */}
        <div
          className="absolute left-0 right-0 z-10 flex flex-col items-center"
          style={{ top: "34%" }}
        >
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: 92,
              height: 92,
              borderRadius: 24,
              background: brandColor,
              padding: 4,
              boxSizing: "border-box",
              boxShadow:
                "0 12px 32px rgba(0,0,0,0.35), 0 0 0 4px rgba(255,255,255,0.95)",
            }}
          >
            {logoImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoImage}
                alt={partner.store_name}
                className="h-full w-full object-cover"
                style={{ borderRadius: 20 }}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-3xl font-bold text-white"
                style={{ borderRadius: 20, background: brandColor }}
              >
                {initial}
              </div>
            )}
          </div>
        </div>

        {/* Bottom sheet */}
        <div
          className="absolute bottom-0 left-0 right-0 z-[5] flex flex-col"
          style={{
            background: "#fffdfa",
            padding: "12px 22px 40px",
            gap: 14,
            height: "46%",
          }}
        >
          <div className="text-center">
            <div
              style={{
                fontFamily: "Fraunces, Georgia, serif",
                fontSize: 30,
                fontWeight: 600,
                color: "#1a1612",
                letterSpacing: -0.5,
                lineHeight: 1.05,
                marginBottom: 4,
              }}
            >
              {partner.store_name}
            </div>
            {subtitle && (
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "#8b7d6f",
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {/* Tags */}
          {tagsEnabled.length > 0 && (
            <div className="flex flex-wrap justify-center" style={{ gap: 6 }}>
              {tagsEnabled.map((k) => (
                <span
                  key={k}
                  className="info-tag-chip inline-flex items-center"
                  style={{
                    gap: 5,
                    padding: "5px 10px 5px 9px",
                    borderRadius: 999,
                    background: "#f3eee8",
                    color: "#5a4a38",
                    fontSize: 11.5,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  <TagIcon k={k} color="#7a6a55" />
                  {TAG_LABELS[k]}
                </span>
              ))}
            </div>
          )}

          {/* CTA — picks Play Store or App Store based on the visitor's device */}
          {hasStoreLink && (
            <>
              <DownloadAppButton
                playstoreUrl={playstoreUrl}
                appstoreUrl={appstoreUrl}
                buttonColor={buttonColor}
              />
              <div
                style={{
                  textAlign: "center",
                  fontSize: 11.5,
                  color: "#a89882",
                  fontWeight: 500,
                  marginTop: -6,
                }}
              >
                {ctaSubtitle}
              </div>
            </>
          )}

          {/* Socials row */}
          {socialResolved.length > 0 && (
            <div
              className="flex justify-center"
              style={{ gap: 10, marginTop: "auto" }}
            >
              {socialResolved.map(({ k, href }) => (
                <a
                  key={k}
                  href={href}
                  target={k === "phone" ? undefined : "_blank"}
                  rel={k === "phone" ? undefined : "noopener noreferrer"}
                  aria-label={k}
                  className="info-social-btn flex items-center justify-center"
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    border: "1px solid #ece4da",
                    background: "#fffdfa",
                    padding: 11,
                    color: "#5a4a38",
                  }}
                >
                  <SocialIcon k={k} color="#5a4a38" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

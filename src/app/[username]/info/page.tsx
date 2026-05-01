import { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPartnerInfoByUsernameQuery } from "@/api/partners";
import { fetchFromHasura } from "@/lib/hasuraClient";

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

const FALLBACK_BG = "#1a1a1a";

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

function safeParseJson<T = any>(input: unknown): T | null {
  if (input == null) return null;
  if (typeof input !== "string") return input as T;
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

function resolveBrandColor(partner: PartnerInfo): string {
  const sf = safeParseJson<{ brandColor?: string }>(partner.storefront_settings);
  const bc = sf?.brandColor;
  if (bc) {
    if (bc.startsWith("custom:")) {
      const hex = bc.slice("custom:".length).trim();
      if (/^#?[0-9a-fA-F]{3,8}$/.test(hex)) {
        return hex.startsWith("#") ? hex : `#${hex}`;
      }
    }
    if (BRAND_COLOR_MAP[bc]) return BRAND_COLOR_MAP[bc];
  }
  const theme = safeParseJson<{ colors?: { bg?: string } }>(partner.theme);
  if (theme?.colors?.bg) return theme.colors.bg;
  return FALLBACK_BG;
}

function isLightColor(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length !== 3 && m.length !== 6) return false;
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // Relative luminance (sRGB approximation)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
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
  return { themeColor: resolveBrandColor(partner) };
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

export default async function PartnerInfoPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const partner = await getPartnerInfo(username);
  if (!partner) notFound();

  const brandColor = resolveBrandColor(partner);
  const isLight = isLightColor(brandColor);
  const fgColor = isLight ? "#1a1a1a" : "#ffffff";
  const subtleFg = isLight ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.8)";
  const linkBg = isLight ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,0.95)";
  const linkFg = isLight ? "#ffffff" : "#2c2c2c";

  let socials = safeParseJson<SocialLinksData | string>(partner.social_links);
  if (typeof socials === "string") socials = { instagram: socials };
  const s = (socials || {}) as SocialLinksData;

  const tagline = partner.store_tagline?.trim() || partner.description?.trim();
  const initial = partner.store_name?.charAt(0)?.toUpperCase() || "M";
  const whatsappUrl = buildWhatsappUrl(partner);
  const googleReviewUrl = partner.place_id
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(partner.place_id)}`
    : null;

  const deliveryLinks: { label: string; href: string }[] = [];
  if (s.zomato) deliveryLinks.push({ label: "Order on Zomato", href: s.zomato });
  if (s.uberEats) deliveryLinks.push({ label: "Order on Uber Eats", href: s.uberEats });
  if (s.talabat) deliveryLinks.push({ label: "Order on Talabat", href: s.talabat });
  if (s.doordash) deliveryLinks.push({ label: "Order on DoorDash", href: s.doordash });

  const hasAppLinks = !!(s.playstore || s.appstore);

  return (
    <div
      className="flex min-h-[100dvh] w-full items-center justify-center px-4 py-6 sm:px-5"
      style={{ backgroundColor: brandColor }}
    >
      <div
        className="relative flex w-full max-w-[420px] flex-col items-center overflow-hidden sm:min-h-[800px] sm:max-h-[900px]"
        style={{ backgroundColor: brandColor }}
      >
        <div className="flex w-full flex-1 flex-col items-center px-6 pb-10 pt-12 sm:px-[30px] sm:pt-[60px]">
          {partner.store_banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partner.store_banner}
              alt={partner.store_name}
              className="mb-[18px] h-[100px] w-[100px] rounded-full object-cover"
            />
          ) : (
            <div
              className="mb-[18px] flex h-[100px] w-[100px] items-center justify-center rounded-full text-3xl font-semibold"
              style={{
                backgroundColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.15)",
                color: fgColor,
              }}
            >
              {initial}
            </div>
          )}

          <h1
            className="mb-1 text-center text-[24px] font-semibold leading-tight"
            style={{ color: fgColor }}
          >
            {partner.store_name}
          </h1>
          {tagline && (
            <p
              className="mb-10 text-center text-[15px] font-light"
              style={{ color: subtleFg }}
            >
              {tagline}
            </p>
          )}
          {!tagline && <div className="mb-10" />}

          <div className="mb-10 flex w-full flex-col gap-4">
            <Link
              href={`/${partner.username}`}
              className="block w-full rounded-full px-6 py-4 text-center text-base font-medium transition-transform hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-[0.98]"
              style={{ backgroundColor: linkBg, color: linkFg }}
            >
              Menu
            </Link>
            {deliveryLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-full px-6 py-4 text-center text-base font-medium transition-transform hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-[0.98]"
                style={{ backgroundColor: linkBg, color: linkFg }}
              >
                {link.label}
              </a>
            ))}
            {partner.location && (
              <a
                href={partner.location}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-full px-6 py-4 text-center text-base font-medium transition-transform hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-[0.98]"
                style={{ backgroundColor: linkBg, color: linkFg }}
              >
                Get Directions
              </a>
            )}

            {hasAppLinks && (
              <div className={`grid gap-3 ${s.playstore && s.appstore ? "grid-cols-2" : "grid-cols-1"}`}>
                {s.playstore && (
                  <a
                    href={s.playstore}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Get it on Google Play"
                    className="flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition-transform hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-[0.98]"
                    style={{ backgroundColor: linkBg, color: linkFg }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0" aria-hidden>
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.89l2.302 2.302-10.937 6.31 8.635-8.612zm3.199-3.199l2.769 1.598c.787.454.787 1.591 0 2.045l-2.77 1.599L15.299 12l2.399-2.495zM5.864 1.535l10.937 6.31-2.302 2.302L5.864 1.535z" />
                    </svg>
                    Play Store
                  </a>
                )}
                {s.appstore && (
                  <a
                    href={s.appstore}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download on the App Store"
                    className="flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition-transform hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] active:scale-[0.98]"
                    style={{ backgroundColor: linkBg, color: linkFg }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0" aria-hidden>
                      <path d="M17.564 12.85c-.024-2.43 1.984-3.594 2.075-3.65-1.131-1.653-2.892-1.879-3.518-1.905-1.498-.151-2.923.882-3.683.882-.76 0-1.93-.86-3.171-.836-1.632.024-3.135.949-3.974 2.41-1.694 2.937-.434 7.288 1.214 9.674.806 1.166 1.766 2.476 3.027 2.43 1.214-.05 1.673-.785 3.143-.785 1.47 0 1.881.785 3.166.76 1.31-.024 2.135-1.19 2.934-2.36.925-1.355 1.305-2.668 1.327-2.736-.029-.014-2.547-.978-2.572-3.882zM15.13 5.797c.671-.812 1.123-1.939.999-3.062-.967.04-2.137.643-2.83 1.454-.621.717-1.166 1.864-1.018 2.965 1.078.083 2.178-.547 2.85-1.357z" />
                    </svg>
                    App Store
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto flex gap-5 pb-10">
            {s.facebook && (
              <a
                href={s.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="transition-transform hover:scale-110 hover:opacity-80"
                style={{ color: fgColor }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            )}
            {s.instagram && (
              <a
                href={s.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="transition-transform hover:scale-110 hover:opacity-80"
                style={{ color: fgColor }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            )}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="transition-transform hover:scale-110 hover:opacity-80"
                style={{ color: fgColor }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            )}
            {googleReviewUrl && (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Google Review"
                className="transition-transform hover:scale-110 hover:opacity-80"
                style={{ color: fgColor }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

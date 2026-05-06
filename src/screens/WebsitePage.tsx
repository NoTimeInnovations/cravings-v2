import { ArrowUpRight } from "lucide-react";
import {
  WebsiteConfig,
  mergeWebsiteConfig,
} from "@/types/website";
import { WEBSITE_STYLES } from "@/components/website/website-styles";
import { MenuTabs } from "@/components/website/MenuTabs";

interface PartnerData {
  id: string;
  username: string;
  store_name: string;
  store_banner?: string;
  description?: string;
  phone?: string;
  location?: string;
  location_details?: string;
  geo_location?: { type?: string; coordinates?: [number, number] } | null;
  social_links?: any;
  currency?: string;
  theme?: any;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  is_veg?: boolean;
  tags?: string[];
  category?: { id: string; name: string; priority?: number };
}

interface Props {
  partner: PartnerData;
  config: WebsiteConfig;
  menuItems: MenuItem[];
}

function parseSocials(raw: any): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return v && typeof v === "object" ? v : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? raw : {};
}

function parseTheme(raw: any): { accent: string } {
  const fallback = { accent: "#EA580C" };
  if (!raw) return fallback;
  let t: any = raw;
  if (typeof raw === "string") {
    try {
      t = JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  return { accent: t?.colors?.accent || fallback.accent };
}

function isLightHex(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

const SOCIAL_KEYS: { key: string; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "twitter", label: "Twitter" },
  { key: "x", label: "X" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "playstore", label: "Play Store" },
  { key: "appstore", label: "App Store" },
];

export default function WebsitePage({ partner, config, menuItems }: Props) {
  const merged = mergeWebsiteConfig(config);
  const accent = parseTheme(partner.theme).accent;
  const onAccent = "#FFFFFF";
  const bg = merged.theme.bg_color || "#0E0F0C";
  const ink = merged.theme.ink_color || "#F4EFE6";
  const isLightBg = isLightHex(bg);
  const ink2 = isLightBg ? "rgba(26,23,20,.7)" : "rgba(244,239,230,.72)";
  const ink3 = isLightBg ? "rgba(26,23,20,.5)" : "rgba(244,239,230,.5)";
  const line = isLightBg ? "rgba(26,23,20,.14)" : "rgba(244,239,230,.16)";

  const menuUrl = `/${partner.username}?back=true`;
  const orderUrl = merged.hero.cta_link || menuUrl;
  const socials = parseSocials(partner.social_links);
  const currency = partner.currency || "$";
  const partnerAddress =
    partner.location_details || partner.location || "";
  const heroSubheadline =
    merged.hero.subheadline || partner.description || "";
  const heroAddress = merged.hero.address_value || partnerAddress;
  const visitAddress = merged.visit.address_lines || partnerAddress;
  const visitPhone = merged.visit.contact_phone || partner.phone || "";
  const mapQuery = partner.location || partner.location_details || "";
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  const mapCoords = partner.geo_location?.coordinates;
  const mapboxStaticUrl =
    mapCoords && mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+e25822(${mapCoords[0]},${mapCoords[1]})/${mapCoords[0]},${mapCoords[1]},17,0/900x720@2x?access_token=${mapboxToken}`
      : "";
  const mapOpenUrl = mapCoords
    ? `https://www.google.com/maps/search/?api=1&query=${mapCoords[1]},${mapCoords[0]}`
    : mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : "";

  // Build menu groups for the menu section
  const itemById: Record<string, MenuItem> = {};
  menuItems.forEach((m) => {
    itemById[m.id] = m;
  });
  const groupedByCategory: Record<string, MenuItem[]> = {};
  menuItems.forEach((m) => {
    const cid = m.category?.id;
    if (!cid) return;
    (groupedByCategory[cid] = groupedByCategory[cid] || []).push(m);
  });

  const selectedCategoryIds = merged.menu.category_ids.length
    ? merged.menu.category_ids
    : Array.from(
        new Set(menuItems.map((m) => m.category?.id).filter(Boolean) as string[]),
      ).slice(0, 4);

  const menuCategories = selectedCategoryIds
    .map((cid) => {
      const allItems = groupedByCategory[cid] || [];
      if (!allItems.length) return null;
      const itemFilter = merged.menu.item_ids_by_category[cid];
      const items =
        itemFilter && itemFilter.length
          ? itemFilter
              .map((iid) => itemById[iid])
              .filter(Boolean)
          : allItems.slice(0, 8);
      const catName = allItems[0]?.category?.name || "Menu";
      return { id: cid, name: catName, items };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const cssVars = {
    "--wb-bg": bg,
    "--wb-ink": ink,
    "--wb-ink-2": ink2,
    "--wb-ink-3": ink3,
    "--wb-line": line,
    "--wb-accent": accent,
    "--wb-on-accent": onAccent,
    "--wb-display": '"Instrument Serif", "Playfair Display", "EB Garamond", serif',
    "--wb-sans": '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    "--wb-mono": '"JetBrains Mono", ui-monospace, monospace',
  } as React.CSSProperties;

  const heroEnabled = merged.hero.enabled;
  const marqueeTags = merged.marquee.tags.filter((t) => t.text.trim());
  const marqueeEnabled = merged.marquee.enabled && marqueeTags.length > 0;
  const storyEnabled = merged.story.enabled;
  const menuEnabled = merged.menu.enabled && menuCategories.length > 0;
  const visitEnabled = merged.visit.enabled;
  const footerEnabled = merged.footer.enabled;

  const visitHours = merged.visit.hours.filter((h) => h.label && h.value);

  const footMarkParts = (() => {
    const name = partner.store_name || "Welcome";
    const half = Math.ceil(name.length / 2);
    return { a: name.slice(0, half), b: name.slice(half) };
  })();

  const fontsHref =
    "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Space+Grotesk:wght@400;500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap";

  return (
    <div className="wb" style={cssVars}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href={fontsHref} rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: WEBSITE_STYLES }} />

      <nav className="wb-nav">
        <div className="wb-nav-inner">
          <div className="wb-logo">
            <span className="wb-logo-mark">
              {partner.store_banner ? (
                <img src={partner.store_banner} alt={partner.store_name} />
              ) : (
                (partner.store_name?.[0] || "?").toUpperCase()
              )}
            </span>
            {partner.store_name}
          </div>
          <div className="wb-nav-divider" />
          <div className="wb-nav-links">
            {menuEnabled && <a href="#menu">Menu</a>}
            {storyEnabled && <a href="#about">About Us</a>}
            {visitEnabled && <a href="#visit">Contact Us</a>}
          </div>
          <div className="wb-nav-cta">
            <a className="wb-btn wb-btn-primary" href={orderUrl}>
              {merged.hero.cta_text || "Order online"}{" "}
              <ArrowUpRight className="wb-arrow" size={14} />
            </a>
          </div>
        </div>
      </nav>

      {heroEnabled && (
        <section className="wb-hero wb-hero-fb wb-section wb-no-border">
          <div className="wb-container">
            {merged.hero.eyebrow && (
              <span className="wb-eyebrow">{merged.hero.eyebrow}</span>
            )}
            <h1 className="wb-display" style={{ marginTop: 24 }}>
              {merged.hero.headline || partner.store_name}
              {merged.hero.headline_accent && (
                <>
                  <br />
                  <span className="wb-it">{merged.hero.headline_accent}</span>
                </>
              )}
            </h1>
            {heroSubheadline && (
              <p className="wb-sub">{heroSubheadline}</p>
            )}
            <div className="wb-row">
              <a className="wb-btn wb-btn-primary" href={orderUrl}>
                {merged.hero.cta_text || "Order online"}{" "}
                <ArrowUpRight className="wb-arrow" size={14} />
              </a>
            </div>

            {merged.hero.collage_images.some((u) => u) && (
              <div className="wb-collage">
                {[0, 1, 2, 3].map((i) => {
                  const url = merged.hero.collage_images[i];
                  const label = merged.hero.collage_labels[i];
                  return (
                    <div key={i} className={`wb-c${i + 1} ${url ? "" : "wb-ph"}`}>
                      {url ? (
                        <img src={url} alt={label || ""} className="wb-c-img" />
                      ) : null}
                      {label && <span className="wb-img-tag">{label}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {(merged.hero.hours_value || heroAddress) && (
              <div className="wb-meta">
                {merged.hero.hours_value && (
                  <div>
                    <div className="wb-k">{merged.hero.hours_label}</div>
                    <div className="wb-v">{merged.hero.hours_value}</div>
                  </div>
                )}
                {heroAddress && (
                  <div>
                    <div className="wb-k">{merged.hero.address_label}</div>
                    <div className="wb-v">{heroAddress}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {marqueeEnabled && (
            <div className="wb-marq" style={{ marginTop: 96 }}>
              <div className="wb-marq-track">
                {[0, 1].map((dup) => (
                  <span className="wb-marq-group" key={dup}>
                    {marqueeTags.map((t, i) => (
                      <span key={i}>
                        {t.accent ? (
                          <em>{t.text}</em>
                        ) : (
                          t.text
                        )}
                        <span style={{ opacity: 0.4, margin: "0 0" }}>
                          {" · "}
                        </span>
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {storyEnabled && (
        <section id="about" className="wb-section">
          <div className="wb-container">
            <div className="wb-sec-head">
              <div>
                {merged.story.eyebrow && (
                  <span className="wb-eyebrow">{merged.story.eyebrow}</span>
                )}
                {(merged.story.title || merged.story.title_accent) && (
                  <h2 className="wb-display">
                    {merged.story.title}
                    {merged.story.title_accent && (
                      <>
                        {merged.story.title && <br />}
                        <span className="wb-it">{merged.story.title_accent}</span>
                      </>
                    )}
                  </h2>
                )}
              </div>
            </div>

            <div className="wb-about-grid">
              <div className="wb-about-img">
                {merged.story.image_url ? (
                  <img
                    src={merged.story.image_url}
                    alt={merged.story.image_label || merged.story.title || ""}
                  />
                ) : null}
              </div>
              <div className="wb-about-copy">
                {merged.story.paragraphs
                  .filter((p) => p.trim())
                  .map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {menuEnabled && (
        <section id="menu" className="wb-section">
          <div className="wb-container">
            <div className="wb-sec-head">
              <div>
                {merged.menu.eyebrow && (
                  <span className="wb-eyebrow">{merged.menu.eyebrow}</span>
                )}
                {(merged.menu.title || merged.menu.title_accent) && (
                  <h2 className="wb-display">
                    {merged.menu.title}
                    {merged.menu.title_accent && (
                      <>
                        {merged.menu.title && <br />}
                        <span className="wb-it">{merged.menu.title_accent}</span>
                      </>
                    )}
                  </h2>
                )}
              </div>
              <MenuTabs
                categories={menuCategories}
                currency={currency}
                note={merged.menu.note}
                ctaText={merged.menu.cta_text}
                menuUrl={menuUrl}
              />
            </div>
          </div>
        </section>
      )}

      {visitEnabled && (
        <section id="visit" className="wb-section">
          <div className="wb-container">
            <div className="wb-sec-head">
              <div>
                {merged.visit.eyebrow && (
                  <span className="wb-eyebrow">{merged.visit.eyebrow}</span>
                )}
                {(merged.visit.title || merged.visit.title_accent) && (
                  <h2 className="wb-display">
                    {merged.visit.title}
                    {merged.visit.title_accent && (
                      <>
                        {merged.visit.title && <br />}
                        <span className="wb-it">{merged.visit.title_accent}</span>
                      </>
                    )}
                  </h2>
                )}
              </div>
              {mapOpenUrl && (
                <a
                  className="wb-btn wb-btn-ghost"
                  href={mapOpenUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in maps <ArrowUpRight className="wb-arrow" size={14} />
                </a>
              )}
            </div>

            <div className="wb-visit-grid">
              <div className="wb-visit-map">
                {mapboxStaticUrl ? (
                  mapOpenUrl ? (
                    <a
                      href={mapOpenUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "block", width: "100%", height: "100%" }}
                      aria-label="Open in maps"
                    >
                      <img
                        src={mapboxStaticUrl}
                        alt={visitAddress || partner.store_name}
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <img
                      src={mapboxStaticUrl}
                      alt={visitAddress || partner.store_name}
                      loading="lazy"
                    />
                  )
                ) : null}
              </div>
              <div className="wb-visit-info">
                {visitAddress && (
                  <div className="wb-visit-block">
                    <div className="wb-eyebrow">Address</div>
                    <p
                      className="wb-visit-h"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {visitAddress}
                    </p>
                    {merged.visit.address_note && (
                      <p className="wb-visit-sub">
                        {merged.visit.address_note}
                      </p>
                    )}
                  </div>
                )}

                {visitHours.length > 0 && (
                  <div className="wb-visit-block">
                    <div className="wb-eyebrow">Hours</div>
                    <ul className="wb-hours">
                      {visitHours.map((h, i) => (
                        <li key={i}>
                          <span>{h.label}</span>
                          <b>{h.value}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {merged.visit.getting_here && (
                  <div className="wb-visit-block">
                    <div className="wb-eyebrow">Getting here</div>
                    <p className="wb-visit-sub">{merged.visit.getting_here}</p>
                  </div>
                )}

                {(visitPhone || merged.visit.contact_email) && (
                  <div className="wb-visit-block">
                    <div className="wb-eyebrow">Contact</div>
                    <p className="wb-visit-sub">
                      {visitPhone && (
                        <a
                          href={`tel:${visitPhone}`}
                          style={{ color: "var(--wb-accent)" }}
                        >
                          {visitPhone}
                        </a>
                      )}
                      {visitPhone && merged.visit.contact_email && <br />}
                      {merged.visit.contact_email && (
                        <a href={`mailto:${merged.visit.contact_email}`}>
                          {merged.visit.contact_email}
                        </a>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {footerEnabled && (
        <footer className="wb-footer">
          <div className="wb-container">
            <div className="wb-foot-mark wb-display">
              {footMarkParts.a}
              <span className="wb-it">{footMarkParts.b}</span>.
            </div>
            <div className="wb-foot-grid">
              <div className="wb-foot-col">
                <h5>Visit</h5>
                {merged.visit.address_lines && (
                  <p style={{ whiteSpace: "pre-line" }}>
                    {merged.visit.address_lines}
                  </p>
                )}
                {visitHours.length > 0 && (
                  <p style={{ marginTop: 14 }}>
                    {visitHours.map((h) => `${h.label}: ${h.value}`).join("\n")}
                  </p>
                )}
                {(merged.visit.contact_phone || partner.phone) && (
                  <p style={{ marginTop: 14, color: "var(--wb-accent)" }}>
                    {merged.visit.contact_phone || partner.phone}
                  </p>
                )}
              </div>
              <div className="wb-foot-col">
                <h5>Follow</h5>
                {SOCIAL_KEYS.map(({ key, label }) => {
                  const url = socials[key];
                  if (!url) return null;
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {label} ↗
                    </a>
                  );
                })}
              </div>
              <div className="wb-foot-col">
                <h5>Quick Links</h5>
                <a href={`/${partner.username}/about-us`}>About Us</a>
                <a href={`/${partner.username}/contact-us`}>Contact Us</a>
                <span className="wb-foot-sublabel">Policies</span>
                <div className="wb-foot-sublist">
                  <a href={`/${partner.username}/privacy-policy`}>Privacy Policy</a>
                  <a href={`/${partner.username}/refund-and-cancellation-policy`}>Refund &amp; Cancellation</a>
                  <a href={`/${partner.username}/terms-and-conditions`}>Terms &amp; Conditions</a>
                  <a href={`/${partner.username}/shipping-and-delivery-policy`}>Shipping &amp; Delivery</a>
                </div>
              </div>
              {merged.footer.policies.length > 0 && (
                <div className="wb-foot-col">
                  <h5>Policies</h5>
                  {merged.footer.policies.map((p, i) => (
                    <a key={i} href={p.url}>
                      {p.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="wb-foot-bot">
              <span>
                {merged.footer.copyright ||
                  `© ${partner.store_name} ${new Date().getFullYear()}`}
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

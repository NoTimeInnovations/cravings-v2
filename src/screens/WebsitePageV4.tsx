import { ArrowUpRight, Image as ImageIcon } from "lucide-react";
import {
  WebsiteConfig,
  mergeWebsiteConfig,
  BrilaFeatureCard,
  BrilaDishCard,
  BrilaGalleryItem,
} from "@/types/website";
import { WEBSITE_STYLES_V4 } from "@/components/website/website-styles-v4";
import { MenuTabsV4 } from "@/components/website/MenuTabsV4";
import { OwnerDashboardPill } from "@/components/website/OwnerDashboardPill";
import { GalleryImageV4 } from "@/components/website/GalleryImageV4";
import { MadeWithMenuthereBadge } from "@/components/website/MadeWithMenuthereBadge";

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
  subscription_details?: any;
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
  menuItems?: MenuItem[];
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

function parseAccent(raw: any): string {
  const fallback = "#EA580C";
  if (!raw) return fallback;
  let t: any = raw;
  if (typeof raw === "string") {
    try {
      t = JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  return t?.colors?.accent || fallback;
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
];

function renderStars(rating: number) {
  const filled = Math.round(rating);
  return "★★★★★☆☆☆☆☆".slice(5 - filled, 10 - filled);
}

function QuoteBlock({
  text,
  authorName,
}: {
  text: string;
  authorName: string;
  authorPhoto?: string; // kept in signature for backward compat; intentionally unused
}) {
  if (!text) return null;
  return (
    <div className="wb4-quote-box">
      <p className="wb4-quote-text">&ldquo;{text}&rdquo;</p>
      {authorName && (
        <div className="wb4-quote-author">
          <span>— {authorName}</span>
        </div>
      )}
    </div>
  );
}

export default function WebsitePageV4({
  partner,
  config,
  menuItems = [],
}: Props) {
  const merged = mergeWebsiteConfig(config);

  const menuUrl = `/${partner.username}?back=true`;
  const orderUrl = merged.hero.cta_link || menuUrl;
  const heroPhotoIdx = merged.hero.collage_images.findIndex((u) => !!u);
  const heroPhoto =
    (heroPhotoIdx >= 0 ? merged.hero.collage_images[heroPhotoIdx] : "") ||
    partner.store_banner ||
    "";
  const heroPhotoCaption =
    heroPhotoIdx >= 0
      ? merged.hero.collage_labels[heroPhotoIdx] || ""
      : "";
  const galleryPhotoCount = merged.gallery.items.length;
  const mapsLink =
    merged.visit.map_link ||
    (partner.location && /^https?:\/\//.test(partner.location)
      ? partner.location
      : "");

  const coords = partner.geo_location?.coordinates;
  const hasCoords =
    coords && coords.length === 2 && (coords[0] !== 0 || coords[1] !== 0);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  const mapboxStaticUrl =
    hasCoords && mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+e25822(${coords![0]},${coords![1]})/${coords![0]},${coords![1]},16,0/900x900@2x?access_token=${mapboxToken}`
      : "";
  const mapIframeUrl = hasCoords
    ? `https://www.google.com/maps?q=${coords![1]},${coords![0]}&hl=en&z=15&output=embed`
    : "";

  const directionsUrl =
    mapsLink ||
    (hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${coords![1]},${coords![0]}`
      : "");
  const openInMapsUrl =
    hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${coords![1]},${coords![0]}`
      : mapsLink;

  const visitHours = merged.visit.hours.filter((h) => h.label && h.value);
  const heroHeadline = merged.hero.headline || partner.store_name;
  const heroSubheadline = merged.hero.subheadline || partner.description || "";
  const visitAddress =
    merged.visit.address_lines ||
    partner.location_details ||
    partner.location ||
    "";
  const visitPhone = merged.visit.contact_phone || partner.phone || "";
  const socials = parseSocials(partner.social_links);
  const currency = partner.currency || "$";
  const accent = parseAccent(partner.theme);
  const cssVars = { "--wb4-accent": accent } as React.CSSProperties;

  // Menu categories — same derivation as V3
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
        new Set(
          menuItems.map((m) => m.category?.id).filter(Boolean) as string[],
        ),
      ).slice(0, 4);
  const menuCategories = selectedCategoryIds
    .map((cid) => {
      const allItems = groupedByCategory[cid] || [];
      if (!allItems.length) return null;
      const itemFilter = merged.menu.item_ids_by_category[cid];
      const items =
        itemFilter && itemFilter.length
          ? itemFilter.map((iid) => itemById[iid]).filter(Boolean)
          : allItems.slice(0, 8);
      const catName = allItems[0]?.category?.name || "Menu";
      return { id: cid, name: catName, items };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const reviewItems = merged.reviews.items.filter((r) => r.text?.trim());
  const sectionAvailable = {
    why: merged.why_choose_us.enabled && merged.why_choose_us.items.length > 0,
    photos: merged.gallery.enabled && merged.gallery.items.length > 0,
    ordered:
      merged.most_ordered.enabled && merged.most_ordered.items.length > 0,
    favorites:
      merged.more_favorites.enabled && merged.more_favorites.items.length > 0,
    tips: merged.tips.enabled && merged.tips.items.length > 0,
    reviews: merged.reviews.enabled && reviewItems.length > 0,
    menu: merged.menu.enabled && menuCategories.length > 0,
    hours: merged.visit.enabled,
  };

  return (
    <div className="wb4" style={cssVars}>
      <style dangerouslySetInnerHTML={{ __html: WEBSITE_STYLES_V4 }} />

      <OwnerDashboardPill partnerId={partner.id} />

      <nav className="wb4-nav">
        <div className="wb4-nav-inner">
          <div className="wb4-brand">
            <span className="wb4-brand-mark">
              {partner.store_banner ? (
                <img src={partner.store_banner} alt={partner.store_name} />
              ) : (
                (partner.store_name?.[0] || "?").toUpperCase()
              )}
            </span>
            {partner.store_name}
          </div>
          <div className="wb4-nav-divider" />
          <div className="wb4-nav-links">
            {sectionAvailable.menu && <a href="#menu">Menu</a>}
            {sectionAvailable.why && <a href="#why-choose-us">Highlights</a>}
            {sectionAvailable.reviews && <a href="#reviews">Reviews</a>}
            {sectionAvailable.hours && <a href="#hours">Contact</a>}
          </div>
          <div className="wb4-nav-cta">
            <a className="wb4-nav-btn" href={orderUrl}>
              Order online
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="wb4-hero">
        <div className="wb4-container">
          <div className="wb4-hero-grid">
            <div>
              <h1>{heroHeadline}</h1>
              {heroSubheadline && (
                <p className="wb4-hero-sub">{heroSubheadline}</p>
              )}
              <div className="wb4-cta-row">
                <a className="wb4-btn wb4-btn-primary" href={orderUrl}>
                  {merged.hero.cta_text || "Order Online"}
                  <ArrowUpRight size={14} />
                </a>
                {directionsUrl && (
                  <a
                    className="wb4-btn wb4-btn-secondary"
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get directions
                  </a>
                )}
              </div>

              {merged.reviews.rating > 0 && (
                <div className="wb4-rating">
                  <span className="wb4-laurel">❮</span>
                  <div>
                    <div className="wb4-rating-num">
                      {merged.reviews.rating.toFixed(1)}
                    </div>
                    <span className="wb4-rating-stars">
                      {renderStars(merged.reviews.rating)}
                    </span>
                  </div>
                  <span className="wb4-laurel">❯</span>
                  {merged.reviews.total_ratings > 0 && (
                    <span className="wb4-rating-text">
                      {merged.reviews.total_ratings.toLocaleString()} reviews on
                      Google Maps
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="wb4-hero-photo">
              {heroPhoto ? (
                <img src={heroPhoto} alt={heroPhotoCaption || partner.store_name} />
              ) : null}
              {heroPhotoCaption && (
                <span className="wb4-hero-caption">{heroPhotoCaption}</span>
              )}
              {galleryPhotoCount > 0 && (
                <a className="wb4-gallery-pill" href="#photos">
                  <ImageIcon size={14} />
                  View gallery ({galleryPhotoCount} photos)
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MENU — sits right after the hero */}
      {sectionAvailable.menu && (
        <section id="menu" className="wb4-section">
          <div className="wb4-container">
            <div className="wb4-sec-head">
              <h2>
                {merged.menu.title && merged.menu.title !== "Made fresh,"
                  ? merged.menu.title
                  : "Order online"}
              </h2>
              {merged.menu.note && (
                <p className="wb4-sub">{merged.menu.note}</p>
              )}
            </div>
            <MenuTabsV4
              categories={menuCategories}
              currency={currency}
              note=""
              ctaText={merged.menu.cta_text || "See full menu"}
              menuUrl={menuUrl}
            />
          </div>
        </section>
      )}

      {/* WHY CHOOSE US */}
      {sectionAvailable.why && (
        <section id="why-choose-us" className="wb4-section">
          <div className="wb4-container">
            <div className="wb4-sec-head">
              <h2>{merged.why_choose_us.title || "What sets us apart"}</h2>
              {merged.why_choose_us.subtitle && (
                <p className="wb4-sub">{merged.why_choose_us.subtitle}</p>
              )}
            </div>
            <div className="wb4-grid wb4-grid-3">
              {merged.why_choose_us.items.map(
                (item: BrilaFeatureCard, i: number) => (
                  <article key={i} className="wb4-card">
                    <span className="wb4-card-num">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <QuoteBlock
                      text={item.quote}
                      authorName={item.author.name}
                      authorPhoto={item.author.photo_url}
                    />
                  </article>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/* PHOTOS */}
      {sectionAvailable.photos && (
        <section id="photos" className="wb4-section">
          <div className="wb4-container">
            <div className="wb4-sec-head">
              <h2>{merged.gallery.title || "A look inside"}</h2>
              {merged.gallery.subtitle && (
                <p className="wb4-sub">{merged.gallery.subtitle}</p>
              )}
            </div>
            <div className="wb4-grid wb4-grid-5">
              {merged.gallery.items.map(
                (item: BrilaGalleryItem, i: number) => {
                  // Prefer the hero collage label so partners can manage
                  // captions in one place (the hero collage editor);
                  // fall back to the gallery item's own caption if unset.
                  const caption =
                    merged.hero.collage_labels[i]?.trim() ||
                    item.caption ||
                    "";
                  return (
                    <div key={i} className="wb4-photo-tile">
                      <div className="wb4-photo-img">
                        <GalleryImageV4
                          src={item.image_url}
                          fallbackSrc={merged.hero.collage_images[i] || ""}
                          alt={caption}
                        />
                      </div>
                      <div className="wb4-photo-caption">{caption}</div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </section>
      )}

      {/* MOST ORDERED */}
      {sectionAvailable.ordered && (
        <section id="most-ordered" className="wb4-section">
          <div className="wb4-container">
            <div className="wb4-sec-head">
              <h2>{merged.most_ordered.title || "Crowd favourites"}</h2>
              {merged.most_ordered.subtitle && (
                <p className="wb4-sub">{merged.most_ordered.subtitle}</p>
              )}
            </div>
            <div className="wb4-grid wb4-grid-4">
              {merged.most_ordered.items.map(
                (item: BrilaDishCard, i: number) => (
                  <article key={i} className="wb4-card">
                    <h3>{item.name}</h3>
                    <QuoteBlock
                      text={item.quote}
                      authorName={item.author.name}
                      authorPhoto={item.author.photo_url}
                    />
                  </article>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS — direct Google reviews */}
      {sectionAvailable.reviews && (
        <section id="reviews" className="wb4-section">
          <div className="wb4-container">
            <div className="wb4-sec-head">
              <h2>{merged.reviews.title || "What people say"}</h2>
            </div>

            {merged.reviews.rating > 0 && (
              <div className="wb4-rev-summary">
                <span className="wb4-rev-num">
                  {merged.reviews.rating.toFixed(1)}
                </span>
                <span className="wb4-rev-stars">
                  {renderStars(merged.reviews.rating)}
                </span>
                <span className="wb4-rev-meta">
                  {merged.reviews.total_ratings > 0
                    ? `${merged.reviews.total_ratings.toLocaleString()} on `
                    : ""}
                  {merged.reviews.source_label || "Google reviews"}
                </span>
              </div>
            )}

            <div className="wb4-grid wb4-grid-3">
              {reviewItems.map((rev, i) => (
                <article key={i} className="wb4-rev-card">
                  <div className="wb4-rev-head">
                    <div className="flex-1">
                      <div className="wb4-rev-author">{rev.author_name}</div>
                      {rev.relative_time && (
                        <div className="wb4-rev-time">{rev.relative_time}</div>
                      )}
                    </div>
                    <div className="wb4-rev-stars-small">
                      {renderStars(rev.rating)}
                    </div>
                  </div>
                  <p className="wb4-rev-text">{rev.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VISIT — map + address + hours + contact, V3-style two-column */}
      {sectionAvailable.hours && (
        <section id="hours" className="wb4-section">
          <div className="wb4-container">
            <div className="wb4-sec-head">
              <h2>{merged.visit.title || "Contact"}</h2>
            </div>
            <div className="wb4-visit-grid">
              <div className="wb4-visit-map">
                {mapboxStaticUrl ? (
                  openInMapsUrl ? (
                    <a
                      href={openInMapsUrl}
                      target="_blank"
                      rel="noreferrer"
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
                ) : mapIframeUrl ? (
                  <iframe
                    src={mapIframeUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map of ${partner.store_name}`}
                  />
                ) : null}
              </div>
              <div className="wb4-visit-info">
                {visitAddress && (
                  <div className="wb4-visit-block">
                    <div className="wb4-eyebrow">Address</div>
                    <p className="wb4-visit-h">{visitAddress}</p>
                    {merged.visit.address_note && (
                      <p className="wb4-visit-sub">
                        {merged.visit.address_note}
                      </p>
                    )}
                  </div>
                )}
                {(visitPhone || merged.visit.contact_email) && (
                  <div className="wb4-visit-block">
                    <div className="wb4-eyebrow">Contact</div>
                    <p className="wb4-visit-sub">
                      {visitPhone && (
                        <a className="wb4-visit-link" href={`tel:${visitPhone}`}>
                          {visitPhone}
                        </a>
                      )}
                      {visitPhone && merged.visit.contact_email && <br />}
                      {merged.visit.contact_email && (
                        <a
                          className="wb4-visit-link"
                          href={`mailto:${merged.visit.contact_email}`}
                        >
                          {merged.visit.contact_email}
                        </a>
                      )}
                    </p>
                  </div>
                )}
                {visitHours.length > 0 && (
                  <div className="wb4-visit-block">
                    <div className="wb4-eyebrow">Hours</div>
                    <ul className="wb4-hours-list">
                      {visitHours.map((h, i) => (
                        <li key={i}>
                          <span>{h.label}</span>
                          <b>{h.value}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {directionsUrl && (
                  <a
                    className="wb4-btn wb4-btn-primary"
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get directions
                    <ArrowUpRight size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      {merged.footer.enabled && (
        <footer className="wb4-foot">
          <div className="wb4-container">
            <div className="wb4-foot-mark">{partner.store_name}</div>
            <div className="wb4-foot-grid">
              <div className="wb4-foot-col">
                <h5>Contact</h5>
                {visitAddress && <p>{visitAddress}</p>}
                {visitPhone && (
                  <p style={{ marginTop: 14 }}>{visitPhone}</p>
                )}
              </div>
              <div className="wb4-foot-col">
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
              <div className="wb4-foot-col">
                <h5>Quick Links</h5>
                <a href={`/${partner.username}/about-us`}>About Us</a>
                <a href={`/${partner.username}/contact-us`}>Contact Us</a>
                <span className="wb4-foot-sublabel">Policies</span>
                <div className="wb4-foot-sublist">
                  <a href={`/${partner.username}/privacy-policy`}>
                    Privacy Policy
                  </a>
                  <a
                    href={`/${partner.username}/refund-and-cancellation-policy`}
                  >
                    Refund &amp; Cancellation
                  </a>
                  <a href={`/${partner.username}/terms-and-conditions`}>
                    Terms &amp; Conditions
                  </a>
                  <a
                    href={`/${partner.username}/shipping-and-delivery-policy`}
                  >
                    Shipping &amp; Delivery
                  </a>
                </div>
              </div>
            </div>
            <div className="wb4-foot-bot">
              {merged.footer.copyright ||
                `© ${new Date().getFullYear()} ${partner.store_name}`}
            </div>
          </div>
        </footer>
      )}

      <MadeWithMenuthereBadge subscriptionDetails={partner.subscription_details} />
    </div>
  );
}

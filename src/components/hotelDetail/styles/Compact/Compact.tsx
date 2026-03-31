"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MyOrdersButton } from "./MyOrdersButton";
import Link from "next/link";

import CompactOrders from "./CompactOrders";
import { Utensils, ShoppingBag, User, Heart, ChevronDown, Home, Tag } from "lucide-react";
import { DefaultHotelPageProps } from "../Default/Default";
import { formatDisplayName } from "@/store/categoryStore_hasura";
import ItemCard from "./ItemCard";
import {
  MapPin,
  Palette,
  Check,
  X,
  ChevronRight,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import SocialLinks from "./SocialLinks";
import OrderDrawer from "../../OrderDrawer";
import RateUs from "./RateUs";
import CategoryListBtn from "./CategoryListBtn";
import SearchItems from "./SearchItems";
import OffersList from "./OffersList";
import { Offer } from "@/store/offerStore_hasura";
import { ThemeConfig } from "tailwindcss/types/config";
import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import { HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updatePartner } from "@/api/partners";
import { revalidateTag } from "@/app/actions/revalidate";
import { getFeatures } from "@/lib/getFeatures";
import { ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import DiscountBanner from "../../DiscountBanner";
import { isVideoUrl, getVideoThumbnailUrl } from "@/lib/mediaUtils";
import useOrderStore from "@/store/orderStore";
import { FaWhatsapp, FaInstagram, FaFacebook } from "react-icons/fa";
import { Star, Phone } from "lucide-react";
import LocationHeader from "../../LocationHeader";

// Helper to check darkness for contrast
const isColorDark = (hex: string) => {
  const c = hex.substring(1); // strip #
  const rgb = parseInt(c, 16); // convert rrggbb to decimal
  const r = (rgb >> 16) & 0xff; // extract red
  const g = (rgb >> 8) & 0xff; // extract green
  const b = (rgb >> 0) & 0xff; // extract blue
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
  return luma < 128;
};

const SfcSuperFriedChicken = "eeb5a578-faf8-43ac-ab9a-aea343422d11";
const MuseAndMocha = "cf47bde2-8282-44a1-8fbc-d8fa3cf66ec7";
const defaultShowOptionsPartners = [SfcSuperFriedChicken, MuseAndMocha];

const PRESETS = [
  { background: "#ffffff", text: "#000000", accent: "#ea580c" }, // Classic Orange
  { background: "#0f172a", text: "#ffffff", accent: "#fbbf24" }, // Midnight Gold
  { background: "#f0fdf4", text: "#14532d", accent: "#16a34a" }, // Fresh Green
];

// =================================================================
// Banner Carousel Component - Smooth infinite swipable carousel
// =================================================================
const BannerCarousel = ({
  hoteldata,
  bannerError,
  setBannerError,
  accent,
  topItems,
}: {
  hoteldata: any;
  bannerError: boolean;
  setBannerError: (v: boolean) => void;
  accent: string;
  topItems: any[];
}) => {
  const bannerMode = hoteldata?.delivery_rules?.banner_mode || "single";
  const carouselBanners: string[] = hoteldata?.delivery_rules?.carousel_banners || [];

  const slides = useMemo(() => {
    const slideList: { image: string; title?: string }[] = [];
    if (bannerMode === "carousel" && carouselBanners.length > 0) {
      carouselBanners.slice(0, 5).forEach((url, idx) => {
        slideList.push({ image: url, title: `Banner ${idx + 1}` });
      });
    } else {
      if (hoteldata?.store_banner && !bannerError) {
        slideList.push({ image: hoteldata.store_banner, title: hoteldata.store_name });
      }
    }
    if (slideList.length === 0) {
      slideList.push({ image: "", title: hoteldata?.store_name });
    }
    return slideList;
  }, [hoteldata, bannerError, bannerMode, carouselBanners]);

  const count = slides.length;
  const isMultiple = count > 1;

  // For infinite loop: [last, ...slides, first]
  const extendedSlides = useMemo(() => {
    if (!isMultiple) return slides;
    return [slides[count - 1], ...slides, slides[0]];
  }, [slides, count, isMultiple]);

  const [index, setIndex] = useState(isMultiple ? 1 : 0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const isSwiping = useRef(false);

  const realIndex = isMultiple ? ((index - 1 + count) % count) : 0;

  const resetAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (!isMultiple) return;
    autoPlayRef.current = setInterval(() => {
      setIsTransitioning(true);
      setIndex((prev) => prev + 1);
    }, 3500);
  }, [isMultiple]);

  useEffect(() => {
    resetAutoPlay();
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [resetAutoPlay]);

  // Handle infinite loop snap-back
  useEffect(() => {
    if (!isMultiple) return;
    if (index === 0) {
      // Snapped to clone of last — jump to real last
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setIndex(count);
      }, 500);
      return () => clearTimeout(timer);
    }
    if (index === count + 1) {
      // Snapped to clone of first — jump to real first
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setIndex(1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [index, count, isMultiple]);

  // Re-enable transition after snap-back
  useEffect(() => {
    if (!isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const goToSlide = (realIdx: number) => {
    setIsTransitioning(true);
    setIndex(realIdx + 1);
    resetAutoPlay();
  };

  // Touch / swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    isSwiping.current = true;
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    if (trackRef.current) {
      const slideWidth = trackRef.current.parentElement?.offsetWidth || 0;
      const baseOffset = -index * slideWidth;
      trackRef.current.style.transition = "none";
      trackRef.current.style.transform = `translateX(${baseOffset + touchDeltaX.current}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    const slideWidth = trackRef.current?.parentElement?.offsetWidth || 300;
    const threshold = slideWidth * 0.3;

    // Determine target index
    let newIndex = index;
    if (touchDeltaX.current < -threshold) {
      newIndex = index + 1;
    } else if (touchDeltaX.current > threshold) {
      newIndex = index - 1;
    }

    // Apply smooth transition to target position
    if (trackRef.current) {
      trackRef.current.style.transition = "transform 400ms cubic-bezier(0.25, 0.1, 0.25, 1)";
      trackRef.current.style.transform = `translateX(-${newIndex * slideWidth}px)`;
    }

    // After transition completes, sync React state
    setTimeout(() => {
      if (trackRef.current) {
        trackRef.current.style.transition = "";
        trackRef.current.style.transform = "";
      }
      setIsTransitioning(true);
      setIndex(newIndex);
    }, 420);

    resetAutoPlay();
  };

  const renderSlide = (slide: { image: string; title?: string }, idx: number) => (
    <div key={idx} className="w-full h-full flex-shrink-0">
      {slide.image ? (
        isVideoUrl(slide.image) ? (
          <video
            src={slide.image}
            poster={getVideoThumbnailUrl(slide.image)}
            preload="metadata"
            autoPlay muted loop playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={slide.image}
            alt={slide.title || "Banner"}
            className="w-full h-full object-cover"
            onError={() => { if (idx === 0) setBannerError(true); }}
          />
        )
      ) : (
        <div
          className="w-full h-full flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: accent }}
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#fff 2px, transparent 2px)", backgroundSize: "20px 20px" }} />
          <h2 className="font-handwriting text-white text-3xl font-bold drop-shadow-md text-center px-4 relative z-10">{slide.title}</h2>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative px-4 pt-3">
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ height: "180px" }}
        onTouchStart={isMultiple ? handleTouchStart : undefined}
        onTouchMove={isMultiple ? handleTouchMove : undefined}
        onTouchEnd={isMultiple ? handleTouchEnd : undefined}
      >
        <div
          ref={trackRef}
          className="flex h-full"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: isTransitioning ? "transform 600ms cubic-bezier(0.25, 0.1, 0.25, 1)" : "none",
          }}
        >
          {extendedSlides.map((slide, idx) => renderSlide(slide, idx))}
        </div>
      </div>

      {isMultiple && (
        <div className="flex justify-center gap-1.5 mt-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className="rounded-full transition-all duration-300"
              style={{
                width: realIndex === idx ? "16px" : "6px",
                height: "6px",
                backgroundColor: realIndex === idx ? accent : `${accent}30`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =================================================================
// =================================================================
// Compact Offers Tab - shows discount codes + item offers inline
// =================================================================
const CompactOffersTab = ({
  offers,
  hoteldata,
  styles,
  tableNumber,
}: {
  offers: any[];
  hoteldata: any;
  styles: any;
  tableNumber: number;
}) => {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();

  useEffect(() => {
    if (!hoteldata?.id) return;
    import("@/lib/hasuraClient").then(({ fetchFromHasura }) => {
      fetchFromHasura(
        `query GetDiscounts($pid: uuid!) {
          discounts(where: { partner_id: { _eq: $pid }, is_active: { _eq: true }, _or: [{ expires_at: { _is_null: true } }, { expires_at: { _gt: "now()" } }] }, order_by: [{ rank: asc_nulls_last }]) {
            id code discount_type discount_value min_order_value max_discount_amount has_coupon description
          }
        }`,
        { pid: hoteldata.id }
      ).then((data: any) => {
        setDiscounts(data?.discounts || []);
      });
    });
  }, [hoteldata?.id]);

  const couponDiscounts = discounts.filter((d) => d.has_coupon);
  const hasOffers = offers && offers.length > 0;
  const hasCoupons = couponDiscounts.length > 0;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getDescription = (d: any) => {
    if (d.description) return d.description;
    const val = d.discount_type === "percentage" ? `${d.discount_value}% OFF` : `₹${d.discount_value} OFF`;
    const min = d.min_order_value ? ` ABOVE ${d.min_order_value}` : "";
    const max = d.max_discount_amount ? ` UPTO ${d.max_discount_amount}` : "";
    return `${val}${min}${max}`;
  };

  if (!hasOffers && !hasCoupons) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Tag size={48} className="mb-4 opacity-20" style={{ color: styles?.color }} />
        <p className="text-lg font-semibold" style={{ color: styles?.color }}>No offers currently</p>
        <p className="text-sm mt-1 opacity-50" style={{ color: styles?.color }}>Check back later for exciting deals!</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      {/* Coupon Codes Section */}
      {hasCoupons && (
        <div className="mb-6">
          <h3 className="font-bold text-base mb-3" style={{ color: styles?.color }}>Available Coupons</h3>
          <div className="space-y-3">
            {couponDiscounts.map((d) => (
              <div key={d.id} className="rounded-xl p-4" style={{ backgroundColor: `${styles?.accent || "#ea580c"}08`, border: `1px solid ${styles?.accent || "#ea580c"}20` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="border-2 border-dashed rounded-md px-3 py-1" style={{ borderColor: "#22c55e", color: "#22c55e" }}>
                    <span className="text-sm font-bold tracking-wider">{d.code}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(d.code)}
                    className="text-xs font-semibold px-3 py-1 rounded-md transition-colors"
                    style={{ color: copiedCode === d.code ? "#22c55e" : styles?.accent }}
                  >
                    {copiedCode === d.code ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-xs font-medium" style={{ color: styles?.color, opacity: 0.7 }}>{getDescription(d)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Offers Section */}
      {hasOffers && (
        <div>
          <h3 className="font-bold text-base mb-3" style={{ color: styles?.color }}>Offers</h3>
          <div className="grid grid-cols-2 gap-3">
            {offers.map((offer) => {
              const menuItem = hoteldata?.menus?.find((m: any) => m.id === offer.menu?.id);
              if (!menuItem) return null;
              const originalPrice = offer.variant?.price || offer.menu?.price || 0;
              const offerPrice = offer.offer_price ?? 0;
              const discount = originalPrice > 0 ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100) : 0;
              const itemInCart = items?.find((i) => i.id === menuItem.id);
              const quantity = itemInCart?.quantity || 0;

              return (
                <div key={offer.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${styles?.accent || "#ea580c"}15` }}>
                  <div className="relative h-28">
                    <img
                      src={offer.menu?.image_url || "/image_placeholder.png"}
                      alt={offer.menu?.name}
                      className="w-full h-full object-cover"
                    />
                    {discount > 0 && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {discount}% OFF
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold truncate" style={{ color: styles?.color }}>{offer.menu?.name}</p>
                    {offer.variant && (
                      <p className="text-[10px] opacity-50 mt-0.5">{offer.variant.name}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm font-bold" style={{ color: styles?.accent }}>
                        {hoteldata?.currency || "₹"}{offerPrice}
                      </span>
                      {originalPrice > 0 && originalPrice !== offerPrice && (
                        <span className="text-[10px] line-through opacity-40">
                          {hoteldata?.currency || "₹"}{originalPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Compact Social Icons (inline, right of store name)
// =================================================================
const CompactSocialIcons = ({
  socialLinks,
  geoLocationLink,
  hoteldata,
}: {
  socialLinks: any;
  geoLocationLink?: string;
  hoteldata?: any;
}) => {
  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const ratingKey = hoteldata?.id ? `rating_${hoteldata.id}` : "";

  useEffect(() => {
    if (!ratingKey) return;
    const saved = localStorage?.getItem(ratingKey);
    if (saved) {
      setRating(parseInt(saved, 10));
      setHasRated(true);
    }
  }, [ratingKey]);

  const handleStarClick = (index: number) => {
    if (hasRated || !ratingKey) return;
    const newRating = index + 1;
    setRating(newRating);
    localStorage?.setItem(ratingKey, newRating.toString());
    setHasRated(true);
    if (newRating === 5) {
      const reviewUrl = socialLinks?.googleReview ||
        (hoteldata?.place_id ? `https://search.google.com/local/writereview?placeid=${hoteldata.place_id}` : null);
      if (reviewUrl) window.open(reviewUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => setShowRateModal(false), 500);
    } else {
      setShowThankYou(true);
      setTimeout(() => { setShowRateModal(false); setShowThankYou(false); }, 2000);
    }
  };

  const icons: { href?: string; icon: React.ReactNode; color: string; bg: string; onClick?: () => void }[] = [];

  if (socialLinks?.phone && socialLinks.phone !== "") {
    icons.push({
      href: `tel:${socialLinks.phone}`,
      icon: <Phone size={14} />,
      color: "#ff4d4f",
      bg: "#fff5f5",
    });
  }
  if (socialLinks?.whatsapp && socialLinks.whatsapp !== "") {
    icons.push({
      href: socialLinks.whatsapp,
      icon: <FaWhatsapp size={14} />,
      color: "#25D366",
      bg: "#f0fdf4",
    });
  }
  if (socialLinks?.instagram && socialLinks.instagram !== "") {
    icons.push({
      href: socialLinks.instagram.startsWith("http") ? socialLinks.instagram : socialLinks.instagram,
      icon: <FaInstagram size={14} />,
      color: "#ad46ff",
      bg: "#faf5ff",
    });
  }
  if (socialLinks?.facebook && socialLinks.facebook !== "") {
    icons.push({
      href: socialLinks.facebook.startsWith("http") ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`,
      icon: <FaFacebook size={14} />,
      color: "#1877F2",
      bg: "#eff6ff",
    });
  }
  if (geoLocationLink || (socialLinks?.location && socialLinks.location !== "")) {
    icons.push({
      href: (geoLocationLink || socialLinks.location) as string,
      icon: <MapPin size={14} />,
      color: "#2b7fff",
      bg: "#eff6ff",
    });
  }
  // Rate Us star icon
  if (!hasRated) {
    icons.push({
      icon: <Star size={14} strokeWidth={2} />,
      color: "#f59e0b",
      bg: "#fef9ee",
      onClick: () => setShowRateModal(true),
    });
  }

  if (icons.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {icons.map((item, idx) =>
          item.onClick ? (
            <button
              key={idx}
              onClick={item.onClick}
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm border flex-shrink-0 transition-transform hover:scale-105"
              style={{ backgroundColor: item.bg, color: item.color, borderColor: `${item.color}20` }}
            >
              {item.icon}
            </button>
          ) : (
            <a
              key={idx}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm border flex-shrink-0 transition-transform hover:scale-105"
              style={{ backgroundColor: item.bg, color: item.color, borderColor: `${item.color}20` }}
            >
              {item.icon}
            </a>
          )
        )}
      </div>

      {/* Rate Us Modal */}
      {showRateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setShowRateModal(false); setShowThankYou(false); }}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            {showThankYou ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <h3 className="text-xl font-semibold text-gray-900">Thank you!</h3>
                <p className="text-gray-600">We appreciate your feedback.</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">Rate our service</h3>
                  <p className="mt-1 text-sm text-gray-500">Your feedback helps us improve.</p>
                </div>
                <div className="flex justify-center py-6">
                  {[...Array(5)].map((_, index) => (
                    <Star
                      key={index}
                      className={`h-10 w-10 transition-transform duration-200 ${hasRated ? "cursor-default" : "cursor-pointer hover:scale-125"}`}
                      fill={index + 1 <= (hoverRating || rating) ? "#FFD700" : "#E5E7EB"}
                      stroke={index + 1 <= (hoverRating || rating) ? "#FFD700" : "#E5E7EB"}
                      onClick={() => handleStarClick(index)}
                      onMouseEnter={() => !hasRated && setHoverRating(index + 1)}
                      onMouseLeave={() => !hasRated && setHoverRating(0)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const Compact = ({
  styles,
  theme,
  open_place_order_modal,
  hoteldata,
  socialLinks,
  offers,
  tableNumber,
  auth,
  topItems,
  items,
  pathname,
  categories,
  setSelectedCategory,
  qrGroup,
  qrId,
  isOnFreePlan,
}: DefaultHotelPageProps) => {
  const [activeCatIndex, setActiveCatIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"food" | "orders" | "offers">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "orders" || tab === "offers") return tab;
    }
    return "food";
  });

  // Custom Theme State
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [localStyles, setLocalStyles] = useState(
    styles || { color: "#000", backgroundColor: "#fff", accent: "#ea580c" },
  );
  const [mobileTab, setMobileTab] = useState<
    "backgroundColor" | "color" | "accent"
  >("accent");
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  const categoryHeadersRef = useRef<(HTMLHeadingElement | null)[]>([]);
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const categoryElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const isOwner = auth && hoteldata ? auth?.id === hoteldata?.id : false;
  const themeButtonRef = useRef<HTMLButtonElement>(null);
  const hasOffers = offers && offers.length > 0;
  const [vegFilter, setVegFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [bannerError, setBannerError] = useState(false);

  // Save theme to localStorage for profile page
  useEffect(() => {
    try {
      const pathname = typeof window !== "undefined" ? window.location.pathname : "";
      localStorage.setItem("hotelTheme", JSON.stringify({
        accent: localStyles?.accent || "#ea580c",
        bg: localStyles?.backgroundColor || "#fff",
        text: localStyles?.color || "#000",
        storeName: hoteldata?.store_name || "",
        storePath: pathname,
      }));
    } catch {}
  }, [localStyles, hoteldata?.store_name]);

  // Sync props to local state if not editing
  useEffect(() => {
    if (!showThemeCustomizer && styles) {
      setLocalStyles(styles);
    }
  }, [styles, showThemeCustomizer]);

  useEffect(() => {
    setBannerError(false);
  }, [hoteldata?.store_banner]);

  // Check if any menu items have is_veg set (not null)
  const hasVegFilter = useMemo(() => {
    return hoteldata?.menus?.some(
      (item) => item.is_veg !== null && item.is_veg !== undefined,
    );
  }, [hoteldata?.menus]);

  useEffect(() => {
    const handleScroll = () => {
      // Added a buffer to the sticky position for more accurate detection
      const scrollPosition = window.scrollY + 200;
      let currentActiveIndex = 0;

      // Find which category header is currently at or above the scroll position
      for (let i = 0; i < categoryHeadersRef.current.length; i++) {
        const header = categoryHeadersRef.current[i];
        if (header && header.offsetTop <= scrollPosition) {
          currentActiveIndex = i;
        } else {
          break;
        }
      }

      if (currentActiveIndex !== activeCatIndex) {
        setActiveCatIndex(currentActiveIndex);
        scrollCategoryIntoView(currentActiveIndex);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories, activeCatIndex]);

  useEffect(() => {
    // Update border position whenever activeCatIndex changes
    updateBorderPosition(activeCatIndex);
  }, [activeCatIndex]);

  const scrollCategoryIntoView = (index: number) => {
    const container = categoriesContainerRef.current;
    if (!container) return;

    const categoryElement = categoryElementsRef.current[index];
    if (!categoryElement) return;

    const containerRect = container.getBoundingClientRect();
    const categoryRect = categoryElement.getBoundingClientRect();

    // Scroll horizontally if the active category tab is not fully visible
    if (categoryRect.left < containerRect.left) {
      container.scrollTo({
        left:
          container.scrollLeft + (categoryRect.left - containerRect.left) - 10,
        behavior: "smooth",
      });
    } else if (categoryRect.right > containerRect.right) {
      container.scrollTo({
        left:
          container.scrollLeft +
          (categoryRect.right - containerRect.right) +
          10,
        behavior: "smooth",
      });
    }
  };

  const updateBorderPosition = (index: number) => {
    const container = categoriesContainerRef.current;
    const border = borderRef.current;
    const activeCategory = categoryElementsRef.current[index];

    if (!container || !border || !activeCategory) return;

    const containerRect = container.getBoundingClientRect();
    const categoryRect = activeCategory.getBoundingClientRect();

    // Calculate position relative to the scrollable container
    const left = categoryRect.left - containerRect.left + container.scrollLeft;
    const width = categoryRect.width;

    // Apply the new position and width to the animated border
    border.style.transform = `translateX(${left}px)`;
    border.style.width = `${width}px`;
  };

  const handleCategoryClick = (index: number, category: any) => {
    setActiveCatIndex(index);
    const element = document.getElementById(category.name);
    if (element) {
      const offset = 100; // Offset to account for sticky headers
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    scrollCategoryIntoView(index);
  };

  // Theme Saving Logic
  const handleSaveTheme = async () => {
    if (!hoteldata?.id) return;
    setIsSavingTheme(true);
    try {
      const updatedTheme = {
        ...theme,
        colors: {
          text: localStyles.color,
          bg: localStyles.backgroundColor,
          accent: localStyles.accent,
        },
      };

      await updatePartner(hoteldata.id, {
        theme: JSON.stringify(updatedTheme),
      });

      toast.success("Theme updated successfully!");
      await revalidateTag(hoteldata.id);
      setShowThemeCustomizer(false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to save theme:", error);
      toast.error("Failed to save theme");
    } finally {
      setIsSavingTheme(false);
    }
  };

  // Memoize the category list to prevent re-creation on every render
  const allCategories = useMemo(() => {
    let cats = [...categories];

    if (hasOffers) {
      // If we have dynamic offers, remove any manual "Offer/Offers" category to avoid duplicates
      // We prioritize the dynamic one because it contains the actual discounted items logic.
      cats = cats.filter((c) => {
        const name = c.name.toLowerCase().trim();
        return name !== "offer" && name !== "offers";
      });

      cats.push({
        id: "offers",
        name: "Offers",
        priority: -2,
      } as any);
    }

    if (topItems && topItems.length > 0) {
      cats.push({
        id: "must-try",
        name: "Must Try",
        priority: -1,
      } as any);
    }

    return cats.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }, [categories, hasOffers, topItems]);

  // Calculate if bottom nav should be shown
  const showBottomNav =
    auth?.role === "user" &&
    (getFeatures(hoteldata?.feature_flags as string)?.ordering.enabled ==
      true ||
      getFeatures(hoteldata?.feature_flags as string)?.delivery.enabled ==
        true);

  return (
    <div
      style={{
        backgroundColor: localStyles?.backgroundColor || "#fff",
        fontFamily: "var(--font-inter), 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
      className="min-h-screen antialiased"
    >
      <main
        style={{
          color: localStyles?.color || "#1a1a1a",
          backgroundColor: localStyles?.backgroundColor || "#fff",
          letterSpacing: "-0.01em",
        }}
        className="max-w-4xl mx-auto relative pb-40"
      >
        {/* Floating buttons - Only visible in Food tab */}
        {activeTab === "food" && (
          <>
            {/* category list btn  */}
            <CategoryListBtn
              categories={allCategories}
              hasBottomNav={showBottomNav}
            />


          </>
        )}

        {activeTab === "food" ? (
          <>
            {/* ===== LOCATION HEADER (hide for QR scan / dine-in) ===== */}
            {tableNumber === 0 && (
              <LocationHeader
                hoteldata={hoteldata}
                styles={localStyles}
                accent={localStyles?.accent || "#ea580c"}
                bannerError={bannerError}
                setBannerError={setBannerError}
              />
            )}

            {/* Announcement Bar (below header) */}
            {hoteldata?.delivery_rules?.announcement && (
              <div
                className="px-4 py-2 text-center"
                style={{ backgroundColor: `${localStyles?.accent || "#ea580c"}15` }}
              >
                <p className="text-[12px] font-medium" style={{ color: localStyles?.accent || "#ea580c" }}>
                  {hoteldata.delivery_rules.announcement}
                </p>
              </div>
            )}

            <ShopClosedModalWarning
              hotelId={hoteldata?.id}
              isShopOpen={hoteldata?.is_shop_open}
            />

            {/* ===== BANNER CAROUSEL ===== */}
            <BannerCarousel
              hoteldata={hoteldata}
              bannerError={bannerError}
              setBannerError={setBannerError}
              accent={localStyles?.accent || "#ea580c"}
              topItems={topItems}
            />

            {/* ===== STORE NAME + SEARCH ===== */}
            <div className="px-4 pt-4 pb-1 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-[22px] font-bold">{hoteldata?.store_name}</h1>
                {((hoteldata?.district && hoteldata.district !== "") ||
                  (hoteldata?.country && hoteldata.country !== "") ||
                  (hoteldata?.location_details &&
                    hoteldata.location_details !== "")) && (
                  <div className="inline-flex items-center gap-1.5 text-xs opacity-60 mt-0.5">
                    <MapPin size={12} />
                    <span>
                      {hoteldata.location_details ||
                        hoteldata.district ||
                        hoteldata.country}
                    </span>
                  </div>
                )}
              </div>
              <SearchItems
                menu={hoteldata?.menus}
                hoteldata={hoteldata}
                styles={localStyles}
                tableNumber={tableNumber}
                auth={auth}
                iconOnly
                inputStyle
              />
            </div>

            {/* Horizontal Social Icons */}
            <CompactSocialIcons
              socialLinks={socialLinks}
              hoteldata={hoteldata}
              geoLocationLink={
                hoteldata?.place_id
                  ? `https://www.google.com/maps/place/?q=place_id:${hoteldata.place_id}`
                  : hoteldata?.geo_location?.coordinates
                    ? `https://www.google.com/maps?q=${hoteldata.geo_location.coordinates[1]},${hoteldata.geo_location.coordinates[0]}`
                    : undefined
              }
            />

            {/* Theme customizer button for owner */}
            {isOwner && !isOnFreePlan && (
              <div className="px-4 pb-2">
                <div
                  onClick={() => setShowThemeCustomizer(!showThemeCustomizer)}
                  className="inline-flex items-center gap-2 border-[1px] border-gray-300 p-2 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  role="button"
                  aria-label="Customize Theme"
                >
                  <Palette size={15} style={{ color: "#000" }} />
                  <span className="text-xs text-nowrap text-gray-500 font-medium">
                    {showThemeCustomizer ? "Close Editor" : "Change Theme"}
                  </span>
                </div>
              </div>
            )}

            {/* Discount Banner */}
            <DiscountBanner
              partnerId={hoteldata?.id || ""}
              currency={hoteldata?.currency || "₹"}
              accent={localStyles?.accent || "#ea580c"}
            />

            {/* Categories Navigation */}
            <div
              style={{
                backgroundColor: localStyles?.backgroundColor || "#fff",
                color: localStyles?.color || "#000",
                borderColor: localStyles?.border?.borderColor || "#0000001D",
              }}
              ref={categoriesContainerRef}
              className="overflow-x-auto w-full flex gap-1 px-2 py-1 sticky top-[60px] z-10 shadow-sm scrollbar-hide border-b"
              onScroll={() => updateBorderPosition(activeCatIndex)}
            >
              {/* Animated border element */}
              <div
                ref={borderRef}
                className="absolute bottom-0 left-0 h-0.5 transition-all duration-300 ease-in-out "
                style={{
                  backgroundColor: localStyles?.accent || "#000",
                  width: "0px", // Initial width set to 0, updated by useEffect
                }}
              />

              {allCategories.map((category, index) => (
                <div
                  ref={(el) => {
                    categoryElementsRef.current[index] = el;
                  }}
                  style={{
                    color:
                      activeCatIndex === index
                        ? localStyles?.accent || "#000"
                        : localStyles?.color || "gray",
                  }}
                  onClick={() => handleCategoryClick(index, category)}
                  key={category.id}
                  className={`px-3 py-2.5 text-nowrap cursor-pointer text-[15px] ${
                    activeCatIndex === index ? "font-bold" : "font-normal opacity-60"
                  } flex-shrink-0`}
                >
                  {formatDisplayName(category.name)}
                </div>
              ))}
            </div>

            {/* Categories Content */}
            <div className="grid px-4">
              {allCategories.map((category, index) => {
                  // Conditionally determine the list of items to render for other categories.
                  let itemsToDisplay = [];

                  switch (category.id) {
                    case "offers":
                      // Create a Set of menu IDs for faster lookups.
                      const offerMenuIdSet = new Set(
                        offers.map((offer) => offer.menu.id),
                      );
                      // Filter 'hoteldata.menus' by checking for the item's ID in the Set.
                      itemsToDisplay = hoteldata?.menus.filter((item) => {
                        const matchesOffer = offerMenuIdSet.has(
                          item.id as string,
                        );
                        if (hoteldata.hide_unavailable && !item.is_available)
                          return false;
                        if (vegFilter === "all" || !hasVegFilter)
                          return matchesOffer;
                        if (vegFilter === "veg")
                          return matchesOffer && item.is_veg === true;
                        if (vegFilter === "non-veg")
                          return matchesOffer && item.is_veg === false;
                        return matchesOffer;
                      });
                      break;
                    case "must-try":
                      // If the category is "must_try", display the top items.
                      itemsToDisplay = topItems.filter((item) => {
                        if (hoteldata.hide_unavailable && !item.is_available)
                          return false;
                        if (vegFilter === "all" || !hasVegFilter) return true;
                        if (vegFilter === "veg") return item.is_veg === true;
                        if (vegFilter === "non-veg")
                          return item.is_veg === false;
                        return true;
                      });
                      break;
                    default:
                      itemsToDisplay = hoteldata?.menus.filter((item) => {
                        const matchesCategory =
                          item.category.id === category.id;
                        if (hoteldata.hide_unavailable && !item.is_available)
                          return false;
                        if (vegFilter === "all" || !hasVegFilter)
                          return matchesCategory;
                        if (vegFilter === "veg")
                          return matchesCategory && item.is_veg === true;
                        if (vegFilter === "non-veg")
                          return matchesCategory && item.is_veg === false;
                        return matchesCategory;
                      });
                  }

                  // Do not render the category section if there are no items to display.
                  if (!itemsToDisplay || itemsToDisplay.length === 0) {
                    return null;
                  }

                  itemsToDisplay.sort((a, b) => {
                    return (a.priority || 0) - (b.priority || 0);
                  });

                  return (
                    <section
                      key={category.id}
                      id={category.name}
                    >
                      <div
                        ref={(el) => {
                          categoryHeadersRef.current[index] = el;
                        }}
                        style={{
                          backgroundColor:
                            localStyles?.backgroundColor || "#fff",
                        }}
                        className="sticky top-[100px] z-[9] pt-5 pb-2"
                      >
                        <h2 className="text-[18px] font-bold leading-snug">
                          <span style={{ color: localStyles?.color || "#1a1a1a" }}>
                            {formatDisplayName(category.name)}
                          </span>{" "}
                          <span className="font-normal" style={{ color: localStyles?.accent || "#ea580c" }}>
                            ({itemsToDisplay.length} {itemsToDisplay.length === 1 ? "item" : "items"})
                          </span>
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-x-4 md:gap-y-1" style={{ borderColor: localStyles?.border?.borderColor || "#e5e7eb" }}>
                        {itemsToDisplay.map((item) => {
                          // Find all offers for this item
                          const itemOffers =
                            offers?.filter(
                              (offer) => offer.menu.id === item.id,
                            ) || [];

                          let offerData = undefined;
                          let hasMultipleVariantsOnOffer = false;
                          let isUpcomingOffer = false;
                          let activeOffers: any[] = [];
                          let upcomingOffers: any[] = [];

                          if (itemOffers.length > 0) {
                            // Check for upcoming offers (start_time > current time)
                            const now = new Date();
                            upcomingOffers = itemOffers.filter(
                              (offer) => new Date(offer.start_time) > now,
                            );
                            activeOffers = itemOffers.filter(
                              (offer) => new Date(offer.start_time) <= now,
                            );

                            // If there are upcoming offers, mark as upcoming
                            if (upcomingOffers.length > 0) {
                              isUpcomingOffer = true;
                            }

                            if (isUpcomingOffer) {
                              // For upcoming offers, ONLY show original price - don't use offer price at all
                              if (upcomingOffers.length > 1) {
                                // Multiple variants on upcoming offer
                                hasMultipleVariantsOnOffer = true;
                                const lowestOfferPrice = Math.min(
                                  ...upcomingOffers.map(
                                    (o) => o.offer_price || 0,
                                  ),
                                );
                                const lowestOriginalPrice = Math.min(
                                  ...upcomingOffers.map((o) =>
                                    o.variant
                                      ? o.variant.price
                                      : o.menu?.price || 0,
                                  ),
                                );

                                // For upcoming offers: show original price as main, offer price as strikethrough
                                offerData = {
                                  ...upcomingOffers[0],
                                  offer_price: lowestOriginalPrice, // Main displayed price (original)
                                  menu: {
                                    ...upcomingOffers[0].menu,
                                    price: lowestOfferPrice,
                                  }, // Future offer price for strikethrough
                                };
                              } else if (upcomingOffers.length === 1) {
                                // Single variant on upcoming offer
                                const offer = upcomingOffers[0];
                                const originalPrice = offer?.variant
                                  ? offer.variant.price
                                  : offer?.menu?.price || item.price;
                                const futureOfferPrice =
                                  typeof offer?.offer_price === "number"
                                    ? offer.offer_price
                                    : item.price;

                                // For upcoming offers: show original price as main, offer price as strikethrough
                                offerData = {
                                  ...offer,
                                  offer_price: originalPrice, // Main displayed price (original)
                                  menu: {
                                    ...offer.menu,
                                    price: futureOfferPrice,
                                  }, // Future offer price for strikethrough
                                };
                              }
                            } else {
                              // For active offers, use the existing logic
                              const offersToUse = activeOffers;

                              if (offersToUse.length > 1) {
                                // Multiple variants on offer - calculate lowest offer price
                                hasMultipleVariantsOnOffer = true;
                                const lowestOfferPrice = Math.min(
                                  ...offersToUse.map((o) => o.offer_price || 0),
                                );
                                // Create a mock offer data with the lowest price for display
                                offerData = {
                                  ...offersToUse[0],
                                  offer_price: lowestOfferPrice,
                                };
                              } else if (offersToUse.length === 1) {
                                // Single variant on offer
                                offerData = offersToUse[0];
                              }
                            }
                          }

                          return (
                            <ItemCard
                              tableNumber={tableNumber}
                              feature_flags={hoteldata?.feature_flags}
                              hoteldata={hoteldata}
                              item={item}
                              offerData={offerData}
                              styles={localStyles}
                              key={item.id}
                              hasMultipleVariantsOnOffer={
                                hasMultipleVariantsOnOffer
                              }
                              allItemOffers={
                                hasMultipleVariantsOnOffer
                                  ? itemOffers
                                  : undefined
                              }
                              currentCategory={category.id}
                              isOfferCategory={category.id === "offers"}
                              isUpcomingOffer={isUpcomingOffer}
                              activeOffers={
                                isUpcomingOffer ? upcomingOffers : activeOffers
                              }
                              auth={auth}
                              defaultShowOptions={defaultShowOptionsPartners.includes(
                                hoteldata?.id ?? "",
                              )}
                            />
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
            </div>

            {/* Floating Theme Customizer */}
            {showThemeCustomizer && (
              <div className="fixed bottom-6 left-4 right-4 z-50 flex flex-col gap-3 max-w-xl mx-auto">
                <div className="flex justify-end mb-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full shadow-sm bg-white/90 backdrop-blur"
                    onClick={() => setShowThemeCustomizer(false)}
                  >
                    <X size={16} className="mr-1" /> Close
                  </Button>
                </div>
                {!isCustomMode ? (
                  <div className="bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-white/50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
                      {PRESETS.map((palette, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setLocalStyles((prev) => ({
                              ...prev,
                              color: palette.text,
                              backgroundColor: palette.background,
                              accent: palette.accent,
                            }));
                          }}
                          className={`w-12 h-12 flex-shrink-0 rounded-full border-2 flex items-center justify-center relative overflow-hidden transition-all shadow-sm ${
                            localStyles.backgroundColor ===
                              palette.background &&
                            localStyles.accent === palette.accent
                              ? "border-orange-600 scale-110 ring-2 ring-orange-100"
                              : "border-white/50"
                          }`}
                          style={{
                            backgroundColor: palette.background,
                          }}
                        >
                          <div
                            className="w-4 h-4 rounded-full shadow-sm"
                            style={{
                              backgroundColor: palette.accent,
                            }}
                          />
                        </button>
                      ))}

                      <button
                        onClick={() => setIsCustomMode(true)}
                        className={`w-12 h-12 flex-shrink-0 rounded-full border-2 flex items-center justify-center relative overflow-hidden transition-all shadow-sm ${
                          isCustomMode
                            ? "border-orange-600 scale-110 ring-2 ring-orange-100"
                            : "border-gray-200"
                        } bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100`}
                      >
                        <Palette size={18} className="text-gray-700" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-10 fade-in duration-300 space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setIsCustomMode(false)}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        {(["backgroundColor", "color", "accent"] as const).map(
                          (tab) => {
                            const label =
                              tab === "backgroundColor"
                                ? "Background"
                                : tab === "color"
                                  ? "Text"
                                  : "Accent";
                            return (
                              <button
                                key={tab}
                                onClick={() => setMobileTab(tab)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                                  mobileTab === tab
                                    ? "bg-white shadow text-gray-900"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          },
                        )}
                      </div>
                      <div className="w-8" /> {/* Spacer */}
                    </div>

                    <div className="flex justify-center pb-2">
                      {/* Map mobileTab to style property */}
                      <HexColorPicker
                        color={localStyles[mobileTab] as string}
                        onChange={(c) =>
                          setLocalStyles((prev) => ({
                            ...prev,
                            [mobileTab]: c,
                          }))
                        }
                        style={{ width: "100%", height: "160px" }}
                      />
                    </div>

                    {/* Hex input */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 flex-shrink-0 rounded-lg border border-gray-200 shadow-sm"
                        style={{
                          backgroundColor: localStyles[mobileTab] as string,
                        }}
                      />
                      <input
                        type="text"
                        value={localStyles[mobileTab] as string}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalStyles((prev) => ({
                            ...prev,
                            [mobileTab]: val,
                          }));
                        }}
                        placeholder="#000000"
                        maxLength={7}
                        spellCheck={false}
                        className="flex-1 font-mono text-sm px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:border-gray-400 outline-none text-black"
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSaveTheme}
                  disabled={isSavingTheme}
                  className="w-full h-12 text-base rounded-full bg-green-600 z-[202] hover:bg-green-700 shadow-xl"
                >
                  {isSavingTheme ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <Check className="mr-2 w-5 h-5" />
                  )}
                  Save Theme
                </Button>
              </div>
            )}

            {/* Only show 'Login as user' if theme customizer is NOT open */}
            {auth?.role === "partner" &&
            !showThemeCustomizer &&
            ((tableNumber !== 0 &&
              getFeatures(hoteldata?.feature_flags || "")?.ordering.enabled) ||
              (tableNumber === 0 &&
                getFeatures(hoteldata?.feature_flags || "")?.delivery
                  .enabled)) ? (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md px-6 py-4 rounded-2xl bg-black text-white text-center font-semibold shadow-xl">
                Login as user to place order
              </div>
            ) : (
              <OrderDrawer
                styles={localStyles}
                hotelData={hoteldata}
                tableNumber={tableNumber}
                qrId={qrId || undefined}
                qrGroup={qrGroup}
                hasBottomNav={showBottomNav}
              />
            )}
          </>
        ) : activeTab === "offers" ? (
          <CompactOffersTab
            offers={offers}
            hoteldata={hoteldata}
            styles={localStyles}
            tableNumber={tableNumber}
          />
        ) : (
          <CompactOrders hotelId={hoteldata?.id} styles={localStyles} />
        )}

        {/* Bottom Navigation */}
        {showBottomNav && (
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-[999] px-2 py-1.5 flex justify-around items-center max-w-xl mx-auto"
            style={{
              backgroundColor: localStyles?.backgroundColor || "#fff",
              borderColor: localStyles?.border?.borderColor || "#e5e7eb",
            }}
          >
            <button
              onClick={() => setActiveTab("food")}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "food" ? "opacity-100" : "opacity-40"
              }`}
              style={{
                color:
                  activeTab === "food"
                    ? localStyles?.accent
                    : localStyles?.color,
              }}
            >
              <Home size={20} />
              <span className="text-[10px] font-medium">Food</span>
            </button>
            <button
              onClick={() => setActiveTab("offers")}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "offers" ? "opacity-100" : "opacity-40"
              }`}
              style={{
                color:
                  activeTab === "offers"
                    ? localStyles?.accent
                    : localStyles?.color,
              }}
            >
              <Tag size={20} />
              <span className="text-[10px] font-medium">Offers</span>
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "orders" ? "opacity-100" : "opacity-40"
              }`}
              style={{
                color:
                  activeTab === "orders"
                    ? localStyles?.accent
                    : localStyles?.color,
              }}
            >
              <ShoppingBag size={20} />
              <span className="text-[10px] font-medium">Orders</span>
            </button>
            <Link
              href="/user-profile"
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors opacity-40"
              style={{ color: localStyles?.color }}
            >
              <User size={20} />
              <span className="text-[10px] font-medium">Profile</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default Compact;

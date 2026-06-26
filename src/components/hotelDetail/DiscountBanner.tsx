"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Tag, Clock, Copy, Check, BadgePercent, ChevronDown, X } from "lucide-react";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { useAuthStore } from "@/store/authStore";
import useOrderStore from "@/store/orderStore";
import { getUserDiscountUsageQuery } from "@/api/discounts";

type DiscountData = {
  id: string;
  code: string;
  discount_type: "percentage" | "flat" | "freebie";
  discount_value: number;
  min_order_value: number | null;
  max_discount_amount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  valid_time_from: string | null;
  valid_time_to: string | null;
  has_coupon: boolean;
  freebie_item_count: number | null;
  freebie_item_ids: string | null;
  usage_limit: number | null;
  used_count: number;
  per_user_usage_limit: number | null;
  show_on_storefront: boolean;
};

// V5-style slide-up bottom sheet (mirrors V5ItemCard's sheet): dimmed backdrop,
// rounded top, slides in/out. Used by the "summary" variant to reveal offers.
function OffersBottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (backdropRef.current) backdropRef.current.style.opacity = "1";
      if (sheetRef.current) sheetRef.current.style.transform = "translateY(0)";
    });
  }, []);

  const animateClose = () => {
    if (backdropRef.current) backdropRef.current.style.opacity = "0";
    if (sheetRef.current) sheetRef.current.style.transform = "translateY(100%)";
    setTimeout(onClose, 280);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end">
      <div
        ref={backdropRef}
        onClick={animateClose}
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        style={{ opacity: 0 }}
      />
      <div
        ref={sheetRef}
        className="relative z-10 mx-auto flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-gray-50 transition-transform duration-300 ease-out"
        style={{ transform: "translateY(100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 pt-4 pb-3">
          <h3 className="text-[17px] font-extrabold tracking-tight text-gray-900">{title}</h3>
          <button
            onClick={animateClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

const DiscountBanner = ({
  partnerId,
  currency,
  accent,
  variant = "cards",
}: {
  partnerId: string;
  currency: string;
  accent: string;
  // "cards" (default) — the full scrollable discount cards (V3/V4).
  // "summary" — a single compact "Items up to X% off · N offers ⌄" row that
  // expands to reveal the cards (V5 / Zomato-style header).
  variant?: "cards" | "summary";
}) => {
  const [discounts, setDiscounts] = useState<DiscountData[]>([]);
  // Index of the offer currently shown in the rotating "summary" ticker.
  const [offerIndex, setOfferIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [freebieItemNames, setFreebieItemNames] = useState<Record<string, string>>({});
  const [userUsageMap, setUserUsageMap] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const { userData: user } = useAuthStore();
  const lastOrderPlacedAt = useOrderStore((s) => s.lastOrderPlacedAt);

  useEffect(() => {
    if (!partnerId) return;
    fetchFromHasura(
      `query GetBannerDiscounts($partner_id: uuid!) {
        discounts(
          where: {
            partner_id: { _eq: $partner_id }
            is_active: { _eq: true }
            show_on_storefront: { _eq: true }
            _or: [
              { expires_at: { _is_null: true } }
              { expires_at: { _gt: "now()" } }
            ]
          }
          order_by: [{ rank: asc_nulls_last }, { created_at: desc }]
        ) {
          id code discount_type discount_value min_order_value
          max_discount_amount starts_at expires_at valid_time_from
          valid_time_to has_coupon freebie_item_count freebie_item_ids
          usage_limit used_count per_user_usage_limit show_on_storefront
        }
      }`,
      { partner_id: partnerId }
    )
      .then(async (res) => {
        const now = new Date();
        const active: DiscountData[] = (res?.discounts ?? []).filter((d: DiscountData) => {
          if (d.starts_at && new Date(d.starts_at) > now) return false;
          if (d.usage_limit != null && d.used_count >= d.usage_limit) return false;
          return true;
        });

        // Resolve current user's usage for codes with a per-customer limit
        const userId = (user as any)?.id;
        const usageMap: Record<string, number> = {};
        if (userId) {
          const perUserLimited = active.filter((d) => d.per_user_usage_limit != null);
          await Promise.all(
            perUserLimited.map(async (d) => {
              try {
                const usageRes = await fetchFromHasura(getUserDiscountUsageQuery, {
                  user_id: userId,
                  partner_id: partnerId,
                  code: d.code,
                });
                usageMap[d.id] = usageRes?.orders_aggregate?.aggregate?.count ?? 0;
              } catch {
                usageMap[d.id] = 0;
              }
            })
          );
        }

        const visible = active.filter((d) => {
          if (d.per_user_usage_limit == null) return true;
          if (!userId) return true;
          return (usageMap[d.id] ?? 0) < d.per_user_usage_limit;
        });

        setUserUsageMap(usageMap);
        setDiscounts(visible);

        // Resolve freebie item names
        const freebieIds = visible
          .filter((d: DiscountData) => d.discount_type === "freebie" && d.freebie_item_ids)
          .flatMap((d: DiscountData) => d.freebie_item_ids!.split(",").map((id: string) => id.trim()))
          .filter(Boolean);
        if (freebieIds.length > 0) {
          fetchFromHasura(
            `query GetFreebieItems($ids: [uuid!]!) { menu(where: { id: { _in: $ids } }) { id name } }`,
            { ids: [...new Set(freebieIds)] }
          ).then((menuRes) => {
            const names: Record<string, string> = {};
            (menuRes?.menu ?? []).forEach((m: { id: string; name: string }) => { names[m.id] = m.name; });
            setFreebieItemNames(names);
          }).catch(() => {});
        }
      })
      .catch((err) => console.error("DiscountBanner fetch failed:", err));
  }, [partnerId, (user as any)?.id, lastOrderPlacedAt]);

  // Rotate the summary ticker through offers one at a time. Only cycles when
  // there's more than one offer to show.
  useEffect(() => {
    if (variant !== "summary" || discounts.length <= 1) return;
    const id = setInterval(() => {
      setOfferIndex((i) => (i + 1) % discounts.length);
    }, 3500);
    return () => clearInterval(id);
  }, [variant, discounts.length]);

  if (discounts.length === 0) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDateTimeRange = (startsAt: string | null, expiresAt: string | null) => {
    if (!startsAt && !expiresAt) return null;
    const fmt = (iso: string) => {
      const d = new Date(iso);
      const day = d.getDate();
      const month = d.toLocaleString([], { month: "short" });
      const hr = d.getHours();
      const min = String(d.getMinutes()).padStart(2, "0");
      const ampm = hr >= 12 ? "PM" : "AM";
      const h12 = hr % 12 || 12;
      return `${day} ${month}, ${h12}:${min} ${ampm}`;
    };
    if (startsAt && expiresAt) return `${fmt(startsAt)} - ${fmt(expiresAt)}`;
    if (startsAt) return `From ${fmt(startsAt)}`;
    return `Until ${fmt(expiresAt!)}`;
  };

  const getDaysLeft = (expires: string | null) => {
    if (!expires) return null;
    const diff = Math.ceil((new Date(expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return null;
    if (diff === 1) return "Ends today";
    if (diff <= 3) return `${diff} days left`;
    return null;
  };

  // ----- Rotating "summary" ticker — one offer at a time -----
  const offerCount = discounts.length;
  // A human sentence for a single offer: its description if present, otherwise a
  // generated "Get up to X% off" / "Get ₹X off" / "Free <item>" line.
  const offerSentence = (d: DiscountData): string => {
    const desc = (d as any)?.description;
    if (typeof desc === "string" && desc.trim()) return desc.trim();
    if (d.discount_type === "freebie") {
      const names = d.freebie_item_ids
        ?.split(",")
        .map((id) => freebieItemNames[id.trim()])
        .filter(Boolean);
      return names?.length ? `Free ${names.join(", ")}` : "Free item with your order";
    }
    if (d.discount_type === "percentage") {
      return d.min_order_value
        ? `Get ${d.discount_value}% off above ${currency}${d.min_order_value}`
        : `Get up to ${d.discount_value}% off`;
    }
    return d.min_order_value
      ? `Get ${currency}${d.discount_value} off above ${currency}${d.min_order_value}`
      : `Get ${currency}${d.discount_value} off`;
  };
  const activeOffer = discounts[offerIndex % discounts.length];
  const activeSentence = activeOffer ? offerSentence(activeOffer) : "";
  const activeTag = activeOffer
    ? activeOffer.has_coupon
      ? activeOffer.code
      : "Auto Apply"
    : null;

  const cardsList = (
    <div
      ref={scrollRef}
      className="flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4"
    >
      {discounts.map((disc) => {
          const daysLeft = getDaysLeft(disc.expires_at);
          const timeRange = formatDateTimeRange(disc.starts_at, disc.expires_at);

          return (
            <div
              key={disc.id}
              className="snap-start shrink-0 w-full rounded-2xl overflow-hidden border relative shadow-sm"
              style={{
                borderColor: accent + "33",
                background: `linear-gradient(135deg, ${accent}16 0%, ${accent}2b 100%)`,
              }}
            >
              <div className="px-3 py-3 flex items-center gap-3">
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{ backgroundColor: accent, color: "#ffffff" }}
                >
                  <Tag size={16} className="text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold leading-none truncate" style={{ color: accent }}>
                      {disc.discount_type === "freebie"
                        ? (() => {
                            const names = disc.freebie_item_ids?.split(",").map((id) => freebieItemNames[id.trim()]).filter(Boolean);
                            return names?.length ? `FREE ${names.join(", ")}` : "FREE ITEM";
                          })()
                        : disc.discount_type === "percentage"
                        ? `${disc.discount_value}% OFF`
                        : `${currency}${disc.discount_value} OFF`}
                    </p>
                    {daysLeft && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white whitespace-nowrap"
                        style={{ backgroundColor: accent }}
                      >
                        {daysLeft}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {disc.min_order_value && (
                      <span className="text-[10px] opacity-60">
                        Purchase above {currency}{disc.min_order_value} to apply
                      </span>
                    )}
                    {disc.max_discount_amount && disc.discount_type === "percentage" && (
                      <span className="text-[10px] opacity-60">
                        · Max {currency}{disc.max_discount_amount}
                      </span>
                    )}
                    {!disc.has_coupon && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: accent + "20", color: accent }}
                      >
                        Auto Apply
                      </span>
                    )}
                    {disc.per_user_usage_limit != null && (user as any)?.id && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: accent + "20", color: accent }}
                      >
                        Used {userUsageMap[disc.id] ?? 0}/{disc.per_user_usage_limit}
                      </span>
                    )}
                    {false && timeRange && (
                      <span className="text-[10px] opacity-60 flex items-center gap-0.5">
                        · <Clock size={9} /> {timeRange}
                      </span>
                    )}
                  </div>
                </div>

                {/* Copy button */}
                {disc.has_coupon && (
                  <button
                    onClick={() => handleCopy(disc.code)}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed transition-all active:scale-95"
                    style={{ borderColor: accent + "40", backgroundColor: "white" }}
                  >
                    <span className="font-mono font-bold text-xs tracking-wider" style={{ color: accent }}>
                      {disc.code}
                    </span>
                    {copiedCode === disc.code ? (
                      <Check size={12} className="text-green-500" />
                    ) : (
                      <Copy size={12} style={{ color: accent }} />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );

  if (variant === "summary") {
    // Rotating ticker — one offer shown at a time; tapping the row opens a
    // bottom sheet listing every offer (white cards).
    return (
      <>
        <style>{`
          @keyframes offerTickerIn {
            0% { transform: translateY(-100%); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-left transition active:bg-gray-50"
          aria-label="View all offers"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <BadgePercent className="h-[18px] w-[18px] shrink-0" style={{ color: accent }} />
            {/* Ticker viewport (fixed height, clips the sliding offer) */}
            <span className="relative block h-5 min-w-0 flex-1 overflow-hidden">
              <span
                key={offerIndex}
                className="absolute inset-0 flex items-center gap-2"
                style={{ animation: "offerTickerIn 450ms ease-out" }}
              >
                <span className="truncate text-[14px] font-bold text-gray-900">{activeSentence}</span>
                {activeTag && (
                  <span
                    className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: `${accent}1a`, color: accent }}
                  >
                    {activeTag}
                  </span>
                )}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-gray-400">
            <span className="whitespace-nowrap text-[13px] font-medium">
              {offerCount} offer{offerCount > 1 ? "s" : ""}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </span>
        </button>

        {sheetOpen && typeof window !== "undefined" && (
          <OffersBottomSheet
            title={`Offers for you (${offerCount})`}
            onClose={() => setSheetOpen(false)}
          >
            {discounts.map((disc) => {
              const daysLeft = getDaysLeft(disc.expires_at);
              return (
                <div
                  key={disc.id}
                  className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${accent}14`, color: accent }}
                    >
                      <BadgePercent size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-bold text-gray-900">{offerSentence(disc)}</p>
                        {daysLeft && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                            style={{ backgroundColor: accent }}
                          >
                            {daysLeft}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-400">
                        {!disc.has_coupon && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            style={{ backgroundColor: `${accent}1a`, color: accent }}
                          >
                            Auto Apply
                          </span>
                        )}
                        {disc.min_order_value && (
                          <span>Min order {currency}{disc.min_order_value}</span>
                        )}
                        {disc.max_discount_amount && disc.discount_type === "percentage" && (
                          <span>· Max {currency}{disc.max_discount_amount}</span>
                        )}
                        {disc.per_user_usage_limit != null && (user as any)?.id && (
                          <span>· Used {userUsageMap[disc.id] ?? 0}/{disc.per_user_usage_limit}</span>
                        )}
                      </div>
                      {disc.has_coupon && (
                        <button
                          onClick={() => handleCopy(disc.code)}
                          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-dashed bg-white px-2.5 py-1.5 transition active:scale-95"
                          style={{ borderColor: `${accent}55` }}
                        >
                          <span className="font-mono text-xs font-bold tracking-wider" style={{ color: accent }}>
                            {disc.code}
                          </span>
                          {copiedCode === disc.code ? (
                            <Check size={12} className="text-green-500" />
                          ) : (
                            <Copy size={12} style={{ color: accent }} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </OffersBottomSheet>
        )}
      </>
    );
  }

  return <div className="relative py-2">{cardsList}</div>;
};

export default DiscountBanner;

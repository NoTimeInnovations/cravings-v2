"use client";

import { useState, useEffect, useRef } from "react";
import { Tag, Clock, Copy, Check } from "lucide-react";
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
};

const DiscountBanner = ({
  partnerId,
  currency,
  accent,
}: {
  partnerId: string;
  currency: string;
  accent: string;
}) => {
  const [discounts, setDiscounts] = useState<DiscountData[]>([]);
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
          usage_limit used_count per_user_usage_limit
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

  return (
    <div className="relative py-2">
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
              className="snap-start shrink-0 w-full rounded-xl overflow-hidden border relative"
              style={{
                borderColor: accent + "25",
                background: `linear-gradient(135deg, ${accent}06 0%, ${accent}12 100%)`,
              }}
            >
              <div className="px-3 py-2.5 flex items-center gap-3">
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: accent + "18" }}
                >
                  <Tag size={15} style={{ color: accent }} />
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
    </div>
  );
};

export default DiscountBanner;

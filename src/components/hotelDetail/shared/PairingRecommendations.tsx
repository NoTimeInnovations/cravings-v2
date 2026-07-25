"use client";
import React, { useMemo } from "react";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import useOrderStore from "@/store/orderStore";
import { usePairingRecommendations } from "@/lib/recommendations";
import RecommendationCard from "./RecommendationCard";

// Inline "You will love pairing it with" strip, shown directly beneath a menu
// row/card once the dish is in the cart. Used by the roomy layouts
// (Default/Compact/V3/V4/V5) where recommendations fit inline. Self-contained:
// it resolves the item's curated recommendations and reads the item's cart
// quantity itself, so a layout only needs to drop it in — it renders nothing
// until the item is added and has resolvable recommendations.
export default function PairingRecommendations({
  item,
  hoteldata,
  accent,
  canOrder,
  isPartnersRole = false,
  hasStockFeature = false,
  className,
}: {
  item: HotelDataMenus;
  hoteldata: HotelData;
  accent: string;
  canOrder: boolean;
  isPartnersRole?: boolean;
  hasStockFeature?: boolean;
  className?: string;
}) {
  const items = useOrderStore((s) => s.items);
  const recItems = usePairingRecommendations(item, hoteldata);

  const itemQuantity = useMemo(() => {
    const base = items?.find((i) => i.id === item.id)?.quantity || 0;
    const variantQty = (items?.filter((i) => i.id.startsWith(`${item.id}|`)) || []).reduce(
      (s, i) => s + i.quantity,
      0,
    );
    return base + variantQty;
  }, [items, item.id]);

  if (itemQuantity <= 0 || recItems.length === 0) return null;

  return (
    <div className={`pb-4 animate-in fade-in slide-in-from-top-1 duration-300 ${className || ""}`}>
      <div className="rounded-2xl bg-gray-50 p-4">
        <h3 className="mb-3 text-[16px] font-bold tracking-[-0.01em] text-gray-900">
          You will love pairing it with
        </h3>
        <div className="-mx-1 flex gap-3 overflow-x-auto scrollbar-hide px-1 pb-1">
          {recItems.map((r) => (
            <RecommendationCard
              key={r.id}
              recItem={r}
              hoteldata={hoteldata}
              accent={accent}
              canOrder={canOrder}
              isPartnersRole={isPartnersRole}
              hasStockFeature={hasStockFeature}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useEffect, useRef, useState } from "react";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import useOrderStore from "@/store/orderStore";
import { getFeatures } from "@/lib/getFeatures";
import { isWithinTimeWindow } from "@/lib/isWithinTimeWindow";
import { baseItemId } from "@/lib/partnerDataLayer";
import { resolveRecommendations } from "@/lib/recommendations";
import RecommendationCard from "./RecommendationCard";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

// Global "you will love pairing it with" bottom sheet for the DENSE layouts
// (Sidebar, V6) where an inline recommendation strip doesn't fit gracefully.
//
// It listens to the cart's add signal (`lastItemAddedAt` / `lastAddedItem`,
// set once inside orderStore.addItem — the single choke point every layout's
// add path funnels through) and, when an item that has curated recommendations
// is added, slides up a sheet of those pairings. Mounted ONCE at the storefront
// root, so every add path (tile detail sheet, inline "+", stepper) triggers it
// with zero per-layout wiring.
export default function AddedRecommendationsSheet({
  hoteldata,
  accent,
  feature_flags,
  tableNumber,
  auth,
}: {
  hoteldata: HotelData;
  accent: string;
  feature_flags?: string;
  tableNumber: number;
  auth?: { role?: string } | null;
}) {
  const lastItemAddedAt = useOrderStore((s) => s.lastItemAddedAt);
  const lastAddedItem = useOrderStore((s) => s.lastAddedItem);

  const [open, setOpen] = useState(false);
  const [baseItem, setBaseItem] = useState<HotelDataMenus | null>(null);
  const [recItems, setRecItems] = useState<HotelDataMenus[]>([]);

  // Skip whatever add-signal value was already present when this mounted (e.g.
  // a persisted / earlier-session add), so the sheet only reacts to genuinely
  // new adds that happen while it is on screen.
  const seenRef = useRef<number>(lastItemAddedAt);
  // While the sheet is open, consume further add signals WITHOUT re-triggering,
  // so tapping "+" on a recommendation card doesn't swap the sheet's contents.
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!lastItemAddedAt || lastItemAddedAt === seenRef.current) return;
    seenRef.current = lastItemAddedAt;
    if (openRef.current) return;
    if (!lastAddedItem) return;

    // Resolve against the BASE menu item (strip any "|variant" suffix) so the
    // curated recommendations + display name come from the canonical item.
    const baseId = baseItemId(lastAddedItem.id);
    const menus = (hoteldata?.menus || []) as HotelDataMenus[];
    const base = menus.find((m) => m.id === baseId) || (lastAddedItem as HotelDataMenus);
    const resolved = resolveRecommendations(base, hoteldata);
    if (resolved.length === 0) return; // nothing to cross-sell → stay closed

    setBaseItem(base);
    setRecItems(resolved);
    setOpen(true);
  }, [lastItemAddedAt, lastAddedItem, hoteldata]);

  // Feature-derived flags for the recommendation cards (mirrors the item-card
  // computation so add buttons / greying behave identically).
  const features = getFeatures(feature_flags || "");
  const dr = hoteldata?.delivery_rules;
  const tz = (hoteldata as { timezone?: string } | null)?.timezone || "Asia/Kolkata";
  const isDeliveryTimeOpen =
    dr?.isDeliveryActive !== false && isWithinTimeWindow(dr?.delivery_time_allowed, tz);
  const isTakeawayTimeOpen = isWithinTimeWindow(dr?.takeaway_time_allowed, tz);
  const hasDeliveryFeature = features?.delivery.enabled && tableNumber === 0 && isDeliveryTimeOpen;
  const hasOrderingFeature =
    features?.ordering.enabled && (tableNumber !== 0 || isTakeawayTimeOpen);
  const canOrder = !!(hasOrderingFeature || hasDeliveryFeature);
  const isPartnersRole = auth?.role === "partner";
  const hasStockFeature = !!features?.stockmanagement?.enabled;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="max-h-[80vh]">
        <div className="mx-auto w-full max-w-2xl px-4 pb-6 pt-2">
          {baseItem && (
            <p className="mb-0.5 text-[13px] font-medium text-gray-500">
              Added <span className="font-bold text-gray-900">{baseItem.name}</span> to your order
            </p>
          )}
          <DrawerTitle className="mb-3 text-[18px] font-bold tracking-[-0.01em] text-gray-900">
            You will love pairing it with
          </DrawerTitle>
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
      </DrawerContent>
    </Drawer>
  );
}

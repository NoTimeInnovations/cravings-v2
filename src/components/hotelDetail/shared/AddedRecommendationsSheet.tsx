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
import { useItemSheetStore } from "@/store/itemSheetStore";
import { useCustomizerStore } from "@/store/customizerStore";

// After an item sheet closes: long enough to clear its close animation (280ms)
// plus the fly-to-cart hop that follows (~80ms delay + 380ms flight), so the
// pairings don't slide up over the animation or hide the pill it flies into.
const FLUSH_AFTER_SHEET_MS = 520;
// For an add with nothing open: a single beat so a sheet opened by the SAME tap
// (V6's grid "+" on a variant item adds the first variant and then opens the
// variant sheet in one batch) has mounted and registered before we decide.
const SETTLE_MS = 90;
// Don't resurrect a very old parked add (e.g. parked, then the customer browsed
// other sheets for a while) — the "Added X" line would read as stale.
const PENDING_STALE_MS = 20_000;

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

  // Anything of the customer's own that is already covering the screen: an item
  // detail / variant sheet, the search overlay, the customizer, or checkout.
  // Adds made while one of these is up — including plain quantity bumps on a "+"
  // stepper — must NOT pop the pairings over it; they're held until it closes.
  const itemSheetCount = useItemSheetStore((s) => s.openCount);
  const customizerOpen = useCustomizerStore((s) => s.isOpen);
  const checkoutOpen = useOrderStore((s) => s.open_place_order_modal);
  const anySheetOpen = itemSheetCount > 0 || customizerOpen || checkoutOpen;
  const [pending, setPending] = useState<{
    base: HotelDataMenus;
    recs: HotelDataMenus[];
    at: number;
  } | null>(null);
  // True once a parked add has actually waited behind something, so the flush
  // uses the longer post-close beat instead of the short settle.
  const waitedRef = useRef(false);

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
    // Nothing to cross-sell. Still drop any parked add so the sheet can never
    // announce an older item than the one just added.
    if (resolved.length === 0) {
      setPending(null);
      waitedRef.current = false;
      return;
    }

    // ALWAYS park — never open straight from here. A sheet opened by the same tap
    // (V6's grid "+" adds the first variant and then opens the variant sheet in
    // one batch) has not mounted yet at this point, so deciding now would pop the
    // pairings over it. The effect below decides a beat later against live state.
    waitedRef.current = false;
    setPending({ base, recs: resolved, at: lastItemAddedAt });
  }, [lastItemAddedAt, lastAddedItem, hoteldata]);

  // Remember that this parked add had to wait, so it gets the longer beat.
  useEffect(() => {
    if (anySheetOpen && pending) waitedRef.current = true;
  }, [anySheetOpen, pending]);

  // Decide when (and whether) a parked add's pairings surface.
  useEffect(() => {
    const parked = pending;
    if (!parked) return;
    if (anySheetOpen) return; // wait — re-runs when it closes
    const t = window.setTimeout(() => {
      // Re-read live: something may have opened during the beat.
      const busy =
        useItemSheetStore.getState().openCount > 0 ||
        useCustomizerStore.getState().isOpen ||
        !!useOrderStore.getState().open_place_order_modal;
      if (busy) {
        waitedRef.current = true;
        return; // keep it parked; this effect re-runs once things close
      }
      // Keep it parked while our own sheet is up — it retries when that closes,
      // rather than being dropped on the floor.
      if (openRef.current) return;
      // Don't cross-sell for something that is no longer in the cart — the
      // customer may have added it and then removed it again before closing.
      // Strip both sides: `base` falls back to the added line, whose id can
      // still carry a "|variant" suffix.
      const pendingBaseId = baseItemId(parked.base.id);
      const cart = useOrderStore.getState().items || [];
      const stillInCart = cart.some(
        (i) => baseItemId(i.id) === pendingBaseId && i.quantity > 0,
      );
      const fresh = Date.now() - parked.at < PENDING_STALE_MS;
      setPending(null);
      waitedRef.current = false;
      if (!stillInCart || !fresh) return;
      setBaseItem(parked.base);
      setRecItems(parked.recs);
      setOpen(true);
    }, waitedRef.current ? FLUSH_AFTER_SHEET_MS : SETTLE_MS);
    return () => window.clearTimeout(t);
    // `open` is a dep so a parked add left waiting behind OUR sheet retries the
    // moment that sheet is dismissed.
  }, [anySheetOpen, pending, open]);

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
  const hasStockFeature = !!features?.stockmanagement?.enabled;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* Default z-50 on purpose. This sheet never has to out-stack an item sheet
          (it waits for them to close — see the flush effect above), and it MUST
          stay below the customizer at z-[9998]/[9999], which opens FROM here when
          a recommended item has add-ons. */}
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
                hasStockFeature={hasStockFeature}
              />
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

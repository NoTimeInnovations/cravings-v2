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

// One beat before the pairings slide up, used by every path. Sized to clear the
// fly-to-cart hop (80ms delay + a 720ms flight — see v6FlyToCart) so the sheet
// never lands on top of the animation or hides the cart pill the item flies into.
// It also gives a sheet opened by the SAME tap (V6's grid "+" on a variant item
// adds the first variant and then opens the variant sheet in one batch) time to
// mount and register — though the same-tick protection does NOT rely on this
// length: that comes from always parking and re-reading live state on fire.
const FLUSH_DELAY_MS = 820;

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
  } | null>(null);

  // Items we've already pitched pairings for. Every "+" tap — on the grid card
  // or in a sheet — is a full addItem (increaseQuantity deliberately doesn't
  // signal), so without this a customer taking an item to qty 5 gets the sheet
  // five times. Pairings are a one-time cross-sell per item, not per unit.
  const shownRef = useRef<Set<string>>(new Set());
  // Reset once the cart is empty again (order placed / everything removed), so a
  // fresh basket can be cross-sold from scratch.
  const cartLines = useOrderStore((s) => s.items?.length ?? 0);
  useEffect(() => {
    if (cartLines === 0) shownRef.current.clear();
  }, [cartLines]);

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
      return;
    }

    // ALWAYS park — never open straight from here. A sheet opened by the same tap
    // (V6's grid "+" adds the first variant and then opens the variant sheet in
    // one batch) has not mounted yet at this point, so deciding now would pop the
    // pairings over it. The effect below decides a beat later against live state.
    setPending({ base, recs: resolved });
  }, [lastItemAddedAt, lastAddedItem, hoteldata]);

  // The customizer is a plain in-tree overlay, but this sheet is a MODAL drawer —
  // while it's open Radix sets body pointer-events:none, which would leave a
  // customizer opened from a recommendation card visible but dead. So step aside
  // when it opens, exactly as the item cards do before calling openCustomizer.
  useEffect(() => {
    if (customizerOpen) setOpen(false);
  }, [customizerOpen]);

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
      if (busy) return; // keep it parked; this effect re-runs once things close
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
      const alreadyPitched = shownRef.current.has(pendingBaseId);
      setPending(null);
      if (!stillInCart || alreadyPitched) return;
      shownRef.current.add(pendingBaseId);
      setBaseItem(parked.base);
      setRecItems(parked.recs);
      setOpen(true);
    }, FLUSH_DELAY_MS);
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
      {/* Threaded between the cart chrome and the customizer: above the sticky
          cart bar (z-[200]) and Sidebar's bottom nav (z-[999]) — at the default
          z-50 those covered the pairings' own Add buttons — but BELOW the
          customizer (z-[9998]/[9999]) that opens FROM here for an add-on item.
          It never has to out-stack an item sheet, because it waits for those to
          close (see the flush effect above). */}
      <DrawerContent className="max-h-[80vh] z-[1000]" overlayClassName="z-[1000]">
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

import { useMemo } from "react";
import { HotelData, HotelDataMenus } from "@/app/hotels/[...id]/page";
import { getItemDisplayState } from "@/lib/visibility";

// A menu item's manually-curated cross-sell list ("you will love pairing it
// with"). `item.recommendations` is an array of OTHER menu-item ids the partner
// curates in the dashboard; this resolves those ids into concrete, renderable
// menu-item objects against the order-type-filtered `hoteldata.menus` pool.
//
// This is the single shared implementation used by every storefront layout —
// the inline strip (Default/Compact/V3/V4/V5) and the on-add bottom sheet
// (Sidebar/V6). Rules (identical to the original V5 behaviour):
//   • self-references and dead / missing ids are dropped
//   • items hidden by visibility schedules / order-type rules are dropped
//   • unavailable items are kept but marked is_available:false (rendered greyed,
//     never orderable)
// Saved array order is preserved as the display order.
export function resolveRecommendations(
  item: Pick<HotelDataMenus, "id" | "recommendations"> | null | undefined,
  hoteldata: HotelData | null | undefined,
): HotelDataMenus[] {
  const ids = (item?.recommendations as string[] | undefined) || [];
  if (!ids.length) return [];
  const menus = (hoteldata?.menus || []) as HotelDataMenus[];
  if (!menus.length) return [];
  const byId = new Map(menus.map((m) => [m.id, m]));
  const tz = (hoteldata as { timezone?: string } | null)?.timezone || "Asia/Kolkata";
  const out: HotelDataMenus[] = [];
  for (const id of ids) {
    if (id === item?.id) continue;
    const m = byId.get(id);
    if (!m) continue;
    const state = getItemDisplayState(
      m as Parameters<typeof getItemDisplayState>[0],
      tz,
      undefined,
      hoteldata?.hide_unavailable,
    );
    if (state === "hidden") continue;
    out.push(state === "unavailable" ? { ...m, is_available: false } : m);
  }
  return out;
}

// Memoised hook wrapper for use inside components.
export function usePairingRecommendations(
  item: Pick<HotelDataMenus, "id" | "recommendations"> | null | undefined,
  hoteldata: HotelData | null | undefined,
): HotelDataMenus[] {
  return useMemo(
    () => resolveRecommendations(item, hoteldata),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.recommendations, item?.id, hoteldata],
  );
}

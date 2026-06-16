"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import useOrderStore from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { userPartnerLastOrderQuery } from "@/api/orders";
import type { HotelData } from "@/app/hotels/[...id]/page";

/**
 * Consumes the WhatsApp "Reorder" deep link (`?reorder=1`). When a customer who
 * arrived via their welcome-flow Reorder button is logged in (the `?olt=` token
 * has auto-logged them in) and the menu is loaded, this:
 *   1. fetches their most recent order at this partner,
 *   2. rebuilds the cart against the CURRENT menu (skipping removed/unavailable
 *      items and variants that no longer exist — using current prices),
 *   3. restores the order type + delivery address,
 *   4. opens the checkout modal so they can just tap "Place order".
 * Renders nothing. Runs once per mount.
 */
export default function ReorderHandler({ hotelData }: { hotelData: HotelData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userData } = useAuthStore();
  const ranRef = useRef(false);

  const partnerId = hotelData?.id;
  const userId = (userData as any)?.id as string | undefined;
  const isCustomer = (userData as any)?.role === "user";

  useEffect(() => {
    if (ranRef.current) return;
    if (!partnerId || !userId || !isCustomer) return; // wait for auto-login to settle
    if (!hotelData?.menus?.length) return;
    ranRef.current = true;

    const {
      setHotelId,
      clearOrder,
      addItem,
      setOrderType,
      setUserAddress,
      setUserCoordinates,
      setOpenPlaceOrderModal,
    } = useOrderStore.getState();

    const stripReorderParam = () => {
      const sp = new URLSearchParams(Array.from(searchParams?.entries() || []));
      sp.delete("reorder");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname || "/");
    };

    (async () => {
      try {
        const res = await fetchFromHasura(userPartnerLastOrderQuery, {
          user_id: userId,
          partner_id: partnerId,
        });
        const order = res?.orders?.[0];
        if (!order) {
          stripReorderParam();
          return;
        }

        const menus = hotelData.menus || [];
        const byId = new Map<string, any>(menus.map((m: any) => [m.id, m]));

        setHotelId(partnerId);
        clearOrder(); // start clean so reorder reflects exactly the last order

        let added = 0;
        let skipped = 0;
        for (const line of order.order_items || []) {
          const menuId =
            line.menu_id || String(line?.item?.id || "").split("|")[0];
          const menu = menuId ? byId.get(menuId) : null;
          // Removed item, or hidden/disabled — skip.
          if (!menu || menu.is_active === false) {
            skipped++;
            continue;
          }
          const qty = Math.max(1, Number(line.quantity) || 1);
          const variant = line.variant as { id?: string; name?: string } | null;

          if (variant?.name) {
            const cur = (menu.variants || []).find(
              (v: any) => v.name === variant.name || v.id === variant.id,
            );
            if (!cur) {
              skipped++; // variant no longer offered
              continue;
            }
            const cartItem = {
              ...menu,
              id: `${menuId}|${cur.name}`,
              name: `${menu.name} (${cur.name})`,
              price: cur.price,
              variantSelections: [
                { id: cur.id, name: cur.name, price: cur.price, quantity: 1 },
              ],
            };
            for (let k = 0; k < qty; k++) addItem(cartItem as any);
          } else {
            const cartItem = { ...menu, variantSelections: [] };
            for (let k = 0; k < qty; k++) addItem(cartItem as any);
          }
          added++;
        }

        if (added === 0) {
          toast.error(
            "Couldn't reorder — those items aren't available anymore. Please pick from the menu.",
          );
          stripReorderParam();
          return;
        }

        // Restore order type + delivery address.
        const type = order.type as string | null;
        if (type === "takeaway" || type === "delivery" || type === "dine_in") {
          setOrderType(type);
        }
        if (type === "delivery" && order.delivery_address) {
          setUserAddress(order.delivery_address);
          const coords = order.delivery_location?.coordinates;
          if (Array.isArray(coords) && coords.length === 2) {
            setUserCoordinates({ lat: Number(coords[1]), lng: Number(coords[0]) });
          }
        }

        if (skipped > 0) {
          toast.info(
            `${skipped} item${skipped === 1 ? "" : "s"} from your last order ${
              skipped === 1 ? "is" : "are"
            } no longer available and ${skipped === 1 ? "was" : "were"} skipped.`,
          );
        }

        setOpenPlaceOrderModal(true);
        stripReorderParam();
      } catch (e) {
        console.error("Reorder failed:", e);
        ranRef.current = false; // allow a retry if userData/menu update re-triggers
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, userId, isCustomer, hotelData?.menus?.length]);

  return null;
}

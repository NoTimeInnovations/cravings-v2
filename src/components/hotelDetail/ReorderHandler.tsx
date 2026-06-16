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
 * Consumes the WhatsApp "Reorder" deep link. The link carries the customer's
 * last order encoded in `?ro=` (base64url JSON), so we can rebuild the cart +
 * address synchronously against the CURRENT menu — no query, no auth-timing
 * race. (`?reorder=1` without `ro` is the legacy path: we query the last order.)
 *
 * Onboarding is skipped because the link also sets `?back=true`. Once we've
 * applied the order we open the checkout modal and strip the params.
 * Renders nothing; runs once per mount.
 */

interface ReorderLine {
  menuId: string;
  qty: number;
  variantName: string | null;
}

function decodeRo(s: string): {
  items: ReorderLine[];
  type: string | null;
  addr: string | null;
  coords: number[] | null;
} | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    const items: ReorderLine[] = (payload.i || []).map((x: any[]) => ({
      menuId: x[0],
      qty: Number(x[1]) || 1,
      variantName: x[2] || null,
    }));
    return { items, type: payload.t || null, addr: payload.a || null, coords: payload.c || null };
  } catch {
    return null;
  }
}

export default function ReorderHandler({ hotelData }: { hotelData: HotelData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userData } = useAuthStore();
  const ranRef = useRef(false);

  const partnerId = hotelData?.id;
  const userId = (userData as any)?.id as string | undefined;
  const ro = searchParams?.get("ro") || null;

  useEffect(() => {
    if (ranRef.current) return;
    if (!partnerId || !hotelData?.menus?.length) return;
    // The encoded path runs immediately; the legacy query path waits for the
    // olt auto-login to populate the customer before it can look up their order.
    if (!ro && !userId) return;
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

    const stripParams = () => {
      const sp = new URLSearchParams(Array.from(searchParams?.entries() || []));
      ["ro", "reorder", "back"].forEach((k) => sp.delete(k));
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname || "/");
    };

    // Rebuild the cart from the resolved order lines against the current menu.
    const apply = (
      lines: ReorderLine[],
      type: string | null,
      addr: string | null,
      coords: number[] | null,
    ): boolean => {
      const byId = new Map<string, any>((hotelData.menus || []).map((m: any) => [m.id, m]));
      setHotelId(partnerId);
      clearOrder();
      let added = 0;
      let skipped = 0;
      for (const line of lines) {
        const menu = line.menuId ? byId.get(line.menuId) : null;
        if (!menu || menu.is_active === false) {
          skipped++;
          continue;
        }
        const qty = Math.max(1, line.qty);
        if (line.variantName) {
          const cur = (menu.variants || []).find((v: any) => v.name === line.variantName);
          if (!cur) {
            skipped++;
            continue;
          }
          const cartItem = {
            ...menu,
            id: `${line.menuId}|${cur.name}`,
            name: `${menu.name} (${cur.name})`,
            price: cur.price,
            variantSelections: [{ id: cur.id, name: cur.name, price: cur.price, quantity: 1 }],
          };
          for (let k = 0; k < qty; k++) addItem(cartItem as any);
        } else {
          const cartItem = { ...menu, variantSelections: [] };
          for (let k = 0; k < qty; k++) addItem(cartItem as any);
        }
        added++;
      }

      if (added === 0) return false;

      if (type === "takeaway" || type === "delivery" || type === "dine_in") {
        setOrderType(type);
      }
      if (type === "delivery" && addr) {
        setUserAddress(addr);
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
      return true;
    };

    (async () => {
      try {
        // Primary path: order encoded in the URL — synchronous, no query.
        if (ro) {
          const decoded = decodeRo(ro);
          if (decoded && decoded.items.length) {
            const ok = apply(decoded.items, decoded.type, decoded.addr, decoded.coords);
            if (!ok)
              toast.error("Couldn't reorder — those items aren't available anymore.");
            stripParams();
            return;
          }
        }

        // Legacy / fallback path: query the last order (links minted before the
        // encoded payload existed). Needs the olt auto-login to have signed the
        // customer in so we have their user id.
        if (!userId) {
          stripParams();
          return;
        }
        const res = await fetchFromHasura(userPartnerLastOrderQuery, {
          user_id: userId,
          partner_id: partnerId,
        }).catch(() => null);
        const order = res?.orders?.[0];
        if (!order) {
          stripParams();
          return;
        }
        const lines: ReorderLine[] = (order.order_items || []).map((l: any) => {
          const composite = String(l?.item?.id || "");
          const pipe = composite.indexOf("|");
          return {
            menuId: l.menu_id || composite.split("|")[0],
            qty: Number(l.quantity) || 1,
            variantName: pipe >= 0 ? composite.slice(pipe + 1) || null : null,
          };
        });
        const ok = apply(
          lines,
          order.type || null,
          order.delivery_address || null,
          order.delivery_location?.coordinates || null,
        );
        if (!ok) toast.error("Couldn't reorder — those items aren't available anymore.");
        stripParams();
      } catch (e) {
        console.error("Reorder failed:", e);
        ranRef.current = false; // allow a retry if inputs change
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, hotelData?.menus?.length, ro, userId]);

  return null;
}

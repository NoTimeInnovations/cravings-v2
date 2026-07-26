"use client";
import React, { useMemo } from "react";
import { HotelData } from "@/app/hotels/[...id]/page";
import useOrderStore from "@/store/orderStore";
import { formatPrice } from "@/lib/constants";
import { computeOutOfStock } from "@/lib/stockStatus";
import { useLiveStock } from "@/store/liveStockStore";
import { Plus, Minus } from "lucide-react";
import { MenuPrice } from "@/components/hotelDetail/MenuPrice";
import { readableTextColor } from "@/lib/brandColor";

// Zomato-style veg / non-veg mark: a bordered square holding a filled dot for
// veg and a filled triangle for non-veg. (Kept local so the recommendation card
// looks identical in every layout that shows it.)
function VegMark({ isVeg }: { isVeg: boolean }) {
  const color = isVeg ? "#16a34a" : "#dc2626";
  return (
    <div
      className="flex h-[15px] w-[15px] items-center justify-center rounded-[3px] border-[1.5px]"
      style={{ borderColor: color }}
    >
      {isVeg ? (
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        <span
          style={{
            width: 0,
            height: 0,
            borderLeft: "3.5px solid transparent",
            borderRight: "3.5px solid transparent",
            borderBottom: `6px solid ${color}`,
          }}
        />
      )}
    </div>
  );
}

// Compact card used inside the "You will love pairing it with" recommendation
// strip / sheet — a square food image with the veg mark over its bottom-left
// corner and a floating ADD / stepper over its bottom-right, with name + price
// below. It writes to the same cart store, so quantities stay in sync with the
// full list rows / grid cards of the same dish. Shared across every storefront
// layout (originally V5RecCard).
export default function RecommendationCard({
  recItem,
  hoteldata,
  accent,
  canOrder,
  isPartnersRole,
  hasStockFeature,
}: {
  recItem: any;
  hoteldata: HotelData;
  accent: string;
  canOrder: boolean;
  isPartnersRole: boolean;
  hasStockFeature: boolean;
}) {
  const { addItem, items, decreaseQuantity, removeItem } = useOrderStore();
  const liveStockQty = useLiveStock((s) => s.qty);

  const hasVariants = (recItem.variants?.length ?? 0) > 0;
  const cheapestVariant = useMemo(
    () =>
      hasVariants
        ? [...recItem.variants].sort((a: any, b: any) => (a?.price ?? 0) - (b?.price ?? 0))[0]
        : null,
    [hasVariants, recItem.variants],
  );

  const qty = useMemo(() => {
    const base = items?.find((i) => i.id === recItem.id)?.quantity || 0;
    const variantQty = (items?.filter((i) => i.id.startsWith(`${recItem.id}|`)) || []).reduce(
      (s, i) => s + i.quantity,
      0,
    );
    return base + variantQty;
  }, [items, recItem.id]);

  const isOutOfStock = computeOutOfStock(recItem, hasStockFeature, liveStockQty);
  const isOrderable = recItem.is_available !== false && !isOutOfStock;
  const shouldShowPrice = hoteldata?.currency !== "🚫";
  const priceToShow = hasVariants ? cheapestVariant?.price ?? 0 : recItem.price;
  const hasPrice = typeof priceToShow === "number";
  // Show the Add whenever the item is orderable and has a resolvable price. We do
  // NOT exclude `is_price_as_per_size` items here: the item still has a base /
  // cheapest-variant price to add against, and excluding it left "price as per
  // size" recommendations with NO add control at all (the reported bug — a
  // recommended item rendered with a price but no Add button, while regular menu
  // rows for the same kind of item stayed addable). add() already resolves the
  // cheapest variant (or the base price) for these.
  const showAdd = canOrder && isOrderable && hasPrice && !isPartnersRole;

  // The Add pill / stepper sit on a WHITE surface, so a light brand accent (a
  // pale/near-white brand color) would render the "Add" label + stepper controls
  // near-invisible. Fall back to a dark ink when the accent is too light to read
  // on white; keep the accent itself when it has enough contrast (unchanged for
  // the common dark-accent case). readableTextColor returns "#ffffff" only for
  // dark backgrounds, so that result means the accent is dark enough to use as-is.
  const addFg = readableTextColor(accent) === "#ffffff" ? accent : "#111827";

  const add = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVariants && cheapestVariant) {
      addItem({
        ...recItem,
        id: `${recItem.id}|${cheapestVariant.name}`,
        name: `${recItem.name} (${cheapestVariant.name})`,
        price: cheapestVariant.price,
        variantSelections: [
          { id: (cheapestVariant as any).id, name: cheapestVariant.name, price: cheapestVariant.price ?? 0, quantity: 1 },
        ],
      });
    } else {
      addItem({ ...recItem, variantSelections: [], price: recItem.price });
    }
  };

  const dec = (e: React.MouseEvent) => {
    e.stopPropagation();
    const lines = hasVariants
      ? items?.filter((i) => i.id.startsWith(`${recItem.id}|`)) || []
      : items?.filter((i) => i.id === recItem.id) || [];
    const last = lines[lines.length - 1];
    if (last) {
      last.quantity > 1 ? decreaseQuantity(last.id) : removeItem(last.id);
    }
  };

  return (
    <div className="w-[128px] shrink-0">
      <div className="relative h-[128px] w-[128px] overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5">
        <img
          src={recItem.image_url || "/image_placeholder.png"}
          alt={recItem.name}
          className={`${!recItem.image_url ? "invert opacity-50" : ""} ${!isOrderable ? "grayscale" : ""}`}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />

        {recItem.is_veg !== null && recItem.is_veg !== undefined && (
          <div className="absolute bottom-1.5 left-1.5 rounded-[4px] bg-white/90 p-[2px] shadow-sm">
            <VegMark isVeg={recItem.is_veg} />
          </div>
        )}

        {!isOrderable && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600 py-0.5 text-center text-[9px] font-extrabold uppercase tracking-wider text-white">
            {recItem.is_available === false ? "Unavailable" : "Out of Stock"}
          </div>
        )}

        {showAdd && (
          <div className="absolute bottom-1.5 right-1.5" style={{ height: 30, width: 72 }}>
            {qty > 0 ? (
              <div className="flex h-full w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-1 shadow-[0_3px_10px_rgba(0,0,0,0.15)]">
                <button onClick={dec} className="flex h-6 w-6 items-center justify-center" style={{ color: addFg }}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-[12px] font-extrabold" style={{ color: addFg }}>{qty}</span>
                <button onClick={add} className="flex h-6 w-6 items-center justify-center" style={{ color: addFg }}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={add}
                className="flex h-full w-full items-center justify-center gap-0.5 rounded-lg border border-gray-200 bg-white shadow-[0_3px_10px_rgba(0,0,0,0.15)] transition active:scale-95"
                style={{ color: addFg }}
              >
                <span className="text-[12px] font-extrabold uppercase tracking-wide leading-none">Add</span>
                <Plus className="h-3 w-3" strokeWidth={3} />
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-[13.5px] font-bold leading-tight tracking-[-0.01em] text-gray-900">
        {recItem.name}
      </p>
      {shouldShowPrice && hasPrice && priceToShow > 0 && (
        <p className="mt-0.5 text-[13px] font-bold text-gray-900">
          {hasVariants && <span className="text-[11px] font-normal text-gray-500">From </span>}
          <MenuPrice currency={hoteldata?.currency || "₹"} amount={formatPrice(priceToShow, hoteldata?.id)} />
        </p>
      )}
    </div>
  );
}

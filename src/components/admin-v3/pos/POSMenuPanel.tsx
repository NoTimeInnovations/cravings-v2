"use client";

import * as React from "react";
import { ChevronDown, Minus, Plus, Search, UtensilsCrossed, X } from "lucide-react";

import ShopClosedModalWarning from "@/components/admin/ShopClosedModalWarning";
import Img from "@/components/Img";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatPrice } from "@/lib/constants";
import { isCompletedOrderLockEnabled } from "@/lib/orderStatus";
import { cn } from "@/lib/utils";
import { Partner, useAuthStore } from "@/store/authStore";
import { GroupedItems, MenuItem, useMenuStore } from "@/store/menuStore_hasura";
import { useCustomizerStore } from "@/store/customizerStore";
import { usePOSStore } from "@/store/posStore";

import { V3Card } from "../ui/primitives";

/**
 * /admin-v3 → POS, left pane.
 *
 * Behaviour is admin-v2's `admin-v2/pos/POSMenu.tsx` + `pos/PosItemCard.tsx`
 * (which v2's POSMenu delegates every item interaction to), rebuilt in the v3
 * design system. It reads and writes ONLY `usePOSStore` — the cart pane is a
 * sibling that reads the same store, so the two panes never need to agree props.
 *
 * Carried over verbatim from v2:
 *  - unavailable items (`is_available === false`) are removed from the POS
 *    entirely, and a category left with none drops out of the rail;
 *  - search matches the item NAME only, case-insensitively, across every
 *    category, and its results stay grouped by category;
 *  - three mutually exclusive card shapes — addon groups open the shared
 *    ItemCustomizationSheet, variants open a picker, everything else adds on
 *    click — plus the "price as per size" prompt whose answer is memoised in
 *    `posStore.savedPrices` for the rest of the bill;
 *  - the shop-closed sign, mounted the same way (manual switch only: no
 *    storefront_settings, so the working-hours schedule never fires in the POS).
 *
 * Two things v2 leaves implicit are made visible here rather than added to:
 *  - the store silently no-ops every cart mutation while an EDIT of a completed,
 *    locked order is loaded (posStore's isEditingLockedOrder). v2 renders live
 *    buttons that quietly do nothing; here the same condition is read back and
 *    the grid is disabled with a one-line reason.
 *  - a line already in the cart gets a count badge on its tile, so a busy
 *    counter can see what's been rung up without crossing to the cart pane.
 *
 * Deliberately NOT here (they are the cart pane's, exactly as in v2): custom
 * ad-hoc items, discounts, extra charges, order type, table and checkout.
 */

/* ------------------------------------------------------------------ tokens */

/** Every interactive target on this screen is >= 36px — it is used at a counter,
 *  often on a tablet, frequently with a thumb. */
const STEP_BTN =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

/** Filled action, inverted in dark mode like every near-black v3 button. */
const ADD_BTN =
  "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-zinc-900 bg-zinc-900 px-3 text-[12.5px] font-bold leading-none text-white transition-colors hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

const CARD_SHELL =
  "flex flex-col overflow-hidden rounded-[10px] border border-zinc-200 bg-white shadow-[0_1px_2px_0_rgba(9,9,11,.05)] transition-colors dark:border-zinc-800 dark:bg-zinc-900";

/* --------------------------------------------------------------- the panel */

export function POSMenuPanel() {
  const { groupedItems, fetchMenu } = useMenuStore();
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const partnerId = partner?.id;
  const currency = partner?.currency || "₹";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  /* ---------------------------------------------------------- locked edit */

  // posStore refuses every cart mutation while a COMPLETED order is loaded for
  // editing and the completed-order lock is on — silently, with no toast. Read
  // the same three inputs back so the grid can say so instead of ignoring taps.
  const editingOrderId = usePOSStore((s) => s.editingOrderId);
  const editingOrderStatus = usePOSStore((s) =>
    editingOrderId
      ? s.pastBills.find((bill) => bill.id === editingOrderId)?.status ?? null
      : null,
  );
  const cartLocked =
    !!editingOrderId &&
    editingOrderStatus === "completed" &&
    isCompletedOrderLockEnabled(userData);

  /* -------------------------------------------------------------- loading */

  React.useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;
    setLoading(true);
    Promise.resolve(fetchMenu())
      .catch((error) => console.error("[V3 POS] menu fetch failed:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId, fetchMenu]);

  /* -------------------------------------------------------------- filters */

  // Unavailable items are hidden outright (staff must not be able to bill
  // something the kitchen switched off), and a category with nothing left
  // disappears with them — same rule as v2.
  const availableGroupedItems = React.useMemo(() => {
    const result: GroupedItems = {};
    if (!groupedItems) return result;
    for (const [category, items] of Object.entries(groupedItems)) {
      const available = items.filter((item) => item.is_available !== false);
      if (available.length > 0) result[category] = available;
    }
    return result;
  }, [groupedItems]);

  const categories = React.useMemo(
    () => Object.keys(availableGroupedItems),
    [availableGroupedItems],
  );

  const searching = searchQuery.trim().length > 0;

  // Derived, not stored: a category that empties out (or a menu that has not
  // arrived yet) falls back to the first one instead of leaving the grid blank.
  const activeCategory = searching
    ? null
    : selectedCategory && categories.includes(selectedCategory)
      ? selectedCategory
      : (categories[0] ?? null);

  const visibleGroups = React.useMemo(() => {
    const result: GroupedItems = {};
    if (searching) {
      const query = searchQuery.trim().toLowerCase();
      for (const [category, items] of Object.entries(availableGroupedItems)) {
        // Name only — v2 does not search descriptions, categories or codes, and
        // a POS that quietly matched more would surprise whoever learned it.
        const matches = items.filter((item) =>
          item.name.toLowerCase().includes(query),
        );
        if (matches.length > 0) result[category] = matches;
      }
      return result;
    }
    if (activeCategory && availableGroupedItems[activeCategory]) {
      result[activeCategory] = availableGroupedItems[activeCategory];
    }
    return result;
  }, [availableGroupedItems, activeCategory, searchQuery, searching]);

  const visibleCount = React.useMemo(
    () => Object.values(visibleGroups).reduce((n, items) => n + items.length, 0),
    [visibleGroups],
  );

  /* ------------------------------------------------------------- rendering */

  return (
    <V3Card className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* v2 mounts this here, with only the manual open/closed switch — no
          storefront_settings, so the working-hours schedule never raises the
          sign inside the POS. Kept identical rather than quietly widened. */}
      <ShopClosedModalWarning
        hotelId={partnerId || ""}
        isShopOpen={partner?.is_shop_open ?? true}
      />

      {/* ---------------------------------------------------------- header */}
      <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-zinc-100 px-3.5 py-3 dark:border-zinc-800">
        <div className="flex h-[38px] min-w-0 flex-[1_1_200px] items-center gap-[9px] rounded-md border border-zinc-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-800">
          <Search size={16} strokeWidth={1.8} className="shrink-0 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items…"
            aria-label="Search menu items"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-normal text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="-mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
        <span className="shrink-0 text-[12px] font-medium leading-none text-zinc-400 dark:text-zinc-500">
          {visibleCount} item{visibleCount === 1 ? "" : "s"}
        </span>
      </div>

      {cartLocked && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-3.5 py-2 text-[12.5px] font-medium leading-[1.4] text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
          This order is completed and locked — items can&apos;t be added or changed.
        </div>
      )}

      {/* ------------------------------------------------------------ body */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Category rail. One list, two shapes: a horizontal strip of chips on a
            phone (a 96px left column costs a quarter of the screen there) and
            the design's vertical rail from md up, each with its own scroll. */}
        <nav
          aria-label="Menu categories"
          className={cn(
            "flex shrink-0 gap-1.5 overflow-x-auto border-b border-zinc-100 p-2 dark:border-zinc-800",
            "md:min-h-0 md:w-[168px] md:flex-col md:gap-1 md:overflow-x-hidden md:overflow-y-auto md:border-b-0 md:border-r lg:w-[188px]",
          )}
        >
          {categories.map((category) => {
            const active = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  setSearchQuery("");
                }}
                translate="no"
                className={cn(
                  "notranslate inline-flex min-h-9 shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-md border px-3 py-2 text-left text-[12.5px] font-medium capitalize leading-[1.25] transition-colors",
                  "md:w-full md:whitespace-normal md:break-words md:text-[13px]",
                  active
                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                )}
              >
                <span className="min-w-0">{category}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-[6px] py-px text-[10.5px] font-bold tabular-nums",
                    active
                      ? "bg-white text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400",
                  )}
                >
                  {availableGroupedItems[category].length}
                </span>
              </button>
            );
          })}

          {categories.length === 0 && (
            <span className="px-1 py-2 text-[12.5px] font-medium text-zinc-400 dark:text-zinc-500">
              {loading ? "Loading…" : "No categories"}
            </span>
          )}
        </nav>

        {/* Item grid — the only part that scrolls on desktop. */}
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto p-3 md:p-3.5",
            // Room under the last row for whatever the POS shell floats over the
            // bottom of a phone screen (v2 keeps a cart + orders FAB there).
            // No FAB clearance here: the POS shell owns the floating buttons and
            // already pads its root by pb-28 below lg. Padding here as well double
            // spaced the grid on a phone, and its md reset landed a breakpoint
            // early — between md and lg the FABs were still up but the clearance
            // was gone, hiding the last row behind them.
            "pb-4",
            cartLocked && "pointer-events-none opacity-60",
          )}
        >
          {visibleCount === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2.5 px-5 py-16 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-500">
                <UtensilsCrossed size={20} strokeWidth={1.7} />
              </div>
              <div className="text-[14px] font-bold text-zinc-700 dark:text-zinc-300">
                {loading
                  ? "Loading menu…"
                  : searching
                    ? "No items found"
                    : "Nothing to bill here"}
              </div>
              <div className="max-w-[380px] text-[12.5px] font-medium leading-[1.5] text-zinc-400 dark:text-zinc-500">
                {loading
                  ? "Fetching your menu."
                  : searching
                    ? "Nothing matches that name. Search looks at item names only."
                    : "Items switched off in Menu → Availability are hidden from the POS, so a category can look empty here while it still exists on your menu."}
              </div>
            </div>
          ) : (
            Object.entries(visibleGroups).map(([category, items]) => (
              <section key={category} className="mb-5 last:mb-0">
                <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase leading-none tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
                  <span className="h-3 w-[3px] rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  <span translate="no" className="notranslate capitalize">
                    {category}
                  </span>
                </h3>
                <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(148px,1fr))]">
                  {items.map((item) => (
                    <PosTile
                      key={item.id}
                      item={item}
                      currency={currency}
                      partnerId={partnerId}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </V3Card>
  );
}

/* ------------------------------------------------------------------- tile */

function PosTile({
  item,
  currency,
  partnerId,
}: {
  item: MenuItem;
  currency: string;
  partnerId?: string;
}) {
  const itemId = item.id ?? "";
  const addToCart = usePOSStore((s) => s.addToCart);
  const setSavedPrice = usePOSStore((s) => s.setSavedPrice);
  const savedPrice = usePOSStore((s) => s.savedPrices[itemId]);
  // Numbers, not the cart array: only the tiles whose own count changed
  // re-render when a line is added anywhere in the bill.
  const lineQty = usePOSStore((s) =>
    s.cartItems.reduce(
      (n, line) =>
        line.id === itemId || line.id?.startsWith(`${itemId}|`)
          ? n + line.quantity
          : n,
      0,
    ),
  );
  const openCustomizer = useCustomizerStore((s) => s.open);

  const [pricePromptOpen, setPricePromptOpen] = React.useState(false);

  const hasVariants = (item.variants?.length ?? 0) > 0;
  const hasCustomizations = (item.addon_groups?.length ?? 0) > 0;

  /** The add v2 performs: a "price as per size" item is billed at the price the
   *  cashier typed once, reused silently for the rest of the bill, and carries
   *  the ORIGINAL id so repeats group onto one line. */
  const add = React.useCallback(() => {
    if (!item.is_price_as_per_size) {
      addToCart(item);
      return;
    }
    if (savedPrice) {
      addToCart({
        ...item,
        id: item.id,
        price: savedPrice,
        name: `${item.name} (${currency}${savedPrice})`,
      });
      return;
    }
    setPricePromptOpen(true);
  }, [addToCart, currency, item, savedPrice]);

  const confirmPrice = (price: number) => {
    setSavedPrice(itemId, price);
    addToCart({
      ...item,
      id: item.id,
      price,
      name: `${item.name} (${currency}${price})`,
    });
    setPricePromptOpen(false);
  };

  // Addon items go through the shared ItemCustomizationSheet (globally mounted),
  // which also handles their variant choice; onAdd hands the built line back.
  const openPosCustomizer = () =>
    openCustomizer({
      item: item as any,
      currency,
      accent: "#18181B",
      basePrice: item.price,
      onAdd: (line, qty) => {
        for (let i = 0; i < qty; i += 1) addToCart(line);
      },
    });

  const cheapestVariant = hasVariants
    ? [...(item.variants ?? [])].sort((a, b) => a.price - b.price)[0]?.price ?? item.price
    : item.price;

  const thumb = (
    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
      {item.image_url ? (
        <Img
          src={item.image_url}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
          <UtensilsCrossed size={22} strokeWidth={1.6} />
        </div>
      )}
      {lineQty > 0 && (
        <span className="absolute right-1.5 top-1.5 inline-flex min-w-[22px] items-center justify-center rounded-full bg-zinc-900 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums dark:bg-zinc-50 dark:text-zinc-900">
          {lineQty}
        </span>
      )}
    </div>
  );

  const title = (
    <h4
      translate="no"
      title={item.name}
      className="notranslate line-clamp-2 text-[12.5px] font-semibold leading-[1.3] text-zinc-950 dark:text-zinc-50"
    >
      {item.name}
    </h4>
  );

  const priceLine = (
    <p className="text-[12.5px] font-semibold leading-none tabular-nums text-zinc-700 dark:text-zinc-300">
      {item.is_price_as_per_size ? (
        <span className="text-[11.5px] font-medium italic text-zinc-500 dark:text-zinc-400">
          Price as per size
          {savedPrice ? ` (${currency}${formatPrice(savedPrice, partnerId)})` : ""}
        </span>
      ) : hasVariants ? (
        <>
          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            From{" "}
          </span>
          {currency}
          {formatPrice(cheapestVariant, partnerId)}
        </>
      ) : (
        <>
          {currency}
          {formatPrice(item.price, partnerId)}
        </>
      )}
    </p>
  );

  /* -- 1. customization groups: the whole tile opens the shared sheet ------ */
  if (hasCustomizations) {
    return (
      <button
        type="button"
        onClick={openPosCustomizer}
        className={cn(
          CARD_SHELL,
          "text-left hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60",
        )}
      >
        {thumb}
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          {title}
          {priceLine}
          <span className={cn(ADD_BTN, "mt-auto")}>
            <Plus size={15} strokeWidth={2.2} />
            {lineQty > 0 ? `Add (${lineQty})` : "Add"}
          </span>
        </div>
      </button>
    );
  }

  /* -- 2. variants, no addons: a picker with a stepper per option ---------- */
  if (hasVariants) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              CARD_SHELL,
              "text-left hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60",
            )}
          >
            {thumb}
            <div className="flex flex-1 flex-col gap-1.5 p-2.5">
              {title}
              {priceLine}
              <span
                className={cn(
                  "mt-auto inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[12.5px] font-medium leading-none text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
                )}
              >
                {(item.variants ?? []).length} options
                <ChevronDown size={14} strokeWidth={2} className="text-zinc-400" />
              </span>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-[min(22rem,calc(100vw-1.5rem))] rounded-[10px] border-zinc-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div
            translate="no"
            className="notranslate mb-2 border-b border-zinc-100 pb-2 text-[12.5px] font-semibold leading-[1.3] text-zinc-950 dark:border-zinc-800 dark:text-zinc-50"
          >
            {item.name}
          </div>
          <div className="max-h-[290px] space-y-1 overflow-y-auto">
            {(item.variants ?? []).map((variant) => (
              <VariantRow
                key={variant.name}
                item={item}
                variant={variant}
                currency={currency}
                partnerId={partnerId}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  /* -- 3. plain item: tap the tile to add, stepper once it is in the cart -- */
  return (
    <>
      <div className={cn(CARD_SHELL, "hover:border-zinc-300 dark:hover:border-zinc-700")}>
        <button
          type="button"
          onClick={add}
          className="flex flex-1 flex-col text-left transition-colors hover:bg-zinc-50 active:scale-[0.99] dark:hover:bg-zinc-800/60"
        >
          {thumb}
          <div className="flex flex-1 flex-col gap-1.5 p-2.5 pb-1.5">
            {title}
            {priceLine}
          </div>
        </button>
        <div className="p-2.5 pt-0">
          <QtyControl lineId={itemId} onAdd={add} />
        </div>
      </div>

      {pricePromptOpen && (
        <PricePrompt
          itemName={item.name}
          currency={currency}
          onCancel={() => setPricePromptOpen(false)}
          onConfirm={confirmPrice}
        />
      )}
    </>
  );
}

/* ---------------------------------------------------------- variant row */

function VariantRow({
  item,
  variant,
  currency,
  partnerId,
}: {
  item: MenuItem;
  variant: { name: string; price: number };
  currency: string;
  partnerId?: string;
}) {
  const addToCart = usePOSStore((s) => s.addToCart);
  const variantId = `${item.id}|${variant.name}`;

  // The exact line shape v2 builds: composite id, "Item (Variant)" name, the
  // variant's own price, and variants emptied so the line can't re-branch.
  const add = () =>
    addToCart({
      ...item,
      id: variantId,
      price: variant.price,
      name: `${item.name} (${variant.name})`,
      variants: [],
    });

  return (
    <div className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800">
      <button
        type="button"
        onClick={add}
        className="min-w-0 flex-1 text-left"
      >
        <div
          translate="no"
          className="notranslate truncate text-[12.5px] font-medium leading-[1.3] text-zinc-950 dark:text-zinc-50"
        >
          {variant.name}
        </div>
        <div className="text-[11.5px] font-medium leading-[1.3] tabular-nums text-zinc-500 dark:text-zinc-400">
          {currency}
          {formatPrice(variant.price, partnerId)}
        </div>
      </button>
      <QtyControl lineId={variantId} onAdd={add} compact />
    </div>
  );
}

/* ----------------------------------------------------------- qty control */

/**
 * "Add" until the line exists, then "− n +".
 *
 * Stepping down from 1 REMOVES the line rather than calling decreaseQuantity —
 * posStore.decreaseQuantity does the same internally, but doing it here keeps
 * the intent readable. Stepping up goes back through the tile's own `add`, so a
 * "price as per size" line keeps reusing its saved price.
 */
function QtyControl({
  lineId,
  onAdd,
  compact = false,
}: {
  lineId: string;
  onAdd: () => void;
  compact?: boolean;
}) {
  const quantity = usePOSStore(
    (s) => s.cartItems.find((line) => line.id === lineId)?.quantity ?? 0,
  );
  const decreaseQuantity = usePOSStore((s) => s.decreaseQuantity);
  const removeFromCart = usePOSStore((s) => s.removeFromCart);

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className={cn(ADD_BTN, compact && "w-9 px-0")}
        aria-label="Add to cart"
      >
        <Plus size={15} strokeWidth={2.2} />
        {!compact && "Add"}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", !compact && "justify-between")}>
      <button
        type="button"
        aria-label="Remove one"
        onClick={(e) => {
          e.stopPropagation();
          if (quantity > 1) decreaseQuantity(lineId);
          else removeFromCart(lineId);
        }}
        className={STEP_BTN}
      >
        <Minus size={15} strokeWidth={2.2} />
      </button>
      <span className="min-w-[2ch] text-center text-[13.5px] font-semibold leading-none tabular-nums text-zinc-950 dark:text-zinc-50">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Add one"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className={cn(
          STEP_BTN,
          "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-700 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
        )}
      >
        <Plus size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}

/* --------------------------------------------------------- price prompt */

/**
 * "Price as per size" items are billed at whatever the counter says — fish by
 * weight, a cut of meat. The answer is asked once and then remembered for the
 * rest of the bill (posStore.savedPrices, cleared by clearCart).
 */
function PricePrompt({
  itemName,
  currency,
  onCancel,
  onConfirm,
}: {
  itemName: string;
  currency: string;
  onCancel: () => void;
  onConfirm: (price: number) => void;
}) {
  const [value, setValue] = React.useState("");
  const invalid = value.trim().length > 0 && !(Number(value) > 0);

  const submit = () => {
    const price = parseFloat(value);
    if (!Number.isFinite(price) || price <= 0) return;
    onConfirm(price);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Set a price for ${itemName}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h3 className="text-[14.5px] font-semibold leading-none tracking-[-0.01em] text-zinc-950 dark:text-zinc-50">
          Enter price
        </h3>
        <p className="mt-1.5 text-[12.5px] leading-[1.4] text-zinc-500 dark:text-zinc-400">
          <span translate="no" className="notranslate">
            {itemName}
          </span>{" "}
          is priced by size. This price is reused for the rest of this bill.
        </p>

        <div className="relative mt-4">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-medium text-zinc-400 dark:text-zinc-500">
            {currency}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="0.00"
            aria-label="Price"
            className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-center text-[16px] font-semibold text-zinc-950 outline-none placeholder:font-normal placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          />
        </div>
        {invalid && (
          <p className="mt-2 text-[12px] font-medium text-red-600 dark:text-red-400">
            Enter an amount greater than zero.
          </p>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-zinc-200 bg-white text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!(Number(value) > 0)}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-zinc-900 bg-zinc-900 text-[13px] font-bold text-white transition-colors hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add item
          </button>
        </div>
      </div>
    </div>
  );
}

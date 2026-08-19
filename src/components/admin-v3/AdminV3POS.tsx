"use client";

import * as React from "react";
import { Loader2, Receipt, ShoppingCart } from "lucide-react";

import ItemCustomizationSheet from "@/components/hotelDetail/ItemCustomizationSheet";
import { subscribeToHasura } from "@/lib/hasuraSubscription";
import { cn } from "@/lib/utils";
import { Partner, useAuthStore } from "@/store/authStore";
import { usePOSStore } from "@/store/posStore";

import { POSCartPanel } from "./pos/POSCartPanel";
import { POSMenuPanel } from "./pos/POSMenuPanel";
import { money } from "./orders/shared";
import { V3Card } from "./ui/primitives";

/**
 * /admin-v3 → POS.
 *
 * The counter screen. This file is only the SHELL: the two-pane layout, the
 * height/overflow model, the table subscription that feeds the table picker, and
 * the mobile menu↔cart model. Every piece of POS behaviour — the menu grid, the
 * cart, charges, discounts, checkout, today's orders, printing — lives in the
 * two panels, and both of them talk to `usePOSStore` directly. The store is the
 * integration seam; this shell passes almost nothing down.
 *
 * Ported from admin-v2's AdminV2POS with the same store calls in the same order.
 * Three things are deliberately different, all noted at their site below:
 *   1. the split happens at `lg`, not `md`, because that is where the v3 shell
 *      switches to its fixed-height model;
 *   2. the cart panel is keyed on an open-counter rather than on `activeTab`,
 *      which kills v2's silent desktop remount;
 *   3. v2's `<EditOrderModal />` is not mounted — nothing on this screen ever
 *      sets `posStore.editOrderModalOpen`, so it was dead weight there too.
 */

/* ------------------------------------------------------------------ tables */

const PARTNER_TABLES_SUBSCRIPTION = `
  subscription GetPartnerTablesLive($partner_id: uuid!) {
    qr_codes(where: { partner_id: { _eq: $partner_id } }) {
      id
      qr_number
      table_number
      partner_id
      no_of_scans
      table_name
    }
  }
`;

export function AdminV3POS() {
  const { userData } = useAuthStore();
  const partner = userData as Partner | undefined;
  const currency = partner?.currency || "₹";

  // A captain is scoped to the restaurant they work for, not to their own row.
  const partnerId =
    userData?.role === "captain"
      ? ((userData as any)?.partner_id as string | undefined)
      : userData?.id;

  const {
    setIsPOSOpen,
    setIsCaptainOrder,
    getPartnerTables,
    cartItems,
    pastBills,
    fetchPastBills,
    calculateTotalWithCharges,
    // Subscribed purely so the floating cart total re-renders when a charge or
    // a discount changes — `calculateTotalWithCharges` reads them off the store
    // at call time and would otherwise not be a render dependency.
    extraCharges,
    discounts,
  } = usePOSStore();
  void extraCharges;
  void discounts;

  /* --------------------------------------------------------- POS lifecycle */

  React.useEffect(() => {
    setIsPOSOpen(true);
    // This screen is the partner's own till. The captain POS is a separate app
    // (/captain) and sets this flag itself; leaving it stale here would stamp
    // `orderedby: "captain"` on a partner's order.
    setIsCaptainOrder(false);
    return () => setIsPOSOpen(false);
  }, [setIsPOSOpen, setIsCaptainOrder]);

  /* ------------------------------------------------------------ table feed */

  React.useEffect(() => {
    if (!partnerId) return;

    // One eager fetch so the table picker is populated before the socket opens,
    // then the live feed takes over. Both write `tables`/`tableNumbers` on the
    // store, which is where the cart panel's picker reads them from.
    getPartnerTables();

    // Depending on `partnerId` rather than v2's `[userData]`: userData is a new
    // object on every auth-store write, and each one used to tear the socket
    // down and open a new one.
    const unsubscribe = subscribeToHasura({
      query: PARTNER_TABLES_SUBSCRIPTION,
      variables: { partner_id: partnerId },
      onNext: (data) => {
        const qrCodes = data?.data?.qr_codes;
        if (!qrCodes) return;

        // Table 0 is reserved for delivery (posStore.setDeliveryMode), and a QR
        // with no table number is a menu QR, not a table — neither belongs in
        // the picker.
        const validQrs = qrCodes.filter(
          (qr: any) =>
            qr.table_number !== null &&
            qr.table_number !== undefined &&
            qr.table_number !== 0,
        );

        const tableNumbers = validQrs
          .map((qr: any) => Number(qr.table_number))
          .sort((a: number, b: number) => a - b);

        const tables = validQrs
          .map((qr: any) => ({
            id: qr.id,
            number: Number(qr.table_number),
            name: qr.table_name || undefined,
          }))
          .sort((a: any, b: any) => a.number - b.number);

        usePOSStore.setState({ tableNumbers, tables, qrCodeData: qrCodes });
      },
      onError: (e) => console.error("[V3 POS] table subscription error:", e),
    });

    return () => {
      // graphql-ws hands back a dispose function, but older wrappers return an
      // object with .dispose() — tolerate both rather than leak the socket.
      if (typeof unsubscribe === "function") unsubscribe();
      else if (unsubscribe && typeof (unsubscribe as any).dispose === "function")
        (unsubscribe as any).dispose();
    };
  }, [partnerId, getPartnerTables]);

  /* ---------------------------------------------------------- mobile model */

  const [activeTab, setActiveTab] = React.useState<"menu" | "cart">("menu");
  const [cartInitialView, setCartInitialView] = React.useState<"current" | "today">(
    "current",
  );
  // Bumped every time a floating button opens the cart. It is the *only* thing
  // besides the requested view that remounts the cart panel, and the floating
  // buttons exist only below lg — so the desktop cart is never remounted.
  //
  // v2 keyed the sidebar on `${activeTab}-${cartInitialView}`, which meant the
  // "Add Item" button inside an in-progress edit (it calls onMobileBack) threw
  // away the visible desktop cart's ~20 pieces of local state — open editors,
  // the selected past order, the current view — and silently snapped it back to
  // its initial view. The counter always needs a fresh panel when a floating
  // button opens it, and never needs one otherwise; a counter says that, a tab
  // flag does not.
  const [cartOpenSeq, setCartOpenSeq] = React.useState(0);

  const openCart = (view: "current" | "today") => {
    setCartInitialView(view);
    setActiveTab("cart");
    setCartOpenSeq((n) => n + 1);
    // Today's list is driven by a live subscription inside the cart panel, but
    // the first paint should not be empty while that connects.
    if (view === "today") fetchPastBills();
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = calculateTotalWithCharges();
  const hasPendingBills = pastBills.some((order) => order.status === "pending");

  /* --------------------------------------------------------------- loading */

  if (!userData) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-24">
        <Loader2 size={22} strokeWidth={1.8} className="animate-spin text-zinc-400" />
        <p className="text-[12.5px] font-medium text-zinc-400 dark:text-zinc-500">
          Opening the till…
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------- rendering */

  return (
    <div
      className={cn(
        "flex flex-col lg:min-h-0 lg:flex-1 lg:px-[clamp(14px,3vw,28px)] lg:py-5",
        // Below lg the page scrolls, so the last row of the menu grid has to
        // clear the floating buttons. The cart tab has no floating buttons and
        // ends in its own checkout button, so it gets none of this.
        activeTab === "menu" ? "pb-28 lg:pb-5" : "pb-0 lg:pb-5",
      )}
    >
      {/*
        HEIGHT MODEL. From lg up the shell hands this box the space left under
        the header (lg:min-h-0 lg:flex-1) and neither the page nor this row
        scrolls — each panel owns its own scrollbar, the way the dashboard's
        Live Orders card does. Below lg the row is auto-height and `main`
        scrolls as one ordinary page, which is also where the tab model takes
        over.

        The split is at lg, not v2's md. The shell only switches to fixed-height
        at lg, so a two-column POS at md would put both panels inside an
        unbounded box — their internal scrollers would have nothing to scroll
        against and the whole screen would grow instead. A 768–1023px tablet
        therefore gets the tab model, which is the better shape for that width
        anyway: full-width cards, thumb-reachable actions.
      */}
      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:flex-row lg:gap-5">
        {/* ----------------------------------------------------- menu pane */}
        <V3Card
          className={cn(
            "min-w-0 flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden",
            // `lg:flex` last so it beats the tab-driven `hidden`: above lg both
            // panes are always on screen and activeTab is a mobile-only concern.
            activeTab === "menu" ? "flex" : "hidden",
            "lg:flex",
          )}
        >
          <POSMenuPanel />
        </V3Card>

        {/* ----------------------------------------------------- cart pane */}
        <V3Card
          className={cn(
            // 400px is v2's cart width and the number the panel's rows were
            // sized against; the xl bump only spends space a wide screen has.
            "w-full min-w-0 shrink-0 flex-col lg:w-[400px] lg:min-h-0 lg:overflow-hidden xl:w-[430px]",
            activeTab === "cart" ? "flex" : "hidden",
            "lg:flex",
          )}
        >
          <POSCartPanel
            key={`${cartInitialView}-${cartOpenSeq}`}
            onMobileBack={() => setActiveTab("menu")}
            initialViewMode={cartInitialView}
          />
        </V3Card>
      </div>

      {/* ------------------------------------------------- floating buttons */}
      {/*
        The two ways into the cart on a phone, one per thumb: today's orders
        bottom-left, the live cart bottom-right. They are rendered only over the
        menu, because from inside the cart the way out is its own back arrow.
      */}
      {activeTab === "menu" && (
        <>
          <button
            type="button"
            onClick={() => openCart("today")}
            aria-label="Today's orders"
            className={cn(
              "fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border shadow-lg transition-colors active:scale-95 lg:hidden",
              "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
              "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
            )}
          >
            <span className="relative">
              <Receipt size={22} strokeWidth={1.8} />
              {hasPendingBills && (
                <span className="absolute -right-2.5 -top-2.5 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500 dark:border-zinc-800" />
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => openCart("current")}
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex h-14 items-center justify-center gap-2.5 rounded-full shadow-lg transition-colors active:scale-95 lg:hidden",
              // The near-black button inverts in dark mode — on a zinc-950 page
              // a zinc-900 disc is invisible.
              "bg-zinc-900 text-white hover:bg-zinc-800",
              "dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
              cartCount > 0 ? "pl-[18px] pr-[22px]" : "w-14",
            )}
          >
            <span className="relative">
              <ShoppingCart size={22} strokeWidth={1.9} />
              {cartCount > 0 && (
                <span className="absolute -right-2.5 -top-2.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-zinc-900 bg-white px-1 text-[11px] font-bold leading-none text-zinc-900 dark:border-zinc-50 dark:bg-zinc-900 dark:text-zinc-50">
                  {cartCount}
                </span>
              )}
            </span>
            {cartCount > 0 && (
              <span
                translate="no"
                className="notranslate whitespace-nowrap text-[13.5px] font-bold leading-none tabular-nums"
              >
                {money(currency, cartTotal, Number.isInteger(cartTotal) ? 0 : 2)}
              </span>
            )}
          </button>
        </>
      )}

      {/*
        Addon-carrying items open the customer storefront's customization sheet
        rather than a POS-only copy, so a modifier priced one way on the menu is
        priced the same way at the counter. It is driven entirely by
        `customizerStore`, so it is mounted once here — the menu panel must NOT
        mount a second one, or every customization opens two sheets.
      */}
      <ItemCustomizationSheet />
    </div>
  );
}

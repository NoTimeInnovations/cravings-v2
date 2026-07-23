"use client";

import { createContext, useContext } from "react";

/**
 * True when the storefront is in `?viewonly=true` mode — a pure menu viewer with
 * no ordering: no order-type prompt, no onboarding, and no add-to-cart controls.
 *
 * View-only reuses the layouts' existing "menu-only" behaviour (ordering +
 * delivery features neutralised in HotelMenuPage_v2), which already hides the
 * add buttons in Default/Sidebar/V6. A few layouts (V3/V4/V5/Compact) still show
 * a variant "Add/View/Options" CTA in menu-only mode; those read this context to
 * suppress it in view-only WITHOUT changing normal menu-only partners' behaviour.
 */
export const ViewOnlyContext = createContext(false);

export const useViewOnly = () => useContext(ViewOnlyContext);

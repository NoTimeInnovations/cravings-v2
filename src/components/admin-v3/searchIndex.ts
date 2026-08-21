"use client";

import {
  getNavItemState,
  settingsSectionVisible,
  settingsTabVisible,
} from "@/lib/adminNav";

import { navItems } from "./navItems";

/**
 * What the ⌘K palette can find.
 *
 * The settings rows are GENERATED from the section sources (every `label=` /
 * `title=` inside each `if (tab === "…")` block), so the index is the real set
 * of fields rather than a hand-kept list that drifts the moment someone adds a
 * toggle. Re-run the generator in the commit message if you add a section.
 *
 * Navigation is two-stage on purpose: an entry knows the SCREEN its text lives
 * on (view + settings group/tab), and the palette then finds the text itself in
 * the DOM once that screen has rendered. That is what makes "go to that text"
 * work without giving several hundred fields their own ids — and it means a
 * label nobody indexed is still reachable once you are on the right page.
 */
export interface SearchEntry {
  /** The visible text, and what is matched against. */
  label: string;
  /** Where it lives, shown under the result. */
  crumb: string;
  /** admin store view to switch to. */
  view: string;
  /** Settings section key, when the entry is inside Settings. */
  sg?: string;
  /** Settings tab key. */
  ss?: string;
}

const SETTINGS_ENTRIES: SearchEntry[] = [
  { label: "Store profile", crumb: "Settings", view: "Settings", sg: "profile" },
  { label: "Ordering", crumb: "Settings", view: "Settings", sg: "ordering" },
  { label: "Payments & tax", crumb: "Settings", view: "Settings", sg: "payments" },
  { label: "Appearance", crumb: "Settings", view: "Settings", sg: "storefront" },
  { label: "Printing", crumb: "Settings", view: "Settings", sg: "printing" },
  { label: "Integrations", crumb: "Settings", view: "Settings", sg: "integrations" },
  { label: "Features", crumb: "Settings", view: "Settings", sg: "modules" },
  { label: "Store name", crumb: "Settings › Store profile › Details", view: "Settings", sg: "profile", ss: "details" },
  { label: "Tagline", crumb: "Settings › Store profile › Details", view: "Settings", sg: "profile", ss: "details" },
  { label: "Registered name", crumb: "Settings › Store profile › Details", view: "Settings", sg: "profile", ss: "details" },
  { label: "Phone", crumb: "Settings › Store profile › Details", view: "Settings", sg: "profile", ss: "details" },
  { label: "WhatsApp number", crumb: "Settings › Store profile › Details", view: "Settings", sg: "profile", ss: "details" },
  { label: "Street address", crumb: "Settings › Store profile › Address", view: "Settings", sg: "profile", ss: "address" },
  { label: "City", crumb: "Settings › Store profile › Address", view: "Settings", sg: "profile", ss: "address" },
  { label: "State", crumb: "Settings › Store profile › Address", view: "Settings", sg: "profile", ss: "address" },
  { label: "Country", crumb: "Settings › Store profile › Address", view: "Settings", sg: "profile", ss: "address" },
  { label: "Landmark", crumb: "Settings › Store profile › Address", view: "Settings", sg: "profile", ss: "address" },
  { label: "Latitude", crumb: "Settings › Store profile › Address", view: "Settings", sg: "profile", ss: "address" },
  { label: "Longitude", crumb: "Settings › Store profile › Address", view: "Settings", sg: "profile", ss: "address" },
  { label: "Currency", crumb: "Settings › Store profile › Currency & Language", view: "Settings", sg: "profile", ss: "region" },
  { label: "Timezone", crumb: "Settings › Store profile › Currency & Language", view: "Settings", sg: "profile", ss: "region" },
  { label: "Offer other languages", crumb: "Settings › Store profile › Currency & Language", view: "Settings", sg: "profile", ss: "region" },
  { label: "Instagram", crumb: "Settings › Store profile › Currency & Language", view: "Settings", sg: "profile", ss: "region" },
  { label: "Facebook", crumb: "Settings › Store profile › Currency & Language", view: "Settings", sg: "profile", ss: "region" },
  { label: "Accepting orders", crumb: "Settings › Store profile › Accepting orders", view: "Settings", sg: "profile", ss: "status" },
  { label: "Follow this schedule", crumb: "Settings › Store profile › Weekly hours", view: "Settings", sg: "profile", ss: "weekly" },
  { label: "No schedule yet", crumb: "Settings › Store profile › Weekly hours", view: "Settings", sg: "profile", ss: "weekly" },
  { label: "No special dates", crumb: "Settings › Store profile › Weekly hours", view: "Settings", sg: "profile", ss: "weekly" },
  { label: "Date", crumb: "Settings › Store profile › Weekly hours", view: "Settings", sg: "profile", ss: "weekly" },
  { label: "Open on this date", crumb: "Settings › Store profile › Weekly hours", view: "Settings", sg: "profile", ss: "weekly" },
  { label: "Opens at", crumb: "Settings › Store profile › Weekly hours", view: "Settings", sg: "profile", ss: "weekly" },
  { label: "Closes at", crumb: "Settings › Store profile › Weekly hours", view: "Settings", sg: "profile", ss: "weekly" },
  { label: "Remove this date", crumb: "Settings › Store profile › Weekly hours", view: "Settings", sg: "profile", ss: "weekly" },
  { label: "Delivery", crumb: "Settings › Ordering › Order types", view: "Settings", sg: "ordering", ss: "types" },
  { label: "Takeaway", crumb: "Settings › Ordering › Order types", view: "Settings", sg: "ordering", ss: "types" },
  { label: "Dine-in", crumb: "Settings › Ordering › Order types", view: "Settings", sg: "ordering", ss: "types" },
  { label: "Packaging charge", crumb: "Settings › Ordering › Charges", view: "Settings", sg: "ordering", ss: "takeaway" },
  { label: "Charged", crumb: "Settings › Ordering › Charges", view: "Settings", sg: "ordering", ss: "takeaway" },
  { label: "Let customers order for later", crumb: "Settings › Ordering › Prebooking", view: "Settings", sg: "ordering", ss: "scheduled" },
  { label: "Let customers book a table", crumb: "Settings › Ordering › Prebooking", view: "Settings", sg: "ordering", ss: "scheduled" },
  { label: "Notice needed", crumb: "Settings › Ordering › Prebooking", view: "Settings", sg: "ordering", ss: "scheduled" },
  { label: "Slot length", crumb: "Settings › Ordering › Prebooking", view: "Settings", sg: "ordering", ss: "scheduled" },
  { label: "How far ahead", crumb: "Settings › Ordering › Prebooking", view: "Settings", sg: "ordering", ss: "scheduled" },
  { label: "Ask for the customer’s name", crumb: "Settings › Ordering › Checkout", view: "Settings", sg: "ordering", ss: "checkout" },
  { label: "Require full address details", crumb: "Settings › Ordering › Checkout", view: "Settings", sg: "ordering", ss: "checkout" },
  { label: "Radius", crumb: "Settings › Ordering › Delivery", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Minimum order", crumb: "Settings › Ordering › Delivery", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Base charge", crumb: "Settings › Ordering › Delivery", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Covers the first", crumb: "Settings › Ordering › Delivery", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Per km after that", crumb: "Settings › Ordering › Delivery", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Free delivery over a value", crumb: "Settings › Ordering › Delivery", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Free above", crumb: "Settings › Ordering › Delivery", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Hide the delivery charge", crumb: "Settings › Ordering › Delivery", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Ask the rider for a pickup code", crumb: "Settings › Ordering › Delivery", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Ask the customer for a delivery code", crumb: "Settings › Ordering › Delivery", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Porter & Rapido", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Vehicle", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Search each provider for", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Book a rider automatically", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Book when the order is", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "After", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "What the customer pays for delivery", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Provider order", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Move up", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Move down", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Cash", crumb: "Settings › Payments & tax › Methods", view: "Settings", sg: "payments", ss: "methods" },
  { label: "Online payment", crumb: "Settings › Payments & tax › Methods", view: "Settings", sg: "payments", ss: "methods" },
  { label: "UPI QR after ordering", crumb: "Settings › Payments & tax › Methods", view: "Settings", sg: "payments", ss: "methods" },
  { label: "UPI ID", crumb: "Settings › Payments & tax › Methods", view: "Settings", sg: "payments", ss: "methods" },
  { label: "Message under the QR", crumb: "Settings › Payments & tax › Methods", view: "Settings", sg: "payments", ss: "methods" },
  { label: "Charge tax on orders", crumb: "Settings › Payments & tax › Tax", view: "Settings", sg: "payments", ss: "tax" },
  { label: "Tax number", crumb: "Settings › Payments & tax › Tax", view: "Settings", sg: "payments", ss: "tax" },
  { label: "Rate", crumb: "Settings › Payments & tax › Tax", view: "Settings", sg: "payments", ss: "tax" },
  { label: "Call it VAT instead of GST", crumb: "Settings › Payments & tax › Tax", view: "Settings", sg: "payments", ss: "tax" },
  { label: "Show the logo full-screen at onboarding", crumb: "Settings › Appearance › Brand", view: "Settings", sg: "storefront", ss: "brand" },
  { label: "Announcement bar", crumb: "Settings › Appearance › Brand", view: "Settings", sg: "storefront", ss: "brand" },
  { label: "Custom brand colour", crumb: "Settings › Appearance › Menu look", view: "Settings", sg: "storefront", ss: "look" },
  { label: "Show the open / hours pill", crumb: "Settings › Appearance › Info page", view: "Settings", sg: "storefront", ss: "info" },
  { label: "Cuisine", crumb: "Settings › Appearance › Info page", view: "Settings", sg: "storefront", ss: "info" },
  { label: "City", crumb: "Settings › Appearance › Info page", view: "Settings", sg: "storefront", ss: "info" },
  { label: "Play Store link", crumb: "Settings › Appearance › Info page", view: "Settings", sg: "storefront", ss: "info" },
  { label: "App Store link", crumb: "Settings › Appearance › Info page", view: "Settings", sg: "storefront", ss: "info" },
  { label: "Open your storefront in a new tab", crumb: "Settings › Appearance › Info page", view: "Settings", sg: "storefront", ss: "info" },
  { label: "Show the category before each item", crumb: "Settings › Printing › Bill content", view: "Settings", sg: "printing", ss: "content" },
  { label: "Print a QR to the online bill", crumb: "Settings › Printing › Bill content", view: "Settings", sg: "printing", ss: "content" },
  { label: "Show delivery boy info on bill", crumb: "Settings › Printing › Bill content", view: "Settings", sg: "printing", ss: "content" },
  { label: "Print your logo on the bill", crumb: "Settings › Printing › Bill content", view: "Settings", sg: "printing", ss: "content" },
  { label: "Print your FSSAI number", crumb: "Settings › Printing › Bill content", view: "Settings", sg: "printing", ss: "content" },
  { label: "FSSAI number", crumb: "Settings › Printing › Bill content", view: "Settings", sg: "printing", ss: "content" },
  { label: "Remove the bill logo", crumb: "Settings › Printing › Bill content", view: "Settings", sg: "printing", ss: "content" },
  { label: "Print labels in Arabic", crumb: "Settings › Printing › Layout", view: "Settings", sg: "printing", ss: "layout" },
  { label: "Print automatically", crumb: "Settings › Printing › Auto-print", view: "Settings", sg: "printing", ss: "auto" },
  { label: "What to print", crumb: "Settings › Printing › Auto-print", view: "Settings", sg: "printing", ss: "auto" },
  { label: "Print the KOT when the order becomes", crumb: "Settings › Printing › Auto-print", view: "Settings", sg: "printing", ss: "auto" },
  { label: "Print the bill when the order becomes", crumb: "Settings › Printing › Auto-print", view: "Settings", sg: "printing", ss: "auto" },
  { label: "Connections", crumb: "Settings › Integrations", view: "Settings", sg: "integrations" },
  { label: "WhatsApp notifications", crumb: "Settings › Integrations", view: "Settings", sg: "integrations" },
  { label: "Google Tag Manager", crumb: "Settings › Integrations", view: "Settings", sg: "integrations" },
  { label: "Use Google Tag Manager", crumb: "Settings › Integrations", view: "Settings", sg: "integrations" },
  { label: "Container ID", crumb: "Settings › Integrations", view: "Settings", sg: "integrations" },
  { label: "Features", crumb: "Settings › Features", view: "Settings", sg: "modules" },
  { label: "No optional features", crumb: "Settings › Features", view: "Settings", sg: "modules" },
  { label: "Details", crumb: "Settings › Store profile", view: "Settings", sg: "profile", ss: "details" },
  { label: "Address", crumb: "Settings › Store profile", view: "Settings", sg: "profile", ss: "address" },
  { label: "Currency & Language", crumb: "Settings › Store profile", view: "Settings", sg: "profile", ss: "region" },
  { label: "Social", crumb: "Settings › Store profile", view: "Settings", sg: "profile", ss: "social" },
  { label: "Accepting orders", crumb: "Settings › Store profile", view: "Settings", sg: "profile", ss: "status" },
  { label: "Weekly hours", crumb: "Settings › Store profile", view: "Settings", sg: "profile", ss: "weekly" },
  { label: "Special dates", crumb: "Settings › Store profile", view: "Settings", sg: "profile", ss: "special" },
  { label: "Methods", crumb: "Settings › Payments & tax", view: "Settings", sg: "payments", ss: "methods" },
  { label: "Tax", crumb: "Settings › Payments & tax", view: "Settings", sg: "payments", ss: "tax" },
  { label: "Brand", crumb: "Settings › Appearance", view: "Settings", sg: "storefront", ss: "brand" },
  { label: "Menu look", crumb: "Settings › Appearance", view: "Settings", sg: "storefront", ss: "look" },
  { label: "Info page", crumb: "Settings › Appearance", view: "Settings", sg: "storefront", ss: "info" },
  { label: "Domain", crumb: "Settings › Appearance", view: "Settings", sg: "storefront", ss: "domain" },
  { label: "Bill content", crumb: "Settings › Printing", view: "Settings", sg: "printing", ss: "content" },
  { label: "Layout", crumb: "Settings › Printing", view: "Settings", sg: "printing", ss: "layout" },
  { label: "Auto-print", crumb: "Settings › Printing", view: "Settings", sg: "printing", ss: "auto" },
  { label: "Order types", crumb: "Settings › Ordering", view: "Settings", sg: "ordering", ss: "types" },
  { label: "Charges", crumb: "Settings › Ordering", view: "Settings", sg: "ordering", ss: "takeaway" },
  { label: "Prebooking", crumb: "Settings › Ordering", view: "Settings", sg: "ordering", ss: "scheduled" },
  { label: "Checkout", crumb: "Settings › Ordering", view: "Settings", sg: "ordering", ss: "checkout" },
  { label: "Delivery", crumb: "Settings › Ordering", view: "Settings", sg: "ordering", ss: "delivery" },
  { label: "Porter & Rapido", crumb: "Settings › Ordering", view: "Settings", sg: "ordering", ss: "bridge" }
];

/**
 * Entries the generator cannot see.
 *
 * Two kinds: labels built from template literals (their text is only known at
 * runtime — "Round the total to the nearest rupee" depends on the currency),
 * and the sub-PAGES that are reached by a button rather than being a tab, so
 * they have no `if (tab === …)` block to be found in.
 */
const EXTRA_ENTRIES: SearchEntry[] = [
  { label: "Round the total", crumb: "Settings › Ordering › Charges", view: "Settings", sg: "ordering", ss: "takeaway" },
  { label: "Round off", crumb: "Settings › Ordering › Charges", view: "Settings", sg: "ordering", ss: "takeaway" },

  // Sub-pages, reached from a button on their tab.
  { label: "Logo & banners", crumb: "Settings › Appearance › Brand", view: "Settings", sg: "storefront", ss: "brand" },
  { label: "Banner carousel", crumb: "Settings › Appearance › Brand", view: "Settings", sg: "storefront", ss: "brand" },
  { label: "Logo tile", crumb: "Settings › Appearance › Brand", view: "Settings", sg: "storefront", ss: "brand" },
  { label: "Select location", crumb: "Settings › Store profile › Address", view: "Settings", sg: "profile", ss: "address" },
  { label: "Set on map", crumb: "Settings › Store profile › Address", view: "Settings", sg: "profile", ss: "address" },
  { label: "Accounts", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Porter", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Rapido", crumb: "Settings › Ordering › Porter & Rapido", view: "Settings", sg: "ordering", ss: "bridge" },
  { label: "Online payment", crumb: "Settings › Payments & tax › Methods", view: "Settings", sg: "payments", ss: "methods" },
  { label: "Cashfree", crumb: "Settings › Payments & tax › Methods", view: "Settings", sg: "payments", ss: "methods" },
  { label: "Razorpay", crumb: "Settings › Payments & tax › Methods", view: "Settings", sg: "payments", ss: "methods" },

  // Screens that own settings of their own, now that those moved off Settings.
  { label: "Loyalty settings", crumb: "Loyalty", view: "Loyalty" },
  { label: "App settings", crumb: "Delivery Boys", view: "Delivery Boys" },
  { label: "Rider QR", crumb: "Delivery Boys › App settings", view: "Delivery Boys" },
];

/** Every sidebar destination, so the palette reaches whole screens too. */
const NAV_ENTRIES: SearchEntry[] = navItems.map((n) => ({
  label: n.label,
  crumb: n.group || "Dashboard",
  view: n.view,
}));

export const SEARCH_ENTRIES: SearchEntry[] = [
  ...NAV_ENTRIES,
  ...SETTINGS_ENTRIES,
  ...EXTRA_ENTRIES,
];

/** view -> the sidebar id that gates it, so an entry can be checked against the
 *  same rule the sidebar uses. "Settings" is absent from navItems on purpose —
 *  it is reached from the sidebar footer and is always available. */
const VIEW_TO_NAV_ID = new Map(navItems.map((n) => [n.view, n.id]));

/**
 * The entries this partner may actually reach.
 *
 * The palette was searching the whole index, so a partner without POS could
 * find "POS", press enter, and be sent to a screen their sidebar deliberately
 * hides — advertising features they have not been given. Gated against the SAME
 * rules the sidebar and Settings use rather than a second list: getNavItemState
 * for whole screens, and the section/tab predicates for anything inside
 * Settings.
 *
 * A Settings entry is dropped when EITHER its section or its tab is hidden —
 * "Prebooking" lives on a tab that only exists with the feature, so gating the
 * section alone would leave the field findable.
 */
export function visibleSearchEntries(
  features: Parameters<typeof getNavItemState>[1],
  userData: unknown,
): SearchEntry[] {
  return SEARCH_ENTRIES.filter((e) => {
    if (e.sg) {
      return (
        settingsSectionVisible(e.sg, features) &&
        settingsTabVisible(e.sg, e.ss, features)
      );
    }
    const navId = VIEW_TO_NAV_ID.get(e.view);
    // No nav id means it is not a gated destination (Settings, and the handful
    // of entries that point at a screen's own sub-page).
    if (!navId) return true;
    return getNavItemState(navId, features, userData) !== "hidden";
  });
}

/**
 * Rank entries against a query.
 *
 * Deliberately simple: a case-insensitive substring match, scored so a prefix
 * beats a mid-word hit and a shorter label beats a longer one. Fuzzy matching
 * sounds better than it reads here — with 100+ near-identical setting names it
 * mostly produces confident nonsense.
 */
export function searchEntries(
  query: string,
  /** Pre-filtered by visibleSearchEntries — the palette must never rank an
   *  entry the partner cannot open. */
  entries: SearchEntry[] = SEARCH_ENTRIES,
  limit = 12,
): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of entries) {
    const hay = e.label.toLowerCase();
    const at = hay.indexOf(q);
    if (at === -1) {
      // Fall back to the breadcrumb so "printing" also finds the fields under it.
      if (!e.crumb.toLowerCase().includes(q)) continue;
      scored.push({ e, score: 400 + e.label.length });
      continue;
    }
    scored.push({ e, score: (at === 0 ? 0 : 100 + at) + e.label.length });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => s.e);
}

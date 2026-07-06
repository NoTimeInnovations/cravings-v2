import plansData from "@/data/plans.json";

// Canonical defaults applied to every newly created partner, regardless of
// signup path (self-serve onboarding, super-admin manual, Petpooja). Centralised
// here so the creation paths can't drift apart again.
//
// - menuStyle "v3"    → storefront layout (HotelMenuPage_v2 renders the V3 style)
// - checkoutStyle "v2" → PlaceOrderModalV2 in the order drawer
// - feature_flags      → ordering + delivery enabled out of the box
//
// The partners.theme column is read with `typeof theme === "string" ? JSON.parse(theme) : theme`
// across the storefront, so both a JSON string and a JSON object are valid. Paths
// that already store a stringified theme keep doing so; createPpPartner stores an
// object (its mutation uses `$theme: json!`).

export interface NewPartnerTheme {
  colors: { text: string; bg: string; accent: string };
  menuStyle: string;
  checkoutStyle: "default" | "v2";
  [key: string]: unknown;
}

// New partners default to the "Charcoal Noir" brand colour.
export const NEW_PARTNER_BRAND_COLOR = "charcoal-noir";

export const NEW_PARTNER_THEME: NewPartnerTheme = {
  colors: { accent: "#E9701B", bg: "#ffffff", text: "#000000" },
  brandColor: NEW_PARTNER_BRAND_COLOR,
  menuStyle: "v3",
  checkoutStyle: "v2",
};

// ordering + delivery + newonboarding + whatsappOrdering enabled; storefront access-only.
// Mirrors the 30-day-trial policy — see memory/new-partner-trial-defaults.md
export const NEW_PARTNER_FEATURE_FLAGS =
  "ordering-true,delivery-true,storefront-false,newonboarding-true,whatsappOrdering-true";

// Stringified theme for the partners.theme column (used by paths that store a JSON string).
export const NEW_PARTNER_THEME_STRING = JSON.stringify(NEW_PARTNER_THEME);

// Canonical trial subscription for EVERY new partner — the single source of truth
// used by all creation paths (self-serve signup, get-started wizard, Google
// quick-signup, Create Petpooja Partner) so they can't drift. India → the
// order-capped 100-order free trial (in_trial_100; no date expiry, gated on order
// usage). International → the 30-day date trial (intl_trial_30d).
export const buildNewPartnerTrialSubscription = (country?: string) => {
  const isIndia = (country || "").trim().toLowerCase() === "india";
  const planId = isIndia ? "in_trial_100" : "intl_trial_30d";
  const planArray = isIndia
    ? (plansData as any).india
    : (plansData as any).international;
  const plan = planArray.find((p: any) => p.id === planId);
  const now = new Date();
  const expiryDate = isIndia
    ? null
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    plan,
    status: "active" as const,
    startDate: now.toISOString(),
    expiryDate,
  };
};

// Default delivery pricing + service windows for every new partner.
// "first 4 km ₹40, then ₹10 per additional km" → first_km_range {km:4, rate:40}
// plus the separate partners.delivery_rate column (= per-additional-km rate).
// Delivery & takeaway both run all day (00:00–23:59) by default. The partner can
// change all of this in Settings → Delivery.
export const NEW_PARTNER_DELIVERY_RATE = 10;

export const NEW_PARTNER_DELIVERY_RULES = {
  delivery_radius: 5,
  delivery_mode: "basic" as const,
  first_km_range: { km: 4, rate: 40 },
  delivery_ranges: [] as { from_km: number; to_km: number; rate: number }[],
  is_fixed_rate: false,
  minimum_order_amount: 0,
  delivery_time_allowed: { from: "00:00", to: "23:59" },
  takeaway_time_allowed: { from: "00:00", to: "23:59" },
  isDeliveryActive: true,
  needDeliveryLocation: true,
};

// Returns the delivery_rules to persist for a new partner: keeps the caller's
// rules only if they're already in the canonical shape (a real pricing tier or
// service window), otherwise falls back to the defaults above. Current signup
// paths pass a non-canonical `{ rules: [] }`, so they get the defaults.
export const resolveNewPartnerDeliveryRules = (incoming?: any) => {
  const hasCanonical =
    incoming &&
    (incoming.first_km_range ||
      (Array.isArray(incoming.delivery_ranges) &&
        incoming.delivery_ranges.length > 0) ||
      incoming.delivery_time_allowed ||
      incoming.takeaway_time_allowed);
  return hasCanonical ? incoming : NEW_PARTNER_DELIVERY_RULES;
};

// Force the new-partner menuStyle/checkoutStyle while preserving any colours/font
// the caller already chose (e.g. the get-started wizard or a Google-signup brand
// colour). Accepts the caller's theme as a JSON string or object; returns a JSON
// string for the partners.theme column.
export const applyNewPartnerThemeDefaults = (
  existing?: string | Record<string, unknown> | null,
): string => {
  let parsed: Record<string, unknown> = {};
  if (typeof existing === "string") {
    try {
      parsed = JSON.parse(existing);
    } catch {
      /* malformed — fall back to defaults */
    }
  } else if (existing && typeof existing === "object") {
    parsed = existing as Record<string, unknown>;
  }
  const parsedColors = (parsed.colors as Record<string, unknown>) ?? {};
  return JSON.stringify({
    ...parsed,
    colors: { ...NEW_PARTNER_THEME.colors, ...parsedColors },
    // Keep a brand colour the caller already chose (e.g. Google-signup pick),
    // otherwise default new partners to Charcoal Noir.
    brandColor: (parsed.brandColor as string) || NEW_PARTNER_BRAND_COLOR,
    menuStyle: "v3",
    checkoutStyle: "v2",
  });
};

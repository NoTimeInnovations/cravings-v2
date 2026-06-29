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

export const NEW_PARTNER_THEME: NewPartnerTheme = {
  colors: { accent: "#E9701B", bg: "#ffffff", text: "#000000" },
  menuStyle: "v3",
  checkoutStyle: "v2",
};

// ordering + delivery + newonboarding + whatsappOrdering enabled; storefront access-only.
// Mirrors the 30-day-trial policy — see memory/new-partner-trial-defaults.md
export const NEW_PARTNER_FEATURE_FLAGS =
  "ordering-true,delivery-true,storefront-false,newonboarding-true,whatsappOrdering-true";

// Stringified theme for the partners.theme column (used by paths that store a JSON string).
export const NEW_PARTNER_THEME_STRING = JSON.stringify(NEW_PARTNER_THEME);

// Default delivery pricing + service windows for every new partner.
// "first 4 km ₹40, then ₹10 per additional km" → first_km_range {km:4, rate:40}
// plus the separate partners.delivery_rate column (= per-additional-km rate).
// Delivery & takeaway both run 10:00–22:00 by default. The partner can change
// all of this in Settings → Delivery.
export const NEW_PARTNER_DELIVERY_RATE = 10;

export const NEW_PARTNER_DELIVERY_RULES = {
  delivery_radius: 5,
  delivery_mode: "basic" as const,
  first_km_range: { km: 4, rate: 40 },
  delivery_ranges: [] as { from_km: number; to_km: number; rate: number }[],
  is_fixed_rate: false,
  minimum_order_amount: 0,
  delivery_time_allowed: { from: "10:00", to: "22:00" },
  takeaway_time_allowed: { from: "10:00", to: "22:00" },
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
    menuStyle: "v3",
    checkoutStyle: "v2",
  });
};

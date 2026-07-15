// Client-side GTM dataLayer ecommerce events (GA4 schema). Pushes to the global
// window.dataLayer that each partner's own GTM container (PartnerGtm, Phase 1)
// reads, so the partner can forward menu/cart/checkout/purchase data to GA4,
// Meta Pixel, Ads, etc. via their own GTM tags. Framework-free so BOTH the
// zustand order store and React components can import it. No-op on the server.

import currencies from "@/data/currencies.json";
import { currencyIsoFromSymbol } from "@/lib/currencyDisplay";

export type EcommerceItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  index?: number;
};

export type EcommercePayload = {
  currency?: string;
  value?: number;
  transaction_id?: string;
  coupon?: string;
  payment_type?: string;
  tax?: number;
  shipping?: number;
  item_list_id?: string;
  item_list_name?: string;
  items: EcommerceItem[];
};

// Partner.currency stores a display SYMBOL (₹ / $ / AED / €), but GA4 ecommerce
// wants an ISO-4217 code. currencies.json is [{ label: "INR", value: "₹" }, …] —
// label is the ISO code, value the symbol — so reverse it. Falls back to INR
// (also for the "🚫" hide-price sentinel and unknown symbols).
const SYMBOL_TO_CODE: Record<string, string> = Object.fromEntries(
  (currencies as { label: string; value: string }[]).map((c) => [c.value, c.label]),
);

export function resolveCurrencyCode(symbol?: string | null): string {
  if (!symbol || symbol === "🚫") return "INR";
  // Prefer the bundled reverse map, then the full native-symbol resolver (which
  // also handles short native glyphs like "ر.ق" / "د.إ" and bare ISO codes).
  return SYMBOL_TO_CODE[symbol] ?? currencyIsoFromSymbol(symbol) ?? "INR";
}

// A menu item's category may be a Hasura relationship object ({ id, name }) or a
// plain string depending on the source — normalize to the name string.
export function categoryName(category: unknown): string | undefined {
  if (!category) return undefined;
  if (typeof category === "string") return category;
  if (typeof category === "object" && category !== null && "name" in category) {
    const name = (category as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
}

// Strip the variant suffix from a cart line id (`${id}|${variant}` → `${id}`).
export function baseItemId(id?: string | null): string {
  return String(id ?? "").split("|")[0];
}

export function pushEcommerceEvent(event: string, ecommerce: EcommercePayload): void {
  if (typeof window === "undefined") return; // SSR-safe
  try {
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || []; // queue survives if GTM loads afterwards
    w.dataLayer.push({ ecommerce: null }); // GA4: clear the previous ecommerce object
    w.dataLayer.push({ event, ecommerce });
  } catch {
    /* analytics must never break a user flow */
  }
}

// Fire a GTM `purchase` at most ONCE per order id. The dedicated localStorage key
// survives the Cashfree redirect remount + webhook/cron race (never reuse
// "last-order-id"). Pass the order id as the transaction_id.
export function pushPurchaseOnce(
  orderId: string | null | undefined,
  ecommerce: Omit<EcommercePayload, "transaction_id">,
): void {
  if (!orderId || typeof window === "undefined") return;
  const key = `gtm-purchase-fired:${orderId}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    /* storage unavailable — still fire once for this mount */
  }
  pushEcommerceEvent("purchase", { ...ecommerce, transaction_id: orderId });
}

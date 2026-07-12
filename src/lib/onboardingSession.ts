import { getFeatures } from "@/lib/getFeatures";
import { parseOrderTypesEnabled } from "@/lib/prebooking";

/**
 * Session-scoped ordering choice — lets the storefront skip re-asking
 * delivery/takeaway on every reload within the same browser session.
 *
 * Source of truth is a SESSION cookie (`order_type_session`, no expiry → cleared
 * when the browser closes) so it is readable BOTH on the server (to avoid the
 * onboarding overlay flashing in the SSR HTML) and on the client. A brand-new
 * visit or a fresh browser still shows the picker. Brand-parent outlet pages and
 * QR/dine-in (tableNumber !== 0) are never auto-skipped.
 *
 * The delivery address is persisted separately (zustand `order-storage` on the
 * client, `onboarding_data` cookie on the server), so a delivery choice is only
 * auto-skipped when a saved address is also present.
 */

export type SessionOrderType = "delivery" | "takeaway";

const COOKIE_NAME = "order_type_session";

function parseTypeMap(raw?: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw)) as Record<string, string>;
  } catch {
    return {};
  }
}

function readCookieMap(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`),
  );
  return parseTypeMap(match?.[1]);
}

/** Read the session order type (client-side, from the session cookie). */
export function getSessionOrderType(
  partnerId?: string | null,
): SessionOrderType | null {
  if (typeof document === "undefined" || !partnerId) return null;
  const v = readCookieMap()[partnerId];
  return v === "delivery" || v === "takeaway" ? v : null;
}

/** Persist the session order type (client-side, as a browser-session cookie). */
export function setSessionOrderType(
  partnerId: string,
  type: SessionOrderType,
): void {
  if (typeof document === "undefined" || !partnerId) return;
  const all = readCookieMap();
  all[partnerId] = type;
  // No `expires`/`max-age` → this is a session cookie: it lives until the
  // browser is closed, which matches the per-session UX we want.
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(all),
  )}; path=/; samesite=lax`;
}

/** Clear the session order type for a partner (e.g. after an order is placed,
 * so a fresh ordering session re-asks). */
export function clearSessionOrderType(partnerId: string): void {
  if (typeof document === "undefined" || !partnerId) return;
  const all = readCookieMap();
  if (!(partnerId in all)) return;
  delete all[partnerId];
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(all),
  )}; path=/; samesite=lax`;
}

/** Parse the session order type out of a raw cookie value (server-side). */
export function getSessionOrderTypeFromCookie(
  rawCookieValue: string | null | undefined,
  partnerId: string,
): SessionOrderType | null {
  const v = parseTypeMap(rawCookieValue)[partnerId];
  return v === "delivery" || v === "takeaway" ? v : null;
}

export const SESSION_ORDER_TYPE_COOKIE = COOKIE_NAME;

/**
 * True when a usable delivery address is already saved on the client — either in
 * the persisted order store (userAddress + coordinates) or the onboarding cache.
 */
function hasSavedDeliveryAddressClient(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("order-storage");
    if (raw) {
      const state = JSON.parse(raw)?.state;
      if (state?.userAddress && state?.coordinates) return true;
    }
  } catch {}
  try {
    const raw = localStorage.getItem("onboarding_address");
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved?.address && saved?.coords) return true;
    }
  } catch {}
  return false;
}

/**
 * Pure decision shared by server and client: can the onboarding order-type
 * screen be skipped this reload? Re-validates that the chosen type is still
 * offered, so a partner disabling delivery/takeaway won't silently lock a
 * returning customer into it.
 */
export function evaluateSkipOnboarding(opts: {
  sessionOrderType: SessionOrderType | null;
  hasSavedDeliveryAddress: boolean;
  featureFlags?: string | null;
  orderTypesEnabled?: unknown;
  tableNumber: number;
  isBrandParent: boolean;
}): boolean {
  const {
    sessionOrderType,
    hasSavedDeliveryAddress,
    featureFlags,
    orderTypesEnabled,
    tableNumber,
    isBrandParent,
  } = opts;
  // QR/dine-in and brand-parent (outlet picker) flows are never auto-skipped.
  if (tableNumber !== 0 || isBrandParent) return false;
  if (!sessionOrderType) return false;

  const features = getFeatures(featureFlags || "");
  const offered = parseOrderTypesEnabled(orderTypesEnabled);
  const hasDelivery = features.delivery.enabled && offered.delivery;
  const hasTakeaway = features.ordering.enabled && offered.takeaway;

  if (sessionOrderType === "delivery") {
    return hasDelivery && hasSavedDeliveryAddress;
  }
  return hasTakeaway; // takeaway
}

/**
 * Client-side convenience wrapper: reads the session cookie + saved address and
 * evaluates the skip. Used as a fallback so client navigations (no fresh server
 * render) also skip correctly.
 */
export function canSkipOnboarding(opts: {
  partnerId?: string | null;
  featureFlags?: string | null;
  orderTypesEnabled?: unknown;
  tableNumber: number;
  isBrandParent: boolean;
}): boolean {
  if (typeof window === "undefined") return false;
  return evaluateSkipOnboarding({
    sessionOrderType: getSessionOrderType(opts.partnerId),
    hasSavedDeliveryAddress: hasSavedDeliveryAddressClient(),
    featureFlags: opts.featureFlags,
    orderTypesEnabled: opts.orderTypesEnabled,
    tableNumber: opts.tableNumber,
    isBrandParent: opts.isBrandParent,
  });
}

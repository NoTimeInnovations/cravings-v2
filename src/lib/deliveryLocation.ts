/**
 * The customer's last-used delivery location, saved per partner on the device.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * Picking a delivery location used to survive only in memory. OnboardingFlow
 * restores `onboarding_data` (a server cookie) into the order store on EVERY
 * mount, but the pickers that let you change the location afterwards — the
 * "DELIVER TO" bar in LocationHeader, and the address sheets in the V3/V4/V5
 * layouts — never wrote that cookie. So the sequence was:
 *
 *   pick a new address  ->  order store updated, cookie untouched
 *   reload              ->  OnboardingFlow replays the OLD cookie address over it
 *
 * which reads to the customer as "it keeps changing my location". The order
 * store IS persisted, so the data was not lost — it was being overwritten by a
 * staler source a moment after hydration.
 *
 * The fix is that every picker now commits through here, and the restore path
 * prefers this record. localStorage rather than the cookie is what the restore
 * reads first because it is SYNCHRONOUS: the cookie needs a server-action round
 * trip, and the address would visibly flip once it landed.
 *
 * Per partner, not global: a customer ordering from two restaurants has a
 * different delivery address for each, and one bleeding into the other would
 * silently send food to the wrong door.
 */

export interface SavedDeliveryLocation {
  address: string;
  coords: { lat: number; lng: number } | null;
  /** epoch ms — lets a caller prefer the fresher of two records. */
  savedAt: number;
}

const keyFor = (partnerId: string) => `last-delivery-location:${partnerId}`;

/** Remember the location the customer just chose. Never throws (private mode). */
export function saveLastDeliveryLocation(
  partnerId: string | null | undefined,
  address: string | null | undefined,
  coords: { lat: number; lng: number } | null | undefined,
): void {
  if (!partnerId || typeof window === "undefined") return;
  const addr = (address || "").trim();
  // An empty address with no coords is a CLEAR, not a location — writing it
  // would let "change address" wipe the record and reopen the same bug.
  if (!addr && !coords) return;
  try {
    const payload: SavedDeliveryLocation = {
      address: addr,
      coords: coords ?? null,
      savedAt: Date.now(),
    };
    localStorage.setItem(keyFor(partnerId), JSON.stringify(payload));
  } catch {
    /* private mode / quota — the cookie is still written by the caller */
  }
}

/** The last location chosen for this partner, or null. Never throws. */
export function readLastDeliveryLocation(
  partnerId: string | null | undefined,
): SavedDeliveryLocation | null {
  if (!partnerId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(partnerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedDeliveryLocation>;
    const address = typeof parsed?.address === "string" ? parsed.address : "";
    const c = parsed?.coords;
    const coords =
      c && typeof c.lat === "number" && typeof c.lng === "number"
        ? { lat: c.lat, lng: c.lng }
        : null;
    if (!address && !coords) return null;
    return { address, coords, savedAt: Number(parsed?.savedAt) || 0 };
  } catch {
    return null;
  }
}

/** Forget it — used when the customer explicitly clears their address. */
export function clearLastDeliveryLocation(partnerId: string | null | undefined): void {
  if (!partnerId || typeof window === "undefined") return;
  try {
    localStorage.removeItem(keyFor(partnerId));
  } catch {
    /* ignore */
  }
}

/**
 * Fired by the delivery-location confirm sheet when the customer taps "Change".
 * LocationHeader listens and opens its picker, so the sheet does not need a
 * reference to a component that may live in a different layout subtree.
 */
export const OPEN_LOCATION_PICKER_EVENT = "open-location-picker";

export function requestLocationPicker(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_LOCATION_PICKER_EVENT));
}

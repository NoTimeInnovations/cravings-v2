import type { SavedAddress } from "@/components/hotelDetail/placeOrder/AddressManagementModal";

// Saved delivery addresses are persisted locally (so they survive even for
// guests / when the DB save fails) and mirrored to the user's DB record when
// logged in. The list is always kept newest-first via `savedAt`.
const KEY = "cravings-saved-addresses";

export function getLocalAddresses(): SavedAddress[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? sortNewestFirst(arr) : [];
  } catch {
    return [];
  }
}

export function setLocalAddresses(list: SavedAddress[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sortNewestFirst(list)));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

// Two addresses are "the same" if they share an id or sit on the same point.
function isSame(a: SavedAddress, b: SavedAddress): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  return (
    a.latitude != null &&
    b.latitude != null &&
    a.longitude != null &&
    b.longitude != null &&
    Math.abs(a.latitude - b.latitude) < 1e-6 &&
    Math.abs(a.longitude - b.longitude) < 1e-6
  );
}

export function sortNewestFirst(list: SavedAddress[]): SavedAddress[] {
  return [...list].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

/** Prepend/refresh an address as the latest and return the new full list. */
export function upsertLocalAddress(
  addr: SavedAddress,
  now: number,
): SavedAddress[] {
  const stamped = { ...addr, savedAt: now };
  const rest = getLocalAddresses().filter((a) => !isSame(a, stamped));
  const list = [stamped, ...rest];
  setLocalAddresses(list);
  return list;
}

export function removeLocalAddress(id: string): SavedAddress[] {
  const list = getLocalAddresses().filter((a) => a.id !== id);
  setLocalAddresses(list);
  return list;
}

/** Merge DB + local, dedupe, newest-first. Used to reconcile on open. */
export function mergeAddresses(
  local: SavedAddress[],
  db: SavedAddress[],
): SavedAddress[] {
  const out: SavedAddress[] = [];
  for (const a of [...local, ...db]) {
    const existing = out.find((b) => isSame(a, b));
    if (!existing) {
      out.push({ ...a }); // clone so we never mutate input/state objects
    } else if ((a.savedAt || 0) > (existing.savedAt || 0)) {
      // A newer copy of the same place — take its fields (e.g. a "Home" label
      // replacing an earlier auto-saved "Other").
      Object.assign(existing, a);
    }
  }
  return sortNewestFirst(out);
}

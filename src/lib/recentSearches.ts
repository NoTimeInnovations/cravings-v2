// Recently-searched delivery locations, persisted in localStorage so they can
// be shown again later (Swiggy-style "Recently searched"). The `name` is the
// specific place name (e.g. "Chittur Kavu") and `address` is the sub-address.
export type RecentSearch = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  timestamp: number;
};

const KEY = "recent-address-searches";
const MAX = 8;

export function getRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return (arr as RecentSearch[]).sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
    );
  } catch {
    return [];
  }
}

export function saveRecentSearch(item: RecentSearch): void {
  try {
    const existing = getRecentSearches().filter(
      (r) =>
        r.placeId !== item.placeId &&
        !(r.name === item.name && r.address === item.address),
    );
    const list = [item, ...existing].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export function removeRecentSearch(placeId: string): RecentSearch[] {
  const list = getRecentSearches().filter((r) => r.placeId !== placeId);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list;
}

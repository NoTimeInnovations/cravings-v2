// Shared matcher for the customer menu item search, used by every storefront
// layout's search overlay so search behaves identically everywhere:
//   • Default / Sidebar   → SearchMenu.tsx
//   • Compact             → styles/Compact/SearchItems.tsx
//   • V3 / V4 / V5        → styles/V3/V3SearchItems.tsx
//
// Matching rules (a deliberate upgrade over the old per-layout logic, which was
// either name-only word-prefix, or a single whole-query substring):
//   • the query is split into words and EVERY word must match (AND), so
//     "choc cake" finds "Chocolate Cake" even though that isn't one substring.
//   • each word is matched as a SUBSTRING (not a word prefix), so "milk" finds
//     "Buttermilk" and "cream" finds "Icecream".
//   • the haystack spans name, secondary name, description, category, variant
//     names and tags — so an item is findable by any of those. Category names
//     are stored lowercase_underscore, so underscores are treated as spaces.

export function menuItemMatchesQuery(item: any, query: string): boolean {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  if (!item) return false;

  const parts: unknown[] = [
    item.name,
    item.name_secondary,
    item.description,
    item.category?.name,
    ...(Array.isArray(item.variants)
      ? item.variants.map((v: any) => v?.name)
      : []),
    ...(Array.isArray(item.tags) ? item.tags : []),
  ];

  const hay = parts
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .join(" ")
    .toLowerCase()
    .replace(/_/g, " ");

  return q.split(/\s+/).every((w) => hay.includes(w));
}

export function filterMenuByQuery<T = any>(menu: T[], query: string): T[] {
  if (!(query || "").trim()) return menu;
  return (menu || []).filter((item) => menuItemMatchesQuery(item, query));
}

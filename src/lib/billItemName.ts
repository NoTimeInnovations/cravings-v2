// Helper for the "Include category name with item name" bill-printing toggle
// (partners.delivery_rules.bill_include_category_name). When enabled, the item
// names logged for /bill and /kot printing are prefixed with the item's
// category so the printed bill / KOT reads e.g. "Biryani - Chicken Biryani".

// Category names are stored lowercase_underscore; format them for display the
// same way formatDisplayName (categoryStore_hasura) does — inlined here so the
// print pages don't pull the whole category store.
const formatCategory = (name: string): string =>
  name
    .split("_")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");

/**
 * Reads the bill_include_category_name flag off a partner's delivery_rules,
 * tolerating the value being either a parsed object or a stringified JSON blob
 * (delivery_rules is sometimes stored stringified). Returns false on anything
 * unparseable / missing.
 */
export function isBillCategoryNameEnabled(deliveryRules: any): boolean {
  if (!deliveryRules) return false;
  let rules = deliveryRules;
  if (typeof rules === "string") {
    try {
      rules = JSON.parse(rules);
    } catch {
      return false;
    }
  }
  return !!rules?.bill_include_category_name;
}

/**
 * Returns a shallow copy of `items` with each item's `name` prefixed by its
 * (display-formatted) category, e.g. "Biryani - Chicken Biryani". Items with no
 * category are left as-is. When `enabled` is false (or `items` isn't an array)
 * the input is returned untouched — never mutated.
 */
export function withCategoryInName<T extends { name?: string; category?: string }>(
  items: T[],
  enabled: boolean,
): T[] {
  if (!enabled || !Array.isArray(items)) return items;
  return items.map((it) => {
    const cat = (it?.category || "").trim();
    if (!cat) return it;
    return { ...it, name: `${formatCategory(cat)} - ${it.name ?? ""}` };
  });
}

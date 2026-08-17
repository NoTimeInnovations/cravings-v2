/**
 * TWO-LEVEL MENU CATEGORIES — a category may have one parent, and that's it.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * A mess/tiffin partner sells nine variations of each package (BASIC/STANDARD/
 * PREMIUM x 7/6/5 days). As flat categories that is four rails' worth of chips
 * competing with their real food. What they want is one "Mess" chip that opens
 * into "3 Times", "Lunch Only", "Breakfast & Lunch", "Lunch & Dinner".
 *
 * ── The shape ────────────────────────────────────────────────────────────────
 *
 * The rail keeps showing TOP-LEVEL entries only. Selecting a parent renders its
 * items grouped under one section header per child — reusing the per-category
 * header every layout already draws, rather than introducing a second rail that
 * seven separate layouts would each have to implement and keep in sync.
 *
 * ── The invariant that keeps this safe ───────────────────────────────────────
 *
 * When NO category has a parent, every function here degrades to exactly
 * today's flat behaviour. That is what lets the feature ship one layout at a
 * time: an unconverted layout keeps treating children as ordinary categories,
 * which is precisely how it behaves now. There is no half-migrated state in
 * which a storefront renders something wrong.
 *
 * Depth is capped at two on purpose. Deeper nesting multiplies across seven
 * bespoke category rails for a case nobody has asked for.
 */

/** The minimum a category must carry for the tree to be built. */
export interface TreeCategory {
  id: string;
  name: string;
  priority?: number;
  is_active?: boolean;
  parent_id?: string | null;
  parent?: { id: string; name: string; priority?: number; is_active?: boolean } | null;
}

/** Anything with a category attached — a menu item, in practice. */
export interface CategorisedItem {
  category?: TreeCategory | null;
  [key: string]: unknown;
}

export interface CategoryNode {
  id: string;
  name: string;
  priority: number;
  /** Empty for a leaf/top-level category with no children. */
  children: CategoryNode[];
}

const prio = (c: { priority?: number } | null | undefined) => c?.priority ?? 0;
const byPriority = <T extends { priority?: number; name?: string }>(a: T, b: T) =>
  prio(a) - prio(b) || String(a.name ?? "").localeCompare(String(b.name ?? ""));

/**
 * Collect every category reachable from a list of items, INCLUDING parents that
 * own no items themselves.
 *
 * A parent is normally empty — its children hold the items — so it appears only
 * as `item.category.parent`. Reading the storefront's item list alone would
 * therefore lose exactly the categories the rail needs to show. Pass
 * `extraCategories` (e.g. from `fetchCategoryTree`) when a definitive list is
 * available; items alone are enough for the storefront.
 */
export function collectCategories(
  items: CategorisedItem[],
  extraCategories: TreeCategory[] = [],
): TreeCategory[] {
  const byId = new Map<string, TreeCategory>();

  const put = (c: TreeCategory | null | undefined) => {
    if (!c?.id) return;
    const existing = byId.get(c.id);
    // Prefer the richer record: a category seen via `item.category` carries
    // parent_id, while the same one seen via someone's `.parent` may not.
    if (!existing || (c.parent_id !== undefined && existing.parent_id === undefined)) {
      byId.set(c.id, { ...existing, ...c });
    }
  };

  for (const it of items) {
    put(it.category);
    put(it.category?.parent ?? null);
  }
  for (const c of extraCategories) put(c);

  return [...byId.values()];
}

/** True when this partner uses subcategories at all. */
export function hasSubcategories(categories: TreeCategory[]): boolean {
  const ids = new Set(categories.map((c) => c.id));
  return categories.some((c) => !!c.parent_id && ids.has(c.parent_id));
}

/**
 * Build the two-level tree.
 *
 * A child whose parent is missing from the list (deleted, inactive, or filtered
 * out by a category filter) is promoted to top level rather than dropped — an
 * item the customer can buy must never become unreachable because of a bad
 * parent reference.
 */
export function buildCategoryTree(categories: TreeCategory[]): CategoryNode[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const nodes = new Map<string, CategoryNode>();

  const nodeFor = (c: TreeCategory): CategoryNode => {
    let n = nodes.get(c.id);
    if (!n) {
      n = { id: c.id, name: c.name, priority: prio(c), children: [] };
      nodes.set(c.id, n);
    }
    return n;
  };

  const roots: CategoryNode[] = [];
  for (const c of categories) {
    const node = nodeFor(c);
    const parent = c.parent_id ? byId.get(c.parent_id) : null;
    // Guard against a self-reference or a parent that is itself a child; the
    // schema permits both, and either would produce an infinite render.
    const parentIsValid = !!parent && parent.id !== c.id && !parent.parent_id;
    if (parentIsValid) nodeFor(parent!).children.push(node);
    else roots.push(node);
  }

  for (const n of nodes.values()) n.children.sort(byPriority);
  return roots.sort(byPriority);
}

/**
 * The entries the category rail should show: top-level categories only.
 * With no subcategories anywhere this is just the flat list, in priority order.
 */
export function topLevelCategories(categories: TreeCategory[]): CategoryNode[] {
  return buildCategoryTree(categories);
}

export interface CategorySection<T> {
  /** The child category, or the parent itself for items filed directly on it. */
  category: CategoryNode;
  items: T[];
}

/**
 * Items belonging to `node`, split into one section per child.
 *
 * For a leaf this returns a single section — identical to today's rendering.
 * For a parent it returns one section per child, in the child's priority order,
 * with any items filed directly on the parent first so they can't go missing.
 * Empty sections are dropped, so a child with nothing in it draws no header.
 */
export function sectionsForCategory<T extends CategorisedItem>(
  node: CategoryNode,
  items: T[],
): CategorySection<T>[] {
  const own = items.filter((i) => i.category?.id === node.id);

  if (!node.children.length) {
    return own.length ? [{ category: node, items: own }] : [];
  }

  const sections: CategorySection<T>[] = [];
  if (own.length) sections.push({ category: node, items: own });
  for (const child of node.children) {
    const childItems = items.filter((i) => i.category?.id === child.id);
    if (childItems.length) sections.push({ category: child, items: childItems });
  }
  return sections;
}

/** Every category id under `node`, itself included — for filtering an item list. */
export function categoryIdsUnder(node: CategoryNode): string[] {
  return [node.id, ...node.children.map((c) => c.id)];
}

/**
 * May `categoryId` be given children?
 *
 * Only a top-level category can, which is what caps the tree at two levels —
 * enforced here rather than in the database so the admin UI can grey the option
 * out and explain itself instead of failing on save.
 */
export function canBeParent(categoryId: string, categories: TreeCategory[]): boolean {
  const c = categories.find((x) => x.id === categoryId);
  return !!c && !c.parent_id;
}

/**
 * May `categoryId` be moved under `parentId`?
 * Rejects self-parenting, and any parent that is itself a child.
 */
export function canSetParent(
  categoryId: string,
  parentId: string | null,
  categories: TreeCategory[],
): { ok: true } | { ok: false; reason: string } {
  if (!parentId) return { ok: true }; // promoting to top level is always fine
  if (parentId === categoryId) return { ok: false, reason: "A category can't be its own parent." };

  const parent = categories.find((c) => c.id === parentId);
  if (!parent) return { ok: false, reason: "That parent category no longer exists." };
  if (parent.parent_id) {
    return { ok: false, reason: `"${parent.name}" is already a subcategory — menus are only two levels deep.` };
  }

  const hasChildren = categories.some((c) => c.parent_id === categoryId);
  if (hasChildren) {
    return { ok: false, reason: "This category has subcategories of its own, so it can't become one." };
  }
  return { ok: true };
}

// What a set of applied discounts is worth, together.
//
// Online checkout used to hold exactly ONE discount, so "what is this worth"
// was a single expression inlined in each modal. Stacking makes that a sum with
// rules, and getting the sum wrong means charging the wrong amount — so the
// arithmetic lives here and both checkouts (and the order store) call in.
//
// The one distinction everything rests on:
//
//   MONEY OFF   percentage / flat rewards. Reduces the bill, so it is capped by
//               the DISCOUNTABLE base — the part of the cart not already sold
//               at an offer price. Stacked percentages therefore cannot exceed
//               100% of that base, because the total is clamped to it.
//
//   GIFT VALUE  free items. A gift is a separate item, not a markdown of the
//               lines that earned it, so it is NOT capped by the base (a cart
//               made entirely of offer-priced items can still earn one). Its
//               value is added to the item total and taken straight back off,
//               so the two cancel and the customer pays for their own items.
//
// Keeping them apart is what makes stacking safe: adding a second gift can
// never reduce what the customer pays, and adding a second money-off discount
// can never take the bill below the discountable base.

import {
  baseId,
  bxgyFreebieUnits,
  bxgyGivesFreeItem,
  bxgyRepeatCount,
  bxgyRewardAmount,
  isBxgy,
  parseIdList,
  type BxgyCartLine,
  type BxgyLike,
} from "./bxgy";

export type StackableDiscount = BxgyLike & {
  id?: string | null;
  code?: string | null;
  type?: string | null;
  value?: number | null;
  freebie_item_count?: number | string | null;
  freebie_item_ids?: string | null;
  /** "Specific" narrows the discount to the menu items in `category_item_ids`.
   *  Anything else — including NULL, the back-compat default for every discount
   *  written before scoping existed — means the whole cart. */
  applicable_on?: string | null;
  /** Comma-separated ids of MENU ITEMS and/or CATEGORIES — the admin field is
   *  labelled "Category / Item IDs" and offers "Specific Categories/Items", so
   *  both spaces have to resolve or a category-scoped rule would be refused
   *  outright. Menu/category UUIDs, NOT pp_ids: the sibling column
   *  freebie_item_ids is read as pp_ids by posStore and as UUIDs everywhere
   *  else, and that drift is deliberately not repeated here. */
  category_item_ids?: string | null;
};

export type StackedOne = {
  discount: StackableDiscount;
  /** Reduces the bill. Already capped by this discount's own max_discount_amount. */
  moneyOff: number;
  /** Worth of the free items this discount hands over. Nets to zero on the bill. */
  giftValue: number;
  /** Times a BXGY was earned; 0 for other types. */
  repeat: number;
  /** Units of EACH free item this discount grants. */
  freebieUnits: number;
};

export type StackResult = {
  /** Sum of money-off, clamped to the discountable base. */
  moneyOff: number;
  /** Sum of gift values. Added to the item total AND removed from it. */
  giftValue: number;
  /** What we show as "you save" and persist: money off plus the gifts' worth. */
  savings: number;
  perDiscount: StackedOne[];
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Does this discount hand over free items rather than money off?
 *
 *  Accepts BOTH shapes: a raw Hasura row carries `discount_type`, while the
 *  applied-discount objects the modals build carry `type`. Reading only `type`
 *  silently returned false for every raw row, so callers that gate on a raw row
 *  (the auto-apply filters and the code-apply paths) lost the gift exemption. */
export function givesGift(d: StackableDiscount | null | undefined): boolean {
  if (!d) return false;
  if (isBxgy(d)) return bxgyGivesFreeItem(d as any);
  const kind = d.type ?? (d as any).discount_type;
  return kind === "freebie" && parseIdList(d.freebie_item_ids).length > 0;
}

/**
 * The slice of the cart ONE discount may be computed on when it is scoped to
 * specific menu items — or NULL when it applies to the whole cart.
 *
 * NULL and 0 are NOT interchangeable and callers must not collapse them:
 *   NULL → not scoped, fall back to the shared discountable base.
 *   0    → scoped, and the cart holds none of the listed items. The discount is
 *          worth nothing, which is what the eligibility gates turn into a
 *          "noitems" refusal rather than silently applying a ₹0 discount.
 *
 * `lines` must ALREADY have offer-priced lines removed, for the same reason the
 * shared base does: an offer line's price IS the marked-down price, so
 * discounting it again marks the same item down twice.
 *
 * Matching goes through baseId() so the storefront's `<menuId>|<variant>` and
 * the POS's `<menuId>_custom_…` composite line ids both resolve to the menu
 * item the partner actually picked.
 */
export function scopedBaseFor(
  d: StackableDiscount | null | undefined,
  lines: BxgyCartLine[] | null | undefined,
  /** Resolves a menu item id to the id of the CATEGORY it sits in, so an id
   *  naming a category matches every line under it. Omit it and only item ids
   *  resolve — which would refuse a category-scoped rule outright rather than
   *  merely failing to narrow it. */
  categoryOf?: (menuItemId: string) => string | null | undefined,
): number | null {
  if (d?.applicable_on !== "Specific") return null;
  // BXGY is exempt, deliberately and everywhere. It already carries its own
  // notion of scope in bxgy_buy_item_ids, its reward is resolved against the
  // cart at apply time and written to `value` (see bxgy.ts), and a persisted
  // BXGY row's value is that RESOLVED amount — clamping it later by an item
  // scope would revoke part of a reward the customer was already promised.
  // Returning NULL here keeps the exemption in one place, so the money path,
  // the eligibility gates and the order editors cannot drift apart on it.
  if (isBxgy(d)) return null;
  const wanted = new Set(parseIdList(d.category_item_ids));
  // "Specific" with an empty list is a half-configured rule, not a rule that
  // matches nothing. Treat it as unscoped rather than silently zeroing every
  // discount whose id list failed to save.
  if (wanted.size === 0) return null;
  return (lines ?? []).reduce((sum, l) => {
    const item = baseId(l?.id);
    const cat = categoryOf?.(item);
    const hit = wanted.has(item) || (!!cat && wanted.has(cat));
    return hit ? sum + num(l?.price) * num(l?.quantity) : sum;
  }, 0);
}

/** Worth of the free items one discount grants, at list price. */
function giftValueOf(
  d: StackableDiscount,
  units: number,
  priceOf: (id: string) => number,
): number {
  if (units <= 0) return 0;
  return parseIdList(d.freebie_item_ids).reduce(
    (sum, id) => sum + num(priceOf(id)) * units,
    0,
  );
}

/**
 * Value one discount on its own. `base` is the discountable subtotal.
 *
 * Note the caller is responsible for having already filtered out ineligible
 * discounts — this asks "what is it worth", not "does it apply".
 */
export function valueOne(
  d: StackableDiscount,
  opts: {
    lines: BxgyCartLine[];
    base: number;
    priceOf: (id: string) => number;
    /** `lines` with offer-priced lines removed — what an item-scoped discount is
     *  measured against. Defaults to `lines` when the caller has no offers to
     *  exclude. BXGY deliberately keeps counting the FULL `lines`: its buy
     *  condition is a separate notion of scope (bxgy_buy_item_ids) and a gift is
     *  a separate item, so an offer-priced cart can still earn one. */
    moneyLines?: BxgyCartLine[];
    /** See scopedBaseFor. Lets an id naming a category scope the discount. */
    categoryOf?: (menuItemId: string) => string | null | undefined;
  },
): StackedOne {
  const cap = num(d.max_discount_amount);
  const withCap = (n: number) => (cap > 0 ? Math.min(n, cap) : n);
  // NULL ⇒ not item-scoped, so the whole discountable base is fair game. A
  // number ⇒ scoped, and that IS the ceiling: a rule written against one dish
  // must never reach the rest of the bill.
  const scoped = scopedBaseFor(d, opts.moneyLines ?? opts.lines, opts.categoryOf);
  const moneyBase = scoped ?? opts.base;

  if (isBxgy(d)) {
    const repeat = bxgyRepeatCount(d, opts.lines, opts.base);
    const amount = bxgyRewardAmount(d, {
      repeat,
      base: opts.base,
      priceOf: opts.priceOf,
    });
    if (bxgyGivesFreeItem(d as any)) {
      const units = bxgyFreebieUnits(d, repeat);
      return { discount: d, moneyOff: 0, giftValue: amount, repeat, freebieUnits: units };
    }
    return { discount: d, moneyOff: amount, giftValue: 0, repeat, freebieUnits: 0 };
  }

  if (d.type === "freebie") {
    const units = Math.floor(num(d.freebie_item_count)) || 1;
    return {
      discount: d,
      moneyOff: 0,
      giftValue: withCap(giftValueOf(d, units, opts.priceOf)),
      repeat: 0,
      freebieUnits: units,
    };
  }

  if (d.type === "percentage") {
    return {
      discount: d,
      moneyOff: withCap((moneyBase * num(d.value)) / 100),
      giftValue: 0,
      repeat: 0,
      freebieUnits: 0,
    };
  }

  // flat — a scoped rule cannot hand back more than the items it names are
  // worth. Unscoped keeps taking the value as-is: valueStack already clamps the
  // stack total to the base, and clamping here too would change what a stack of
  // flat discounts is worth today.
  return {
    discount: d,
    moneyOff: withCap(scoped == null ? num(d.value) : Math.min(num(d.value), scoped)),
    giftValue: 0,
    repeat: 0,
    freebieUnits: 0,
  };
}

/**
 * Value a whole stack. Pass ONLY the discounts that currently qualify.
 *
 * The clamp on the total is the guard rail that makes stacking safe: however
 * many money-off discounts are applied, together they can never take more than
 * the discountable part of the cart. Gifts are outside it by design.
 */
export function valueStack(
  discounts: StackableDiscount[] | null | undefined,
  opts: {
    lines: BxgyCartLine[];
    base: number;
    priceOf: (id: string) => number;
    /** See valueOne. Forwarded verbatim so each discount in the stack resolves
     *  its own scope; the clamp below stays on the shared base, which is still a
     *  valid ceiling because a scoped base is a subset of it. */
    moneyLines?: BxgyCartLine[];
    categoryOf?: (menuItemId: string) => string | null | undefined;
  },
): StackResult {
  const perDiscount = (discounts ?? []).map((d) => valueOne(d, opts));
  const rawMoneyOff = perDiscount.reduce((sum, r) => sum + r.moneyOff, 0);
  const giftValue = perDiscount.reduce((sum, r) => sum + r.giftValue, 0);
  const moneyOff = Math.max(0, Math.min(rawMoneyOff, Math.max(0, opts.base)));

  // When the clamp bites, scale each discount's share down with it. The order
  // records one row per discount with its own `savings`, and those rows have to
  // add up to what the customer was actually charged — otherwise a bill built
  // from them disagrees with the total that was taken.
  if (rawMoneyOff > moneyOff && rawMoneyOff > 0) {
    const ratio = moneyOff / rawMoneyOff;
    for (const r of perDiscount) r.moneyOff *= ratio;
  }

  return { moneyOff, giftValue, savings: moneyOff + giftValue, perDiscount };
}

/**
 * Every free item the stack grants, ready to be added to the order as ₹0 lines.
 * `resolve` turns a menu id into whatever line shape the caller needs; ids it
 * cannot resolve are dropped.
 */
export function stackFreebieLines<T>(
  result: StackResult,
  resolve: (menuItemId: string, units: number) => T | null,
): T[] {
  const out: T[] = [];
  for (const r of result.perDiscount) {
    if (r.giftValue <= 0 || r.freebieUnits <= 0) continue;
    for (const id of parseIdList(r.discount.freebie_item_ids)) {
      const line = resolve(id, r.freebieUnits);
      if (line) out.push(line);
    }
  }
  return out;
}

/**
 * May `candidate` join the discounts already applied?
 *
 * Blocks the same discount twice (by id, falling back to code) whatever the
 * partner's setting — stacking means several DIFFERENT offers, never the same
 * one applied repeatedly to walk a bill down.
 */
export function canStack(
  applied: StackableDiscount[] | null | undefined,
  candidate: StackableDiscount,
  stackingEnabled: boolean,
): boolean {
  const list = applied ?? [];
  if (!stackingEnabled) return list.length === 0;
  const key = (d: StackableDiscount) =>
    String(d.id ?? "").trim() || String(d.code ?? "").trim().toUpperCase();
  const k = key(candidate);
  if (!k) return true;
  return !list.some((d) => key(d) === k);
}

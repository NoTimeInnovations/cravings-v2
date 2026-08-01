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

/** Does this discount hand over free items rather than money off? */
export function givesGift(d: StackableDiscount | null | undefined): boolean {
  if (!d) return false;
  if (isBxgy(d)) return bxgyGivesFreeItem(d as any);
  return d.type === "freebie" && parseIdList(d.freebie_item_ids).length > 0;
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
  opts: { lines: BxgyCartLine[]; base: number; priceOf: (id: string) => number },
): StackedOne {
  const cap = num(d.max_discount_amount);
  const withCap = (n: number) => (cap > 0 ? Math.min(n, cap) : n);

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
      moneyOff: withCap((opts.base * num(d.value)) / 100),
      giftValue: 0,
      repeat: 0,
      freebieUnits: 0,
    };
  }

  // flat
  return {
    discount: d,
    moneyOff: withCap(num(d.value)),
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
  opts: { lines: BxgyCartLine[]; base: number; priceOf: (id: string) => number },
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

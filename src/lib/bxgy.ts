// BXGY ("buy X, get Y") — the one place that decides whether a cart earns a
// BXGY discount and what that reward is worth.
//
// Three surfaces price the same discount: the storefront checkout, the POS, and
// orderStore when it persists the order. They previously each re-derived
// percentage/freebie maths from raw columns and drifted (see discountUtils' note
// on max_discount_amount). BXGY has strictly more moving parts — a condition, a
// reward, and a repeat count — so all three call in here instead.
//
// Shape of the thing, as stored on `discounts`:
//
//   CONDITION  bxgy_buy_type = 'items'       → N units drawn from bxgy_buy_item_ids
//                            = 'quantity'    → N units of anything in the cart
//                            = 'order_value' → subtotal ≥ bxgy_buy_value
//   REWARD     bxgy_reward_type = 'flat'       → bxgy_reward_value off
//                               = 'percentage' → bxgy_reward_value % off
//                               = 'freebie'    → freebie_item_ids, freebie_item_count each
//   REPEAT     bxgy_max_repeat — how many times one order may earn it. NULL = 1.

export type BxgyBuyType = "items" | "quantity" | "order_value";
export type BxgyRewardType = "percentage" | "flat" | "freebie";

export const BXGY_BUY_TYPES: BxgyBuyType[] = ["items", "quantity", "order_value"];
export const BXGY_REWARD_TYPES: BxgyRewardType[] = ["percentage", "flat", "freebie"];

/** The BXGY-relevant slice of a discount row. Every field is optional so this
 *  accepts a raw Hasura row, an applied-discount object, or an order's stored
 *  discount blob without any of them needing to be widened. */
export type BxgyLike = {
  bxgy_buy_type?: string | null;
  bxgy_buy_item_ids?: string | null;
  bxgy_buy_quantity?: number | string | null;
  bxgy_buy_value?: number | string | null;
  bxgy_reward_type?: string | null;
  bxgy_reward_value?: number | string | null;
  bxgy_max_repeat?: number | string | null;
  freebie_item_ids?: string | null;
  freebie_item_count?: number | string | null;
  max_discount_amount?: number | string | null;
};

/** A cart line, in the loosest shape all three surfaces can supply. */
export type BxgyCartLine = {
  id?: string | null;
  price?: number | string | null;
  quantity?: number | string | null;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Cart line ids are `<menuItemId>` on the POS but `<menuItemId>|<variant>` on
 *  the storefront. A BXGY condition is written against the menu item, so both
 *  forms have to resolve to the same id. */
const baseId = (id: unknown): string => String(id ?? "").split("|")[0].trim();

export const parseIdList = (csv: string | null | undefined): string[] =>
  (csv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Is this a BXGY discount at all? Everything below returns a zero-ish value for
 *  non-BXGY input, so callers can stay branch-free where that reads better. */
export function isBxgy(d: { discount_type?: string | null; type?: string | null } | null | undefined): boolean {
  return d?.discount_type === "bxgy" || d?.type === "bxgy";
}

/**
 * Does this discount hand over a SEPARATE free item, rather than marking the
 * lines that earned it down?
 *
 * This is the distinction that decides whether an offer-priced cart can earn
 * it. "Item already on offer" excludes a line from the discount base because
 * discounting it again would mark the same item down twice — but a free item is
 * a different item, so buying two momos at their offer price still earns it.
 * A percentage or flat reward IS money off the same bill and stays bounded by
 * the discountable base.
 */
export function bxgyGivesFreeItem(
  d: (BxgyLike & { type?: string | null; discount_type?: string | null }) | null | undefined,
): boolean {
  if (!d || !isBxgy(d)) return false;
  return bxgyRewardType(d) === "freebie" && parseIdList(d.freebie_item_ids).length > 0;
}

export function bxgyBuyType(cfg: BxgyLike | null | undefined): BxgyBuyType {
  const t = cfg?.bxgy_buy_type;
  return BXGY_BUY_TYPES.includes(t as BxgyBuyType) ? (t as BxgyBuyType) : "items";
}

export function bxgyRewardType(cfg: BxgyLike | null | undefined): BxgyRewardType {
  const t = cfg?.bxgy_reward_type;
  return BXGY_REWARD_TYPES.includes(t as BxgyRewardType) ? (t as BxgyRewardType) : "freebie";
}

/** How many times one order may earn the reward. Blank/0/negative all mean once:
 *  a partner who leaves the field empty must never hand out an unbounded number
 *  of free items. */
export function bxgyMaxRepeat(cfg: BxgyLike | null | undefined): number {
  const n = Math.floor(num(cfg?.bxgy_max_repeat));
  return n > 0 ? n : 1;
}

/**
 * How many times this cart satisfies the buy condition, capped at the partner's
 * max repeat. 0 means the cart does not qualify — callers treat that as "this
 * discount does not apply right now", the same way a failed min_order_value does.
 *
 * `subtotal` should be the DISCOUNTABLE subtotal (offer-priced lines excluded)
 * wherever the caller has one, so an all-offer cart cannot earn a reward.
 */
export function bxgyRepeatCount(
  cfg: BxgyLike | null | undefined,
  lines: BxgyCartLine[] | null | undefined,
  subtotal: number,
): number {
  if (!cfg) return 0;
  const cap = bxgyMaxRepeat(cfg);
  const type = bxgyBuyType(cfg);

  if (type === "order_value") {
    const threshold = num(cfg.bxgy_buy_value);
    if (threshold <= 0) return 0;
    return Math.min(cap, Math.floor(num(subtotal) / threshold));
  }

  const needed = Math.floor(num(cfg.bxgy_buy_quantity));
  if (needed <= 0) return 0;

  const rows = lines ?? [];
  let units = 0;
  if (type === "quantity") {
    for (const line of rows) units += num(line?.quantity);
  } else {
    // 'items' — ANY of the listed items counts, measured in units, so 2 of one
    // listed item qualifies exactly as well as 1 each of two of them.
    const wanted = new Set(parseIdList(cfg.bxgy_buy_item_ids));
    if (wanted.size === 0) return 0;
    for (const line of rows) {
      if (wanted.has(baseId(line?.id))) units += num(line?.quantity);
    }
  }

  return Math.min(cap, Math.floor(units / needed));
}

/** Whether the cart currently earns this BXGY discount. */
export function bxgyQualifies(
  cfg: BxgyLike | null | undefined,
  lines: BxgyCartLine[] | null | undefined,
  subtotal: number,
): boolean {
  return bxgyRepeatCount(cfg, lines, subtotal) > 0;
}

/** Units of EACH freebie item the cart has earned — freebie_item_count per
 *  repeat. 0 when the reward is not a freebie or the cart does not qualify. */
export function bxgyFreebieUnits(
  cfg: BxgyLike | null | undefined,
  repeat: number,
): number {
  if (!cfg || bxgyRewardType(cfg) !== "freebie" || repeat <= 0) return 0;
  const per = Math.floor(num(cfg.freebie_item_count));
  return (per > 0 ? per : 1) * repeat;
}

/**
 * What the reward is worth in currency.
 *
 * - flat      → the amount, once per repeat
 * - freebie   → the list price of the free items, once per repeat
 * - percentage→ a share of `base`, applied ONCE regardless of repeat. Stacking a
 *               percentage per repeat compounds into a near-free order (3× 20%
 *               is not 20% three times, it is 60% of the whole bill), so the
 *               repeat count is deliberately not a multiplier here and the form
 *               hides the field for percentage rewards.
 *
 * `base` is the discountable subtotal. `priceOf` resolves a menu item id to its
 * list price — only consulted for freebie rewards.
 *
 * Honours max_discount_amount. Callers still clamp to their own discountable
 * base (see PlaceOrderModalV2), which this cannot see for POS carts.
 */
export function bxgyRewardAmount(
  cfg: BxgyLike | null | undefined,
  opts: {
    repeat: number;
    base: number;
    priceOf?: (menuItemId: string) => number;
  },
): number {
  if (!cfg || opts.repeat <= 0) return 0;
  const reward = bxgyRewardType(cfg);
  let amount = 0;

  if (reward === "percentage") {
    amount = (num(opts.base) * num(cfg.bxgy_reward_value)) / 100;
  } else if (reward === "flat") {
    amount = num(cfg.bxgy_reward_value) * opts.repeat;
  } else {
    const units = bxgyFreebieUnits(cfg, opts.repeat);
    const priceOf = opts.priceOf;
    if (!priceOf || units <= 0) return 0;
    amount = parseIdList(cfg.freebie_item_ids).reduce(
      (sum, id) => sum + num(priceOf(id)) * units,
      0,
    );
  }

  const cap = num(cfg.max_discount_amount);
  if (cap > 0) amount = Math.min(amount, cap);
  return Math.max(0, amount);
}

export type BxgyCopyOpts = {
  currency?: string;
  nameOf?: (menuItemId: string) => string | undefined;
  /**
   * Cap on how many item names to spell out before summarising the rest.
   * A rule drawn against a whole category can name a dozen items, which turns
   * the storefront banner into a wall of text nobody reads. Defaults to 3.
   */
  maxNames?: number;
};

/** "A / B / C +9 more" — keeps a long item list to a readable length. */
function joinNames(names: string[], max = 3): string {
  if (names.length <= max) return names.join(" / ");
  return `${names.slice(0, max).join(" / ")} +${names.length - max} more`;
}

/**
 * What the customer GETS, as a short noun phrase — "Free Oreo Dosa Crepe",
 * "₹50 off", "20% off".
 *
 * Split out from the full sentence because the storefront's discount card puts
 * the reward in a headline slot and the condition in a sub-line beneath, the
 * same way it does for every other discount type. Pushing the whole rule into
 * that headline just truncated it mid-item-name.
 */
export function bxgyRewardLabel(
  cfg: BxgyLike | null | undefined,
  opts: BxgyCopyOpts = {},
): string {
  if (!cfg) return "";
  const currency = opts.currency ?? "₹";
  const type = bxgyRewardType(cfg);
  if (type === "percentage") return `${num(cfg.bxgy_reward_value)}% off`;
  if (type === "flat") return `${currency}${num(cfg.bxgy_reward_value)} off`;

  const names = parseIdList(cfg.freebie_item_ids)
    .map((id) => opts.nameOf?.(id))
    .filter(Boolean) as string[];
  const per = Math.floor(num(cfg.freebie_item_count)) || 1;
  const each = per > 1 ? `${per}× ` : "";
  return names.length
    ? `Free ${each}${joinNames(names, opts.maxNames)}`
    : `Free ${each}item`;
}

/** What the customer must DO to earn it — "Buy 2 Oreo Kheer", "Spend ₹500". */
export function bxgyConditionLabel(
  cfg: BxgyLike | null | undefined,
  opts: BxgyCopyOpts = {},
): string {
  if (!cfg) return "";
  const currency = opts.currency ?? "₹";
  const type = bxgyBuyType(cfg);
  const qty = Math.floor(num(cfg.bxgy_buy_quantity)) || 1;

  if (type === "order_value") return `Spend ${currency}${num(cfg.bxgy_buy_value)}`;
  if (type === "quantity") return `Buy any ${qty} item${qty > 1 ? "s" : ""}`;

  const names = parseIdList(cfg.bxgy_buy_item_ids)
    .map((id) => opts.nameOf?.(id))
    .filter(Boolean) as string[];
  return names.length
    ? `Buy ${qty} ${joinNames(names, opts.maxNames)}`
    : `Buy ${qty} qualifying item${qty > 1 ? "s" : ""}`;
}

/** How many times the offer may repeat, as a suffix — "" when it's once only. */
export function bxgyRepeatSuffix(cfg: BxgyLike | null | undefined): string {
  const repeat = bxgyMaxRepeat(cfg);
  return bxgyRewardType(cfg) !== "percentage" && repeat > 1 ? ` (up to ${repeat}×)` : "";
}

/**
 * The whole rule on one line — "Buy 2 Oreo Kheer → Free Oreo Dosa Crepe" — for
 * places with room for a sentence: the admin list and preview, toasts, and the
 * storefront's rotating offer ticker.
 *
 * The arrow rather than "…, get …" keeps item names capitalised as written
 * instead of forcing a grammatical join that reads badly in either case.
 */
export function describeBxgy(
  cfg: BxgyLike | null | undefined,
  opts: BxgyCopyOpts = {},
): string {
  if (!cfg) return "";
  return `${bxgyConditionLabel(cfg, opts)} → ${bxgyRewardLabel(cfg, opts)}${bxgyRepeatSuffix(cfg)}`;
}

/**
 * Label for a BXGY already applied to an order — the bill, order details, the
 * POS's saved-bill view. Deliberately NOT describeBxgy: an order's stored
 * discount carries the code, the times it was claimed and the freebie names it
 * handed over, but not the names behind the buy condition, so restating the
 * whole rule there would read worse than naming what the customer got.
 */
export function bxgyOrderLabel(d: {
  code?: string | null;
  reason?: string | null;
  freebie_item_names?: string | null;
  bxgy_applied_times?: number | null;
}): string {
  const code = (d?.code || d?.reason || "").trim();
  const times = Number(d?.bxgy_applied_times);
  let label = code ? `BXGY (${code})` : "BXGY Offer";
  if (Number.isFinite(times) && times > 1) label += ` ×${times}`;
  if (d?.freebie_item_names) label += ` — ${d.freebie_item_names} FREE`;
  return label;
}

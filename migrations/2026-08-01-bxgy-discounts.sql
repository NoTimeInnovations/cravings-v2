-- 2026-08-01 — BXGY (Buy X Get Y) discounts
--
-- The discounts table could express "10% off", "₹50 off" and "free item", but
-- not "buy 2 pizzas, get a coke free" — the reward and the condition that earns
-- it were the same field. This splits them:
--
--   the CONDITION (buy X)  → bxgy_buy_type + one of item ids / quantity / value
--   the REWARD    (get Y)  → bxgy_reward_type + value, or the existing
--                            freebie_item_ids / freebie_item_count
--
-- discount_type gains a fourth value, 'bxgy'. It is a plain text column with no
-- CHECK constraint, so nothing needs relaxing and no existing row changes
-- meaning: every current discount keeps its type and every bxgy_* column is
-- NULL for them, which the readers treat as "not a BXGY discount".
--
-- bxgy_max_repeat answers "the cart qualifies three times over — do they get
-- three rewards?". NULL is read as 1 (reward once), so a partner who leaves it
-- blank can never accidentally hand out an unbounded number of free items.
--
-- Additive + idempotent, safe on production. Reload Hasura metadata afterwards
-- or the new columns will not appear in discounts_insert_input / discounts_set_input.

-- How the cart earns the reward: 'items' (N units from a chosen list),
-- 'quantity' (N units of anything), or 'order_value' (subtotal ≥ amount).
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS bxgy_buy_type text;

-- Comma-separated menu item ids, for bxgy_buy_type = 'items'. Matching is ANY
-- of the listed items, counted in units — 2 of one item qualifies just as well
-- as 1 each of two.
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS bxgy_buy_item_ids text;

-- The N in "buy N", for bxgy_buy_type in ('items', 'quantity').
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS bxgy_buy_quantity integer;

-- The subtotal threshold, for bxgy_buy_type = 'order_value'. Deliberately not
-- min_order_value: that gates the whole discount, this one earns a repeat.
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS bxgy_buy_value numeric;

-- What the reward is: 'percentage', 'flat' or 'freebie'.
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS bxgy_reward_type text;

-- The reward amount — a percentage or a currency amount. Unused for 'freebie',
-- which carries its items in freebie_item_ids / freebie_item_count.
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS bxgy_reward_value numeric;

-- How many times one order may earn the reward. NULL = 1.
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS bxgy_max_repeat integer;

-- 2026-08-01 — Partner-written banner text for a discount
--
-- The storefront discount card generates its own headline from the rule
-- ("FREE FRIES PERI PERI", "20% OFF"). That reads well for a simple rule and
-- badly for a BXGY drawn against thirteen qualifying items, where no generated
-- sentence is going to beat one the restaurant writes itself.
--
-- Deliberately NOT reusing `description`: that column is already shown to
-- customers in the coupon list and used as the summary ticker's sentence, so
-- repurposing it as the card headline would silently restyle every existing
-- discount that has one. This is opt-in — NULL keeps today's generated text,
-- which is what all existing rows have.
--
-- Applies to every discount type, not just BXGY.
--
-- Additive + idempotent, safe on production. Reload Hasura metadata afterwards
-- or the new column will not appear in discounts_insert_input / discounts_set_input.

ALTER TABLE discounts ADD COLUMN IF NOT EXISTS banner_text text;

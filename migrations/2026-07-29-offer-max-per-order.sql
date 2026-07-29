-- 2026-07-29 — Per-order limit on an offer
--
-- An offer price applies to EVERY unit, so a half-alfaham listed at ₹360 with an
-- offer price of ₹250 sells two for ₹500 instead of ₹720 — the discount
-- multiplies, which is rarely what "offer price" was meant to mean. This lets a
-- restaurant say how many units one customer may take at that price in a single
-- order.
--
-- NULL = unlimited, which is what all 1,624 existing offers have and keep, so
-- nothing that used to go through starts being refused.
--
-- Additive + idempotent, safe on production. Reload Hasura metadata afterwards
-- or the new column will not appear in offers_insert_input / the offers type.

ALTER TABLE offers ADD COLUMN IF NOT EXISTS max_per_order integer;

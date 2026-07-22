-- 2026-07-21 — 3rd Party Delivery Charges
--
-- Adds the column that backs Settings → Ordering → "3rd Party Delivery Charges".
-- It stores the partner's manually-logged portal recharges (Porter / Rapido /
-- Uber prepaid top-ups) as a jsonb array of DeliveryRecharge:
--   [{ id, provider, amount, date, note?, created_at }]
--
-- Additive + idempotent — safe to run on production. After running it, reload
-- Hasura metadata (or "track" the new column) so `delivery_recharges` appears
-- in `partners_set_input` / the partners GraphQL type; otherwise the tab's save
-- action returns "column doesn't exist yet".

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS delivery_recharges jsonb;

-- Optional: default to an empty array instead of NULL (the app already treats
-- NULL as "no recharges", so this is cosmetic).
-- ALTER TABLE partners ALTER COLUMN delivery_recharges SET DEFAULT '[]'::jsonb;

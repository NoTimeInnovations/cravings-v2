-- 2026-08-15 — Per-discount control over whether a coupon is listed at checkout
--
-- The checkout's coupon list advertised every active coupon the partner had, so
-- a code meant for one customer, a win-back campaign or a single influencer was
-- handed to everyone who opened the cart. Partners had only one lever — turn the
-- discount off entirely — which also stops the people it was made for.
--
-- Deliberately NOT reusing `show_on_storefront`: that governs the discount CARD
-- on the store page, a different surface with a different audience. A partner
-- who wants a coupon advertised on the menu page but not pushed at checkout (or
-- the reverse) needs the two to move independently.
--
-- Hiding a coupon does NOT disable it. It stops appearing in the list; the code
-- still validates and applies when a customer types it in — that IS the feature.
-- The checkout's code box is gated on the count of ALL usable coupons, not the
-- advertised ones, so a partner whose codes are all private still gets one.
--
-- DEFAULT true so every existing discount keeps being listed exactly as before;
-- only rows a partner explicitly turns off change behaviour.
--
-- Additive + idempotent, safe on production. Reload Hasura metadata afterwards
-- or the new column will not appear in discounts_insert_input / discounts_set_input.

ALTER TABLE discounts
  ADD COLUMN IF NOT EXISTS show_in_checkout boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN discounts.show_in_checkout IS
  'Lists this coupon in the customer checkout coupon list. Off hides it from the list; the code still applies if the customer types it.';

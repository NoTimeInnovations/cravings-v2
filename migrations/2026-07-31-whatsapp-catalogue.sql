-- 2026-07-31 — WhatsApp Business Catalogue (feature-flagged, per partner)
--
-- Publishes a partner's menu as a Meta Commerce catalogue so customers browse
-- and cart inside WhatsApp. Checkout still runs on the storefront: the WhatsApp
-- cart is handed over through the existing `?ro=` reorder payload, so prices,
-- offers, delivery rules and stock stay computed in exactly one place.
--
-- partners.wa_catalog_id
--   The Meta catalogue this partner's menu is published to, connected to their
--   OWN WABA. NULL = not provisioned, which is every partner today and stays
--   that way until the whatsappcatalog flag is turned on for them.
--
-- menu.wa_catalog_synced_at / wa_catalog_error
--   Per-item sync state. Kept on the row rather than in a separate log because
--   the question that actually gets asked is "why is THIS dish missing from my
--   catalogue" — and the answer (no image, rejected by Meta, never pushed) has
--   to be answerable per item in the admin. A NULL synced_at with no error just
--   means "not pushed yet".
--
--   `wa_catalog_error` holds Meta's own rejection text. Items without an image
--   are skipped before the push, and that reason is written here too, so the
--   admin can show "12 items are not in your WhatsApp catalogue" with a cause
--   next to each rather than a silent absence.
--
-- Additive + idempotent, safe on production: every column is nullable with no
-- default, so no existing row changes and no write path has to know about them
-- until the sync is wired up.
--
-- ⚠ Reload Hasura metadata afterwards, or these columns will not appear in
-- partners_set_input / menu_set_input and every write will fail at RUNTIME —
-- tsc and `next build` both pass without them.

ALTER TABLE partners ADD COLUMN IF NOT EXISTS wa_catalog_id text;

ALTER TABLE menu ADD COLUMN IF NOT EXISTS wa_catalog_synced_at timestamptz;
ALTER TABLE menu ADD COLUMN IF NOT EXISTS wa_catalog_error text;

-- Only ever queried for the partners that have the feature on, so the index is
-- partial — it stays tiny while 96k menu rows sit outside it.
CREATE INDEX IF NOT EXISTS menu_wa_catalog_pending_idx
  ON menu (partner_id)
  WHERE wa_catalog_synced_at IS NULL;

-- 2026-08-06 — Shiprocket shipping (feature-flagged, per partner)
--
-- Partners ship through their OWN Shiprocket account. Shiprocket has no
-- client_id/secret: the API user is an email + password created at
-- app.shiprocket.in → Settings → API → Add New API User, exchanged for a JWT
-- that lives 10 days. So we are storing a MERCHANT PASSWORD, which is why none
-- of this goes on the `partners` row.
--
-- WHY A SIDE TABLE AND NOT partners.*
--   src/lib/hasuraClient.ts ships NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET to the
--   BROWSER, and the whole partner row is handed to client components on the
--   storefront. Any secret added to `partners` is therefore world-readable the
--   moment it is written. This mirrors the existing `partner_payment_credentials`
--   table: ciphertext only, read exclusively through fetchFromHasuraServer.
--
-- partner_shiprocket_credentials
--   password_enc / token_enc are AES-256-GCM ciphertext from src/lib/paymentCrypto.ts
--   ("v1.<iv>.<tag>.<ct>"), AAD-BOUND TO partner_id. The AAD is what stops one
--   partner's ciphertext being transplanted into another partner's row — which is a
--   real attack here, not a theoretical one, because the browser holds an admin
--   secret and can write this table directly.
--
--   token_enc + token_expires_at cache the login JWT so we do not re-authenticate on
--   every call (Shiprocket rate-limits login harder than the data endpoints). Both
--   are cleared whenever api_email or the password changes, forcing a re-test.
--
--   config holds the NON-secret settings the partner edits: shipping mode
--   (parcel | hyperlocal), pickup location nickname, package defaults, auto-dispatch
--   trigger. Kept on this row rather than on `partners` so one read serves dispatch.
--
-- shiprocket_shipments
--   One row per order, PRIMARY KEY (order_id) — the primary key IS the dispatch
--   claim. This is load-bearing, not bookkeeping: a Shiprocket order_id is burned
--   permanently the first time it is used, INCLUDING on an order that was later
--   cancelled, and every re-send bills the partner again. Auto-dispatch on a status
--   transition, the manual Ship button and any future cron can all fire for the same
--   order at the same time, so the claim has to be won in the database.
--
--   Retry is deliberate rather than free: a failed/cancelled row can be re-claimed by
--   a conditional UPDATE (the WHERE clause decides the winner), which bumps `attempt`
--   so the next send uses a fresh sr_order_ref suffix. A row in any other state is
--   never re-sent.
--
-- Additive + idempotent, safe on production: two new tables, nothing existing is
-- touched, and no write path knows about them until the feature flag is granted.
--
-- ⚠ Track BOTH tables in Hasura and reload metadata afterwards, or
-- partner_shiprocket_credentials_by_pk / shiprocket_shipments_insert_input will not
-- exist and every read/write fails at RUNTIME — tsc and `next build` both pass
-- without them.
-- ⚠ Declare NO select/insert/update permissions for the partner / user / public
-- roles on partner_shiprocket_credentials. It is server-only, reached exclusively
-- through fetchFromHasuraServer.

CREATE TABLE IF NOT EXISTS partner_shiprocket_credentials (
  partner_id       uuid PRIMARY KEY REFERENCES partners (id) ON DELETE CASCADE,
  api_email        text,
  -- AES-256-GCM ciphertext, AAD = partner_id. NEVER plaintext.
  password_enc     text,
  -- Cached login JWT (also ciphertext) + its expiry.
  token_enc        text,
  token_expires_at timestamptz,
  -- Non-secret partner settings: { mode, pickup_location, auto_dispatch,
  -- dispatch_trigger, request_pickup, courier_id, channel_id, package{...} }.
  config           jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Last successful /auth/login, and the last failure reason shown in the admin.
  last_verified_at timestamptz,
  last_error       text,
  updated_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shiprocket_shipments (
  -- PK = the dispatch claim. See the note above; do not add a surrogate id.
  order_id           uuid PRIMARY KEY REFERENCES orders (id) ON DELETE CASCADE,
  partner_id         uuid NOT NULL REFERENCES partners (id) ON DELETE CASCADE,
  -- "parcel" (courier) or "hyperlocal" (Shiprocket Quick) — the mode in force when
  -- this shipment was created, not the partner's current setting.
  mode               text,
  -- The reference WE send as Shiprocket's `order_id`. Carries the attempt suffix,
  -- because Shiprocket refuses a previously-used value forever.
  sr_order_ref       text,
  -- Identifiers Shiprocket sends back.
  sr_order_id        text,
  shipment_id        text,
  awb_code           text,
  courier_name       text,
  courier_company_id integer,
  -- claimed | created | awb_assigned | pickup_requested | failed | unknown | cancelled
  --
  -- `unknown` is load-bearing, not a catch-all: it means Shiprocket never answered,
  -- so we cannot tell whether the order exists there. It is deliberately excluded
  -- from automatic retry (only a human may re-send it), because a retry uses a new
  -- reference that Shiprocket cannot recognise as a duplicate — a second real,
  -- billed parcel. Plain text with no CHECK, so the app owns the vocabulary.
  status             text NOT NULL DEFAULT 'claimed',
  label_url          text,
  tracking_url       text,
  attempt            integer NOT NULL DEFAULT 1,
  last_error         text,
  meta               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- The admin lists a partner's recent shipments; AWB lookup backs tracking refresh
-- and any future status webhook, which arrives knowing only the AWB.
CREATE INDEX IF NOT EXISTS shiprocket_shipments_partner_idx
  ON shiprocket_shipments (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS shiprocket_shipments_awb_idx
  ON shiprocket_shipments (awb_code)
  WHERE awb_code IS NOT NULL;

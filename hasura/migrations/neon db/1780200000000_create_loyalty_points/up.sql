-- Loyalty points: partner-scoped customer points backed by an append-only,
-- HMAC-signed, hash-chained ledger.
--
-- loyalty_transactions is the source of truth; loyalty_accounts.balance is a
-- verified cache (= balance_after of the latest txn). Every ledger row is
-- signed with a server-only secret (LOYALTY_LEDGER_SECRET) and chained via
-- prev_hash, so a balance cannot be inflated, forged, or transferred even by a
-- holder of the (currently browser-exposed) Hasura admin secret: injected or
-- edited rows fail signature/chain verification and are rejected, and there is
-- no "transfer" operation at all. Deleting rows can only *reduce* a balance
-- (a denial, never a gain) and is detectable via the chain head.

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned integer NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_redeemed integer NOT NULL DEFAULT 0 CHECK (lifetime_redeemed >= 0),
  last_seq bigint NOT NULL DEFAULT 0,
  last_txn_id uuid,
  last_hash text NOT NULL DEFAULT 'GENESIS',
  flagged_at timestamptz,
  flag_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_accounts_user_partner_key UNIQUE (user_id, partner_id)
);
CREATE INDEX IF NOT EXISTS loyalty_accounts_partner_idx ON public.loyalty_accounts (partner_id);
CREATE INDEX IF NOT EXISTS loyalty_accounts_user_idx ON public.loyalty_accounts (user_id);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.loyalty_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('earn','redeem','refund','adjust_credit','adjust_debit')),
  delta integer NOT NULL CHECK (delta <> 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  seq bigint NOT NULL,
  prev_hash text NOT NULL,
  hash text NOT NULL,
  note text,
  meta jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_txn_account_seq_key UNIQUE (account_id, seq)
);
CREATE INDEX IF NOT EXISTS loyalty_txn_account_idx ON public.loyalty_transactions (account_id, seq);
CREATE INDEX IF NOT EXISTS loyalty_txn_user_partner_idx ON public.loyalty_transactions (user_id, partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS loyalty_txn_partner_idx ON public.loyalty_transactions (partner_id, created_at DESC);
-- Idempotency: at most one earn / one redeem / one refund per order.
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_txn_order_type_key ON public.loyalty_transactions (order_id, type) WHERE order_id IS NOT NULL;

-- Per-partner loyalty configuration (JSON string, mirrors prebooking_settings).
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS loyalty_settings text;

-- Redemption + earn snapshot persisted on the order for display/audit.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS loyalty_points_redeemed integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS loyalty_redeem_value double precision NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS loyalty_points_earned integer;

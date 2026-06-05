ALTER TABLE public.orders DROP COLUMN IF EXISTS loyalty_points_earned;
ALTER TABLE public.orders DROP COLUMN IF EXISTS loyalty_redeem_value;
ALTER TABLE public.orders DROP COLUMN IF EXISTS loyalty_points_redeemed;
ALTER TABLE public.partners DROP COLUMN IF EXISTS loyalty_settings;
DROP TABLE IF EXISTS public.loyalty_transactions;
DROP TABLE IF EXISTS public.loyalty_accounts;

ALTER TABLE "public"."discounts" ADD COLUMN IF NOT EXISTS "show_on_storefront" boolean NOT NULL DEFAULT true;

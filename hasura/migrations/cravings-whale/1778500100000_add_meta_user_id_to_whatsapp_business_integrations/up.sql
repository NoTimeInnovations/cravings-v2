ALTER TABLE "public"."whatsapp_business_integrations"
  ADD COLUMN IF NOT EXISTS "meta_user_id" text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS "whatsapp_business_integrations_meta_user_id_idx"
  ON "public"."whatsapp_business_integrations" ("meta_user_id");

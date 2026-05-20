DROP INDEX IF EXISTS "whatsapp_business_integrations_meta_user_id_idx";
ALTER TABLE "public"."whatsapp_business_integrations" DROP COLUMN IF EXISTS "meta_user_id";

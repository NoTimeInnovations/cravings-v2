DROP INDEX IF EXISTS partners_custom_domain_unique;
ALTER TABLE "public"."partners" DROP COLUMN IF EXISTS "custom_domain";

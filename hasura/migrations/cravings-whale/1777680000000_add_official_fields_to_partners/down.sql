ALTER TABLE "public"."partners"
  DROP COLUMN IF EXISTS "official_phone_number",
  DROP COLUMN IF EXISTS "official_email_id",
  DROP COLUMN IF EXISTS "operating_address",
  DROP COLUMN IF EXISTS "about_us",
  DROP COLUMN IF EXISTS "official_name";

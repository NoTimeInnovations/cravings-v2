ALTER TABLE "public"."partners"
  ADD COLUMN "official_name" text DEFAULT NULL,
  ADD COLUMN "about_us" text DEFAULT NULL,
  ADD COLUMN "operating_address" text DEFAULT NULL,
  ADD COLUMN "official_email_id" text DEFAULT NULL,
  ADD COLUMN "official_phone_number" text DEFAULT NULL;

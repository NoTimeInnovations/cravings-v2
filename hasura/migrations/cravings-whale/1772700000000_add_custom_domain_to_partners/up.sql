ALTER TABLE "public"."partners"
  ADD COLUMN "custom_domain" text DEFAULT NULL;

CREATE UNIQUE INDEX partners_custom_domain_unique
  ON "public"."partners" ("custom_domain")
  WHERE "custom_domain" IS NOT NULL;

CREATE TABLE "public"."qr_groups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" text NOT NULL, "extra_charge" float8 NOT NULL DEFAULT 0, PRIMARY KEY ("id") , UNIQUE ("id"));
CREATE EXTENSION IF NOT EXISTS pgcrypto;

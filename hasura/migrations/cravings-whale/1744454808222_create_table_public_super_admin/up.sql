CREATE TABLE "public"."super_admin" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" text NOT NULL, "password" text NOT NULL, PRIMARY KEY ("id") );
CREATE EXTENSION IF NOT EXISTS pgcrypto;

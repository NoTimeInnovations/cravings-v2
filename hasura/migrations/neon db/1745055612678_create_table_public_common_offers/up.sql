CREATE TABLE "public"."common_offers" ("partner_name" text NOT NULL, "item_name" text NOT NULL, "price" integer NOT NULL, "location" text, "description" text, "insta_link" text, "likes" integer NOT NULL DEFAULT 0, "image_url" text, "offer_price" integer, "id" uuid NOT NULL DEFAULT gen_random_uuid(), PRIMARY KEY ("id") , UNIQUE ("id"));
CREATE EXTENSION IF NOT EXISTS pgcrypto;

alter table "public"."offers" alter column "image_url" drop not null;
alter table "public"."offers" add column "image_url" text;

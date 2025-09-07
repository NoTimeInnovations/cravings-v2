alter table "public"."offers" alter column "description" drop not null;
alter table "public"."offers" add column "description" text;

alter table "public"."offers" alter column "name" drop not null;
alter table "public"."offers" add column "name" text;

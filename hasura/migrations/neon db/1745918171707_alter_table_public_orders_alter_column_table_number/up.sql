ALTER TABLE "public"."orders" ALTER COLUMN "table_number" drop default;
alter table "public"."orders" alter column "table_number" drop not null;

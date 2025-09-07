alter table "public"."orders" alter column "delivery_charge" drop not null;
alter table "public"."orders" add column "delivery_charge" float8;

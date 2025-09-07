alter table "public"."common_offers" alter column "offer_price" drop not null;
alter table "public"."common_offers" add column "offer_price" int4;

comment on column "public"."partners"."delivery_rate" is E'business partners';
alter table "public"."partners" alter column "delivery_rate" drop not null;
alter table "public"."partners" add column "delivery_rate" text;

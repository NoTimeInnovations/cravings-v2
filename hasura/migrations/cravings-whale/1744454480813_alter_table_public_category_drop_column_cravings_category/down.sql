comment on column "public"."category"."cravings_category" is E'categories that a store have';
alter table "public"."category" alter column "cravings_category" drop not null;
alter table "public"."category" add column "cravings_category" text;

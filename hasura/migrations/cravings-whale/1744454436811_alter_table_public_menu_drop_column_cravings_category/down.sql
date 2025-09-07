comment on column "public"."menu"."cravings_category" is E'menus of each store';
alter table "public"."menu" alter column "cravings_category" drop not null;
alter table "public"."menu" add column "cravings_category" text;

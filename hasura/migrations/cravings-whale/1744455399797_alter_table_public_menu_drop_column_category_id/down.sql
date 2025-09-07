comment on column "public"."menu"."category_id" is E'menus of each store';
alter table "public"."menu" alter column "category_id" drop not null;
alter table "public"."menu" add column "category_id" text;

alter table "public"."orders" alter column "sub_status" set default json_build_array();
alter table "public"."orders" alter column "sub_status" drop not null;
alter table "public"."orders" add column "sub_status" json;

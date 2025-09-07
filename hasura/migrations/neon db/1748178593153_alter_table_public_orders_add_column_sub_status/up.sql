alter table "public"."orders" add column "sub_status" json
 null default json_build_array();

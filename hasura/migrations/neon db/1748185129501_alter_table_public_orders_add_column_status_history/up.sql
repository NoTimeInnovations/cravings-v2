alter table "public"."orders" add column "status_history" json
 null default json_build_object();

alter table "public"."partners" add column "social_links" jsonb
 null default jsonb_build_object();

alter table "public"."branches" drop constraint if exists "branches_whatsapp_source_check";
alter table "public"."branches" drop column if exists "whatsapp_source";

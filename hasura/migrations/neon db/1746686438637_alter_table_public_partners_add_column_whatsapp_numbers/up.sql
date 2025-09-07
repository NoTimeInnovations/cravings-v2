alter table "public"."partners" add column "whatsapp_numbers" jsonb
 null default jsonb_build_array();

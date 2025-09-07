alter table "public"."qr_codes"
  add constraint "qr_codes_group_id_fkey"
  foreign key ("group_id")
  references "public"."qr_groups"
  ("id") on update restrict on delete restrict;

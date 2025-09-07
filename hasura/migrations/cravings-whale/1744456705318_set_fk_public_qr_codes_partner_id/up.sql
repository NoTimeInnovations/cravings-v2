alter table "public"."qr_codes"
  add constraint "qr_codes_partner_id_fkey"
  foreign key ("partner_id")
  references "public"."partners"
  ("id") on update restrict on delete restrict;

alter table "public"."qr_groups"
  add constraint "qr_groups_partner_id_fkey"
  foreign key ("partner_id")
  references "public"."partners"
  ("id") on update restrict on delete restrict;

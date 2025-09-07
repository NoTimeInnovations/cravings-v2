alter table "public"."orders"
  add constraint "orders_qr_id_fkey"
  foreign key ("qr_id")
  references "public"."qr_codes"
  ("id") on update restrict on delete restrict;

alter table "public"."category"
  add constraint "category_patner_id_fkey"
  foreign key ("patner_id")
  references "public"."partners"
  ("id") on update restrict on delete restrict;

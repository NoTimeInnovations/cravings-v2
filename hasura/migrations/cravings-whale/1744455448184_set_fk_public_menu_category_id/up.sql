alter table "public"."menu"
  add constraint "menu_category_id_fkey"
  foreign key ("category_id")
  references "public"."category"
  ("id") on update restrict on delete restrict;

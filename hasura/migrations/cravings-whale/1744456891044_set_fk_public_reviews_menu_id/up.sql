alter table "public"."reviews"
  add constraint "reviews_menu_id_fkey"
  foreign key ("menu_id")
  references "public"."menu"
  ("id") on update restrict on delete restrict;

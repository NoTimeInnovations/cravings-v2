-- Allow off-menu custom POS line items (order_items rows that don't reference a
-- menu row). The name/price live in the item JSONB snapshot; menu_id is null.
--
-- STRICTLY ADDITIVE / non-destructive: this only RELAXES the NOT NULL constraint.
-- The foreign key order_items_menu_id_fkey -> menu(id) still applies to every
-- non-null value, and no existing row is modified or deleted.
ALTER TABLE "public"."order_items" ALTER COLUMN "menu_id" DROP NOT NULL;

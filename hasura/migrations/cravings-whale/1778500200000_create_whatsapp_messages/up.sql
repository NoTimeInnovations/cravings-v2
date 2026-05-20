CREATE TABLE IF NOT EXISTS "public"."whatsapp_messages" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "partner_id" uuid NOT NULL,
  "direction" text NOT NULL,
  "contact_phone" text NOT NULL,
  "contact_name" text DEFAULT NULL,
  "type" text NOT NULL DEFAULT 'text',
  "body" text DEFAULT NULL,
  "media_url" text DEFAULT NULL,
  "wa_message_id" text DEFAULT NULL,
  "status" text NOT NULL DEFAULT 'received',
  "error_reason" text DEFAULT NULL,
  "is_read" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "whatsapp_messages_partner_fk"
    FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE,
  CONSTRAINT "whatsapp_messages_direction_check"
    CHECK ("direction" IN ('in','out')),
  CONSTRAINT "whatsapp_messages_type_check"
    CHECK ("type" IN ('text','image','video','document','audio','sticker','location','interactive','template','button','unknown')),
  CONSTRAINT "whatsapp_messages_status_check"
    CHECK ("status" IN ('received','queued','sent','delivered','read','failed'))
);

CREATE INDEX IF NOT EXISTS "whatsapp_messages_partner_phone_idx"
  ON "public"."whatsapp_messages" ("partner_id", "contact_phone", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "whatsapp_messages_partner_created_idx"
  ON "public"."whatsapp_messages" ("partner_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "whatsapp_messages_wa_id_idx"
  ON "public"."whatsapp_messages" ("wa_message_id");

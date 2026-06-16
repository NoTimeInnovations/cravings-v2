CREATE TABLE IF NOT EXISTS "public"."whatsapp_broadcasts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "partner_id" uuid NOT NULL,
  "template_id" uuid,
  "template_name" text NOT NULL,
  "language" text NOT NULL,
  "category" text NOT NULL DEFAULT 'MARKETING',
  "variable_map" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "header_params" jsonb,
  "status" text NOT NULL DEFAULT 'scheduled',
  "scheduled_at" timestamptz,
  "daily_limit" integer NOT NULL DEFAULT 250,
  "total_recipients" integer NOT NULL DEFAULT 0,
  "sent_count" integer NOT NULL DEFAULT 0,
  "failed_count" integer NOT NULL DEFAULT 0,
  "locked_at" timestamptz,
  "last_error" text,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("template_id") REFERENCES "public"."whatsapp_message_templates"("id") ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "whatsapp_broadcasts_partner_idx" ON "public"."whatsapp_broadcasts" ("partner_id");
CREATE INDEX IF NOT EXISTS "whatsapp_broadcasts_status_sched_idx" ON "public"."whatsapp_broadcasts" ("status", "scheduled_at");

CREATE TABLE IF NOT EXISTS "public"."whatsapp_broadcast_recipients" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "broadcast_id" uuid NOT NULL,
  "name" text,
  "phone" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "error" text,
  "meta_message_id" text,
  "sent_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("broadcast_id") REFERENCES "public"."whatsapp_broadcasts"("id") ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "wa_broadcast_recipients_broadcast_status_idx" ON "public"."whatsapp_broadcast_recipients" ("broadcast_id", "status");
CREATE INDEX IF NOT EXISTS "wa_broadcast_recipients_sent_at_idx" ON "public"."whatsapp_broadcast_recipients" ("sent_at");

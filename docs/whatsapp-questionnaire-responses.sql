-- Questionnaire submissions from WhatsApp Flow forms (the "Questionnaire" step
-- in the flow builder). Written by recordQuestionnaireResponse in
-- src/lib/whatsappFlow/engine.ts; read by the Responses screen via
-- /api/whatsapp/questionnaire-responses.
--
-- Applied to prod-v2 on 2026-08-22 and tracked in Hasura.

CREATE TABLE IF NOT EXISTS public.whatsapp_questionnaire_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  -- Nullable: a flow can be deleted long after its answers were collected, and
  -- losing the answers with it would be the wrong trade.
  flow_id       uuid REFERENCES public.whatsapp_flows(id) ON DELETE SET NULL,
  node_id       text NOT NULL,
  flow_name     text,
  contact_phone text NOT NULL,
  contact_name  text,
  wa_message_id text,
  flow_token    text,
  -- [{name, label, kind, value, raw}] — the labels are frozen at submission
  -- time so re-wording a question later doesn't rewrite past answers.
  answers       jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Exactly what Meta sent, kept for re-analysis if the shape ever surprises us.
  raw_response  jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary       text,
  submitted_at  timestamptz NOT NULL DEFAULT now()
);

-- Meta redelivers webhooks freely; one submission must file one row.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_questionnaire_responses_wa_msg_uniq
  ON public.whatsapp_questionnaire_responses (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_questionnaire_responses_partner_idx
  ON public.whatsapp_questionnaire_responses (partner_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_questionnaire_responses_flow_idx
  ON public.whatsapp_questionnaire_responses (flow_id, submitted_at DESC);

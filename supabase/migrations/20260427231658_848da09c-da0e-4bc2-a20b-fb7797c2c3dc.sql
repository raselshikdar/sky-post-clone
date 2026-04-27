
ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.support_ticket_messages
  DROP CONSTRAINT IF EXISTS support_msg_has_content;

ALTER TABLE public.support_ticket_messages
  ADD CONSTRAINT support_msg_has_content
  CHECK (
    (body IS NOT NULL AND length(trim(body)) > 0)
    OR attachment_url IS NOT NULL
    OR jsonb_array_length(attachments) > 0
  );

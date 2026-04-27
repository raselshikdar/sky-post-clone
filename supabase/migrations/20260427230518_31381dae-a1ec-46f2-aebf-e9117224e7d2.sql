
CREATE TABLE public.support_ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  is_staff boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_stm_ticket ON public.support_ticket_messages(ticket_id, created_at);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View messages on accessible tickets"
ON public.support_ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
    AND (t.user_id = auth.uid() OR public.is_staff(auth.uid()))
  )
);

CREATE POLICY "Send messages on open tickets"
ON public.support_ticket_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
    AND t.status <> 'closed'
    AND (
      (t.user_id = auth.uid() AND is_staff = false)
      OR (public.is_staff(auth.uid()) AND is_staff = true)
    )
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
ALTER TABLE public.support_ticket_messages REPLICA IDENTITY FULL;

-- Bump ticket updated_at when a new message arrives, so list ordering reflects activity
CREATE OR REPLACE FUNCTION public.bump_ticket_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET updated_at = now(),
      status = CASE
        WHEN status = 'open' AND NEW.is_staff = true THEN 'in_progress'
        ELSE status
      END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_ticket_on_message
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_ticket_on_message();

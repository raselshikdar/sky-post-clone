
CREATE OR REPLACE FUNCTION public.notify_user_on_staff_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket_owner uuid;
BEGIN
  IF NEW.is_staff = true THEN
    SELECT user_id INTO _ticket_owner
    FROM public.support_tickets
    WHERE id = NEW.ticket_id;

    IF _ticket_owner IS NOT NULL AND _ticket_owner <> NEW.sender_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, post_id)
      VALUES (_ticket_owner, NEW.sender_id, 'support_reply', NEW.ticket_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_staff_reply
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_staff_reply();

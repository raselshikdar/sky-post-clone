
-- Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- VAPID keys table (only service_role can access)
CREATE TABLE IF NOT EXISTS public.push_vapid_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text NOT NULL,
  private_key text NOT NULL,
  subject text NOT NULL DEFAULT 'mailto:noreply@awaj.app',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_vapid_keys ENABLE ROW LEVEL SECURITY;

-- Trigger: send push on new notification
CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://bflzhuhgjahjudlsqmcn.supabase.co/functions/v1/send-push-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbHpodWhnamFoanVkbHNxbWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MTMyMjEsImV4cCI6MjA4NzQ4OTIyMX0.dEdDp00VPrV0X3dek9I6h9ZyzYQL8kwYX4sXlAqwv9Q"}'::jsonb,
    body := jsonb_build_object(
      'type', 'notification',
      'user_id', NEW.user_id,
      'actor_id', NEW.actor_id,
      'notification_type', NEW.type,
      'post_id', NEW.post_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_notification_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_on_notification();

-- Trigger: send push on new message
CREATE OR REPLACE FUNCTION public.trigger_push_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _recipient_id uuid;
BEGIN
  SELECT CASE 
    WHEN c.participant_1 = NEW.sender_id THEN c.participant_2
    ELSE c.participant_1
  END INTO _recipient_id
  FROM conversations c WHERE c.id = NEW.conversation_id;

  IF _recipient_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://bflzhuhgjahjudlsqmcn.supabase.co/functions/v1/send-push-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmbHpodWhnamFoanVkbHNxbWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MTMyMjEsImV4cCI6MjA4NzQ4OTIyMX0.dEdDp00VPrV0X3dek9I6h9ZyzYQL8kwYX4sXlAqwv9Q"}'::jsonb,
      body := jsonb_build_object(
        'type', 'message',
        'user_id', _recipient_id,
        'sender_id', NEW.sender_id,
        'content', LEFT(NEW.content, 100),
        'conversation_id', NEW.conversation_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message_push
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_on_message();

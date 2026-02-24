
-- Notification preferences per type
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL, -- likes, follows, replies, mentions, reposts, activity, likes_reposts, reposts_reposts, everything_else
  in_app boolean NOT NULL DEFAULT true,
  push boolean NOT NULL DEFAULT true,
  from_who text NOT NULL DEFAULT 'everyone', -- everyone, following, no_one
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification settings"
  ON public.notification_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime on notifications for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

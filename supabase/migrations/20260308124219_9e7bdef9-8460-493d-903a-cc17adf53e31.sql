
CREATE TABLE public.profile_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL,
  subscribed_to_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, subscribed_to_id)
);

ALTER TABLE public.profile_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.profile_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = subscriber_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.profile_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.profile_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = subscriber_id);

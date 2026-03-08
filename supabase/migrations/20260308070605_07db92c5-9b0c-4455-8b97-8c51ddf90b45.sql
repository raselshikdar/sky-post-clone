
CREATE TABLE IF NOT EXISTS public.live_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  live_link text NOT NULL DEFAULT '',
  is_live boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live status"
ON public.live_status FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own live status"
ON public.live_status FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own live status"
ON public.live_status FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own live status"
ON public.live_status FOR DELETE TO authenticated
USING (auth.uid() = user_id);

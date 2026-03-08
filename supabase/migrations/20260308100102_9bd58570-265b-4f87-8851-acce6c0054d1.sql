CREATE TABLE public.live_viewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_status_id uuid NOT NULL REFERENCES public.live_status(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(live_status_id, user_id)
);

ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live viewers" ON public.live_viewers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join" ON public.live_viewers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own presence" ON public.live_viewers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave" ON public.live_viewers FOR DELETE USING (auth.uid() = user_id);
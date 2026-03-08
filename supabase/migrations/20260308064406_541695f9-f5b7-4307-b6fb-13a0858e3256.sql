CREATE TABLE public.content_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  autoplay_media boolean NOT NULL DEFAULT true,
  enable_trending_topics boolean NOT NULL DEFAULT true,
  enable_trending_in_discover boolean NOT NULL DEFAULT true,
  thread_sort text NOT NULL DEFAULT 'newest',
  following_feed_replies boolean NOT NULL DEFAULT true,
  following_feed_reposts boolean NOT NULL DEFAULT true,
  following_feed_quotes boolean NOT NULL DEFAULT true,
  external_media_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content settings"
ON public.content_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content settings"
ON public.content_settings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content settings"
ON public.content_settings FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
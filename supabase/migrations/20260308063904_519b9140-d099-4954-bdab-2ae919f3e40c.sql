CREATE TABLE public.moderation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  adult_content_enabled boolean NOT NULL DEFAULT false,
  adult_filter text NOT NULL DEFAULT 'hide',
  suggestive_filter text NOT NULL DEFAULT 'warn',
  graphic_filter text NOT NULL DEFAULT 'warn',
  nudity_filter text NOT NULL DEFAULT 'hide',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own moderation settings"
ON public.moderation_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own moderation settings"
ON public.moderation_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moderation settings"
ON public.moderation_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
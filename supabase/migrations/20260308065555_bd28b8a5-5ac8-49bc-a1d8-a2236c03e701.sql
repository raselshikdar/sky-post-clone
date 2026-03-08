
CREATE TABLE IF NOT EXISTS public.accessibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  require_alt_text boolean NOT NULL DEFAULT false,
  large_alt_badges boolean NOT NULL DEFAULT false,
  reduce_motion boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accessibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accessibility settings"
ON public.accessibility_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accessibility settings"
ON public.accessibility_settings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accessibility settings"
ON public.accessibility_settings FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

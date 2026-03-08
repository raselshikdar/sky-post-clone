
CREATE TABLE IF NOT EXISTS public.appearance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  color_mode text NOT NULL DEFAULT 'system',
  dark_theme text NOT NULL DEFAULT 'dim',
  font_family text NOT NULL DEFAULT 'theme',
  font_size text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appearance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appearance settings"
ON public.appearance_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appearance settings"
ON public.appearance_settings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appearance settings"
ON public.appearance_settings FOR UPDATE TO authenticated
USING (auth.uid() = user_id);


ALTER TABLE public.content_settings
  ADD COLUMN IF NOT EXISTS video_default_muted boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_loop boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_quality text NOT NULL DEFAULT 'auto';

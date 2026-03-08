
ALTER TABLE public.content_settings
  ADD COLUMN IF NOT EXISTS tree_view boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ext_youtube boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ext_youtube_shorts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ext_vimeo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ext_twitch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ext_giphy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ext_spotify boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ext_apple_music boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ext_soundcloud boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ext_flickr boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS following_feed_samples boolean NOT NULL DEFAULT false;

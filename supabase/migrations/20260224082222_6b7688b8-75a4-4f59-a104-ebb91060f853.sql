
-- Catalog of available feeds
CREATE TABLE public.feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  author_handle TEXT DEFAULT '',
  icon TEXT DEFAULT 'compass',
  color TEXT DEFAULT 'bg-primary',
  is_default BOOLEAN DEFAULT false,
  liked_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feeds are viewable by everyone" ON public.feeds FOR SELECT USING (true);

-- User's saved/pinned feeds
CREATE TABLE public.user_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feed_id UUID NOT NULL REFERENCES public.feeds(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  pin_position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, feed_id)
);

ALTER TABLE public.user_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feeds" ON public.user_feeds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feeds" ON public.user_feeds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feeds" ON public.user_feeds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feeds" ON public.user_feeds FOR DELETE USING (auth.uid() = user_id);

-- Seed default feeds
INSERT INTO public.feeds (name, slug, description, author_handle, icon, color, is_default, liked_count) VALUES
  ('Discover', 'discover', 'See what''s happening right now', '@bsky.app', 'compass', 'bg-primary', true, 0),
  ('Following', 'following', 'Posts from people you follow', '@bsky.app', 'list-filter', 'bg-foreground', true, 0),
  ('What''s Hot Classic', 'whats-hot', 'The hottest posts on the network', '@bsky.app', 'flame', 'bg-primary', true, 0),
  ('Popular With Friends', 'popular-friends', 'Posts liked by people you follow', '@bsky.app', 'heart', 'bg-primary', false, 45200),
  ('Bluesky Team', 'bluesky-team', 'Posts from the Bluesky team', '@bsky.app', 'users', 'bg-primary', false, 38100),
  ('News', 'news', 'Breaking news and current events', '@aendra.com', 'newspaper', 'bg-muted-foreground', false, 52300),
  ('Science', 'science', 'Science news, research, and discussion', '@bossett.social', 'pencil', 'bg-green-500', false, 41700),
  ('Mutuals', 'mutuals', 'Posts from users who are following you back', '@skyfeed.xyz', 'users', 'bg-primary', false, 28499),
  ('Artists: Trending', 'artists-trending', 'General art feed — image posts from artists across Bluesky, sorted by trending.', '@bsky.art', 'palette', 'bg-purple-500', false, 32624),
  ('For You', 'for-you', 'A personalized algorithmic feed based on your likes. It finds people who liked the same posts as you, and shows you what else they''ve liked recently.', '@spacecowboy1.bsky.social', 'heart', 'bg-red-500', false, 44589);

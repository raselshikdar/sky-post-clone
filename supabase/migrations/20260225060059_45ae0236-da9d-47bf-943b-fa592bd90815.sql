
-- Create hashtags table to track hashtag usage counts
CREATE TABLE public.hashtags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  post_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create post_hashtags junction table
CREATE TABLE public.post_hashtags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, hashtag_id)
);

-- Enable RLS
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

-- Hashtags are viewable by everyone
CREATE POLICY "Hashtags are viewable by everyone" ON public.hashtags FOR SELECT USING (true);

-- Authenticated users can insert hashtags
CREATE POLICY "Authenticated users can insert hashtags" ON public.hashtags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update hashtag counts
CREATE POLICY "Authenticated users can update hashtags" ON public.hashtags FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Post hashtags viewable by everyone
CREATE POLICY "Post hashtags are viewable by everyone" ON public.post_hashtags FOR SELECT USING (true);

-- Authenticated users can insert post_hashtags (for their own posts)
CREATE POLICY "Users can tag their posts" ON public.post_hashtags FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_hashtags.post_id AND posts.author_id = auth.uid()));

-- Delete post_hashtags when post is deleted (CASCADE handles this)
CREATE POLICY "Users can remove tags from own posts" ON public.post_hashtags FOR DELETE
USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = post_hashtags.post_id AND posts.author_id = auth.uid()));

-- Function to extract and upsert hashtags when a post is created
CREATE OR REPLACE FUNCTION public.process_post_hashtags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tag text;
  tag_id uuid;
BEGIN
  -- Extract hashtags from content
  FOR tag IN SELECT DISTINCT lower(m[1]) FROM regexp_matches(NEW.content, '#([a-zA-Z0-9_\u0980-\u09FF]+)', 'g') AS m
  LOOP
    -- Upsert hashtag
    INSERT INTO public.hashtags (name, post_count)
    VALUES (tag, 1)
    ON CONFLICT (name) DO UPDATE SET post_count = hashtags.post_count + 1, updated_at = now()
    RETURNING id INTO tag_id;
    
    -- Link post to hashtag
    INSERT INTO public.post_hashtags (post_id, hashtag_id)
    VALUES (NEW.id, tag_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Function to decrement hashtag counts when a post is deleted
CREATE OR REPLACE FUNCTION public.decrement_hashtag_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.hashtags
  SET post_count = GREATEST(post_count - 1, 0), updated_at = now()
  WHERE id IN (SELECT hashtag_id FROM public.post_hashtags WHERE post_id = OLD.id);
  
  RETURN OLD;
END;
$function$;

-- Trigger: process hashtags on post insert
CREATE TRIGGER process_hashtags_on_post
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.process_post_hashtags();

-- Trigger: decrement hashtag counts on post delete
CREATE TRIGGER decrement_hashtags_on_post_delete
BEFORE DELETE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.decrement_hashtag_counts();

-- Add updated_at trigger for hashtags
CREATE TRIGGER update_hashtags_updated_at
BEFORE UPDATE ON public.hashtags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

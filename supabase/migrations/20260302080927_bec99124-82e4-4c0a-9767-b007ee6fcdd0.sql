
-- Add quote_post_id to posts for quote posts
ALTER TABLE public.posts ADD COLUMN quote_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL DEFAULT NULL;

-- Index for efficient lookups
CREATE INDEX idx_posts_quote_post_id ON public.posts(quote_post_id) WHERE quote_post_id IS NOT NULL;

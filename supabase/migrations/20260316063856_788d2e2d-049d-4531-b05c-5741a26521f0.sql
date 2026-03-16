
-- Table for "Show more like this" / "Show less like this" preferences
CREATE TABLE public.content_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  preference text NOT NULL CHECK (preference IN ('more', 'less')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.content_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own content preferences"
  ON public.content_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table for muted words & tags
CREATE TABLE public.muted_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, word)
);

ALTER TABLE public.muted_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own muted words"
  ON public.muted_words FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

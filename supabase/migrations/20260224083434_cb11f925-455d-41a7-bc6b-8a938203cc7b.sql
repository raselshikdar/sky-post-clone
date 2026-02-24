
-- Create interests table
CREATE TABLE public.interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interests viewable by everyone"
ON public.interests FOR SELECT
USING (true);

-- Create user_interests junction table
CREATE TABLE public.user_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, interest_id)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interests"
ON public.user_interests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interests"
ON public.user_interests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interests"
ON public.user_interests FOR DELETE
USING (auth.uid() = user_id);

-- Seed default interests
INSERT INTO public.interests (name) VALUES
  ('Comics'), ('Culture'), ('Education'), ('Software Dev'), ('Journalism'), ('Movies'),
  ('Music'), ('Nature'), ('News'), ('Photography'), ('Science'), ('Politics'),
  ('Sports'), ('Tech'), ('TV'), ('Writers'), ('Gaming'), ('Art'), ('Fashion'), ('Food');

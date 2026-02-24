
-- Create lists table
CREATE TABLE public.lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all lists" ON public.lists FOR SELECT USING (true);
CREATE POLICY "Users can create own lists" ON public.lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON public.lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON public.lists FOR DELETE USING (auth.uid() = user_id);

-- Create list_members table
CREATE TABLE public.list_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(list_id, user_id)
);

ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view list members" ON public.list_members FOR SELECT USING (true);
CREATE POLICY "List owners can add members" ON public.list_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.lists WHERE id = list_members.list_id AND user_id = auth.uid())
);
CREATE POLICY "List owners can remove members" ON public.list_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.lists WHERE id = list_members.list_id AND user_id = auth.uid())
);

-- Trigger for updated_at on lists
CREATE TRIGGER update_lists_updated_at
BEFORE UPDATE ON public.lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

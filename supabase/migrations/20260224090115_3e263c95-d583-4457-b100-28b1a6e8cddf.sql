
-- Muted conversations (per-user per-conversation muting)
CREATE TABLE public.muted_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);
ALTER TABLE public.muted_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own muted conversations" ON public.muted_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Message reactions
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check conversation membership for reactions
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id uuid, _message_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = _message_id
    AND (c.participant_1 = _user_id OR c.participant_2 = _user_id)
  )
$$;

CREATE POLICY "Users can react to messages in their conversations" ON public.message_reactions
  FOR ALL USING (public.is_conversation_member(auth.uid(), message_id))
  WITH CHECK (auth.uid() = user_id AND public.is_conversation_member(auth.uid(), message_id));

CREATE POLICY "Users can view reactions in their conversations" ON public.message_reactions
  FOR SELECT USING (public.is_conversation_member(auth.uid(), message_id));

-- Conversation deletions (soft delete per user)
CREATE TABLE public.conversation_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);
ALTER TABLE public.conversation_deletions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own deletions" ON public.conversation_deletions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Restricted accounts (messages go to request folder)
CREATE TABLE public.restricted_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  restricted_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, restricted_user_id)
);
ALTER TABLE public.restricted_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own restrictions" ON public.restricted_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add reply_to_id to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add disappear_after to conversations (seconds, null = never)
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS disappear_after integer;

-- Add encryption flag to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_encrypted boolean NOT NULL DEFAULT false;

-- Enable realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;


-- Add image_url and delivered status to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered boolean NOT NULL DEFAULT false;

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-images', 'chat-images', true, 512000)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat images
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Chat images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

CREATE POLICY "Users can delete own chat images"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow participants to update delivered/read status on messages in their conversations
-- (existing policy only allows sender to update, we need recipients too)
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "Users can update messages in their conversations"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

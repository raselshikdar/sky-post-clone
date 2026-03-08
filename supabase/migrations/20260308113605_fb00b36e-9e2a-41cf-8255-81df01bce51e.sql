-- Allow users to delete messages they sent
CREATE POLICY "Users can delete own messages"
ON public.messages FOR DELETE
USING (auth.uid() = sender_id);

-- Allow service role to delete expired messages (for cleanup function)
CREATE POLICY "Service role can delete expired messages"
ON public.messages FOR DELETE
TO service_role
USING (true);
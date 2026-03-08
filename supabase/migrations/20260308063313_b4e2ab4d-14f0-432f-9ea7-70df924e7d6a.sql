CREATE POLICY "Users can self-deactivate"
ON public.user_suspensions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND suspended_by = auth.uid() AND reason = 'Self-deactivated');
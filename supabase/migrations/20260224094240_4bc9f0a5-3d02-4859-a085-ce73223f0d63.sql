
-- Allow admins to manage feeds
CREATE POLICY "Admins can insert feeds" ON public.feeds
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update feeds" ON public.feeds
  FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete feeds" ON public.feeds
  FOR DELETE USING (public.is_admin(auth.uid()));


-- Create account_reports table for reporting user accounts
CREATE TABLE public.account_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT 'spam',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reporter_id, reported_user_id)
);

ALTER TABLE public.account_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create account reports"
ON public.account_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own account reports"
ON public.account_reports FOR SELECT
USING (auth.uid() = reporter_id);

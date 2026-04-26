-- Add suspension fields to verified_users
ALTER TABLE public.verified_users
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by uuid;

-- Allow staff to update verified_users (for suspend/unsuspend)
DROP POLICY IF EXISTS "Staff can update verified users" ON public.verified_users;
CREATE POLICY "Staff can update verified users"
ON public.verified_users
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Ensure users can see their own verified_users row (for suspension reason on /verification)
DROP POLICY IF EXISTS "Users can view own verified row" ON public.verified_users;
CREATE POLICY "Users can view own verified row"
ON public.verified_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

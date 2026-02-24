
-- Create verification_requests table for user applications
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'nid',
  document_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own requests
CREATE POLICY "Users can create verification requests"
ON public.verification_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own verification requests"
ON public.verification_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Staff can view all requests
CREATE POLICY "Staff can view all verification requests"
ON public.verification_requests FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can update requests (approve/reject)
CREATE POLICY "Staff can update verification requests"
ON public.verification_requests FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false);

-- Only the user can upload their own docs
CREATE POLICY "Users can upload verification docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Staff can view all verification docs
CREATE POLICY "Staff can view verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'verification-docs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_verification_requests_updated_at
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

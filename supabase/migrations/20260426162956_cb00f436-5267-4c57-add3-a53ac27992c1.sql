-- Ensure verification-docs bucket exists (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own verification documents
-- (path must start with their user id, e.g. "<uid>/filename.jpg")
DROP POLICY IF EXISTS "Users upload own verification docs" ON storage.objects;
CREATE POLICY "Users upload own verification docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own uploaded verification documents
DROP POLICY IF EXISTS "Users read own verification docs" ON storage.objects;
CREATE POLICY "Users read own verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow staff (admin/moderator) to read ALL verification documents
DROP POLICY IF EXISTS "Staff read all verification docs" ON storage.objects;
CREATE POLICY "Staff read all verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND public.is_staff(auth.uid())
);
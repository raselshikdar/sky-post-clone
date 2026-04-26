-- Allow staff (admins/moderators) to delete verification documents from storage
DROP POLICY IF EXISTS "Staff delete verification docs" ON storage.objects;
CREATE POLICY "Staff delete verification docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND public.is_staff(auth.uid())
);
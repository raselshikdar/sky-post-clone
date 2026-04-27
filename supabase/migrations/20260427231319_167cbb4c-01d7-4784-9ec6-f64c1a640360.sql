
ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_size integer;

-- Allow body to be empty when an attachment is present
ALTER TABLE public.support_ticket_messages
  ALTER COLUMN body DROP NOT NULL;

ALTER TABLE public.support_ticket_messages
  ADD CONSTRAINT support_msg_has_content
  CHECK (
    (body IS NOT NULL AND length(trim(body)) > 0)
    OR attachment_url IS NOT NULL
  );

-- Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: is the caller allowed to access files under this ticket folder?
-- Path layout: <ticket_id>/<filename>
CREATE OR REPLACE FUNCTION public.can_access_ticket_file(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id::text = split_part(_path, '/', 1)
      AND (t.user_id = auth.uid() OR public.is_staff(auth.uid()))
  );
$$;

-- RLS policies on storage.objects for this bucket
DROP POLICY IF EXISTS "support_attach_select" ON storage.objects;
DROP POLICY IF EXISTS "support_attach_insert" ON storage.objects;
DROP POLICY IF EXISTS "support_attach_delete" ON storage.objects;

CREATE POLICY "support_attach_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'support-attachments'
  AND public.can_access_ticket_file(name)
);

CREATE POLICY "support_attach_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'support-attachments'
  AND public.can_access_ticket_file(name)
);

CREATE POLICY "support_attach_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'support-attachments'
  AND public.can_access_ticket_file(name)
);

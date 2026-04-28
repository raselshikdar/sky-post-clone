ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'like'::text, 'repost'::text, 'follow'::text, 'reply'::text, 'mention'::text,
    'support_reply'::text,
    'verification_approved'::text, 'verification_rejected'::text,
    'verification_suspended'::text, 'verification_resumed'::text
  ]));
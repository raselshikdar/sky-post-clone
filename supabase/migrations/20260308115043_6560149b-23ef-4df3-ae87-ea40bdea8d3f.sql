ALTER TABLE public.live_status
ADD CONSTRAINT live_status_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
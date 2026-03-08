
-- Staff can update verification requests (may already exist, use IF NOT EXISTS pattern)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can update verification requests' AND tablename = 'verification_requests') THEN
    CREATE POLICY "Staff can update verification requests"
      ON public.verification_requests FOR UPDATE TO authenticated
      USING (public.is_staff(auth.uid()));
  END IF;
END $$;

-- Staff can manage verified users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can insert verified users' AND tablename = 'verified_users') THEN
    CREATE POLICY "Staff can insert verified users"
      ON public.verified_users FOR INSERT TO authenticated
      WITH CHECK (public.is_staff(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can delete verified users' AND tablename = 'verified_users') THEN
    CREATE POLICY "Staff can delete verified users"
      ON public.verified_users FOR DELETE TO authenticated
      USING (public.is_staff(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view verified users' AND tablename = 'verified_users') THEN
    CREATE POLICY "Staff can view verified users"
      ON public.verified_users FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

-- Admins can manage user_roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert roles' AND tablename = 'user_roles') THEN
    CREATE POLICY "Admins can insert roles"
      ON public.user_roles FOR INSERT TO authenticated
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete roles' AND tablename = 'user_roles') THEN
    CREATE POLICY "Admins can delete roles"
      ON public.user_roles FOR DELETE TO authenticated
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Staff can view all trending topic reports
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can view all topic reports' AND tablename = 'trending_topic_reports') THEN
    CREATE POLICY "Staff can view all topic reports"
      ON public.trending_topic_reports FOR SELECT TO authenticated
      USING (public.is_staff(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can delete topic reports' AND tablename = 'trending_topic_reports') THEN
    CREATE POLICY "Staff can delete topic reports"
      ON public.trending_topic_reports FOR DELETE TO authenticated
      USING (public.is_staff(auth.uid()));
  END IF;
END $$;

-- Staff can manage hashtags
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can delete hashtags' AND tablename = 'hashtags') THEN
    CREATE POLICY "Staff can delete hashtags"
      ON public.hashtags FOR DELETE TO authenticated
      USING (public.is_staff(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff can delete post_hashtags' AND tablename = 'post_hashtags') THEN
    CREATE POLICY "Staff can delete post_hashtags"
      ON public.post_hashtags FOR DELETE TO authenticated
      USING (public.is_staff(auth.uid()));
  END IF;
END $$;

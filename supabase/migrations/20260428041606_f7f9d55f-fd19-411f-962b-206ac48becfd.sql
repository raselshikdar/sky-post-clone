CREATE TABLE IF NOT EXISTS public.support_ticket_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ticket_id)
);

ALTER TABLE public.support_ticket_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ticket reads"
ON public.support_ticket_reads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own ticket reads"
ON public.support_ticket_reads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ticket reads"
ON public.support_ticket_reads FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_support_ticket_reads_user_ticket
  ON public.support_ticket_reads (user_id, ticket_id);
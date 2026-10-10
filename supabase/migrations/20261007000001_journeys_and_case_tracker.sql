-- Raasta journeys, case tracker honesty, source change tracking, daily rate-limit retention.

-- ---------------------------------------------------------------------------
-- 1. Saved journeys. Only IDs and the user's own progress are stored — never
--    facts. Facts are re-resolved from the verified knowledge layer at display
--    time, so a saved journey can never freeze a stale fee.
-- ---------------------------------------------------------------------------
CREATE TABLE public.journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id text NOT NULL CHECK (char_length(service_id) BETWEEN 1 AND 80),
  jurisdiction_id text NOT NULL CHECK (jurisdiction_id IN ('federal','ict','punjab','sindh','kp','balochistan')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  knowledge_version text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT journeys_answers_size CHECK (octet_length(answers::text) <= 4000),
  CONSTRAINT journeys_state_size CHECK (octet_length(state::text) <= 40000)
);

CREATE INDEX journeys_user_updated_idx ON public.journeys (user_id, updated_at DESC);

ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;

-- A user can only ever see or change their own journeys.
CREATE POLICY "own journeys select" ON public.journeys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own journeys insert" ON public.journeys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own journeys update" ON public.journeys FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own journeys delete" ON public.journeys FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_journey_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER journeys_touch BEFORE UPDATE ON public.journeys
  FOR EACH ROW EXECUTE FUNCTION public.touch_journey_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Case tracker. These rows are the user's PERSONAL record. Nothing here is
--    submitted to any government system, so "official status" is explicit and
--    defaults to "not connected".
-- ---------------------------------------------------------------------------
ALTER TABLE public.complaints
  ADD COLUMN personal_status text NOT NULL DEFAULT 'recorded'
    CHECK (personal_status IN ('recorded','follow_up_needed','waiting_for_response','escalated','resolved','closed')),
  ADD COLUMN official_reference text CHECK (official_reference IS NULL OR char_length(official_reference) <= 120),
  ADD COLUMN official_status text NOT NULL DEFAULT 'not_connected' CHECK (official_status IN ('not_connected')),
  ADD COLUMN jurisdiction_id text CHECK (jurisdiction_id IS NULL OR jurisdiction_id IN ('federal','ict','punjab','sindh','kp','balochistan')),
  ADD COLUMN official_portal_url text CHECK (official_portal_url IS NULL OR official_portal_url ~ '^https://'),
  ADD COLUMN evidence jsonb NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT complaints_evidence_size CHECK (octet_length(evidence::text) <= 8000);

-- Carry existing rows across without implying they were ever filed anywhere.
UPDATE public.complaints SET personal_status = CASE status
  WHEN 'resolved' THEN 'resolved'
  WHEN 'closed' THEN 'closed'
  ELSE 'recorded' END;

-- The legacy "status" column used wording ('submitted', 'under_review') that implied
-- an official filing. It is kept for compatibility but no longer shown or written by the app.
COMMENT ON COLUMN public.complaints.status IS 'LEGACY — do not display. Use personal_status.';
COMMENT ON COLUMN public.complaints.official_status IS 'Always not_connected until a real government integration exists.';

-- ---------------------------------------------------------------------------
-- 3. Source health: record content changes so a changed page is flagged for
--    HUMAN review. Automation never marks anything verified.
-- ---------------------------------------------------------------------------
ALTER TABLE public.source_health
  ADD COLUMN source_id text,
  ADD COLUMN agency_id text,
  ADD COLUMN jurisdiction_id text,
  ADD COLUMN content_hash text,
  ADD COLUMN content_changed boolean NOT NULL DEFAULT false,
  ADD COLUMN review_required boolean NOT NULL DEFAULT false;

CREATE INDEX source_health_source_checked_idx ON public.source_health (source_id, checked_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Daily rate-limit buckets must outlive the old 1-hour cleanup.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '2 days';
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO service_role;

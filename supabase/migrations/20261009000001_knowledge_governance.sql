-- Knowledge freshness & governance.
--
-- Pipeline: monitored source -> source check -> change detection -> candidate
-- -> human review -> versioned knowledge -> (date-driven) active value.
--
-- Security model: every table here is readable ONLY by knowledge admins
-- (and by the service role, which bypasses RLS). Nobody gets INSERT/UPDATE/
-- DELETE through the API: all writes happen in server functions that first
-- authorize the caller server-side. Published history and the audit log are
-- additionally protected from edits and deletes by triggers.

-- ---------------------------------------------------------------------------
-- 1. Admin allow-list. No client-visible policies: it is consulted server-side
--    (service role) and by is_knowledge_admin() inside RLS policies.
-- ---------------------------------------------------------------------------
CREATE TABLE public.app_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'knowledge_admin' CHECK (role IN ('knowledge_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_admins FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_knowledge_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.is_knowledge_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_knowledge_admin() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Immutability helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'knowledge history is append-only (% on %)', TG_OP, TG_TABLE_NAME;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Monitored source state. The registry (ids, urls, kinds, priorities) lives
--    in code; this table holds what monitoring has OBSERVED about each source.
--    reachable != changed != verified, so they are separate columns.
-- ---------------------------------------------------------------------------
CREATE TABLE public.knowledge_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  agency_id text,
  jurisdiction_id text,
  url text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('official-webpage','official-pdf','official-notification','official-form','official-api','other')),
  refresh_frequency text NOT NULL CHECK (refresh_frequency IN ('daily','weekly','monthly','manual')),
  monitoring text NOT NULL DEFAULT 'auto' CHECK (monitoring IN ('auto','manual')),
  is_official boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 4,
  verification_status text NOT NULL DEFAULT 'needs-review' CHECK (verification_status IN ('verified','needs-review','stale','unreachable','deprecated')),
  review_required boolean NOT NULL DEFAULT false,
  manual_only boolean NOT NULL DEFAULT false,
  manual_reason text,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_verified_at timestamptz,
  last_changed_at timestamptz,
  last_content_hash text,
  last_http_status integer,
  consecutive_failures integer NOT NULL DEFAULT 0,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. Source checks: reuse the existing source_health log.
-- ---------------------------------------------------------------------------
ALTER TABLE public.source_health
  ADD COLUMN final_url text,
  ADD COLUMN content_length integer,
  ADD COLUMN fetch_skipped_reason text;

ALTER TABLE public.source_health DROP CONSTRAINT IF EXISTS source_health_status_check;
ALTER TABLE public.source_health
  ADD CONSTRAINT source_health_status_check CHECK (status IN ('ok','error','timeout','skipped'));

-- Normalized text of the last reads, so changes can be compared and shown as
-- evidence. Admin-only: it is working data, not for the public status page.
CREATE TABLE public.source_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  check_id uuid,
  content_hash text NOT NULL,
  normalized_text text NOT NULL CHECK (char_length(normalized_text) <= 100000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX source_snapshots_source_idx ON public.source_snapshots (source_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Change candidates: PROPOSALS only. Nothing here is trusted knowledge.
-- ---------------------------------------------------------------------------
CREATE TABLE public.knowledge_change_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('value_change','source_change')),
  source_id text NOT NULL,
  service_id text,
  entity_id text,
  jurisdiction_id text,
  field text CHECK (field IS NULL OR field IN ('amount')),
  old_value numeric,
  proposed_value numeric,
  detected_at timestamptz NOT NULL DEFAULT now(),
  confidence numeric(3,2) NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  source_evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(source_evidence::text) <= 20000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','needs-investigation','scheduled','published','superseded','rolled-back')),
  extraction text NOT NULL DEFAULT 'none' CHECK (extraction IN ('ai','manual','fixture','none')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 2000),
  effective_from timestamptz,
  effective_until timestamptz,
  CONSTRAINT value_change_complete CHECK (kind <> 'value_change' OR (entity_id IS NOT NULL AND field IS NOT NULL AND proposed_value IS NOT NULL AND proposed_value > 0))
);
CREATE INDEX knowledge_candidates_status_idx ON public.knowledge_change_candidates (status, detected_at DESC);
CREATE INDEX knowledge_candidates_entity_idx ON public.knowledge_change_candidates (entity_id, field);

-- ---------------------------------------------------------------------------
-- 6. Versioned knowledge. v1 is the seeded baseline in code; rows here start
--    at version 2. Which version is active is computed from effective_from at
--    read time, so a scheduled change activates itself on its date.
-- ---------------------------------------------------------------------------
CREATE TABLE public.knowledge_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('fee')),
  entity_id text NOT NULL,
  field text NOT NULL CHECK (field IN ('amount')),
  version integer NOT NULL CHECK (version >= 2),
  value numeric NOT NULL CHECK (value > 0),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','rolled-back')),
  effective_from timestamptz,
  effective_until timestamptz,
  source_id text NOT NULL,
  candidate_id uuid REFERENCES public.knowledge_change_candidates(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  rolled_back_at timestamptz,
  rolled_back_by uuid,
  rollback_reason text CHECK (rollback_reason IS NULL OR char_length(rollback_reason) <= 2000),
  UNIQUE (entity_id, field, version)
);
CREATE INDEX knowledge_versions_entity_idx ON public.knowledge_versions (entity_id, field, version DESC);

-- Published history can only change by being rolled back — never edited, never deleted.
CREATE OR REPLACE FUNCTION public.guard_version_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entity_id IS DISTINCT FROM OLD.entity_id OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.field IS DISTINCT FROM OLD.field OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.value IS DISTINCT FROM OLD.value OR NEW.source_id IS DISTINCT FROM OLD.source_id
     OR NEW.effective_from IS DISTINCT FROM OLD.effective_from OR NEW.candidate_id IS DISTINCT FROM OLD.candidate_id
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'published knowledge versions are immutable; roll back instead of editing';
  END IF;
  IF OLD.status = 'rolled-back' AND NEW.status <> 'rolled-back' THEN
    RAISE EXCEPTION 'a rolled-back version cannot be revived; publish a new version instead';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER knowledge_versions_guard BEFORE UPDATE ON public.knowledge_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_version_update();
CREATE TRIGGER knowledge_versions_no_delete BEFORE DELETE ON public.knowledge_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();
CREATE TRIGGER knowledge_candidates_no_delete BEFORE DELETE ON public.knowledge_change_candidates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();

-- ---------------------------------------------------------------------------
-- 7. Conflicts: two official sources disagree. A human decides.
-- ---------------------------------------------------------------------------
CREATE TABLE public.knowledge_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id text NOT NULL,
  field text NOT NULL,
  source_a text NOT NULL,
  value_a numeric NOT NULL,
  candidate_a uuid REFERENCES public.knowledge_change_candidates(id),
  source_b text NOT NULL,
  value_b numeric NOT NULL,
  candidate_b uuid REFERENCES public.knowledge_change_candidates(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 2000)
);
CREATE INDEX knowledge_conflicts_status_idx ON public.knowledge_conflicts (status, detected_at DESC);

-- ---------------------------------------------------------------------------
-- 8. Audit log: append-only. "Why is Raasta showing PKR 600?" is answerable
--    from this table. actor is a plain uuid (no FK) so deleting an admin
--    account can never rewrite history.
-- ---------------------------------------------------------------------------
CREATE TABLE public.knowledge_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor uuid,
  actor_kind text NOT NULL CHECK (actor_kind IN ('system','admin')),
  action text NOT NULL CHECK (action IN ('candidate_created','candidate_approved','candidate_rejected','candidate_needs_investigation','version_published','version_rolled_back','conflict_opened','conflict_resolved','source_flagged')),
  entity_id text,
  candidate_id uuid,
  version_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(details::text) <= 20000)
);
CREATE INDEX knowledge_audit_entity_idx ON public.knowledge_audit (entity_id, at DESC);
CREATE TRIGGER knowledge_audit_immutable BEFORE UPDATE OR DELETE ON public.knowledge_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();

-- ---------------------------------------------------------------------------
-- 9. Monitoring runs, for the dashboard ("last run" vs "last successful run").
-- ---------------------------------------------------------------------------
CREATE TABLE public.monitor_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','partial','failed')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 10. RLS: admin read-only through the API; no write policies exist at all.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['knowledge_sources','source_snapshots','knowledge_change_candidates','knowledge_versions','knowledge_conflicts','knowledge_audit','monitor_runs']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_knowledge_admin())', t || '_admin_read', t);
  END LOOP;
END $$;

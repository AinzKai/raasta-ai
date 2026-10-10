-- Security checks for RLS and governance triggers. Run against a database with
-- all migrations applied and Supabase's roles/auth stubbed (see scripts/test-sql.sh).
-- Every check prints PASS or raises an exception.
\set ON_ERROR_STOP on
SET client_min_messages = notice;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com');
INSERT INTO public.app_admins (user_id) VALUES ('00000000-0000-0000-0000-0000000000ad');

CREATE OR REPLACE FUNCTION pg_temp.as_user(uid text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', uid, false);
  EXECUTE 'SET ROLE authenticated';
END $$;

CREATE OR REPLACE FUNCTION pg_temp.expect_fail(stmt text, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
    RAISE EXCEPTION 'FAIL: % (statement succeeded)', label;
  EXCEPTION WHEN insufficient_privilege OR check_violation OR raise_exception OR integrity_constraint_violation THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS: %', label;
  END;
END $$;

-- ---- journeys: users only see and change their own ------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
INSERT INTO public.journeys (user_id, service_id, jurisdiction_id, title) VALUES ('00000000-0000-0000-0000-00000000000a', 'cnic', 'federal', 'Alice CNIC');
SELECT pg_temp.expect_fail($$INSERT INTO public.journeys (user_id, service_id, jurisdiction_id, title) VALUES ('00000000-0000-0000-0000-00000000000b','cnic','federal','forged')$$, 'user cannot insert a journey for another user');
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.journeys) <> 0 THEN RAISE EXCEPTION 'FAIL: bob can see alice journeys'; END IF;
  UPDATE public.journeys SET title = 'hacked';
  IF NOT EXISTS (SELECT 1) THEN NULL; END IF;
  RAISE NOTICE 'PASS: another user sees no journeys and updates affect nothing';
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT title FROM public.journeys LIMIT 1) <> 'Alice CNIC' THEN RAISE EXCEPTION 'FAIL: journey was modified by another user'; END IF;
END $$;

-- ---- knowledge tables: normal users locked out ------------------------------------
INSERT INTO public.knowledge_sources (id, name, url, source_type, refresh_frequency) VALUES ('s1','S1','https://example.gov.pk','official-webpage','daily');
INSERT INTO public.knowledge_change_candidates (id, kind, source_id, entity_id, field, old_value, proposed_value)
  VALUES ('11111111-1111-1111-1111-111111111111','value_change','s1','cnic.federal.fee.renewal-normal','amount',400,600);

SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.knowledge_change_candidates) <> 0 THEN RAISE EXCEPTION 'FAIL: normal user can read candidates'; END IF;
  IF (SELECT count(*) FROM public.knowledge_sources) <> 0 THEN RAISE EXCEPTION 'FAIL: normal user can read source state'; END IF;
  IF (SELECT count(*) FROM public.knowledge_audit) <> 0 THEN RAISE EXCEPTION 'FAIL: normal user can read audit'; END IF;
  RAISE NOTICE 'PASS: normal users read nothing from knowledge governance tables';
END $$;
SELECT pg_temp.expect_fail($$INSERT INTO public.app_admins (user_id) VALUES ('00000000-0000-0000-0000-00000000000a')$$, 'user cannot make themselves admin');
SELECT pg_temp.expect_fail($$INSERT INTO public.knowledge_versions (entity_type, entity_id, field, version, value, source_id, approved_by) VALUES ('fee','x','amount',2,1,'s1','00000000-0000-0000-0000-00000000000a')$$, 'user cannot publish a version');
SELECT pg_temp.expect_fail($$UPDATE public.knowledge_change_candidates SET status='approved'$$, 'user cannot approve a candidate');
SELECT pg_temp.expect_fail($$INSERT INTO public.knowledge_audit (actor_kind, action) VALUES ('admin','version_published')$$, 'user cannot write audit entries');
SELECT pg_temp.expect_fail($$SELECT public.is_knowledge_admin() FROM public.app_admins$$, 'user cannot list admins');

-- ---- admin: read-only through the API ----------------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.knowledge_change_candidates) <> 1 THEN RAISE EXCEPTION 'FAIL: admin cannot read candidates'; END IF;
  RAISE NOTICE 'PASS: admin can read candidates';
END $$;
SELECT pg_temp.expect_fail($$UPDATE public.knowledge_change_candidates SET status='approved'$$, 'even an admin cannot write through the API (writes go through audited server functions)');
SELECT pg_temp.expect_fail($$INSERT INTO public.knowledge_versions (entity_type, entity_id, field, version, value, source_id, approved_by) VALUES ('fee','x','amount',2,1,'s1','00000000-0000-0000-0000-0000000000ad')$$, 'admin cannot publish directly through the API');
RESET ROLE;

-- ---- service role: governance rules enforced by triggers & constraints -------------------------
INSERT INTO public.knowledge_versions (id, entity_type, entity_id, field, version, value, source_id, candidate_id, approved_by)
  VALUES ('22222222-2222-2222-2222-222222222222','fee','cnic.federal.fee.renewal-normal','amount',2,600,'s1','11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000ad');
SELECT pg_temp.expect_fail($$UPDATE public.knowledge_versions SET value = 999$$, 'a published version cannot be edited');
SELECT pg_temp.expect_fail($$DELETE FROM public.knowledge_versions$$, 'a published version cannot be deleted');
UPDATE public.knowledge_versions SET status='rolled-back', rolled_back_at=now(), rolled_back_by='00000000-0000-0000-0000-0000000000ad', rollback_reason='test';
SELECT pg_temp.expect_fail($$UPDATE public.knowledge_versions SET status='published'$$, 'a rolled-back version cannot be revived');
SELECT pg_temp.expect_fail($$DELETE FROM public.knowledge_change_candidates$$, 'candidates (evidence) cannot be deleted');
SELECT pg_temp.expect_fail($$INSERT INTO public.knowledge_versions (entity_type, entity_id, field, version, value, source_id, approved_by) VALUES ('fee','x','amount',1,5,'s1','00000000-0000-0000-0000-0000000000ad')$$, 'version 1 is reserved for the seeded baseline');
SELECT pg_temp.expect_fail($$INSERT INTO public.knowledge_change_candidates (kind, source_id) VALUES ('value_change','s1')$$, 'a value change must name an entity, field and value');
INSERT INTO public.knowledge_audit (actor_kind, action, entity_id) VALUES ('system','candidate_created','x');
SELECT pg_temp.expect_fail($$UPDATE public.knowledge_audit SET action='source_flagged'$$, 'audit log cannot be edited');
SELECT pg_temp.expect_fail($$DELETE FROM public.knowledge_audit$$, 'audit log cannot be deleted');
-- deleting an admin account must not rewrite history
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-0000000000ad';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.knowledge_versions) <> 1 THEN RAISE EXCEPTION 'FAIL: history lost on admin deletion'; END IF;
  RAISE NOTICE 'PASS: deleting an admin account preserves version history';
END $$;

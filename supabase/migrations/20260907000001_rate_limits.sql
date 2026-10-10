-- Rate limiting for AI-calling endpoints (chat, document check). Backed by a
-- table rather than in-memory state because the deploy target is Cloudflare
-- Workers, where each request may run in a fresh isolate with no shared
-- memory between invocations.

CREATE TABLE public.rate_limits (
  bucket_key text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- RLS enabled with zero policies granted to anon/authenticated: only the
-- service-role client (server-side only, see client.server.ts) can touch
-- this table. This table holds no user data, only IP+endpoint+time-bucket
-- counters.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomically increments (or creates) a bucket's counter and returns the new
-- count. A single INSERT ... ON CONFLICT statement avoids the race condition
-- a select-then-update approach would have under concurrent requests.
CREATE OR REPLACE FUNCTION public.increment_rate_limit(p_bucket_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits (bucket_key, request_count)
  VALUES (p_bucket_key, 1)
  ON CONFLICT (bucket_key)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(text) TO service_role;

-- Opportunistic cleanup of old buckets — called with low probability from
-- the app on each request rather than requiring a cron job.
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 hour';
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO service_role;

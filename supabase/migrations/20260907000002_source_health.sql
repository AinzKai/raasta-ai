-- Tracks source-link health checks for the knowledge base.
-- Only the service_role can write; anon/authenticated can read for the
-- status page dashboard.

CREATE TABLE public.source_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_slug TEXT NOT NULL,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'timeout')),
  http_status INTEGER,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT
);

ALTER TABLE public.source_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read source_health" ON public.source_health
  FOR SELECT TO anon, authenticated USING (true);

-- Only service_role (cron jobs, admin operations) can insert/update.
GRANT INSERT, UPDATE ON public.source_health TO service_role;

CREATE INDEX source_health_slug_idx ON public.source_health (service_slug, checked_at DESC);

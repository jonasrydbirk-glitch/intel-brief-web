-- Background-job store for long-running brief generation.
-- Run this once against your Supabase project (SQL Editor).

CREATE TABLE IF NOT EXISTS brief_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',   -- pending | running | complete | error
  result       JSONB,                             -- BriefPayload on success
  error        TEXT,                               -- error message on failure
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for polling queries
CREATE INDEX IF NOT EXISTS idx_brief_jobs_status ON brief_jobs (status);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_brief_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brief_jobs_updated_at ON brief_jobs;
CREATE TRIGGER trg_brief_jobs_updated_at
  BEFORE UPDATE ON brief_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_brief_jobs_updated_at();

-- Clean up old jobs (older than 24 hours) — run periodically or via pg_cron
-- DELETE FROM brief_jobs WHERE created_at < NOW() - INTERVAL '24 hours';

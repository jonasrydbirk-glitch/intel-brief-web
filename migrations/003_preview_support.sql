-- Preview job support: onboarding flow generates a single-story preview before signup.
-- Also adds onboarding_complete flag to subscribers so Warden skips partial rows.

-- 1. Extend brief_jobs with job type and preview subject
ALTER TABLE brief_jobs
  ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'full_brief';

ALTER TABLE brief_jobs
  ADD COLUMN IF NOT EXISTS preview_subject TEXT;

-- Index to help Warden's status + type polling query
CREATE INDEX IF NOT EXISTS idx_brief_jobs_status_type
  ON brief_jobs (status, job_type);

-- 2. Rate-limit table for preview generation (keyed by IP + 1-hour window)
CREATE TABLE IF NOT EXISTS preview_rate_limits (
  ip            TEXT        NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  request_count INTEGER     NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_start)
);

-- 3. Track whether a subscriber has completed onboarding
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark every existing subscriber as already done so Warden keeps sending their briefs
UPDATE subscribers
  SET onboarding_complete = TRUE
  WHERE onboarding_complete = FALSE;

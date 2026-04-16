-- Migration 007: Add scheduled_delivery_at to brief_jobs
-- Supports pre-generation of briefs 30 minutes before the subscriber's
-- scheduled delivery time.  The Warden scan() creates a "pending" job
-- with this field set; processJobQueue() generates the brief and stores
-- it as "ready_to_send"; deliveryLoop() sends the email when the time
-- arrives (scheduled_delivery_at <= now()).
--
-- Status flow with this column:
--   pending → processing → ready_to_send → delivered | error
--
-- Jobs without this column (legacy website-poll flow):
--   pending → processing → complete | delivered | error   (unchanged)

ALTER TABLE brief_jobs
  ADD COLUMN IF NOT EXISTS scheduled_delivery_at TIMESTAMPTZ;

-- Index for the delivery loop query: ready_to_send WHERE scheduled_delivery_at <= now()
CREATE INDEX IF NOT EXISTS idx_brief_jobs_delivery
  ON brief_jobs (status, scheduled_delivery_at)
  WHERE status = 'ready_to_send';

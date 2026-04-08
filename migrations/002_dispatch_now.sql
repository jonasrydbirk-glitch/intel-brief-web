-- Add dispatch_now flag for JET (Just Email Today) one-button dispatch.
-- When true, the Warden runs the full pipeline: generate + PDF + email.

ALTER TABLE brief_jobs
  ADD COLUMN IF NOT EXISTS dispatch_now BOOLEAN NOT NULL DEFAULT FALSE;

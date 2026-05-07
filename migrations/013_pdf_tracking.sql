-- Migration 013: Tracked PDF download links + email-open pixel
--
-- Replaces the practice of attaching the brief PDF to outgoing email.  The
-- PDF is now stored on the brief_jobs row and served via a signed-URL API
-- route (HMAC-of-job-id).  The email contains a "View Your Intelligence
-- Brief" button plus a 1×1 tracking pixel — both routes log into the
-- counter columns below.
--
-- Storage choice: TEXT (base64).  The Supabase JS client handles bytea
-- awkwardly (returns "\x..." hex strings via REST), and we already have
-- the base64 form in hand at write time (from pdfBuffer.toString("base64")).
-- Typical brief PDFs are 200–800 KB base64 — well within Postgres TEXT
-- comfort, and JSONB rows on the same table already routinely exceed 1 MB.

ALTER TABLE brief_jobs
  ADD COLUMN IF NOT EXISTS pdf_base64          TEXT,
  ADD COLUMN IF NOT EXISTS pdf_filename        TEXT,
  ADD COLUMN IF NOT EXISTS email_opened_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_open_count    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdf_downloaded_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_download_count  INT NOT NULL DEFAULT 0;

-- Atomic-increment helpers — avoid read-modify-write races when multiple
-- pixel/PDF requests fire near-simultaneously (e.g. a recipient opens the
-- email twice in two clients within the same second).  RETURN void so
-- the caller doesn't need to read a result row.

CREATE OR REPLACE FUNCTION increment_email_open(p_job_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE brief_jobs
     SET email_open_count = email_open_count + 1,
         email_opened_at  = COALESCE(email_opened_at, NOW())
   WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_pdf_download(p_job_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE brief_jobs
     SET pdf_download_count = pdf_download_count + 1,
         pdf_downloaded_at  = COALESCE(pdf_downloaded_at, NOW())
   WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

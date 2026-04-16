-- Phase 2 Part B — Quality gates: cross-day dedup + URL verification log
-- Run order: after migrations 001–005
--
-- Two new tables:
--   sent_articles       — cross-day dedup: tracks which URLs were included in
--                         each subscriber's briefs so the same article is
--                         never sent twice within a 7-day window.
--   url_verification_log — records every HEAD/GET liveness check performed
--                          during brief generation. Used by the health
--                          dashboard to surface per-source dead-link rates.

-- ────────────────────────────────────────────────────────────────────────────
-- sent_articles
-- One row per (subscriber, url). Updated to latest sent_at on upsert so the
-- recency window always reflects the most recent delivery.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sent_articles (
  subscriber_id TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (subscriber_id, url)
);

CREATE INDEX IF NOT EXISTS idx_sent_articles_subscriber_sent
  ON sent_articles (subscriber_id, sent_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- url_verification_log
-- One row per URL per brief-generation run.
-- status values:
--   'alive'         — 2xx response (or 5xx/timeout — treated as alive)
--   'dead_4xx'      — 4xx response (except 403, which triggers GET fallback)
--   'paywall_skip'  — known paywall domain, verification skipped
--   'error'         — unexpected exception during check
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS url_verification_log (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  url         TEXT        NOT NULL,
  source_name TEXT,                               -- NULL until mapped from library
  status      TEXT        NOT NULL,               -- see above
  status_code INT,                                -- HTTP status code, if obtained
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_url_verification_log_checked_at
  ON url_verification_log (checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_url_verification_log_status
  ON url_verification_log (status);

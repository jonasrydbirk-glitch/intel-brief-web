-- Migration 008: Warden heartbeat table
--
-- Single-row-per-service liveness table.  Warden upserts service='warden'
-- every 5 minutes.  /api/health reads this to determine whether the engine
-- is alive and returns 200 or 503 accordingly.
--
-- Single primary key on service means there is exactly one row per engine
-- process; subsequent upserts update the existing row in place (no growth).

CREATE TABLE IF NOT EXISTS heartbeats (
  service  TEXT        PRIMARY KEY,
  last_beat TIMESTAMPTZ NOT NULL,
  metadata JSONB       NOT NULL DEFAULT '{}'::jsonb
);

-- Optional: RLS is not needed here — Warden uses the service key (bypasses
-- RLS) and /api/health also uses the service key.  Public access is NOT
-- granted; external monitors should use /api/health, not query Supabase
-- directly.

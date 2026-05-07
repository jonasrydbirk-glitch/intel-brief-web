-- Migration 013: subscribers.market_pulse_metrics
--
-- Adds a JSONB array of curated maritime market metric IDs that the
-- subscriber wants surfaced in the Market Pulse table of their daily brief.
-- Metric IDs are defined in lib/market-metrics.ts (single source of truth).
--
-- Defaults to []. An empty array means "no curated selection" — the
-- Architect falls back to the legacy behaviour (AI picks based on the
-- free-text dataToTrack field on modules.marketPulse).
--
-- Run once against your Supabase project (SQL Editor → Run).

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS "market_pulse_metrics" JSONB NOT NULL DEFAULT '[]'::jsonb;

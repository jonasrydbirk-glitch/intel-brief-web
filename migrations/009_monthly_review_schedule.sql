-- Migration 009: Monthly review delivery schedule
--
-- Adds per-subscriber monthly review day and time columns.
-- monthlyReviewDay: TEXT to accommodate both integer day-of-month values
--   (e.g. "18") and the special keyword "last" (last day of each month).
-- monthlyReviewTime: TEXT, HH:MM format, e.g. "08:00".
--
-- Run once against your Supabase project (SQL Editor → Run).

ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS "monthlyReviewDay" TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS "monthlyReviewTime" TEXT;

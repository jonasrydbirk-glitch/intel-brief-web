-- Migration 010: Rename lowercase monthly review columns to camelCase
--
-- Migration 009 created monthlyreviewday / monthlyreviewtime without quoted
-- identifiers, so PostgreSQL folded them to lowercase.  All application code
-- references the camelCase names ("monthlyReviewDay", "monthlyReviewTime"),
-- matching every other camelCase column on this table (deliveryTime, etc.).
--
-- Run once against your Supabase project (SQL Editor → Run).

ALTER TABLE subscribers RENAME COLUMN monthlyreviewday  TO "monthlyReviewDay";
ALTER TABLE subscribers RENAME COLUMN monthlyreviewtime TO "monthlyReviewTime";

-- Migration 012: make feedback.user_id nullable
--
-- The original feedback table had user_id TEXT NOT NULL, created before the
-- subscriber-based feedback system. The new brief-feedback flow uses subscriber_id
-- instead; user_id is no longer populated. This makes the column nullable so
-- INSERTs from the new flow don't fail with a NOT NULL constraint violation.

ALTER TABLE feedback ALTER COLUMN user_id DROP NOT NULL;

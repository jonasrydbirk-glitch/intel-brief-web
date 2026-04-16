-- Phase 2 Part A Step 3 — Semantic search function for intelligence_items
-- Run order: after migrations 001–004
--
-- Creates a PostgreSQL function that wraps the pgvector cosine-similarity
-- search so the Supabase JS client can call it via .rpc('match_intelligence_items').
--
-- PREREQUISITE: pgvector must be enabled (done in migration 004).
-- Safe to re-run — CREATE OR REPLACE is idempotent.

CREATE OR REPLACE FUNCTION match_intelligence_items(
  query_embedding vector(1536),
  match_count     int     DEFAULT 10,
  max_age_days    int     DEFAULT NULL
)
RETURNS TABLE (
  id           text,
  source_type  text,
  source_name  text,
  url          text,
  title        text,
  snippet      text,
  raw_text     text,
  published_at timestamptz,
  ingested_at  timestamptz,
  metadata     jsonb,
  similarity   double precision
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    source_type,
    source_name,
    url,
    title,
    snippet,
    raw_text,
    published_at,
    ingested_at,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM intelligence_items
  WHERE
    embedding IS NOT NULL
    AND (
      max_age_days IS NULL
      OR published_at >= now() - (max_age_days::text || ' days')::interval
    )
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

/**
 * Semantic search over the intelligence_items library using pgvector.
 *
 * Calls the `match_intelligence_items` PostgreSQL function (created in
 * migrations/005_semantic_search_fn.sql) which uses cosine distance
 * (embedding <=> query_embedding) for nearest-neighbour lookup.
 *
 * Usage:
 *   const results = await searchLibrary("LNG drydock China", {
 *     db: supabaseAdmin,
 *     limit: 10,
 *     maxAgeDays: 30,
 *   });
 *
 * Returns [] if the query cannot be embedded (API failure) or if the DB
 * RPC fails — never throws.
 *
 * NOTE: Not yet wired into brief-generator.ts — that's Phase 2 Step 4.
 * This module exposes the helper so Step 4 can import it directly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "../embeddings/openai";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface IntelligenceItem {
  id: string;
  source_type: string;
  source_name: string;
  url: string;
  title: string;
  snippet: string | null;
  raw_text: string | null;
  published_at: string | null;
  ingested_at: string;
  metadata: Record<string, unknown>;
  /** Cosine similarity score in [0, 1]. Higher = more relevant. */
  similarity: number;
}

// ---------------------------------------------------------------------------
// searchLibrary
// ---------------------------------------------------------------------------

/**
 * Embed `query` and return the most semantically similar intelligence items.
 *
 * @param query      Natural-language search string, e.g. "LNG drydock China"
 * @param opts.db    Supabase client (service-role recommended for full access)
 * @param opts.limit Max results to return (default 10)
 * @param opts.maxAgeDays Only include items published within this many days
 *                        (default: no age filter)
 */
export async function searchLibrary(
  query: string,
  opts: {
    db: SupabaseClient;
    limit?: number;
    maxAgeDays?: number;
  }
): Promise<IntelligenceItem[]> {
  const embedding = await generateEmbedding(query);
  if (!embedding) {
    console.warn(`[Search] Could not embed query "${query.slice(0, 60)}" — returning empty.`);
    return [];
  }

  const { data, error } = await opts.db.rpc("match_intelligence_items", {
    query_embedding: embedding,
    match_count: opts.limit ?? 10,
    max_age_days: opts.maxAgeDays ?? null,
  });

  if (error) {
    console.warn(`[Search] match_intelligence_items RPC error: ${error.message}`);
    return [];
  }

  return (data ?? []) as IntelligenceItem[];
}

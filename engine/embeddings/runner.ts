/**
 * Embedding batch runner — generates and stores vector embeddings for
 * intelligence_items rows that have raw_text but no embedding yet.
 *
 * Each call to embedMissingItems():
 *   1. Queries intelligence_items WHERE embedding IS NULL AND raw_text IS NOT NULL
 *      (newest first, up to EMBEDDING_BATCH_SIZE rows)
 *   2. Builds an input string: title + snippet + raw_text[:6000]
 *      (stays well under the 8191-token limit of text-embedding-3-small)
 *   3. Calls generateEmbedding() — returns null on API failure
 *   4. On success: writes the 1536-dim vector to intelligence_items.embedding
 *   5. On failure: logs warning, leaves embedding NULL for next cycle
 *   6. Returns counts for the Warden log summary
 *
 * Items without raw_text are silently skipped — the extraction loop will
 * populate them and this runner will pick them up on a later cycle.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./openai";

const EMBEDDING_BATCH_SIZE = 20;

// How many raw_text chars to include in the embedding input.
// At ~4 chars/token, 6000 chars ≈ 1500 tokens.  With title + snippet
// prepended (~400 chars), total is well under the 8191-token model cap.
const RAW_TEXT_CHAR_LIMIT = 6_000;

// ---------------------------------------------------------------------------
// Row type for what we select
// ---------------------------------------------------------------------------

interface IntelItemRow {
  id: string;
  title: string;
  snippet: string | null;
  raw_text: string;
}

// ---------------------------------------------------------------------------
// embedMissingItems
// ---------------------------------------------------------------------------

export async function embedMissingItems(
  db: SupabaseClient,
  logFn: (level: "INFO" | "WARN" | "ERROR", msg: string) => void
): Promise<{ attempted: number; succeeded: number; failed: number }> {
  const { data, error: queryError } = await db
    .from("intelligence_items")
    .select("id, title, snippet, raw_text")
    .is("embedding", null)
    .not("raw_text", "is", null)
    .order("ingested_at", { ascending: false })
    .limit(EMBEDDING_BATCH_SIZE);

  if (queryError) {
    logFn(
      "WARN",
      `[Embeddings] Failed to query intelligence_items: ${queryError.message}`
    );
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  const rows = (data ?? []) as IntelItemRow[];
  if (rows.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const row of rows) {
    // Build embedding input: title + snippet + leading raw_text
    const parts: string[] = [row.title];
    if (row.snippet) parts.push(row.snippet);
    parts.push(row.raw_text.slice(0, RAW_TEXT_CHAR_LIMIT));
    const inputText = parts.join("\n\n");

    const vector = await generateEmbedding(inputText);

    if (!vector) {
      logFn(
        "WARN",
        `[Embeddings] ${row.title.slice(0, 60)} — embedding failed (will retry next cycle)`
      );
      failed++;
      continue;
    }

    const { error: updateErr } = await db
      .from("intelligence_items")
      .update({ embedding: JSON.stringify(vector) })
      .eq("id", row.id);

    if (updateErr) {
      logFn(
        "WARN",
        `[Embeddings] Failed to persist embedding for ${row.id}: ${updateErr.message}`
      );
      failed++;
    } else {
      logFn(
        "INFO",
        `[Embeddings] ${row.title.slice(0, 60)} — embedded (${vector.length} dims)`
      );
      succeeded++;
    }
  }

  return { attempted: rows.length, succeeded, failed };
}

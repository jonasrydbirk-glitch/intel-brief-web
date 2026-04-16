/**
 * Extraction runner — fetches full article text for intelligence_items rows
 * where raw_text is NULL, using Jina Reader.
 *
 * Each call to extractMissingTextBatch():
 *   1. Queries intelligence_items for rows where raw_text IS NULL
 *   2. Filters in JS: skips items with contentTier='headline_only', those
 *      that have already failed 3 times, and those retried within the last
 *      30 minutes (exponential cool-down without a scheduler)
 *   3. Calls Jina Reader for each eligible item (up to BATCH_SIZE per cycle)
 *   4. On success: writes raw_text, increments metadata.extraction_attempts
 *   5. On failure: bumps metadata.extraction_attempts, stores error string,
 *      sets metadata.last_extraction_at for the cool-down window
 *   6. Returns counts for the Warden log summary
 *
 * The metadata tracking fields written to intelligence_items.metadata:
 *   extraction_attempts:   number  (incremented on every attempt, success or fail)
 *   last_extraction_at:    string  (ISO timestamp of most recent attempt)
 *   extraction_error:      string  (last error message; cleared on success)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createJinaReader } from "./jina";

const EXTRACTION_BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3;
const RETRY_COOLDOWN_MS = 30 * 60 * 1_000; // 30 minutes

// ---------------------------------------------------------------------------
// Types for intelligence_items rows we select
// ---------------------------------------------------------------------------

interface IntelItemRow {
  id: string;
  url: string;
  title: string;
  ingested_at: string;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// extractMissingTextBatch
// ---------------------------------------------------------------------------

export async function extractMissingTextBatch(
  db: SupabaseClient,
  logFn: (level: "INFO" | "WARN" | "ERROR", msg: string) => void
): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  // Fetch a wider window than BATCH_SIZE to account for items we'll filter
  // out (headline_only, max attempts reached, within cool-down).
  const { data, error: queryError } = await db
    .from("intelligence_items")
    .select("id, url, title, ingested_at, metadata")
    .is("raw_text", null)
    .order("ingested_at", { ascending: false })
    .limit(EXTRACTION_BATCH_SIZE * 5);

  if (queryError) {
    logFn(
      "WARN",
      `[Extraction] Failed to query intelligence_items: ${queryError.message}`
    );
    return { attempted: 0, succeeded: 0, failed: 0, skipped: 0 };
  }

  const rows = (data ?? []) as IntelItemRow[];
  if (rows.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, skipped: 0 };
  }

  const now = Date.now();

  // ---------------------------------------------------------------------------
  // Partition rows into eligible / skipped
  // ---------------------------------------------------------------------------

  let skipped = 0;
  const eligible: IntelItemRow[] = [];

  for (const row of rows) {
    const meta = row.metadata ?? {};

    // Skip headline_only tier — paywall content, Jina would return garbage
    if (meta.contentTier === "headline_only") {
      skipped++;
      continue;
    }

    // Skip if we've already hit the max attempt ceiling
    const attempts = Number(meta.extraction_attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      skipped++;
      continue;
    }

    // Skip if we're within the retry cool-down window
    const lastAt = meta.last_extraction_at as string | undefined;
    if (lastAt) {
      const elapsed = now - new Date(lastAt).getTime();
      if (elapsed < RETRY_COOLDOWN_MS) {
        skipped++;
        continue;
      }
    }

    eligible.push(row);
    if (eligible.length >= EXTRACTION_BATCH_SIZE) break;
  }

  if (eligible.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, skipped };
  }

  const jina = createJinaReader();
  let succeeded = 0;
  let failed = 0;

  for (const row of eligible) {
    const meta = row.metadata ?? {};
    const attempts = Number(meta.extraction_attempts ?? 0);
    const attemptAt = new Date().toISOString();

    const result = await jina.fetch(row.url, logFn);

    if ("error" in result) {
      // Extraction failed — bump attempts, record error, update cool-down
      const updatedMeta: Record<string, unknown> = {
        ...meta,
        extraction_attempts: attempts + 1,
        last_extraction_at: attemptAt,
        extraction_error: result.error,
      };

      const { error: updateErr } = await db
        .from("intelligence_items")
        .update({ metadata: updatedMeta })
        .eq("id", row.id);

      if (updateErr) {
        logFn(
          "WARN",
          `[Extraction] Failed to update error metadata for ${row.id}: ${updateErr.message}`
        );
      }

      logFn(
        "WARN",
        `[Extraction] ${row.title.slice(0, 60)} — FAILED (attempt ${
          attempts + 1
        }/${MAX_ATTEMPTS}): ${result.error}`
      );

      failed++;
    } else {
      // Extraction succeeded — write raw_text, bump attempts, clear error
      const updatedMeta: Record<string, unknown> = {
        ...meta,
        extraction_attempts: attempts + 1,
        last_extraction_at: attemptAt,
        extraction_error: null,
      };

      const { error: updateErr } = await db
        .from("intelligence_items")
        .update({
          raw_text: result.content,
          metadata: updatedMeta,
        })
        .eq("id", row.id);

      if (updateErr) {
        logFn(
          "WARN",
          `[Extraction] Failed to persist raw_text for ${row.id}: ${updateErr.message}`
        );
        failed++;
      } else {
        logFn(
          "INFO",
          `[Extraction] ${row.title.slice(0, 60)} — OK (${
            result.content.length
          } chars)`
        );
        succeeded++;
      }
    }
  }

  return { attempted: eligible.length, succeeded, failed, skipped };
}

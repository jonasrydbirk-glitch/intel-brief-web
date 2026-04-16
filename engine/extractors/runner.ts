/**
 * Extraction runner — fetches full article text for intelligence_items rows
 * where raw_text is NULL, using Jina Reader.
 *
 * Each call to extractMissingTextBatch():
 *   1. Queries intelligence_items for rows where raw_text IS NULL, excluding
 *      headline_only items at the DB level (so they never waste batch slots)
 *   2. Filters in JS: skips items that have already failed 3+ times, and
 *      those retried within the last 30 minutes (exponential cool-down)
 *   3. Calls Jina Reader for all eligible items in parallel waves
 *      (MAX_CONCURRENCY at a time, so we never spin >10 simultaneous requests)
 *   4. On success: writes raw_text, increments metadata.extraction_attempts
 *   5. On failure: bumps metadata.extraction_attempts, stores error string,
 *      sets metadata.last_extraction_at for the cool-down window
 *   6. Returns counts for the Warden log summary
 *
 * Throughput targets (at BATCH_SIZE=20, interval=30s, MAX_CONCURRENCY=10):
 *   - Two parallel waves of 10 = max-latency of one Jina request per wave
 *   - 2 cycles/min × 20 items/cycle = up to 40 extractions/min
 *   - Comfortably under Jina free-tier 100 RPM limit
 *
 * The metadata tracking fields written to intelligence_items.metadata:
 *   extraction_attempts:   number  (incremented on every attempt, success or fail)
 *   last_extraction_at:    string  (ISO timestamp of most recent attempt)
 *   extraction_error:      string  (last error message; cleared on success)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createJinaReader, JinaReader } from "./jina";

const EXTRACTION_BATCH_SIZE = 20;    // items per cycle (was 10)
const MAX_CONCURRENCY      = 10;    // max parallel Jina requests per wave
const MAX_ATTEMPTS         = 3;
const RETRY_COOLDOWN_MS    = 30 * 60 * 1_000; // 30 minutes

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
// Per-item extraction (used in parallel)
// ---------------------------------------------------------------------------

interface ExtractResult {
  ok: boolean;
}

async function extractOne(
  row: IntelItemRow,
  db: SupabaseClient,
  jina: JinaReader,
  logFn: (level: "INFO" | "WARN" | "ERROR", msg: string) => void
): Promise<ExtractResult> {
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

    return { ok: false };
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
      return { ok: false };
    }

    logFn(
      "INFO",
      `[Extraction] ${row.title.slice(0, 60)} — OK (${result.content.length} chars)`
    );
    return { ok: true };
  }
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
  // Fetch only extractable items. Fetch 3× batch to account for JS-side
  // cool-down and max-attempts filtering still needed.
  //
  // IMPORTANT — why we use .or() instead of .not() to exclude headline_only:
  //
  // PostgreSQL NULL semantics mean that:
  //   NOT (metadata->>'contentTier' = 'headline_only')
  // evaluates to NULL (not TRUE) when the contentTier key is absent from the
  // metadata JSON object — and PostgreSQL treats NULL as falsy in WHERE
  // clauses. Using .not("metadata->>contentTier", "eq", "headline_only")
  // therefore EXCLUDES every item that doesn't have an explicit contentTier
  // field, which is the vast majority of the library. This silently returns
  // zero rows and stalls extraction entirely.
  //
  // The correct predicate is: contentTier IS NULL OR contentTier != 'headline_only'
  // which correctly passes through items without the field.
  const { data, error: queryError } = await db
    .from("intelligence_items")
    .select("id, url, title, ingested_at, metadata")
    .is("raw_text", null)
    .or("metadata->>contentTier.is.null,metadata->>contentTier.neq.headline_only")
    .order("ingested_at", { ascending: false })
    .limit(EXTRACTION_BATCH_SIZE * 3);

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
  let hlSkipped = 0;  // headline_only items that leaked past the DB filter
  const eligible: IntelItemRow[] = [];

  for (const row of rows) {
    const meta = row.metadata ?? {};

    // Defence-in-depth: headline_only items are excluded by the DB query
    // (.or("...contentTier.is.null,...contentTier.neq.headline_only")), but
    // guard here too in case of metadata format variation (e.g. contentTier
    // stored as a number or boolean due to an old ingester bug).
    if (meta.contentTier === "headline_only") {
      hlSkipped++;
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

  if (hlSkipped > 0) {
    logFn(
      "WARN",
      `[Extraction] ${hlSkipped} headline_only item(s) bypassed DB filter — check ingester metadata format`
    );
  }

  if (eligible.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, skipped };
  }

  const jina = createJinaReader();
  let succeeded = 0;
  let failed = 0;

  // ---------------------------------------------------------------------------
  // Parallel extraction — process in waves of MAX_CONCURRENCY
  // With BATCH_SIZE=20 and MAX_CONCURRENCY=10 this runs 2 waves of 10.
  // Promise.allSettled ensures a single Jina failure never aborts the wave.
  // ---------------------------------------------------------------------------

  for (let i = 0; i < eligible.length; i += MAX_CONCURRENCY) {
    const wave = eligible.slice(i, i + MAX_CONCURRENCY);
    const results = await Promise.allSettled(
      wave.map((row) => extractOne(row, db, jina, logFn))
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value.ok) succeeded++;
        else failed++;
      } else {
        // Unexpected throw from extractOne — shouldn't happen, but count it
        logFn("ERROR", `[Extraction] Unexpected extractOne throw: ${r.reason}`);
        failed++;
      }
    }
  }

  return { attempted: eligible.length, succeeded, failed, skipped };
}

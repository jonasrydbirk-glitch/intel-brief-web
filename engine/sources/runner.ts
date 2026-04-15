/**
 * Ingestion runner — executes a single IntelSource and persists results to
 * Supabase.
 *
 * Each call to runIngestion():
 *   1. Opens an ingestion_runs audit row (started_at = now)
 *   2. Calls source.fetch() to get IntelItem[]
 *   3. Checks which URLs already exist in intelligence_items (dedup)
 *   4. Inserts only the new items in a single batch
 *   5. Closes the audit row (completed_at, counts)
 *   6. On any error: records the error in ingestion_runs, returns without
 *      throwing so one failing feed never blocks the others
 *
 * runAllIngestions() runs all registeredSources in parallel using
 * Promise.allSettled and logs a one-line summary.
 */

import { customAlphabet } from "nanoid";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IntelSource, registeredSources } from "./index";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  21
);

// ---------------------------------------------------------------------------
// Single-source ingestion
// ---------------------------------------------------------------------------

export async function runIngestion(
  source: IntelSource,
  db: SupabaseClient
): Promise<{ itemsFound: number; itemsNew: number; itemsSkipped: number; error?: string }> {
  const runId = nanoid();
  const startedAt = new Date().toISOString();

  // Open the audit row
  await db.from("ingestion_runs").insert({
    id: runId,
    source_type: source.source_type,
    source_name: source.name,
    started_at: startedAt,
  });

  let itemsFound = 0;
  let itemsNew = 0;
  let itemsSkipped = 0;
  let errorMsg: string | undefined;

  try {
    const items = await source.fetch();
    itemsFound = items.length;

    if (items.length > 0) {
      // Dedup: find which URLs already exist in the table
      const urls = items.map((i) => i.url);
      const { data: existingRows } = await db
        .from("intelligence_items")
        .select("url")
        .in("url", urls);

      const existingUrls = new Set((existingRows ?? []).map((r: { url: string }) => r.url));

      const newItems = items.filter((i) => !existingUrls.has(i.url));
      itemsSkipped = items.length - newItems.length;

      if (newItems.length > 0) {
        const rows = newItems.map((item) => ({
          id:           item.id,
          source_type:  item.source_type,
          source_name:  item.source_name,
          url:          item.url,
          title:        item.title,
          snippet:      item.snippet,
          published_at: item.published_at,
          metadata:     item.metadata,
          // raw_text and embedding are NULL until later pipeline steps
        }));

        const { error: insertError } = await db
          .from("intelligence_items")
          .insert(rows);

        if (insertError) {
          throw new Error(`Batch insert failed: ${insertError.message}`);
        }

        itemsNew = newItems.length;
      }
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  // Close the audit row
  await db.from("ingestion_runs").update({
    completed_at:  new Date().toISOString(),
    items_found:   itemsFound,
    items_new:     itemsNew,
    items_skipped: itemsSkipped,
    error:         errorMsg ?? null,
  }).eq("id", runId);

  return { itemsFound, itemsNew, itemsSkipped, error: errorMsg };
}

// ---------------------------------------------------------------------------
// Run all registered sources in parallel
// ---------------------------------------------------------------------------

export async function runAllIngestions(
  db: SupabaseClient,
  logFn: (level: "INFO" | "WARN" | "ERROR", msg: string) => void
): Promise<void> {
  if (registeredSources.length === 0) {
    logFn("WARN", "[Ingestion] No sources registered — skipping.");
    return;
  }

  const results = await Promise.allSettled(
    registeredSources.map((source) => runIngestion(source, db))
  );

  let totalNew = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let i = 0; i < results.length; i++) {
    const source = registeredSources[i];
    const result = results[i];

    if (result.status === "fulfilled") {
      const { itemsFound, itemsNew, itemsSkipped, error } = result.value;
      if (error) {
        logFn("WARN", `[Ingestion] ${source.name}: fetch error — ${error}`);
        totalFailed++;
      } else {
        logFn(
          "INFO",
          `[Ingestion] ${source.name}: found=${itemsFound} new=${itemsNew} skipped=${itemsSkipped}`
        );
        totalNew += itemsNew;
        totalSkipped += itemsSkipped;
      }
    } else {
      logFn(
        "ERROR",
        `[Ingestion] ${source.name}: unhandled rejection — ${String(result.reason)}`
      );
      totalFailed++;
    }
  }

  logFn(
    "INFO",
    `RSS ingestion complete: ${registeredSources.length} feeds · ${totalNew} new · ${totalSkipped} skipped · ${totalFailed} failed`
  );
}

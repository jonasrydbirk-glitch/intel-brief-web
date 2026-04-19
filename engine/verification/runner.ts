/**
 * IQsea URL Verification Runner — Phase 2 Part B, Build 3
 *
 * Runs parallel liveness checks on all source URLs in a BriefPayload.
 * Dead links (4xx) are removed from the brief before it reaches Scribe.
 * Results are logged to url_verification_log for the Intel Health dashboard.
 *
 * Usage (inside brief-generator.ts, after architectStage):
 *
 *   const verifiedBrief = await verifyBriefUrls(rawBrief, { db: supabaseAdmin });
 *
 * The `db` option is optional — if omitted, URLs are still verified and dead
 * links removed, but nothing is written to the DB (useful for tests).
 *
 * Concurrency: checks run in parallel batches of 8 to avoid overwhelming the
 * Node.js fetch pool or triggering rate limits on news sites.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BriefPayload, IntelItem } from "../brief-generator";
import { verifyUrl, VerifyResult } from "./urls";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RunnerOptions {
  /** Supabase admin client for writing to url_verification_log. Optional. */
  db?: SupabaseClient;
  /** Per-URL timeout in ms (default 8000) */
  timeoutMs?: number;
  /** Max parallel requests (default 8) */
  concurrency?: number;
}

interface RunnerSummary {
  checked: number;
  dead: number;
  skipped: number;
  errors: number;
}

// ---------------------------------------------------------------------------
// Parallel batch helper
// ---------------------------------------------------------------------------

async function runInBatches<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

// ---------------------------------------------------------------------------
// URL extraction helpers
// ---------------------------------------------------------------------------

function extractItemUrls(items: IntelItem[] | null | undefined): string[] {
  if (!items || items.length === 0) return [];
  return items
    .map((item) => item.source)
    .filter((url): url is string => !!url && /^https?:\/\/.+/.test(url));
}

function filterItemsByAliveUrls(
  items: IntelItem[] | null | undefined,
  aliveUrls: Set<string>
): IntelItem[] | null {
  if (!items) return null;
  const filtered = items.filter(
    (item) => !item.source || aliveUrls.has(item.source) || !/^https?:\/\/.+/.test(item.source)
  );
  return filtered.length > 0 ? filtered : null;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

/**
 * Verify all source URLs in a BriefPayload.
 * Dead links are removed from all sections. Results are logged to DB if
 * a Supabase client is provided.
 *
 * @returns A new BriefPayload with dead links removed, plus a summary object.
 */
export async function verifyBriefUrls(
  brief: BriefPayload,
  opts: RunnerOptions = {}
): Promise<{ brief: BriefPayload; summary: RunnerSummary }> {
  const { db, timeoutMs = 8_000, concurrency = 8 } = opts;

  // --- Collect all unique URLs across all sections ---
  const allUrls = new Set<string>();

  const addUrls = (items: IntelItem[] | null | undefined) => {
    extractItemUrls(items).forEach((url) => allUrls.add(url));
  };

  brief.sections.forEach((sec) => addUrls(sec.items));
  addUrls(brief.tenderSection);
  addUrls(brief.prospectSection);
  addUrls(brief.offDutySection);
  addUrls(brief.competitorTrackerSection);
  addUrls(brief.safetySection);
  addUrls(brief.monthlyProspectRollup);

  const urlList = Array.from(allUrls);

  if (urlList.length === 0) {
    return {
      brief,
      summary: { checked: 0, dead: 0, skipped: 0, errors: 0 },
    };
  }

  // --- Run parallel verification ---
  const results = await runInBatches(
    urlList,
    concurrency,
    (url) => verifyUrl(url, { timeoutMs })
  );

  // --- Build lookup: url → alive ---
  const aliveUrls = new Set<string>();
  const deadUrls = new Set<string>();

  let dead = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of results) {
    if (r.status === "paywall_skip") skipped++;
    else if (r.status === "error") errors++;
    else if (r.status === "dead_4xx") dead++;

    if (r.alive) {
      aliveUrls.add(r.url);
    } else {
      deadUrls.add(r.url);
    }
  }

  // --- Log to url_verification_log (best-effort, non-fatal) ---
  if (db && results.length > 0) {
    const checkedAt = new Date().toISOString();
    const rows = results.map((r: VerifyResult) => ({
      url: r.url,
      source_name: null as string | null,  // populated later by analytics
      status: r.status,
      status_code: r.statusCode ?? null,
      checked_at: checkedAt,
    }));

    try {
      await db.from("url_verification_log").insert(rows);
    } catch (err) {
      // Non-fatal — brief generation continues even if logging fails
      console.warn("[URLRunner] Failed to write url_verification_log:", err);
    }
  }

  // --- Filter dead links from all sections ---
  // Sections with no surviving items are removed entirely to avoid blank
  // section headers rendering in the HTML email and PDF.
  const filteredBrief: BriefPayload = {
    ...brief,
    sections: brief.sections
      .map((sec) => ({
        ...sec,
        items: (filterItemsByAliveUrls(sec.items, aliveUrls) ?? []),
      }))
      .filter((sec) => sec.items.length > 0),
    tenderSection:            filterItemsByAliveUrls(brief.tenderSection, aliveUrls),
    prospectSection:          filterItemsByAliveUrls(brief.prospectSection, aliveUrls),
    offDutySection:           filterItemsByAliveUrls(brief.offDutySection, aliveUrls),
    competitorTrackerSection: filterItemsByAliveUrls(brief.competitorTrackerSection, aliveUrls),
    safetySection:            filterItemsByAliveUrls(brief.safetySection, aliveUrls),
    monthlyProspectRollup:    filterItemsByAliveUrls(brief.monthlyProspectRollup, aliveUrls),
    // marketPulseSection and regulatoryCountdown don't use article URLs
  };

  const summary: RunnerSummary = {
    checked: urlList.length,
    dead,
    skipped,
    errors,
  };

  return { brief: filteredBrief, summary };
}

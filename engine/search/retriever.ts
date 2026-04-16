/**
 * Unified retrieval layer — library-first with Tavily gap-fill.
 *
 * Priority order:
 *   1. Semantic search over the local intelligence library (pgvector)
 *      filtered to the last `freshDays` days.
 *   2. If the library returns fewer than `gapFillThreshold` fresh hits AND
 *      TAVILY_API_KEY is configured → call Tavily for additional coverage.
 *   3. If Tavily is not configured (or also returns nothing) → fall back to
 *      the library WITHOUT a date filter (older content, marked !isFresh).
 *   4. If everything is empty → return { hits: [], source: "empty" }.
 *
 * This module creates its own Supabase client (lazy singleton) so it can be
 * called from any context without needing a client passed in.
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchLibrary } from "./semantic";
import { tavilySearch } from "./tavily";
import type { SearchHit } from "./types";
import type { IntelligenceItem } from "./semantic";

// ---------------------------------------------------------------------------
// Lazy Supabase client
// ---------------------------------------------------------------------------

let _db: SupabaseClient | null = null;

function getDb(): SupabaseClient {
  if (_db) return _db;
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  // Prefer service key for full access to intelligence_items without RLS
  const key =
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  _db = createClient(url, key, { auth: { persistSession: false } });
  return _db;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map an IntelligenceItem to the SearchHit shape the Architect expects. */
function toHit(item: IntelligenceItem): SearchHit {
  return {
    title: item.title,
    // Prefer the article snippet; fall back to the first 400 chars of raw text
    snippet: item.snippet ?? item.raw_text?.slice(0, 400) ?? "",
    url: item.url,
  };
}

/** Deduplicate SearchHit[] by URL, preserving order (first occurrence wins). */
function dedupeByUrl(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.url)) return false;
    seen.add(h.url);
    return true;
  });
}

// ---------------------------------------------------------------------------
// retrieveForQuery
// ---------------------------------------------------------------------------

export type RetrievalSource =
  | "library"
  | "library+tavily"
  | "tavily-only"
  | "empty";

export interface RetrievalResult {
  hits: SearchHit[];
  source: RetrievalSource;
  /** True when hits satisfy the freshDays date constraint (not stale fallback). */
  isFresh: boolean;
}

/**
 * Retrieve the best available intelligence for a search query.
 *
 * @param query                 Natural-language search string
 * @param opts.libraryLimit     Max items to fetch from the library (default 5)
 * @param opts.tavilyLimit      Max items to fetch from Tavily (default 3)
 * @param opts.freshDays        Recency window in days (default 7)
 * @param opts.gapFillThreshold Min fresh library hits before Tavily is called
 *                              (default 2 — call Tavily if library returns < 2)
 */
export async function retrieveForQuery(
  query: string,
  opts: {
    libraryLimit?:      number;
    tavilyLimit?:       number;
    freshDays?:         number;
    gapFillThreshold?:  number;
  } = {}
): Promise<RetrievalResult> {
  const {
    libraryLimit     = 5,
    tavilyLimit      = 3,
    freshDays        = 7,
    gapFillThreshold = 2,
  } = opts;

  const db = getDb();

  // ── Step 1: Library search with date filter ─────────────────────────────
  const freshItems = await searchLibrary(query, {
    db,
    limit:      libraryLimit,
    maxAgeDays: freshDays,
  });
  const freshHits = freshItems.map(toHit);

  // ── Step 2: Enough fresh library hits — no gap-fill needed ──────────────
  if (freshHits.length >= gapFillThreshold) {
    console.log(
      `[Retriever] "${query.slice(0, 60)}" → library (${freshHits.length} fresh hits)`
    );
    return { hits: freshHits, source: "library", isFresh: true };
  }

  // ── Step 3: Library insufficient — try Tavily gap-fill ─────────────────
  const tavilyKey = process.env.TAVILY_API_KEY ?? "";
  if (tavilyKey) {
    const tavilyHits = await tavilySearch(query, {
      maxResults: tavilyLimit,
      daysBack:   freshDays,
    });

    const combined = dedupeByUrl([...freshHits, ...tavilyHits]);

    if (combined.length > 0) {
      const source: RetrievalSource =
        freshHits.length > 0 ? "library+tavily" : "tavily-only";
      console.log(
        `[Retriever] "${query.slice(0, 60)}" → ${source} ` +
        `(library=${freshHits.length} tavily=${tavilyHits.length} combined=${combined.length})`
      );
      return { hits: combined, source, isFresh: true };
    }

    // Tavily also returned nothing — fall through to stale library
    console.log(
      `[Retriever] "${query.slice(0, 60)}" → Tavily returned 0, falling back to stale library`
    );
  }

  // ── Step 4: Stale fallback — library without date filter ────────────────
  const staleItems = await searchLibrary(query, { db, limit: libraryLimit });
  const staleHits  = staleItems.map(toHit);

  if (staleHits.length > 0) {
    console.log(
      `[Retriever] "${query.slice(0, 60)}" → library (stale, ${staleHits.length} hits, no date filter)`
    );
    return { hits: staleHits, source: "library", isFresh: false };
  }

  // ── Step 5: Everything empty ─────────────────────────────────────────────
  console.log(`[Retriever] "${query.slice(0, 60)}" → empty (no results from any source)`);
  return { hits: [], source: "empty", isFresh: false };
}

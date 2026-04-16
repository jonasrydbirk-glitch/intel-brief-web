/**
 * scripts/test-library-retrieval.ts
 *
 * End-to-end smoke test for the Phase 2 Step 4 retrieval pipeline.
 * Tests library-first semantic search + Tavily gap-fill across 3 queries.
 *
 * Safe to run any time — read-only, no database writes.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY),
 *           OPENROUTER_API_KEY (for embeddings), TAVILY_API_KEY (optional).
 *
 * Usage:
 *   npx tsx scripts/test-library-retrieval.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { retrieveForQuery } from "../engine/search/retriever";

const PASS  = "\x1b[32m✓\x1b[0m";
const FAIL  = "\x1b[31m✗\x1b[0m";
const WARN  = "\x1b[33m⚠\x1b[0m";
const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";

// ---------------------------------------------------------------------------
// Test queries
// Three scenarios covering expected library hits + Tavily fallback
// ---------------------------------------------------------------------------
const TEST_QUERIES = [
  {
    query:       "LNG drydocking China shipyard",
    description: "Should hit library — LNG content is well-represented",
  },
  {
    query:       "crude oil tankers Q2 2026 chartering rates VLCC",
    description: "Should hit library — tanker/freight content is core coverage",
  },
  {
    query:       "Faroese fishing trawler captain insurance dispute 2026",
    description: "Niche query — tests Tavily fallback (unlikely in library)",
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n${BOLD}IQsea Library Retrieval Smoke Test${RESET}`);
  console.log("Phase 2 Step 4 — library-first + Tavily gap-fill\n");

  // ── Pre-flight: check if any embeddings exist ──────────────────────────
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!supabaseUrl || !supabaseKey) {
    console.error(`${FAIL} Missing Supabase credentials — check .env`);
    process.exit(1);
  }

  const db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { count: embeddingCount, error: countErr } = await db
    .from("intelligence_items")
    .select("*", { count: "exact", head: true })
    .not("embedding", "is", null);

  if (countErr) {
    console.warn(`${WARN} Could not query intelligence_items: ${countErr.message}`);
    console.warn("  (Ensure migration 004 has been applied to your Supabase project)");
  }

  const hasEmbeddings = (embeddingCount ?? 0) > 0;

  if (!hasEmbeddings) {
    console.log(`${WARN} ${BOLD}Skipping library search tests — no embeddings found.${RESET}`);
    console.log(
      `\n  ${DIM}The intelligence_items table has 0 rows with embedding IS NOT NULL.${RESET}`
    );
    console.log(
      `  ${DIM}This means the Warden's embedding pipeline hasn't run yet on the Beelink,${RESET}`
    );
    console.log(
      `  ${DIM}or embeddings haven't been generated for ingested items.${RESET}`
    );
    console.log(
      `\n  To generate embeddings: ensure OPENROUTER_API_KEY is set and run:${RESET}`
    );
    console.log(`  ${DIM}  npx tsx engine/warden.ts --once${RESET}\n`);
  } else {
    console.log(
      `${PASS} Pre-flight: ${embeddingCount?.toLocaleString()} embedded items found in library\n`
    );
  }

  // Also show total items and Tavily key status
  const { count: totalCount } = await db
    .from("intelligence_items")
    .select("*", { count: "exact", head: true });

  const tavilyKey = process.env.TAVILY_API_KEY ?? "";
  console.log(
    `  ${DIM}Library: ${totalCount?.toLocaleString() ?? "?"} total items, ` +
    `${embeddingCount?.toLocaleString() ?? "?"} with embeddings${RESET}`
  );
  console.log(
    `  ${DIM}Tavily: ${tavilyKey ? `configured (key: ${tavilyKey.slice(0, 8)}...)` : "NOT configured (TAVILY_API_KEY missing)"}${RESET}`
  );
  console.log(
    `  ${DIM}OpenRouter: ${process.env.OPENROUTER_API_KEY ? "configured" : "NOT configured (embeddings will fail)"}${RESET}`
  );
  console.log();

  if (!hasEmbeddings && !tavilyKey) {
    console.log(
      `${WARN} Neither library embeddings nor Tavily are available. ` +
      `All queries will return empty results.`
    );
    console.log("Continuing anyway to verify graceful degradation...\n");
  }

  // ── Run test queries ───────────────────────────────────────────────────
  console.log("─".repeat(80));
  console.log(
    `${"Query".padEnd(48)} ${"Source".padEnd(16)} ${"Hits".padEnd(6)} Fresh`
  );
  console.log("─".repeat(80));

  const results = [];

  for (const { query, description } of TEST_QUERIES) {
    const t0 = Date.now();
    try {
      const result = await retrieveForQuery(query, {
        freshDays:        7,
        gapFillThreshold: 2,
        libraryLimit:     5,
        tavilyLimit:      3,
      });
      const elapsed = Date.now() - t0;

      const icon =
        result.source === "empty" ? WARN :
        result.hits.length > 0 ? PASS : FAIL;

      const truncatedQuery = query.length > 46 ? query.slice(0, 43) + "..." : query;
      console.log(
        `${icon} ${truncatedQuery.padEnd(47)} ${result.source.padEnd(16)} ` +
        `${String(result.hits.length).padEnd(6)} ${result.isFresh ? "yes" : "no"} ` +
        `${DIM}(${elapsed}ms)${RESET}`
      );

      results.push({ query, description, ...result, elapsed, ok: true });
    } catch (err) {
      console.log(
        `${FAIL} ${query.slice(0, 46).padEnd(47)} ${"error".padEnd(16)} ${"0".padEnd(6)} no`
      );
      results.push({
        query, description, hits: [], source: "error", isFresh: false,
        elapsed: Date.now() - t0, ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log("─".repeat(80));

  // ── Detailed view ──────────────────────────────────────────────────────
  console.log(`\n${BOLD}Detail:${RESET}\n`);
  for (const r of results) {
    console.log(`${BOLD}${r.query}${RESET}`);
    console.log(`  ${DIM}${r.description}${RESET}`);
    if (!r.ok) {
      console.log(`  ${FAIL} Error: ${r.error}`);
    } else if (r.hits.length === 0) {
      console.log(`  ${WARN} No results (source=${r.source})`);
    } else {
      const first = r.hits[0];
      console.log(`  Source:    ${r.source} (${r.isFresh ? "fresh" : "stale"} · ${r.elapsed}ms)`);
      console.log(`  Hits:      ${r.hits.length}`);
      console.log(`  First hit: ${first.title || "(no title)"}`);
      console.log(`  URL:       ${first.url}`);
      if (first.snippet) {
        const snippetPreview = first.snippet.slice(0, 120).replace(/\n/g, " ");
        console.log(`  Snippet:   ${DIM}${snippetPreview}...${RESET}`);
      }
    }
    console.log();
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const passing = results.filter((r) => r.ok && r.hits.length > 0).length;
  const empty   = results.filter((r) => r.ok && r.hits.length === 0).length;
  const errored = results.filter((r) => !r.ok).length;
  const libHits = results.filter((r) => r.source === "library").length;
  const mixHits = results.filter((r) => r.source === "library+tavily").length;
  const tavOnly = results.filter((r) => r.source === "tavily-only").length;

  console.log("─".repeat(80));
  console.log(
    `${BOLD}Summary:${RESET} ${passing} with results · ${empty} empty · ${errored} errors`
  );
  console.log(
    `${DIM}Sources: library=${libHits} library+tavily=${mixHits} tavily-only=${tavOnly}${RESET}`
  );
  console.log();

  if (!hasEmbeddings) {
    console.log(
      `${WARN} Note: library results were 0 because embeddings haven't been generated yet.\n` +
      `  Run the Warden on the Beelink and retry this test after embeddings are built.\n`
    );
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

/**
 * Smoke test — cross-day dedup (sent_articles table)
 *
 * Tests:
 *  1. INSERT a fake sent_article row for a test subscriber + URL
 *  2. Query it back and verify it appears
 *  3. UPSERT the same row (idempotency check)
 *  4. DELETE the test row (cleanup)
 *
 * Requires:
 *   SUPABASE_URL + (SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY) in .env
 *   migration 006_quality_gates.sql already run in Supabase
 *
 * Usage:
 *   npx tsx scripts/test-dedup.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_SUBSCRIBER_ID = "__smoke_test_dedup__";
const TEST_URL = "https://gcaptain.com/smoke-test-dedup-article";

async function main() {
  console.log("=== Dedup smoke test ===\n");

  // Step 1: clean up any previous test run
  await db
    .from("sent_articles")
    .delete()
    .eq("subscriber_id", TEST_SUBSCRIBER_ID);

  console.log("1. Cleared any stale test rows");

  // Step 2: insert a test row
  const { error: insertErr } = await db.from("sent_articles").insert({
    subscriber_id: TEST_SUBSCRIBER_ID,
    url: TEST_URL,
  });

  if (insertErr) {
    console.error("❌ INSERT failed:", insertErr.message);
    console.error("   Is migration 006_quality_gates.sql applied?");
    process.exit(1);
  }
  console.log("2. Inserted test row ✓");

  // Step 3: query it back
  const { data, error: selectErr } = await db
    .from("sent_articles")
    .select("subscriber_id, url, sent_at")
    .eq("subscriber_id", TEST_SUBSCRIBER_ID)
    .eq("url", TEST_URL);

  if (selectErr || !data || data.length === 0) {
    console.error("❌ SELECT failed:", selectErr?.message ?? "no rows returned");
    process.exit(1);
  }
  console.log("3. SELECT returned row ✓");
  console.log("   ", JSON.stringify(data[0]));

  // Step 4: upsert the same row (idempotency)
  const { error: upsertErr } = await db.from("sent_articles").upsert(
    { subscriber_id: TEST_SUBSCRIBER_ID, url: TEST_URL },
    { onConflict: "subscriber_id,url" }
  );
  if (upsertErr) {
    console.error("❌ UPSERT failed:", upsertErr.message);
    process.exit(1);
  }
  console.log("4. UPSERT (idempotency) ✓");

  // Step 5: 7-day window filter simulation
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000).toISOString();
  const { data: windowRows } = await db
    .from("sent_articles")
    .select("url")
    .eq("subscriber_id", TEST_SUBSCRIBER_ID)
    .gte("sent_at", sevenDaysAgo);

  const sentUrls = new Set((windowRows ?? []).map((r: { url: string }) => r.url));
  const mockHits = [
    { url: TEST_URL, title: "Test article", snippet: "..." },
    { url: "https://splash247.com/some-other-article", title: "Other", snippet: "..." },
  ];
  const filtered = mockHits.filter((h) => !sentUrls.has(h.url));

  console.log(`5. Dedup filter simulation: ${mockHits.length - filtered.length} filtered, ${filtered.length} passed through ✓`);

  // Cleanup
  await db
    .from("sent_articles")
    .delete()
    .eq("subscriber_id", TEST_SUBSCRIBER_ID);
  console.log("6. Cleanup ✓\n");

  console.log("=== All checks passed ✓ ===");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

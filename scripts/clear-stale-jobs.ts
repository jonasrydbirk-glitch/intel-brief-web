/**
 * One-time cleanup: cancel all stale pending/processing jobs.
 * Usage: npx tsx scripts/clear-stale-jobs.ts
 */
import "dotenv/config";
import { supabase } from "../lib/supabase";

async function main() {
  // 1. Show current state
  const { data: before, error: countErr } = await supabase
    .from("brief_jobs")
    .select("id, status, created_at")
    .in("status", ["pending", "processing"]);

  if (countErr) {
    console.error("Failed to query brief_jobs:", countErr.message);
    process.exit(1);
  }

  console.log(`Found ${before?.length ?? 0} stale job(s):`);
  for (const row of before ?? []) {
    console.log(`  ${row.id}  ${row.status}  ${row.created_at}`);
  }

  if (!before?.length) {
    console.log("Queue is already clean. Nothing to do.");
    process.exit(0);
  }

  // 2. Cancel them
  const { data: updated, error: updateErr } = await supabase
    .from("brief_jobs")
    .update({ status: "cancelled" })
    .in("status", ["pending", "processing"])
    .select("id, status");

  if (updateErr) {
    console.error("Failed to update:", updateErr.message);
    process.exit(1);
  }

  console.log(`\nCancelled ${updated?.length ?? 0} job(s).`);

  // 3. Verify queue is empty
  const { count, error: verifyErr } = await supabase
    .from("brief_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "processing"]);

  if (verifyErr) {
    console.error("Verification query failed:", verifyErr.message);
    process.exit(1);
  }

  console.log(`Remaining pending/processing jobs: ${count}`);
  console.log("Queue cleared successfully.");
}

main();

/**
 * Production cleanup: delete all subscribers except the two active accounts.
 * Ensures exactly one subscriber uses admin@iqsea.io.
 *
 * Usage: npx tsx scripts/clean-subscribers.ts
 */
import "dotenv/config";
import { supabase } from "../lib/supabase";

const KEEP_EMAILS = ["admin@iqsea.io", "atlas@iqsea.io"];

async function main() {
  // 1. List all subscribers
  const { data: all, error: listErr } = await supabase
    .from("subscribers")
    .select("id, email, fullName, companyName, created");

  if (listErr) {
    console.error("Failed to list subscribers:", listErr.message);
    process.exit(1);
  }

  console.log(`Total subscribers: ${all?.length ?? 0}`);
  for (const s of all ?? []) {
    const keep = KEEP_EMAILS.includes(s.email);
    console.log(`  ${keep ? "KEEP" : "DELETE"}  ${s.id}  ${s.email}  ${s.fullName ?? "—"}  ${s.companyName ?? "—"}`);
  }

  const toDelete = (all ?? []).filter((s) => !KEEP_EMAILS.includes(s.email));

  if (!toDelete.length) {
    console.log("\nNo subscribers to delete. Database is already clean.");
    process.exit(0);
  }

  // 2. Delete non-kept subscribers
  const ids = toDelete.map((s) => s.id);
  const { error: delErr } = await supabase
    .from("subscribers")
    .delete()
    .in("id", ids);

  if (delErr) {
    console.error("Failed to delete subscribers:", delErr.message);
    process.exit(1);
  }

  console.log(`\nDeleted ${toDelete.length} subscriber(s).`);

  // 3. Verify remaining
  const { data: remaining, error: verifyErr } = await supabase
    .from("subscribers")
    .select("id, email, fullName");

  if (verifyErr) {
    console.error("Verification failed:", verifyErr.message);
    process.exit(1);
  }

  console.log(`\nRemaining subscribers (${remaining?.length ?? 0}):`);
  for (const s of remaining ?? []) {
    console.log(`  ${s.id}  ${s.email}  ${s.fullName ?? "—"}`);
  }

  // 4. Verify exactly one admin@iqsea.io
  const adminCount = (remaining ?? []).filter((s) => s.email === "admin@iqsea.io").length;
  if (adminCount === 1) {
    console.log("\nVerified: exactly 1 subscriber with admin@iqsea.io.");
  } else {
    console.warn(`\nWARNING: Found ${adminCount} subscriber(s) with admin@iqsea.io (expected 1).`);
  }

  console.log("Database cleanup complete.");
}

main();

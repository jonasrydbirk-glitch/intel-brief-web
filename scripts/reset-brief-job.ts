/**
 * Reset a brief_jobs row back to pending so --once can re-claim it.
 *   npx tsx scripts/reset-brief-job.ts <jobId>
 */

import * as fs from "fs";
import * as path from "path";
import { config as dotenvConfig } from "dotenv";

function findEnvPath(): string | undefined {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, ".env");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

const envPath = findEnvPath();
if (envPath) dotenvConfig({ path: envPath });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main(): Promise<void> {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("usage: tsx scripts/reset-brief-job.ts <jobId>");
    process.exit(1);
  }
  const { data: before } = await supabase
    .from("brief_jobs")
    .select("id, status, result, error, updated_at")
    .eq("id", jobId)
    .single();
  console.log("before:", before?.status, "result?", !!before?.result, "error?", !!before?.error);

  const { error } = await supabase
    .from("brief_jobs")
    .update({ status: "pending", result: null, error: null, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) {
    console.error("reset failed:", error.message);
    process.exit(1);
  }

  const { data: after } = await supabase
    .from("brief_jobs")
    .select("id, status, dispatch_now, scheduled_delivery_at, updated_at")
    .eq("id", jobId)
    .single();
  console.log("after:", JSON.stringify(after));
}

main();

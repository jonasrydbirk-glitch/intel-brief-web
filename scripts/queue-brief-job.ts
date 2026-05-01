/**
 * Queue a JET-dispatch brief job for a subscriber, looked up by email.
 *
 *   npx tsx scripts/queue-brief-job.ts <email>
 *
 * Inserts a brief_jobs row with status=pending, dispatch_now=true, and NO
 * scheduled_delivery_at — so when Warden's processJobQueue() picks it up it
 * runs the legacy JET path: generate brief + render PDF + send email in a
 * single tick.  This is the path that works under `warden.ts --once`.
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
if (envPath) {
  dotenvConfig({ path: envPath });
  console.log(`[queue-brief-job] loaded env from ${envPath}`);
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[queue-brief-job] missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main(): Promise<void> {
  const email = (process.argv[2] || "jonasrydbirk@gmail.com").trim().toLowerCase();
  console.log(`[queue-brief-job] looking up subscriber by email: ${email}`);

  const { data: sub, error: subErr } = await supabase
    .from("subscribers")
    .select("id, email, fullName, onboarding_complete, paused")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (subErr) {
    console.error(`[queue-brief-job] subscriber lookup failed: ${subErr.message}`);
    process.exit(1);
  }
  if (!sub) {
    console.error(`[queue-brief-job] no subscriber found with email ${email}`);
    process.exit(1);
  }

  console.log(
    `[queue-brief-job] found ${sub.fullName} (${sub.id}) — ` +
      `onboarding_complete=${sub.onboarding_complete} paused=${sub.paused ?? false}`
  );

  if (!sub.onboarding_complete) {
    console.warn("[queue-brief-job] WARN: subscriber is not onboarding_complete — generation may fail.");
  }

  const { data: insertData, error: insertErr } = await supabase
    .from("brief_jobs")
    .insert({
      subscriber_id: sub.id,
      status: "pending",
      dispatch_now: true,
      // intentionally no scheduled_delivery_at — JET path (generate+send in one tick)
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error(`[queue-brief-job] insert failed: ${insertErr.message}`);
    process.exit(1);
  }

  console.log(`[queue-brief-job] queued job ${insertData.id} for ${sub.fullName}.`);
  console.log(`[queue-brief-job] next step: \`npx tsx engine/warden.ts --once\` from this worktree`);
}

main().catch((err) => {
  console.error("[queue-brief-job] unexpected:", err);
  process.exit(1);
});

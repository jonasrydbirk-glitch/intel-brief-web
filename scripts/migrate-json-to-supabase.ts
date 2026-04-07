/**
 * One-time migration script: reads all existing JSON subscriber files
 * from data/subscribers/ and uploads them to the Supabase 'subscribers' table.
 *
 * Usage:  npx tsx scripts/migrate-json-to-supabase.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  const dir = path.join(process.cwd(), "data", "subscribers");

  if (!fs.existsSync(dir)) {
    console.log("No data/subscribers/ directory found — nothing to migrate.");
    return;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("No JSON files found in data/subscribers/ — nothing to migrate.");
    return;
  }

  console.log(`Found ${files.length} subscriber file(s) to migrate.\n`);

  const profiles = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    return JSON.parse(raw);
  });

  // Upsert to avoid conflicts if re-run
  const { data, error } = await supabase
    .from("subscribers")
    .upsert(profiles, { onConflict: "id" });

  if (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }

  console.log(`Successfully migrated ${profiles.length} subscriber(s) to Supabase.`);
  if (data) console.log("Response:", data);
}

migrate();

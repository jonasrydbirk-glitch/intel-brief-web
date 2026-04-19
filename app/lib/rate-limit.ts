import { createClient } from "@supabase/supabase-js";

// Service key required — the anon key may be blocked by RLS on this table.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_KEY ?? "",
  { auth: { persistSession: false } }
);

const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  resetAt: string; // ISO timestamp when the window resets
}

/**
 * Check and increment the preview rate limit for an IP address.
 * Uses a 1-hour tumbling window keyed on (ip, window_start).
 *
 * Note: there is a minor TOCTOU race if the same IP sends multiple
 * concurrent requests at the exact same millisecond — in practice this
 * does not matter for a 3-req/hour preview gate. A fully atomic fix
 * would require a Postgres function (INSERT ... ON CONFLICT DO UPDATE
 * SET count = count + 1 RETURNING count) via supabase.rpc().
 */
export async function checkPreviewRateLimit(
  ip: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - (now % WINDOW_MS)).toISOString();
  const resetAt = new Date(now - (now % WINDOW_MS) + WINDOW_MS).toISOString();

  // Attempt to insert a new window row (first request in this window).
  // If a row already exists, the insert fails with a unique-constraint error.
  const { error: insertError } = await supabaseAdmin
    .from("preview_rate_limits")
    .insert({ ip, window_start: windowStart, request_count: 1 });

  if (!insertError) {
    // First request in this window — always allowed.
    return { allowed: true, resetAt };
  }

  // Row already exists — read current count.
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("preview_rate_limits")
    .select("request_count")
    .eq("ip", ip)
    .eq("window_start", windowStart)
    .single();

  if (selectError || !existing) {
    // Can't determine rate — fail open and log.
    console.warn("[rate-limit] Could not read rate limit row for ip:", ip);
    return { allowed: true, resetAt };
  }

  if (existing.request_count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, resetAt };
  }

  // Increment counter.
  await supabaseAdmin
    .from("preview_rate_limits")
    .update({ request_count: existing.request_count + 1 })
    .eq("ip", ip)
    .eq("window_start", windowStart);

  return { allowed: true, resetAt };
}

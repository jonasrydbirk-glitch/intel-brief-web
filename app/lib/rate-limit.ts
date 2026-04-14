import { supabase } from "@/lib/supabase";

const MAX_REQUESTS_PER_WINDOW = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  resetAt: string; // ISO timestamp when the window resets
}

/**
 * Check and increment the preview rate limit for an IP address.
 * Uses a 1-hour tumbling window keyed on (ip, window_start).
 * Returns { allowed: true } and increments the counter if under the limit,
 * or { allowed: false, resetAt } if the limit is reached.
 */
export async function checkPreviewRateLimit(
  ip: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - (now % WINDOW_MS)).toISOString();
  const resetAt = new Date(now - (now % WINDOW_MS) + WINDOW_MS).toISOString();

  // Attempt to insert a new window row (first request in window)
  const { data: inserted, error: insertError } = await supabase
    .from("preview_rate_limits")
    .insert({ ip, window_start: windowStart, request_count: 1 })
    .select("request_count")
    .single();

  if (!insertError && inserted) {
    // First request in this window — always allowed
    return { allowed: true, resetAt };
  }

  // Row already exists — read current count
  const { data: existing, error: selectError } = await supabase
    .from("preview_rate_limits")
    .select("request_count")
    .eq("ip", ip)
    .eq("window_start", windowStart)
    .single();

  if (selectError || !existing) {
    // Can't determine rate — allow and log
    console.warn("[rate-limit] Could not read rate limit row for ip:", ip);
    return { allowed: true, resetAt };
  }

  if (existing.request_count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, resetAt };
  }

  // Increment counter
  await supabase
    .from("preview_rate_limits")
    .update({ request_count: existing.request_count + 1 })
    .eq("ip", ip)
    .eq("window_start", windowStart);

  return { allowed: true, resetAt };
}

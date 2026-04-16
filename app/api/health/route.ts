/**
 * GET /api/health — Warden liveness probe (public, no auth required)
 *
 * Returns 200 if the Warden engine is alive (last heartbeat within 15 min)
 * and 503 if it is stale or unreachable. HTTP monitoring services such as
 * UptimeRobot treat any non-200 as a failure and send an alert email.
 *
 * Response body is always JSON so monitoring dashboards can parse detail:
 *
 *   {
 *     warden: {
 *       alive: boolean,
 *       last_beat: string | null,      // ISO timestamp
 *       age_seconds: number | null,    // seconds since last beat
 *       uptime_seconds: number | null, // from heartbeat metadata
 *       registered_sources: number | null,
 *       node_version: string | null,
 *     },
 *     library: {
 *       total_items: number,
 *       items_last_24h: number,
 *       extraction_coverage_pct: number,
 *       embedding_coverage_pct: number,
 *     },
 *     delivery: {
 *       briefs_sent_24h: number,
 *       errors_24h: number,
 *     },
 *     checked_at: string,              // ISO timestamp of this check
 *   }
 *
 * Threshold: 15 minutes.  Warden writes every 5 min so this gives 3 missed
 * beats before the alarm fires — enough headroom for a Beelink reboot.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public route — no auth middleware. External monitors must be able to reach
// this endpoint without a session cookie.
export const dynamic = "force-dynamic";

const STALE_THRESHOLD_MS = 15 * 60 * 1_000; // 15 minutes

function pct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}

export async function GET() {
  const checkedAt = new Date().toISOString();

  // ── Supabase (service key — bypasses RLS) ─────────────────────────────
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        error: "Supabase credentials not configured",
        warden: { alive: false },
        checked_at: checkedAt,
      },
      { status: 503 }
    );
  }

  const db = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();

  // ── Parallel queries ──────────────────────────────────────────────────
  const [
    heartbeatRes,
    totalRes,
    withTextRes,
    withEmbedRes,
    last24hRes,
    deliveredRes,
    errorsRes,
  ] = await Promise.all([
    // Warden heartbeat
    db
      .from("heartbeats")
      .select("last_beat, metadata")
      .eq("service", "warden")
      .single(),

    // Library totals
    db.from("intelligence_items").select("*", { count: "exact", head: true }),
    db
      .from("intelligence_items")
      .select("*", { count: "exact", head: true })
      .not("raw_text", "is", null),
    db
      .from("intelligence_items")
      .select("*", { count: "exact", head: true })
      .not("embedding", "is", null),
    db
      .from("intelligence_items")
      .select("*", { count: "exact", head: true })
      .gte("ingested_at", since24h),

    // Delivery — count delivered briefs in last 24h
    db
      .from("brief_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "delivered")
      .gte("updated_at", since24h),

    // Brief job errors in last 24h
    db
      .from("brief_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "error")
      .gte("created_at", since24h),
  ]);

  // ── Warden liveness ───────────────────────────────────────────────────
  const heartbeat = heartbeatRes.data;
  const meta = (heartbeat?.metadata ?? {}) as Record<string, unknown>;

  let wardenAlive = false;
  let ageSeconds: number | null = null;
  let lastBeat: string | null = null;

  if (heartbeat?.last_beat) {
    lastBeat = heartbeat.last_beat;
    const ageMs = Date.now() - new Date(heartbeat.last_beat).getTime();
    ageSeconds = Math.floor(ageMs / 1_000);
    wardenAlive = ageMs < STALE_THRESHOLD_MS;
  }

  // ── Library metrics ───────────────────────────────────────────────────
  const totalItems     = totalRes.count    ?? 0;
  const itemsWithText  = withTextRes.count  ?? 0;
  const itemsWithEmbed = withEmbedRes.count ?? 0;
  const itemsLast24h   = last24hRes.count  ?? 0;

  // ── Delivery metrics ──────────────────────────────────────────────────
  const briefsSent24h = deliveredRes.count ?? 0;
  const errors24h     = errorsRes.count    ?? 0;

  // ── Build response ────────────────────────────────────────────────────
  const body = {
    warden: {
      alive:               wardenAlive,
      last_beat:           lastBeat,
      age_seconds:         ageSeconds,
      uptime_seconds:      (meta.uptime_seconds as number | null) ?? null,
      registered_sources:  (meta.registered_sources as number | null) ?? null,
      node_version:        (meta.node_version as string | null) ?? null,
    },
    library: {
      total_items:              totalItems,
      items_last_24h:           itemsLast24h,
      extraction_coverage_pct:  pct(itemsWithText,  totalItems),
      embedding_coverage_pct:   pct(itemsWithEmbed, totalItems),
    },
    delivery: {
      briefs_sent_24h: briefsSent24h,
      errors_24h:      errors24h,
    },
    checked_at: checkedAt,
  };

  return NextResponse.json(body, {
    status: wardenAlive ? 200 : 503,
    headers: {
      // Allow external monitors to cache for up to 60s
      "Cache-Control": "no-store",
    },
  });
}

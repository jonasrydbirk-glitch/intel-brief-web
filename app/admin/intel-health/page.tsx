/**
 * /admin/intel-health — Intel Pipeline Health Dashboard
 *
 * Server component — all data fetched at request time (force-dynamic).
 * No client JS required; refresh by navigating to the page.
 */

export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { IQseaLogoSmall } from "@/app/components/iqsea-logo";
import { BUILD_VERSION } from "@/lib/constants";
import { InfoTooltip } from "@/app/components/info-tooltip";

// ---------------------------------------------------------------------------
// Source registry — mirrors engine/sources/* registrations
// ---------------------------------------------------------------------------

const ALL_SOURCES: string[] = [
  // RSS (17)
  "Splash247",
  "gCaptain",
  "Hellenic Shipping News",
  "LNG Prime",
  "Offshore Energy",
  "Ship Technology Global",
  "The Loadstar",
  "ship.energy",
  "Seatrade Maritime",
  "Maritime Executive",
  "Riviera Maritime Media",
  "Marine Link",
  "Marine Log",
  "Container News",
  "Offshore Engineer",
  "LNG Industry",
  "Dry Bulk Magazine",
  // Sitemap (1)
  "TradeWinds",
  // HTML scraper (1)
  "Lloyd's Register",
  // Data-props JSON (1)
  "DNV",
  // WordPress REST (1)
  "Safety4Sea",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IngestionRunRow {
  source_name: string;
  started_at: string;
  error: string | null;
  items_new: number;
  items_found: number;
}

interface BriefJobErrorRow {
  subscriber_id: string;
  error: string | null;
  created_at: string;
}

interface FeedbackRow {
  id: string;
  subscriber_id: string;
  brief_job_id: string | null;
  rating: string | null;
  message: string | null;
  created_at: string;
}

type SourceStatus = "green" | "yellow" | "red" | "unknown";
type OverallStatus = "green" | "yellow" | "red";

interface LatestRun {
  started_at: string;
  error: string | null;
  items_new: number;
  items_found: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtAge(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "< 1 min ago";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m ago` : `${h}h ago`;
}

function fmtTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function pct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}

function getSourceStatus(run: LatestRun | undefined): SourceStatus {
  if (!run) return "unknown";
  const ageMin = (Date.now() - new Date(run.started_at).getTime()) / 60_000;
  if (run.error) return ageMin < 25 ? "yellow" : "red";
  if (ageMin < 25) return "green";
  if (ageMin < 120) return "yellow";
  return "red";
}

function coverageStatus(pcnt: number): OverallStatus {
  if (pcnt >= 80) return "green";
  if (pcnt >= 50) return "yellow";
  return "red";
}

function deriveOverall(
  latestRuns: Map<string, LatestRun>,
  textCov: number,
  embedCov: number
): OverallStatus {
  const srcStatuses = ALL_SOURCES.map((s) => getSourceStatus(latestRuns.get(s)));
  if (srcStatuses.some((s) => s === "red")) return "red";
  if (coverageStatus(textCov) === "red" || coverageStatus(embedCov) === "red") return "red";
  if (srcStatuses.some((s) => s === "yellow")) return "yellow";
  if (coverageStatus(textCov) === "yellow" || coverageStatus(embedCov) === "yellow") return "yellow";
  return "green";
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadHealthData() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_KEY)");
  }

  const db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1_000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
  const since7d  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1_000).toISOString();
  const since1h  = new Date(Date.now() -       60 * 60 * 1_000).toISOString();

  const [
    runsRes,
    totalRes,
    withTextRes,
    withEmbedRes,
    last1hRes,
    last24hRes,
    last7dRes,
    errorsRes,
    subsRes,
    done24hRes,
    done7dRes,
    // Brief Quality queries
    urlDeadRes,
    urlTotalRes,
    sentArticlesRes,
    briefResultsRes,
    heartbeatRes,
    feedbackRecentRes,
    feedbackSummaryRes,
  ] = await Promise.all([
    db.from("ingestion_runs")
      .select("source_name, started_at, error, items_new, items_found")
      .gte("started_at", since48h)
      .order("started_at", { ascending: false })
      .limit(300),

    db.from("intelligence_items").select("*", { count: "exact", head: true }),

    db.from("intelligence_items")
      .select("*", { count: "exact", head: true })
      .not("raw_text", "is", null),

    db.from("intelligence_items")
      .select("*", { count: "exact", head: true })
      .not("embedding", "is", null),

    db.from("intelligence_items")
      .select("*", { count: "exact", head: true })
      .gte("ingested_at", since1h),

    db.from("intelligence_items")
      .select("*", { count: "exact", head: true })
      .gte("ingested_at", since24h),

    db.from("intelligence_items")
      .select("*", { count: "exact", head: true })
      .gte("ingested_at", since7d),

    db.from("brief_jobs")
      .select("subscriber_id, error, created_at")
      .eq("status", "error")
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(20),

    db.from("subscribers").select("*", { count: "exact", head: true }),

    db.from("brief_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "complete")
      .gte("created_at", since24h),

    db.from("brief_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "complete")
      .gte("created_at", since7d),

    // Brief Quality — dead link rate (last 24h)
    db.from("url_verification_log")
      .select("*", { count: "exact", head: true })
      .eq("status", "dead_4xx")
      .gte("checked_at", since24h),

    db.from("url_verification_log")
      .select("*", { count: "exact", head: true })
      .gte("checked_at", since24h),

    // Brief Quality — items deduped (sent_articles last 7d)
    db.from("sent_articles")
      .select("*", { count: "exact", head: true })
      .gte("sent_at", since7d),

    // Brief Quality — quote compliance (result JSONB from completed briefs last 7d)
    db.from("brief_jobs")
      .select("result")
      .eq("status", "complete")
      .gte("created_at", since7d)
      .limit(50),

    // Warden heartbeat
    db.from("heartbeats")
      .select("last_beat, metadata")
      .eq("service", "warden")
      .single(),

    // Recent feedback (last 10)
    db.from("feedback")
      .select("id, subscriber_id, brief_job_id, rating, message, created_at")
      .order("created_at", { ascending: false })
      .limit(10),

    // Feedback summary last 7d
    db.from("feedback")
      .select("rating")
      .gte("created_at", since7d),
  ]);

  // Build per-source latest-run map (first occurrence = most recent, list is DESC)
  const latestRuns = new Map<string, LatestRun>();
  for (const row of (runsRes.data ?? []) as IngestionRunRow[]) {
    if (!latestRuns.has(row.source_name)) {
      latestRuns.set(row.source_name, {
        started_at: row.started_at,
        error: row.error,
        items_new: row.items_new,
        items_found: row.items_found,
      });
    }
  }

  const totalItems     = totalRes.count    ?? 0;
  const itemsWithText  = withTextRes.count  ?? 0;
  const itemsWithEmbed = withEmbedRes.count ?? 0;
  const itemsLast1h    = last1hRes.count    ?? 0;
  const itemsLast24h   = last24hRes.count   ?? 0;
  const itemsLast7d    = last7dRes.count    ?? 0;
  const jobErrors      = (errorsRes.data    ?? []) as BriefJobErrorRow[];
  const subscriberCount = subsRes.count     ?? 0;
  const reportsDone24h = done24hRes.count   ?? 0;
  const reportsDone7d  = done7dRes.count    ?? 0;

  const textCov  = pct(itemsWithText,  totalItems);
  const embedCov = pct(itemsWithEmbed, totalItems);

  // Brief Quality — dead link rate
  const urlDeadCount  = urlDeadRes.count  ?? 0;
  const urlTotalCount = urlTotalRes.count ?? 0;
  const deadLinkRate  = pct(urlDeadCount, urlTotalCount);

  // Brief Quality — items deduped last 7d
  const dedupedLast7d = sentArticlesRes.count ?? 0;

  // Brief Quality — quote compliance: scan result JSONB from brief_jobs
  let quoteItems = 0;
  let totalBriefItems = 0;
  for (const job of (briefResultsRes.data ?? []) as Array<{ result: unknown }>) {
    if (!job.result || typeof job.result !== "object") continue;
    const payload = job.result as {
      sections?: Array<{ items?: Array<{ quote?: string }> }>;
    };
    for (const sec of payload.sections ?? []) {
      for (const item of sec.items ?? []) {
        totalBriefItems++;
        if (item.quote && item.quote.trim().length > 0) quoteItems++;
      }
    }
  }
  const quoteCompliance = pct(quoteItems, totalBriefItems);

  // Warden heartbeat
  const WARDEN_STALE_MS = 15 * 60 * 1_000; // 15 minutes
  const heartbeat = heartbeatRes.data as { last_beat: string; metadata: Record<string, unknown> } | null;
  const wardenLastBeat   = heartbeat?.last_beat ?? null;
  const wardenAgeMs      = wardenLastBeat ? Date.now() - new Date(wardenLastBeat).getTime() : null;
  const wardenAlive      = wardenAgeMs !== null && wardenAgeMs < WARDEN_STALE_MS;
  const wardenAgeMin     = wardenAgeMs !== null ? Math.floor(wardenAgeMs / 60_000) : null;
  const wardenMeta       = (heartbeat?.metadata ?? {}) as Record<string, unknown>;

  // Feedback — recent rows + 7d summary
  const recentFeedback = (feedbackRecentRes.data ?? []) as FeedbackRow[];
  const feedbackSummaryRows = (feedbackSummaryRes.data ?? []) as { rating: string | null }[];
  const feedbackGood = feedbackSummaryRows.filter((r) => r.rating === "good").length;
  const feedbackOk   = feedbackSummaryRows.filter((r) => r.rating === "ok").length;
  const feedbackBad  = feedbackSummaryRows.filter((r) => r.rating === "bad").length;

  // Look up subscriber names for the feedback rows
  const feedbackSubIds = [...new Set(recentFeedback.map((f) => f.subscriber_id).filter(Boolean))];
  let subNameMap: Map<string, string> = new Map();
  if (feedbackSubIds.length > 0) {
    const { data: subRows } = await db
      .from("subscribers")
      .select("id, fullName")
      .in("id", feedbackSubIds);
    for (const s of (subRows ?? []) as { id: string; fullName: string }[]) {
      subNameMap.set(s.id, s.fullName);
    }
  }

  return {
    latestRuns,
    totalItems,
    itemsWithText,
    itemsWithEmbed,
    itemsLast1h,
    itemsLast24h,
    itemsLast7d,
    textCov,
    embedCov,
    jobErrors,
    subscriberCount,
    reportsDone24h,
    reportsDone7d,
    // Brief Quality
    deadLinkRate,
    urlDeadCount,
    urlTotalCount,
    dedupedLast7d,
    quoteCompliance,
    quoteItems,
    totalBriefItems,
    overallStatus: deriveOverall(latestRuns, textCov, embedCov),
    fetchedAt: new Date().toISOString(),
    // Warden heartbeat
    wardenAlive,
    wardenLastBeat,
    wardenAgeMin,
    wardenMeta,
    // Feedback
    recentFeedback,
    feedbackGood,
    feedbackOk,
    feedbackBad,
    subNameMap,
  };
}

// ---------------------------------------------------------------------------
// Sub-components (plain functions — server component, no hooks)
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<SourceStatus, string> = {
  green:   "bg-emerald-400",
  yellow:  "bg-amber-400",
  red:     "bg-red-400",
  unknown: "bg-zinc-600",
};

const STATUS_LABEL: Record<SourceStatus, string> = {
  green:   "text-emerald-400",
  yellow:  "text-amber-400",
  red:     "text-red-400",
  unknown: "text-zinc-500",
};

const STATUS_BAR: Record<OverallStatus, string> = {
  green:  "bg-emerald-500",
  yellow: "bg-amber-500",
  red:    "bg-red-500",
};

const OVERALL_BANNER: Record<OverallStatus, { bg: string; border: string; text: string; label: string }> = {
  green:  { bg: "bg-emerald-950/40", border: "border-emerald-700/50", text: "text-emerald-300", label: "NOMINAL" },
  yellow: { bg: "bg-amber-950/40",   border: "border-amber-700/50",   text: "text-amber-300",   label: "DEGRADED" },
  red:    { bg: "bg-red-950/40",     border: "border-red-700/50",     text: "text-red-300",     label: "ALERT"    },
};

function CovBar({ value, status }: { value: number; status: OverallStatus }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${STATUS_BAR[status]}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accentStatus,
  tip,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accentStatus?: OverallStatus;
  tip?: string;
}) {
  return (
    <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4 relative overflow-hidden">
      {accentStatus && (
        <div className={`absolute top-0 left-0 w-full h-[2px] ${STATUS_BAR[accentStatus]}`} />
      )}
      <div className="flex items-center text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-1.5 font-[family-name:var(--font-geist-mono)]">
        {label}
        {tip && <InfoTooltip text={tip} />}
      </div>
      <div className="text-2xl font-bold font-[family-name:var(--font-geist-mono)] leading-none">
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-[var(--muted-foreground)] mt-1 font-[family-name:var(--font-geist-mono)]">
          {sub}
        </div>
      )}
    </div>
  );
}

function SourceCard({
  name,
  run,
}: {
  name: string;
  run: LatestRun | undefined;
}) {
  const status = getSourceStatus(run);
  return (
    <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-md px-3 py-2.5 flex items-start gap-2.5">
      <span className="relative flex h-2 w-2 mt-[5px] shrink-0">
        {status === "green" && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${STATUS_DOT.green} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${STATUS_DOT[status]}`} />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-medium font-[family-name:var(--font-geist-mono)] text-[var(--slate-200)] truncate leading-tight">
          {name}
        </div>
        {run ? (
          <div className={`text-[10px] font-[family-name:var(--font-geist-mono)] mt-0.5 ${STATUS_LABEL[status]}`}>
            {fmtAge(run.started_at)}
            {run.error ? (
              <span className="text-red-400"> · ERR</span>
            ) : (
              <span className="text-[var(--muted-foreground)]"> · {run.items_new} new</span>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-zinc-600 font-[family-name:var(--font-geist-mono)] mt-0.5">
            no data
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function IntelHealthPage() {
  let data: Awaited<ReturnType<typeof loadHealthData>> | null = null;
  let loadError: string | null = null;

  try {
    data = await loadHealthData();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  const overall: OverallStatus = data?.overallStatus ?? "red";
  const banner = OVERALL_BANNER[overall];

  // Sort sources: RED → YELLOW → GREEN → UNKNOWN
  const sortedSources = [...ALL_SOURCES].sort((a, b) => {
    const order: Record<SourceStatus, number> = { red: 0, yellow: 1, green: 2, unknown: 3 };
    return (
      order[getSourceStatus(data?.latestRuns.get(a))] -
      order[getSourceStatus(data?.latestRuns.get(b))]
    );
  });

  const greenCount   = ALL_SOURCES.filter((s) => getSourceStatus(data?.latestRuns.get(s)) === "green").length;
  const yellowCount  = ALL_SOURCES.filter((s) => getSourceStatus(data?.latestRuns.get(s)) === "yellow").length;
  const redCount     = ALL_SOURCES.filter((s) => getSourceStatus(data?.latestRuns.get(s)) === "red").length;
  const unknownCount = ALL_SOURCES.filter((s) => getSourceStatus(data?.latestRuns.get(s)) === "unknown").length;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--navy-950)]/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <IQseaLogoSmall className="h-6" />
            </Link>
            <span className="text-[var(--border)]">|</span>
            <span className="text-[10px] tracking-[0.2em] text-[var(--gold-400)] font-[family-name:var(--font-geist-mono)] font-semibold">
              MISSION CONTROL
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>ADMIN</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="w-48 shrink-0 border-r border-[var(--border)] bg-[var(--navy-950)] py-4 hidden md:flex md:flex-col">
          <nav className="space-y-0.5 px-2">
            {[
              {
                href: "/admin",
                label: "Overview",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                ),
              },
              {
                href: "/admin",
                label: "Users",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
              },
              {
                href: "/admin",
                label: "Tenders",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                ),
              },
              {
                href: "/admin",
                label: "Outreach",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                ),
              },
              {
                href: "/admin",
                label: "System Logs",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                ),
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors text-[var(--muted-foreground)] hover:text-[var(--slate-300)] hover:bg-[var(--navy-900)] font-[family-name:var(--font-geist-mono)]"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Secondary nav */}
          <div className="px-2 mt-3 space-y-0.5">
            <Link
              href="/admin/test"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors text-[var(--muted-foreground)] hover:text-[var(--slate-300)] hover:bg-[var(--navy-900)] font-[family-name:var(--font-geist-mono)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
              </svg>
              Test Center
            </Link>

            {/* Active: Intel Health */}
            <Link
              href="/admin/intel-health"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs bg-[var(--teal-500)]/10 text-[var(--teal-400)] font-semibold font-[family-name:var(--font-geist-mono)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Intel Health
            </Link>
          </div>

          {/* Sidebar footer */}
          <div className="mt-auto px-4 pt-6">
            <div className="border-t border-[var(--border)] pt-4">
              <div className="text-[9px] tracking-[0.15em] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] opacity-50">
                IQsea v1.0
              </div>
              <div className="inline-block mt-1.5 px-2 py-0.5 rounded bg-[#1a1400] border border-[#FFD700]/40 text-[8px] font-bold tracking-[0.1em] text-[#FFD700] font-[family-name:var(--font-geist-mono)]">
                {BUILD_VERSION}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Mobile nav ───────────────────────────────────────────────────── */}
        <nav className="md:hidden shrink-0 w-full border-b border-[var(--border)] bg-[var(--navy-950)] px-2 py-2 flex gap-1 overflow-x-auto">
          <Link href="/admin" className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Overview
          </Link>
          <Link href="/admin/test" className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs text-[var(--gold-400)] font-[family-name:var(--font-geist-mono)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
            </svg>
            Test Center
          </Link>
          <Link href="/admin/intel-health" className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs bg-[var(--teal-500)]/10 text-[var(--teal-400)] font-semibold font-[family-name:var(--font-geist-mono)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Intel Health
          </Link>
        </nav>

        {/* ── Main ─────────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Page title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-lg font-bold font-[family-name:var(--font-geist-mono)] tracking-tight">
                  Intel Pipeline Health
                </h1>
                <div className="h-px bg-gradient-to-r from-[var(--teal-500)]/50 via-[var(--gold-500)]/30 to-transparent mt-1" />
              </div>
              <div className="flex items-center gap-3">
                {data && (
                  <span className="text-[10px] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
                    Updated {fmtTime(data.fetchedAt)}
                  </span>
                )}
                <Link
                  href="/admin/intel-health"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all bg-transparent text-white/80 border border-[var(--border)] hover:border-[var(--teal-500)]/60 hover:text-[var(--teal-400)] font-[family-name:var(--font-geist-mono)]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
                  </svg>
                  Refresh
                </Link>
              </div>
            </div>

            {/* ── DB error ─────────────────────────────────────────────────── */}
            {loadError && (
              <div className="px-4 py-3 rounded-lg bg-red-950/40 border border-red-700/50 text-red-300 text-sm font-[family-name:var(--font-geist-mono)]">
                <span className="font-semibold">Database error:</span> {loadError}
              </div>
            )}

            {data && (
              <>
                {/* ── Overall status banner ─────────────────────────────────── */}
                <div className={`rounded-lg border px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${banner.bg} ${banner.border}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="relative flex h-3 w-3 shrink-0">
                      {overall === "green" && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      )}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${STATUS_DOT[overall]}`} />
                    </span>
                    <div className="min-w-0">
                      <span className={`text-sm font-bold font-[family-name:var(--font-geist-mono)] tracking-wider ${banner.text}`}>
                        {banner.label}
                      </span>
                      <span className={`block sm:inline sm:ml-3 text-xs font-[family-name:var(--font-geist-mono)] opacity-80 ${banner.text}`}>
                        {overall === "green"
                          ? `All ${ALL_SOURCES.length} sources reporting · text ${data.textCov}% · embed ${data.embedCov}%`
                          : overall === "yellow"
                          ? `${yellowCount} source(s) stale · text ${data.textCov}% · embed ${data.embedCov}%`
                          : `${redCount} source(s) in error · text ${data.textCov}% · embed ${data.embedCov}%`}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right text-[10px] font-[family-name:var(--font-geist-mono)] text-[var(--muted-foreground)]">
                    <div>{greenCount} green · {yellowCount} yellow · {redCount} red · {unknownCount} unknown</div>
                    <div className="mt-0.5">{ALL_SOURCES.length} registered sources</div>
                  </div>
                </div>

                {/* ── Warden Heartbeat ─────────────────────────────────────── */}
                <div className={`rounded-lg border px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
                  data.wardenAlive
                    ? "bg-emerald-950/30 border-emerald-700/40"
                    : data.wardenLastBeat
                    ? "bg-red-950/30 border-red-700/40"
                    : "bg-zinc-900/50 border-zinc-700/40"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3 shrink-0">
                      {data.wardenAlive && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      )}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${
                        data.wardenAlive ? "bg-emerald-400" : data.wardenLastBeat ? "bg-red-400" : "bg-zinc-600"
                      }`} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold font-[family-name:var(--font-geist-mono)] tracking-wider ${
                          data.wardenAlive ? "text-emerald-300" : data.wardenLastBeat ? "text-red-300" : "text-zinc-400"
                        }`}>
                          WARDEN {data.wardenAlive ? "ONLINE" : data.wardenLastBeat ? "STALE" : "NO DATA"}
                        </span>
                        <InfoTooltip text="Warden is the local engine process on the Beelink. It writes a heartbeat every 5 minutes. STALE = no heartbeat for 15+ minutes." />
                      </div>
                      <div className="text-xs font-[family-name:var(--font-geist-mono)] mt-0.5 text-[var(--muted-foreground)]">
                        {data.wardenLastBeat
                          ? <>Last beat: <span className="text-[var(--slate-300)]">{fmtAge(data.wardenLastBeat)}</span>
                              {" · "}{new Date(data.wardenLastBeat).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })}
                            </>
                          : "No heartbeat recorded yet — Warden may not have started after migration 008"}
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right text-[10px] font-[family-name:var(--font-geist-mono)] text-[var(--muted-foreground)] space-y-0.5">
                    {data.wardenMeta.uptime_seconds != null && (
                      <div>
                        Uptime: <span className="text-[var(--slate-300)]">
                          {Math.floor(Number(data.wardenMeta.uptime_seconds) / 3600)}h{" "}
                          {Math.floor((Number(data.wardenMeta.uptime_seconds) % 3600) / 60)}m
                        </span>
                      </div>
                    )}
                    {data.wardenMeta.registered_sources != null && (
                      <div>Sources: <span className="text-[var(--slate-300)]">{String(data.wardenMeta.registered_sources)}</span></div>
                    )}
                    {data.wardenMeta.node_version != null && (
                      <div>Node: <span className="text-[var(--slate-300)]">{String(data.wardenMeta.node_version)}</span></div>
                    )}
                    {!data.wardenLastBeat && (
                      <div className="text-zinc-600">Run migration 008 in Supabase</div>
                    )}
                  </div>
                </div>

                {/* ── Pipeline cards (3 col) ────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Ingestion */}
                  <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-[2px] ${STATUS_BAR[overall === "red" && redCount > 0 ? "red" : overall === "yellow" && yellowCount > 0 ? "yellow" : "green"]}`} />
                    <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
                      INGESTION
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          Sources active
                          <InfoTooltip text="Sources that have reported at least one run in the last 2 hours (green or yellow status)." />
                        </span>
                        <span className="text-sm font-bold font-[family-name:var(--font-geist-mono)]">
                          {greenCount + yellowCount} / {ALL_SOURCES.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          Items last 1h
                          <InfoTooltip text="Intelligence items ingested across all sources in the last hour." />
                        </span>
                        <span className="text-sm font-bold font-[family-name:var(--font-geist-mono)]">{data.itemsLast1h}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          Items last 24h
                          <InfoTooltip text="Intelligence items ingested across all sources in the last 24 hours." />
                        </span>
                        <span className="text-sm font-bold font-[family-name:var(--font-geist-mono)]">{data.itemsLast24h}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          Items last 7d
                          <InfoTooltip text="Intelligence items ingested across all sources in the last 7 days." />
                        </span>
                        <span className="text-sm font-bold font-[family-name:var(--font-geist-mono)]">{data.itemsLast7d}</span>
                      </div>
                    </div>
                  </div>

                  {/* Text extraction */}
                  <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-[2px] ${STATUS_BAR[coverageStatus(data.textCov)]}`} />
                    <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
                      TEXT EXTRACTION
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                            Coverage
                            <InfoTooltip text="Percentage of library items that have had their full article text extracted. Used for embedding generation and semantic search." />
                          </span>
                          <span className={`text-sm font-bold font-[family-name:var(--font-geist-mono)] ${STATUS_LABEL[coverageStatus(data.textCov)]}`}>
                            {data.textCov}%
                          </span>
                        </div>
                        <CovBar value={data.textCov} status={coverageStatus(data.textCov)} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          Extracted
                          <InfoTooltip text="Items with raw_text populated vs total library items." />
                        </span>
                        <span className="text-sm font-bold font-[family-name:var(--font-geist-mono)]">
                          {data.itemsWithText.toLocaleString()} / {data.totalItems.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          Queue depth
                          <InfoTooltip text="Items awaiting text extraction (total minus extracted)." />
                        </span>
                        <span className="text-sm font-bold font-[family-name:var(--font-geist-mono)]">
                          {(data.totalItems - data.itemsWithText).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Embeddings */}
                  <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-[2px] ${STATUS_BAR[coverageStatus(data.embedCov)]}`} />
                    <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
                      VECTOR EMBEDDINGS
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                            Coverage
                            <InfoTooltip text="Percentage of text-extracted items that have been converted to vector embeddings. Higher coverage = better semantic search recall." />
                          </span>
                          <span className={`text-sm font-bold font-[family-name:var(--font-geist-mono)] ${STATUS_LABEL[coverageStatus(data.embedCov)]}`}>
                            {data.embedCov}%
                          </span>
                        </div>
                        <CovBar value={data.embedCov} status={coverageStatus(data.embedCov)} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          Embedded
                          <InfoTooltip text="Items with a 1536-dim vector embedding vs total library items." />
                        </span>
                        <span className="text-sm font-bold font-[family-name:var(--font-geist-mono)]">
                          {data.itemsWithEmbed.toLocaleString()} / {data.totalItems.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          Queue depth
                          <InfoTooltip text="Items awaiting embedding (requires text extraction first)." />
                        </span>
                        <span className="text-sm font-bold font-[family-name:var(--font-geist-mono)]">
                          {(data.itemsWithText - data.itemsWithEmbed).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Brief Quality card ───────────────────────────────────── */}
                <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-[var(--teal-500)]" />
                  <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
                    BRIEF QUALITY
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* Dead link rate */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          Dead link rate (24h)
                          <InfoTooltip text="Percentage of source URLs checked in the last 24h that returned a 4xx response. High rates indicate stale library content or misconfigured paywall sources." />
                        </span>
                        <span className={`text-sm font-bold font-[family-name:var(--font-geist-mono)] ${
                          data.urlTotalCount === 0
                            ? "text-[var(--muted-foreground)]"
                            : data.deadLinkRate >= 20
                            ? "text-red-400"
                            : data.deadLinkRate >= 10
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}>
                          {data.urlTotalCount === 0 ? "—" : `${data.deadLinkRate}%`}
                        </span>
                      </div>
                      {data.urlTotalCount > 0 && (
                        <>
                          <CovBar
                            value={data.deadLinkRate}
                            status={
                              data.deadLinkRate >= 20 ? "red" :
                              data.deadLinkRate >= 10 ? "yellow" : "green"
                            }
                          />
                          <div className="text-[10px] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
                            {data.urlDeadCount} dead / {data.urlTotalCount} checked
                          </div>
                        </>
                      )}
                      {data.urlTotalCount === 0 && (
                        <div className="text-[10px] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
                          No URL checks logged yet
                        </div>
                      )}
                    </div>

                    {/* Quote compliance */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          Quote compliance (7d)
                          <InfoTooltip text="Percentage of intelligence items in the last 7d briefs that include a verbatim pull-quote from the source article. Higher = richer subscriber experience." />
                        </span>
                        <span className={`text-sm font-bold font-[family-name:var(--font-geist-mono)] ${
                          data.totalBriefItems === 0
                            ? "text-[var(--muted-foreground)]"
                            : data.quoteCompliance >= 60
                            ? "text-emerald-400"
                            : data.quoteCompliance >= 30
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}>
                          {data.totalBriefItems === 0 ? "—" : `${data.quoteCompliance}%`}
                        </span>
                      </div>
                      {data.totalBriefItems > 0 && (
                        <>
                          <CovBar
                            value={data.quoteCompliance}
                            status={
                              data.quoteCompliance >= 60 ? "green" :
                              data.quoteCompliance >= 30 ? "yellow" : "red"
                            }
                          />
                          <div className="text-[10px] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
                            {data.quoteItems} items with quote / {data.totalBriefItems} total
                          </div>
                        </>
                      )}
                      {data.totalBriefItems === 0 && (
                        <div className="text-[10px] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
                          No brief results parsed yet
                        </div>
                      )}
                    </div>

                    {/* Items deduped */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] flex items-center">
                          URLs tracked (7d)
                          <InfoTooltip text="Article URLs recorded in the cross-day dedup log in the last 7 days. These URLs are filtered from future briefs to prevent the same article appearing twice within a 7-day window." />
                        </span>
                        <span className="text-sm font-bold font-[family-name:var(--font-geist-mono)]">
                          {data.dedupedLast7d.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
                        Unique article URLs sent last 7d
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── Library stats + Delivery snapshot (2 col) ─────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Library stats */}
                  <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4">
                    <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
                      LIBRARY
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard
                        label="TOTAL ITEMS"
                        value={data.totalItems.toLocaleString()}
                        accentStatus={data.totalItems > 0 ? "green" : "yellow"}
                        tip="Total intelligence items in the library database."
                      />
                      <StatCard
                        label="LAST 1H"
                        value={data.itemsLast1h}
                        tip="Items ingested in the last hour."
                      />
                      <StatCard
                        label="LAST 24H"
                        value={data.itemsLast24h}
                        tip="Items ingested in the last 24 hours."
                      />
                      <StatCard
                        label="LAST 7D"
                        value={data.itemsLast7d.toLocaleString()}
                        tip="Items ingested in the last 7 days."
                      />
                    </div>
                  </div>

                  {/* Delivery snapshot */}
                  <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4">
                    <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
                      DELIVERY
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard
                        label="SUBSCRIBERS"
                        value={data.subscriberCount}
                        accentStatus="green"
                        tip="Total registered subscribers receiving intelligence briefs."
                      />
                      <StatCard
                        label="REPORTS 24H"
                        value={data.reportsDone24h}
                        accentStatus={data.reportsDone24h > 0 ? "green" : "yellow"}
                        tip="Briefs successfully completed and delivered in the last 24 hours."
                      />
                      <StatCard
                        label="REPORTS 7D"
                        value={data.reportsDone7d}
                        tip="Briefs successfully completed and delivered in the last 7 days."
                      />
                      <StatCard
                        label="JOB ERRORS 24H"
                        value={data.jobErrors.length}
                        accentStatus={data.jobErrors.length > 0 ? "red" : "green"}
                        tip="Brief generation jobs that failed in the last 24 hours. See error table below for details."
                      />
                    </div>
                  </div>
                </div>

                {/* ── Source grid ───────────────────────────────────────────── */}
                <div>
                  <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
                    SOURCE GRID — {ALL_SOURCES.length} REGISTERED
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {sortedSources.map((name) => (
                      <SourceCard
                        key={name}
                        name={name}
                        run={data.latestRuns.get(name)}
                      />
                    ))}
                  </div>
                </div>

                {/* ── Brief job errors ──────────────────────────────────────── */}
                {data.jobErrors.length > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
                      BRIEF JOB ERRORS (LAST 24H)
                    </div>
                    <div className="bg-[var(--navy-900)] border border-red-900/40 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                      <table className="min-w-full text-xs font-[family-name:var(--font-geist-mono)]">
                        <thead>
                          <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                            <th className="text-left px-4 py-2.5 font-medium tracking-wider text-[10px]">TIME</th>
                            <th className="text-left px-4 py-2.5 font-medium tracking-wider text-[10px]">SUBSCRIBER</th>
                            <th className="text-left px-4 py-2.5 font-medium tracking-wider text-[10px]">ERROR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.jobErrors.map((err, i) => (
                            <tr
                              key={i}
                              className="border-t border-[var(--border)] hover:bg-red-950/20 transition-colors"
                            >
                              <td className="px-4 py-2.5 text-[var(--muted-foreground)] whitespace-nowrap">
                                {fmtAge(err.created_at)}
                              </td>
                              <td className="px-4 py-2.5 text-[var(--muted-foreground)] font-mono text-[10px] whitespace-nowrap">
                                {err.subscriber_id.slice(0, 12)}…
                              </td>
                              <td className="px-4 py-2.5 text-red-400 max-w-xs truncate">
                                {err.error ?? "unknown error"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── No errors state ───────────────────────────────────────── */}
                {data.jobErrors.length === 0 && (
                  <div className="text-center py-6 text-[var(--muted-foreground)] text-xs font-[family-name:var(--font-geist-mono)]">
                    <span className="text-emerald-500">✓</span> No brief job errors in the last 24 hours
                  </div>
                )}

                {/* ── Recent feedback ───────────────────────────────────────── */}
                <div>
                  <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)] flex items-center gap-2">
                    RECENT FEEDBACK
                    <InfoTooltip text="Feedback from subscribers via the rating buttons in their daily and monthly briefs. Negative ratings should be followed up with the subscriber directly." />
                  </div>

                  {/* 7d summary chips */}
                  <div className="flex gap-3 mb-4">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-950/40 border border-emerald-700/40 text-emerald-300 text-xs font-[family-name:var(--font-geist-mono)]">
                      <span>👍</span>
                      <span className="font-bold">{data.feedbackGood}</span>
                      <span className="text-emerald-500/70">good (7d)</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/40 text-slate-300 text-xs font-[family-name:var(--font-geist-mono)]">
                      <span>😐</span>
                      <span className="font-bold">{data.feedbackOk}</span>
                      <span className="text-slate-500/70">ok (7d)</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-950/40 border border-red-700/40 text-red-300 text-xs font-[family-name:var(--font-geist-mono)]">
                      <span>👎</span>
                      <span className="font-bold">{data.feedbackBad}</span>
                      <span className="text-red-500/70">bad (7d)</span>
                    </div>
                  </div>

                  {data.recentFeedback.length === 0 ? (
                    <div className="text-center py-6 text-[var(--muted-foreground)] text-xs font-[family-name:var(--font-geist-mono)]">
                      No feedback received yet
                    </div>
                  ) : (
                    <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                      <table className="min-w-full text-xs font-[family-name:var(--font-geist-mono)]">
                        <thead>
                          <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                            <th className="text-left px-4 py-2.5 font-medium tracking-wider text-[10px]">TIME</th>
                            <th className="text-left px-4 py-2.5 font-medium tracking-wider text-[10px]">SUBSCRIBER</th>
                            <th className="text-left px-4 py-2.5 font-medium tracking-wider text-[10px]">RATING</th>
                            <th className="text-left px-4 py-2.5 font-medium tracking-wider text-[10px]">MESSAGE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentFeedback.map((fb) => {
                            const ratingColor =
                              fb.rating === "good" ? "text-emerald-400" :
                              fb.rating === "bad"  ? "text-red-400"     : "text-slate-400";
                            const ratingEmoji =
                              fb.rating === "good" ? "👍" :
                              fb.rating === "bad"  ? "👎" :
                              fb.rating === "ok"   ? "😐" : "—";
                            const subName = data.subNameMap.get(fb.subscriber_id) ?? fb.subscriber_id.slice(0, 10) + "…";
                            return (
                              <tr key={fb.id} className="border-t border-[var(--border)] hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-2.5 text-[var(--muted-foreground)] whitespace-nowrap">
                                  {fmtAge(fb.created_at)}
                                </td>
                                <td className="px-4 py-2.5 text-[var(--slate-300)] max-w-[120px] truncate">
                                  {subName}
                                </td>
                                <td className={`px-4 py-2.5 whitespace-nowrap font-medium ${ratingColor}`}>
                                  {ratingEmoji} {fb.rating ?? "—"}
                                </td>
                                <td className="px-4 py-2.5 text-[var(--muted-foreground)] max-w-xs truncate">
                                  {fb.message ? fb.message.slice(0, 80) + (fb.message.length > 80 ? "…" : "") : <span className="italic opacity-50">no message</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

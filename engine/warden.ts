/**
 * IQsea Automated Dispatcher — The Warden
 *
 * Scans the subscribers table on each invocation, determines who is due
 * for a brief based on their timezone, deliveryTime, and frequency, then
 * triggers the full pipeline (Engine → PDF → Email → Report record).
 *
 * Usage:
 *   npx tsx engine/warden.ts            # infinite loop (default) — polls jobs every 10s, scans subscribers every 5m
 *   npx tsx engine/warden.ts --loop 10  # infinite loop with custom scan interval (10 minutes)
 *   npx tsx engine/warden.ts --once     # one-shot scan, then exit
 *
 * Env:
 *   ENABLE_AUTO_DISPATCH=true   (master switch — skips all dispatches when false)
 */

import "dotenv/config";
import * as fs   from "fs";
import * as http from "http";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { generateBrief, generateMonthlyBrief, BriefPayload, IntelItem, MonthlyContext, MarketPulseEntry } from "./brief-generator";
import { generatePreviewStory } from "./preview-story";
import { renderBriefPdf } from "../lib/render-pdf";
import { sendEmail } from "../lib/email";
// RSS / intelligence ingestion pipeline (Phase 2 Part A Step 1)
import { registeredSources } from "./sources/index";
import { runAllIngestions } from "./sources/runner";
import "./sources/rss";      // side-effect: registers all 17 RSS feeds
import "./sources/sitemap";  // registers TradeWinds (Google News Sitemap)
import "./sources/lr";       // registers Lloyd's Register (HTML list)
import "./sources/dnv";      // registers DNV (data-props JSON, maritime-filtered)
import "./sources/wp-rest";  // registers Safety4Sea (WordPress REST API)
import "./sources/abs";      // registers ABS (Puppeteer, JS-rendered AEM page)
// Article text extraction pipeline (Phase 2 Part A Step 2)
import { extractMissingTextBatch } from "./extractors/runner";
// Vector embedding pipeline (Phase 2 Part A Step 3)
import { embedMissingItems } from "./embeddings/runner";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[Warden] Missing Supabase credentials — check env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Service-role client — bypasses RLS for server-side operations on the
// reports table. The anon key silently returns empty results on SELECT
// (breaking the duplicate guard) and fails with 42501 on INSERT (silently
// dropping delivery records). Service key is required for Warden to work.
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ?? "";
if (!SUPABASE_SERVICE_KEY) {
  console.warn(
    "[Warden] SUPABASE_SERVICE_KEY not set — reports table operations will " +
      "fail silently and the duplicate-send guard will be disabled. " +
      "Add SUPABASE_SERVICE_KEY to .env."
  );
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------------------------------------------------------------------------
// Pipeline intervals (Phase 2 Part A)
// ---------------------------------------------------------------------------

const INGESTION_INTERVAL_MS  = 20 * 60 * 1_000; // 20 minutes — RSS + sitemap polling
const EXTRACTION_INTERVAL_MS =      30 * 1_000; // 30 seconds — Jina article text extraction (was 60s)
const EMBEDDING_INTERVAL_MS  =  2 * 60 * 1_000; //  2 minutes — OpenAI vector embeddings
const HEARTBEAT_INTERVAL_MS      =  5 * 60 * 1_000; //  5 minutes — Supabase liveness heartbeat
const STALE_JOB_RECOVERY_MS      = 15 * 60 * 1_000; // 15 minutes — reset jobs stuck in processing

// ---------------------------------------------------------------------------
// Self-restart HTTP endpoint
// ---------------------------------------------------------------------------
// Warden may run in an elevated (Admin) pm2 process. Non-elevated sessions
// (e.g. Claude Code) cannot kill an elevated process via Stop-Process or
// taskkill — Windows UAC blocks cross-elevation signals.
//
// The restart endpoint works around this: it's a plain TCP connection on
// localhost, which Windows allows across elevation boundaries. The caller
// POSTs to http://127.0.0.1:RESTART_PORT/restart and Warden exits cleanly
// so pm2 auto-restarts it.
//
// Port is configurable via WARDEN_RESTART_PORT env var (default 9099).
// Auth via WARDEN_RESTART_SECRET header — optional but recommended.

const RESTART_PORT   = parseInt(process.env.WARDEN_RESTART_PORT   ?? "9099", 10);
const RESTART_SECRET = process.env.WARDEN_RESTART_SECRET ?? "";

const LOG_PATH = process.env.WARDEN_LOG_PATH ?? path.join(__dirname, "warden.log");

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(level: "INFO" | "WARN" | "ERROR", message: string): void {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_PATH, line + "\n", "utf-8");
  } catch {
    // Best-effort file logging; don't crash on write failure
  }
}

// ---------------------------------------------------------------------------
// URL Validation — strip homepage / shallow URLs before PDF rendering
// ---------------------------------------------------------------------------

/**
 * Returns true if a URL looks like a direct article link rather than a homepage.
 * Checks:
 *  - Must start with https://
 *  - Must have path depth >= 2 (e.g. domain.com/section/article)
 *    OR contain article-like path segments (/article/, /news/, /story/, /post/, /press/)
 *    OR be a known video/social platform with content path (YouTube, Vimeo, LinkedIn posts)
 *    OR contain year indicators (2024/2025/2026) suggesting a dated article
 *  - Rejects bare homepages like "https://gcaptain.com/" or "https://lloydslist.com"
 */
function isDirectArticleUrl(url: string, sectionName?: string): boolean {
  if (!url || !url.startsWith("https://")) return false;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathLower = parsed.pathname.toLowerCase();
    const fullLower = url.toLowerCase();
    const pathSegments = parsed.pathname
      .split("/")
      .filter((seg) => seg.length > 0);

    // Prospect section exception: allow landing pages & LinkedIn profiles
    if (sectionName && /prospect/i.test(sectionName)) return true;

    // Block bare homepages (no meaningful path)
    if (pathSegments.length === 0) return false;

    // Video & social intel platforms — allow if they have a content path
    if (
      (host.includes("youtube.com") || host.includes("youtu.be")) &&
      (pathLower.includes("/watch") || pathLower.includes("/shorts") || pathSegments.length >= 1)
    ) {
      return true;
    }
    if (host.includes("vimeo.com") && pathSegments.length >= 1) return true;
    if (host.includes("linkedin.com") && fullLower.includes("/posts")) return true;

    // Must have at least 2 path segments (e.g. /news/article-slug)
    if (pathSegments.length >= 2) return true;

    // Article-like path indicators even at depth 1
    const articlePatterns = [
      "article",
      "news",
      "story",
      "post",
      "press",
      "report",
      "update",
      "blog",
      "view",
    ];
    if (
      pathSegments.length >= 1 &&
      articlePatterns.some((p) => pathLower.includes(p))
    ) {
      return true;
    }

    // Year indicators in path suggest a dated article (e.g. /2026/04/story)
    if (/\/(2024|2025|2026)\//.test(parsed.pathname)) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Validate all URLs in a BriefPayload. Strips items with homepage-only or
 * shallow URLs. Logs every rejection.
 */
function validateBriefUrls(brief: BriefPayload): BriefPayload {
  function filterItems(items: IntelItem[] | null, sectionName: string): IntelItem[] | null {
    if (!items) return null;
    const filtered = items.filter((item) => {
      if (isDirectArticleUrl(item.source, sectionName)) return true;
      log("WARN", `URL rejected (${sectionName}): "${item.source}" — not a direct article URL. Headline: "${item.headline}"`);
      return false;
    });
    return filtered.length > 0 ? filtered : null;
  }

  return {
    ...brief,
    sections: brief.sections
      .map((s) => ({
        ...s,
        items: s.items.filter((item) => {
          if (isDirectArticleUrl(item.source, s.title)) return true;
          log("WARN", `URL rejected (${s.title}): "${item.source}" — not a direct article URL. Headline: "${item.headline}"`);
          return false;
        }),
      }))
      .filter((s) => s.items.length > 0),
    tenderSection: filterItems(brief.tenderSection, "Tenders"),
    prospectSection: filterItems(brief.prospectSection, "Prospects"),
    offDutySection: filterItems(brief.offDutySection, "Off-Duty"),
    competitorTrackerSection: filterItems(brief.competitorTrackerSection, "Competitor Monitoring"),
    safetySection: filterItems(brief.safetySection, "Safety"),
  };
}

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

/**
 * Return the current local hour (0-23) for a given IANA timezone.
 */
function currentHourInTz(tz: string): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);

  const hourPart = parts.find((p) => p.type === "hour");
  return hourPart ? parseInt(hourPart.value, 10) : -1;
}

/**
 * Return today's date string (YYYY-MM-DD) in the subscriber's timezone.
 */
function todayInTz(tz: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

/**
 * Return the day-of-week (0=Sun, 1=Mon, … 6=Sat) in the subscriber's timezone.
 */
function dayOfWeekInTz(tz: string): number {
  const now = new Date();
  const dayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(now);

  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[dayStr] ?? -1;
}

/**
 * Check whether today is a valid delivery day for the given frequency.
 *
 *   daily    → every day
 *   business → Mon-Fri
 *   3x       → Mon, Wed, Fri
 *   weekly   → Monday only
 */
function isDeliveryDay(frequency: string, tz: string): boolean {
  const dow = dayOfWeekInTz(tz);
  switch (frequency) {
    case "daily":
      return true;
    case "business":
      return dow >= 1 && dow <= 5;
    case "3x":
      return dow === 1 || dow === 3 || dow === 5;
    case "weekly":
      return dow === 1;
    default:
      return true; // fallback to daily
  }
}

// ---------------------------------------------------------------------------
// Duplicate guard
// ---------------------------------------------------------------------------

/**
 * Returns true if a report of the given type was already generated today
 * (in the subscriber's local timezone) for the specified user.
 */
async function alreadySentToday(
  userId: string,
  reportType: string,
  tz: string
): Promise<boolean> {
  const localDate = todayInTz(tz);
  const startOfDay = `${localDate}T00:00:00.000Z`;
  const endOfDay = `${localDate}T23:59:59.999Z`;

  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("id")
    .eq("user_id", userId)
    .eq("type", reportType)
    .gte("generated_at", startOfDay)
    .lte("generated_at", endOfDay)
    .limit(1);

  if (error) {
    log("WARN", `Duplicate check failed for ${userId}: ${error.message}`);
    return true; // err on the side of caution — don't double-send
  }
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Timezone → UTC conversion helpers
// ---------------------------------------------------------------------------

/**
 * Given a date string ("YYYY-MM-DD"), an hour, a minute, and an IANA timezone,
 * return the exact UTC Date for that local wall-clock time on that date.
 *
 * Uses the "noon-UTC offset trick":
 *   1. Create noon UTC on the given date (avoids midnight DST edge cases).
 *   2. Format that UTC instant in the target timezone to get the local hour.
 *   3. Compute offsetMs = (local noon wall-clock as UTC) − (noon UTC).
 *   4. deliveryUtc = Date.UTC(y, m-1, d, hour, minute) − offsetMs.
 */
function tzDeliveryToUtc(
  dateStr: string,
  hour: number,
  minute: number,
  tz: string
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);

  // Noon UTC on this date (safe midpoint — well away from DST transitions)
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // What hour is noon-UTC in the target timezone?
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year:   "numeric",
    month:  "2-digit",
    day:    "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(noonUtc);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  // Reconstruct local noon as a UTC ms value (no timezone applied yet)
  const localNoonAsUtcMs = Date.UTC(
    get("year"), get("month") - 1, get("day"),
    get("hour"), get("minute"), get("second")
  );

  // offsetMs: how many ms the timezone is ahead of UTC (positive = east)
  const offsetMs = localNoonAsUtcMs - noonUtc.getTime();

  // Delivery instant: local YYYY-MM-DD HH:MM minus the offset
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetMs);
}

/**
 * Find the next UTC instant when a subscriber with the given timezone,
 * deliveryTime (e.g. "09:00"), and frequency is due to receive a brief.
 *
 * Scans up to 8 days ahead from today (in the subscriber's local timezone)
 * and returns the first candidate that:
 *   - Is at least 60 s in the future (guards against race conditions)
 *   - Falls on a valid delivery day for the given frequency
 *
 * Falls back to tomorrow's delivery time if no valid day is found within
 * 8 days (shouldn't happen in practice with any supported frequency).
 */
function nextDeliveryUtc(
  tz: string,
  deliveryTimeStr: string,
  frequency: string
): Date {
  const timeParts = deliveryTimeStr.split(":");
  const hour   = parseInt(timeParts[0] ?? "9",  10);
  const minute = parseInt(timeParts[1] ?? "0",  10);
  const now    = Date.now();

  // Today's date string in the subscriber's timezone
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
  }).format(new Date());

  const [ty, tm, td] = todayStr.split("-").map(Number);

  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    // Advance by daysAhead calendar days from today (UTC date arithmetic is
    // fine here — we only need the date string for tzDeliveryToUtc)
    const checkDate = new Date(Date.UTC(ty, tm - 1, td + daysAhead));
    const dateStr   = checkDate.toISOString().slice(0, 10);

    const candidate = tzDeliveryToUtc(dateStr, hour, minute, tz);

    // Must be more than 60 s in the future
    if (candidate.getTime() <= now + 60_000) continue;

    // Check day-of-week in the subscriber's timezone
    const dowStr = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
    }).format(candidate);
    const dowMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dow = dowMap[dowStr] ?? -1;

    const isValidDay = (() => {
      switch (frequency) {
        case "daily":    return true;
        case "business": return dow >= 1 && dow <= 5;
        case "3x":       return dow === 1 || dow === 3 || dow === 5;
        case "weekly":   return dow === 1;
        default:         return true;
      }
    })();

    if (isValidDay) return candidate;
  }

  // Last-resort fallback: tomorrow at delivery time
  const tomorrow = new Date(Date.UTC(ty, tm - 1, td + 1)).toISOString().slice(0, 10);
  return tzDeliveryToUtc(tomorrow, hour, minute, tz);
}

// ---------------------------------------------------------------------------
// Scheduling dedup guard
// ---------------------------------------------------------------------------

/**
 * Returns true if a brief_jobs row already exists for this subscriber within
 * ±4 hours of the proposed scheduledAt — preventing scan() from creating
 * duplicate pre-generation jobs when it fires every 5 minutes.
 */
async function alreadyScheduledForDelivery(
  subscriberId: string,
  scheduledAt: Date
): Promise<boolean> {
  const windowStart = new Date(scheduledAt.getTime() - 4 * 60 * 60_000).toISOString();
  const windowEnd   = new Date(scheduledAt.getTime() + 4 * 60 * 60_000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("brief_jobs")
    .select("id")
    .eq("subscriber_id", subscriberId)
    .in("status", ["pending", "processing", "ready_to_send", "delivered"])
    .not("scheduled_delivery_at", "is", null)
    .gte("scheduled_delivery_at", windowStart)
    .lte("scheduled_delivery_at", windowEnd)
    .limit(1);

  if (error) {
    log("WARN", `Scheduling dedup check failed for ${subscriberId}: ${error.message}`);
    return true; // err on the side of caution — don't double-schedule
  }
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Monthly scheduling helpers
// ---------------------------------------------------------------------------

/**
 * Compute the next UTC delivery time for a monthly review.
 *
 * Handles:
 *   - reviewDay 1-28: straightforward
 *   - reviewDay 29/30/31: clamps to last day of short months
 *   - reviewDay "last": always the last calendar day of the month
 *
 * Tries current month first; if that date has already passed (or is within
 * 60 s), falls back to next month.
 */
function nextMonthlyDeliveryUtc(
  tz: string,
  deliveryTimeStr: string,
  reviewDay: number | "last"
): Date {
  const timeParts = deliveryTimeStr.split(":");
  const hour   = parseInt(timeParts[0] ?? "9",  10);
  const minute = parseInt(timeParts[1] ?? "0",  10);
  const now    = Date.now();

  // Today in the subscriber's timezone
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const [ty, tm] = todayStr.split("-").map(Number);

  for (let offset = 0; offset <= 2; offset++) {
    // Advance by offset months (handles year rollover)
    const rawMonth = tm + offset;
    const year     = rawMonth > 12 ? ty + Math.floor((rawMonth - 1) / 12) : ty;
    const month    = ((rawMonth - 1) % 12) + 1; // 1-indexed, 1-12

    // Days in this calendar month (JS trick: day-0 of month+1 = last day of month)
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getDate();

    const day = reviewDay === "last"
      ? daysInMonth
      : Math.min(reviewDay as number, daysInMonth);

    const dateStr   = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const candidate = tzDeliveryToUtc(dateStr, hour, minute, tz);

    if (candidate.getTime() > now + 60_000) return candidate;
  }

  // Last-resort fallback: 3 months from now
  const rawFallback = tm + 3;
  const yearFb  = rawFallback > 12 ? ty + 1 : ty;
  const monthFb = ((rawFallback - 1) % 12) + 1;
  const daysFb  = new Date(Date.UTC(yearFb, monthFb, 0)).getDate();
  const dayFb   = reviewDay === "last" ? daysFb : Math.min(reviewDay as number, daysFb);
  const dateFb  = `${yearFb}-${String(monthFb).padStart(2, "0")}-${String(dayFb).padStart(2, "0")}`;
  return tzDeliveryToUtc(dateFb, hour, minute, tz);
}

/**
 * Returns true if a monthly brief_job already exists for this subscriber
 * in the calendar month that contains the proposed delivery date.
 *
 * Uses an exclusive upper bound (first moment of next month) so the query
 * works correctly for months with fewer than 31 days (Apr, Jun, Sep, Nov, Feb).
 */
async function alreadyScheduledForMonth(
  subscriberId: string,
  scheduledAt: Date
): Promise<boolean> {
  const year  = scheduledAt.getUTCFullYear();
  const month = scheduledAt.getUTCMonth(); // 0-indexed
  const monthStart = new Date(Date.UTC(year, month, 1)).toISOString();
  const nextMonth  = new Date(Date.UTC(year, month + 1, 1)).toISOString(); // exclusive upper bound

  const { data, error } = await supabaseAdmin
    .from("brief_jobs")
    .select("id")
    .eq("subscriber_id", subscriberId)
    .eq("job_type", "monthly")
    .in("status", ["pending", "processing", "ready_to_send", "delivered"])
    .gte("scheduled_delivery_at", monthStart)
    .lt("scheduled_delivery_at", nextMonth)
    .limit(1);

  if (error) {
    log("WARN", `Monthly dedup check failed for ${subscriberId}: ${error.message}`);
    return true; // err on the side of caution
  }
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Delivery loop — sends ready_to_send jobs whose scheduled time has arrived
// ---------------------------------------------------------------------------

/**
 * Queries brief_jobs for rows with status='ready_to_send' and
 * scheduled_delivery_at <= now(), then sends the pre-generated brief via
 * email for each one.
 *
 * The brief content (BriefPayload JSON) was stored in the result column
 * by processJobQueue() during pre-generation.  We re-render the PDF here
 * at delivery time so the date string on the email is always "today".
 *
 * Called every DELIVERY_LOOP_INTERVAL_MS (30 s) from main().
 */
async function deliveryLoop(): Promise<void> {
  const nowIso = new Date().toISOString();

  const { data: readyJobs, error } = await supabaseAdmin
    .from("brief_jobs")
    .select("id, subscriber_id, result, scheduled_delivery_at, job_type")
    .eq("status", "ready_to_send")
    .lte("scheduled_delivery_at", nowIso)
    .order("scheduled_delivery_at", { ascending: true });

  if (error) {
    log("WARN", `[Delivery] Loop fetch failed: ${error.message}`);
    return;
  }

  if (!readyJobs || readyJobs.length === 0) return;

  log("INFO", `[Delivery] ${readyJobs.length} job(s) ready — sending...`);

  for (const job of readyJobs) {
    try {
      // Optimistic claim — only update if still ready_to_send (prevents
      // double-delivery if two Warden processes run concurrently)
      const { data: claimed } = await supabaseAdmin
        .from("brief_jobs")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .eq("status", "ready_to_send")
        .select("id");

      if (!claimed || claimed.length === 0) {
        log("INFO", `[Delivery] Job ${job.id} already claimed by another worker — skipping.`);
        continue;
      }

      const brief = job.result as BriefPayload;
      if (!brief || !brief.sections) {
        throw new Error("Job result is empty — pre-generation may have failed.");
      }

      // Subscriber lookup for email + name
      const { data: sub, error: subErr } = await supabase
        .from("subscribers")
        .select("email, fullName")
        .eq("id", job.subscriber_id)
        .single();

      if (subErr || !sub) {
        throw new Error(
          `Subscriber lookup failed: ${subErr?.message ?? "not found"}`
        );
      }

      // Render PDF — always use today's date so the brief title is current
      const pdfBuffer = await renderBriefPdf(brief, { briefJobId: job.id, subscriberId: job.subscriber_id });
      const pdfBase64 = pdfBuffer.toString("base64");

      // Subject line, filename, and email body vary by job type
      const isMonthly = (job as { job_type?: string }).job_type === "monthly";
      const dateStr   = new Date().toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      });
      const monthLabel = new Date().toLocaleDateString("en-GB", {
        month: "long", year: "numeric",
      });
      const periodLabel = brief.monthlyPeriod
        ? (() => {
            const s = new Date(brief.monthlyPeriod.start + "T12:00:00Z");
            const e = new Date(brief.monthlyPeriod.end   + "T12:00:00Z");
            return `${s.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} — ${e.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
          })()
        : monthLabel;

      const subject     = isMonthly
        ? `IQsea Monthly Review — ${monthLabel}`
        : `Your IQsea Intel Brief - ${dateStr}`;
      const pdfFilename = isMonthly
        ? `IQsea-Monthly-Review-${monthLabel.replace(/\s+/g, "-")}.pdf`
        : `IQsea-Intel-Brief-${dateStr.replace(/\s+/g, "-")}.pdf`;
      const emailHtml   = isMonthly
        ? buildMonthlyEmailHtml(sub.fullName, periodLabel)
        : buildBriefEmailHtml(sub.fullName, dateStr);

      const emailResult = await sendEmail({
        to:   sub.email,
        subject,
        html: emailHtml,
        attachments: [
          { filename: pdfFilename, content: pdfBase64, contentType: "application/pdf" },
        ],
      });
      if (!emailResult.success) {
        throw new Error(
          `Email delivery failed (${emailResult.provider ?? "unknown"}): ` +
            (emailResult.error ?? "unknown error")
        );
      }
      log("INFO", `[Delivery] Email sent via ${emailResult.provider}${emailResult.messageId ? ` (id: ${emailResult.messageId})` : ""}.`);

      // Record delivery for the duplicate-send guard
      const { error: reportErr } = await supabaseAdmin.from("reports").insert({
        user_id:      job.subscriber_id,
        type:         isMonthly ? "monthly" : "daily",
        status:       "delivered",
        subject,
        generated_at: new Date().toISOString(),
        pdf_url:      null,
      });
      if (reportErr) {
        log(
          "ERROR",
          `[Delivery] Failed to record delivery for job ${job.id}: ${reportErr.message} — ` +
            "brief was sent but duplicate guard may not fire next cycle."
        );
      }

      await supabaseAdmin
        .from("brief_jobs")
        .update({ status: "delivered", updated_at: new Date().toISOString() })
        .eq("id", job.id);

      log("INFO", `[Delivery] Job ${job.id} delivered to ${sub.email}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log("ERROR", `[Delivery] Job ${job.id} failed: ${message}`);

      await supabaseAdmin
        .from("brief_jobs")
        .update({
          status:     "error",
          error:      message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Email HTML builder — shared by dispatchBrief, processJobQueue JET mode,
// and deliveryLoop so we never duplicate this template.
// ---------------------------------------------------------------------------

// Shared sonar SVG overlay — matches PDF header exactly
const EMAIL_HEADER_SONAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="position:absolute;inset:0;pointer-events:none;opacity:0.18;" preserveAspectRatio="xMidYMid meet">
  <circle cx="72%" cy="50%" r="60"  fill="none" stroke="#2BB3CD" stroke-width="0.5"/>
  <circle cx="72%" cy="50%" r="110" fill="none" stroke="#2BB3CD" stroke-width="0.5"/>
  <circle cx="72%" cy="50%" r="165" fill="none" stroke="#2BB3CD" stroke-width="0.4"/>
  <circle cx="72%" cy="50%" r="220" fill="none" stroke="#2BB3CD" stroke-width="0.3"/>
  <circle cx="72%" cy="50%" r="278" fill="none" stroke="#2BB3CD" stroke-width="0.2"/>
  <path d="M0,30 Q120,22 240,33 T480,27 T720,34 T900,28"  fill="none" stroke="#2BB3CD" stroke-width="0.5"/>
  <path d="M0,65 Q100,57 220,68 T460,61 T700,70 T900,63"  fill="none" stroke="#2BB3CD" stroke-width="0.4"/>
  <path d="M0,100 Q130,108 260,98 T520,104 T780,96 T900,101" fill="none" stroke="#2BB3CD" stroke-width="0.35"/>
  <path d="M0,135 Q90,143 200,133 T440,140 T680,130 T900,137" fill="none" stroke="#2BB3CD" stroke-width="0.25"/>
  <circle cx="28%" cy="32%" r="1.5" fill="#2BB3CD" opacity="0.5"/>
  <circle cx="52%" cy="68%" r="1"   fill="#2BB3CD" opacity="0.4"/>
  <circle cx="78%" cy="38%" r="1.5" fill="#2BB3CD" opacity="0.5"/>
  <circle cx="42%" cy="78%" r="1"   fill="#2BB3CD" opacity="0.35"/>
  <circle cx="63%" cy="22%" r="1"   fill="#2BB3CD" opacity="0.3"/>
</svg>`;

function buildBriefEmailHtml(fullName: string, dateStr: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
      <!-- Navy branded header — matches PDF renderPageHeader() exactly -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
        <tr>
          <td style="background:#0B1F38;padding:0;position:relative;overflow:hidden;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,0.04) 1px,transparent 0);background-size:24px 24px;">
            ${EMAIL_HEADER_SONAR_SVG}
            <table width="100%" cellpadding="0" cellspacing="0" style="position:relative;z-index:1;">
              <tr>
                <td style="padding:22px 20px 22px 24px;vertical-align:middle;" width="42%">
                  <img src="https://iqsea.io/brand/logo-white-tagline.png" height="100" alt="IQSEA" style="display:block;max-width:280px;" />
                </td>
                <td style="padding:22px 24px 22px 16px;text-align:right;vertical-align:middle;border-left:1px solid rgba(43,179,205,0.4);" width="58%">
                  <div style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.05em;text-transform:uppercase;font-style:normal;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.15;">Intelligence Brief</div>
                  <div style="font-size:12px;color:#8fa8c4;margin-top:7px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${dateStr}</div>
                  <div style="font-size:12px;color:#e8eef4;margin-top:3px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${fullName || "Subscriber"}</div>
                  <div style="display:inline-block;margin-top:8px;background:rgba(255,255,255,0.12);color:#e8eef4;padding:2px 11px;border-radius:100px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;border:1px solid rgba(255,255,255,0.18);">Deep Dive</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:3px;background:#2BB3CD;"></td></tr>
      </table>
      <!-- Body -->
      <div style="padding:16px 20px 0;">
        <p style="font-size:15px;line-height:1.6;margin:0;">Hi ${fullName || "there"},</p>
        <p style="font-size:15px;line-height:1.6;margin-top:12px;">
          Your latest intelligence brief is attached as a PDF. This report was generated on ${dateStr}
          and covers the latest developments relevant to your profile.
        </p>
        <p style="font-size:15px;line-height:1.6;margin-top:12px;">
          Open the attached PDF for the full analysis.
        </p>
      </div>
      <div style="padding:12px 20px;margin-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
        IQsea Intel Engine &middot; Confidential
      </div>
    </div>
  `;
}

function buildMonthlyEmailHtml(fullName: string, periodLabel: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
      <!-- Navy branded header — matches PDF renderPageHeader() exactly -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
        <tr>
          <td style="background:#0B1F38;padding:0;position:relative;overflow:hidden;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,0.04) 1px,transparent 0);background-size:24px 24px;">
            ${EMAIL_HEADER_SONAR_SVG}
            <table width="100%" cellpadding="0" cellspacing="0" style="position:relative;z-index:1;">
              <tr>
                <td style="padding:22px 20px 22px 24px;vertical-align:middle;" width="42%">
                  <img src="https://iqsea.io/brand/logo-white-tagline.png" height="100" alt="IQSEA" style="display:block;max-width:280px;" />
                </td>
                <td style="padding:22px 24px 22px 16px;text-align:right;vertical-align:middle;border-left:1px solid rgba(43,179,205,0.4);" width="58%">
                  <div style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.05em;text-transform:uppercase;font-style:normal;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.15;">Monthly Catch-Up</div>
                  <div style="font-size:12px;color:#8fa8c4;margin-top:7px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${periodLabel}</div>
                  <div style="font-size:12px;color:#e8eef4;margin-top:3px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${fullName || "Subscriber"}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:3px;background:#2BB3CD;"></td></tr>
      </table>
      <!-- Body -->
      <div style="padding:16px 20px 0;">
        <p style="font-size:15px;line-height:1.6;margin:0;">Hi ${fullName || "there"},</p>
        <p style="font-size:15px;line-height:1.6;margin-top:12px;">
          Your Monthly Strategic Review for <strong>${periodLabel}</strong> is attached.
          This report synthesises the past month's intelligence into strategic themes,
          prospect rollups, and market trends — tailored to your profile.
        </p>
        <p style="font-size:15px;line-height:1.6;margin-top:12px;">
          Open the attached PDF for the full analysis.
        </p>
      </div>
      <div style="padding:12px 20px;margin-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
        IQsea Intel Engine &middot; Confidential
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Dispatch pipeline (Engine → PDF → Email → Report record)
// Used by scan() for legacy immediate-dispatch path.
// ---------------------------------------------------------------------------

async function dispatchBrief(subscriber: {
  id: string;
  email: string;
  fullName: string;
}): Promise<void> {
  log("INFO", `Generating brief for ${subscriber.fullName} (${subscriber.id})`);

  // Stage 1: Engine (Scout → Architect → Scribe)
  const rawBrief = await generateBrief(subscriber.id);

  // Stage 1.5: URL validation — strip homepage/shallow URLs
  const brief = validateBriefUrls(rawBrief);

  // Stage 2: Render to PDF (local — no network fetch)
  const pdfBuffer = await renderBriefPdf(brief);
  const pdfBase64 = pdfBuffer.toString("base64");

  // Stage 3: Email
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const subject = `Your IQsea Intel Brief - ${dateStr}`;
  const pdfFilename = `IQsea-Intel-Brief-${dateStr.replace(/\s+/g, "-")}.pdf`;

  const emailResult = await sendEmail({
    to:   subscriber.email,
    subject,
    html: buildBriefEmailHtml(subscriber.fullName, dateStr),
    attachments: [
      { filename: pdfFilename, content: pdfBase64, contentType: "application/pdf" },
    ],
  });
  if (!emailResult.success) {
    const detail =
      `Email delivery failed (${emailResult.provider ?? "unknown"}): ` +
      (emailResult.error ?? "unknown error");
    log("ERROR", `${detail} — recipient: ${subscriber.email}`);
    throw new Error(detail);
  }

  // Stage 4: Record delivery
  const { error: insertErr } = await supabaseAdmin.from("reports").insert({
    user_id: subscriber.id,
    type: "daily",
    status: "delivered",
    subject,
    generated_at: new Date().toISOString(),
    pdf_url: null,
  });
  if (insertErr) {
    log(
      "ERROR",
      `Failed to record delivery for ${subscriber.id}: ${insertErr.message} — brief was sent but duplicate guard may not work next cycle.`
    );
    // Don't throw — brief was already delivered, just log the tracking failure
  }

  log("INFO", `Brief delivered to ${subscriber.email} via ${emailResult.provider ?? "email"}.`);
}

// ---------------------------------------------------------------------------
// Remote Worker — poll brief_jobs for pending requests from the website
// ---------------------------------------------------------------------------

const JOB_POLL_INTERVAL_MS        =      5_000; // 5 seconds
const DELIVERY_LOOP_INTERVAL_MS   =     30_000; // 30 seconds — check ready_to_send jobs
const PRE_GENERATE_WINDOW_MS      = 30 * 60_000; // 30 minutes before delivery

/**
 * Scan the brief_jobs table for rows with status "pending".
 * For each one, claim it (set status → "processing"), run the
 * generation pipeline, and update the row with the result or error.
 *
 * This replaces the old Vercel after() pattern which was killed
 * by the serverless runtime before the pipeline could finish.
 */
async function processJobQueue(): Promise<void> {
  const { data: pendingJobs, error: fetchErr } = await supabase
    .from("brief_jobs")
    .select("id, subscriber_id, dispatch_now, job_type, preview_subject, scheduled_delivery_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (fetchErr) {
    log("WARN", `Job queue fetch failed: ${fetchErr.message}`);
    return;
  }

  if (!pendingJobs || pendingJobs.length === 0) return;

  log("INFO", `Found ${pendingJobs.length} pending job(s) in brief_jobs queue.`);

  for (const job of pendingJobs) {
    try {
      // Claim the job — set to "processing" so no other worker picks it up
      await supabase
        .from("brief_jobs")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", job.id);

      log("INFO", `Processing job ${job.id} for subscriber ${job.subscriber_id}${job.dispatch_now ? " [DISPATCH MODE]" : ""}${job.job_type === "preview" ? " [PREVIEW]" : ""}`);

      // ── Monthly review jobs ───────────────────────────────────────────────
      if (job.job_type === "monthly") {
        log("INFO", `[Monthly] Processing review job ${job.id} for subscriber ${job.subscriber_id}`);

        // Determine the review period: rolling 30 days ending on the delivery date
        const deliveryDate    = job.scheduled_delivery_at
          ? new Date(job.scheduled_delivery_at)
          : new Date();
        const periodStartDate = new Date(deliveryDate.getTime() - 30 * 24 * 60 * 60 * 1_000);
        const periodStart     = periodStartDate.toISOString().slice(0, 10);
        const periodEnd       = deliveryDate.toISOString().slice(0, 10);

        // Aggregate data from the same 30-day window
        const thirtyDaysAgo = periodStartDate.toISOString();
        const { data: pastJobs } = await supabaseAdmin
          .from("brief_jobs")
          .select("result, created_at")
          .eq("subscriber_id", job.subscriber_id)
          .in("status", ["delivered", "complete", "ready_to_send"])
          .not("job_type", "eq", "monthly")
          .not("job_type", "eq", "preview")
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: false })
          .limit(35); // ~5 per week × 7 weeks safety margin

        const prospectItems: IntelItem[]      = [];
        const tenderItems:   IntelItem[]      = [];
        const marketPulseEntries: MarketPulseEntry[] = [];

        for (const pastJob of pastJobs ?? []) {
          const r = (pastJob as { result: BriefPayload | null }).result;
          if (!r) continue;
          r.prospectSection?.forEach((item) => {
            if (item.headline?.trim()) prospectItems.push(item);
          });
          r.tenderSection?.forEach((item) => {
            if (item.headline?.trim()) tenderItems.push(item);
          });
          r.marketPulseSection?.forEach((entry) => {
            if (entry.metric?.trim()) marketPulseEntries.push(entry);
          });
        }

        const briefCount = pastJobs?.length ?? 0;
        // Earliest brief date in the window — used to adjust the period label for sparse data.
        const dataStart: string | undefined = briefCount > 0
          ? (pastJobs![pastJobs!.length - 1] as { created_at: string }).created_at.slice(0, 10)
          : undefined;

        log(
          "INFO",
          `[Monthly] Aggregated from ${briefCount} past jobs: ` +
            `${prospectItems.length} prospects, ${tenderItems.length} tenders, ${marketPulseEntries.length} market entries`
        );

        const monthlyContext: MonthlyContext = {
          prospectItems,
          tenderItems,
          marketPulseEntries,
          periodStart,
          periodEnd,
          briefCount,
          dataStart,
        };

        const monthlyBrief = await generateMonthlyBrief(job.subscriber_id, monthlyContext);

        await supabaseAdmin
          .from("brief_jobs")
          .update({
            status:    "ready_to_send",
            result:    monthlyBrief,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        log("INFO", `[Monthly] Job ${job.id} ready_to_send at ${job.scheduled_delivery_at}.`);
        continue;
      }

      // Preview jobs: single-story fast path — skip full brief pipeline
      if (job.job_type === "preview") {
        const subject = job.preview_subject ?? "maritime intelligence";
        const story = await generatePreviewStory(subject);
        await supabase
          .from("brief_jobs")
          .update({
            status: "complete",
            result: story,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        log("INFO", `Preview job ${job.id} complete.`);
        continue;
      }

      const rawBrief = await generateBrief(job.subscriber_id);
      const brief = validateBriefUrls(rawBrief);

      if (job.scheduled_delivery_at) {
        // Pre-generation mode: brief is ready; delivery loop will send the email
        // when scheduled_delivery_at arrives (within the next 30s delivery tick).
        await supabase
          .from("brief_jobs")
          .update({
            status: "ready_to_send",
            result: brief,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        log(
          "INFO",
          `Job ${job.id} pre-generated — ready_to_send at ${job.scheduled_delivery_at}.`
        );
      } else if (job.dispatch_now) {
        // JET mode (legacy — dispatch_now without scheduled_delivery_at):
        // full pipeline — generate + PDF + email delivery in one shot.
        log("INFO", `Job ${job.id} — rendering PDF...`);

        // Look up subscriber email + name for delivery
        const { data: sub, error: subErr } = await supabase
          .from("subscribers")
          .select("email, fullName")
          .eq("id", job.subscriber_id)
          .single();

        if (subErr || !sub) {
          throw new Error(`Subscriber lookup failed: ${subErr?.message ?? "not found"}`);
        }

        const pdfBuffer = await renderBriefPdf(brief);
        const pdfBase64 = pdfBuffer.toString("base64");

        const dateStr = new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const subject = `Your IQsea Intel Brief - ${dateStr}`;
        const pdfFilename = `IQsea-Intel-Brief-${dateStr.replace(/\s+/g, "-")}.pdf`;

        const htmlBody = buildBriefEmailHtml(sub.fullName, dateStr);

        log("INFO", `Job ${job.id} — delivering to ${sub.email}...`);

        const emailResult = await sendEmail({
          to:   sub.email,
          subject,
          html: htmlBody,
          attachments: [
            { filename: pdfFilename, content: pdfBase64, contentType: "application/pdf" },
          ],
        });
        if (!emailResult.success) {
          const detail =
            `Email delivery failed (${emailResult.provider ?? "unknown"}): ` +
            (emailResult.error ?? "unknown error");
          log("ERROR", `Job ${job.id} — ${detail}`);
          throw new Error(detail);
        }

        // Record delivery in reports table
        const { error: jobInsertErr } = await supabaseAdmin.from("reports").insert({
          user_id: job.subscriber_id,
          type: "daily",
          status: "delivered",
          subject,
          generated_at: new Date().toISOString(),
          pdf_url: null,
        });
        if (jobInsertErr) {
          log(
            "ERROR",
            `Failed to record delivery for job ${job.id}: ${jobInsertErr.message} — brief was sent but duplicate guard may not work next cycle.`
          );
        }

        await supabase
          .from("brief_jobs")
          .update({
            status: "delivered",
            result: brief,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        log("INFO", `Job ${job.id} DELIVERED to ${sub.email}.`);
      } else {
        // Legacy mode: just generate and store result
        await supabase
          .from("brief_jobs")
          .update({
            status: "complete",
            result: brief,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        log("INFO", `Job ${job.id} complete.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log("ERROR", `Job ${job.id} failed: ${message}`);

      await supabase
        .from("brief_jobs")
        .update({
          status: "error",
          error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Main scan — pre-generates briefs within the 30-minute delivery window
// ---------------------------------------------------------------------------

/**
 * For each subscriber whose next delivery time is within the next 30 minutes,
 * inserts a brief_jobs row (status="pending", scheduled_delivery_at=computed UTC)
 * so processJobQueue() can generate the brief immediately.  The delivery loop
 * then sends the email once scheduled_delivery_at arrives.
 *
 * Dedup guard: alreadyScheduledForDelivery() checks for an existing job within
 * ±4 hours of the computed delivery time — scan() runs every 5 minutes, so
 * without the guard it would create ~6 duplicate jobs per delivery slot.
 *
 * Timing:
 *   scan interval:           5 min   (default)
 *   pre-generate window:    30 min   before scheduled_delivery_at
 *   delivery loop interval: 30 s     — email sent within 30 s of the target time
 */
async function scan(): Promise<void> {
  // Master switch
  if (process.env.ENABLE_AUTO_DISPATCH !== "true") {
    log("WARN", "ENABLE_AUTO_DISPATCH is not 'true' — skipping scan.");
    return;
  }

  log("INFO", "Warden scan starting...");

  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select("id, email, fullName, frequency, timezone, deliveryTime, monthlyReviewDay, monthlyReviewTime")
    .eq("onboarding_complete", true)
    .or("paused.is.null,paused.eq.false");

  if (error || !subscribers) {
    log("ERROR", `Failed to fetch subscribers: ${error?.message ?? "no data"}`);
    return;
  }

  log("INFO", `Found ${subscribers.length} subscriber(s). Evaluating pre-generation windows...`);

  let scheduled = 0;
  let skipped   = 0;
  const now     = Date.now();

  for (const sub of subscribers) {
    const tz              = sub.timezone     || "UTC";
    const deliveryTimeStr = sub.deliveryTime || "09:00";
    const frequency       = sub.frequency   || "daily";

    // Compute when this subscriber's next brief is due (in UTC)
    const nextDelivery     = nextDeliveryUtc(tz, deliveryTimeStr, frequency);
    const msUntilDelivery  = nextDelivery.getTime() - now;

    // Gate 1: Is the delivery within the 30-minute pre-generation window?
    // (msUntilDelivery < 0 means the window has passed but the brief hasn't
    //  been sent yet — still schedule so the delivery loop can catch up.)
    if (msUntilDelivery > PRE_GENERATE_WINDOW_MS) {
      skipped++;
      continue;
    }

    // Gate 2: Is today even a valid delivery day for this frequency?
    // (nextDeliveryUtc already picks the next valid day, but if it returned
    //  a future-week day and we're checking early, guard here.)
    if (!isDeliveryDay(frequency, tz)) {
      log("INFO", `Skipping ${sub.fullName} — not a ${frequency} delivery day.`);
      skipped++;
      continue;
    }

    // Gate 3: Already sent today? (covers the case where delivery loop ran
    //  earlier the same day and a late scan() fires again)
    if (await alreadySentToday(sub.id, "daily", tz)) {
      log("INFO", `Skipping ${sub.fullName} — brief already delivered today.`);
      skipped++;
      continue;
    }

    // Gate 4: Already a job in the queue for this delivery slot?
    if (await alreadyScheduledForDelivery(sub.id, nextDelivery)) {
      log(
        "INFO",
        `Skipping ${sub.fullName} — job already scheduled for ${nextDelivery.toISOString()}.`
      );
      skipped++;
      continue;
    }

    // All gates passed — create pre-generation job
    const { error: insertErr } = await supabaseAdmin
      .from("brief_jobs")
      .insert({
        subscriber_id:          sub.id,
        status:                 "pending",
        scheduled_delivery_at:  nextDelivery.toISOString(),
      });

    if (insertErr) {
      log(
        "ERROR",
        `Failed to schedule job for ${sub.fullName} (${sub.id}): ${insertErr.message}`
      );
    } else {
      const minUntil = Math.round(msUntilDelivery / 60_000);
      log(
        "INFO",
        `Scheduled pre-generation for ${sub.fullName} — delivery at ` +
          `${nextDelivery.toISOString()} (T-${minUntil} min)`
      );
      scheduled++;
    }
  }

  log(
    "INFO",
    `Scan complete (daily). Scheduled: ${scheduled}, Skipped: ${skipped}, Total: ${subscribers.length}`
  );

  // ── Monthly scheduling ────────────────────────────────────────────────
  // Only process subscribers who have configured a monthlyReviewDay.
  const monthlyEligible = subscribers.filter(
    (s) => s.monthlyReviewDay !== null && s.monthlyReviewDay !== undefined
  );

  if (monthlyEligible.length === 0) return;

  let monthlyScheduled = 0;
  let monthlySkipped   = 0;

  for (const sub of monthlyEligible) {
    const tz         = sub.timezone     || "UTC";
    const reviewTime = sub.monthlyReviewTime || sub.deliveryTime || "09:00";
    const reviewDay  = sub.monthlyReviewDay as number | "last";

    const nextMonthly    = nextMonthlyDeliveryUtc(tz, reviewTime, reviewDay);
    const msUntilMonthly = nextMonthly.getTime() - now;

    // Only schedule within the 30-minute pre-generation window
    if (msUntilMonthly > PRE_GENERATE_WINDOW_MS) {
      monthlySkipped++;
      continue;
    }

    // Already scheduled for this calendar month?
    if (await alreadyScheduledForMonth(sub.id, nextMonthly)) {
      log("INFO", `[Monthly] Skipping ${sub.fullName} — already scheduled this month.`);
      monthlySkipped++;
      continue;
    }

    const { error: insertErr } = await supabaseAdmin
      .from("brief_jobs")
      .insert({
        subscriber_id:         sub.id,
        status:                "pending",
        job_type:              "monthly",
        scheduled_delivery_at: nextMonthly.toISOString(),
      });

    if (insertErr) {
      log("ERROR", `[Monthly] Failed to schedule for ${sub.fullName}: ${insertErr.message}`);
    } else {
      const minUntil = Math.round(msUntilMonthly / 60_000);
      log(
        "INFO",
        `[Monthly] Scheduled review for ${sub.fullName} — delivery at ` +
          `${nextMonthly.toISOString()} (T-${minUntil} min)`
      );
      monthlyScheduled++;
    }
  }

  if (monthlyEligible.length > 0) {
    log(
      "INFO",
      `[Monthly] Scheduling complete. Scheduled: ${monthlyScheduled}, Skipped: ${monthlySkipped}, Eligible: ${monthlyEligible.length}`
    );
  }
}

// ---------------------------------------------------------------------------
// Stale job recovery
// ---------------------------------------------------------------------------

/**
 * Reset brief_jobs rows that have been stuck in "processing" for >30 minutes.
 * This handles crashes, OOM kills, or pm2 restarts that interrupted a job
 * mid-flight. Without this, a crashed job is permanently orphaned.
 */
async function recoverStaleJobs(): Promise<void> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("brief_jobs")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("updated_at", thirtyMinAgo)
    .select("id");

  if (error) {
    log("WARN", `[StaleJobRecovery] Query failed: ${error.message}`);
    return;
  }
  if (data && data.length > 0) {
    log("INFO", `[StaleJobRecovery] Reset ${data.length} stale job(s) back to pending: ${data.map((r: { id: string }) => r.id).join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Heartbeat — Supabase liveness write
// ---------------------------------------------------------------------------

/**
 * Upsert a heartbeat row for service='warden' into the heartbeats table.
 * Called on startup and every HEARTBEAT_INTERVAL_MS (5 min) in the loop.
 *
 * Metadata included:
 *   registered_sources  — number of active intelligence sources
 *   node_version        — Node.js version string
 *   uptime_seconds      — process uptime since Warden started
 *   last_ingestion_at   — ISO timestamp of most recent ingestion run (optional)
 *   last_extraction_at  — ISO timestamp of most recent extraction cycle (optional)
 *   last_embedding_at   — ISO timestamp of most recent embedding cycle (optional)
 */
async function writeHeartbeat(
  extra?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("heartbeats")
    .upsert(
      {
        service:   "warden",
        last_beat: new Date().toISOString(),
        metadata:  {
          registered_sources: registeredSources.length,
          node_version:       process.version,
          uptime_seconds:     Math.floor(process.uptime()),
          ...extra,
        },
      },
      { onConflict: "service" }
    );

  if (error) {
    log("WARN", `[Heartbeat] Write failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Warden starting...");

  // Log registered intelligence sources on startup
  if (registeredSources.length > 0) {
    log(
      "INFO",
      `Registered ${registeredSources.length} intelligence source(s): ${registeredSources.map((s) => s.name).join(", ")}`
    );
  } else {
    log("WARN", "No intelligence sources registered — ingestion pipeline inactive.");
  }

  // Startup heartbeat — signals to /api/health that Warden is alive
  await writeHeartbeat();

  // ── Self-restart HTTP server ─────────────────────────────────────────────
  // Listens on localhost only. Accepts POST /restart, verifies optional secret
  // header, then exits cleanly so pm2 can auto-restart the process.
  // This works across UAC elevation boundaries where process signals cannot.
  http
    .createServer((req, res) => {
      if (req.method !== "POST" || req.url !== "/restart") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      if (RESTART_SECRET) {
        const provided = req.headers["x-restart-secret"] ?? "";
        if (provided !== RESTART_SECRET) {
          res.writeHead(403);
          res.end("Forbidden");
          log("WARN", "[RestartServer] Unauthorized restart attempt — wrong secret.");
          return;
        }
      }
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK — restarting");
      log("INFO", "[RestartServer] Restart request accepted — exiting for pm2 restart...");
      // Brief delay lets the response flush before we exit
      setTimeout(() => process.exit(0), 250);
    })
    .listen(RESTART_PORT, "127.0.0.1", () => {
      log("INFO", `[RestartServer] Listening on http://127.0.0.1:${RESTART_PORT}/restart`);
    });

  const args = process.argv.slice(2);
  const oneShot = args.includes("--once");

  if (oneShot) {
    // One-shot mode — run scan, job queue, ingestion, extraction, embedding, then exit
    log("INFO", "Warden one-shot mode (--once).");
    try {
      await scan();
      await processJobQueue();
      await runAllIngestions(supabaseAdmin, log);
      const exCounts = await extractMissingTextBatch(supabaseAdmin, log);
      log(
        "INFO",
        `[Extraction] one-shot cycle: ${exCounts.attempted} attempted · ` +
          `${exCounts.succeeded} succeeded · ${exCounts.failed} failed · ` +
          `${exCounts.skipped} skipped`
      );
      const embCounts = await embedMissingItems(supabaseAdmin, log);
      log(
        "INFO",
        `[Embeddings] one-shot cycle: ${embCounts.attempted} attempted · ` +
          `${embCounts.succeeded} succeeded · ${embCounts.failed} failed`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("ERROR", `One-shot error: ${msg}`);
    }
    return;
  }

  // Default: infinite loop mode
  const loopIdx = args.indexOf("--loop");
  const intervalMin = loopIdx !== -1
    ? parseInt(args[loopIdx + 1] || "5", 10)
    : 5;
  const scanIntervalMs = intervalMin * 60_000;

  log(
    "INFO",
    `Warden loop mode — scan every ${intervalMin}m, job queue every ${JOB_POLL_INTERVAL_MS / 1000}s, ` +
      `delivery loop every ${DELIVERY_LOOP_INTERVAL_MS / 1000}s, ` +
      `ingestion every ${INGESTION_INTERVAL_MS / 60_000}m, extraction every ${EXTRACTION_INTERVAL_MS / 1000}s, ` +
      `embedding every ${EMBEDDING_INTERVAL_MS / 1000}s, ` +
      `heartbeat every ${HEARTBEAT_INTERVAL_MS / 60_000}m.`
  );

  let lastScanTime        = Date.now(); // Start at now so scan() waits — no immediate subscriber blast on boot
  let lastIngestionRun    = 0;          // Start at 0 so ingestion fires on the first loop tick
  let lastExtractionRun   = 0;          // Start at 0 so extraction fires on the first loop tick
  let lastEmbeddingRun    = 0;          // Start at 0 so embedding fires on the first loop tick
  let lastDeliveryCheck   = 0;          // Start at 0 so delivery loop fires on the first tick
  let lastHeartbeatRun    = Date.now(); // Start at now — startup beat already written above
  let lastStaleJobCheck   = 0;          // Start at 0 so recovery fires on the first loop tick

  // Track cycle timestamps for heartbeat metadata
  let lastIngestionAt:  string | undefined;
  let lastExtractionAt: string | undefined;
  let lastEmbeddingAt:  string | undefined;

  while (true) {
    const now = Date.now();

    // Job queue poll every iteration (fast — 5s)
    try {
      await processJobQueue();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("ERROR", `Unhandled error during job queue poll: ${msg}`);
    }

    // Delivery loop — check ready_to_send jobs every 30 s
    if (now - lastDeliveryCheck >= DELIVERY_LOOP_INTERVAL_MS) {
      lastDeliveryCheck = Date.now();
      try {
        await deliveryLoop();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled error during delivery loop: ${msg}`);
      }
    }

    // Subscriber scan on the slow interval (default 5 min)
    if (now - lastScanTime >= scanIntervalMs) {
      try {
        await scan();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled error during scan: ${msg}`);
      }
      lastScanTime = Date.now();
    }

    // RSS / sitemap ingestion on its own cadence (default 20 min)
    if (now - lastIngestionRun >= INGESTION_INTERVAL_MS) {
      lastIngestionRun = Date.now();
      try {
        await runAllIngestions(supabaseAdmin, log);
        lastIngestionAt = new Date().toISOString();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled error during ingestion: ${msg}`);
      }
    }

    // Article text extraction — runs every 30s, processes up to 20 items in parallel waves
    if (now - lastExtractionRun >= EXTRACTION_INTERVAL_MS) {
      lastExtractionRun = Date.now();
      try {
        const counts = await extractMissingTextBatch(supabaseAdmin, log);
        if (counts.attempted > 0 || counts.skipped > 0) {
          log(
            "INFO",
            `[Extraction] cycle complete: ${counts.attempted} attempted · ` +
              `${counts.succeeded} succeeded · ${counts.failed} failed · ` +
              `${counts.skipped} skipped (paywalled/maxed)`
          );
        }
        lastExtractionAt = new Date().toISOString();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled error during extraction: ${msg}`);
      }
    }

    // Vector embedding — runs every 2 minutes, processes up to 20 items
    if (now - lastEmbeddingRun >= EMBEDDING_INTERVAL_MS) {
      lastEmbeddingRun = Date.now();
      try {
        const counts = await embedMissingItems(supabaseAdmin, log);
        if (counts.attempted > 0) {
          log(
            "INFO",
            `[Embeddings] cycle complete: ${counts.attempted} attempted · ` +
              `${counts.succeeded} succeeded · ${counts.failed} failed`
          );
        }
        lastEmbeddingAt = new Date().toISOString();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled error during embedding: ${msg}`);
      }
    }

    // Stale job recovery — reset processing jobs older than 30 min every 15 min
    if (now - lastStaleJobCheck >= STALE_JOB_RECOVERY_MS) {
      lastStaleJobCheck = Date.now();
      try {
        await recoverStaleJobs();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("WARN", `[StaleJobRecovery] Unexpected error: ${msg}`);
      }
    }

    // Heartbeat — upsert liveness row every 5 minutes
    if (now - lastHeartbeatRun >= HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatRun = Date.now();
      try {
        await writeHeartbeat({
          ...(lastIngestionAt  ? { last_ingestion_at:  lastIngestionAt  } : {}),
          ...(lastExtractionAt ? { last_extraction_at: lastExtractionAt } : {}),
          ...(lastEmbeddingAt  ? { last_embedding_at:  lastEmbeddingAt  } : {}),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("WARN", `Heartbeat failed (non-fatal): ${msg}`);
      }
    }

    console.log(`[Warden] Loop tick complete — sleeping ${JOB_POLL_INTERVAL_MS / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, JOB_POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error(`[Warden] Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

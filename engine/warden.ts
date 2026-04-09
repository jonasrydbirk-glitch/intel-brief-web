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
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { generateBrief, BriefPayload, IntelItem } from "./brief-generator";
import { renderBriefPdf } from "../lib/render-pdf";
import { sendViaGraph } from "../lib/postman";

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

const LOG_PATH = path.join(__dirname, "warden.log");

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
function isDirectArticleUrl(url: string): boolean {
  if (!url || !url.startsWith("https://")) return false;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathLower = parsed.pathname.toLowerCase();
    const fullLower = url.toLowerCase();
    const pathSegments = parsed.pathname
      .split("/")
      .filter((seg) => seg.length > 0);

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
      if (isDirectArticleUrl(item.source)) return true;
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
          if (isDirectArticleUrl(item.source)) return true;
          log("WARN", `URL rejected (${s.title}): "${item.source}" — not a direct article URL. Headline: "${item.headline}"`);
          return false;
        }),
      }))
      .filter((s) => s.items.length > 0),
    tenderSection: filterItems(brief.tenderSection, "Tenders"),
    prospectSection: filterItems(brief.prospectSection, "Prospects"),
    offDutySection: filterItems(brief.offDutySection, "Off-Duty"),
    competitorTrackerSection: filterItems(brief.competitorTrackerSection, "Competitors"),
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

  const { data, error } = await supabase
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
// Dispatch pipeline (Engine → PDF → Email → Report record)
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

  const htmlBody = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
      <div style="text-align:center;padding:24px 0 16px;border-bottom:2px solid #0ea5e9;">
        <div style="font-size:24px;font-weight:800;color:#0c4a6e;letter-spacing:0.04em;">IQsea</div>
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;">Intelligence Brief</div>
      </div>
      <div style="padding:24px 0;">
        <p style="font-size:15px;line-height:1.6;">Hi ${subscriber.fullName || "there"},</p>
        <p style="font-size:15px;line-height:1.6;margin-top:12px;">
          Your latest intelligence brief is attached as a PDF. This report was generated on ${dateStr}
          and covers the latest developments relevant to your profile.
        </p>
        <p style="font-size:15px;line-height:1.6;margin-top:12px;">
          Open the attached PDF for the full analysis.
        </p>
      </div>
      <div style="padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
        IQsea Intel Engine &middot; Confidential
      </div>
    </div>
  `;

  try {
    await sendViaGraph({
      to: subscriber.email,
      subject,
      htmlBody,
      attachments: [
        {
          filename: pdfFilename,
          contentBytes: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (mailErr) {
    const detail = mailErr instanceof Error ? mailErr.message : String(mailErr);
    log("ERROR", `Postman failed for ${subscriber.email}: ${detail}`);
    throw mailErr;
  }

  // Stage 4: Record delivery
  await supabase.from("reports").insert({
    user_id: subscriber.id,
    type: "daily",
    status: "delivered",
    subject,
    generated_at: new Date().toISOString(),
    pdf_url: null,
  });

  log("INFO", `Brief delivered to ${subscriber.email} via Graph API`);
}

// ---------------------------------------------------------------------------
// Remote Worker — poll brief_jobs for pending requests from the website
// ---------------------------------------------------------------------------

const JOB_POLL_INTERVAL_MS = 10_000; // 10 seconds

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
    .select("id, subscriber_id, dispatch_now")
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

      log("INFO", `Processing job ${job.id} for subscriber ${job.subscriber_id}${job.dispatch_now ? " [DISPATCH MODE]" : ""}`);

      const rawBrief = await generateBrief(job.subscriber_id);
      const brief = validateBriefUrls(rawBrief);

      if (job.dispatch_now) {
        // JET mode: full pipeline — generate + PDF + email delivery
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

        const htmlBody = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="text-align:center;padding:24px 0 16px;border-bottom:2px solid #0ea5e9;">
              <div style="font-size:24px;font-weight:800;color:#0c4a6e;letter-spacing:0.04em;">IQsea</div>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;">Intelligence Brief</div>
            </div>
            <div style="padding:24px 0;">
              <p style="font-size:15px;line-height:1.6;">Hi ${sub.fullName || "there"},</p>
              <p style="font-size:15px;line-height:1.6;margin-top:12px;">
                Your latest intelligence brief is attached as a PDF. This report was generated on ${dateStr}
                and covers the latest developments relevant to your profile.
              </p>
              <p style="font-size:15px;line-height:1.6;margin-top:12px;">
                Open the attached PDF for the full analysis.
              </p>
            </div>
            <div style="padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
              IQsea Intel Engine &middot; Confidential
            </div>
          </div>
        `;

        log("INFO", `Job ${job.id} — Postman delivering to ${sub.email}...`);

        try {
          await sendViaGraph({
            to: sub.email,
            subject,
            htmlBody,
            attachments: [
              {
                filename: pdfFilename,
                contentBytes: pdfBase64,
                contentType: "application/pdf",
              },
            ],
          });
        } catch (mailErr) {
          const detail = mailErr instanceof Error ? mailErr.message : String(mailErr);
          log("ERROR", `Postman failed for ${sub.email}: ${detail}`);
          throw mailErr;
        }

        // Record delivery in reports table
        await supabase.from("reports").insert({
          user_id: job.subscriber_id,
          type: "daily",
          status: "delivered",
          subject,
          generated_at: new Date().toISOString(),
          pdf_url: null,
        });

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
// Main scan (scheduled subscriber dispatches)
// ---------------------------------------------------------------------------

async function scan(): Promise<void> {
  // Master switch
  if (process.env.ENABLE_AUTO_DISPATCH !== "true") {
    log("WARN", "ENABLE_AUTO_DISPATCH is not 'true' — skipping scan.");
    return;
  }

  log("INFO", "Warden scan starting...");

  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select("id, email, fullName, frequency, timezone, deliveryTime");

  if (error || !subscribers) {
    log("ERROR", `Failed to fetch subscribers: ${error?.message ?? "no data"}`);
    return;
  }

  log("INFO", `Found ${subscribers.length} subscriber(s). Evaluating schedules...`);

  let dispatched = 0;
  let skipped = 0;

  for (const sub of subscribers) {
    const tz = sub.timezone || "UTC";
    const deliveryHour = parseInt((sub.deliveryTime || "09:00").split(":")[0], 10);
    const currentHour = currentHourInTz(tz);
    const frequency = sub.frequency || "daily";

    // Gate 1: Is it the right hour?
    if (currentHour !== deliveryHour) {
      skipped++;
      continue;
    }

    // Gate 2: Is today a valid delivery day for this frequency?
    if (!isDeliveryDay(frequency, tz)) {
      log("INFO", `Skipping ${sub.fullName} — not a ${frequency} delivery day.`);
      skipped++;
      continue;
    }

    // Gate 3: Has a brief already been sent today?
    if (await alreadySentToday(sub.id, "daily", tz)) {
      log("INFO", `Skipping ${sub.fullName} — already sent today.`);
      skipped++;
      continue;
    }

    // All gates passed — dispatch
    try {
      await dispatchBrief({
        id: sub.id,
        email: sub.email,
        fullName: sub.fullName,
      });
      dispatched++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("ERROR", `Failed to dispatch for ${sub.fullName} (${sub.id}): ${msg}`);
    }
  }

  log(
    "INFO",
    `Scan complete. Dispatched: ${dispatched}, Skipped: ${skipped}, Total: ${subscribers.length}`
  );
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Warden starting...");

  const args = process.argv.slice(2);
  const oneShot = args.includes("--once");

  if (oneShot) {
    // One-shot mode — run both, then exit
    log("INFO", "Warden one-shot mode (--once).");
    try {
      await scan();
      await processJobQueue();
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

  log("INFO", `Warden loop mode — scan every ${intervalMin}m, job queue every ${JOB_POLL_INTERVAL_MS / 1000}s. Waiting for first scan interval before subscriber dispatch.`);

  let lastScanTime = Date.now(); // Start at now so scan() waits for the full interval — no immediate subscriber blast on boot

  while (true) {
    const now = Date.now();

    // Job queue poll every iteration (fast interval)
    try {
      await processJobQueue();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("ERROR", `Unhandled error during job queue poll: ${msg}`);
    }

    // Subscriber scan on the slow interval
    if (now - lastScanTime >= scanIntervalMs) {
      try {
        await scan();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled error during scan: ${msg}`);
      }
      lastScanTime = Date.now();
    }

    console.log(`[Warden] Loop tick complete — sleeping ${JOB_POLL_INTERVAL_MS / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, JOB_POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error(`[Warden] Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

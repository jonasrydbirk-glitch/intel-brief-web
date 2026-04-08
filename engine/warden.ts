/**
 * IQsea Automated Dispatcher — The Warden
 *
 * Scans the subscribers table on each invocation, determines who is due
 * for a brief based on their timezone, deliveryTime, and frequency, then
 * triggers the full pipeline (Engine → PDF → Email → Report record).
 *
 * Usage:
 *   npx tsx engine/warden.ts            # one-shot scan
 *   npx tsx engine/warden.ts --loop 5   # scan every 5 minutes
 *
 * Env:
 *   ENABLE_AUTO_DISPATCH=true   (master switch — skips all dispatches when false)
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { generateBrief } from "./brief-generator";
import { renderBriefPdf } from "../lib/render-pdf";
import { sendEmail } from "../lib/delivery";

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
  throw new Error("Missing Supabase credentials.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LOG_PATH = path.join(__dirname, "warden.log");

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(level: "INFO" | "WARN" | "ERROR", message: string): void {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${message}`;
  try {
    fs.appendFileSync(LOG_PATH, line + "\n", "utf-8");
  } catch {
    // Best-effort file logging; don't crash on write failure
  }
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
// Dispatch pipeline (mirrors /api/admin/send-brief)
// ---------------------------------------------------------------------------

async function dispatchBrief(subscriber: {
  id: string;
  email: string;
  fullName: string;
}): Promise<void> {
  log("INFO", `Generating brief for ${subscriber.fullName} (${subscriber.id})`);

  // Stage 1: Engine (Scout → Architect → Scribe)
  const brief = await generateBrief(subscriber.id);

  // Stage 2: Render to PDF
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const pdfBuffer = await renderBriefPdf(brief, baseUrl);
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

  await sendEmail({
    to: subscriber.email,
    from: "brief@iqsea.io",
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

  // Stage 4: Record delivery
  await supabase.from("reports").insert({
    user_id: subscriber.id,
    type: "daily",
    status: "delivered",
    subject,
    generated_at: new Date().toISOString(),
    pdf_url: null,
  });

  log("INFO", `Brief delivered to ${subscriber.email}`);
}

// ---------------------------------------------------------------------------
// Main scan
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
  const args = process.argv.slice(2);
  const loopIdx = args.indexOf("--loop");

  if (loopIdx !== -1) {
    const intervalMin = parseInt(args[loopIdx + 1] || "5", 10);
    const intervalMs = intervalMin * 60_000;
    log("INFO", `Warden starting in loop mode — scanning every ${intervalMin} minute(s).`);

    // Initial scan
    await scan();

    // Repeat on interval
    setInterval(async () => {
      try {
        await scan();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Unhandled error during scan: ${msg}`);
      }
    }, intervalMs);
  } else {
    // One-shot mode
    await scan();
  }
}

main().catch((err) => {
  log("ERROR", `Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

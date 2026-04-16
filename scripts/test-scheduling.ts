/**
 * Scheduling simulation test — scripts/test-scheduling.ts
 *
 * Validates the tzDeliveryToUtc + nextDeliveryUtc helpers by simulating
 * pre-generation scheduling for subscribers in different timezones.
 *
 * For each test case it prints:
 *   • The computed next delivery UTC
 *   • The local delivery time back-converted for verification
 *   • When the Warden would start pre-generation (T-30 min)
 *
 * Usage:
 *   npx tsx scripts/test-scheduling.ts
 *
 * No DB connection required — pure timezone arithmetic.
 */

import "dotenv/config";

// ---------------------------------------------------------------------------
// Inline copies of the warden helpers (kept in sync by hand; these are
// the canonical implementations in engine/warden.ts)
// ---------------------------------------------------------------------------

function tzDeliveryToUtc(
  dateStr: string,
  hour: number,
  minute: number,
  tz: string
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);

  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
    hour:     "2-digit",
    minute:   "2-digit",
    second:   "2-digit",
    hour12:   false,
  }).formatToParts(noonUtc);

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  const localNoonAsUtcMs = Date.UTC(
    get("year"), get("month") - 1, get("day"),
    get("hour"), get("minute"), get("second")
  );
  const offsetMs = localNoonAsUtcMs - noonUtc.getTime();

  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetMs);
}

function nextDeliveryUtc(
  tz: string,
  deliveryTimeStr: string,
  frequency: string
): Date {
  const timeParts = deliveryTimeStr.split(":");
  const hour      = parseInt(timeParts[0] ?? "9",  10);
  const minute    = parseInt(timeParts[1] ?? "0",  10);
  const now       = Date.now();

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
  }).format(new Date());

  const [ty, tm, td] = todayStr.split("-").map(Number);

  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const checkDate = new Date(Date.UTC(ty, tm - 1, td + daysAhead));
    const dateStr   = checkDate.toISOString().slice(0, 10);

    const candidate = tzDeliveryToUtc(dateStr, hour, minute, tz);
    if (candidate.getTime() <= now + 60_000) continue;

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

  const tomorrow = new Date(Date.UTC(ty, tm - 1, td + 1)).toISOString().slice(0, 10);
  return tzDeliveryToUtc(tomorrow, hour, minute, tz);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtUtc(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function fmtLocal(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
    hour:     "2-digit",
    minute:   "2-digit",
    second:   "2-digit",
    hour12:   false,
    weekday:  "short",
  }).format(d);
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

interface TestCase {
  label:        string;
  tz:           string;
  deliveryTime: string;
  frequency:    string;
}

const cases: TestCase[] = [
  // Standard UTC
  { label: "UTC  09:00 daily",       tz: "UTC",             deliveryTime: "09:00", frequency: "daily"    },
  // East Asia — UTC+8
  { label: "SGT  07:30 business",    tz: "Asia/Singapore",  deliveryTime: "07:30", frequency: "business" },
  { label: "HKT  08:00 daily",       tz: "Asia/Hong_Kong",  deliveryTime: "08:00", frequency: "daily"    },
  // US East — UTC-5 (or -4 during EDT)
  { label: "EST  06:00 business",    tz: "America/New_York",deliveryTime: "06:00", frequency: "business" },
  // US West — UTC-8 (or -7 during PDT)
  { label: "PST  05:00 3x",          tz: "America/Los_Angeles", deliveryTime: "05:00", frequency: "3x"   },
  // Europe
  { label: "CET  08:00 daily",       tz: "Europe/Paris",    deliveryTime: "08:00", frequency: "daily"    },
  // Gulf — UTC+4
  { label: "GST  07:00 weekly",      tz: "Asia/Dubai",      deliveryTime: "07:00", frequency: "weekly"   },
  // Australia East — UTC+11 (AEDT)
  { label: "AEDT 06:00 business",    tz: "Australia/Sydney",deliveryTime: "06:00", frequency: "business" },
  // India — UTC+5:30 (half-hour offset)
  { label: "IST  07:00 daily",       tz: "Asia/Kolkata",    deliveryTime: "07:00", frequency: "daily"    },
  // Negative offset edge
  { label: "BRT  07:00 daily",       tz: "America/Sao_Paulo", deliveryTime: "07:00", frequency: "daily"  },
];

// ---------------------------------------------------------------------------
// Run tests
// ---------------------------------------------------------------------------

const PRE_GENERATE_WINDOW_MS = 30 * 60_000;

console.log("=".repeat(72));
console.log("  IQsea Scheduling Simulation — " + new Date().toISOString());
console.log("=".repeat(72) + "\n");
console.log(`  System clock: ${fmtUtc(new Date())}\n`);

let passed = 0;
let failed = 0;

for (const tc of cases) {
  try {
    const delivery   = nextDeliveryUtc(tc.tz, tc.deliveryTime, tc.frequency);
    const preGenAt   = new Date(delivery.getTime() - PRE_GENERATE_WINDOW_MS);
    const msUntil    = delivery.getTime() - Date.now();
    const hoursUntil = (msUntil / 3_600_000).toFixed(1);

    // Verify: the local time at deliveryUtc matches the configured deliveryTime
    const [wantH, wantM] = tc.deliveryTime.split(":").map(Number);
    const localParts = new Intl.DateTimeFormat("en-US", {
      timeZone: tc.tz,
      hour:     "2-digit",
      minute:   "2-digit",
      hour12:   false,
    }).formatToParts(delivery);
    const gotH = parseInt(localParts.find(p => p.type === "hour")!.value,   10);
    const gotM = parseInt(localParts.find(p => p.type === "minute")!.value, 10);

    const match = gotH === wantH && gotM === wantM;
    const status = match ? "✓" : "✗";
    if (match) passed++; else failed++;

    console.log(`  ${status} ${tc.label.padEnd(26)} (${tc.tz})`);
    console.log(`      Next delivery  : ${fmtLocal(delivery, tc.tz)}  [${fmtUtc(delivery)}]`);
    console.log(`      Pre-gen at     : ${fmtLocal(preGenAt, tc.tz)}  [${fmtUtc(preGenAt)}]`);
    console.log(`      Hours until    : ${hoursUntil}h`);
    if (!match) {
      console.log(`      ERROR: expected local ${tc.deliveryTime}, got ${gotH}:${String(gotM).padStart(2,"0")}`);
    }
    console.log();
  } catch (err) {
    failed++;
    console.log(`  ✗ ${tc.label}`);
    console.log(`      ERROR: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

// ---------------------------------------------------------------------------
// Point-in-time test: tzDeliveryToUtc with known UTC offsets
// ---------------------------------------------------------------------------

console.log("-".repeat(72));
console.log("  Point-in-time verification (tzDeliveryToUtc)\n");

interface PitCase {
  dateStr: string;
  hour:    number;
  minute:  number;
  tz:      string;
  wantUtcH: number;  // expected UTC hour
  note:    string;
}

const pitCases: PitCase[] = [
  // SGT = UTC+8  →  09:00 SGT = 01:00 UTC
  { dateStr: "2026-04-16", hour: 9, minute: 0, tz: "Asia/Singapore",  wantUtcH: 1, note: "SGT UTC+8"  },
  // EST = UTC-5  →  09:00 EST = 14:00 UTC
  { dateStr: "2026-01-15", hour: 9, minute: 0, tz: "America/New_York", wantUtcH: 14, note: "EST UTC-5" },
  // UTC = UTC+0  →  09:00 UTC = 09:00 UTC
  { dateStr: "2026-04-16", hour: 9, minute: 0, tz: "UTC",              wantUtcH: 9, note: "UTC"        },
  // IST = UTC+5:30 → 09:00 IST = 03:30 UTC
  { dateStr: "2026-04-16", hour: 9, minute: 0, tz: "Asia/Kolkata",     wantUtcH: 3, note: "IST UTC+5:30" },
];

for (const pt of pitCases) {
  const result  = tzDeliveryToUtc(pt.dateStr, pt.hour, pt.minute, pt.tz);
  const gotUtcH = result.getUTCHours();
  const gotUtcM = result.getUTCMinutes();
  const ok      = gotUtcH === pt.wantUtcH;

  if (ok) passed++; else failed++;

  const symbol = ok ? "✓" : "✗";
  const wantStr = `${String(pt.wantUtcH).padStart(2,"0")}:${String(pt.hour === 9 && pt.tz === "Asia/Kolkata" ? 30 : 0).padStart(2,"0")} UTC`;
  const gotStr  = `${String(gotUtcH).padStart(2,"0")}:${String(gotUtcM).padStart(2,"0")} UTC`;
  console.log(`  ${symbol} ${pt.note.padEnd(16)} ${pt.dateStr} ${String(pt.hour).padStart(2,"0")}:${String(pt.minute).padStart(2,"0")} local → ${gotStr}  (want ${wantStr})`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n" + "=".repeat(72));
const total = passed + failed;
console.log(`  Result: ${passed}/${total} passed${failed > 0 ? `, ${failed} FAILED` : " — all OK"}`);
console.log("=".repeat(72));

if (failed > 0) process.exit(1);

/**
 * scripts/test-monthly-scheduling.ts
 *
 * Simulation tests for the monthly review scheduling logic.
 * Tests nextMonthlyDeliveryUtc() for edge cases:
 *   - Normal day (1-28) in any month
 *   - Day 29/30/31 in February (28 days) — should clamp to 28
 *   - Day 29/30/31 in April (30 days) — should clamp to 30
 *   - "last" day in February, April, January (31 days)
 *   - Year rollover (December → January)
 *   - Timezone edge cases (UTC-12, UTC+14)
 *
 * Run:
 *   npx tsx scripts/test-monthly-scheduling.ts
 */

// ---------------------------------------------------------------------------
// Inline copy of nextMonthlyDeliveryUtc() and tzDeliveryToUtc() so we can
// test without importing warden.ts (which has side-effects on load).
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

  const localNoonAsUtcMs = Date.UTC(
    get("year"), get("month") - 1, get("day"),
    get("hour"), get("minute"), get("second")
  );
  const offsetMs = localNoonAsUtcMs - noonUtc.getTime();
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetMs);
}

/**
 * Compute next monthly delivery UTC for a given frozen "now" timestamp.
 * (Production version uses Date.now() — here we inject nowMs for testing.)
 */
function nextMonthlyDeliveryUtcAt(
  nowMs: number,
  tz: string,
  deliveryTimeStr: string,
  reviewDay: number | "last"
): Date {
  const timeParts = deliveryTimeStr.split(":");
  const hour   = parseInt(timeParts[0] ?? "9",  10);
  const minute = parseInt(timeParts[1] ?? "0",  10);

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(nowMs));
  const [ty, tm] = todayStr.split("-").map(Number);

  for (let offset = 0; offset <= 2; offset++) {
    const rawMonth = tm + offset;
    const year     = rawMonth > 12 ? ty + Math.floor((rawMonth - 1) / 12) : ty;
    const month    = ((rawMonth - 1) % 12) + 1;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getDate();
    const day = reviewDay === "last"
      ? daysInMonth
      : Math.min(reviewDay as number, daysInMonth);

    const dateStr   = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const candidate = tzDeliveryToUtc(dateStr, hour, minute, tz);
    if (candidate.getTime() > nowMs + 60_000) return candidate;
  }

  const rawFb  = tm + 3;
  const yearFb = rawFb > 12 ? ty + 1 : ty;
  const monthFb = ((rawFb - 1) % 12) + 1;
  const daysFb  = new Date(Date.UTC(yearFb, monthFb, 0)).getDate();
  const dayFb   = reviewDay === "last" ? daysFb : Math.min(reviewDay as number, daysFb);
  const dateFb  = `${yearFb}-${String(monthFb).padStart(2, "0")}-${String(dayFb).padStart(2, "0")}`;
  return tzDeliveryToUtc(dateFb, hour, minute, tz);
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(
  name: string,
  fn: () => { result: Date; expect: string }
): void {
  try {
    const { result, expect } = fn();
    const localDate = result.toISOString().slice(0, 10);
    if (localDate === expect) {
      console.log(`  ✓  ${name}`);
      passed++;
    } else {
      console.log(`  ✗  ${name}`);
      console.log(`       Expected date: ${expect}`);
      console.log(`       Got UTC ISO:   ${result.toISOString()}`);
      failed++;
    }
  } catch (err) {
    console.log(`  ✗  ${name} — THREW: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

function testDay(
  name: string,
  nowIso: string,
  tz: string,
  deliveryTime: string,
  reviewDay: number | "last",
  expectedUtcDate: string
): void {
  test(name, () => ({
    result: nextMonthlyDeliveryUtcAt(new Date(nowIso).getTime(), tz, deliveryTime, reviewDay),
    expect: expectedUtcDate,
  }));
}

console.log("\nMonthly Scheduling Simulation Tests\n====================================\n");

// ── Normal days ─────────────────────────────────────────────────────────────
console.log("Normal days (1-28):");
// now = 2026-04-01, reviewDay = 15 → next delivery = 2026-04-15
testDay("Day 15 — current month (Apr)", "2026-04-01T00:00:00Z", "UTC", "09:00", 15, "2026-04-15");
// now = 2026-04-20, reviewDay = 15 → day 15 already past → next = 2026-05-15
testDay("Day 15 — past current month (Apr 20)", "2026-04-20T00:00:00Z", "UTC", "09:00", 15, "2026-05-15");
// now = 2026-12-20, reviewDay = 1 → Dec 1 passed → next = 2027-01-01 (year rollover)
testDay("Day 1 — year rollover (Dec 20 → Jan 1)", "2026-12-20T00:00:00Z", "UTC", "09:00", 1, "2027-01-01");

// ── Day clamping: months shorter than the review day ─────────────────────────
console.log("\nDay clamping (short months):");
// now = 2026-01-31, reviewDay = 31 → Feb has 28 days → clamp to 28
testDay("Day 31 in Feb 2026 → clamps to 28", "2026-01-31T10:00:00Z", "UTC", "09:00", 31, "2026-02-28");
// now = 2026-01-31, reviewDay = 30 → Feb has 28 days → clamp to 28
testDay("Day 30 in Feb 2026 → clamps to 28", "2026-01-31T10:00:00Z", "UTC", "09:00", 30, "2026-02-28");
// now = 2026-03-31, reviewDay = 31 → Apr has 30 days → clamp to 30
testDay("Day 31 in Apr 2026 → clamps to 30", "2026-03-31T10:00:00Z", "UTC", "09:00", 31, "2026-04-30");
// Leap year: now = 2027-01-31, reviewDay = 29 → Feb 2027 has 28 days → clamp to 28
testDay("Day 29 in Feb 2027 (non-leap) → clamps to 28", "2027-01-31T10:00:00Z", "UTC", "09:00", 29, "2027-02-28");
// Leap year: now = 2028-01-30, reviewDay = 29 → Jan 29 just passed → next = Feb 29 (leap year)
testDay("Day 29 in Feb 2028 (leap year) → exact 29", "2028-01-30T10:00:00Z", "UTC", "09:00", 29, "2028-02-29");

// ── "last" day of month ──────────────────────────────────────────────────────
console.log('\n"last" day of month:');
// now = 2026-04-01, reviewDay = "last" → last day of April = 30
testDay('"last" in April → day 30', "2026-04-01T00:00:00Z", "UTC", "09:00", "last", "2026-04-30");
// now = 2026-04-30T10:00Z, delivery 09:00 UTC is past → last day of May = 31
testDay('"last" in April (after delivery time) → May 31', "2026-04-30T10:00:00Z", "UTC", "09:00", "last", "2026-05-31");
// now = 2026-01-31T10:00Z → Feb last day = 28
testDay('"last" in February 2026 → day 28', "2026-01-31T10:00:00Z", "UTC", "09:00", "last", "2026-02-28");
// now = 2027-12-31, "last" → last day of Jan 2028 = 31
testDay('"last" year rollover Dec → Jan', "2027-12-31T10:00:00Z", "UTC", "09:00", "last", "2028-01-31");

// ── Timezone edge cases ──────────────────────────────────────────────────────
console.log("\nTimezone edge cases:");
// UTC+14 (Pacific/Kiritimati) — earliest timezone
// now = 2026-04-14T23:00Z = Apr 15 13:00 in UTC+14 → local date is Apr 15
// reviewDay = 15, delivery 09:00 UTC+14 = Apr 14 19:00 UTC → already past (now is Apr 14 23:00 UTC)
// → skips to May 15 UTC+14 = May 14 19:00 UTC → UTC date is "2026-05-14"
testDay("UTC+14 — day already passed in local tz", "2026-04-14T23:00:00Z", "Pacific/Kiritimati", "09:00", 15, "2026-05-14");
// UTC-12 (Etc/GMT+12 — Baker Island)
// now = 2026-04-15T20:00Z = Apr 15 08:00 in UTC-12 → local date is Apr 15
// delivery 09:00 UTC-12 = Apr 15 21:00 UTC → 1 hour ahead of now → schedules for today
// UTC ISO of Apr 15 21:00 UTC is "2026-04-15"
testDay("UTC-12 — same local day, delivery still ahead", "2026-04-15T20:00:00Z", "Etc/GMT+12", "09:00", 15, "2026-04-15");
// Europe/London during BST (UTC+1)
// now = 2026-04-10T00:00Z = Apr 10 01:00 BST
// reviewDay = 25, delivery 08:00 BST = Apr 25 07:00 UTC
testDay("Europe/London BST — day 25 ahead", "2026-04-10T00:00:00Z", "Europe/London", "08:00", 25, "2026-04-25");

// ── Delivery time near midnight ──────────────────────────────────────────────
console.log("\nDelivery time edge cases:");
// delivery at 23:30, now = just before midnight on review day
// reviewDay = 10, now = Apr 10 23:00 UTC → 23:30 is still ahead
testDay("Delivery 23:30 — still ahead same day", "2026-04-10T23:00:00Z", "UTC", "23:30", 10, "2026-04-10");
// delivery at 00:30, now = Apr 10 01:00 UTC → 00:30 same day is past → next month
testDay("Delivery 00:30 — just missed → next month", "2026-04-10T01:00:00Z", "UTC", "00:30", 10, "2026-05-10");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n====================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log(`\nFAIL — ${failed} test(s) did not pass.`);
  process.exit(1);
} else {
  console.log(`\nAll tests passed.`);
}

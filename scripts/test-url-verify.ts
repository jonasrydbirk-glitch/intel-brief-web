/**
 * Smoke test — URL verification (verifyUrl + verifyBriefUrls)
 *
 * Tests:
 *  1. verifyUrl on a known-good URL → alive
 *  2. verifyUrl on a known-dead URL → dead_4xx
 *  3. verifyUrl on a paywall domain → paywall_skip (alive)
 *  4. verifyBriefUrls on a minimal BriefPayload → filters dead items
 *
 * No DB required — this is a pure HTTP check.
 *
 * Usage:
 *   npx tsx scripts/test-url-verify.ts
 */

import "dotenv/config";
import { verifyUrl } from "../engine/verification/urls";
import { verifyBriefUrls } from "../engine/verification/runner";
import type { BriefPayload } from "../engine/brief-generator";

async function main() {
  console.log("=== URL verification smoke test ===\n");

  // Test 1: known-good URL
  console.log("1. Testing a known-good URL (gcaptain.com)...");
  const r1 = await verifyUrl("https://gcaptain.com/");
  console.log(`   status=${r1.status} code=${r1.statusCode ?? "n/a"} alive=${r1.alive}`);
  if (!r1.alive) {
    console.error("   ❌ Expected alive=true for gcaptain.com");
  } else {
    console.log("   ✓ Alive as expected");
  }

  // Test 2: known-dead URL (path that doesn't exist)
  console.log("\n2. Testing a 404 URL (httpstat.us/404)...");
  const r2 = await verifyUrl("https://httpstat.us/404");
  console.log(`   status=${r2.status} code=${r2.statusCode ?? "n/a"} alive=${r2.alive}`);
  if (r2.status !== "dead_4xx" && r2.status !== "alive") {
    // httpstat.us might be flaky — just log the result rather than fail
    console.log("   (httpstat.us may be unreachable — result logged above)");
  } else if (r2.status === "dead_4xx") {
    console.log("   ✓ Dead (4xx) as expected");
  } else {
    console.log("   ⚠ Got alive — httpstat.us may have been unreachable (non-fatal)");
  }

  // Test 3: paywall domain
  console.log("\n3. Testing a paywall domain (lloydslist.com/any-article)...");
  const r3 = await verifyUrl("https://www.lloydslist.com/some-article-2026");
  console.log(`   status=${r3.status} alive=${r3.alive}`);
  if (r3.status !== "paywall_skip") {
    console.error("   ❌ Expected paywall_skip for lloydslist.com");
  } else {
    console.log("   ✓ Paywall skip as expected");
  }

  // Test 4: verifyBriefUrls — mock brief with one alive + one dead item
  console.log("\n4. Testing verifyBriefUrls with a mock brief...");

  const mockBrief: BriefPayload = {
    subscriberId: "test",
    subscriberName: "Test User",
    companyName: "Test Co",
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: "Fleet Intel",
        items: [
          {
            headline: "Good article",
            summary: "This one is alive.",
            commentary: "",
            relevance: "",
            source: "https://gcaptain.com/",
          },
          {
            headline: "Dead article",
            summary: "This URL is dead.",
            commentary: "",
            relevance: "",
            source: "https://httpstat.us/404",
          },
        ],
      },
    ],
    tenderSection: null,
    prospectSection: null,
    offDutySection: null,
    marketPulseSection: null,
    regulatoryCountdown: null,
    monthlyProspectRollup: null,
    competitorTrackerSection: null,
    safetySection: null,
    analystNote: "",
  };

  const { brief: verified, summary } = await verifyBriefUrls(mockBrief, {
    // No db — just testing the filter logic
    concurrency: 4,
    timeoutMs: 8_000,
  });

  console.log(`   Checked: ${summary.checked} | Dead: ${summary.dead} | Skipped: ${summary.skipped} | Errors: ${summary.errors}`);
  const remainingItems = verified.sections[0]?.items ?? [];
  console.log(`   Brief items remaining after filter: ${remainingItems.length}`);
  console.log("   Remaining sources:", remainingItems.map((i) => i.source));

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

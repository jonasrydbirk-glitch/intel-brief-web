/**
 * scripts/test-rss-feeds.ts
 *
 * Smoke test for the RSS ingestion pipeline.
 * Fetches every registered RSS feed and prints a status table.
 * Safe to run any time — no database writes, no side effects.
 *
 * Usage:
 *   npx tsx scripts/test-rss-feeds.ts
 */

import "dotenv/config";
// Import rss.ts to trigger the registerSource() calls
import "../engine/sources/rss";
import { registeredSources } from "../engine/sources/index";
import type { IntelItem } from "../engine/sources/index";

const PASS  = "\x1b[32m✓\x1b[0m";
const FAIL  = "\x1b[31m✗\x1b[0m";
const WARN  = "\x1b[33m⚠\x1b[0m";
const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";

async function main() {
  console.log(`\n${BOLD}IQsea RSS Feed Smoke Test${RESET}`);
  console.log(`Testing ${registeredSources.length} registered feed(s)...\n`);
  console.log(
    "Feed".padEnd(26) +
    "Status".padEnd(10) +
    "Items".padEnd(8) +
    "First item title (truncated)"
  );
  console.log("─".repeat(100));

  const rows: Array<{
    name: string;
    ok: boolean;
    count: number;
    firstTitle: string;
    firstUrl: string;
    firstPubDate: string;
    error?: string;
  }> = [];

  for (const source of registeredSources) {
    try {
      const items: IntelItem[] = await source.fetch();
      const first = items[0];
      rows.push({
        name:         source.name,
        ok:           true,
        count:        items.length,
        firstTitle:   first?.title ?? "(no items)",
        firstUrl:     first?.url ?? "",
        firstPubDate: first?.published_at ?? "unknown",
        error:        undefined,
      });
    } catch (err) {
      rows.push({
        name:         source.name,
        ok:           false,
        count:        0,
        firstTitle:   "",
        firstUrl:     "",
        firstPubDate: "",
        error:        err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const row of rows) {
    if (row.ok) {
      const icon  = row.count > 0 ? PASS : WARN;
      const title = row.firstTitle.length > 50
        ? row.firstTitle.substring(0, 47) + "..."
        : row.firstTitle;
      console.log(
        row.name.padEnd(26) +
        `${icon} OK`.padEnd(12) +
        String(row.count).padEnd(8) +
        title
      );
    } else {
      console.log(
        row.name.padEnd(26) +
        `${FAIL} FAIL`.padEnd(12) +
        "0".padEnd(8) +
        (row.error ?? "").substring(0, 60)
      );
    }
  }

  console.log("\n" + "─".repeat(100));

  // Detailed view for working feeds
  console.log(`\n${BOLD}First item detail for working feeds:${RESET}\n`);
  for (const row of rows) {
    if (!row.ok || !row.firstTitle) continue;
    console.log(`${BOLD}${row.name}${RESET}`);
    console.log(`  Title:    ${row.firstTitle}`);
    console.log(`  URL:      ${row.firstUrl}`);
    console.log(`  PubDate:  ${row.firstPubDate}`);
    console.log();
  }

  const passing = rows.filter((r) => r.ok && r.count > 0).length;
  const failing = rows.filter((r) => !r.ok).length;
  const empty   = rows.filter((r) => r.ok && r.count === 0).length;

  console.log(
    `${BOLD}Summary:${RESET} ${passing} passing · ${empty} empty · ${failing} failing` +
    (failing > 0 ? ` ${FAIL}` : ` ${PASS}`)
  );

  if (failing > 0) {
    console.log(`\n${BOLD}Errors:${RESET}`);
    rows.filter((r) => !r.ok).forEach((r) =>
      console.log(`  ${FAIL} ${r.name}: ${r.error}`)
    );
  }

  console.log();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

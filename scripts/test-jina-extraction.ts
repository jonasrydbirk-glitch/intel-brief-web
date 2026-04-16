/**
 * scripts/test-jina-extraction.ts
 *
 * Smoke test for the Jina Reader article extraction pipeline.
 * Grabs the freshest article URL from 3 RSS sources, calls Jina Reader on
 * each, and prints the title + first 400 chars of content.
 *
 * Safe to run any time — no database writes, no side effects.
 *
 * Usage:
 *   npx tsx scripts/test-jina-extraction.ts
 *
 * Optional: set JINA_API_KEY in .env for authenticated requests (paid tier).
 */

import "dotenv/config";
import "../engine/sources/rss";
import { registeredSources } from "../engine/sources/index";
import { JinaReader } from "../engine/extractors/jina";
import type { IntelItem } from "../engine/sources/index";

const PASS  = "\x1b[32m✓\x1b[0m";
const FAIL  = "\x1b[31m✗\x1b[0m";
const WARN  = "\x1b[33m⚠\x1b[0m";
const BOLD  = "\x1b[1m";
const RESET = "\x1b[0m";
const DIM   = "\x1b[2m";

const TEST_SOURCE_NAMES = ["Splash247", "gCaptain", "Riviera Maritime Media"];
const CONTENT_PREVIEW_CHARS = 400;

function logFn(level: "INFO" | "WARN" | "ERROR", msg: string) {
  const prefix =
    level === "WARN"  ? `  ${WARN}  ` :
    level === "ERROR" ? `  ${FAIL}  ` :
    `  ·  `;
  console.log(`${prefix}${msg}`);
}

async function main() {
  console.log(`\n${BOLD}IQsea Jina Extraction Smoke Test${RESET}`);

  const apiKey = process.env.JINA_API_KEY;
  console.log(
    `Auth:   ${apiKey ? `${PASS} JINA_API_KEY set (paid tier)` : `${WARN} No JINA_API_KEY — free tier (100 RPM)`}`
  );
  console.log(`Target: ${TEST_SOURCE_NAMES.join(", ")}\n`);

  // Step 1: fetch one article URL from each target source
  const sources = TEST_SOURCE_NAMES.map((name) => {
    const found = registeredSources.find((s) => s.name === name);
    if (!found) throw new Error(`Source "${name}" not registered — check import`);
    return found;
  });

  console.log(`${DIM}Fetching fresh article URLs from feeds...${RESET}`);
  const articleUrls: Array<{ sourceName: string; url: string; feedTitle: string }> = [];

  for (const source of sources) {
    try {
      const items: IntelItem[] = await source.fetch();
      const first = items[0];
      if (!first?.url) throw new Error("no items returned");
      articleUrls.push({ sourceName: source.name, url: first.url, feedTitle: first.title });
      console.log(`  ${PASS} ${source.name}: ${first.url}`);
    } catch (err) {
      console.log(`  ${FAIL} ${source.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (articleUrls.length === 0) {
    console.error(`\n${FAIL} Could not get any article URLs — aborting.`);
    process.exit(1);
  }

  // Step 2: call Jina Reader on each URL
  const jina = new JinaReader({
    apiKey: apiKey || undefined,
    timeoutMs: 30_000,
  });

  console.log(`\n${DIM}Calling Jina Reader...${RESET}\n`);
  console.log("─".repeat(100));

  let passing = 0;
  let failing = 0;

  for (const { sourceName, url, feedTitle } of articleUrls) {
    console.log(`\n${BOLD}${sourceName}${RESET}`);
    console.log(`  Feed title:  ${feedTitle}`);
    console.log(`  Article URL: ${url}`);

    const result = await jina.fetch(url, logFn);

    if ("error" in result) {
      console.log(`  ${FAIL} Extraction failed: ${result.error}`);
      failing++;
    } else {
      const preview = result.content
        .replace(/\n+/g, " ")   // collapse newlines for single-line display
        .trim()
        .slice(0, CONTENT_PREVIEW_CHARS);

      const sizeKb = (result.content.length / 1024).toFixed(1);
      console.log(`  ${PASS} Jina title:  ${result.title || "(none)"}`);
      console.log(`  ${PASS} Content:     ${sizeKb} KB total`);
      console.log(`\n  ${DIM}Preview (first ${CONTENT_PREVIEW_CHARS} chars):${RESET}`);
      console.log(`  ${preview}${result.content.length > CONTENT_PREVIEW_CHARS ? "…" : ""}`);
      passing++;
    }
  }

  console.log("\n" + "─".repeat(100));
  console.log(
    `\n${BOLD}Summary:${RESET} ${passing} passing · ${failing} failing` +
      (failing > 0 ? ` ${FAIL}` : ` ${PASS}`)
  );

  if (failing > 0) {
    console.log(
      `\n${WARN} Some extractions failed. This may indicate paywalls, ` +
        `Cloudflare blocks, or Jina rate limits. Check individual errors above.`
    );
  }

  console.log();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

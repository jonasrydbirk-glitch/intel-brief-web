/**
 * scripts/test-embeddings.ts
 *
 * Standalone smoke test for the OpenAI embedding client.
 * Embeds 3 known maritime strings via OpenRouter and verifies the API
 * returns a valid 1536-dimensional vector for each.
 *
 * Does NOT require a database or any existing embeddings.
 * Safe to run any time — no writes, no side effects.
 *
 * Usage:
 *   npx tsx scripts/test-embeddings.ts
 *
 * Requires OPENROUTER_API_KEY in .env.
 */

import "dotenv/config";
import { generateEmbedding, EMBEDDING_DIMENSIONS } from "../engine/embeddings/openai";

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const BOLD = "\x1b[1m";
const DIM  = "\x1b[2m";
const RESET = "\x1b[0m";

const TEST_STRINGS = [
  "LNG drydocking and ship repair in China",
  "Suez Canal transits and Red Sea security",
  "container port congestion and blank sailings",
];

async function main() {
  console.log(`\n${BOLD}IQsea Embedding API Smoke Test${RESET}`);
  console.log(`Model:  openai/text-embedding-3-small via OpenRouter`);
  console.log(`Target: ${EMBEDDING_DIMENSIONS}-dimensional vectors\n`);

  if (!process.env.OPENROUTER_API_KEY) {
    console.error(`${FAIL} OPENROUTER_API_KEY not set in .env — cannot test.`);
    process.exit(1);
  }

  console.log("─".repeat(80));

  let passing = 0;
  let failing = 0;

  for (const text of TEST_STRINGS) {
    process.stdout.write(`  ${DIM}Embedding: "${text}"${RESET}\n`);

    const vector = await generateEmbedding(text);

    if (!vector) {
      console.log(`  ${FAIL} FAILED — generateEmbedding returned null\n`);
      failing++;
      continue;
    }

    if (vector.length !== EMBEDDING_DIMENSIONS) {
      console.log(
        `  ${FAIL} FAILED — wrong dimensions: got ${vector.length}, expected ${EMBEDDING_DIMENSIONS}\n`
      );
      failing++;
      continue;
    }

    // Verify it's actually a float array (not all zeros, not NaN)
    const allZero  = vector.every((v) => v === 0);
    const hasNaN   = vector.some((v) => isNaN(v));
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));

    if (allZero || hasNaN || magnitude === 0) {
      console.log(
        `  ${FAIL} FAILED — degenerate vector (allZero=${allZero}, hasNaN=${hasNaN}, magnitude=${magnitude.toFixed(4)})\n`
      );
      failing++;
      continue;
    }

    console.log(
      `  ${PASS} ${vector.length} dims · magnitude=${magnitude.toFixed(4)} · ` +
        `first 4 values: [${vector.slice(0, 4).map((v) => v.toFixed(6)).join(", ")}]\n`
    );
    passing++;
  }

  console.log("─".repeat(80));
  console.log(
    `\n${BOLD}Summary:${RESET} ${passing} passing · ${failing} failing` +
      (failing > 0 ? ` ${FAIL}` : ` ${PASS}`)
  );

  if (failing > 0) {
    console.log(
      `\nCheck OPENROUTER_API_KEY and verify openai/text-embedding-3-small ` +
        `is accessible on your OpenRouter plan.`
    );
    process.exit(1);
  }

  console.log();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

/**
 * IQsea Preview Story Generator
 *
 * Generates a single IntelItem for the onboarding preview flow.
 * Skips Scout; uses the library-first retriever (pgvector + Tavily gap-fill)
 * then synthesises via a trimmed Architect call.
 *
 * Return shape: { item, isFresh, publishedDate? }
 *
 * Phase 2 Step 4: Sonar (Perplexity) replaced with unified retriever.
 * To revert: git revert HEAD~1
 */

import { IntelItem, SearchHit } from "./brief-generator";
import { retrieveForQuery } from "./search/retriever";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// ---------------------------------------------------------------------------
// Trimmed Architect — produce one IntelItem
// ---------------------------------------------------------------------------

async function synthesiseStory(
  subject: string,
  hits: SearchHit[],
  fresh: boolean,
  todayISO: string
): Promise<IntelItem | null> {
  if (hits.length === 0) {
    return null;
  }

  const hitsText = hits
    .map(
      (h, i) =>
        `[${i + 1}]\nTITLE: ${h.title}\nSNIPPET: ${h.snippet}\nURL: ${h.url}`
    )
    .join("\n\n");

  const freshnessRule = fresh
    ? `- REJECT any article not published within the last 7 days (today is ${todayISO}). If all results are older than 7 days, return null.`
    : `- Use the most recent article available. Older articles are acceptable if that is all that exists, but real content is still required.`;

  const systemPrompt = `You are a Senior Maritime Intelligence Officer writing a single intelligence brief item.

TODAY'S DATE: ${todayISO}

RULES (non-negotiable):
- Use ONLY URLs that appear verbatim in the search results provided. Do NOT construct, guess, or abbreviate URLs.
- If no result has a direct article URL, return null.
${freshnessRule}
- headline: factual news headline — what happened, stated plainly. Must be substantive (not a generic placeholder).
- summary: factual account of what the search result reports. No opinion. No "this means...". Must describe a real event or development.
- commentary: 1-2 sentences of professional maritime analyst insight — why this matters operationally.
- relevance: one sentence on why this is relevant to "${subject}".
- source: exact URL copied from the search results.
- quote: single verbatim sentence lifted directly from the snippet. Copy exact words — no paraphrase. Omit the field entirely if no clean quotable sentence exists in the provided snippets.

Return ONLY valid JSON matching this schema — no prose, no code fences:
{"headline":"...","summary":"...","commentary":"...","relevance":"...","source":"...","quote":"<verbatim sentence or omit>"}

If you cannot produce a valid item from the provided results, return exactly: null`;

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-6",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Subject: ${subject}\n\nSearch results:\n${hitsText}\n\nProduce a single JSON intelligence item.`,
        },
      ],
      max_tokens: 512,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";

  if (raw.trim() === "null") return null;

  try {
    // Strip any accidental code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const item = JSON.parse(cleaned) as IntelItem;
    if (item && item.headline && item.source) {
      return item;
    }
  } catch {
    // fall through
  }

  return null;
}

// ---------------------------------------------------------------------------
// Validity check — returns the item if usable, null otherwise
// ---------------------------------------------------------------------------

function isUsable(item: IntelItem | null): item is IntelItem {
  if (!item) return false;
  if (!item.headline || item.headline.trim().length <= 10) return false;
  if (!item.summary || item.summary.trim().length <= 30) return false;
  if (!item.source || !/^https?:\/\/.+/.test(item.source.trim())) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Best-effort date extraction from Sonar snippets
// ---------------------------------------------------------------------------

function extractPublishedDate(hits: SearchHit[]): string | undefined {
  // Matches ISO dates (2026-04-10) or common English formats (April 10, 2026)
  const datePattern = /\b(\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/i;
  for (const hit of hits) {
    const text = `${hit.title} ${hit.snippet}`;
    const match = text.match(datePattern);
    if (match) return match[1];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function generatePreviewStory(
  subject: string
): Promise<{ item: IntelItem; isFresh: boolean; publishedDate?: string }> {
  const todayISO = new Date().toISOString().slice(0, 10);

  // --- Tier 1: library-first retrieval with 7-day freshness window ---
  const { hits: freshHits, isFresh } = await retrieveForQuery(subject, {
    freshDays:        7,
    gapFillThreshold: 1,   // for preview, any single hit is enough to try
    libraryLimit:     3,
    tavilyLimit:      3,
  });

  if (freshHits.length > 0) {
    const item = await synthesiseStory(subject, freshHits, isFresh, todayISO);
    if (isUsable(item)) {
      return {
        item,
        isFresh,
        publishedDate: extractPublishedDate(freshHits),
      };
    }
  }

  // --- Tier 2: stale fallback — library without date constraint ---
  // retrieveForQuery already falls back to stale content internally, but if
  // the synthesis step above rejected all fresh hits (quality check), we do
  // an explicit stale-only retry so the preview never shows an empty screen.
  const { hits: staleHits } = await retrieveForQuery(subject, {
    freshDays:        365,  // effectively no date filter
    gapFillThreshold: 999,  // never call Tavily in fallback — keep it cheap
    libraryLimit:     5,
  });

  const staleItem = await synthesiseStory(subject, staleHits, false, todayISO);
  if (isUsable(staleItem)) {
    return {
      item:          staleItem,
      isFresh:       false,
      publishedDate: extractPublishedDate(staleHits),
    };
  }

  // Both tiers exhausted — surface a recognisable error so Warden marks the
  // job as 'error' and the frontend can show the "try a different topic" screen.
  throw new Error("NO_RESULTS: no usable content found for subject");
}

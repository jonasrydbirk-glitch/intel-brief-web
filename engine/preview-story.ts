/**
 * IQsea Preview Story Generator
 *
 * Generates a single IntelItem for the onboarding preview flow.
 * Skips Scout; uses a two-tier Sonar search (fresh first, fallback)
 * then synthesises via a trimmed Architect call.
 *
 * Return shape: { item, isFresh, publishedDate? }
 */

import { IntelItem, SearchHit } from "./brief-generator";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// ---------------------------------------------------------------------------
// Single-query Sonar search (accepts a fully-formed query string)
// ---------------------------------------------------------------------------

async function previewSearch(query: string): Promise<SearchHit[]> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "perplexity/sonar-pro",
      messages: [
        {
          role: "system",
          content: `You are a maritime news search engine. Return the most relevant recent news article you find.
For EVERY result you MUST include:
1. The exact article title
2. A 1-2 sentence snippet of the article content
3. The full, direct URL to the specific article (NOT a homepage)

Format each result as:
TITLE: <exact article title>
SNIPPET: <1-2 sentence summary>
URL: <full direct URL>
---

Return up to 2 results. Only include results with real, direct article URLs.`,
        },
        {
          role: "user",
          content: `Find news articles for: ${query}`,
        },
      ],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const rawContent: string = data.choices?.[0]?.message?.content ?? "";
  const citations: string[] = data.citations ?? [];

  const hits: SearchHit[] = [];
  const blocks = rawContent.split(/---+/).filter((b: string) => b.trim());

  for (const block of blocks) {
    const titleMatch = block.match(/TITLE:\s*(.+)/i);
    const snippetMatch = block.match(/SNIPPET:\s*(.+)/i);
    const urlMatch = block.match(/URL:\s*(https?:\/\/\S+)/i);
    if (titleMatch && urlMatch) {
      hits.push({
        title: titleMatch[1].trim(),
        snippet: snippetMatch ? snippetMatch[1].trim() : "",
        url: urlMatch[1].trim(),
      });
    }
  }

  for (const citationUrl of citations) {
    if (!hits.some((h) => h.url === citationUrl)) {
      hits.push({ title: "", snippet: "", url: citationUrl });
    }
  }

  return hits;
}

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

Return ONLY valid JSON matching this schema — no prose, no code fences:
{"headline":"...","summary":"...","commentary":"...","relevance":"...","source":"..."}

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

  // --- Tier 1: FRESH — last 7 days only ---
  const freshQuery = `${subject} — published in the last 7 days, today is ${todayISO}. Only return articles from the last 7 days.`;
  const freshHits = await previewSearch(freshQuery);
  const freshItem = await synthesiseStory(subject, freshHits, true, todayISO);
  if (isUsable(freshItem)) {
    return {
      item: freshItem,
      isFresh: true,
      publishedDate: extractPublishedDate(freshHits),
    };
  }

  // --- Tier 2: FALLBACK — most recent available, no date constraint ---
  const fallbackQuery = `${subject} — most recent news available`;
  const fallbackHits = await previewSearch(fallbackQuery);
  const fallbackItem = await synthesiseStory(subject, fallbackHits, false, todayISO);
  if (isUsable(fallbackItem)) {
    return {
      item: fallbackItem,
      isFresh: false,
      publishedDate: extractPublishedDate(fallbackHits),
    };
  }

  // Both tiers exhausted — surface a recognisable error so Warden marks the
  // job as 'error' and the frontend can show the "try a different topic" screen.
  throw new Error("NO_RESULTS: no usable content found for subject");
}

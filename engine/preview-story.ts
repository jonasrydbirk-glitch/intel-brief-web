/**
 * IQsea Preview Story Generator
 *
 * Generates a single IntelItem for the onboarding preview flow.
 * Skips Scout; runs one Sonar search query then synthesises via Architect.
 */

import { IntelItem, SearchHit } from "./brief-generator";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// ---------------------------------------------------------------------------
// Single-query Sonar search
// ---------------------------------------------------------------------------

async function previewSearch(subject: string): Promise<SearchHit[]> {
  const todayISO = new Date().toISOString().slice(0, 10);
  const query = `${subject} latest news ${todayISO}`;

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
          content: `Find the latest news articles for: ${query}`,
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
  hits: SearchHit[]
): Promise<IntelItem | null> {
  const todayISO = new Date().toISOString().slice(0, 10);

  if (hits.length === 0) {
    return null;
  }

  const hitsText = hits
    .map(
      (h, i) =>
        `[${i + 1}]\nTITLE: ${h.title}\nSNIPPET: ${h.snippet}\nURL: ${h.url}`
    )
    .join("\n\n");

  const systemPrompt = `You are a Senior Maritime Intelligence Officer writing a single intelligence brief item.

TODAY'S DATE: ${todayISO}

RULES (non-negotiable):
- Use ONLY URLs that appear verbatim in the search results provided. Do NOT construct, guess, or abbreviate URLs.
- If no result has a direct article URL, return null.
- headline: factual news headline — what happened, stated plainly.
- summary: factual account of what the search result reports. No opinion. No "this means...".
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
// Public entry point
// ---------------------------------------------------------------------------

export async function generatePreviewStory(
  subject: string
): Promise<IntelItem> {
  const hits = await previewSearch(subject);
  const item = await synthesiseStory(subject, hits);

  if (item) return item;

  // Fallback: return a placeholder so the UI always has something to render
  return {
    headline: `Intelligence preview for: ${subject}`,
    summary:
      "Live intelligence search completed. Sign up to receive your full personalised maritime brief with multiple stories, market data, and expert commentary.",
    commentary:
      "Your first full brief will be tailored to your fleet, role, and subjects — delivered on your schedule.",
    relevance: `Directly relevant to your stated subject: ${subject}.`,
    source: "",
  };
}

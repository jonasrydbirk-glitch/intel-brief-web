/**
 * Tavily web search client.
 *
 * Used as the gap-fill tier when the local intelligence library has
 * insufficient fresh coverage for a query.
 *
 * Graceful degradation: if TAVILY_API_KEY is not set, logs a warning and
 * returns [] so the pipeline continues with library-only results.
 *
 * API reference: https://docs.tavily.com/documentation/api-reference/endpoint/search
 */

import type { SearchHit } from "./types";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 2_000;

// ---------------------------------------------------------------------------
// API response shape
// ---------------------------------------------------------------------------

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string | null;
  score?: number;
}

interface TavilyResponse {
  query: string;
  results: TavilyResult[];
  response_time?: number;
}

// ---------------------------------------------------------------------------
// tavilySearch
// ---------------------------------------------------------------------------

/**
 * Search the web via Tavily and return results as SearchHit[].
 *
 * @param query            Natural-language search string
 * @param opts.maxResults  Max results to request (default 5, max 20)
 * @param opts.daysBack    Only include content published within N days (optional)
 * @param opts.timeoutMs   Per-attempt timeout in ms (default 15 000)
 */
export async function tavilySearch(
  query: string,
  opts: {
    maxResults?: number;
    daysBack?: number;
    timeoutMs?: number;
  } = {}
): Promise<SearchHit[]> {
  const apiKey = process.env.TAVILY_API_KEY ?? "";
  if (!apiKey) {
    console.warn("[Tavily] TAVILY_API_KEY not set — skipping web search gap-fill");
    return [];
  }

  const maxResults = opts.maxResults ?? DEFAULT_MAX_RESULTS;
  const timeoutMs  = opts.timeoutMs  ?? DEFAULT_TIMEOUT_MS;

  // Build request body — api_key goes in Authorization header, not body
  const reqBody: Record<string, unknown> = {
    query,
    search_depth:        "advanced",
    include_raw_content: true,
    max_results:         maxResults,
  };

  // Date filter: Tavily uses start_date (YYYY-MM-DD) to restrict recency
  if (opts.daysBack && opts.daysBack > 0) {
    const cutoff = new Date(Date.now() - opts.daysBack * 24 * 60 * 60 * 1_000);
    reqBody.start_date = cutoff.toISOString().slice(0, 10);
  }

  const doRequest = (): Promise<Response> =>
    fetch(TAVILY_ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${apiKey}`,
      },
      body:   JSON.stringify(reqBody),
      signal: AbortSignal.timeout(timeoutMs),
    });

  // ---------------------------------------------------------------------------
  // Execute with one retry on transient failures (5xx, 429, network error)
  // ---------------------------------------------------------------------------
  let resp: Response;
  try {
    resp = await doRequest();

    if (resp.status === 429 || resp.status >= 500) {
      console.warn(`[Tavily] HTTP ${resp.status} — retrying in ${RETRY_DELAY_MS}ms`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      resp = await doRequest();
    }
  } catch (firstErr) {
    try {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      resp = await doRequest();
    } catch (retryErr) {
      console.warn(
        `[Tavily] Network error for "${query.slice(0, 60)}": ` +
        `${retryErr instanceof Error ? retryErr.message : String(retryErr)}`
      );
      return [];
    }
    void firstErr; // suppressed — retry succeeded
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "(unreadable)");
    console.warn(
      `[Tavily] HTTP ${resp.status} for "${query.slice(0, 60)}": ${errText.slice(0, 200)}`
    );
    return [];
  }

  let json: TavilyResponse;
  try {
    json = (await resp.json()) as TavilyResponse;
  } catch {
    console.warn("[Tavily] Failed to parse response JSON");
    return [];
  }

  const results: TavilyResult[] = json.results ?? [];

  const hits: SearchHit[] = results
    .filter((r) => r.url && r.title)
    .map((r) => {
      // Prefer raw_content (full article) as the snippet when available,
      // capped at 800 chars so the Architect prompt stays compact.
      const snippet = r.raw_content
        ? `${r.content ?? ""}\n\n${r.raw_content.slice(0, 800)}`.trim()
        : (r.content ?? "");
      return { title: r.title, url: r.url, snippet };
    });

  console.log(
    `[Tavily] query="${query.slice(0, 60)}" results=${hits.length}`
  );
  return hits;
}

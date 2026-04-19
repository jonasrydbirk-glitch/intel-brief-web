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
// Retry backoff: 2s → 8s → 32s (4x multiplier, capped at 32s)
const RETRY_DELAYS_MS = [2_000, 8_000, 32_000];

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
  // Execute with up to 2 retries using exponential backoff (2s → 8s → 32s).
  // Respects Retry-After header on 429 responses.
  // ---------------------------------------------------------------------------
  let resp: Response | undefined;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const r = await doRequest();

      if (r.status === 429 || r.status >= 500) {
        const retryAfterSec = r.headers.get("Retry-After");
        const delay = retryAfterSec
          ? parseInt(retryAfterSec, 10) * 1_000
          : (RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);

        if (attempt < RETRY_DELAYS_MS.length) {
          console.warn(`[Tavily] HTTP ${r.status} — retrying in ${delay}ms (attempt ${attempt + 1})`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
        // Exhausted retries — use this response as final
        resp = r;
        break;
      }

      resp = r;
      break;
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt];
        console.warn(`[Tavily] Network error (attempt ${attempt + 1}) — retrying in ${delay}ms`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  if (!resp) {
    console.warn(
      `[Tavily] All retries exhausted for "${query.slice(0, 60)}": ` +
      `${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
    );
    return [];
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

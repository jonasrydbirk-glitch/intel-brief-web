/**
 * Jina Reader client — fetches cleaned article text from any URL.
 *
 * Jina Reader (https://jina.ai/reader/) proxies arbitrary URLs and returns
 * clean Markdown article text.  No signup required for the free tier.
 *
 * Free tier limits (as of 2026-04-16): 100 RPM · 100k tokens/min · 10M tokens/day
 * Paid tier: add JINA_API_KEY to .env to attach a Bearer token and unlock
 * higher limits.  The client picks this up automatically.
 *
 * Usage:
 *   const jina = new JinaReader();
 *   const result = await jina.fetch("https://splash247.com/some-article/");
 *   if ("error" in result) { ... } else { result.title; result.content; }
 */

const JINA_BASE_URL = "https://r.jina.ai/";
const DEFAULT_TIMEOUT_MS = 30_000;
const WARN_SHORT_CONTENT_CHARS = 200; // log warning below this threshold

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Response shape from Jina when Accept: application/json
// ---------------------------------------------------------------------------

interface JinaJsonResponse {
  code: number;
  status: number;
  data?: {
    title?: string;
    url?: string;
    content?: string;
    description?: string;
    links?: Record<string, string>;
  };
}

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export interface JinaSuccess {
  title: string;
  content: string;
  url: string;
}

export interface JinaError {
  error: string;
}

export type JinaResult = JinaSuccess | JinaError;

// ---------------------------------------------------------------------------
// JinaReader
// ---------------------------------------------------------------------------

export class JinaReader {
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(opts?: { apiKey?: string; timeoutMs?: number }) {
    this.apiKey = opts?.apiKey;
    this.timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Fetch cleaned article text for a given URL via Jina Reader.
   *
   * Returns { title, content, url } on success.
   * Returns { error } on HTTP error, timeout, parse failure, or empty content.
   * Never throws — all error paths return { error }.
   */
  async fetch(
    articleUrl: string,
    logFn?: (level: "INFO" | "WARN" | "ERROR", msg: string) => void
  ): Promise<JinaResult> {
    const jinaUrl = `${JINA_BASE_URL}${articleUrl}`;
    const warn = (msg: string) => logFn?.("WARN", msg);

    const headers: Record<string, string> = {
      "User-Agent": DEFAULT_UA,
      Accept: "application/json",
      "X-No-Cache": "true", // always fetch fresh content
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    let resp: Response;
    try {
      resp = await fetch(jinaUrl, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers,
      });
    } catch (err) {
      return {
        error: `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (!resp.ok) {
      return { error: `HTTP ${resp.status} from Jina Reader` };
    }

    let json: JinaJsonResponse;
    try {
      json = (await resp.json()) as JinaJsonResponse;
    } catch (err) {
      return {
        error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const content = json?.data?.content?.trim() ?? "";
    const title = json?.data?.title?.trim() ?? "";
    const url = json?.data?.url?.trim() ?? articleUrl;

    if (!content) {
      return {
        error: `empty content — possible paywall, redirect, or robot block`,
      };
    }

    if (content.length < WARN_SHORT_CONTENT_CHARS) {
      warn(
        `[Jina] Short content (${content.length} chars) for ${articleUrl} — ` +
          `possible paywall or thin page. Storing anyway.`
      );
    }

    return { title, content, url };
  }
}

// ---------------------------------------------------------------------------
// Singleton convenience instance (picks up JINA_API_KEY from env)
// ---------------------------------------------------------------------------

export function createJinaReader(): JinaReader {
  return new JinaReader({
    apiKey: process.env.JINA_API_KEY || undefined,
  });
}

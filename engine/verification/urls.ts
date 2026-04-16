/**
 * IQsea URL Verifier — Phase 2 Part B, Build 3
 *
 * Performs lightweight liveness checks on article URLs before the brief
 * reaches the Scribe. The goal is to catch dead links (4xx) early so the
 * Architect can be prompted to drop them, rather than have subscribers
 * click broken URLs in their PDF.
 *
 * Strategy (per URL):
 *   1. HEAD request (fast, no body transfer)
 *   2. Follow up to 3 redirects automatically
 *   3. If 403 → retry with GET (some CDNs block HEAD)
 *   4. 5xx or timeout → treat as alive (server error ≠ dead article)
 *   5. 4xx (except 403 handled above) → dead link
 *   6. Known paywall domains → skip verification entirely (always alive)
 *
 * Status values written to url_verification_log:
 *   'alive'        — 2xx response (or 5xx / timeout — treated as alive)
 *   'dead_4xx'     — 4xx response (not 403)
 *   'paywall_skip' — known paywall domain, check skipped
 *   'error'        — unexpected exception during check
 */

// ---------------------------------------------------------------------------
// Paywall / bot-blocking domains — verification skipped for these
// ---------------------------------------------------------------------------

/** Domains where HEAD/GET verification is pointless:
 *  - Sites that always return 403/401/paywall for unauthenticated bots
 *  - Sites with aggressive bot detection that returns misleading codes
 *
 *  Entries are matched as hostname suffix (e.g. "lloydslist.com" matches
 *  "www.lloydslist.com" and "news.lloydslist.com"). */
const PAYWALL_DOMAINS = new Set([
  "lloydslist.com",
  "tradewindsnews.com",
  "riviera.co.uk",
  "maritimeexecutive.com",
  "splash247.com",
  "seatrade-maritime.com",
  "hellenicshippingnews.com",
  "fairplay.ihs.com",
  "drewry.co.uk",
  "clarksons.com",
  "offshore-energy.biz",
  "theloadstar.com",
  "breakbulk.com",
  "joc.com",
  "ft.com",
  "wsj.com",
  "bloomberg.com",
  "reuters.com",
  "nytimes.com",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VerifyStatus = "alive" | "dead_4xx" | "paywall_skip" | "error";

export interface VerifyResult {
  url: string;
  status: VerifyStatus;
  statusCode?: number;
  /** True if the article should be kept in the brief */
  alive: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPaywall(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    for (const domain of PAYWALL_DOMAINS) {
      if (hostname === domain || hostname.endsWith("." + domain)) {
        return true;
      }
    }
  } catch {
    // Malformed URL — let the fetch attempt handle it
  }
  return false;
}

const DEFAULT_TIMEOUT_MS = 8_000;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Core verifier
// ---------------------------------------------------------------------------

/**
 * Check whether a single URL is reachable.
 *
 * @param url         The article URL to verify
 * @param opts.timeoutMs  Per-request timeout in ms (default 8000)
 */
export async function verifyUrl(
  url: string,
  opts: { timeoutMs?: number } = {}
): Promise<VerifyResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // --- Paywall skip ---
  if (isPaywall(url)) {
    return { url, status: "paywall_skip", alive: true };
  }

  const headers = {
    "User-Agent": BROWSER_UA,
    Accept: "text/html,application/xhtml+xml,*/*",
  };

  // --- HEAD request ---
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "HEAD",
        headers,
        redirect: "follow",
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const code = res.status;

    // 403 → retry with GET (CDN may block HEAD)
    if (code === 403) {
      return verifyWithGet(url, headers, timeoutMs);
    }

    // 5xx → treat as alive (transient server error)
    if (code >= 500) {
      return { url, status: "alive", statusCode: code, alive: true };
    }

    // 4xx (except 403 handled above) → dead
    if (code >= 400) {
      return { url, status: "dead_4xx", statusCode: code, alive: false };
    }

    // 2xx / 3xx resolved → alive
    return { url, status: "alive", statusCode: code, alive: true };
  } catch (err) {
    // AbortError = timeout → treat as alive (server may just be slow)
    if (err instanceof Error && err.name === "AbortError") {
      return { url, status: "alive", alive: true };
    }
    // Network error / DNS failure / etc.
    return { url, status: "error", alive: true };
  }
}

/** GET fallback — used when HEAD returns 403. */
async function verifyWithGet(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<VerifyResult> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers,
        redirect: "follow",
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const code = res.status;

    if (code >= 500) {
      return { url, status: "alive", statusCode: code, alive: true };
    }
    if (code >= 400) {
      return { url, status: "dead_4xx", statusCode: code, alive: false };
    }
    return { url, status: "alive", statusCode: code, alive: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { url, status: "alive", alive: true };
    }
    return { url, status: "error", alive: true };
  }
}

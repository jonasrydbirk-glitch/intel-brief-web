/**
 * WPRestIngestor — fetches posts from a WordPress site's JSON REST API.
 *
 * WordPress exposes `/wp-json/wp/v2/posts` on most installations regardless
 * of whether the RSS feed is public.  This is useful for sites that suppress
 * or redirect their RSS but haven't locked down the REST API.
 *
 * Handles:
 *   - HTML entity decoding in title.rendered (no external dep — hand-rolled
 *     decoder covers the entities WordPress commonly emits)
 *   - HTML tag stripping + entity decoding for excerpt.rendered
 *   - UTC date normalisation (WordPress omits the Z suffix on the `date`
 *     field even though the value is UTC)
 *
 * Production sources registered at the bottom of this file.
 *
 * Feed verification status (checked 2026-04-16):
 *   ✅ Safety4Sea  https://safety4sea.com/wp-json/wp/v2/posts  200 JSON ~20 items
 *      RSS feed at /feed/ suppressed; WP REST API open.
 */

import { customAlphabet } from "nanoid";
import { IntelItem, IntelSource, registerSource } from "./index";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  21
);

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// HTML utility helpers
// ---------------------------------------------------------------------------

/**
 * Decode HTML entities commonly found in WordPress title.rendered and
 * excerpt.rendered fields.  Covers the vast majority of cases without
 * pulling in the `he` library.
 */
function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8216;/g, "\u2018") // left single quotation mark  '
    .replace(/&#8217;/g, "\u2019") // right single quotation mark '
    .replace(/&#8220;/g, "\u201C") // left double quotation mark  "
    .replace(/&#8221;/g, "\u201D") // right double quotation mark "
    .replace(/&#8230;/g, "\u2026") // horizontal ellipsis         …
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(parseInt(code, 10))
    );
}

/** Strip HTML tags, leaving only the inner text. */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

// ---------------------------------------------------------------------------
// WP REST API response shape
// ---------------------------------------------------------------------------

interface WPRestPost {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
}

// ---------------------------------------------------------------------------
// WPRestIngestor
// ---------------------------------------------------------------------------

export class WPRestIngestor implements IntelSource {
  readonly name: string;
  readonly source_type = "wp_rest";
  readonly scheduleMinutes = 20;

  private readonly endpointUrl: string;
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(
    name: string,
    endpointUrl: string,
    opts: { timeoutMs?: number; userAgent?: string } = {}
  ) {
    this.name = name;
    this.endpointUrl = endpointUrl;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.userAgent = opts.userAgent ?? DEFAULT_UA;
  }

  async fetch(): Promise<IntelItem[]> {
    let json: unknown;
    try {
      const resp = await fetch(this.endpointUrl, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json",
        },
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      json = await resp.json();
    } catch (err) {
      throw new Error(
        `WP REST fetch failed (${this.endpointUrl}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    if (!Array.isArray(json)) {
      throw new Error(
        `WP REST response is not an array (${this.endpointUrl})`
      );
    }

    const posts = json as WPRestPost[];
    const items: IntelItem[] = [];

    for (const post of posts) {
      const url = (post.link ?? "").trim();
      if (!url) continue;

      const titleRaw = post.title?.rendered ?? "";
      const title = decodeEntities(titleRaw).trim();
      if (!title) continue;

      // Strip tags + decode entities; cap at 500 chars
      const excerptRaw = post.excerpt?.rendered ?? "";
      const snippet =
        decodeEntities(stripTags(excerptRaw)).trim().slice(0, 500) || null;

      // WordPress `date` field is UTC but omits the Z suffix.  Append Z
      // before parsing so JavaScript treats it as UTC, not local time.
      let published_at: string | null = null;
      if (post.date) {
        try {
          const raw = post.date;
          // Only append Z if there's no existing TZ indicator
          const normalised = /[Z+\-]\d*$/.test(raw) ? raw : `${raw}Z`;
          published_at = new Date(normalised).toISOString();
        } catch {
          // Unparseable — leave null
        }
      }

      items.push({
        id: nanoid(),
        source_type: this.source_type,
        source_name: this.name,
        url,
        title,
        snippet,
        published_at,
        metadata: {
          wpId: post.id,
        },
      });
    }

    return items;
  }
}

// ---------------------------------------------------------------------------
// Production WP REST registry
// ---------------------------------------------------------------------------

registerSource(
  new WPRestIngestor(
    "Safety4Sea",
    "https://safety4sea.com/wp-json/wp/v2/posts?per_page=20&_fields=id,title,link,date,excerpt"
  )
);

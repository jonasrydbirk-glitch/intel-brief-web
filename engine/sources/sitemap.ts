/**
 * SitemapIngestor — fetches and normalises items from a Google News Sitemap.
 *
 * Google News Sitemaps extend the standard sitemap format with <news:news>
 * blocks that carry <news:title> and <news:publication_date>.  Both fields
 * are required for a usable IntelItem; plain sitemaps (no <news:news> data)
 * are not supported and entries without a title are silently skipped.
 *
 * Namespace handling: cheerio's CSS-select engine does not support XML
 * namespace prefixes, so we normalise <news:title> → <news_title> etc. at
 * the raw string level before parsing.  This is intentionally narrow — only
 * the `news:` prefix is rewritten, which is all Google News Sitemaps use.
 *
 * Production sources registered at the bottom of this file.
 *
 * Feed verification status (checked 2026-04-16):
 *   ✅ TradeWinds  https://www.tradewindsnews.com/sitemap/news.xml  ~40 items
 *      Google News Sitemap; NHST/Zephr paywall blocks RSS but sitemap is open.
 *      Content tier: headline_only (no snippets in sitemap format).
 */

import { load } from "cheerio";
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
// SitemapIngestor
// ---------------------------------------------------------------------------

export class SitemapIngestor implements IntelSource {
  readonly name: string;
  readonly source_type = "sitemap";
  readonly scheduleMinutes = 60; // news sitemaps typically refresh hourly

  private readonly sitemapUrl: string;
  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly urlFilter?: (url: string) => boolean;
  private readonly contentTier: "headline_only" | "full_text";

  constructor(
    name: string,
    sitemapUrl: string,
    opts?: {
      userAgent?: string;
      timeoutMs?: number;
      urlFilter?: (url: string) => boolean;
      contentTier?: "headline_only" | "full_text";
    }
  ) {
    this.name = name;
    this.sitemapUrl = sitemapUrl;
    this.userAgent = opts?.userAgent ?? DEFAULT_UA;
    this.timeoutMs = opts?.timeoutMs ?? 15_000;
    this.urlFilter = opts?.urlFilter;
    this.contentTier = opts?.contentTier ?? "headline_only";
  }

  async fetch(): Promise<IntelItem[]> {
    const resp = await fetch(this.sitemapUrl, {
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/xml, text/xml, */*",
      },
    });

    if (!resp.ok) {
      throw new Error(
        `HTTP ${resp.status} fetching sitemap: ${this.sitemapUrl}`
      );
    }

    const xml = await resp.text();

    // Normalise the `news:` XML namespace prefix so cheerio's CSS-select
    // engine can match the elements.  We only rewrite `news:` (the single
    // namespace used in Google News Sitemaps) and strip xmlns declarations
    // that would otherwise confuse the attribute parser.
    const normalised = xml
      .replace(/<(\/?)news:/g, "<$1news_")
      .replace(/\s+xmlns(?::\w+)?="[^"]*"/g, "");

    const $ = load(normalised, { xmlMode: true });
    const items: IntelItem[] = [];

    $("url").each((_, el) => {
      const url = $("loc", el).first().text().trim();
      if (!url) return;

      if (this.urlFilter && !this.urlFilter(url)) return;

      // Google News Sitemap: headline lives in <news:title> → <news_title>
      const title = $("news_title", el).first().text().trim();
      if (!title) {
        // Standard sitemap entry with no <news:news> metadata — no headline
        // available, skip silently (not a Google News Sitemap entry).
        return;
      }

      // <news:publication_date> → <news_publication_date>
      let published_at: string | null = null;
      const rawDate = $("news_publication_date", el).first().text().trim();
      if (rawDate) {
        try {
          published_at = new Date(rawDate).toISOString();
        } catch {
          // Unparseable date — leave null
        }
      }

      items.push({
        id: nanoid(),
        source_type: this.source_type,
        source_name: this.name,
        url,
        title,
        snippet: null, // sitemaps carry no article descriptions
        published_at,
        metadata: {
          contentTier: this.contentTier,
        },
      });
    });

    return items;
  }
}

// ---------------------------------------------------------------------------
// Production sitemap registry
// ---------------------------------------------------------------------------

registerSource(
  new SitemapIngestor(
    "TradeWinds",
    "https://www.tradewindsnews.com/sitemap/news.xml",
    { contentTier: "headline_only" }
  )
);

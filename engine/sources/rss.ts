/**
 * RSS ingestion source — fetches and normalises items from an RSS/Atom feed.
 *
 * Each RSSIngestor wraps a single feed URL.  At the bottom of this file,
 * all production feeds are registered via registerSource().
 *
 * Feed verification status (checked 2026-04-15/16):
 *   ✅ Splash247              https://splash247.com/feed/                                200 RSS/XML
 *   ✅ gCaptain                https://gcaptain.com/feed/                                200 RSS/XML
 *   ✅ Hellenic Shipping News  https://www.hellenicshippingnews.com/feed/                200 RSS/XML
 *   ✅ LNG Prime               https://lngprime.com/feed/                                200 RSS/XML
 *   ✅ Offshore Energy         https://www.offshore-energy.biz/feed/                     200 RSS/XML
 *   ✅ Ship Technology Global  https://www.ship-technology.com/feed/                     200 RSS/XML
 *   ✅ The Loadstar            https://theloadstar.com/feed/                             200 RSS/XML
 *   ✅ ship.energy             https://ship.energy/feed/                                 200 RSS/XML
 *   ✅ Seatrade Maritime       https://www.seatrade-maritime.com/rss.xml                 200 RSS/XML  (rss.xml bypasses Cloudflare; /rss 403s)
 *   ✅ Maritime Executive      https://maritime-executive.com/articles.rss               200 Atom/XML (hidden in /features footer; not in <head> autodiscovery)
 *   ✅ Riviera Maritime Media  https://www.rivieramm.com/Syndication/DF.cfm?f=8&ft=10   200 RSS/XML  (Affino CMS; discovered via <link rel="alternate"> in /news-content-hub)
 *   ✅ Marine Link             https://www.marinelink.com/rss                            200 RSS/XML
 *   ✅ Marine Log              https://www.marinelog.com/rss                             200 RSS/XML
 *   ✅ Container News          https://container-news.com/rss                            200 RSS/XML
 *   ✅ Offshore Engineer       https://www.oedigital.com/rss                             200 RSS/XML
 *   ✅ LNG Industry            https://www.lngindustry.com/rss/lngindustry.xml           200 RSS/XML  (Informa hidden path; not at /rss)
 *   ✅ Dry Bulk Magazine       https://www.drybulkmagazine.com/rss/drybulk.xml           200 RSS/XML  (Informa hidden path)
 *
 * TODO(jonas): Deferred sources tracked in memory (ShippingWatch, class societies,
 * Safety4Sea, Firecrawl candidates). Revisit when Firecrawl is in place (Phase 2
 * Step 2) or corporate subscriptions become available. Paywalled/blocked:
 * TradeWinds (needs SitemapIngestor), ShippingWatch (NHST/Zephr, no sitemap access),
 * Tanker Operator (Cloudflare total block), S&P Platts (subscription), Reuters (dead RSS).
 */

import Parser from "rss-parser";
import { customAlphabet } from "nanoid";
import { IntelItem, IntelSource, registerSource } from "./index";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  21
);

// ---------------------------------------------------------------------------
// RSSIngestor
// ---------------------------------------------------------------------------

export class RSSIngestor implements IntelSource {
  readonly name: string;
  readonly source_type = "rss";
  readonly scheduleMinutes = 20;

  private readonly feedUrl: string;
  private readonly parser: Parser;

  constructor(name: string, feedUrl: string) {
    this.name = name;
    this.feedUrl = feedUrl;
    this.parser = new Parser({
      timeout: 15_000,
      headers: {
        "User-Agent":
          "IQseaIntelBot/1.0 (+https://iqsea.io; RSS ingestion pipeline)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
  }

  async fetch(): Promise<IntelItem[]> {
    const feed = await this.parser.parseURL(this.feedUrl);

    const items: IntelItem[] = [];

    for (const item of feed.items ?? []) {
      const url = (item.link ?? item.guid ?? "").trim();
      if (!url) continue; // can't dedup without a URL

      const title = (item.title ?? "").trim();
      if (!title) continue; // skip items with no headline

      // Prefer contentSnippet (plain text) over content (may have HTML tags)
      const snippet =
        item.contentSnippet?.trim() ||
        item.content?.replace(/<[^>]*>/g, "").trim() ||
        item.summary?.trim() ||
        null;

      // Normalise pubDate to ISO string
      let published_at: string | null = null;
      if (item.pubDate) {
        try {
          published_at = new Date(item.pubDate).toISOString();
        } catch {
          // Unparseable date — leave null
        }
      } else if (item.isoDate) {
        published_at = item.isoDate;
      }

      items.push({
        id: nanoid(),
        source_type: this.source_type,
        source_name: this.name,
        url,
        title,
        snippet: snippet ?? null,
        published_at,
        metadata: {
          author: item.creator ?? item.author ?? null,
          categories: item.categories ?? [],
          guid: item.guid ?? null,
        },
      });
    }

    return items;
  }
}

// ---------------------------------------------------------------------------
// Production feed registry
// ---------------------------------------------------------------------------

const FEEDS: Array<{ name: string; url: string }> = [
  // --- Original roster (confirmed working 2026-04-15) ---
  { name: "Splash247",              url: "https://splash247.com/feed/" },
  { name: "gCaptain",               url: "https://gcaptain.com/feed/" },
  { name: "Hellenic Shipping News", url: "https://www.hellenicshippingnews.com/feed/" },
  { name: "LNG Prime",              url: "https://lngprime.com/feed/" },
  { name: "Offshore Energy",        url: "https://www.offshore-energy.biz/feed/" },
  { name: "Ship Technology Global", url: "https://www.ship-technology.com/feed/" },
  { name: "The Loadstar",           url: "https://theloadstar.com/feed/" },
  { name: "ship.energy",            url: "https://ship.energy/feed/" },

  // --- Expanded roster (confirmed working 2026-04-16) ---

  // Recovered sources (non-obvious URLs found via research):
  { name: "Seatrade Maritime",      url: "https://www.seatrade-maritime.com/rss.xml" },
  { name: "Maritime Executive",     url: "https://maritime-executive.com/articles.rss" },
  { name: "Riviera Maritime Media", url: "https://www.rivieramm.com/Syndication/DF.cfm?f=8&ft=10" },

  // General commercial maritime trade press:
  { name: "Marine Link",            url: "https://www.marinelink.com/rss" },
  { name: "Marine Log",             url: "https://www.marinelog.com/rss" },
  { name: "Container News",         url: "https://container-news.com/rss" },
  { name: "Offshore Engineer",      url: "https://www.oedigital.com/rss" },

  // Informa specialist titles (non-standard feed paths):
  { name: "LNG Industry",           url: "https://www.lngindustry.com/rss/lngindustry.xml" },
  { name: "Dry Bulk Magazine",      url: "https://www.drybulkmagazine.com/rss/drybulk.xml" },
];

for (const feed of FEEDS) {
  registerSource(new RSSIngestor(feed.name, feed.url));
}

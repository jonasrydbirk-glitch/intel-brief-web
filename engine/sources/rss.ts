/**
 * RSS ingestion source — fetches and normalises items from an RSS/Atom feed.
 *
 * Each RSSIngestor wraps a single feed URL.  At the bottom of this file,
 * all production feeds are registered via registerSource().
 *
 * Feed verification status (checked 2026-04-15):
 *   ✅ Splash247              https://splash247.com/feed/                         200 RSS/XML
 *   ✅ gCaptain                https://gcaptain.com/feed/                          200 RSS/XML
 *   ✅ Hellenic Shipping News  https://www.hellenicshippingnews.com/feed/          200 RSS/XML
 *   ✅ LNG Prime               https://lngprime.com/feed/                          200 RSS/XML
 *   ✅ Offshore Energy         https://www.offshore-energy.biz/feed/               200 RSS/XML
 *   ✅ Ship Technology Global  https://www.ship-technology.com/feed/               200 RSS/XML
 *   ✅ The Loadstar            https://theloadstar.com/feed/                       200 RSS/XML (10 items)
 *   ⚠  World Maritime News     https://worldmaritimenews.com/feed/                 200 RSS/XML but 0 items (feed broken)
 *   ✅ ship.energy             https://ship.energy/feed/                           200 RSS/XML
 *
 *   ❌ Seatrade Maritime       https://www.seatrade-maritime.com/rss               403 Cloudflare
 *   ❌ Maritime Executive      https://www.maritime-executive.com/rss              301→404 broken chain
 *   ❌ Riviera Maritime Media  https://www.rivieramm.com/rss                       301→HTML (not XML)
 *   ❌ Lloyds Loading List     https://www.lloydsloadinglist.com/rss.htm           301→403
 *
 * TODO(jonas): Seatrade, Maritime Executive, Riviera, and Lloyds Loading List
 * all returned errors during automated verification. Check whether:
 *   • They need a registered User-Agent header or API key
 *   • They have moved to new feed URLs
 *   • They are paywalled / Cloudflare-protected (Seatrade, Lloyds)
 * When you have working URLs, add them to the FEEDS array at the bottom.
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

// TODO(jonas): Add verified replacements for the 4 dead feeds listed in the
// file-level comment above (Seatrade, Maritime Executive, Riviera, Lloyds).
const FEEDS: Array<{ name: string; url: string }> = [
  // Confirmed working 2026-04-15
  { name: "Splash247",             url: "https://splash247.com/feed/" },
  { name: "gCaptain",              url: "https://gcaptain.com/feed/" },
  { name: "Hellenic Shipping News",url: "https://www.hellenicshippingnews.com/feed/" },
  { name: "LNG Prime",             url: "https://lngprime.com/feed/" },
  { name: "Offshore Energy",       url: "https://www.offshore-energy.biz/feed/" },
  { name: "Ship Technology Global",url: "https://www.ship-technology.com/feed/" },
  { name: "The Loadstar",          url: "https://theloadstar.com/feed/" },
  { name: "ship.energy",           url: "https://ship.energy/feed/" },
];

for (const feed of FEEDS) {
  registerSource(new RSSIngestor(feed.name, feed.url));
}

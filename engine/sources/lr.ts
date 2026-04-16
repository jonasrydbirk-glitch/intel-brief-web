/**
 * Lloyd's Register press listing ingestor.
 *
 * LR publishes press releases on a server-rendered listing page using a
 * consistent card structure.  Each article card is an
 * <a class="lrcontent-teaser" href="/en/..."> anchor; the headline lives in a
 * nested <div class="lrcontent-teaser__text">.  No date is present on the
 * listing page — published_at is left null and will be populated in Phase 2
 * Step 2 when full article pages are fetched via Jina Reader.
 *
 * No JS rendering is required — the listing page is fully server-rendered and
 * cheerio static parsing is sufficient.
 *
 * Verification: https://www.lr.org/en/knowledge/press-room/press-listing/
 *   Confirmed server-rendered; lrcontent-teaser selector works. (2026-04-16)
 */

import { load } from "cheerio";
import { customAlphabet } from "nanoid";
import { IntelItem, IntelSource, registerSource } from "./index";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  21
);

const LR_BASE_URL = "https://www.lr.org";
const LR_LISTING_URL = `${LR_BASE_URL}/en/knowledge/press-room/press-listing/`;

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// LloydsRegisterIngestor
// ---------------------------------------------------------------------------

export class LloydsRegisterIngestor implements IntelSource {
  readonly name: string;
  readonly source_type = "html_list";
  readonly scheduleMinutes = 60; // LR publishes ~2–5 items per week

  private readonly listingUrl: string;
  private readonly baseUrl: string;

  constructor(
    name: string,
    listingUrl: string = LR_LISTING_URL,
    baseUrl: string = LR_BASE_URL
  ) {
    this.name = name;
    this.listingUrl = listingUrl;
    this.baseUrl = baseUrl;
  }

  async fetch(): Promise<IntelItem[]> {
    const resp = await fetch(this.listingUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: "text/html,application/xhtml+xml,*/*",
      },
    });

    if (!resp.ok) {
      throw new Error(
        `HTTP ${resp.status} fetching LR listing: ${this.listingUrl}`
      );
    }

    const html = await resp.text();
    const $ = load(html);
    const items: IntelItem[] = [];
    const seen = new Set<string>();

    $("a.lrcontent-teaser").each((_, el) => {
      const relHref = $(el).attr("href")?.trim() ?? "";
      if (!relHref) return;

      // Resolve relative URL to absolute
      const url = relHref.startsWith("http")
        ? relHref
        : `${this.baseUrl}${relHref}`;

      // Only ingest press-release entries — the listing page also contains
      // service/expertise teasers (e.g. /en/expertise/...) that share the
      // same lrcontent-teaser class.  Press releases follow the path pattern:
      //   /en/knowledge/press-room/press-listing/press-release/{year}/{slug}/
      if (!url.includes("/press-release/")) return;

      // Deduplicate (listing page may repeat featured items)
      if (seen.has(url)) return;
      seen.add(url);

      const title = $(el)
        .find(".lrcontent-teaser__text")
        .first()
        .text()
        .trim();

      if (!title) {
        // Malformed card with no visible headline — skip
        return;
      }

      items.push({
        id: nanoid(),
        source_type: this.source_type,
        source_name: this.name,
        url,
        title,
        snippet: null, // No excerpt on listing page; populated in Phase 2 Step 2
        published_at: null, // No date on listing page; populated in Phase 2 Step 2
        metadata: {
          contentTier: "headline_only",
        },
      });
    });

    return items;
  }
}

// ---------------------------------------------------------------------------
// Production registration
// ---------------------------------------------------------------------------

registerSource(new LloydsRegisterIngestor("Lloyd's Register"));

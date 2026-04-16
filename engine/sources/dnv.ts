/**
 * DNV news ingestor — extracts articles from the JSON payload embedded in
 * DNV's static news page HTML.
 *
 * DNV pre-renders 20 news items into a `data-props` attribute on the
 * NewsListing component root element.  The JSON carries title, text snippet,
 * relative URL, ISO date, and sector tags.  We filter to the "Maritime"
 * sector only — DNV publishes across energy, food, healthcare, maritime, etc.
 * and only maritime content is relevant here.
 *
 * No JS rendering required — the initial 20 items are in the static HTML.
 *
 * DNV sector taxonomy (confirmed 2026-04-16, totalCount=395):
 *   "Maritime"                       171 items  ← ingested
 *   "Energy"                         128 items
 *   "Other sectors"                   31 items
 *   "Food and beverage"               13 items
 *   "Healthcare and Medical Devices"   8 items
 *   "Corporate"                        11 items
 *   "Cyber Industries"                  6 items
 *   "Aquaculture and Ocean Health"      4 items
 *   "Cyber security"                    4 items
 *   "Automotive, Aerospace and Rail"    4 items
 *   "Finance"                           4 items
 *   "Government"                        1 item
 *
 * Verification: https://www.dnv.com/news/
 *   data-react-component="NewsListing" element carries data-props JSON.
 *   (Checked 2026-04-16)
 */

import { load } from "cheerio";
import { customAlphabet } from "nanoid";
import { IntelItem, IntelSource, registerSource } from "./index";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  21
);

const DNV_BASE_URL = "https://www.dnv.com";
const DNV_NEWS_URL = `${DNV_BASE_URL}/news/`;

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Sector values that indicate maritime-relevant content
const MARITIME_SECTORS = new Set<string>(["Maritime"]);

// ---------------------------------------------------------------------------
// Shape of the data-props JSON
// ---------------------------------------------------------------------------

interface DnvNewsItem {
  id: number;
  title: string;
  text: string;
  date: string[];
  url: string;
  sectors: string[];
  orderByDateTime?: string;
}

interface DnvDataProps {
  initialItems?: {
    totalCount?: number;
    results?: DnvNewsItem[];
  };
}

// ---------------------------------------------------------------------------
// DnvIngestor
// ---------------------------------------------------------------------------

export class DnvIngestor implements IntelSource {
  readonly name: string;
  readonly source_type = "html_data_props";
  readonly scheduleMinutes = 60; // DNV publishes a handful of items per week

  private readonly newsUrl: string;
  private readonly baseUrl: string;

  constructor(
    name: string,
    newsUrl: string = DNV_NEWS_URL,
    baseUrl: string = DNV_BASE_URL
  ) {
    this.name = name;
    this.newsUrl = newsUrl;
    this.baseUrl = baseUrl;
  }

  async fetch(): Promise<IntelItem[]> {
    const resp = await fetch(this.newsUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent": DEFAULT_UA,
        Accept: "text/html,application/xhtml+xml,*/*",
      },
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} fetching DNV news: ${this.newsUrl}`);
    }

    const html = await resp.text();
    const $ = load(html);

    // The news listing component is rendered as data-react-component="DynamicList"
    // (confirmed 2026-04-16 — the component name "NewsListing" is not present in
    // the actual HTML; "DynamicList" is the real attribute value)
    const propsRaw = $("[data-react-component='DynamicList']").attr("data-props");

    if (!propsRaw) {
      throw new Error("DNV: data-props attribute not found in page HTML");
    }

    let parsed: DnvDataProps;
    try {
      parsed = JSON.parse(propsRaw) as DnvDataProps;
    } catch (err) {
      throw new Error(
        `DNV: failed to parse data-props JSON — ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    const results = parsed.initialItems?.results ?? [];
    const items: IntelItem[] = [];

    for (const article of results) {
      // Maritime sector filter — skip non-maritime content
      const isMaritime = article.sectors?.some((s) => MARITIME_SECTORS.has(s));
      if (!isMaritime) continue;

      const title = article.title?.trim();
      const url = article.url?.trim();
      if (!title || !url) continue;

      // Resolve relative URL
      const absoluteUrl = url.startsWith("http")
        ? url
        : `${this.baseUrl}${url}`;

      // Parse date — prefer orderByDateTime (ISO with time+TZ), fall back to
      // date[0] which is a human-readable string like "15 April, 2026".
      let published_at: string | null = null;
      const rawDate = article.orderByDateTime ?? article.date?.[0] ?? null;
      if (rawDate) {
        try {
          published_at = new Date(rawDate).toISOString();
        } catch {
          // Unparseable — leave null
        }
      }

      items.push({
        id: nanoid(),
        source_type: this.source_type,
        source_name: this.name,
        url: absoluteUrl,
        title,
        snippet: article.text?.trim() || null,
        published_at,
        metadata: {
          sectors: article.sectors,
          dnvId: article.id,
        },
      });
    }

    return items;
  }
}

// ---------------------------------------------------------------------------
// Production registration
// ---------------------------------------------------------------------------

registerSource(new DnvIngestor("DNV"));

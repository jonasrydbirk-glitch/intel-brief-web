/**
 * ABS (American Bureau of Shipping) news ingestor.
 *
 * ABS uses Adobe AEM at ww2.eagle.org — the news listing page is
 * JavaScript-rendered, so static HTML fetch returns no article cards.
 * We launch headless Chrome (puppeteer-core) to wait for the listing,
 * then extract article links and headlines.
 *
 * Any error causes fetch() to throw — the runner catches it per-source
 * so a broken ABS page never blocks other ingestion feeds.
 *
 * PUPPETEER_EXECUTABLE_PATH must be set in the environment; the
 * ingestor throws with a clear message if it is missing.
 *
 * Verified page: https://ww2.eagle.org/en/news.html (2026-04-19)
 */

import puppeteer from "puppeteer-core";
import { customAlphabet } from "nanoid";
import { IntelItem, IntelSource, registerSource } from "./index";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  21
);

const ABS_BASE_URL = "https://ww2.eagle.org";
const ABS_NEWS_URL = `${ABS_BASE_URL}/en/news.html`;

// ---------------------------------------------------------------------------
// ABSIngestor
// ---------------------------------------------------------------------------

export class ABSIngestor implements IntelSource {
  readonly name: string;
  readonly source_type = "puppeteer_html";
  readonly scheduleMinutes = 60; // ABS publishes a handful of items per week

  constructor(name: string) {
    this.name = name;
  }

  async fetch(): Promise<IntelItem[]> {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!executablePath) {
      throw new Error("ABS: PUPPETEER_EXECUTABLE_PATH is not set");
    }

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-logging", "--log-level=3"],
    });

    try {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(30_000);

      await page.goto(ABS_NEWS_URL, { waitUntil: "networkidle2" });

      // Wait for at least one article link to appear after JS rendering.
      // AEM lazy-hydrates the news card list; we give it up to 15 s.
      await page.waitForSelector('a[href*="/en/news/"]', { timeout: 15_000 });

      const rawItems = await page.evaluate((): Array<{ url: string; title: string }> => {
        const results: Array<{ url: string; title: string }> = [];
        const seen = new Set<string>();

        document.querySelectorAll<HTMLAnchorElement>('a[href*="/en/news/"]').forEach((el) => {
          const href = el.href;
          if (!href || seen.has(href)) return;

          // Skip the listing page itself and any pagination/category URLs
          // Articles have at least 3 path segments: /en/news/<slug>
          try {
            const path = new URL(href).pathname;
            const segments = path.split("/").filter(Boolean);
            if (segments.length < 3) return;
          } catch {
            return;
          }

          // Use the link's own text content as headline; skip empty/nav links
          const title = (el.textContent ?? "").replace(/\s+/g, " ").trim();
          if (title.length < 8) return;

          seen.add(href);
          results.push({ url: href, title });
        });

        return results;
      });

      return rawItems.map(({ url, title }) => ({
        id: nanoid(),
        source_type: this.source_type,
        source_name: this.name,
        url,
        title,
        snippet: null,
        published_at: null,
        metadata: { contentTier: "headline_only" },
      }));
    } finally {
      await browser.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Production registration
// ---------------------------------------------------------------------------

registerSource(new ABSIngestor("ABS"));

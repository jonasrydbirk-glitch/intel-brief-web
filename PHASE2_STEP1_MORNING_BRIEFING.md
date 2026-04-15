# Phase 2 Part A Step 1 — Morning Briefing

## What's ready to review

- **Branch:** `feat/rss-ingestion` (pushed, not merged — do NOT merge until you've run the migration)
- **Diff:** https://github.com/jonasrydbirk-glitch/intel-brief-web/compare/main...feat/rss-ingestion

**Files added / changed:**

| File | What |
|---|---|
| `migrations/004_intelligence_items.sql` | New tables: `intelligence_items`, `ingestion_runs`. Requires pgvector. |
| `engine/sources/index.ts` | `IntelSource` interface + `registeredSources` registry |
| `engine/sources/rss.ts` | `RSSIngestor` class + all 8 production feeds registered |
| `engine/sources/runner.ts` | `runIngestion()` + `runAllIngestions()` — batch dedup + audit trail |
| `engine/warden.ts` | Import ingestion sources, startup log, ingestion loop every 20 min |
| `scripts/test-rss-feeds.ts` | Smoke test script (no DB — safe to re-run any time) |
| `package.json` / `package-lock.json` | Added `rss-parser` (free, MIT, zero-dep-tree) |

---

## RSS feeds verified (tested live 2026-04-15 ~14:30 SGT)

| Feed | URL | Status | Items |
|---|---|---|---|
| Splash247 | https://splash247.com/feed/ | ✅ 200 RSS/XML | 10 |
| gCaptain | https://gcaptain.com/feed/ | ✅ 200 RSS/XML | 12 |
| Hellenic Shipping News | https://www.hellenicshippingnews.com/feed/ | ✅ 200 RSS/XML | 20 |
| LNG Prime | https://lngprime.com/feed/ | ✅ 200 RSS/XML | 10 |
| Offshore Energy | https://www.offshore-energy.biz/feed/ | ✅ 200 RSS/XML | 10 |
| Ship Technology Global | https://www.ship-technology.com/feed/ | ✅ 200 RSS/XML | 10 |
| The Loadstar | https://theloadstar.com/feed/ | ✅ 200 RSS/XML | 10 |
| ship.energy | https://ship.energy/feed/ | ✅ 200 RSS/XML | 10 |

**Total at test time: 92 items across 8 feeds, all with direct article URLs and pubDates.**

---

## Feeds needing your review (not in active roster)

These 4 feeds from the original spec returned errors during automated verification.
They are commented out of the active feeds list. Add them back once you have working URLs.

| Feed | Original URL | Issue |
|---|---|---|
| **Seatrade Maritime** | https://www.seatrade-maritime.com/rss | **403 Cloudflare** — bot protection blocking the request. May need a registered User-Agent, API key, or they've moved to a gated feed. |
| **Maritime Executive** | https://www.maritime-executive.com/rss | **301 → 404** — www redirects to no-www, which returns 404. Feed URL is broken. Check their website for the current RSS URL. |
| **Riviera Maritime Media** | https://www.rivieramm.com/rss | **301 → HTML** — redirects to /rss-feed which serves an HTML page, not XML. Feed may have been discontinued or moved. |
| **Lloyds Loading List** | https://www.lloydsloadinglist.com/rss.htm | **301 → 403** — redirects to lloydslist.com which blocks automated requests. May require a subscription or API key. |

To add them when fixed: edit the `FEEDS` array at the bottom of `engine/sources/rss.ts`.

---

## Open product questions — `TODO(jonas)` markers

| Marker | File | Line | Question |
|---|---|---|---|
| `TODO(jonas)` | `engine/sources/rss.ts` | ~35 | Add verified replacements for the 4 dead feeds once you have working URLs |

No other blocking product questions were encountered. The architecture choices (IntelSource interface, dedup by URL, audit trail in ingestion_runs, 20-min poll cadence) were unambiguous given the context.

---

## Sequence to ship

**Before merging:**

1. **Review the branch diff:**
   https://github.com/jonasrydbirk-glitch/intel-brief-web/compare/main...feat/rss-ingestion

2. **Enable pgvector in Supabase:**
   Dashboard → Database → Extensions → search "vector" → enable
   *(If your plan doesn't include pgvector, the migration will fail on the first line — that's the expected signal to upgrade or remove the embedding column for now.)*

3. **Run the migration in Supabase SQL Editor:**
   Copy the contents of `migrations/004_intelligence_items.sql` and run it.
   This creates `intelligence_items` and `ingestion_runs` tables.
   Safe to re-run — all statements use `IF NOT EXISTS`.

4. **Merge branch to main** (Vercel auto-deploys the web app — no Warden impact, all new code is engine-side):
   ```
   git checkout main && git merge feat/rss-ingestion --no-ff && git push origin main
   ```

5. **On the Beelink (Jonas's machine), pull and restart Warden:**
   ```
   cd C:\Users\Atlas\.openclaw\workspace\intel-brief-web
   git pull origin main
   pm2 restart warden
   ```

6. **Verify ingestion is running:**
   ```
   pm2 logs warden --lines 50 --nostream
   ```
   Look for two signals:
   - On startup: `Registered 8 intelligence source(s): Splash247, gCaptain, ...`
   - Within 20 seconds of startup (lastIngestionRun starts at 0): first `RSS ingestion complete: 8 feeds · N new · ...` log line

7. **Verify data landed in Supabase:**
   In the Supabase table editor, check `intelligence_items` — you should see ~92 rows after the first ingestion run. Check `ingestion_runs` for the per-feed audit rows.

---

## What's NOT in this PR

This PR is Step 1 only — the data foundation. The ingestion pipeline writes raw items to the DB. The items are not yet used by the brief generator.

| Step | What | Status |
|---|---|---|
| **Step 1 (this PR)** | RSS ingestion → `intelligence_items` table | ✅ Done |
| **Step 2** | Jina Reader — fetch full article body for each new item | ⬜ Not started |
| **Step 3** | OpenAI embeddings — `text-embedding-3-small` for each item | ⬜ Not started |
| **Step 4** | Swap Scout/Architect to use own library instead of live Perplexity | ⬜ Not started |
| **Step 5** | Exa gap-fill — supplement library with live results for freshness | ⬜ Not started |

Steps 2–5 build directly on top of this foundation without touching warden's core dispatch loop.

---

*Briefing generated 2026-04-15. Delete this file after review.*

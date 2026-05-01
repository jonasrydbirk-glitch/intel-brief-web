@AGENTS.md

# IQsea — Maritime Intelligence Platform

The definitive reference for any Claude Code / OpenClaw session working on this codebase. Read this before making non-trivial changes.

## Project Overview

- **Product**: [iqsea.io](https://iqsea.io) — AI-curated maritime intelligence briefs delivered by email + PDF.
- **Stack**: Next.js 15 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + storage) · custom JWT auth via `jose` (**NOT** Supabase Auth — do not introduce it).
- **Deploy**:
  - **Web**: Vercel Hobby plan, custom domain `iqsea.io`. Serverless functions are subject to a hard **10s timeout**.
  - **Warden engine**: runs 24/7 on a local Beelink mini-PC under pm2, **not on Vercel**. Treat anything in `engine/` as long-running infrastructure that does not run in serverless contexts.

## Architecture

### `app/` — Next.js routes & UI
- Pages, API routes, and React components.
- **Dark-mode only.** No component library. All UI is hand-rolled Tailwind (`@theme` tokens in `app/globals.css`).
- Design tokens (use these, don't hard-code):
  - `--background` / navy `#0b1424`
  - `--card` `#132742`
  - `--accent` / teal `#2BB3CD`
  - `--gold-500` `#F4B400`
  - `--foreground` `#f0f4f8`
  - Plus the `--slate-*`, `--navy-*`, `--border*` ramps in `globals.css`.

### `engine/` — Warden + brief generator
- **`engine/warden.ts`** — long-running scheduler. Owns:
  - `processJobQueue()` — claims pending jobs atomically (`.eq("status", "pending")`).
  - `deliveryLoop()` — sends pre-generated briefs at the right local time.
  - Email wrapper builders: `buildBriefEmailHtml`, `buildMonthlyEmailHtml`.
- **`engine/brief-generator.ts`** — the four-stage pipeline:
  1. **Scout** (Minimax M1 via OpenRouter) — generates search queries from the subscriber profile.
  2. **Sonar** / Retriever — `engine/search/retriever.ts` does library-first semantic search + Tavily gap-fill.
  3. **Architect** (Claude Sonnet 4.6 via OpenRouter, **temperature 0.3**) — synthesises the brief.
  4. **Scribe** — JSON normaliser; cleans the Architect output before persistence.
- Sources live in `engine/sources/` (RSS, WP-REST, sitemap, custom scrapers). 22 active sources total: 17 RSS + 1 WP-REST (Safety4Sea) + 1 sitemap (TradeWinds) + 3 custom (ABS, DNV, Lloyd's Register).

### `lib/` — server utilities
- **`lib/email.ts`** is the **only** email module. Resend (preferred, if `RESEND_API_KEY` is set) with a Microsoft Graph fallback. **Do not recreate `lib/delivery.ts` — it was deleted on purpose.**
- `lib/email-tokens.ts` — HMAC signing for email links (see Security).
- `lib/brief-html.ts` — shared HTML rendering for daily + monthly PDFs (`renderBriefHtml`, `renderMonthlyBriefHtml`). The header (`renderPageHeader`) and footer (`renderPageFooter`) are shared between both.
- `lib/brief-banner.ts` and `lib/brief-logo.ts` — base64 data URIs for the email + PDF artwork.
- `lib/render-pdf.ts` — Puppeteer + `@sparticuz/chromium`. Used by both ad-hoc API routes and the Warden delivery loop.
- `lib/supabase.ts` — proxied Supabase client with timeout-aware fetch.

## Key Patterns

### HMAC-signed email links
Any link in an outgoing email that exposes a subscriber ID **must** be HMAC-signed via `lib/email-tokens.ts` (HMAC-SHA256 over `<purpose>:<subscriberId>`, key = `SESSION_SECRET`). Today this protects:
- `/unsubscribe?sub=...&t=...` (purpose `"unsub"`)
- `/feedback?...&sub=...&t=...` (purpose `"feedback"`)

Add a new purpose string per use case so tokens aren't reusable across endpoints.

### Banner / logo inlining
PDFs and email templates pull artwork from `lib/brief-banner.ts` (`BANNER_INTEL_BRIEF_DATA_URI`) and `lib/brief-logo.ts` (`IQSEA_NAVY_LOGO_DATA_URI`). If you change source artwork in `public/`, regenerate the corresponding TS module — these data URIs are the source of truth at render time. Banner is ~250KB inline; Gmail may clip the message. Future fix: host the banner at `iqsea.io` and reference by URL.

### Atomic job claims
The Warden queue can have multiple workers; every status transition that takes ownership of a job **must** filter on the prior status:

```ts
.update({ status: "processing", updated_at: ... })
.eq("id", job.id)
.eq("status", "pending")        // ← required
.select("id")
```

If `.select()` returns 0 rows, another worker won the race — skip the job. The same applies to `ready_to_send → processing` in `deliveryLoop`.

### Vercel 10s timeout
Vercel Hobby kills serverless functions at 10 seconds. Anything that does an LLM call, PDF render, or batch DB work must:
1. Enqueue a `brief_jobs` row from the API route, then return immediately.
2. Let Warden (running on the Beelink) pick it up and process it.

Never call OpenRouter / generate PDFs synchronously from an API route.

### URL validation
`engine/verification/urls.ts` performs liveness checks on every URL the Architect produces. The check is invoked via `validateBriefUrls` in `engine/warden.ts` for **both** daily and monthly paths — keep that symmetric. `PAYWALL_DOMAINS` is the skip-list for known bot-blocked publishers; do not add an active RSS source domain to it.

### Frequency-aware freshness
Scout queries include a freshness qualifier driven by `profile.frequency`:
- `daily` / `business` → 48h
- `3x` → 72h
- `weekly` → 168h (7d)

Editing this in `engine/brief-generator.ts > scoutStage` is fine; just keep the values per-cadence rather than collapsing back to a single window.

### Architect temperature
`temperature: 0.3` is intentional — bumped down from the OpenRouter default to reduce fabrication on a model that's being asked to ground every claim in retrieved sources. Do not remove without a deliberate reason.

## Email

- **Module**: `lib/email.ts` (Resend → Graph fallback). Returns `{ success, error?, messageId?, provider? }` — never throws.
- **Wrappers**: `buildBriefEmailHtml(fullName, dateStr)` and `buildMonthlyEmailHtml(fullName, periodLabel)` in `engine/warden.ts`. Both share the same template:
  - Inline banner (`BANNER_INTEL_BRIEF_DATA_URI`, `border-radius: 10px`).
  - Slim info row: `date | name + pill` (`Deep Dive` for daily, `Monthly Review` for monthly).
  - Body copy.
  - IQSEA navy logo footer with "Confidential" tagline.
- **Banner size**: ~250KB base64 inline. Gmail clips messages at ~102KB; the brief is currently delivered intact via Resend, but the banner pushes total payload over the threshold for some clients. Migrating to a hosted banner URL is the planned fix.

## PDF

- Rendered with Puppeteer + `@sparticuz/chromium` (`lib/render-pdf.ts`).
- Page setup: A4-equivalent, **5mm margins**, content max-width **780px**.
- Typography (post-mobile-readability bump):
  - Body text **17px**
  - Headlines **18px**
  - Table cells **16px**
- Both daily and monthly PDFs go through the same `renderPageHeader` / `renderPageFooter` so design changes propagate to both.

## Security

- **`/api/profile/[id]`** — requires a valid session **and** `session.userId === id`. Strips `password_hash`, `reset_token`, `reset_token_expires` before returning.
- **`/api/unsubscribe`** — requires a valid HMAC `t=...` token. Email-only flow; the in-app pause toggle goes through `/api/settings/report` instead.
- **`/api/feedback`** — brief-mode requires HMAC; rate-limited per subscriber (10 / hour, in-memory).
- **`/api/alter/[id]`** — session + ownership; atomic increment of `tweaks_used` via optimistic concurrency (`.eq("tweaks_used", priorValue)`).
- **`/api/admin/*`** — gated by admin middleware; an override-password env var exists. ⚠️ Flagged as not ideal — replace with a proper admin role/claim before scale.
- General rule: any new endpoint that touches a subscriber row must verify session + ownership, or HMAC + purpose-binding.

## Known Issues / Tech Debt

- **`/api/alter/[id]` schema mismatch** — the alter form posts `segments`, `regions`, `focus`, `watchlist`, none of which exist in the `subscribers` table. The route currently silently drops them. Fix needs either a migration to add columns or a remap into the existing `modules` JSONB.
- **Admin sidebar duplication** — the same ~150-line nav structure is inlined in `app/admin/page.tsx`, `app/admin/test/page.tsx`, and `app/admin/intel-health/page.tsx`. Should be lifted into `app/admin/layout.tsx`.
- **Hardcoded hex colors** — ~15 files still use literal hex values instead of `var(--accent)` etc. Cleanup is gradual; prefer CSS variables in any new code.
- **`warden.log`** — now in `.gitignore`, but historic commits include it. Don't `git rm --cached` without coordinating; the file may still appear in older clones.
- **Source count = 22** — keep landing page, FAQ, and onboarding copy in sync if sources are added/removed (`app/components/faq-accordion.tsx`, `app/page.tsx`, `app/onboard/page.tsx`).
- **Email banner clipping** — see Email section above.
- **`industryChatter` / `earningsCall` toggles** — present in onboarding + settings UI but have no backing module in the engine. Marked `isUC: true` (Under Construction). Do not wire them to LLM prompts until the modules exist.

## Owner

- **Jonas Rydbirk** — jonasrydbirk@gmail.com.
- Non-developer; delegates all code to Claude. Reviews diffs and ships, doesn't write code.
- **Working preferences**:
  - Ship small. Prefer one focused PR over a sprawling refactor.
  - Avoid paid services unless there's a compelling reason. Vercel Hobby + Supabase free tier + the Beelink are the budget envelope.
  - Branch-based review: assume changes will land via a PR or worktree-based review, not pushed straight to `main` from a long-running dev session.
  - Enforce UI consistency — design tokens, the shared header/footer template, and the existing button/pill conventions are not optional.
- **Production touch rule**: do not modify Warden config, Supabase schema, or anything that affects subscribers in production without flagging it explicitly first. Local-dev changes are fine without a heads-up.

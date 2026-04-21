/**
 * IQsea Brief HTML Renderer — Professional Template
 *
 * Converts a BriefPayload into a self-contained HTML document styled
 * for PDF output (Puppeteer) and email attachment previewing.
 *
 * Design language: maritime consultancy / investment-bank brief.
 * Clean white, deep-navy text, teal accent (#53b1c1), minimal chrome.
 *
 * Depth-mode-aware:
 *   "executive" — headline + 1-sentence summary + terse commentary
 *   "deep"      — full item with quote, multi-sentence commentary, relevance
 *   "data"      — headline + source link only (no summary/commentary)
 *
 * Source-link policy:
 *   ALL news sections render source links — subtle small gray text.
 *   Prospects section: source links are OMITTED (generated leads, not articles).
 *
 * Build 2026-04-16-BRIEF-POLISH
 */

import type {
  BriefPayload,
  IntelItem,
  MarketPulseEntry,
  RegulatoryCountdownEntry,
} from "@/engine/brief-generator";

// ---------------------------------------------------------------------------
// Colour palette (all inline — email/PDF safe)
// ---------------------------------------------------------------------------
const C = {
  navy:       "#0b1424",   // primary text, headlines
  body:       "#374151",   // body text
  muted:      "#6b7280",   // labels, meta
  faint:      "#9ca3af",   // sources, footnotes
  teal:       "#53b1c1",   // accent: borders, links
  tealDark:   "#3a8fa0",   // hover-equivalent for links
  border:     "#e5e7eb",   // dividers, item borders
  borderFaint:"#f3f4f6",   // very light divider (headlines-only mode)
  bg:         "#f9fafb",   // item card background
  bgPage:     "#ffffff",   // page background
  green:      "#16a34a",   // positive change
  red:        "#dc2626",   // negative change
  amber:      "#d97706",   // warning / amber urgency
  safeBg:     "#fffbeb",   // safety item background
  offDutyBg:  "#fdf4ff",   // off-duty item background
  offDutyAcc: "#a855f7",   // off-duty accent
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(str: string | undefined | null): string {
  const s = str ?? "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render a single source URL or publication name as subtle small text.
 * URL → "source ↗" hyperlink (small gray)
 * Plain string → small gray span (publication name)
 * Empty/null → ""
 */
function renderSourceLink(source: string | undefined | null): string {
  if (!source?.trim()) return "";
  const s = source.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    return `<a href="${esc(s)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:${C.faint};text-decoration:underline;white-space:nowrap;">source ↗</a>`;
  }
  return `<span style="font-size:11px;color:${C.faint};">${esc(s)}</span>`;
}

/**
 * Render source attribution for an IntelItem, supporting dual-source citation.
 *
 * Single source:  "Source: [name linked]"
 * Dual source:    "Sources: [primary ↗] · [secondary ↗]"
 * No source:      ""
 *
 * Note: item.secondarySource is an optional field added for dual-source items.
 */
function renderItemSource(item: IntelItem): string {
  const primary = item.source?.trim();
  const secondary = item.secondarySource?.trim();

  if (!primary) return "";

  const primaryHtml = renderSourceLink(primary);

  if (secondary) {
    const secondaryHtml = renderSourceLink(secondary);
    return `<span style="font-size:11px;color:${C.faint};">Sources: ${primaryHtml} &middot; ${secondaryHtml}</span>`;
  }

  return `<span style="font-size:11px;color:${C.faint};">Source: ${primaryHtml}</span>`;
}

/** Render a section heading with teal left-rule and uppercase small-caps label. */
function sectionHeading(title: string, accentColor = C.teal): string {
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid ${C.border};">
    <div style="width:3px;height:16px;background:${accentColor};border-radius:2px;flex-shrink:0;"></div>
    <h2 style="font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.12em;margin:0;">${esc(title)}</h2>
  </div>`;
}

// ---------------------------------------------------------------------------
// News item rendering (depth-aware)
// ---------------------------------------------------------------------------

function renderItem(
  item: IntelItem,
  depth: string = "deep"
): string {
  const sourceHtml = renderItemSource(item);

  // ── Weekly Digest — rich narrative card ─────────────────────────────────
  if (depth === "data") {
    const summaryHtml = item.summary?.trim()
      ? `<div style="font-size:14px;color:${C.body};line-height:1.7;margin-bottom:14px;">${esc(item.summary)}</div>`
      : "";
    const commentaryHtml = item.commentary?.trim()
      ? `<div style="font-size:13px;color:${C.body};font-style:italic;line-height:1.6;padding:12px 16px;background:#f0f9fa;border-left:2px solid ${C.teal};border-radius:0 4px 4px 0;margin-bottom:14px;">${esc(item.commentary)}</div>`
      : "";
    const relevanceHtml = item.relevance?.trim()
      ? `<div style="font-size:13px;color:${C.body};line-height:1.6;margin-bottom:12px;"><strong style="color:${C.navy};">Why it matters:</strong> ${esc(item.relevance)}</div>`
      : "";
    const quoteHtml = item.quote?.trim()
      ? `<blockquote style="margin:0 0 12px;padding:8px 12px;border-left:2px solid ${C.teal};background:${C.bg};border-radius:0 4px 4px 0;font-size:13px;color:${C.body};font-style:italic;line-height:1.5;">&ldquo;${esc(item.quote.trim())}&rdquo;</blockquote>`
      : "";
    return `<div style="margin-bottom:28px;padding:20px 22px;background:#f8fafc;border-radius:8px;border-left:3px solid ${C.teal};">
      <h2 style="font-size:17px;font-weight:700;color:${C.navy};line-height:1.3;margin:0 0 14px;">${esc(item.headline)}</h2>
      ${summaryHtml}
      ${commentaryHtml}
      ${relevanceHtml}
      ${quoteHtml}
      ${sourceHtml ? `<div style="font-size:11px;color:${C.faint};">${sourceHtml}</div>` : ""}
    </div>`;
  }

  // ── Executive + Deep shared elements ───────────────────────────────────
  const summaryHtml = item.summary?.trim()
    ? `<div style="font-size:13px;color:${C.body};line-height:1.55;margin-bottom:7px;">${esc(item.summary)}</div>`
    : "";

  const commentaryHtml = item.commentary?.trim()
    ? `<div style="font-size:12px;color:#1e40af;line-height:1.5;padding:7px 10px;background:#eff6ff;border-radius:4px;margin-bottom:7px;font-style:italic;"><strong style="font-style:normal;">Analyst take:</strong> ${esc(item.commentary)}</div>`
    : "";

  // ── Deep only ───────────────────────────────────────────────────────────
  const quoteHtml =
    depth === "deep" && item.quote?.trim()
      ? `<blockquote style="margin:0 0 7px;padding:6px 10px;border-left:2px solid ${C.teal};background:${C.bg};border-radius:0 4px 4px 0;font-size:12px;color:${C.body};font-style:italic;line-height:1.5;">&ldquo;${esc(item.quote.trim())}&rdquo;</blockquote>`
      : "";

  const relevanceHtml =
    depth === "deep" && item.relevance?.trim()
      ? `<div style="font-size:11px;color:${C.muted};margin-top:4px;"><strong>Why it matters:</strong> ${esc(item.relevance)}</div>`
      : depth === "executive" && item.relevance?.trim()
      ? ""  // skip relevance in executive mode — too verbose
      : "";

  // Source + relevance footer row
  const footerHtml = (sourceHtml || relevanceHtml)
    ? `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;margin-top:6px;">
        <div style="flex:1;">${relevanceHtml}</div>
        ${sourceHtml ? `<div style="flex-shrink:0;">${sourceHtml}</div>` : ""}
      </div>`
    : "";

  return `<div style="margin-bottom:${depth === "executive" ? "10px" : "16px"};padding:${depth === "executive" ? "10px 14px" : "13px 14px"};background:${C.bg};border-radius:5px;border-left:2px solid ${C.border};">
    <div style="font-size:14px;font-weight:600;color:${C.navy};line-height:1.35;margin-bottom:${depth === "executive" ? "4px" : "5px"};">${esc(item.headline)}</div>
    ${summaryHtml}
    ${quoteHtml}
    ${commentaryHtml}
    ${footerHtml}
  </div>`;
}

/**
 * Prospect item — same structure as regular item but NO source link.
 * Prospects are generated leads, not sourced articles.
 */
function renderProspectItem(item: IntelItem, depth: string = "deep"): string {
  if (depth === "data") {
    // Weekly Digest: prospects section is omitted by AI instructions; fallback to slim headline row
    return `<div style="padding:7px 0;border-bottom:1px solid ${C.borderFaint};">
      <span style="font-size:13px;font-weight:600;color:${C.navy};line-height:1.4;">${esc(item.headline)}</span>
    </div>`;
  }

  const summaryHtml = item.summary?.trim()
    ? `<div style="font-size:13px;color:${C.body};line-height:1.55;margin-bottom:7px;">${esc(item.summary)}</div>`
    : "";

  const commentaryHtml = item.commentary?.trim()
    ? `<div style="font-size:12px;color:#1e40af;line-height:1.5;padding:7px 10px;background:#eff6ff;border-radius:4px;margin-bottom:7px;font-style:italic;"><strong style="font-style:normal;">Fit assessment:</strong> ${esc(item.commentary)}</div>`
    : "";

  const relevanceHtml =
    depth === "deep" && item.relevance?.trim()
      ? `<div style="font-size:11px;color:${C.muted};margin-top:4px;"><strong>Fit:</strong> ${esc(item.relevance)}</div>`
      : "";

  return `<div style="margin-bottom:${depth === "executive" ? "10px" : "16px"};padding:${depth === "executive" ? "10px 14px" : "13px 14px"};background:${C.bg};border-radius:5px;border-left:2px solid ${C.border};">
    <div style="font-size:14px;font-weight:600;color:${C.navy};line-height:1.35;margin-bottom:5px;">${esc(item.headline)}</div>
    ${summaryHtml}
    ${commentaryHtml}
    ${relevanceHtml}
  </div>`;
}

function renderOffDutyItem(item: IntelItem, depth: string = "deep"): string {
  const sourceHtml = renderItemSource(item);

  if (depth === "data") {
    return `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid ${C.borderFaint};">
      <span style="font-size:13px;font-weight:600;color:${C.navy};line-height:1.4;flex:1;">${esc(item.headline)}</span>
      ${sourceHtml ? `<span style="flex-shrink:0;">${sourceHtml}</span>` : ""}
    </div>`;
  }

  const summaryHtml = item.summary?.trim()
    ? `<div style="font-size:13px;color:${C.body};line-height:1.55;margin-bottom:7px;">${esc(item.summary)}</div>`
    : "";

  const commentaryHtml = item.commentary?.trim()
    ? `<div style="font-size:12px;color:#6d28d9;line-height:1.5;padding:7px 10px;background:#f5f3ff;border-radius:4px;margin-bottom:7px;font-style:italic;">${esc(item.commentary)}</div>`
    : "";

  const relevanceHtml =
    depth === "deep" && item.relevance?.trim()
      ? `<div style="font-size:11px;color:${C.muted};margin-top:4px;">${esc(item.relevance)}</div>`
      : "";

  const footerHtml = (sourceHtml || relevanceHtml)
    ? `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;margin-top:6px;">
        <div style="flex:1;">${relevanceHtml}</div>
        ${sourceHtml ? `<div style="flex-shrink:0;">${sourceHtml}</div>` : ""}
      </div>`
    : "";

  return `<div style="margin-bottom:${depth === "executive" ? "10px" : "16px"};padding:${depth === "executive" ? "10px 14px" : "13px 14px"};background:${C.offDutyBg};border-radius:5px;border-left:2px solid ${C.offDutyAcc};">
    <div style="font-size:14px;font-weight:600;color:${C.navy};line-height:1.35;margin-bottom:5px;">${esc(item.headline)}</div>
    ${summaryHtml}
    ${commentaryHtml}
    ${footerHtml}
  </div>`;
}

function renderSafetyItem(item: IntelItem, depth: string = "deep"): string {
  const sourceHtml = renderItemSource(item);

  if (depth === "data") {
    return `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid ${C.borderFaint};">
      <span style="font-size:13px;font-weight:600;color:${C.navy};line-height:1.4;flex:1;">${esc(item.headline)}</span>
      ${sourceHtml ? `<span style="flex-shrink:0;">${sourceHtml}</span>` : ""}
    </div>`;
  }

  const summaryHtml = item.summary?.trim()
    ? `<div style="font-size:13px;color:${C.body};line-height:1.55;margin-bottom:7px;">${esc(item.summary)}</div>`
    : "";

  const commentaryHtml = item.commentary?.trim()
    ? `<div style="font-size:12px;color:#92400e;line-height:1.5;padding:7px 10px;background:#fef3c7;border-radius:4px;margin-bottom:7px;font-style:italic;"><strong style="font-style:normal;">Risk assessment:</strong> ${esc(item.commentary)}</div>`
    : "";

  const relevanceHtml =
    depth === "deep" && item.relevance?.trim()
      ? `<div style="font-size:11px;color:${C.muted};margin-top:4px;"><strong>Risk:</strong> ${esc(item.relevance)}</div>`
      : "";

  const footerHtml = (sourceHtml || relevanceHtml)
    ? `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;margin-top:6px;">
        <div style="flex:1;">${relevanceHtml}</div>
        ${sourceHtml ? `<div style="flex-shrink:0;">${sourceHtml}</div>` : ""}
      </div>`
    : "";

  return `<div style="margin-bottom:${depth === "executive" ? "10px" : "16px"};padding:${depth === "executive" ? "10px 14px" : "13px 14px"};background:${C.safeBg};border-radius:5px;border-left:2px solid ${C.amber};">
    <div style="font-size:14px;font-weight:600;color:${C.navy};line-height:1.35;margin-bottom:5px;">${esc(item.headline)}</div>
    ${summaryHtml}
    ${commentaryHtml}
    ${footerHtml}
  </div>`;
}

// ---------------------------------------------------------------------------
// Section containers
// ---------------------------------------------------------------------------

function renderSection(title: string, items: IntelItem[], depth: string = "deep"): string {
  if (!items || items.length === 0) return "";
  return `<div style="margin-bottom:28px;">
    ${sectionHeading(title)}
    ${items.map((item) => renderItem(item, depth)).join("")}
  </div>`;
}

function renderProspectSection(items: IntelItem[], depth: string = "deep"): string {
  if (!items || items.length === 0) return "";
  return `<div style="margin-bottom:28px;">
    ${sectionHeading("Client Prospects")}
    ${items.map((item) => renderProspectItem(item, depth)).join("")}
  </div>`;
}

function renderOffDutySection(items: IntelItem[], depth: string = "deep"): string {
  if (!items || items.length === 0) return "";
  return `<div style="margin-bottom:28px;margin-top:32px;padding:20px;background:linear-gradient(135deg,#fdf4ff,#f0f9ff);border-radius:10px;border:1px solid #e9d5ff;">
    ${sectionHeading("Off Duty", C.offDutyAcc)}
    <p style="font-size:12px;color:${C.muted};margin-bottom:14px;font-style:italic;">Off the clock. No KPIs, no surveys, no billable hours.</p>
    ${items.map((item) => renderOffDutyItem(item, depth)).join("")}
  </div>`;
}

function renderSafetySection(items: IntelItem[], depth: string = "deep"): string {
  if (!items || items.length === 0) return "";
  return `<div style="margin-bottom:28px;">
    ${sectionHeading("Safety &amp; Security", C.amber)}
    <div style="padding:8px 12px;background:#fef3c7;border-radius:5px;margin-bottom:12px;font-size:11px;color:#92400e;font-weight:500;">
      Crew welfare &middot; Asset protection &middot; Operational risk intelligence
    </div>
    ${items.map((item) => renderSafetyItem(item, depth)).join("")}
  </div>`;
}

// ---------------------------------------------------------------------------
// Market Pulse table
// ---------------------------------------------------------------------------

function renderMarketPulseSection(entries: MarketPulseEntry[], depth: string = "deep"): string {
  if (!entries || entries.length === 0) return "";

  const rows = entries
    .map((e) => {
      const change = e.change ?? "";
      const isPositive = /^\+/.test(change) || /\bup\b/i.test(change);
      const isNegative = /^-/.test(change) || /\bdown\b/i.test(change);
      const changeColor = isPositive ? C.green : isNegative ? C.red : C.muted;

      // Weekly Digest: hide source column in market pulse (keep it compact)
      const sourceCell = depth !== "data"
        ? `<td style="padding:6px 8px;font-size:11px;color:${C.faint};font-style:italic;border-bottom:1px solid ${C.borderFaint};text-align:right;">${esc(e.source)}</td>`
        : "";

      return `<tr>
        <td style="padding:6px 8px;font-size:12px;font-weight:600;color:${C.navy};border-bottom:1px solid ${C.borderFaint};">${esc(e.metric)}</td>
        <td style="padding:6px 8px;font-size:12px;color:${C.body};border-bottom:1px solid ${C.borderFaint};text-align:right;font-variant-numeric:tabular-nums;">${esc(e.value)}</td>
        <td style="padding:6px 8px;font-size:12px;font-weight:600;color:${changeColor};border-bottom:1px solid ${C.borderFaint};text-align:right;">${esc(change)}</td>
        ${sourceCell}
      </tr>`;
    })
    .join("");

  const sourceHeader = depth !== "data"
    ? `<th style="padding:6px 8px;font-size:10px;font-weight:700;color:${C.muted};text-align:right;text-transform:uppercase;letter-spacing:0.08em;">Source</th>`
    : "";

  return `<div style="margin-bottom:28px;">
    ${sectionHeading("Market Pulse")}
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid ${C.teal};">
          <th style="padding:6px 8px;font-size:10px;font-weight:700;color:${C.muted};text-align:left;text-transform:uppercase;letter-spacing:0.08em;">Metric</th>
          <th style="padding:6px 8px;font-size:10px;font-weight:700;color:${C.muted};text-align:right;text-transform:uppercase;letter-spacing:0.08em;">Value</th>
          <th style="padding:6px 8px;font-size:10px;font-weight:700;color:${C.muted};text-align:right;text-transform:uppercase;letter-spacing:0.08em;">Change</th>
          ${sourceHeader}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ---------------------------------------------------------------------------
// Regulatory Countdown
// ---------------------------------------------------------------------------

function renderRegulatoryCountdown(entries: RegulatoryCountdownEntry[]): string {
  if (!entries || entries.length === 0) return "";

  const bars = entries
    .map((e) => {
      const daysLeft = e.daysLeft ?? 999;
      const urgency =
        daysLeft <= 30 ? C.red : daysLeft <= 90 ? C.amber : C.green;
      const barWidth = Math.max(5, Math.min(100, 100 - (daysLeft / 365) * 100));
      return `<div style="margin-bottom:10px;padding:10px 12px;background:${C.bg};border-radius:5px;border-left:3px solid ${urgency};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <div style="font-weight:600;font-size:13px;color:${C.navy};">${esc(e.regulation)}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;font-weight:600;color:${urgency};background:${urgency}18;padding:2px 8px;border-radius:4px;">${daysLeft}d</span>
            <span style="font-size:11px;color:${C.faint};">${esc(e.body)}</span>
          </div>
        </div>
        <div style="height:3px;background:${C.border};border-radius:2px;overflow:hidden;margin-bottom:5px;">
          <div style="height:100%;width:${barWidth}%;background:${urgency};border-radius:2px;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:${C.muted};">
          <span>${esc(e.impact)}</span>
          <span style="font-weight:500;">${esc(e.deadline)}</span>
        </div>
      </div>`;
    })
    .join("");

  return `<div style="margin-bottom:28px;">
    ${sectionHeading("Regulatory Countdown")}
    ${bars}
  </div>`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Render a BriefPayload to a self-contained HTML document.
 * Pure function — no network calls, no side effects.
 *
 * @param brief   The full brief payload from the Architect stage
 * @param depth   Rendering depth ("executive" | "deep" | "data") — defaults to brief.depth or "deep"
 */
// ---------------------------------------------------------------------------
// Monthly Strategic Review template
// ---------------------------------------------------------------------------

/**
 * Render a Monthly Strategic Review BriefPayload to HTML.
 *
 * Distinct from the daily template:
 *   - Header: "MONTHLY STRATEGIC REVIEW" + period range instead of today's date
 *   - Main sections rendered as full-depth narrative cards
 *   - Lead rollup (prospectSection) with fit-assessment styling
 *   - Tender rollup (tenderSection) with opportunity styling
 *   - Monthly market trends table
 *   - No regulatory countdown, no off-duty, no safety sections
 */
function ratingButtons(briefJobId: string | undefined, subscriberId: string | undefined, label: string): string {
  if (!briefJobId || !subscriberId) return "";
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://iqsea.io";
  const base = `${siteUrl}/feedback?briefId=${encodeURIComponent(briefJobId)}&sub=${encodeURIComponent(subscriberId)}`;
  return `
  <table width="100%" style="margin-top:32px;border-top:1px solid #e5e7eb;padding-top:20px;border-collapse:collapse;">
    <tr>
      <td align="center" style="font-size:14px;color:#6b7280;padding-bottom:12px;">${label}</td>
    </tr>
    <tr>
      <td align="center">
        <a href="${base}&rating=good" style="display:inline-block;padding:8px 20px;margin:0 8px;background:#16a34a;color:white;text-decoration:none;border-radius:6px;font-size:14px;">&#128077; Useful</a>
        <a href="${base}&rating=ok"   style="display:inline-block;padding:8px 20px;margin:0 8px;background:#6b7280;color:white;text-decoration:none;border-radius:6px;font-size:14px;">&#128528; OK</a>
        <a href="${base}&rating=bad"  style="display:inline-block;padding:8px 20px;margin:0 8px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;font-size:14px;">&#128078; Not helpful</a>
      </td>
    </tr>
  </table>`;
}

export function renderMonthlyBriefHtml(brief: BriefPayload, opts?: { briefJobId?: string; subscriberId?: string; siteUrl?: string }): string {
  const periodLabel = brief.monthlyPeriod
    ? (() => {
        const s = new Date(brief.monthlyPeriod.start + "T12:00:00Z");
        const e = new Date(brief.monthlyPeriod.end   + "T12:00:00Z");
        const fmtDay  = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
        const fmtFull = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
        return `${fmtDay(s)} — ${fmtFull(e)}`;
      })()
    : new Date(brief.generatedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const generatedDate = new Date(brief.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  // ── Top stories — scannable list, no cards ───────────────────────────
  const sectionsHtml = (brief.sections ?? []).map((s) => {
    if (!s.items?.length) return "";
    const items = s.items.map((item) => {
      const sourceLink = item.source?.startsWith("http")
        ? `&ensp;<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:${C.teal};text-decoration:underline;white-space:nowrap;">source ↗</a>`
        : "";
      return `<div style="padding:7px 0 7px 12px;border-left:2px solid ${C.teal};margin-bottom:6px;line-height:1.45;">
        <span style="font-size:13px;font-weight:700;color:${C.navy};">${esc(item.headline)}.</span>${item.summary?.trim() ? `&ensp;<span style="font-size:13px;color:${C.body};">${esc(item.summary)}</span>` : ""}${sourceLink}
      </div>`;
    }).join("");
    return `<div style="margin-bottom:24px;">
      ${sectionHeading(s.title, C.teal)}
      ${items}
    </div>`;
  }).join("");

  // ── Lead rollup — compact table ───────────────────────────────────────
  const leadRollupHtml = brief.prospectSection?.length ? (() => {
    const rows = brief.prospectSection!.map((item) => {
      const sourceCell = item.source?.startsWith("http")
        ? `<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:${C.teal};text-decoration:underline;">link ↗</a>`
        : `<span style="font-size:11px;color:${C.faint};">${esc(item.source || "—")}</span>`;
      return `<tr>
        <td style="padding:7px 8px;font-size:12px;font-weight:600;color:${C.navy};border-bottom:1px solid ${C.border};">${esc(item.headline)}</td>
        <td style="padding:7px 8px;font-size:12px;color:${C.muted};border-bottom:1px solid ${C.border};white-space:nowrap;">${esc(item.commentary || "—")}</td>
        <td style="padding:7px 8px;font-size:12px;color:${C.body};border-bottom:1px solid ${C.border};">${esc(item.summary || "—")}</td>
        <td style="padding:7px 8px;border-bottom:1px solid ${C.border};">${sourceCell}</td>
      </tr>`;
    }).join("");
    return `<div style="margin-bottom:28px;">
      ${sectionHeading("30-Day Lead Rollup", "#16a34a")}
      <table width="100%" style="border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;border-bottom:2px solid ${C.teal};">
            <th style="text-align:left;padding:8px;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;">Company</th>
            <th style="text-align:left;padding:8px;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;">Date</th>
            <th style="text-align:left;padding:8px;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;">Fit Assessment</th>
            <th style="text-align:left;padding:8px;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;">Source</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  })() : "";

  // ── Tender rollup — compact table ────────────────────────────────────
  const tenderRollupHtml = brief.tenderSection?.length ? (() => {
    const rows = brief.tenderSection!.map((item) => {
      const sourceCell = item.source?.startsWith("http")
        ? `<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:${C.teal};text-decoration:underline;">link ↗</a>`
        : `<span style="font-size:11px;color:${C.faint};">${esc(item.source || "—")}</span>`;
      return `<tr>
        <td style="padding:7px 8px;font-size:12px;font-weight:600;color:${C.navy};border-bottom:1px solid ${C.border};">${esc(item.headline)}</td>
        <td style="padding:7px 8px;font-size:12px;color:${C.body};border-bottom:1px solid ${C.border};">${esc(item.summary || "—")}</td>
        <td style="padding:7px 8px;border-bottom:1px solid ${C.border};">${sourceCell}</td>
      </tr>`;
    }).join("");
    return `<div style="margin-bottom:28px;">
      ${sectionHeading("30-Day Tender Rollup", C.amber)}
      <table width="100%" style="border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;border-bottom:2px solid ${C.amber};">
            <th style="text-align:left;padding:8px;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;">Tender / Contract</th>
            <th style="text-align:left;padding:8px;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;">Region &middot; Deadline &middot; Details</th>
            <th style="text-align:left;padding:8px;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;">Source</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  })() : "";

  // ── Monthly market trends table ───────────────────────────────────────
  const marketHtml = brief.marketPulseSection?.length ? (() => {
    const rows = brief.marketPulseSection!.map((e) => {
      const change   = e.change?.trim() || "—";
      const isPos    = /^\+/.test(change) || /up|rise|increas/i.test(change);
      const isNeg    = /^-/.test(change) || /down|fall|declin/i.test(change);
      const chgColor = isPos ? C.green : isNeg ? C.red : C.muted;
      return `<tr>
        <td style="padding:7px 8px;font-size:12px;font-weight:500;color:${C.navy};border-bottom:1px solid ${C.border};">${esc(e.metric)}</td>
        <td style="padding:7px 8px;font-size:12px;color:${C.body};border-bottom:1px solid ${C.border};text-align:right;">${esc(e.value)}</td>
        <td style="padding:7px 8px;font-size:11px;color:${chgColor};font-weight:600;border-bottom:1px solid ${C.border};text-align:right;">${esc(change)}</td>
        <td style="padding:7px 8px;font-size:11px;color:${C.faint};border-bottom:1px solid ${C.border};text-align:right;">${esc(e.source)}</td>
      </tr>`;
    }).join("");
    return `<div style="margin-bottom:28px;">
      ${sectionHeading("Monthly Market Trends", C.teal)}
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:${C.bg};">
            <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid ${C.border};">Metric</th>
            <th style="padding:6px 8px;text-align:right;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid ${C.border};">Current</th>
            <th style="padding:6px 8px;text-align:right;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid ${C.border};">MoM Trend</th>
            <th style="padding:6px 8px;text-align:right;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid ${C.border};">Source</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  })() : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IQsea Monthly Review — ${esc(brief.subscriberName)}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: ${C.bgPage};
      color: ${C.body};
      max-width: 700px;
      margin: 0 auto;
      padding: 36px 24px;
      line-height: 1.5;
    }
  </style>
</head>
<body>

  <!-- ── Header ──────────────────────────────────────────────────────── -->
  <div style="margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid ${C.teal};">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <div style="font-size:24px;font-weight:800;color:${C.navy};letter-spacing:0.04em;line-height:1;">IQsea</div>
        <div style="font-size:10px;color:${C.teal};text-transform:uppercase;letter-spacing:0.14em;margin-top:3px;font-weight:700;">Monthly Catch-Up</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;font-weight:600;color:${C.navy};">${esc(periodLabel)}</div>
        <div style="font-size:10px;color:${C.faint};margin-top:2px;">Generated ${esc(generatedDate)}</div>
      </div>
    </div>
  </div>

  <!-- ── Meta ────────────────────────────────────────────────────────── -->
  <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:28px;padding:10px 14px;background:${C.bg};border-radius:6px;border:1px solid ${C.border};font-size:12px;color:${C.muted};">
    <div><strong style="color:${C.navy};font-weight:600;">For:</strong> ${esc(brief.subscriberName)}</div>
    <div><strong style="color:${C.navy};font-weight:600;">Company:</strong> ${esc(brief.companyName)}</div>
    <div><strong style="color:${C.navy};font-weight:600;">Period:</strong> ${esc(periodLabel)}</div>
  </div>

  <!-- ── Top Stories ───────────────────────────────────────────────── -->
  ${sectionsHtml}

  <!-- ── Lead Rollup ───────────────────────────────────────────────── -->
  ${leadRollupHtml}

  <!-- ── Tender Rollup ─────────────────────────────────────────────── -->
  ${tenderRollupHtml}

  <!-- ── Monthly Market Trends ─────────────────────────────────────── -->
  ${marketHtml}

  <!-- ── Rating buttons ───────────────────────────────────────────── -->
  ${ratingButtons(opts?.briefJobId, opts?.subscriberId, "How was this month&apos;s review?")}

  <!-- ── Footer ────────────────────────────────────────────────────── -->
  <div style="margin-top:36px;padding-top:14px;border-top:1px solid ${C.border};display:flex;justify-content:space-between;align-items:center;font-size:10px;color:${C.faint};">
    <span>IQsea Intel Engine &middot; Monthly Review &middot; Confidential</span>
    <span>${esc(periodLabel)}</span>
  </div>
  <div style="margin-top:10px;text-align:center;font-size:10px;color:${C.faint};">
    ${(() => {
      const base = opts?.siteUrl ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://iqsea.io";
      const href = opts?.subscriberId
        ? `${base}/unsubscribe?sub=${encodeURIComponent(opts.subscriberId)}`
        : `mailto:support@iqsea.io?subject=Unsubscribe`;
      return `<a href="${href}" style="color:${C.faint};text-decoration:underline;">Unsubscribe</a>`;
    })()}
  </div>

  <!-- ── Print button (hidden on print) ──────────────────────────────── -->
  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:9px 24px;background:${C.teal};color:#fff;border:none;border-radius:5px;font-size:13px;font-weight:600;cursor:pointer;">
      Save as PDF
    </button>
  </div>

</body>
</html>`;
}

export function renderBriefHtml(
  brief: BriefPayload,
  depth?: "executive" | "deep" | "data",
  opts?: { briefJobId?: string; subscriberId?: string; siteUrl?: string }
): string {
  const effectiveDepth = depth ?? brief.depth ?? "deep";

  const date = new Date(brief.generatedAt).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const depthLabel =
    effectiveDepth === "executive"
      ? "Executive Summary"
      : effectiveDepth === "data"
      ? "Weekly Digest"
      : "Deep Dive";

  // Build section HTML
  const marketPulseHtml = brief.marketPulseSection
    ? renderMarketPulseSection(brief.marketPulseSection, effectiveDepth)
    : "";
  const regulatoryHtml = brief.regulatoryCountdown
    ? renderRegulatoryCountdown(brief.regulatoryCountdown)
    : "";
  const sectionsHtml = (brief.sections ?? [])
    .map((s) => renderSection(s.title, s.items, effectiveDepth))
    .join("");
  const tenderHtml = brief.tenderSection
    ? renderSection("Tender Watch", brief.tenderSection, effectiveDepth)
    : "";
  const prospectHtml = brief.prospectSection
    ? renderProspectSection(brief.prospectSection, effectiveDepth)
    : "";
  const offDutyHtml = brief.offDutySection
    ? renderOffDutySection(brief.offDutySection, effectiveDepth)
    : "";
  const monthlyRollupHtml = brief.monthlyProspectRollup
    ? renderSection("Monthly Prospect Roll-up", brief.monthlyProspectRollup, effectiveDepth)
    : "";
  const competitorTrackerHtml = brief.competitorTrackerSection
    ? renderSection("Competitor Tracker", brief.competitorTrackerSection, effectiveDepth)
    : "";
  const safetyHtml = brief.safetySection
    ? renderSafetySection(brief.safetySection, effectiveDepth)
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IQsea Intel Brief — ${esc(brief.subscriberName)}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: ${C.bgPage};
      color: ${C.body};
      max-width: 700px;
      margin: 0 auto;
      padding: 36px 24px;
      line-height: 1.5;
    }
  </style>
</head>
<body>

  <!-- ── Header ──────────────────────────────────────────────────────── -->
  <div style="margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid ${C.teal};">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div>
        <div style="font-size:24px;font-weight:800;color:${C.navy};letter-spacing:0.04em;line-height:1;">IQsea</div>
        <div style="font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:0.14em;margin-top:3px;">Intelligence Brief</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:${C.muted};">${esc(depthLabel)}</div>
        <div style="font-size:11px;color:${C.faint};margin-top:2px;">${esc(date)}</div>
      </div>
    </div>
  </div>

  <!-- ── Meta ────────────────────────────────────────────────────────── -->
  <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:28px;padding:10px 14px;background:${C.bg};border-radius:6px;border:1px solid ${C.border};font-size:12px;color:${C.muted};">
    <div><strong style="color:${C.navy};font-weight:600;">For:</strong> ${esc(brief.subscriberName)}</div>
    <div><strong style="color:${C.navy};font-weight:600;">Company:</strong> ${esc(brief.companyName)}</div>
  </div>

  <!-- ── Market Pulse ────────────────────────────────────────────────── -->
  ${marketPulseHtml}

  <!-- ── Regulatory Countdown ────────────────────────────────────────── -->
  ${regulatoryHtml}

  <!-- ── Safety & Security ───────────────────────────────────────────── -->
  ${safetyHtml}

  <!-- ── Core Intelligence Sections ──────────────────────────────────── -->
  ${sectionsHtml}
  ${tenderHtml}
  ${competitorTrackerHtml}
  ${prospectHtml}
  ${monthlyRollupHtml}
  ${offDutyHtml}

  <!-- ── Analyst Note ────────────────────────────────────────────────── -->
  ${brief.analystNote?.trim() ? `
  <div style="margin-top:24px;padding:14px 16px;background:#fefce8;border-left:3px solid #eab308;border-radius:5px;">
    <div style="font-size:10px;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">IQsea Intelligence Perspective</div>
    <div style="font-size:13px;color:#422006;line-height:1.55;">${esc(brief.analystNote)}</div>
  </div>` : ""}

  <!-- ── Rating buttons ────────────────────────────────────────────── -->
  ${ratingButtons(opts?.briefJobId, opts?.subscriberId, "How was today&apos;s brief?")}

  <!-- ── Footer ──────────────────────────────────────────────────────── -->
  <div style="margin-top:36px;padding-top:14px;border-top:1px solid ${C.border};display:flex;justify-content:space-between;align-items:center;font-size:10px;color:${C.faint};">
    <span>IQsea Intel Engine &middot; Confidential</span>
    <span>${esc(date)}</span>
  </div>
  <div style="margin-top:10px;text-align:center;font-size:10px;color:${C.faint};">
    ${(() => {
      const base = opts?.siteUrl ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://iqsea.io";
      const href = opts?.subscriberId
        ? `${base}/unsubscribe?sub=${encodeURIComponent(opts.subscriberId)}`
        : `mailto:support@iqsea.io?subject=Unsubscribe`;
      return `<a href="${href}" style="color:${C.faint};text-decoration:underline;">Unsubscribe</a>`;
    })()}
  </div>

  <!-- ── Print button (hidden on print) ──────────────────────────────── -->
  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:9px 24px;background:${C.teal};color:#fff;border:none;border-radius:5px;font-size:13px;font-weight:600;cursor:pointer;">
      Save as PDF
    </button>
  </div>

</body>
</html>`;
}

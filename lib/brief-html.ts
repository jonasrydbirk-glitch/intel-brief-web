/**
 * IQsea Brief HTML Renderer
 *
 * Shared module that converts a BriefPayload into a self-contained HTML document.
 * Used by both:
 *   - The print API route (app/api/print/generate-sample)
 *   - The local PDF renderer (lib/render-pdf.ts) — no network fetch needed
 *
 * Build 2026-04-08-ELITE — conditional sections: empty sections auto-hidden from PDF output
 */

import type { BriefPayload, IntelItem, MarketPulseEntry, RegulatoryCountdownEntry } from "@/engine/brief-generator";

function renderSourceLink(source: string): string {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    return `<div style="font-size:11px;margin-bottom:6px;"><span style="font-weight:500;color:#64748b;">Source:</span> <a href="${esc(source)}" target="_blank" rel="noopener noreferrer" style="color:#0ea5e9;text-decoration:underline;word-break:break-all;">${esc(source)}</a></div>`;
  }
  return `<div style="font-size:11px;color:#0ea5e9;font-weight:500;margin-bottom:6px;">${esc(source)}</div>`;
}

function renderItem(item: IntelItem): string {
  const commentaryHtml = item.commentary
    ? `<div style="font-size:12px;color:#1e40af;line-height:1.5;margin-bottom:6px;padding:6px 10px;background:#eff6ff;border-radius:4px;font-style:italic;"><strong>Engineer's Take:</strong> ${esc(item.commentary)}</div>`
    : "";
  return `
    <div style="margin-bottom:16px;padding:14px 16px;background:#f8fafc;border-left:3px solid #0ea5e9;border-radius:6px;">
      <div style="font-weight:600;font-size:15px;color:#0f172a;margin-bottom:2px;">${esc(item.headline)}</div>
      <div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:6px;">${esc(item.summary)}</div>
      ${renderSourceLink(item.source)}
      ${commentaryHtml}
      <div style="font-size:11px;color:#64748b;">
        <span><strong>Relevance:</strong> ${esc(item.relevance)}</span>
      </div>
    </div>`;
}

function renderOffDutyItem(item: IntelItem): string {
  const commentaryHtml = item.commentary
    ? `<div style="font-size:12px;color:#7c3aed;line-height:1.5;margin-bottom:6px;padding:6px 10px;background:#f5f3ff;border-radius:4px;font-style:italic;">${esc(item.commentary)}</div>`
    : "";
  return `
    <div style="margin-bottom:16px;padding:14px 16px;background:#fdf4ff;border-left:3px solid #a855f7;border-radius:6px;">
      <div style="font-weight:600;font-size:15px;color:#0f172a;margin-bottom:2px;">${esc(item.headline)}</div>
      <div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:6px;">${esc(item.summary)}</div>
      ${renderSourceLink(item.source)}
      ${commentaryHtml}
      <div style="font-size:11px;color:#64748b;">
        <span><strong>Why you care:</strong> ${esc(item.relevance)}</span>
      </div>
    </div>`;
}

function renderOffDutySection(items: IntelItem[]): string {
  if (!items || items.length === 0) return "";
  return `
    <div style="margin-top:32px;margin-bottom:28px;padding:20px;background:linear-gradient(135deg,#fdf4ff,#f0f9ff);border-radius:12px;border:1px solid #e9d5ff;">
      <h2 style="font-size:16px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #a855f7;padding-bottom:6px;margin-bottom:14px;">Off Duty</h2>
      <p style="font-size:12px;color:#6b7280;margin-bottom:14px;font-style:italic;">Off the clock. No KPIs, no class surveys, no billable hours.</p>
      ${items.map(renderOffDutyItem).join("")}
    </div>`;
}

function renderMarketPulseSection(entries: MarketPulseEntry[]): string {
  if (!entries || entries.length === 0) return "";
  const rows = entries.map((e) => {
    const change = e.change ?? "";
    const isPositive = change.startsWith("+");
    const isNegative = change.startsWith("-");
    const changeColor = isPositive ? "#16a34a" : isNegative ? "#dc2626" : "#64748b";
    return `
      <tr>
        <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">${esc(e.metric)}</td>
        <td style="padding:8px 12px;font-size:13px;color:#334155;border-bottom:1px solid #e2e8f0;text-align:right;">${esc(e.value)}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:600;color:${changeColor};border-bottom:1px solid #e2e8f0;text-align:right;">${esc(e.change)}</td>
        <td style="padding:8px 12px;font-size:11px;color:#94a3b8;border-bottom:1px solid #e2e8f0;text-align:right;">${esc(e.source)}</td>
      </tr>`;
  }).join("");

  return `
    <div style="margin-bottom:28px;">
      <h2 style="font-size:16px;font-weight:700;color:#0c4a6e;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #0ea5e9;padding-bottom:6px;margin-bottom:14px;">Market Pulse</h2>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#0c4a6e;">
            <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#ffffff;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Metric</th>
            <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#ffffff;text-align:right;text-transform:uppercase;letter-spacing:0.05em;">Value</th>
            <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#ffffff;text-align:right;text-transform:uppercase;letter-spacing:0.05em;">Change</th>
            <th style="padding:8px 12px;font-size:11px;font-weight:600;color:#ffffff;text-align:right;text-transform:uppercase;letter-spacing:0.05em;">Source</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderRegulatoryCountdown(entries: RegulatoryCountdownEntry[]): string {
  if (!entries || entries.length === 0) return "";
  const bars = entries.map((e) => {
    const daysLeft = e.daysLeft ?? 999;
    const urgency = daysLeft <= 30 ? "#dc2626" : daysLeft <= 90 ? "#f59e0b" : "#16a34a";
    const barWidth = Math.max(5, Math.min(100, 100 - (daysLeft / 365) * 100));
    return `
      <div style="margin-bottom:12px;padding:12px 14px;background:#f8fafc;border-radius:6px;border-left:4px solid ${urgency};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-weight:600;font-size:13px;color:#0f172a;">${esc(e.regulation)}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;font-weight:600;color:${urgency};background:${urgency}15;padding:2px 8px;border-radius:4px;">${daysLeft}d</span>
            <span style="font-size:11px;color:#64748b;">${esc(e.body)}</span>
          </div>
        </div>
        <div style="height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;margin-bottom:6px;">
          <div style="height:100%;width:${barWidth}%;background:${urgency};border-radius:2px;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;">
          <span>${esc(e.impact)}</span>
          <span style="font-weight:500;">${esc(e.deadline)}</span>
        </div>
      </div>`;
  }).join("");

  return `
    <div style="margin-bottom:28px;">
      <h2 style="font-size:16px;font-weight:700;color:#0c4a6e;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #0ea5e9;padding-bottom:6px;margin-bottom:14px;">Regulatory Countdown</h2>
      ${bars}
    </div>`;
}

function renderSafetyItem(item: IntelItem): string {
  const commentaryHtml = item.commentary
    ? `<div style="font-size:12px;color:#92400e;line-height:1.5;margin-bottom:6px;padding:6px 10px;background:#fef3c7;border-radius:4px;font-style:italic;"><strong>Risk Assessment:</strong> ${esc(item.commentary)}</div>`
    : "";
  return `
    <div style="margin-bottom:16px;padding:14px 16px;background:#fffbeb;border-left:3px solid #d97706;border-radius:6px;">
      <div style="font-weight:600;font-size:15px;color:#0f172a;margin-bottom:2px;">${esc(item.headline)}</div>
      <div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:6px;">${esc(item.summary)}</div>
      ${renderSourceLink(item.source)}
      ${commentaryHtml}
      <div style="font-size:11px;color:#64748b;">
        <span><strong>Risk:</strong> ${esc(item.relevance)}</span>
      </div>
    </div>`;
}

function renderSafetySection(items: IntelItem[]): string {
  if (!items || items.length === 0) return "";
  return `
    <div style="margin-bottom:28px;">
      <h2 style="font-size:16px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #d97706;padding-bottom:6px;margin-bottom:14px;">Safety &amp; Security</h2>
      <div style="padding:10px 14px;background:#fef3c7;border-radius:6px;margin-bottom:14px;font-size:12px;color:#92400e;font-weight:500;">
        Crew welfare &middot; Asset protection &middot; Operational risk intelligence
      </div>
      ${items.map(renderSafetyItem).join("")}
    </div>`;
}

function renderSection(title: string, items: IntelItem[]): string {
  if (!items || items.length === 0) return "";
  return `
    <div style="margin-bottom:28px;">
      <h2 style="font-size:16px;font-weight:700;color:#0c4a6e;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #0ea5e9;padding-bottom:6px;margin-bottom:14px;">${esc(title)}</h2>
      ${items.map(renderItem).join("")}
    </div>`;
}

function esc(str: string | undefined | null): string {
  const s = str ?? "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render a BriefPayload to a self-contained HTML document.
 * Pure function — no network calls, no side effects.
 */
export function renderBriefHtml(brief: BriefPayload): string {
  const date = new Date(brief.generatedAt).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const marketPulseHtml = brief.marketPulseSection ? renderMarketPulseSection(brief.marketPulseSection) : "";
  const regulatoryHtml = brief.regulatoryCountdown ? renderRegulatoryCountdown(brief.regulatoryCountdown) : "";
  const sectionsHtml = (brief.sections ?? []).map((s) => renderSection(s.title, s.items)).join("");
  const tenderHtml = brief.tenderSection ? renderSection("Tender Watch", brief.tenderSection) : "";
  const prospectHtml = brief.prospectSection ? renderSection("Client Prospects", brief.prospectSection) : "";
  const offDutyHtml = brief.offDutySection ? renderOffDutySection(brief.offDutySection) : "";
  const monthlyRollupHtml = brief.monthlyProspectRollup ? renderSection("Monthly Prospect Roll-up", brief.monthlyProspectRollup) : "";
  const competitorTrackerHtml = brief.competitorTrackerSection ? renderSection("Competitor Tracker", brief.competitorTrackerSection) : "";
  const safetyHtml = brief.safetySection ? renderSafetySection(brief.safetySection) : "";

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
      background: #ffffff;
      color: #0f172a;
      max-width: 680px;
      margin: 0 auto;
      padding: 32px 20px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="text-align:center;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #0ea5e9;">
    <div style="font-size:28px;font-weight:800;color:#0c4a6e;letter-spacing:0.04em;">IQsea</div>
    <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.12em;margin-top:2px;">Intelligence Brief</div>
  </div>

  <!-- Meta -->
  <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:28px;padding:12px 16px;background:#f0f9ff;border-radius:8px;font-size:13px;color:#334155;">
    <div><strong>Prepared for:</strong> ${esc(brief.subscriberName)}</div>
    <div><strong>Company:</strong> ${esc(brief.companyName)}</div>
    <div><strong>Date:</strong> ${date}</div>
  </div>

  <!-- Market Pulse -->
  ${marketPulseHtml}

  <!-- Regulatory Countdown -->
  ${regulatoryHtml}

  <!-- Safety & Security -->
  ${safetyHtml}

  <!-- Sections -->
  ${sectionsHtml}
  ${tenderHtml}
  ${prospectHtml}
  ${monthlyRollupHtml}
  ${competitorTrackerHtml}
  ${offDutyHtml}

  <!-- Analyst Note -->
  ${brief.analystNote ? `
  <div style="margin-top:28px;padding:16px;background:#fefce8;border-left:3px solid #eab308;border-radius:6px;">
    <div style="font-size:12px;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Chief Engineer's Note</div>
    <div style="font-size:14px;color:#422006;line-height:1.5;">${esc(brief.analystNote)}</div>
  </div>` : ""}

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
    Generated by IQsea Intel Engine &middot; Confidential &middot; ${date}
  </div>

  <!-- Print button (hidden on print) -->
  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:10px 28px;background:#0ea5e9;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;">
      Save as PDF
    </button>
  </div>
</body>
</html>`;
}

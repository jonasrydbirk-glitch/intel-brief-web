import { NextResponse } from "next/server";
import type { BriefPayload, IntelItem, MarketPulseEntry, RegulatoryCountdownEntry } from "@/engine/brief-generator";

// ---------------------------------------------------------------------------
// POST /api/print/generate-sample
//
// Accepts a BriefPayload JSON body and returns a self-contained HTML document
// styled as a high-fidelity, mobile-friendly IQsea branded PDF layout.
// The client can print-to-PDF or use window.print() for a pixel-perfect result.
// ---------------------------------------------------------------------------

function renderItem(item: IntelItem): string {
  return `
    <div style="margin-bottom:16px;padding:14px 16px;background:#f8fafc;border-left:3px solid #0ea5e9;border-radius:6px;">
      <div style="font-weight:600;font-size:15px;color:#0f172a;margin-bottom:4px;">${esc(item.headline)}</div>
      <div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:6px;">${esc(item.summary)}</div>
      <div style="display:flex;gap:16px;font-size:11px;color:#64748b;">
        <span><strong>Relevance:</strong> ${esc(item.relevance)}</span>
        <span><strong>Source:</strong> ${esc(item.source)}</span>
      </div>
    </div>`;
}

function renderOffDutyItem(item: IntelItem): string {
  return `
    <div style="margin-bottom:16px;padding:14px 16px;background:#fdf4ff;border-left:3px solid #a855f7;border-radius:6px;">
      <div style="font-weight:600;font-size:15px;color:#0f172a;margin-bottom:4px;">${esc(item.headline)}</div>
      <div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:6px;">${esc(item.summary)}</div>
      <div style="display:flex;gap:16px;font-size:11px;color:#64748b;">
        <span><strong>Why you care:</strong> ${esc(item.relevance)}</span>
        <span><strong>Source:</strong> ${esc(item.source)}</span>
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
    const isPositive = e.change.startsWith("+");
    const isNegative = e.change.startsWith("-");
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
    const urgency = e.daysLeft <= 30 ? "#dc2626" : e.daysLeft <= 90 ? "#f59e0b" : "#16a34a";
    const barWidth = Math.max(5, Math.min(100, 100 - (e.daysLeft / 365) * 100));
    return `
      <div style="margin-bottom:12px;padding:12px 14px;background:#f8fafc;border-radius:6px;border-left:4px solid ${urgency};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-weight:600;font-size:13px;color:#0f172a;">${esc(e.regulation)}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;font-weight:600;color:${urgency};background:${urgency}15;padding:2px 8px;border-radius:4px;">${e.daysLeft}d</span>
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
  return `
    <div style="margin-bottom:16px;padding:14px 16px;background:#fffbeb;border-left:3px solid #d97706;border-radius:6px;">
      <div style="font-weight:600;font-size:15px;color:#0f172a;margin-bottom:4px;">${esc(item.headline)}</div>
      <div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:6px;">${esc(item.summary)}</div>
      <div style="display:flex;gap:16px;font-size:11px;color:#64748b;">
        <span><strong>Risk:</strong> ${esc(item.relevance)}</span>
        <span><strong>Source:</strong> ${esc(item.source)}</span>
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

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBriefHtml(brief: BriefPayload): string {
  const date = new Date(brief.generatedAt).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const marketPulseHtml = brief.marketPulseSection ? renderMarketPulseSection(brief.marketPulseSection) : "";
  const regulatoryHtml = brief.regulatoryCountdown ? renderRegulatoryCountdown(brief.regulatoryCountdown) : "";
  const sectionsHtml = brief.sections.map((s) => renderSection(s.title, s.items)).join("");
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

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const brief: BriefPayload = await request.json();

    if (!brief.subscriberName || !brief.sections) {
      return NextResponse.json(
        { error: "Invalid brief payload — subscriberName and sections are required" },
        { status: 400 }
      );
    }

    const html = renderBriefHtml(brief);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET with sample data for quick testing
export async function GET() {
  const sampleBrief: BriefPayload = {
    subscriberId: "sub_demo0001",
    subscriberName: "Captain Demo",
    companyName: "Oceanic Fleet Ltd.",
    generatedAt: new Date().toISOString(),
    sections: [
      {
        title: "Regulatory & Classification",
        items: [
          {
            headline: "IMO MEPC 83 finalises CII correction factors",
            summary:
              "The Marine Environment Protection Committee has adopted revised CII correction factors for ice-class vessels and ships engaged in STS operations, effective January 2027.",
            relevance: "Direct impact on fleet CII ratings and operational planning",
            source: "IMO Circular",
          },
          {
            headline: "DNV updates rules for battery-hybrid installations",
            summary:
              "New class notation BATTERY(POWER) now requires enhanced thermal runaway barriers and independent fire suppression per module.",
            relevance: "Affects planned retrofit scope for hybrid-capable vessels",
            source: "DNV Rules Pt.6 Ch.2",
          },
        ],
      },
      {
        title: "Market & Operations",
        items: [
          {
            headline: "Suez Canal transit fees increase 5% from May",
            summary:
              "The Suez Canal Authority announced a 5% surcharge on laden tanker transits effective 1 May, citing infrastructure investment costs.",
            relevance: "Voyage cost modelling needs updating for MEG-UKC routes",
            source: "SCA Notice 3/2026",
          },
        ],
      },
    ],
    tenderSection: [
      {
        headline: "ADNOC LNG carrier newbuild tender — 6 units",
        summary:
          "ADNOC Logistics has issued an RFP for six 174k cbm LNG carriers with ME-GI propulsion. Bid deadline: 30 June 2026.",
        relevance: "Matches target vessel class and propulsion type",
        source: "TradeWinds",
      },
    ],
    prospectSection: null,
    marketPulseSection: [
      { metric: "VLSFO Singapore", value: "$587/mt", change: "+2.3% WoW", source: "Ship & Bunker" },
      { metric: "Baltic Dry Index", value: "1,842", change: "+67 pts", source: "Baltic Exchange" },
      { metric: "TC Rate Supramax", value: "$15,200/day", change: "-$400", source: "Clarksons" },
      { metric: "HSFO Rotterdam", value: "$412/mt", change: "+1.1% WoW", source: "Ship & Bunker" },
    ],
    regulatoryCountdown: [
      { regulation: "IMO DCS Data Submission", body: "IMO", deadline: "2026-03-31", daysLeft: 358, impact: "Fleet CII reports due — non-submission triggers flag state audit" },
      { regulation: "EU ETS Maritime Phase-in (40%)", body: "EU", deadline: "2026-01-01", daysLeft: 269, impact: "EUA allowance purchasing must begin for EU port calls" },
      { regulation: "USCG BWMS Compliance", body: "USCG", deadline: "2026-06-01", daysLeft: 55, impact: "All vessels calling US ports must have type-approved BWMS installed" },
    ],
    monthlyProspectRollup: null,
    offDutySection: [
      {
        headline: "Verstappen takes pole in Monaco qualifying chaos",
        summary:
          "Max Verstappen grabbed a dramatic pole position in a rain-soaked Monaco qualifying session, edging out Leclerc by just 0.03s as three cars hit the barriers in Q3.",
        relevance: "Your boy did it again — and in the wet, no less",
        source: "Formula1.com",
      },
      {
        headline: "Liverpool clinch late win at Anfield in title race thriller",
        summary:
          "Mo Salah's 89th-minute screamer sealed a 2-1 comeback win against Arsenal, keeping Liverpool's Premier League title hopes alive with three games to go.",
        relevance: "YNWA — nerves of steel from the Egyptian King",
        source: "BBC Sport",
      },
    ],
    competitorTrackerSection: null,
    safetySection: [
      {
        headline: "Armed boarding attempt reported 12nm south of Bab el-Mandeb",
        summary:
          "UKMTO confirmed an armed boarding attempt on a bulk carrier transiting the southern Red Sea. The vessel increased speed and the boarding party withdrew after 20 minutes. No crew injuries reported. Naval forces in the area have issued a warning to all commercial shipping to maintain maximum CPA from the Yemeni coast.",
        relevance: "Direct route exposure for any MEG-UKC transits — review armed guard provisions and citadel readiness",
        source: "UKMTO Advisory 003/2026",
      },
      {
        headline: "USCG issues Marine Safety Alert on lifeboat davit failures",
        summary:
          "Following two separate lifeboat davit wire failures during drills in the Gulf of Mexico, the USCG has issued MSA 02-26 requiring immediate inspection of all gravity davit wire falls manufactured before 2023. Affected wire types include galvanised and stainless steel falls from three major suppliers.",
        relevance: "Fleet-wide inspection required — check davit wire fall manufacture dates against MSA 02-26 scope",
        source: "USCG Marine Safety Alert 02-26",
      },
    ],
    analystNote:
      "The CII correction-factor update is the headline this cycle — fleets with ice-class or STS exposure should re-run their 2026 projections before Q3 reporting.",
  };

  const html = renderBriefHtml(sampleBrief);

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

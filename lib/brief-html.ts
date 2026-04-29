/**
 * IQsea Brief HTML Renderer — v2 Design
 *
 * Two-column premium header, card-based news items with Analyst Take /
 * Why It Matters columns, regulatory countdown with large teal countdown,
 * three-column branded footer.
 *
 * Serves both PDF (Puppeteer/Chromium) and email delivery.
 * All styles are inline; layout uses <table> for email client compat.
 */

import type {
  BriefPayload,
  IntelItem,
  MarketPulseEntry,
  RegulatoryCountdownEntry,
} from "@/engine/brief-generator";

// ---------------------------------------------------------------------------
// Colour palette
// ---------------------------------------------------------------------------
const C = {
  navy:        "#0B1F38",
  body:        "#1a2e45",
  charcoal:    "#1a1a2e",
  muted:       "#6b7280",
  faint:       "#9ca3af",
  teal:        "#2BB3CD",
  tealBg:      "#edf8fb",
  gold:        "#F4B400",
  border:      "#e5e7eb",
  borderMid:   "#cdd8e3",
  bg:          "#f8fafc",
  bgPage:      "#ffffff",
  bgNavy:      "#0B1F38",
  green:       "#16a34a",
  red:         "#dc2626",
  amber:       "#d97706",
  safeBg:      "#fffbeb",
  offDutyBg:   "#f5f0ff",
  offDutyAcc:  "#a855f7",
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

function renderSourceLink(source: string | undefined | null): string {
  if (!source?.trim()) return "";
  const s = source.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    return `<a href="${esc(s)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:${C.muted};font-style:italic;text-decoration:underline;white-space:nowrap;">source ↗</a>`;
  }
  return `<span style="font-size:11px;color:${C.muted};font-style:italic;">${esc(s)}</span>`;
}

function renderItemSource(item: IntelItem): string {
  const primary = item.source?.trim();
  const secondary = item.secondarySource?.trim();
  if (!primary) return "";
  const primaryHtml = renderSourceLink(primary);
  if (secondary) {
    const secondaryHtml = renderSourceLink(secondary);
    return `<span style="font-size:11px;color:${C.muted};">Sources: ${primaryHtml} &middot; ${secondaryHtml}</span>`;
  }
  return `<span style="font-size:11px;color:${C.muted};">Source: ${primaryHtml}</span>`;
}

/** Section heading: teal dot + uppercase letterspaced label + hairline rule. */
function sectionHeading(title: string, accentColor = C.teal): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
    <tr>
      <td style="border-bottom:1.5px solid ${accentColor};padding-bottom:7px;">
        <span style="display:inline-block;width:6px;height:6px;background:${accentColor};border-radius:50%;vertical-align:middle;margin-right:7px;"></span>
        <span style="font-size:10px;font-weight:700;color:${C.charcoal};text-transform:uppercase;letter-spacing:0.14em;vertical-align:middle;font-family:Inter,-apple-system,sans-serif;">${esc(title)}</span>
      </td>
    </tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// Page header (shared by daily + monthly)
// ---------------------------------------------------------------------------

function renderPageHeader(params: {
  briefType: string;
  dateLine: string;
  subscriberName: string;
  companyName?: string;
  depthBadge?: string;
}): string {
  const { briefType, dateLine, subscriberName, companyName, depthBadge } = params;

  const nameCompany = companyName
    ? `${esc(subscriberName)} &middot; ${esc(companyName)}`
    : esc(subscriberName);

  const badgeHtml = depthBadge
    ? `<div style="display:inline-block;margin-top:10px;background:rgba(255,255,255,0.12);color:#e8eef4;padding:3px 13px;border-radius:100px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;font-family:Inter,-apple-system,sans-serif;border:1px solid rgba(255,255,255,0.18);">${esc(depthBadge)}</div>`
    : "";

  // Sonar rings + ocean depth contour lines — futuristic marine texture
  const headerOverlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="position:absolute;inset:0;pointer-events:none;opacity:0.07;" preserveAspectRatio="xMidYMid meet">
    <!-- Sonar/radar concentric rings, anchored right-of-center -->
    <circle cx="72%" cy="50%" r="60"  fill="none" stroke="#2BB3CD" stroke-width="0.5"/>
    <circle cx="72%" cy="50%" r="110" fill="none" stroke="#2BB3CD" stroke-width="0.5"/>
    <circle cx="72%" cy="50%" r="165" fill="none" stroke="#2BB3CD" stroke-width="0.4"/>
    <circle cx="72%" cy="50%" r="220" fill="none" stroke="#2BB3CD" stroke-width="0.3"/>
    <circle cx="72%" cy="50%" r="278" fill="none" stroke="#2BB3CD" stroke-width="0.2"/>
    <!-- Ocean depth contour lines — wavy horizontals -->
    <path d="M0,30 Q120,22 240,33 T480,27 T720,34 T900,28"  fill="none" stroke="#2BB3CD" stroke-width="0.5"/>
    <path d="M0,65 Q100,57 220,68 T460,61 T700,70 T900,63"  fill="none" stroke="#2BB3CD" stroke-width="0.4"/>
    <path d="M0,100 Q130,108 260,98 T520,104 T780,96 T900,101" fill="none" stroke="#2BB3CD" stroke-width="0.35"/>
    <path d="M0,135 Q90,143 200,133 T440,140 T680,130 T900,137" fill="none" stroke="#2BB3CD" stroke-width="0.25"/>
    <!-- Chart marker dots -->
    <circle cx="28%" cy="32%" r="1.5" fill="#2BB3CD" opacity="0.5"/>
    <circle cx="52%" cy="68%" r="1"   fill="#2BB3CD" opacity="0.4"/>
    <circle cx="78%" cy="38%" r="1.5" fill="#2BB3CD" opacity="0.5"/>
    <circle cx="42%" cy="78%" r="1"   fill="#2BB3CD" opacity="0.35"/>
    <circle cx="63%" cy="22%" r="1"   fill="#2BB3CD" opacity="0.3"/>
  </svg>`;

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
    <tr>
      <td style="background:${C.bgNavy};padding:0;position:relative;overflow:hidden;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,0.04) 1px,transparent 0);background-size:24px 24px;">
        ${headerOverlaySvg}
        <table width="100%" cellpadding="0" cellspacing="0" style="position:relative;z-index:1;">
          <tr>
            <td style="padding:26px 20px 26px 32px;vertical-align:middle;" width="42%">
              <img src="https://iqsea.io/brand/logo-white-tagline.png" height="44" alt="IQSEA" style="display:block;max-width:210px;margin-bottom:7px;" />
              <div style="font-size:12px;color:#8fa8c4;font-family:Inter,-apple-system,sans-serif;letter-spacing:0.02em;">Your Maritime Edge.</div>
            </td>
            <td style="padding:26px 32px 26px 16px;text-align:right;vertical-align:middle;border-left:1px solid rgba(43,179,205,0.4);" width="58%">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.05em;text-transform:uppercase;font-style:normal;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.15;">${esc(briefType)}</div>
              <div style="font-size:13px;color:#8fa8c4;margin-top:7px;font-family:Inter,-apple-system,sans-serif;">${esc(dateLine)}</div>
              <div style="font-size:13px;color:#e8eef4;margin-top:3px;font-weight:600;font-family:Inter,-apple-system,sans-serif;">${nameCompany}</div>
              ${badgeHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="height:3px;background:${C.teal};"></td>
    </tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// Page footer (shared by daily + monthly)
// ---------------------------------------------------------------------------

function renderPageFooter(opts: {
  label: string;
  dateLine: string;
  subscriberId?: string;
  siteUrl?: string;
}): string {
  const { label, dateLine, subscriberId, siteUrl } = opts;
  const base = siteUrl ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://iqsea.io";
  const unsubHref = subscriberId
    ? `${base}/unsubscribe?sub=${encodeURIComponent(subscriberId)}`
    : `mailto:support@iqsea.io?subject=Unsubscribe`;

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px;border-top:1px solid ${C.border};padding-top:14px;">
    <tr>
      <td width="33%" style="vertical-align:middle;">
        <span style="font-size:12px;font-weight:800;color:${C.navy};letter-spacing:0.06em;font-family:Inter,-apple-system,sans-serif;">IQsea</span>
      </td>
      <td width="34%" style="text-align:center;vertical-align:middle;">
        <div style="font-size:10px;color:${C.muted};font-family:Inter,-apple-system,sans-serif;">Your Maritime Edge.</div>
        <div style="font-size:10px;color:${C.faint};margin-top:2px;font-family:Inter,-apple-system,sans-serif;">iqsea.io &middot; intelligence@iqsea.io</div>
      </td>
      <td width="33%" style="text-align:right;vertical-align:middle;">
        <div style="font-size:10px;color:${C.faint};font-weight:600;text-transform:uppercase;letter-spacing:0.08em;font-family:Inter,-apple-system,sans-serif;">Confidential</div>
        <div style="font-size:10px;color:${C.faint};margin-top:2px;font-family:Inter,-apple-system,sans-serif;">${esc(dateLine)}</div>
      </td>
    </tr>
  </table>
  <div style="margin-top:10px;text-align:center;">
    <a href="${esc(unsubHref)}" style="font-size:10px;color:${C.faint};text-decoration:underline;font-family:Inter,-apple-system,sans-serif;">Unsubscribe</a>
  </div>`;
}

// ---------------------------------------------------------------------------
// Rating buttons
// ---------------------------------------------------------------------------

function ratingButtons(briefJobId: string | undefined, subscriberId: string | undefined, label: string): string {
  if (!briefJobId || !subscriberId) return "";
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://iqsea.io";
  const base = `${siteUrl}/feedback?briefId=${encodeURIComponent(briefJobId)}&sub=${encodeURIComponent(subscriberId)}`;
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid ${C.border};padding-top:20px;border-collapse:collapse;">
    <tr>
      <td align="center" style="font-size:13px;color:${C.muted};padding-bottom:14px;font-family:Inter,-apple-system,sans-serif;">${label}</td>
    </tr>
    <tr>
      <td align="center">
        <a href="${base}&rating=good" style="display:inline-block;padding:9px 22px;margin:0 5px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:100px;font-size:13px;font-weight:600;font-family:Inter,-apple-system,sans-serif;">&#128077; Useful</a>
        <a href="${base}&rating=ok"   style="display:inline-block;padding:9px 22px;margin:0 5px;background:#64748b;color:#ffffff;text-decoration:none;border-radius:100px;font-size:13px;font-weight:600;font-family:Inter,-apple-system,sans-serif;">&#128528; OK</a>
        <a href="${base}&rating=bad"  style="display:inline-block;padding:9px 22px;margin:0 5px;background:${C.red};color:#ffffff;text-decoration:none;border-radius:100px;font-size:13px;font-weight:600;font-family:Inter,-apple-system,sans-serif;">&#128078; Not helpful</a>
      </td>
    </tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// News item rendering (depth-aware)
// ---------------------------------------------------------------------------

function renderItem(item: IntelItem, depth = "deep"): string {
  const sourceHtml = renderItemSource(item);

  // Data mode — minimal scannable list entry
  if (depth === "data") {
    return `<div style="padding:7px 0;border-bottom:1px solid ${C.border};">
      <span style="font-size:13px;font-weight:600;color:${C.navy};line-height:1.4;">${esc(item.headline)}</span>
      ${sourceHtml ? `&ensp;${sourceHtml}` : ""}
    </div>`;
  }

  const summaryHtml = item.summary?.trim()
    ? `<div style="font-size:13px;color:${C.body};line-height:1.65;margin-bottom:12px;">${esc(item.summary)}</div>`
    : "";

  // Stacked Analyst Take / Why It Matters (deep only)
  let insightHtml = "";
  if (depth === "deep") {
    const commentaryBlock = item.commentary?.trim()
      ? `<div style="margin-bottom:8px;padding:9px 12px;background:${C.tealBg};border-radius:4px;">
          <div style="font-size:9px;font-weight:700;color:${C.teal};text-transform:uppercase;letter-spacing:0.13em;margin-bottom:4px;font-family:Inter,-apple-system,sans-serif;">Analyst Take</div>
          <div style="font-size:12px;color:${C.body};line-height:1.6;">${esc(item.commentary)}</div>
        </div>`
      : "";
    const relevanceBlock = item.relevance?.trim()
      ? `<div style="margin-bottom:8px;padding:9px 12px;background:${C.bg};border:1px solid ${C.border};border-radius:4px;">
          <div style="font-size:9px;font-weight:700;color:${C.teal};text-transform:uppercase;letter-spacing:0.13em;margin-bottom:4px;font-family:Inter,-apple-system,sans-serif;">Why It Matters</div>
          <div style="font-size:12px;color:${C.body};line-height:1.6;">${esc(item.relevance)}</div>
        </div>`
      : "";
    insightHtml = commentaryBlock + relevanceBlock;
  } else if (depth === "executive" && item.commentary?.trim()) {
    insightHtml = `<div style="font-size:12px;color:${C.navy};font-style:italic;line-height:1.55;padding:6px 10px;background:${C.tealBg};border-left:2px solid ${C.teal};border-radius:0 4px 4px 0;margin-bottom:8px;"><strong style="font-style:normal;color:${C.teal};">Analyst take:</strong> ${esc(item.commentary)}</div>`;
  }

  const sourceRow = sourceHtml
    ? `<div style="margin-top:4px;">${sourceHtml}</div>`
    : "";

  const pad = depth === "executive" ? "12px 16px 10px" : "16px 18px 12px";
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${depth === "executive" ? "10px" : "16px"};background:${C.bg};border:1px solid ${C.border};border-left:3px solid ${C.teal};border-radius:6px;overflow:hidden;">
    <tr>
      <td style="padding:${pad};">
        <div style="font-size:${depth === "executive" ? "14px" : "15px"};font-weight:700;color:${C.navy};line-height:1.35;margin-bottom:${summaryHtml ? "7px" : "2px"};font-family:Inter,-apple-system,sans-serif;">${esc(item.headline)}</div>
        ${summaryHtml}
        ${insightHtml}
        ${sourceRow}
      </td>
    </tr>
  </table>`;
}

function renderProspectItem(item: IntelItem, depth = "deep"): string {
  if (depth === "data") {
    return `<div style="padding:7px 0;border-bottom:1px solid ${C.border};">
      <span style="font-size:13px;font-weight:600;color:${C.navy};line-height:1.4;">${esc(item.headline)}</span>
    </div>`;
  }

  const summaryHtml = item.summary?.trim()
    ? `<div style="font-size:13px;color:${C.body};line-height:1.65;margin-bottom:8px;">${esc(item.summary)}</div>`
    : "";

  const fitHtml = item.commentary?.trim()
    ? `<div style="font-size:12px;color:${C.navy};line-height:1.55;padding:7px 10px;background:${C.tealBg};border-left:2px solid ${C.teal};border-radius:0 4px 4px 0;margin-bottom:7px;font-style:italic;"><strong style="font-style:normal;color:${C.teal};">Fit assessment:</strong> ${esc(item.commentary)}</div>`
    : "";

  const relevanceHtml = depth === "deep" && item.relevance?.trim()
    ? `<div style="font-size:11px;color:${C.muted};margin-top:4px;"><strong>Fit:</strong> ${esc(item.relevance)}</div>`
    : "";

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${depth === "executive" ? "10px" : "14px"};background:${C.bg};border:1px solid ${C.border};border-radius:6px;overflow:hidden;">
    <tr>
      <td style="padding:${depth === "executive" ? "12px 16px 10px" : "14px 16px 12px"};">
        <div style="font-size:14px;font-weight:700;color:${C.navy};line-height:1.35;margin-bottom:5px;font-family:Inter,-apple-system,sans-serif;">${esc(item.headline)}</div>
        ${summaryHtml}
        ${fitHtml}
        ${relevanceHtml}
      </td>
    </tr>
  </table>`;
}

function renderOffDutyItem(item: IntelItem, depth = "deep"): string {
  const sourceHtml = renderItemSource(item);
  if (depth === "data") {
    return `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid ${C.border};">
      <span style="font-size:13px;font-weight:600;color:${C.navy};flex:1;">${esc(item.headline)}</span>
      ${sourceHtml ? `<span style="flex-shrink:0;">${sourceHtml}</span>` : ""}
    </div>`;
  }
  const summaryHtml = item.summary?.trim()
    ? `<div style="font-size:13px;color:${C.body};line-height:1.65;margin-bottom:12px;">${esc(item.summary)}</div>`
    : "";
  let insightHtml = "";
  if (depth === "deep") {
    const commentaryBlock = item.commentary?.trim()
      ? `<div style="margin-bottom:8px;padding:9px 12px;background:${C.tealBg};border-radius:4px;">
          <div style="font-size:9px;font-weight:700;color:${C.teal};text-transform:uppercase;letter-spacing:0.13em;margin-bottom:4px;font-family:Inter,-apple-system,sans-serif;">Analyst Take</div>
          <div style="font-size:12px;color:${C.body};line-height:1.6;">${esc(item.commentary)}</div>
        </div>`
      : "";
    const relevanceBlock = item.relevance?.trim()
      ? `<div style="margin-bottom:8px;padding:9px 12px;background:${C.bg};border:1px solid ${C.border};border-radius:4px;">
          <div style="font-size:9px;font-weight:700;color:${C.teal};text-transform:uppercase;letter-spacing:0.13em;margin-bottom:4px;font-family:Inter,-apple-system,sans-serif;">Why It Matters</div>
          <div style="font-size:12px;color:${C.body};line-height:1.6;">${esc(item.relevance)}</div>
        </div>`
      : "";
    insightHtml = commentaryBlock + relevanceBlock;
  } else if (item.commentary?.trim()) {
    insightHtml = `<div style="font-size:12px;color:#6d28d9;line-height:1.5;padding:7px 10px;background:#f5f3ff;border-radius:4px;margin-bottom:7px;font-style:italic;">${esc(item.commentary)}</div>`;
  }
  const sourceRow = sourceHtml ? `<div style="margin-top:6px;">${sourceHtml}</div>` : "";
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;background:${C.offDutyBg};border:1px solid #e9d5ff;border-left:3px solid ${C.teal};border-radius:6px;overflow:hidden;">
    <tr>
      <td style="padding:12px 14px;">
        <div style="font-size:14px;font-weight:700;color:${C.navy};line-height:1.35;margin-bottom:5px;font-family:Inter,-apple-system,sans-serif;">${esc(item.headline)}</div>
        ${summaryHtml}${insightHtml}${sourceRow}
      </td>
    </tr>
  </table>`;
}

function renderSafetyItem(item: IntelItem, depth = "deep"): string {
  const sourceHtml = renderItemSource(item);
  if (depth === "data") {
    return `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid ${C.border};">
      <span style="font-size:13px;font-weight:600;color:${C.navy};flex:1;">${esc(item.headline)}</span>
      ${sourceHtml ? `<span style="flex-shrink:0;">${sourceHtml}</span>` : ""}
    </div>`;
  }
  const summaryHtml = item.summary?.trim()
    ? `<div style="font-size:13px;color:${C.body};line-height:1.65;margin-bottom:12px;">${esc(item.summary)}</div>`
    : "";
  let insightHtml = "";
  if (depth === "deep") {
    const commentaryBlock = item.commentary?.trim()
      ? `<div style="margin-bottom:8px;padding:9px 12px;background:${C.tealBg};border-radius:4px;">
          <div style="font-size:9px;font-weight:700;color:${C.teal};text-transform:uppercase;letter-spacing:0.13em;margin-bottom:4px;font-family:Inter,-apple-system,sans-serif;">Analyst Take</div>
          <div style="font-size:12px;color:${C.body};line-height:1.6;">${esc(item.commentary)}</div>
        </div>`
      : "";
    const relevanceBlock = item.relevance?.trim()
      ? `<div style="margin-bottom:8px;padding:9px 12px;background:${C.bg};border:1px solid ${C.border};border-radius:4px;">
          <div style="font-size:9px;font-weight:700;color:${C.teal};text-transform:uppercase;letter-spacing:0.13em;margin-bottom:4px;font-family:Inter,-apple-system,sans-serif;">Why It Matters</div>
          <div style="font-size:12px;color:${C.body};line-height:1.6;">${esc(item.relevance)}</div>
        </div>`
      : "";
    insightHtml = commentaryBlock + relevanceBlock;
  } else if (item.commentary?.trim()) {
    insightHtml = `<div style="font-size:12px;color:#92400e;line-height:1.5;padding:7px 10px;background:#fef3c7;border-radius:4px;margin-bottom:7px;font-style:italic;"><strong style="font-style:normal;">Risk assessment:</strong> ${esc(item.commentary)}</div>`;
  }
  const sourceRow = sourceHtml ? `<div style="margin-top:6px;">${sourceHtml}</div>` : "";
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;background:${C.safeBg};border:1px solid #fde68a;border-left:3px solid ${C.teal};border-radius:6px;overflow:hidden;">
    <tr>
      <td style="padding:12px 14px;">
        <div style="font-size:14px;font-weight:700;color:${C.navy};line-height:1.35;margin-bottom:5px;font-family:Inter,-apple-system,sans-serif;">${esc(item.headline)}</div>
        ${summaryHtml}${insightHtml}${sourceRow}
      </td>
    </tr>
  </table>`;
}

// ---------------------------------------------------------------------------
// Section containers
// ---------------------------------------------------------------------------

function renderSection(title: string, items: IntelItem[], depth = "deep"): string {
  if (!items?.length) return "";
  return `<div style="margin-bottom:28px;">
    ${sectionHeading(title)}
    ${items.map((item) => renderItem(item, depth)).join("")}
  </div>`;
}

function renderProspectSection(items: IntelItem[], depth = "deep"): string {
  if (!items?.length) return "";
  return `<div style="margin-bottom:28px;">
    ${sectionHeading("Client Prospects")}
    ${items.map((item) => renderProspectItem(item, depth)).join("")}
  </div>`;
}

function renderOffDutySection(items: IntelItem[], depth = "deep"): string {
  if (!items?.length) return "";
  return `<div style="margin-bottom:28px;margin-top:32px;padding:20px;background:linear-gradient(135deg,#fdf4ff,#f0f9ff);border-radius:10px;border:1px solid #e9d5ff;">
    ${sectionHeading("Off Duty", C.offDutyAcc)}
    <p style="font-size:12px;color:${C.muted};margin-bottom:14px;font-style:italic;">Off the clock. No KPIs, no surveys, no billable hours.</p>
    ${items.map((item) => renderOffDutyItem(item, depth)).join("")}
  </div>`;
}

function renderSafetySection(items: IntelItem[], depth = "deep"): string {
  if (!items?.length) return "";
  return `<div style="margin-bottom:28px;">
    ${sectionHeading("Safety &amp; Security", C.amber)}
    <div style="padding:8px 12px;background:#fef3c7;border-radius:5px;margin-bottom:12px;font-size:11px;color:#92400e;font-weight:500;font-family:Inter,-apple-system,sans-serif;">
      Crew welfare &middot; Asset protection &middot; Operational risk intelligence
    </div>
    ${items.map((item) => renderSafetyItem(item, depth)).join("")}
  </div>`;
}

// ---------------------------------------------------------------------------
// Market Pulse table
// ---------------------------------------------------------------------------

function renderMarketPulseSection(entries: MarketPulseEntry[], depth = "deep"): string {
  if (!entries?.length) return "";

  const rows = entries
    .map((e) => {
      const change = e.change ?? "";
      const isPositive = /^\+/.test(change) || /\bup\b/i.test(change);
      const isNegative = /^-/.test(change) || /\bdown\b/i.test(change);
      const changeColor = isPositive ? C.green : isNegative ? C.red : C.muted;
      const sourceTd = depth !== "data"
        ? `<td style="padding:7px 8px;font-size:11px;color:${C.muted};font-style:italic;border-bottom:1px solid ${C.border};text-align:right;">${esc(e.source)}</td>`
        : "";
      return `<tr>
        <td style="padding:7px 8px;font-size:12px;font-weight:600;color:${C.navy};border-bottom:1px solid ${C.border};font-family:Inter,-apple-system,sans-serif;">${esc(e.metric)}</td>
        <td style="padding:7px 8px;font-size:12px;color:${C.body};border-bottom:1px solid ${C.border};text-align:right;font-family:'JetBrains Mono','SF Mono',Consolas,monospace;font-variant-numeric:tabular-nums;">${esc(e.value)}</td>
        <td style="padding:7px 8px;font-size:12px;font-weight:700;color:${changeColor};border-bottom:1px solid ${C.border};text-align:right;font-family:'JetBrains Mono','SF Mono',Consolas,monospace;">${esc(change)}</td>
        ${sourceTd}
      </tr>`;
    })
    .join("");

  const sourceHeader = depth !== "data"
    ? `<th style="padding:6px 8px;font-size:9px;font-weight:700;color:${C.muted};text-align:right;text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Source</th>`
    : "";

  return `<div style="margin-bottom:28px;">
    ${sectionHeading("Market Pulse")}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.bg};border:1px solid ${C.border};border-radius:6px;overflow:hidden;">
      <thead>
        <tr style="background:#f0f9fb;border-bottom:2px solid ${C.teal};">
          <th style="padding:7px 8px;font-size:9px;font-weight:700;color:${C.muted};text-align:left;text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Metric</th>
          <th style="padding:7px 8px;font-size:9px;font-weight:700;color:${C.muted};text-align:right;text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Value</th>
          <th style="padding:7px 8px;font-size:9px;font-weight:700;color:${C.muted};text-align:right;text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Change</th>
          ${sourceHeader}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ---------------------------------------------------------------------------
// Regulatory Countdown — 2-column card layout
// ---------------------------------------------------------------------------

function renderRegulatoryCountdown(entries: RegulatoryCountdownEntry[]): string {
  if (!entries?.length) return "";

  const cards = entries
    .map((e) => {
      const daysLeft = e.daysLeft ?? 999;
      const urgency = daysLeft <= 30 ? C.red : daysLeft <= 90 ? C.amber : C.teal;

      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;background:${C.bg};border:1px solid ${C.border};border-left:3px solid ${C.teal};border-radius:6px;overflow:hidden;">
        <tr>
          <td style="padding:14px 16px;vertical-align:middle;" width="75%">
            <div style="font-size:14px;font-weight:700;color:${C.navy};line-height:1.35;margin-bottom:6px;font-family:Inter,-apple-system,sans-serif;">${esc(e.regulation)}</div>
            <div style="font-size:12px;color:${C.body};line-height:1.55;">${esc(e.impact)}</div>
          </td>
          <td style="padding:14px 16px;text-align:center;vertical-align:middle;border-left:1px solid ${C.border};" width="25%">
            <div style="font-size:30px;font-weight:800;color:${urgency};line-height:1;font-family:Inter,-apple-system,sans-serif;">${daysLeft}d</div>
            <div style="font-size:10px;color:${C.muted};margin-top:4px;font-family:Inter,-apple-system,sans-serif;">${esc(e.body)}</div>
            <div style="font-size:10px;color:${C.muted};font-weight:600;margin-top:3px;font-family:Inter,-apple-system,sans-serif;">${esc(e.deadline)}</div>
          </td>
        </tr>
      </table>`;
    })
    .join("");

  return `<div style="margin-bottom:28px;">
    ${sectionHeading("Regulatory Countdown")}
    ${cards}
  </div>`;
}

// ---------------------------------------------------------------------------
// Monthly Brief — helper sections (lead + tender rollups, market trends)
// ---------------------------------------------------------------------------

function renderLeadRollup(items: IntelItem[]): string {
  if (!items?.length) return "";
  const rows = items.map((item) => {
    const sourceCell = item.source?.startsWith("http")
      ? `<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:${C.teal};text-decoration:underline;">source ↗</a>`
      : `<span style="font-size:11px;color:${C.muted};">${esc(item.source || "—")}</span>`;
    return `<tr>
      <td style="padding:7px 8px;font-size:12px;font-weight:600;color:${C.navy};border-bottom:1px solid ${C.border};font-family:Inter,-apple-system,sans-serif;">${esc(item.headline)}</td>
      <td style="padding:7px 8px;font-size:12px;color:${C.muted};border-bottom:1px solid ${C.border};white-space:nowrap;">${esc(item.commentary || "—")}</td>
      <td style="padding:7px 8px;font-size:12px;color:${C.body};border-bottom:1px solid ${C.border};">${esc(item.summary || "—")}</td>
      <td style="padding:7px 8px;border-bottom:1px solid ${C.border};">${sourceCell}</td>
    </tr>`;
  }).join("");
  return `<div style="margin-bottom:28px;">
    ${sectionHeading("30-Day Lead Rollup", "#16a34a")}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.bg};border:1px solid ${C.border};border-radius:6px;overflow:hidden;">
      <thead>
        <tr style="background:#f0fdf4;border-bottom:2px solid #16a34a;">
          <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Company</th>
          <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Date</th>
          <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Fit Assessment</th>
          <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Source</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderTenderRollup(items: IntelItem[]): string {
  if (!items?.length) return "";
  const rows = items.map((item) => {
    const sourceCell = item.source?.startsWith("http")
      ? `<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:${C.teal};text-decoration:underline;">source ↗</a>`
      : `<span style="font-size:11px;color:${C.muted};">${esc(item.source || "—")}</span>`;
    return `<tr>
      <td style="padding:7px 8px;font-size:12px;font-weight:600;color:${C.navy};border-bottom:1px solid ${C.border};font-family:Inter,-apple-system,sans-serif;">${esc(item.headline)}</td>
      <td style="padding:7px 8px;font-size:12px;color:${C.body};border-bottom:1px solid ${C.border};">${esc(item.summary || "—")}</td>
      <td style="padding:7px 8px;border-bottom:1px solid ${C.border};">${sourceCell}</td>
    </tr>`;
  }).join("");
  return `<div style="margin-bottom:28px;">
    ${sectionHeading("30-Day Tender Rollup", C.amber)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.bg};border:1px solid ${C.border};border-radius:6px;overflow:hidden;">
      <thead>
        <tr style="background:#fffbeb;border-bottom:2px solid ${C.amber};">
          <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Tender / Contract</th>
          <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Region &middot; Deadline &middot; Details</th>
          <th style="text-align:left;padding:8px;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Source</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderMonthlyMarketTrends(entries: MarketPulseEntry[]): string {
  if (!entries?.length) return "";
  const rows = entries.map((e) => {
    const change   = e.change?.trim() || "—";
    const isPos    = /^\+/.test(change) || /up|rise|increas/i.test(change);
    const isNeg    = /^-/.test(change) || /down|fall|declin/i.test(change);
    const chgColor = isPos ? C.green : isNeg ? C.red : C.muted;
    return `<tr>
      <td style="padding:7px 8px;font-size:12px;font-weight:500;color:${C.navy};border-bottom:1px solid ${C.border};font-family:Inter,-apple-system,sans-serif;">${esc(e.metric)}</td>
      <td style="padding:7px 8px;font-size:12px;color:${C.body};border-bottom:1px solid ${C.border};text-align:right;font-family:'JetBrains Mono','SF Mono',Consolas,monospace;">${esc(e.value)}</td>
      <td style="padding:7px 8px;font-size:11px;color:${chgColor};font-weight:700;border-bottom:1px solid ${C.border};text-align:right;font-family:'JetBrains Mono','SF Mono',Consolas,monospace;">${esc(change)}</td>
      <td style="padding:7px 8px;font-size:11px;color:${C.muted};border-bottom:1px solid ${C.border};text-align:right;font-style:italic;">${esc(e.source)}</td>
    </tr>`;
  }).join("");
  return `<div style="margin-bottom:28px;">
    ${sectionHeading("Monthly Market Trends", C.teal)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.bg};border:1px solid ${C.border};border-radius:6px;overflow:hidden;">
      <thead>
        <tr style="background:#f0f9fb;border-bottom:2px solid ${C.teal};">
          <th style="padding:7px 8px;text-align:left;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Metric</th>
          <th style="padding:7px 8px;text-align:right;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Current</th>
          <th style="padding:7px 8px;text-align:right;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">MoM Trend</th>
          <th style="padding:7px 8px;text-align:right;font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.1em;font-family:Inter,-apple-system,sans-serif;">Source</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ---------------------------------------------------------------------------
// Monthly Strategic Review
// ---------------------------------------------------------------------------

export function renderMonthlyBriefHtml(
  brief: BriefPayload,
  opts?: { briefJobId?: string; subscriberId?: string; siteUrl?: string }
): string {
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

  const sectionsHtml = (brief.sections ?? []).map((s) => {
    if (!s.items?.length) return "";
    const items = s.items.map((item) => {
      const sourceLink = item.source?.startsWith("http")
        ? `&ensp;<a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:${C.teal};text-decoration:underline;">source ↗</a>`
        : "";
      return `<div style="padding:7px 0 7px 12px;border-left:2px solid ${C.teal};margin-bottom:6px;line-height:1.45;">
        <span style="font-size:13px;font-weight:700;color:${C.navy};font-family:Inter,-apple-system,sans-serif;">${esc(item.headline)}.</span>${item.summary?.trim() ? `&ensp;<span style="font-size:13px;color:${C.body};">${esc(item.summary)}</span>` : ""}${sourceLink}
      </div>`;
    }).join("");
    return `<div style="margin-bottom:24px;">
      ${sectionHeading(s.title, C.teal)}
      ${items}
    </div>`;
  }).join("");

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
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: ${C.bgPage};
      color: ${C.body};
      max-width: 720px;
      margin: 0 auto;
      padding: 0 0 36px;
      line-height: 1.5;
    }
    .content-pad { padding: 0 28px; }
  </style>
</head>
<body>

${renderPageHeader({
  briefType: "MONTHLY CATCH-UP",
  dateLine: periodLabel,
  subscriberName: brief.subscriberName,
  companyName: brief.companyName,
})}

<div class="content-pad" style="padding-top:28px;">

${sectionsHtml}

${renderLeadRollup(brief.prospectSection ?? [])}

${renderTenderRollup(brief.tenderSection ?? [])}

${renderMonthlyMarketTrends(brief.marketPulseSection ?? [])}

${ratingButtons(opts?.briefJobId, opts?.subscriberId, "How was this month&apos;s review?")}

${renderPageFooter({
  label: "Monthly Catch-Up",
  dateLine: `Generated ${generatedDate}`,
  subscriberId: opts?.subscriberId,
  siteUrl: opts?.siteUrl,
})}

<div class="no-print" style="text-align:center;margin-top:20px;">
  <button onclick="window.print()" style="padding:9px 24px;background:${C.teal};color:#fff;border:none;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,-apple-system,sans-serif;">Save as PDF</button>
</div>

</div><!-- end content-pad -->
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main export — Daily Brief
// ---------------------------------------------------------------------------

export function renderBriefHtml(
  brief: BriefPayload,
  depth?: "executive" | "deep" | "data",
  opts?: { briefJobId?: string; subscriberId?: string; siteUrl?: string }
): string {
  const effectiveDepth = depth ?? brief.depth ?? "deep";

  const date = new Date(brief.generatedAt).toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const depthLabel =
    effectiveDepth === "executive" ? "Executive Summary" :
    effectiveDepth === "data"      ? "Weekly Digest"     :
    "Deep Dive";

  const marketPulseHtml       = brief.marketPulseSection      ? renderMarketPulseSection(brief.marketPulseSection, effectiveDepth) : "";
  const regulatoryHtml        = brief.regulatoryCountdown     ? renderRegulatoryCountdown(brief.regulatoryCountdown) : "";
  const sectionsHtml          = (brief.sections ?? []).map((s) => renderSection(s.title, s.items, effectiveDepth)).join("");
  const tenderHtml            = brief.tenderSection           ? renderSection("Tender Watch", brief.tenderSection, effectiveDepth) : "";
  const prospectHtml          = brief.prospectSection         ? renderProspectSection(brief.prospectSection, effectiveDepth) : "";
  const offDutyHtml           = brief.offDutySection          ? renderOffDutySection(brief.offDutySection, effectiveDepth) : "";
  const monthlyRollupHtml     = brief.monthlyProspectRollup   ? renderSection("Monthly Prospect Roll-up", brief.monthlyProspectRollup, effectiveDepth) : "";
  const competitorTrackerHtml = brief.competitorTrackerSection ? renderSection("Competitor Tracker", brief.competitorTrackerSection, effectiveDepth) : "";
  const safetyHtml            = brief.safetySection           ? renderSafetySection(brief.safetySection, effectiveDepth) : "";

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
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: ${C.bgPage};
      color: ${C.body};
      max-width: 720px;
      margin: 0 auto;
      padding: 0 0 36px;
      line-height: 1.5;
    }
    .content-pad { padding: 0 28px; }
  </style>
</head>
<body>

${renderPageHeader({
  briefType: "INTELLIGENCE BRIEF",
  dateLine: date,
  subscriberName: brief.subscriberName,
  companyName: brief.companyName,
  depthBadge: depthLabel,
})}

<div class="content-pad" style="padding-top:28px;">

${marketPulseHtml}

${regulatoryHtml}

${safetyHtml}

${sectionsHtml}
${tenderHtml}
${competitorTrackerHtml}
${prospectHtml}
${monthlyRollupHtml}
${offDutyHtml}

${brief.analystNote?.trim() ? `
<div style="margin-top:24px;padding:14px 16px;background:#fffcec;border-left:3px solid ${C.gold};border-radius:0 5px 5px 0;">
  <div style="font-size:10px;font-weight:700;color:${C.navy};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;font-family:Inter,-apple-system,sans-serif;">IQsea Intelligence Perspective</div>
  <div style="font-size:13px;color:${C.body};line-height:1.55;">${esc(brief.analystNote)}</div>
</div>` : ""}

${ratingButtons(opts?.briefJobId, opts?.subscriberId, "How was today&apos;s brief?")}

${renderPageFooter({
  label: "Intelligence Brief",
  dateLine: date,
  subscriberId: opts?.subscriberId,
  siteUrl: opts?.siteUrl,
})}

<div class="no-print" style="text-align:center;margin-top:20px;">
  <button onclick="window.print()" style="padding:9px 24px;background:${C.teal};color:#fff;border:none;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,-apple-system,sans-serif;">Save as PDF</button>
</div>

</div><!-- end content-pad -->
</body>
</html>`;
}

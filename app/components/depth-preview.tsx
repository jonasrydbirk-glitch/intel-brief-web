"use client";

/**
 * DepthPreview — inline sample story preview for the depth selector.
 *
 * Shows a hardcoded maritime story rendered exactly as it would appear in
 * an actual brief, for whichever depth mode is currently selected. Updates
 * live when the user switches depth. Fades in on change.
 *
 * Colors mirror lib/brief-html.ts for pixel-accurate visual fidelity.
 */

// ---------------------------------------------------------------------------
// Colour palette — mirrors lib/brief-html.ts exactly
// ---------------------------------------------------------------------------
const NAVY  = "#0b1424";
const BODY  = "#374151";
const MUTED = "#6b7280";
const FAINT = "#9ca3af";
const TEAL  = "#53b1c1";
const BG    = "#f9fafb";
const BORDER = "#e5e7eb";

// ---------------------------------------------------------------------------
// Hardcoded sample story
// ---------------------------------------------------------------------------
const SAMPLE = {
  headline:
    "Maersk Launches New Mediterranean Service Loop with Methanol-Ready Fleet",

  /** Executive-mode summary — 1 concise sentence, as the AI would generate. */
  execSummary:
    "New weekly Med-to-North Europe service starts Q3 2026 with six 15,000 TEU methanol dual-fuel vessels targeting FuelEU Maritime compliance.",

  /** Deep-mode summary — 2-3 sentences of full context. */
  deepSummary:
    "A.P. Moller-Maersk has confirmed a new weekly Mediterranean-to-North Europe service loop starting Q3 2026, deploying six 15,000 TEU methanol dual-fuel vessels on the route. The move targets growing intra-European demand and positions Maersk ahead of FuelEU Maritime compliance deadlines.",

  /** Weekly Digest — ~100-word narrative paragraph, maritime journalist voice. */
  weeklyDigestSummary:
    "A.P. Moller-Maersk has announced a new weekly Mediterranean-to-North Europe service loop launching Q3 2026, deploying six methanol dual-fuel vessels of 15,000 TEU capacity. The loop connects Valencia, Barcelona, and Genoa directly to Rotterdam, Hamburg, and Antwerp — filling a gap in carbon-neutral capacity on one of Europe's busiest trade lanes. Maersk cited accelerating FuelEU Maritime deadlines and rising shipper demand for scope-3 emissions documentation as core drivers. The vessels are already on order with Hyundai Heavy Industries, delivering from April 2026. Analysts call it the most significant Mediterranean green capacity move since CMA CGM's Normandie conversion.",

  quote:
    "This positions us to capture growing demand for sustainable shipping solutions in the Med-North corridor.",

  commentary:
    "The deployment of methanol-capable tonnage on this route signals Maersk's confidence in Mediterranean trade growth. With FuelEU Maritime enforcement starting January 2027, early movers on green corridors gain a structural advantage in contract negotiations with cargo owners prioritizing scope-3 emissions reduction.",

  relevance:
    "Directly relevant to European container trade, dual-fuel vessel investment, and green shipping regulation compliance.",

  primary:   { name: "Container News", url: "https://container-news.com/maersk-med-service-loop" },
  secondary: { name: "TradeWinds",     url: "https://www.tradewindsnews.com/containers/maersk-new-med-loop/2-1-1975000" },
};

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function SourceLink({ name, url }: { name: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ fontSize: 11, color: FAINT, textDecoration: "underline", whiteSpace: "nowrap" }}
    >
      {name}&nbsp;↗
    </a>
  );
}

function SourcesLine() {
  return (
    <span style={{ fontSize: 11, color: FAINT }}>
      Sources:&nbsp;
      <SourceLink name={SAMPLE.primary.name} url={SAMPLE.primary.url} />
      &nbsp;&middot;&nbsp;
      <SourceLink name={SAMPLE.secondary.name} url={SAMPLE.secondary.url} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Per-depth preview layouts
// ---------------------------------------------------------------------------

function ExecutivePreview() {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: BG,
        borderRadius: 5,
        borderLeft: `2px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: NAVY,
          lineHeight: 1.35,
          marginBottom: 4,
        }}
      >
        {SAMPLE.headline}
      </div>
      <div
        style={{
          fontSize: 13,
          color: BODY,
          lineHeight: 1.55,
          marginBottom: 7,
        }}
      >
        {SAMPLE.execSummary}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <SourcesLine />
      </div>
    </div>
  );
}

function DeepDivePreview() {
  return (
    <div
      style={{
        padding: "13px 14px",
        background: BG,
        borderRadius: 5,
        borderLeft: `2px solid ${BORDER}`,
      }}
    >
      {/* Headline */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: NAVY,
          lineHeight: 1.35,
          marginBottom: 5,
        }}
      >
        {SAMPLE.headline}
      </div>

      {/* Summary */}
      <div
        style={{
          fontSize: 13,
          color: BODY,
          lineHeight: 1.55,
          marginBottom: 7,
        }}
      >
        {SAMPLE.deepSummary}
      </div>

      {/* Sources */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 7 }}>
        <SourcesLine />
      </div>

      {/* Pull-quote */}
      <blockquote
        style={{
          margin: "0 0 7px",
          padding: "6px 10px",
          borderLeft: `2px solid ${TEAL}`,
          background: BG,
          borderRadius: "0 4px 4px 0",
          fontSize: 12,
          color: BODY,
          fontStyle: "italic",
          lineHeight: 1.5,
        }}
      >
        &ldquo;{SAMPLE.quote}&rdquo;
      </blockquote>

      {/* Analyst take */}
      <div
        style={{
          fontSize: 12,
          color: "#1e40af",
          lineHeight: 1.5,
          padding: "7px 10px",
          background: "#eff6ff",
          borderRadius: 4,
          fontStyle: "italic",
          marginBottom: 7,
        }}
      >
        <strong style={{ fontStyle: "normal" }}>Analyst take:</strong>{" "}
        {SAMPLE.commentary}
      </div>

      {/* Relevance */}
      <div style={{ fontSize: 11, color: MUTED }}>
        <strong>Why it matters:</strong> {SAMPLE.relevance}
      </div>
    </div>
  );
}

function WeeklyDigestPreview() {
  return (
    <div
      style={{
        padding: "20px 22px",
        background: "#f8fafc",
        borderRadius: 8,
        borderLeft: `3px solid ${TEAL}`,
      }}
    >
      {/* Headline */}
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: NAVY,
          lineHeight: 1.3,
          marginBottom: 14,
        }}
      >
        {SAMPLE.headline}
      </div>

      {/* Narrative summary */}
      <div
        style={{
          fontSize: 14,
          color: BODY,
          lineHeight: 1.7,
          marginBottom: 14,
        }}
      >
        {SAMPLE.weeklyDigestSummary}
      </div>

      {/* Analyst commentary box */}
      <div
        style={{
          fontSize: 13,
          color: BODY,
          fontStyle: "italic",
          lineHeight: 1.6,
          padding: "12px 16px",
          background: "#f0f9fa",
          borderLeft: `2px solid ${TEAL}`,
          borderRadius: "0 4px 4px 0",
          marginBottom: 14,
        }}
      >
        {SAMPLE.commentary}
      </div>

      {/* Why it matters */}
      <div
        style={{
          fontSize: 13,
          color: BODY,
          lineHeight: 1.6,
          marginBottom: 12,
        }}
      >
        <strong style={{ color: NAVY }}>Why it matters:</strong>{" "}
        {SAMPLE.relevance}
      </div>

      {/* Source links */}
      <SourcesLine />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

interface DepthPreviewProps {
  /** Current depth value from parent state. Falls back to "deep" if unset. */
  depth: string;
}

export function DepthPreview({ depth }: DepthPreviewProps) {
  const effective = depth || "deep";

  const label =
    effective === "executive"
      ? "Executive Summary"
      : effective === "data"
      ? "Weekly Digest"
      : "Deep Dive";

  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        overflow: "hidden",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: `1px solid ${BORDER}`,
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: TEAL,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Preview
        </span>
        <span style={{ fontSize: 11, color: MUTED }}>
          — how a story looks in{" "}
          <strong style={{ color: NAVY }}>{label}</strong>
        </span>
      </div>

      {/* Animated content — key forces re-mount (and re-animation) on depth change */}
      <div
        key={effective}
        style={{
          padding: "14px",
          background: "#ffffff",
          animation: "iqseaDepthFadeIn 0.2s ease-out both",
        }}
      >
        {effective === "executive" && <ExecutivePreview />}
        {effective === "deep"      && <DeepDivePreview />}
        {effective === "data"      && <WeeklyDigestPreview />}
      </div>

      {/* Keyframe definition — scoped to this component instance */}
      <style>{`
        @keyframes iqseaDepthFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}

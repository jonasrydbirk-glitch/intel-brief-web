import { NextResponse } from "next/server";
import type { BriefPayload } from "@/engine/brief-generator";
import { renderBriefHtml } from "@/lib/brief-html";

// ---------------------------------------------------------------------------
// POST /api/print/generate-sample
//
// Accepts a BriefPayload JSON body and returns a self-contained HTML document
// styled as a high-fidelity, mobile-friendly IQsea branded PDF layout.
// HTML rendering is delegated to the shared lib/brief-html module.
// ---------------------------------------------------------------------------

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

    const html = renderBriefHtml(brief, brief.depth);

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
            commentary: "Fleets with ice-class or STS exposure need to re-run 2026 projections before Q3 reporting. This changes the math on borderline C-rated vessels.",
            relevance: "Direct impact on fleet CII ratings and operational planning",
            source: "IMO Circular",
          },
          {
            headline: "DNV updates rules for battery-hybrid installations",
            summary:
              "New class notation BATTERY(POWER) now requires enhanced thermal runaway barriers and independent fire suppression per module.",
            commentary: "Your battery-hybrid retrofit scope just got bigger. Budget another $200k per vessel for the enhanced thermal barriers.",
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
            commentary: "Update your voyage cost models for MEG-UKC routes. On a laden VLCC transit, this adds roughly $15-20k per passage.",
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
        commentary: "If you're chasing ME-GI work, move now — bid window closes in 45 days. This is a sizeable package with repeat-order potential.",
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
          "Max Verstappen grabbed pole position in a rain-soaked Monaco qualifying session, edging out Leclerc by 0.03s as three cars hit the barriers in Q3.",
        commentary: "In the wet, at Monaco, by three hundredths. The man is not human.",
        relevance: "Your boy did it again — and in the wet, no less",
        source: "Formula1.com",
      },
      {
        headline: "Liverpool clinch late win at Anfield in title race thriller",
        summary:
          "Mo Salah's 89th-minute goal sealed a 2-1 comeback win against Arsenal, keeping Liverpool's Premier League title hopes alive with three games to go.",
        commentary: "Nerves of steel from the Egyptian King. Three games left, destiny in their own hands.",
        relevance: "YNWA — this title race is going to the wire",
        source: "BBC Sport",
      },
    ],
    competitorTrackerSection: null,
    safetySection: [
      {
        headline: "Armed boarding attempt reported 12nm south of Bab el-Mandeb",
        summary:
          "UKMTO confirmed an armed boarding attempt on a bulk carrier transiting the southern Red Sea. The vessel increased speed and the boarding party withdrew after 20 minutes. No crew injuries reported.",
        commentary: "Direct route exposure for any MEG-UKC transits. Review armed guard provisions and citadel readiness before the next Red Sea passage.",
        relevance: "Affects all vessels transiting the southern Red Sea corridor",
        source: "UKMTO Advisory 003/2026",
      },
      {
        headline: "USCG issues Marine Safety Alert on lifeboat davit failures",
        summary:
          "Following two separate lifeboat davit wire failures during drills in the Gulf of Mexico, the USCG has issued MSA 02-26 requiring immediate inspection of all gravity davit wire falls manufactured before 2023.",
        commentary: "Fleet-wide inspection required. Check davit wire fall manufacture dates against MSA 02-26 scope — non-compliance will trigger PSC detention.",
        relevance: "Applies to all vessels with gravity davits calling US ports",
        source: "USCG Marine Safety Alert 02-26",
      },
    ],
    analystNote:
      "The CII correction-factor update is the headline this cycle — fleets with ice-class or STS exposure should re-run their 2026 projections before Q3 reporting.",
  };

  const html = renderBriefHtml(sampleBrief, "deep");

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

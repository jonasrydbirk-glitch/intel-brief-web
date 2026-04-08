/**
 * IQsea Intel Engine — Brief Generator (Phase 1 Local PoC)
 *
 * Pipeline:  Scout (Minimax M1) -> Architect (Claude Sonnet 4.6) -> Scribe (JSON formatter)
 *
 * Usage:
 *   npx tsx engine/brief-generator.ts <subscriber_id>
 */

// dotenv is loaded conditionally in CLI mode only — Next.js handles env natively
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { stripEmojis, sanitiseItem, safeParseJSON } from "@/lib/json-utils";

// ---------------------------------------------------------------------------
// Raw-dump logger — writes first 500 chars of AI response to warden.log
// ---------------------------------------------------------------------------

const ENGINE_LOG_PATH = path.join(__dirname, "warden.log");

function dumpRaw(stage: string, raw: string): void {
  const ts = new Date().toISOString();
  const preview = (raw ?? "(null/undefined)").substring(0, 500).replace(/\n/g, "\\n");
  const line = `[${ts}] [DEBUG] ${stage} raw response (first 500 chars): ${preview}\n`;
  try {
    fs.appendFileSync(ENGINE_LOG_PATH, line, "utf-8");
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// Config (reads from env — provide via .env or shell)
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase credentials. Set SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env or environment."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubscriberProfile {
  id: string;
  fullName: string;
  companyName: string;
  role: string;
  assets: string[];
  subjects: string[];
  modules: {
    tender: { enabled: boolean; region?: string; type?: string };
    prospects: {
      enabled: boolean;
      perReport?: number;
      focusAreas?: string;
    };
    offDuty: {
      enabled: boolean;
      interests?: string;
    };
    marketPulse: {
      enabled: boolean;
      dataToTrack?: string;
    };
    regulatoryTimeline: {
      enabled: boolean;
      regulations?: string;
    };
    monthlyProspectRollup: {
      enabled: boolean;
    };
    competitorTracker: {
      enabled: boolean;
      companies?: string;
    };
    vesselArrivals: {
      enabled: boolean;
      port?: string;
      vesselType?: string;
      timeframe?: string;
    };
    safety: {
      enabled: boolean;
      areas?: string;
    };
  };
  frequency: string;
  depth: string;
}

export interface ScoutResult {
  queries: string[];
  rawFindings: string[];
}

export interface IntelItem {
  headline: string;
  summary: string;
  commentary: string;
  relevance: string;
  source: string;
}

export interface MarketPulseEntry {
  metric: string;
  value: string;
  change: string;
  source: string;
}

export interface RegulatoryCountdownEntry {
  regulation: string;
  body: string;
  deadline: string;
  daysLeft: number;
  impact: string;
}

export interface BriefPayload {
  subscriberId: string;
  subscriberName: string;
  companyName: string;
  generatedAt: string;
  sections: {
    title: string;
    items: IntelItem[];
  }[];
  tenderSection: IntelItem[] | null;
  prospectSection: IntelItem[] | null;
  offDutySection: IntelItem[] | null;
  marketPulseSection: MarketPulseEntry[] | null;
  regulatoryCountdown: RegulatoryCountdownEntry[] | null;
  monthlyProspectRollup: IntelItem[] | null;
  competitorTrackerSection: IntelItem[] | null;
  safetySection: IntelItem[] | null;
  analystNote: string;
}

// ---------------------------------------------------------------------------
// Stage 1 — Scout (Minimax M1): generate search queries from subjects
// ---------------------------------------------------------------------------

export async function scoutStage(
  profile: SubscriberProfile
): Promise<ScoutResult> {
  const subjectList = profile.subjects.join(", ");
  const assetList = profile.assets.join(", ");

  // Frequency-aware freshness: adjust search window based on delivery cadence
  const freshnessWindow = (() => {
    switch (profile.frequency) {
      case "weekly":
        return { hours: "168", label: "the last 7 days" };
      case "3x":
        return { hours: "72", label: "the last 48-72 hours" };
      case "business":
        return { hours: "48", label: "the last 24-48 hours" };
      case "daily":
      default:
        return { hours: "24", label: "the last 24 hours" };
    }
  })();

  const todayISO = new Date().toISOString().slice(0, 10); // e.g. "2026-04-07"

  const systemPrompt = `You are a maritime intelligence research scout. Your job is to generate precise, high-yield search queries for a daily intelligence brief.

TODAY'S DATE: ${todayISO}

FRESHNESS RULES (STRICT):
- Every query you generate MUST include a time qualifier such as "published in ${freshnessWindow.label}", "today ${todayISO}", or yesterday's/today's date.
- Prioritise breaking news and developments from ${freshnessWindow.label} only.
- Quality over quantity: focus on the top 3-5 high-impact stories rather than a long list of weak signals.
- Do NOT generate queries for background reading or evergreen content.`;

  const prospectInstructions = profile.modules.prospects.enabled
    ? `\n\nClient Prospect Queries (REQUIRED — generate 2-3 additional queries):
The subscriber needs leads on potential maritime clients. Search for companies that match:
- Focus areas: ${profile.modules.prospects.focusAreas || "companies relevant to subscriber's role"}
- Look for: new fleet expansions, companies announcing maritime projects, shipowners seeking ${profile.role}-related services, RFQs, partnership announcements, and companies entering markets aligned with the subscriber's expertise.
- Think about who would hire or contract ${profile.companyName} based on their role as ${profile.role}.`
    : "";

  const offDutyInstructions = profile.modules.offDuty?.enabled && profile.modules.offDuty.interests
    ? `\n\nOff-Duty / Personal Interest Queries (REQUIRED — generate 1-2 fun queries):
The subscriber wants a light personal section on their hobbies and interests.
Topics: ${profile.modules.offDuty.interests}
- Search for the latest news, results, highlights, or fun facts about these topics from ${freshnessWindow.label}.
- Keep it fun and upbeat — this is NOT work intel, it's a personal treat at the end of the brief.`
    : "";

  const marketPulseInstructions = profile.modules.marketPulse?.enabled
    ? `\n\nMarket Pulse Queries (REQUIRED — generate 2-3 market data queries):
The subscriber wants live market data tracking.
Data points to track: ${profile.modules.marketPulse.dataToTrack || "bunker prices, freight indexes, key maritime rates"}
- Search for the latest values, movements, and changes in these market indicators from ${freshnessWindow.label}.
- Focus on price movements, index changes, and rate fluctuations.`
    : "";

  const regulatoryInstructions = profile.modules.regulatoryTimeline?.enabled
    ? `\n\nRegulatory Timeline Queries (REQUIRED — generate 1-2 regulatory queries):
The subscriber wants countdown tracking for upcoming regulatory deadlines.
Bodies to track: IMO, USCG, EU, DNV
${profile.modules.regulatoryTimeline.regulations ? `Specific regulations to focus on: ${profile.modules.regulatoryTimeline.regulations}\n- Prioritise searching for deadlines and updates related to these specific regulations.` : "- Search for upcoming regulation deadlines, enforcement dates, and compliance windows from these bodies."}
- Focus on deadlines within the next 6-12 months that affect maritime operations.`
    : "";

  const competitorTrackerInstructions = profile.modules.competitorTracker?.enabled && profile.modules.competitorTracker.companies
    ? `\n\nCompetitor Tracker Queries (REQUIRED — generate 2-3 competitor intelligence queries):
The subscriber wants to monitor specific companies for press releases, fleet movements, contract wins, executive changes, and industry news.
Companies to track: ${profile.modules.competitorTracker.companies}
- Search for the latest news, press releases, and announcements from these companies from ${freshnessWindow.label}.
- Look for fleet orders, contract wins, partnership announcements, leadership changes, and strategic moves.
- Focus on actionable competitive intelligence — what are these companies doing that affects the subscriber's market position?`
    : "";

  const safetyInstructions = profile.modules.safety?.enabled
    ? `\n\nSafety Intelligence Queries (REQUIRED — generate 2-3 safety/security queries):
The subscriber wants maritime safety and security intelligence.
${profile.modules.safety.areas ? `Specific areas to track: ${profile.modules.safety.areas}` : "General maritime safety — piracy alerts, port security incidents, crew safety bulletins, cargo handling incidents, SOLAS compliance."}
- Search for the latest safety incidents, security advisories, piracy reports, crew welfare updates, and technical safety bulletins from ${freshnessWindow.label}.
- Focus on incidents affecting vessel operations, crew safety, and asset protection.
- Include port state control detentions, casualty investigation reports, and safety equipment recalls if relevant.`
    : "";

  const userPrompt = `Generate 4-6 targeted search queries for the following subscriber profile:

Role: ${profile.role}
Company: ${profile.companyName}
Subjects of interest: ${subjectList}
Assets/vessels: ${assetList}
Depth preference: ${profile.depth}

IMPORTANT: Append "published in ${freshnessWindow.label}" or today's date to every query. Focus only on ${freshnessWindow.label} of maritime news, regulatory changes, port updates, and industry movements. Aim for the top 3-5 highest-impact stories — skip low-signal noise.${prospectInstructions}${offDutyInstructions}${marketPulseInstructions}${regulatoryInstructions}${competitorTrackerInstructions}${safetyInstructions}

Return a JSON object with a single key "queries" containing an array of query strings.`;

  // Call Minimax M1 via OpenRouter
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "minimax/minimax-m1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Scout (Minimax M1) request failed: ${response.status} — ${text}`);
  }

  const data = await response.json();
  const content: string =
    data.choices?.[0]?.message?.content ?? "{}";

  // Raw dump for debugging — see what the Scout AI actually returned
  dumpRaw("Scout", content);

  // safeParseJSON now handles fence-stripping, brace extraction, and empty input
  const parsed = safeParseJSON<{ queries?: string[] }>(content);
  if (parsed.queries && parsed.queries.length > 0) {
    return { queries: parsed.queries, rawFindings: [] };
  }

  // Fallback: if JSON parse returned no queries, extract lines as queries
  const lines = content
    .split("\n")
    .map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter((l: string) => l.length > 10);
  return { queries: lines, rawFindings: [] };
}

// ---------------------------------------------------------------------------
// Stage 2 — Architect (Claude Sonnet 4.6): synthesise raw data through
//           the "Marine Engineer" analytical lens
// ---------------------------------------------------------------------------

export async function architectStage(
  profile: SubscriberProfile,
  scout: ScoutResult
): Promise<BriefPayload> {
  const todayISO = new Date().toISOString().slice(0, 10); // e.g. "2026-04-07"

  const systemPrompt = `You are IQsea's Architect — the Chief Engineer of maritime intelligence. You are the technical heart and soul of this brief. You know what keeps ships running, what breaks them, what costs real money, and what's coming down the pipe that nobody's talking about yet. You think in drydock windows, class survey cycles, fuel-system transitions, and operational risk.

TODAY'S DATE: ${todayISO}
Use this date for "generatedAt" (as a full ISO-8601 timestamp) and for calculating "daysLeft" in regulatory countdowns.

═══════════════════════════════════════════════════════════════════
SOURCE INTEGRITY RULES (ABSOLUTE, NON-NEGOTIABLE — READ FIRST)
═══════════════════════════════════════════════════════════════════

You are an INTELLIGENCE REPORTER, not a storyteller. Your job is to relay verified facts, not to craft narratives.

1 STORY = 1 SOURCE. This is the cardinal rule.
- Every news item MUST come from exactly ONE identifiable source article or publication.
- Do NOT merge, blend, or "puzzle together" details from multiple stories into a single item. If two things happened, they are two separate items.
- Do NOT synthesise narratives by connecting dots between separate events. Report each event as its own item, sourced individually.
- If you cannot attribute an item to a specific, real source, SKIP IT ENTIRELY. Do not fabricate or guess sources.

HEADLINE + SUMMARY = OBJECTIVE NEWS REPORTING ONLY.
- The "headline" must be a factual news headline — what happened, stated plainly.
- The "summary" must be a factual account of what the source reports. No opinion. No interpretation. No "this means..." or "this signals..." in the summary.
- Think wire service style: Reuters, Lloyd's List, TradeWinds. Just the facts.

ALL OPINION GOES IN "commentary" (MANDATORY SEPARATION).
- The "commentary" field is where the Marine Engineer speaks. This is where you put: "So what?", cost implications, operational impact, schedule risk, what the subscriber should do about it.
- This separation is non-negotiable. The reader must be able to distinguish reported fact from expert analysis at a glance.

SOURCE FIELD = SPECIFIC PUBLICATION NAME (AND URL IF KNOWN).
- "source" must name the actual publication: "Lloyd's List", "TradeWinds", "Splash247", "IMO Circular MEPC.1/Circ.XXX", "Reuters", etc.
- NEVER use vague attributions like "various sources", "industry reports", "market sources", or "trade press".
- If you do not know the specific source, DO NOT INCLUDE THE ITEM.

═══════════════════════════════════════════════════════════════════

KEEP IT BRIEF (ABSOLUTE, NON-NEGOTIABLE):
- MAXIMUM 3 news items per section. No exceptions. Three tight, high-impact items beat five mediocre ones.
- Summaries: 2 sentences max per item. Lead with the key fact, follow with a supporting detail. Cut everything else.
- Commentary: 1-2 sentences max. The Marine Engineer's sharp take on what this means for the subscriber.
- The entire JSON response must stay compact. If in doubt, cut. Brevity is a hard constraint — exceeding it risks truncation.

FRESHNESS GATE (STRICT):
- Only include stories from the last 48 hours. Reject anything older than 3 days unless it is a major ongoing regulatory shift (e.g. new IMO regulation, classification society rule change).
- Quality over quantity: include the top 3 high-impact items per section. Cut filler ruthlessly.
- If a story is borderline stale, kill it. Short and punchy wins.

BUYER SENTIMENT (when freight rates are high):
- If any freight rate or charter rate data suggests elevated or rising markets, include a "Buyer Sentiment" note within relevant sections analysing how OEMs (shipbuilders, engine makers) and service providers (yards, class societies, equipment suppliers) are likely responding.
- Flag whether high rates are driving newbuild orders, retrofit demand, or service backlogs — and what that means for the subscriber's operations, procurement timeline, or yard slot availability.

EMOJI POLICY — ZERO EMOJIS (ABSOLUTE, NON-NEGOTIABLE):
- NO emojis anywhere in the brief. Not in headlines. Not in summaries. Not in commentary. Not in relevance notes. Not in the analyst note. Not in market pulse. Not in regulatory countdown. Not hidden in Unicode. Not as bullet decorators. NONE. ZERO.
- Do NOT use emoji-like Unicode symbols (arrows, checkmarks, warning signs, etc.) as decorators. Use plain text.
- The Off-Duty section has its own tone rules (see below) but even there, keep emojis to an absolute minimum — one or two at most if truly warranted, never as structural formatting.
- Violation of this rule degrades the brief's credibility. Treat it as a hard constraint.

Writing style rules (STRICT):
- "headline" and "summary": neutral, factual, wire-service tone. No voice, no personality, no opinion.
- "commentary": direct, operational, professional maritime English. Dense with facts, light on filler. This is where the Chief Engineer voice lives.
- No corporate jargon. No management-speak. No buzzwords. No hedge-fund analyst prose.
- BAD summary: "This signals a paradigm shift in the dual-fuel transition landscape."
- GOOD summary: "HD Hyundai announced a $1.2B order for 8 LNG-fuelled VLCCs from Qatar Energy, with delivery slots in 2028-2029."
- BAD commentary: "This could potentially impact stakeholder alignment across the value chain."
- GOOD commentary: "If you're chasing ME-GI work, move now — bid window closes in 45 days. Yard slots in South Korea are filling fast."
- Use specific numbers, dates, and deadlines wherever possible. Vague is useless.
- Relevance notes should be one sharp sentence connecting the story to the subscriber's operations, not a generic restatement of the headline.

FORMATTING RULES:
- Headlines: factual, concise, no clickbait, no emojis, no decorative punctuation.
- Summaries: 2 sentences max. Objective facts only.
- Commentary: 1-2 sentences. The Marine Engineer's operational take — costs, risks, actions.
- Sources: cite the actual publication or body by name. Never "various sources" or "industry reports".
- Analyst Note: write like you're briefing a superintendent over coffee — direct, specific, no fluff. One to two sentences that tell the subscriber what to do or watch this cycle.

Always return valid JSON matching the BriefPayload schema.`;

  const userPrompt = `Subscriber profile:
- Name: ${profile.fullName}
- Company: ${profile.companyName}
- Role: ${profile.role}
- Subjects: ${profile.subjects.join(", ")}
- Assets: ${profile.assets.join(", ")}
- Depth: ${profile.depth}

Scout queries generated:
${scout.queries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Raw findings (if any):
${scout.rawFindings.length > 0 ? scout.rawFindings.join("\n---\n") : "(No raw data yet — generate plausible intel items based on the queries and current maritime landscape.)"}

Tender module enabled: ${profile.modules.tender.enabled}${profile.modules.tender.enabled ? ` — Region: ${profile.modules.tender.region}, Type: ${profile.modules.tender.type}` : ""}
Prospects module enabled: ${profile.modules.prospects.enabled}${profile.modules.prospects.enabled ? ` — Focus: ${profile.modules.prospects.focusAreas || "companies relevant to subscriber role"}, Generate exactly: ${profile.modules.prospects.perReport || 3} prospects` : ""}
${profile.modules.prospects.enabled ? `
CLIENT PROSPECTS INSTRUCTIONS (REQUIRED when prospects module is enabled):
You MUST populate "prospectSection" with exactly ${profile.modules.prospects.perReport || 3} prospect items. Each prospect is a real or plausible company that could be a client for ${profile.companyName}.
For each prospect:
- "headline": Company name and what they do (e.g. "Torm A/S — MR tanker fleet expansion")
- "summary": Factual: what was announced or reported about this company (objective facts only)
- "commentary": Marine Engineer's take: why this company is a good lead and how it connects to the subscriber's services
- "relevance": One line on why this is a fit for ${profile.companyName} specifically
- "source": Specific publication name where this lead was found
Focus areas: ${profile.modules.prospects.focusAreas || "companies that would hire or contract " + profile.companyName + " based on their role as " + profile.role}
Do NOT return an empty array or null for prospectSection when this module is enabled.` : ""}
${profile.modules.offDuty?.enabled && profile.modules.offDuty.interests ? `
OFF-DUTY SECTION INSTRUCTIONS (REQUIRED when off-duty module is enabled):
You MUST populate "offDutySection" with 2-3 items about the subscriber's personal interests.
Topics: ${profile.modules.offDuty.interests}
TONE SHIFT (CRITICAL): For this section ONLY, drop the Chief Engineer lens. Switch to dry, cheeky, and slightly sardonic — like a sharp mate who follows the same stuff and has opinions. Think pub banter, not morning TV. Deadpan humour over enthusiasm. A well-placed jab is worth more than three exclamation marks.
- Keep it tight. No gushing, no breathless fandom prose.
- One or two emojis MAX across the entire section if they genuinely land. Zero is also fine. Do not use emojis as bullet points or structural decoration.
For each item:
- "headline": Short, punchy, slightly wry (e.g. "Verstappen wins in Monaco — in the wet, because of course he does")
- "summary": What happened — the facts, stated with personality.
- "commentary": The cheeky take, the colour, the opinion.
- "relevance": One cheeky line on why the subscriber cares (fan perspective, not business)
- "source": The news source
Do NOT return an empty array or null for offDutySection when this module is enabled.` : ""}
${profile.modules.marketPulse?.enabled ? `
MARKET PULSE INSTRUCTIONS (REQUIRED when market pulse module is enabled):
You MUST populate "marketPulseSection" with 3-6 market data entries.
Data to track: ${profile.modules.marketPulse.dataToTrack || "bunker prices, freight indexes, key maritime rates"}
For each entry:
- "metric": The name of the metric (e.g. "VLSFO Singapore", "Baltic Dry Index", "TC Rate Supramax")
- "value": Current value with units (e.g. "$587/mt", "1,842", "$15,200/day")
- "change": Direction and magnitude (e.g. "+2.3% WoW", "-$12/mt", "Flat")
- "source": Data source (e.g. "Ship & Bunker", "Baltic Exchange")
Do NOT return null for marketPulseSection when this module is enabled. NO EMOJIS.` : ""}
${profile.modules.regulatoryTimeline?.enabled ? `
REGULATORY COUNTDOWN INSTRUCTIONS (REQUIRED when regulatory timeline module is enabled):
${profile.modules.regulatoryTimeline.regulations ? `The subscriber is specifically tracking: ${profile.modules.regulatoryTimeline.regulations}\nPrioritise these regulations in your countdown entries.` : ""}
You MUST populate "regulatoryCountdown" with 3-5 upcoming regulatory deadlines from IMO, USCG, EU, and/or DNV.
For each entry:
- "regulation": Short name (e.g. "IMO DCS Data Submission", "EU ETS Phase-in", "USCG BWMS Compliance")
- "body": Issuing body (e.g. "IMO", "EU", "USCG", "DNV")
- "deadline": Date string (e.g. "2026-03-31", "2027-01-01")
- "daysLeft": Integer — approximate days until deadline from today
- "impact": One-line impact statement for the subscriber (e.g. "Fleet CII reports due — non-submission triggers flag state audit")
Do NOT return null for regulatoryCountdown when this module is enabled. NO EMOJIS.` : ""}
${profile.modules.monthlyProspectRollup?.enabled ? `
MONTHLY PROSPECT ROLL-UP INSTRUCTIONS (when triggered for monthly report):
If this is a monthly report generation, populate "monthlyProspectRollup" with a summary of historical prospect data — up to 10 of the highest-fit prospects surfaced over the past month, ranked by relevance and engagement potential.
For each item:
- "headline": Company name and what they do
- "summary": Cumulative intelligence — what was surfaced across the month and why they remain a strong lead
- "relevance": Fit score rationale for ${profile.companyName}
- "source": Aggregated sources
If this is NOT a monthly report, set "monthlyProspectRollup" to null.` : ""}
${profile.modules.competitorTracker?.enabled && profile.modules.competitorTracker.companies ? `
COMPETITOR TRACKER INSTRUCTIONS (REQUIRED when competitor tracker module is enabled):
You MUST populate "competitorTrackerSection" with 2-4 intelligence items about the tracked companies.
Companies to monitor: ${profile.modules.competitorTracker.companies}
For each item:
- "headline": Company name + what happened (e.g. "Maersk — orders 6 methanol-fuelled feeders from Hyundai Mipo")
- "summary": Factual: what happened, stated objectively. No interpretation.
- "commentary": Marine Engineer's competitive analysis — what's the operational, technical, or commercial implication? What does this signal about their strategy?
- "relevance": One sharp line on what this means for ${profile.companyName} specifically — threat, opportunity, or market signal
- "source": Specific publication or company release name
Do NOT return null or an empty array for competitorTrackerSection when this module is enabled. NO EMOJIS.` : ""}
${profile.modules.safety?.enabled ? `
SAFETY INTELLIGENCE INSTRUCTIONS (REQUIRED when safety module is enabled):
You MUST populate "safetySection" with 2-4 safety and security intelligence items.
${profile.modules.safety.areas ? `Specific areas to track: ${profile.modules.safety.areas}` : "General maritime safety — piracy alerts, port security incidents, crew safety bulletins, cargo handling incidents."}
Apply the "Chief Engineer" lens: focus on crew welfare and asset protection. Every item must answer "What's the risk to my crew, my vessel, or my operations?"
For each item:
- "headline": Factual, concise — what happened or what changed (e.g. "Armed boarding attempt reported off Bab el-Mandeb strait")
- "summary": Factual: what happened, where, when. Include specific coordinates, vessel types, or regulatory references where available. No interpretation.
- "commentary": Marine Engineer's risk assessment — what's the operational implication for crew safety, asset protection, or scheduling?
- "relevance": One sharp line connecting this to crew safety, asset protection, or operational risk for ${profile.companyName}
- "source": The reporting body or publication (e.g. "IMB Piracy Reporting Centre", "USCG Marine Safety Alert", "MAIB Report")
Do NOT return null or an empty array for safetySection when this module is enabled. NO EMOJIS.` : ""}

Produce the intelligence brief as a JSON object with this exact shape:
{
  "subscriberId": "${profile.id}",
  "subscriberName": "${profile.fullName}",
  "companyName": "${profile.companyName}",
  "generatedAt": "<ISO timestamp>",
  "sections": [
    { "title": "<section name>", "items": [{ "headline": "...", "summary": "...", "commentary": "...", "relevance": "...", "source": "..." }] }
  ],
  "tenderSection": <array of items or null>,
  "prospectSection": ${profile.modules.prospects.enabled ? "<REQUIRED array of " + (profile.modules.prospects.perReport || 3) + " prospect items — NOT null>" : "<null>"},
  "offDutySection": ${profile.modules.offDuty?.enabled ? "<REQUIRED array of 2-3 fun items — NOT null>" : "<null>"},
  "marketPulseSection": ${profile.modules.marketPulse?.enabled ? "<REQUIRED array of 3-6 market data entries — NOT null>" : "<null>"},
  "regulatoryCountdown": ${profile.modules.regulatoryTimeline?.enabled ? "<REQUIRED array of 3-5 regulatory deadline entries — NOT null>" : "<null>"},
  "monthlyProspectRollup": ${profile.modules.monthlyProspectRollup?.enabled ? "<array of up to 10 prospect summaries if monthly, else null>" : "<null>"},
  "competitorTrackerSection": ${profile.modules.competitorTracker?.enabled ? "<REQUIRED array of 2-4 competitor intelligence items — NOT null>" : "<null>"},
  "safetySection": ${profile.modules.safety?.enabled ? "<REQUIRED array of 2-4 safety & security intelligence items — NOT null>" : "<null>"},
  "analystNote": "<Chief Engineer's take: 1-2 sentences on the strategic impact of today's top items. Be direct and specific — say what it means for this subscriber's operations, costs, or schedule. No jargon, no fluff, NO EMOJIS. Write like you're briefing a superintendent over coffee.>"
}`;

  // Call Claude Sonnet via OpenRouter (OpenAI-compatible format)
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-6",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Architect (Claude Sonnet 4.6) request failed: ${response.status} — ${text}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;

  // OpenRouter may return content as an array of blocks (Claude native format)
  // instead of a plain string. Extract the text from the first text block.
  const raw: string =
    typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? (rawContent.find((b: { type: string; text?: string }) => b.type === "text")?.text ?? "{}")
        : "{}";

  // Raw dump for debugging — see what the Architect AI actually returned
  dumpRaw("Architect", raw);

  // Check for truncation — OpenRouter sets finish_reason to "length" when the
  // response was cut off at the token limit.
  const finishReason = data.choices?.[0]?.finish_reason;
  if (finishReason === "length") {
    dumpRaw("Architect TRUNCATED", `finish_reason=length — response was cut at token limit`);
  }

  // safeParseJSON handles fence-stripping, brace extraction, empty input,
  // and falls back to {} instead of throwing
  const parsed = safeParseJSON<BriefPayload>(raw);

  // Validate that the Architect actually produced usable content.
  // Without this check, a parse failure silently passes {} to the Scribe,
  // which produces a PDF with styled containers but no content.
  if (!parsed.subscriberId && !parsed.subscriberName && (!parsed.sections || parsed.sections.length === 0)) {
    const preview = raw.substring(0, 200);
    dumpRaw("Architect PARSE FAIL", `Parsed to empty object. Raw preview: ${preview}`);
    throw new Error(
      `Architect returned data but parsing produced an empty brief (finish_reason=${finishReason ?? "unknown"}). ` +
      `Raw response starts with: ${raw.substring(0, 100)}`
    );
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Stage 3 — Scribe: format the BriefPayload for the Next.js PDF template
// ---------------------------------------------------------------------------

export function scribeStage(brief: BriefPayload): BriefPayload {
  // Normalise, clean up, and strip rogue emojis from professional sections
  const filteredProspects = brief.prospectSection
    ? brief.prospectSection
        .filter((item) => item.headline?.trim())
        .map(sanitiseItem)
    : null;

  const filteredMarketPulse = brief.marketPulseSection
    ? brief.marketPulseSection
        .filter((entry) => entry.metric?.trim())
        .map((entry) => ({
          metric: stripEmojis(entry.metric ?? ""),
          value: stripEmojis(entry.value ?? ""),
          change: stripEmojis(entry.change ?? ""),
          source: stripEmojis(entry.source ?? ""),
        }))
    : null;

  const filteredRegulatory = brief.regulatoryCountdown
    ? brief.regulatoryCountdown
        .filter((entry) => entry.regulation?.trim())
        .map((entry) => ({
          regulation: stripEmojis(entry.regulation ?? ""),
          body: stripEmojis(entry.body ?? ""),
          deadline: entry.deadline ?? "",
          daysLeft: entry.daysLeft ?? 0,
          impact: stripEmojis(entry.impact ?? ""),
        }))
    : null;

  const filteredMonthlyRollup = brief.monthlyProspectRollup
    ? brief.monthlyProspectRollup
        .filter((item) => item.headline?.trim())
        .map(sanitiseItem)
    : null;

  const filteredCompetitorTracker = brief.competitorTrackerSection
    ? brief.competitorTrackerSection
        .filter((item) => item.headline?.trim())
        .map(sanitiseItem)
    : null;

  const filteredSafety = brief.safetySection
    ? brief.safetySection
        .filter((item) => item.headline?.trim())
        .map(sanitiseItem)
    : null;

  return {
    subscriberId: brief.subscriberId,
    subscriberName: brief.subscriberName,
    companyName: brief.companyName,
    generatedAt: new Date().toISOString(), // Always use system clock, never trust model output
    sections: (brief.sections ?? []).map((s) => ({
      title: stripEmojis(s.title),
      items: (s.items ?? []).map(sanitiseItem),
    })),
    tenderSection: brief.tenderSection
      ? brief.tenderSection.map(sanitiseItem)
      : null,
    prospectSection: filteredProspects && filteredProspects.length > 0 ? filteredProspects : null,
    // Off-Duty is the ONLY section that keeps its original tone (no emoji stripping)
    offDutySection: brief.offDutySection
      ? brief.offDutySection
          .filter((item) => item.headline?.trim())
          .map((item) => ({
            headline: item.headline ?? "",
            summary: item.summary ?? "",
            commentary: item.commentary ?? "",
            relevance: item.relevance ?? "",
            source: item.source ?? "",
          }))
      : null,
    marketPulseSection: filteredMarketPulse && filteredMarketPulse.length > 0 ? filteredMarketPulse : null,
    regulatoryCountdown: filteredRegulatory && filteredRegulatory.length > 0 ? filteredRegulatory : null,
    monthlyProspectRollup: filteredMonthlyRollup && filteredMonthlyRollup.length > 0 ? filteredMonthlyRollup : null,
    competitorTrackerSection: filteredCompetitorTracker && filteredCompetitorTracker.length > 0 ? filteredCompetitorTracker : null,
    safetySection: filteredSafety && filteredSafety.length > 0 ? filteredSafety : null,
    analystNote: stripEmojis(brief.analystNote ?? ""),
  };
}

// ---------------------------------------------------------------------------
// Supabase integration — fetch subscriber profile
// ---------------------------------------------------------------------------

export async function fetchSubscriberProfile(
  subscriberId: string
): Promise<SubscriberProfile> {
  const { data, error } = await supabase
    .from("subscribers")
    .select(
      "id, fullName, companyName, role, assets, subjects, modules, frequency, depth"
    )
    .eq("id", subscriberId)
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to fetch subscriber ${subscriberId}: ${error?.message ?? "not found"}`
    );
  }

  return data as SubscriberProfile;
}

// ---------------------------------------------------------------------------
// Full pipeline
// ---------------------------------------------------------------------------

export async function generateBrief(
  subscriberId: string
): Promise<BriefPayload> {
  const profile = await fetchSubscriberProfile(subscriberId);
  const scoutResult = await scoutStage(profile);
  const rawBrief = await architectStage(profile, scoutResult);
  const brief = scribeStage(rawBrief);
  return brief;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

// Only run CLI when executed directly (not imported as a module by Next.js)
const isCLI =
  process.argv[1] &&
  (process.argv[1].endsWith("brief-generator.ts") ||
    process.argv[1].endsWith("brief-generator.js"));

if (isCLI) {
  // Load dotenv only in CLI mode — Next.js handles .env natively
  import("dotenv/config").then(() => {
    const subscriberId = process.argv[2];
    if (subscriberId) {
      generateBrief(subscriberId)
        .then((brief) => {
          console.log(JSON.stringify(brief, null, 2));
        })
        .catch((err) => {
          console.error("[Engine] Fatal:", err);
          process.exit(1);
        });
    }
  });
}

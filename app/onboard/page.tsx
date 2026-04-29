"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HelpTooltip } from "../components/help-tooltip";
import { PasswordInput } from "../components/password-input";
import { DepthPreview } from "../components/depth-preview";
import { DELIVERY_TIMES } from "../../lib/constants";

/* ────── types ────── */

type Stage = "entry" | "generating" | "sample" | "signup" | "questionnaire" | "complete";

interface IntelItem {
  headline: string;
  summary: string;
  commentary: string;
  relevance: string;
  source: string;
}

interface FormData {
  fullName: string;
  companyName: string;
  role: string;
  assets: string;
  subjects: [string, string, string];
  tenderEnabled: boolean;
  tenderRegion: string;
  tenderType: string;
  prospectsEnabled: boolean;
  prospectsPerReport: number;
  prospectsFocusAreas: string;
  offDutyEnabled: boolean;
  offDutyInterests: string;
  marketPulseEnabled: boolean;
  marketPulseDataToTrack: string;
  regulatoryTimelineEnabled: boolean;
  regulatoryTimelineRegulations: string;
  competitorTrackerEnabled: boolean;
  competitorTrackerCompanies: string;
  vesselArrivalsEnabled: boolean;
  vesselArrivalsPort: string;
  vesselArrivalsVesselType: string;
  vesselArrivalsTimeframe: string;
  industryChatterEnabled: boolean;
  earningsCallEnabled: boolean;
  earningsCallCompanies: string;
  safetyEnabled: boolean;
  safetyAreas: string;
  frequency: string;
  depth: string;
  timezone: string;
  deliveryTime: string;
  monthlyReview: string;
  monthlyLeadSummaryEnabled: boolean;
  monthlyTenderSummaryEnabled: boolean;
  monthlyReviewDay: number | "last";
  monthlyReviewTime: string;
}

const INITIAL: FormData = {
  fullName: "",
  companyName: "",
  role: "",
  assets: "",
  subjects: ["", "", ""],
  tenderEnabled: false,
  tenderRegion: "",
  tenderType: "",
  prospectsEnabled: false,
  prospectsPerReport: 3,
  prospectsFocusAreas: "",
  offDutyEnabled: false,
  offDutyInterests: "",
  marketPulseEnabled: false,
  marketPulseDataToTrack: "",
  regulatoryTimelineEnabled: false,
  regulatoryTimelineRegulations: "",
  competitorTrackerEnabled: false,
  competitorTrackerCompanies: "",
  vesselArrivalsEnabled: false,
  vesselArrivalsPort: "",
  vesselArrivalsVesselType: "",
  vesselArrivalsTimeframe: "",
  industryChatterEnabled: false,
  earningsCallEnabled: false,
  earningsCallCompanies: "",
  safetyEnabled: false,
  safetyAreas: "",
  frequency: "",
  depth: "",
  timezone: "",
  deliveryTime: "",
  monthlyReview: "",
  monthlyLeadSummaryEnabled: false,
  monthlyTenderSummaryEnabled: false,
  monthlyReviewDay: 1,
  monthlyReviewTime: "",
};

const QUESTIONNAIRE_STEPS = 6;

/* ────── shared styles ────── */

const inputCls =
  "w-full bg-[var(--navy-950)] border border-[var(--input-border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-colors";

const pillCls =
  "text-xs px-3 py-1 rounded-full border border-[var(--teal-500)]/25 bg-[var(--teal-500)]/10 text-[var(--teal-400)] hover:bg-[var(--teal-500)]/20 hover:border-[var(--teal-500)]/40 transition-colors cursor-pointer";

const labelCls = "flex items-center gap-1.5 text-sm font-medium mb-2 text-[var(--slate-200)]";

/* ────── reusable UI ────── */

function ProgressBar({ current, total }: { current: number; total: number }) {
  const remaining = total - current;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[var(--teal-400)]">
          Step {current + 1} of {total}
        </span>
        <span className="text-[11px] text-[var(--slate-400)]">
          ~{remaining} min remaining
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[3px] rounded-sm transition-colors duration-200"
            style={{ background: i <= current ? "var(--teal-500)" : "rgba(143,168,196,0.18)" }}
          />
        ))}
      </div>
    </div>
  );
}

function TextInput({
  label,
  placeholder,
  value,
  onChange,
  examples,
}: {
  label: ReactNode;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  examples?: string[];
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      {examples && examples.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChange(value ? `${value}, ${ex}` : ex)}
              className={pillCls}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TextArea({
  label,
  placeholder,
  value,
  onChange,
  examples,
  rows = 3,
}: {
  label: ReactNode;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  examples?: string[];
  rows?: number;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={inputCls + " resize-none"}
      />
      {examples && examples.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChange(value ? `${value}\n${ex}` : ex)}
              className={pillCls}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-all ${
        selected
          ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--navy-950)]/60 hover:border-[var(--accent)]/50"
      }`}
    >
      <div className="font-medium text-sm">{title}</div>
      {description && (
        <div className="text-xs text-[var(--muted-foreground)] mt-1">{description}</div>
      )}
    </button>
  );
}

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 w-full text-left"
    >
      <div
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? "bg-[var(--accent)]" : "bg-[var(--muted)]"
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

/* ────── questionnaire steps ────── */

function Step1({
  data,
  update,
}: {
  data: FormData;
  update: (d: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="inline-flex items-center gap-2 text-xl font-bold mb-1">
          Professional Identity
          <HelpTooltip
            examples={[
              "Chartering Manager at a mid-size tanker company",
              "Technical Superintendent — bulk carriers",
              "Sales Director at a marine engine OEM",
            ]}
          />
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Tell us about your role so we can tailor the voice and focus of your brief.
        </p>
      </div>
      <TextInput
        label="Full Name"
        placeholder="e.g. John Doe"
        value={data.fullName}
        onChange={(v) => update({ fullName: v })}
      />
      <TextInput
        label="Company Name"
        placeholder="e.g. Oceanic Shipping Ltd."
        value={data.companyName}
        onChange={(v) => update({ companyName: v })}
      />
      <TextInput
        label="What is your role?"
        placeholder="e.g. Ship Owner/Operator, Maritime Lawyer, Bunker Trader..."
        value={data.role}
        onChange={(v) => update({ role: v })}
        examples={[
          "Ship Owner/Operator",
          "Maritime Lawyer",
          "Bunker Trader",
          "Technical Manager",
          "Broker",
        ]}
      />
    </div>
  );
}

function Step2({
  data,
  update,
}: {
  data: FormData;
  update: (d: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="inline-flex items-center gap-2 text-xl font-bold mb-1">
          Asset & Market Focus
          <HelpTooltip
            examples={[
              "MR Tankers on one line, Handysize Bulkers on the next",
              "LPG and LNG Carriers — spot and term markets",
              "Ballast Water Treatment Systems — retrofit market",
            ]}
          />
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          What physical assets or markets do you need to track? List as many as you like.
        </p>
      </div>
      <TextArea
        label="Assets and markets"
        placeholder="e.g. LPG and LNG Carriers, Capesize Bulkers, Middle East Bunker ports..."
        value={data.assets}
        onChange={(v) => update({ assets: v })}
        examples={[
          "LPG and LNG Carriers",
          "Capesize Bulkers",
          "The whole container market",
          "Middle East Bunker ports",
        ]}
        rows={4}
      />
    </div>
  );
}

function Step3({
  data,
  update,
  prefilledSubject,
}: {
  data: FormData;
  update: (d: Partial<FormData>) => void;
  prefilledSubject?: string;
}) {
  const setSubject = (idx: 0 | 1 | 2, val: string) => {
    const next: [string, string, string] = [...data.subjects] as [string, string, string];
    next[idx] = val;
    update({ subjects: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="inline-flex items-center gap-2 text-xl font-bold mb-1">
          Core Intelligence Subjects
          <HelpTooltip
            examples={[
              "Daily Suezmax spot rates — AG to Med",
              "Port congestion at Singapore and Tanjung Pelepas",
              "Class society approval trends for scrubber retrofits",
            ]}
          />
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          List at least 3 &ldquo;must-have&rdquo; subjects. We&apos;ll use AI to fill in the blanks based on your profession.
        </p>
      </div>
      <TextInput
        label={
          prefilledSubject ? (
            <>
              Subject 1{" "}
              <span className="text-[var(--accent)] text-xs font-normal ml-1">
                pre-filled from your preview
              </span>
            </>
          ) : (
            "Subject 1"
          )
        }
        placeholder="e.g. IMO 2024 compliance updates"
        value={data.subjects[0]}
        onChange={(v) => setSubject(0, v)}
        examples={["Latest IMO news and regulation updates", "Suez Canal transit alerts"]}
      />
      <TextInput
        label="Subject 2"
        placeholder="e.g. Daily charter rates for Supramax"
        value={data.subjects[1]}
        onChange={(v) => setSubject(1, v)}
        examples={["Daily bunker prices in Rotterdam", "Daily charter rates for Supramax"]}
      />
      <TextInput
        label="Subject 3"
        placeholder="e.g. Port congestion at Singapore and Port Klang"
        value={data.subjects[2]}
        onChange={(v) => setSubject(2, v)}
        examples={[
          "Port congestion at Singapore and Port Klang",
          "Sanctions and compliance alerts",
        ]}
      />
    </div>
  );
}

function StepAdvancedModules({
  data,
  update,
}: {
  data: FormData;
  update: (d: Partial<FormData>) => void;
}) {
  const moduleBox = "rounded-xl border border-[var(--border)] bg-[var(--navy-950)]/50 p-5 space-y-4";
  const ucBox = moduleBox + " opacity-60";
  const ucStyle = {
    backgroundImage:
      "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255,180,0,0.04) 10px, rgba(255,180,0,0.04) 20px)",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Advanced Intel Modules</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Enable optional high-value modules to expand your intelligence coverage.
        </p>
      </div>

      <div className={moduleBox}>
        <Toggle
          enabled={data.tenderEnabled}
          onToggle={() => update({ tenderEnabled: !data.tenderEnabled })}
          label="Tender Module"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Track maritime and offshore tender opportunities relevant to your profile.
        </p>
        {data.tenderEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label={<>Focus Region <HelpTooltip examples={["South East Asia", "Middle East & Gulf", "West Africa", "Northern Europe"]} /></>}
              placeholder="e.g. South East Asia, Middle East, West Africa"
              value={data.tenderRegion}
              onChange={(v) => update({ tenderRegion: v })}
              examples={["South East Asia", "Middle East & Gulf", "West Africa", "Northern Europe"]}
            />
            <TextInput
              label={<>Tender Type <HelpTooltip examples={["Public procurement", "Offshore wind support", "Port services & logistics", "Ship management"]} /></>}
              placeholder="e.g. Public procurement, Offshore wind, Port services"
              value={data.tenderType}
              onChange={(v) => update({ tenderType: v })}
              examples={["Public procurement", "Offshore wind support", "Port services & logistics", "Ship management"]}
            />
          </div>
        )}
      </div>

      <div className={moduleBox}>
        <Toggle
          enabled={data.prospectsEnabled}
          onToggle={() => update({ prospectsEnabled: !data.prospectsEnabled })}
          label="Client Prospects"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          AI-powered lead generation — we analyse your role and market focus to suggest high-fit companies for outreach.
        </p>
        {data.prospectsEnabled && (
          <div className="pt-2 space-y-4">
            <div>
              <label className={labelCls}>New Prospects Per Report</label>
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update({ prospectsPerReport: n })}
                    className={`w-11 h-11 rounded-lg text-sm font-semibold transition-all ${
                      data.prospectsPerReport === n
                        ? "bg-[var(--accent)] text-[var(--accent-foreground)] ring-1 ring-[var(--accent)]"
                        : "border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <TextInput
              label={<>Focus Area / Regions <HelpTooltip examples={["Tanker operators in the Gulf", "European short-sea shipping", "Asian dry bulk charterers"]} /></>}
              placeholder="e.g. Tanker operators in the Gulf, European short-sea shipping"
              value={data.prospectsFocusAreas}
              onChange={(v) => update({ prospectsFocusAreas: v })}
              examples={["Tanker operators in the Gulf", "European short-sea shipping", "Asian dry bulk charterers"]}
            />
          </div>
        )}
      </div>

      <div className={moduleBox}>
        <Toggle
          enabled={data.marketPulseEnabled}
          onToggle={() => update({ marketPulseEnabled: !data.marketPulseEnabled })}
          label="Market Pulse"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Track live market data — bunker prices, freight indexes, and key rates relevant to your operations.
        </p>
        {data.marketPulseEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label={<>Data to Track <HelpTooltip examples={["Bunker Prices SG", "Freight Indexes", "Baltic Dry Index", "VLSFO Rotterdam", "TC Rates Supramax"]} /></>}
              placeholder="e.g. Bunker Prices SG, Freight Indexes, Baltic Dry Index"
              value={data.marketPulseDataToTrack}
              onChange={(v) => update({ marketPulseDataToTrack: v })}
              examples={["Bunker Prices SG", "Freight Indexes", "Baltic Dry Index", "VLSFO Rotterdam", "TC Rates Supramax"]}
            />
          </div>
        )}
      </div>

      <div className={moduleBox}>
        <Toggle
          enabled={data.regulatoryTimelineEnabled}
          onToggle={() => update({ regulatoryTimelineEnabled: !data.regulatoryTimelineEnabled })}
          label="Regulatory Timeline"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Countdown tracker for upcoming regulatory deadlines from IMO, USCG, EU, and DNV — so nothing catches you off guard.
        </p>
        {data.regulatoryTimelineEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label={<>Specific Regulations to Track <HelpTooltip examples={["IMO 2030 GHG reduction targets", "EU ETS shipping inclusion from Jan 2024", "CII rating deadlines for your fleet"]} /></>}
              placeholder="e.g. CII, EU ETS, IMO 2030, EEXI"
              value={data.regulatoryTimelineRegulations}
              onChange={(v) => update({ regulatoryTimelineRegulations: v })}
              examples={["CII compliance deadlines", "EU ETS shipping", "EEXI certification"]}
            />
          </div>
        )}
      </div>

      <div className={moduleBox}>
        <Toggle
          enabled={data.offDutyEnabled}
          onToggle={() => update({ offDutyEnabled: !data.offDutyEnabled })}
          label="Off-Duty Module"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Add a personal interest section to your brief — hobbies, sports, or anything you follow outside of work.
        </p>
        {data.offDutyEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label="What do you follow outside of work?"
              placeholder="e.g. Formula 1, Premier League football, deep-sea fishing, vinyl records..."
              value={data.offDutyInterests}
              onChange={(v) => update({ offDutyInterests: v })}
              examples={["Formula 1", "Premier League football", "Golf", "Cycling", "Craft beer"]}
            />
          </div>
        )}
      </div>

      <div className={moduleBox}>
        <Toggle
          enabled={data.competitorTrackerEnabled}
          onToggle={() => update({ competitorTrackerEnabled: !data.competitorTrackerEnabled })}
          label="Competitor Tracker"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Monitor specific companies — we track their press releases, fleet moves, contract wins, and industry news so you stay one step ahead.
        </p>
        {data.competitorTrackerEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label={<>Companies to track <HelpTooltip examples={["Maersk", "BW Group", "Stena Bulk", "Hapag-Lloyd", "Wartsila"]} /></>}
              placeholder="e.g. Maersk, Hapag-Lloyd, BW Group, Stena Bulk"
              value={data.competitorTrackerCompanies}
              onChange={(v) => update({ competitorTrackerCompanies: v })}
              examples={["Maersk", "BW Group", "Stena Bulk", "Hapag-Lloyd", "Wartsila"]}
            />
          </div>
        )}
      </div>

      <div className={moduleBox}>
        <Toggle
          enabled={data.safetyEnabled}
          onToggle={() => update({ safetyEnabled: !data.safetyEnabled })}
          label="Safety Intelligence"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Track maritime safety incidents, security threats, and technical safety updates — crew welfare, asset protection, and operational risk intelligence.
        </p>
        {data.safetyEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label={<>Specific Safety/Security Areas to Track <HelpTooltip examples={["Piracy alerts — Red Sea, Gulf of Guinea", "Hazardous cargo incidents & DG handling", "Shipyard safety protocols & near-miss reports"]} /></>}
              placeholder="e.g. Red Sea piracy alerts, SOLAS fire safety, H2S cargo handling"
              value={data.safetyAreas}
              onChange={(v) => update({ safetyAreas: v })}
              examples={["Piracy alerts — Red Sea, Gulf of Guinea", "Hazardous cargo incidents & DG handling", "SOLAS fire safety compliance", "Port state control detention trends"]}
            />
          </div>
        )}
      </div>

      <div className={ucBox} style={ucStyle}>
        <Toggle enabled={data.vesselArrivalsEnabled} onToggle={() => update({ vesselArrivalsEnabled: !data.vesselArrivalsEnabled })} label="Vessel Arrivals" />
        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">Under Construction</span>
        <p className="text-xs text-[var(--muted-foreground)]">Track vessel arrivals at key ports — filtered by vessel type and timeframe. Coming soon.</p>
        {data.vesselArrivalsEnabled && (
          <div className="pt-2 space-y-4">
            <div>
              <label className={labelCls}>Port</label>
              <select value={data.vesselArrivalsPort} onChange={(e) => update({ vesselArrivalsPort: e.target.value })} className={inputCls}>
                <option value="">Select port</option>
                <option value="Singapore">Singapore</option>
                <option value="Dubai">Dubai</option>
                <option value="Houston">Houston</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Vessel Type</label>
              <select value={data.vesselArrivalsVesselType} onChange={(e) => update({ vesselArrivalsVesselType: e.target.value })} className={inputCls}>
                <option value="">Select vessel type</option>
                <option value="Tanker">Tanker</option>
                <option value="Bulker">Bulker</option>
                <option value="LPG">LPG</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Timeframe</label>
              <select value={data.vesselArrivalsTimeframe} onChange={(e) => update({ vesselArrivalsTimeframe: e.target.value })} className={inputCls}>
                <option value="">Select timeframe</option>
                <option value="48h">48 hours</option>
                <option value="96h">96 hours</option>
                <option value="7d">7 days</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className={ucBox} style={ucStyle}>
        <Toggle enabled={data.industryChatterEnabled} onToggle={() => update({ industryChatterEnabled: !data.industryChatterEnabled })} label="Industry Chatter" />
        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">Under Construction</span>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">Stay ahead of the conversation — surface what shipowners, brokers, and operators are actually talking about. Know the sentiment before it moves the market.</p>
      </div>

      <div className={ucBox} style={ucStyle}>
        <Toggle enabled={data.earningsCallEnabled} onToggle={() => update({ earningsCallEnabled: !data.earningsCallEnabled })} label="Earnings Call Summary" />
        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">Under Construction</span>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">Never sit through another three-hour earnings call. Get the key signals extracted and translated into plain maritime intelligence.</p>
        {data.earningsCallEnabled && (
          <div className="pt-2 space-y-4">
            <div>
              <label className={labelCls}>Companies to Track</label>
              <input type="text" value={data.earningsCallCompanies} onChange={(e) => update({ earningsCallCompanies: e.target.value })} placeholder="e.g. Frontline, Euronav, Tsakos" disabled className={inputCls + " opacity-50 cursor-not-allowed"} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step4({
  data,
  update,
}: {
  data: FormData;
  update: (d: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="inline-flex items-center gap-2 text-xl font-bold mb-1">
          Frequency & Depth
          <HelpTooltip
            examples={[
              "Business Days + Deep Dive — best for active traders",
              "3x Week + Executive Summary — ideal for busy operators",
              "Weekly + Deep Dive — suited to strategic planning roles",
            ]}
          />
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          How often do you want your brief, and how deep should it go?
        </p>
      </div>

      <div>
        <label className={labelCls}>Report Frequency</label>
        <div className="grid grid-cols-3 gap-3">
          <OptionCard selected={data.frequency === "business"} onClick={() => update({ frequency: "business" })} title="Business Days" description="Mon – Fri" />
          <OptionCard selected={data.frequency === "3x"} onClick={() => update({ frequency: "3x" })} title="3x Week" description="Mon, Wed, Fri (Recommended for Deep Dives)" />
          <OptionCard selected={data.frequency === "weekly"} onClick={() => update({ frequency: "weekly" })} title="Weekly" description="Once a week" />
        </div>
      </div>

      <div>
        <label className="inline-flex items-center gap-2 text-sm font-medium mb-3 text-[var(--slate-200)]">
          Report Depth
          <HelpTooltip
            examples={[
              "Executive Summary — fast scan before a call",
              "Deep Dive — full context and analyst commentary",
              "Weekly Digest — your 2 most important stories of the week.",
            ]}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <OptionCard selected={data.depth === "executive"} onClick={() => update({ depth: "executive" })} title="Executive Summary" description="~1 min read" />
          <OptionCard selected={data.depth === "deep"} onClick={() => update({ depth: "deep" })} title="Deep Dive" description="~5 min read" />
          <OptionCard selected={data.depth === "data"} onClick={() => update({ depth: "data" })} title="Weekly Digest" description="Your week's 2 most important stories. Full narrative, analyst commentary." />
        </div>
        <DepthPreview depth={data.depth || "deep"} />
      </div>

      <div>
        <label className={labelCls}>Timezone</label>
        <select value={data.timezone} onChange={(e) => update({ timezone: e.target.value })} className={inputCls}>
          <option value="">Select your timezone</option>
          <option value="Pacific/Auckland">Pacific/Auckland (UTC+12)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
          <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
          <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
          <option value="Europe/Athens">Europe/Athens (UTC+3)</option>
          <option value="Europe/London">Europe/London (UTC+0/+1)</option>
          <option value="America/New_York">America/New_York (UTC-5)</option>
          <option value="America/Chicago">America/Chicago (UTC-6)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
        </select>
      </div>

      <div>
        <label className={labelCls}>Delivery Time</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {DELIVERY_TIMES.map((t) => (
            <OptionCard key={t} selected={data.deliveryTime === t} onClick={() => update({ deliveryTime: t })} title={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Step5({
  data,
  update,
}: {
  data: FormData;
  update: (d: Partial<FormData>) => void;
}) {
  const panelCls = "rounded-xl border border-[var(--border)] bg-[var(--navy-950)]/50 p-5 space-y-4";
  return (
    <div className="space-y-6">
      <div>
        <h2 className="inline-flex items-center gap-2 text-xl font-bold mb-1">
          Monthly Review & Delivery
          <HelpTooltip
            examples={[
              "Updated sanction lists + fleet disposal trends",
              "Quarterly drydock cost benchmarks",
              "Newbuild orderbook by segment — Q2 2026",
            ]}
          />
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Each month you&apos;ll receive an advanced strategic report. Tell us what to include.
        </p>
      </div>
      <TextArea
        label="What would you like in your monthly strategic review?"
        placeholder="e.g. Updated sanction lists, Global scrapping stats, New build order book trends..."
        value={data.monthlyReview}
        onChange={(v) => update({ monthlyReview: v })}
        examples={["Updated sanction lists", "Global scrapping stats for 2026", "New build order book trends"]}
        rows={4}
      />

      <div className={panelCls}>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Content rollups</p>
        <div className="space-y-3">
          <Toggle enabled={data.monthlyLeadSummaryEnabled} onToggle={() => update({ monthlyLeadSummaryEnabled: !data.monthlyLeadSummaryEnabled })} label="Include Lead / Prospect summary" />
          <p className="text-xs text-[var(--muted-foreground)] pl-14">A ranked roll-up of all prospects surfaced during the month — fit score, engagement signals, and cumulative intelligence.</p>
        </div>
        <div className="space-y-3 pt-1">
          <Toggle enabled={data.monthlyTenderSummaryEnabled} onToggle={() => update({ monthlyTenderSummaryEnabled: !data.monthlyTenderSummaryEnabled })} label="Include Tender summary" />
          <p className="text-xs text-[var(--muted-foreground)] pl-14">A consolidated list of all tenders captured during the month, grouped by region and deadline proximity.</p>
        </div>
      </div>

      <div className={panelCls}>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Monthly delivery timing</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Day of month</label>
            <select
              value={String(data.monthlyReviewDay)}
              onChange={(e) => {
                const v = e.target.value;
                update({ monthlyReviewDay: v === "last" ? "last" : Number(v) });
              }}
              className={inputCls}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={String(d)}>{d}</option>
              ))}
              <option value="last">Last day of month</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Delivery time</label>
            <select value={data.monthlyReviewTime || data.deliveryTime || "08:00"} onChange={(e) => update({ monthlyReviewTime: e.target.value })} className={inputCls}>
              {DELIVERY_TIMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">Uses your chosen timezone. Defaults to your daily delivery time if unchanged.</p>
      </div>
    </div>
  );
}

/* ────── stage components ────── */

const EXAMPLE_SUBJECTS = [
  "Suezmax spot rates — AG to Med",
  "LNG carrier fleet movements",
  "IMO 2030 GHG compliance",
  "Port congestion — Singapore",
  "Baltic Dry Index weekly",
  "Red Sea security alerts",
];

function EntryStage({ onStart }: { onStart: (subject: string) => void }) {
  const [subject, setSubject] = useState("");

  return (
    <div className="space-y-10">
      <div className="text-center space-y-5">
        <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[var(--teal-400)]">
          Try before you sign up
        </span>
        <h1 className="text-[44px] sm:text-[64px] font-semibold leading-[0.97] tracking-[-0.035em] mt-6">
          See your intelligence brief
          <br />
          <span className="font-serif-italic text-[var(--teal-400)] font-normal">before you sign up.</span>
        </h1>
        <p className="text-[var(--slate-300)] text-lg max-w-[540px] mx-auto leading-relaxed mt-5">
          Enter one subject and we&apos;ll generate a live preview story — real data, real sources, zero fluff.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-semibold text-[var(--slate-100)]">
          What maritime subject should we cover?
        </label>
        {/* Combined pill input+button container */}
        <div
          className="flex flex-wrap sm:flex-nowrap p-1.5 rounded-2xl sm:rounded-full gap-1.5 backdrop-blur-xl"
          style={{
            background: "rgba(11,20,36,0.7)",
            border: "1px solid rgba(143,168,196,0.18)",
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)",
          }}
        >
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && subject.trim()) onStart(subject.trim());
            }}
            placeholder="e.g. Suezmax spot rates, LNG fleet movements, IMO compliance…"
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] px-5 py-3.5 text-[15px]"
            autoFocus
          />
          <button
            type="button"
            onClick={() => subject.trim() && onStart(subject.trim())}
            disabled={!subject.trim()}
            className="w-full sm:w-auto rounded-full px-7 py-3.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:brightness-110 inline-flex items-center justify-center gap-2"
            style={{
              background: "var(--teal-500)",
              color: "var(--navy-950)",
              boxShadow: "0 8px 24px -8px rgba(43,179,205,0.4)",
            }}
          >
            Generate my preview →
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {EXAMPLE_SUBJECTS.map((ex) => (
            <button key={ex} type="button" onClick={() => setSubject(ex)} className={pillCls}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-[var(--slate-400)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--teal-400)] font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

const SOURCES = [
  { name: "Lloyd's List",    count: "342 articles" },
  { name: "TradeWinds",      count: "218 articles" },
  { name: "Splash 247",      count: "184 articles" },
  { name: "Riviera",         count: "in progress"  },
  { name: "Baltic Exchange", count: "queued"        },
  { name: "Argus Media",     count: "queued"        },
  { name: "Reuters",         count: "queued"        },
];

function GeneratingStage({ subject }: { subject: string }) {
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => Math.min(p + 3, 95));
    }, 700);
    return () => clearInterval(id);
  }, []);

  const scannedCount = Math.min(Math.floor((progress / 100) * SOURCES.length), SOURCES.length - 1);

  return (
    <div className="flex justify-center">
      <style>{`
        @keyframes iqsea-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes iqsea-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div
        className="w-full rounded-3xl backdrop-blur-xl"
        style={{
          background: "linear-gradient(180deg, rgba(15,27,48,0.85) 0%, rgba(11,20,36,0.85) 100%)",
          border: "1px solid rgba(143,168,196,0.15)",
          boxShadow: "0 40px 100px -20px rgba(0,0,0,0.6)",
          padding: "48px 40px",
        }}
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--teal-500)]/10 border border-[var(--teal-500)]/25">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--teal-400)]"
              style={{ boxShadow: "0 0 10px rgba(43,179,205,0.7)", animation: "iqsea-pulse 1.4s ease-in-out infinite" }}
            />
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--teal-400)]">
              Building your preview
            </span>
          </div>

          <h2 className="mt-6 text-2xl sm:text-[32px] font-semibold tracking-tight leading-tight">
            Curating{" "}
            <span className="font-serif-italic text-[var(--teal-400)] font-normal">
              &ldquo;{subject}&rdquo;
            </span>
          </h2>
          <p className="mt-3 text-sm text-[var(--slate-300)]">
            Scanning 21 trusted sources for the past 24 hours. ~20 seconds.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-8">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(143,168,196,0.12)" }}>
            <div
              className="h-full rounded-full relative transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, var(--teal-500) 0%, var(--teal-400) 100%)",
                boxShadow: "0 0 16px rgba(43,179,205,0.5)",
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                  animation: "iqsea-shimmer 1.6s linear infinite",
                }}
              />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-[var(--slate-400)]">
            <span>{scannedCount} of {SOURCES.length} sources processed</span>
            <span style={{ fontFamily: "monospace" }}>{progress}%</span>
          </div>
        </div>

        {/* Source feed */}
        <div
          className="mt-7 rounded-xl"
          style={{
            padding: "18px 20px",
            background: "rgba(15,27,48,0.5)",
            border: "1px solid rgba(143,168,196,0.1)",
          }}
        >
          <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[var(--slate-400)] mb-3">
            Source feed
          </div>
          <div>
            {SOURCES.map((s, i) => {
              const status = i < scannedCount ? "scanned" : i === scannedCount ? "scanning" : "queued";
              return (
                <div
                  key={s.name}
                  className={`flex items-center gap-3.5 py-2.5 transition-opacity ${i < SOURCES.length - 1 ? "border-b border-white/[0.05]" : ""}`}
                  style={{ opacity: status === "queued" ? 0.5 : 1 }}
                >
                  {status === "scanned" && (
                    <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--teal-400)]/[0.18] text-[var(--teal-400)]">
                      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                        <polyline points="2 6 5 9.5 10 2.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                  {status === "scanning" && (
                    <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--teal-400)]/[0.18]">
                      <span
                        className="w-2 h-2 rounded-full bg-[var(--teal-400)]"
                        style={{ animation: "iqsea-pulse 1.2s ease-in-out infinite" }}
                      />
                    </span>
                  )}
                  {status === "queued" && (
                    <span
                      className="w-[18px] h-[18px] rounded-full flex-shrink-0"
                      style={{ border: "1px solid rgba(143,168,196,0.3)" }}
                    />
                  )}
                  <span className="font-serif-italic text-base text-[var(--foreground)] flex-1">
                    {s.name}
                  </span>
                  <span className={`text-xs ${status === "scanning" ? "text-[var(--teal-400)]" : "text-[var(--slate-400)]"}`}>
                    {status === "scanning" ? "Reading…" : status === "queued" ? "queued" : s.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] text-[var(--slate-400)] italic">
          Real data, real sources. This is exactly how every brief is built.
        </p>
      </div>
    </div>
  );
}

function SampleStage({
  story,
  subject,
  isFresh,
  onContinue,
}: {
  story: IntelItem;
  subject: string;
  isFresh: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 lg:items-start">
      {/* Left: the brief card */}
      <div>
        {!isFresh && (
          <div className="flex gap-3 rounded-xl border border-[var(--teal-500)]/30 bg-[var(--teal-500)]/8 p-4 mb-4">
            <div className="mt-0.5 flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="9" fill="#2BB3CD" />
                <rect x="9" y="9" width="2" height="5" rx="1" fill="#0b1424" />
                <rect x="9" y="6" width="2" height="2" rx="1" fill="#0b1424" />
              </svg>
            </div>
            <p className="text-sm font-medium leading-relaxed text-[var(--slate-200)]">
              We couldn&apos;t find news newer than 7 days on &lsquo;{subject}&rsquo;. Here&apos;s what we found from earlier. Your daily briefs will surface fresh articles as they publish.
            </p>
          </div>
        )}

        <div
          className="rounded-2xl overflow-hidden backdrop-blur-sm"
          style={{
            background: "linear-gradient(180deg, rgba(15,27,48,0.95) 0%, rgba(11,20,36,0.95) 100%)",
            border: "1px solid rgba(143,168,196,0.15)",
            boxShadow: "0 40px 100px -20px rgba(0,0,0,0.5)",
          }}
        >
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--teal-400)]">
                  Your preview · {subject}
                </div>
                <div className="text-xs text-[var(--slate-400)] mt-1.5">
                  curated from 21 sources
                </div>
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25 shrink-0 ml-4">
                Live Preview
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-xl sm:text-2xl font-semibold leading-tight tracking-tight text-[var(--foreground)] mb-4">
              {story.headline}
            </h2>

            {/* Lede with serif italic prefix */}
            {story.summary && (
              <p className="text-[15px] text-[var(--slate-100)] leading-relaxed mb-4">
                <span className="font-serif-italic text-[var(--teal-300)] text-[17px]">The picture: </span>
                {story.summary}
              </p>
            )}

            {/* Commentary / body */}
            {story.commentary && (
              <p className="text-sm text-[var(--slate-200)] leading-relaxed mb-5">
                {story.commentary}
              </p>
            )}

            {/* What it means */}
            {story.relevance && (
              <div
                className="rounded-xl p-4 mb-5"
                style={{
                  background: "rgba(43,179,205,0.06)",
                  border: "1px solid rgba(43,179,205,0.2)",
                }}
              >
                <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[var(--teal-400)] mb-2">
                  What it means for you
                </div>
                <p className="text-sm text-[var(--slate-100)] leading-relaxed">
                  {story.relevance}
                </p>
              </div>
            )}

            {/* Source */}
            {story.source && (
              <div
                className="pt-4 flex items-center"
                style={{ borderTop: "1px solid rgba(143,168,196,0.1)" }}
              >
                <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--slate-400)] mr-3">
                  Source
                </div>
                <a
                  href={story.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-serif-italic text-[13px] text-[var(--accent)] hover:underline truncate"
                >
                  {story.source}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: CTA aside */}
      <aside className="mt-6 lg:mt-0 lg:sticky lg:top-6 flex flex-col gap-4">
        <div>
          <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-[var(--teal-400)] mb-3">
            This is a preview
          </div>
          <h3 className="text-2xl font-semibold tracking-tight leading-snug">
            Now{" "}
            <span className="font-serif-italic text-[var(--teal-400)] font-normal">tailor it</span>
            {" "}to your role.
          </h3>
          <p className="text-sm text-[var(--slate-300)] leading-relaxed mt-3">
            Six questions, two minutes. Your real daily brief includes 8–12 stories like this one — across the markets, modules, and timing you choose.
          </p>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-full px-6 py-4 text-sm font-semibold transition-all hover:brightness-110 inline-flex items-center justify-center"
          style={{
            background: "var(--teal-500)",
            color: "var(--navy-950)",
            boxShadow: "0 8px 24px -8px rgba(43,179,205,0.4)",
          }}
        >
          Continue setup →
        </button>

        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(15,27,48,0.6)",
            border: "1px solid rgba(143,168,196,0.12)",
          }}
        >
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--slate-400)] mb-3">
            What you get
          </div>
          <div className="space-y-2.5">
            {[
              "8–12 stories, daily",
              "Across your markets and modules",
              "Delivered before work starts",
              "First 14 days free",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-sm text-[var(--slate-100)]">
                <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 shrink-0 text-[var(--teal-400)]" fill="none">
                  <polyline points="2 7 5.5 10.5 12 3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function NoResultsStage({ subject, onRetry }: { subject: string; onRetry: () => void }) {
  return (
    <div className="space-y-6 py-8 text-center">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">No results found</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          We couldn&apos;t find news on &lsquo;{subject}&rsquo;. Try a different topic?
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="w-full rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 transition"
      >
        Try another topic
      </button>
    </div>
  );
}

function SignupStage({ onSuccess }: { onSuccess: (id: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (res.ok) {
        onSuccess(result.id);
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.trim().length >= 8;

  return (
    <div className="space-y-6">
      <div className="flex justify-center mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-white-compact.svg" alt="IQSEA" className="h-8 w-auto" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">Create your account</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Your profile and delivery preferences come next. Takes about 2 minutes.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={inputCls}
          />
          <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
            Your briefs will be delivered here and also accessible on the dashboard.
          </p>
        </div>
        <div>
          <label className={labelCls}>Create a password</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className={inputCls}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleSignup}
          disabled={!canSubmit || submitting}
          className="w-full rounded-full bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Creating Account…" : "Get started →"}
        </button>
        <p className="text-center text-xs text-[var(--muted-foreground)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function CompleteStage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-[var(--accent)]/10 animate-ping" />
        <div className="relative w-24 h-24 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-10 h-10"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-3xl font-bold">You&rsquo;re all set</h2>
        <p className="text-[var(--slate-400)] max-w-xs mx-auto leading-relaxed text-sm">
          Your profile is saved. Your first brief will arrive based on your delivery schedule — curated, sourced, and ready to act on.
        </p>
      </div>

      <div className="w-full space-y-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-full bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 transition"
        >
          Go to Dashboard
        </button>
        <p className="text-xs text-[var(--muted-foreground)]">
          You can update your brief settings at any time from your profile.
        </p>
      </div>
    </div>
  );
}

/* ────── main page ────── */

export default function OnboardPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("entry");
  const [subject, setSubject] = useState("");
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [story, setStory] = useState<IntelItem | null>(null);
  const [isFresh, setIsFresh] = useState<boolean | null>(null);
  const [previewNoResults, setPreviewNoResults] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [qStep, setQStep] = useState(0);
  const [data, setData] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const update = (partial: Partial<FormData>) =>
    setData((prev) => ({ ...prev, ...partial }));

  // ---------------------------------------------------------------------------
  // Stage: generating — poll for preview job result
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (stage !== "generating" || !previewJobId) return;

    const TIMEOUT_MS = 90_000;
    const POLL_MS = 1_000;
    const started = Date.now();
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      if (Date.now() - started > TIMEOUT_MS) {
        setPreviewError("Preview generation timed out. Please try again.");
        setStage("entry");
        return;
      }
      try {
        const res = await fetch(`/api/preview-story?jobId=${previewJobId}`);
        const result = await res.json();

        if (result.status === "complete" && result.item) {
          setStory(result.item as IntelItem);
          setIsFresh(result.isFresh ?? true);
          setStage("sample");
        } else if (result.status === "no_results") {
          setPreviewNoResults(true);
          setStage("sample");
        } else if (result.status === "error") {
          setPreviewError("Preview generation failed. Please try again.");
          setStage("entry");
        } else {
          setTimeout(poll, POLL_MS);
        }
      } catch {
        setTimeout(poll, POLL_MS);
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [stage, previewJobId]);

  // ---------------------------------------------------------------------------
  // Entry → generating
  // ---------------------------------------------------------------------------

  async function handleStartPreview(subjectValue: string) {
    setSubject(subjectValue);
    setPreviewError("");
    setPreviewNoResults(false);
    setIsFresh(null);
    setStory(null);
    update({ subjects: [subjectValue, "", ""] });

    try {
      const res = await fetch("/api/preview-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectValue }),
      });
      const result = await res.json();
      if (res.ok) {
        setPreviewJobId(result.jobId);
        setStage("generating");
      } else if (res.status === 429) {
        setPreviewError(result.error ?? "Too many requests. Please wait and try again.");
      } else {
        setPreviewError(result.error ?? "Failed to start preview. Please try again.");
      }
    } catch {
      setPreviewError("Network error — please try again.");
    }
  }

  // ---------------------------------------------------------------------------
  // Signup → questionnaire
  // ---------------------------------------------------------------------------

  function handleSignupSuccess() {
    setStage("questionnaire");
  }

  // ---------------------------------------------------------------------------
  // Questionnaire: advance / submit
  // ---------------------------------------------------------------------------

  const canAdvanceQ = (): boolean => {
    switch (qStep) {
      case 0:
        return (
          data.fullName.trim().length > 0 &&
          data.companyName.trim().length > 0 &&
          data.role.trim().length > 0
        );
      case 1:
        return data.assets.trim().length > 0;
      case 2:
        return data.subjects.filter((s) => s.trim().length > 0).length >= 3;
      case 3:
        return true;
      case 4:
        return (
          data.frequency !== "" &&
          data.depth !== "" &&
          data.timezone !== "" &&
          data.deliveryTime !== ""
        );
      case 5:
        return true;
      default:
        return false;
    }
  };

  async function handleCompleteProfile() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/onboard/complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        setStage("complete");
      } else {
        setSubmitError(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const qStepComponents = [
    <Step1 key={0} data={data} update={update} />,
    <Step2 key={1} data={data} update={update} />,
    <Step3 key={2} data={data} update={update} prefilledSubject={subject || undefined} />,
    <StepAdvancedModules key={3} data={data} update={update} />,
    <Step4 key={4} data={data} update={update} />,
    <Step5 key={5} data={data} update={update} />,
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-x-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 30%, #122036 0%, #0b1424 60%, #050a14 100%)",
      }}
    >
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(143,168,196,0.06) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Teal ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-200px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(43,179,205,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-8 h-14 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-white-tagline.svg"
            alt="IQSEA"
            className="h-7 w-auto"
          />
        </Link>
        <Link
          href="/login"
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          Already have an account?{" "}
          <span className="text-[var(--accent)] font-medium">Sign in →</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6 py-12 sm:py-20">
        <div className={`w-full ${
          stage === "sample" ? "max-w-5xl" :
          stage === "generating" ? "max-w-2xl" :
          "max-w-xl"
        }`}>

          {/* Entry stage — open on atmospheric bg, no card */}
          {stage === "entry" && (
            <>
              {previewError && (
                <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                  {previewError}
                </div>
              )}
              <EntryStage onStart={handleStartPreview} />
            </>
          )}

          {/* Generating — open, centered */}
          {stage === "generating" && <GeneratingStage subject={subject} />}

          {/* Sample — story card + CTA */}
          {stage === "sample" && !previewNoResults && story && (
            <SampleStage
              story={story}
              subject={subject}
              isFresh={isFresh ?? true}
              onContinue={() => setStage("signup")}
            />
          )}

          {/* No results */}
          {stage === "sample" && previewNoResults && (
            <NoResultsStage
              subject={subject}
              onRetry={() => {
                setPreviewNoResults(false);
                setStory(null);
                setPreviewJobId(null);
                setIsFresh(null);
                setStage("entry");
              }}
            />
          )}

          {/* Signup — glassmorphic card */}
          {stage === "signup" && (
            <div className="bg-[var(--navy-800)]/80 border border-[var(--border-strong)] rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
              <SignupStage onSuccess={handleSignupSuccess} />
            </div>
          )}

          {/* Questionnaire */}
          {stage === "questionnaire" && (
            <>
              <ProgressBar current={qStep} total={QUESTIONNAIRE_STEPS} />

              <div className="bg-[var(--navy-800)]/80 border border-[var(--border-strong)] rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                {qStepComponents[qStep]}

                {submitError && (
                  <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                    {submitError}
                  </div>
                )}

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setQStep((s) => s - 1)}
                    disabled={qStep === 0}
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Back
                  </button>

                  {qStep < QUESTIONNAIRE_STEPS - 1 ? (
                    <button
                      type="button"
                      onClick={() => setQStep((s) => s + 1)}
                      disabled={!canAdvanceQ()}
                      className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Continue →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCompleteProfile}
                      disabled={!canAdvanceQ() || submitting}
                      className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {submitting ? "Saving Profile…" : "Complete Profile"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Complete */}
          {stage === "complete" && (
            <div className="bg-[var(--navy-800)]/80 border border-[var(--border-strong)] rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
              <CompleteStage />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

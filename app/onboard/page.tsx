"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HelpTooltip } from "../components/help-tooltip";

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
  safetyEnabled: boolean;
  safetyAreas: string;
  frequency: string;
  depth: string;
  timezone: string;
  deliveryTime: string;
  monthlyReview: string;
  monthlyProspectRollupEnabled: boolean;
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
  safetyEnabled: false,
  safetyAreas: "",
  frequency: "",
  depth: "",
  timezone: "",
  deliveryTime: "",
  monthlyReview: "",
  monthlyProspectRollupEnabled: false,
};

const QUESTIONNAIRE_STEPS = 6;

/* ────── reusable UI ────── */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < current
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : i === current
                  ? "bg-[var(--highlight)] text-[var(--highlight-foreground)]"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
            }`}
          >
            {i < current ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < total - 1 && (
            <div
              className={`hidden sm:block w-8 h-0.5 ${
                i < current ? "bg-[var(--accent)]" : "bg-[var(--muted)]"
              }`}
            />
          )}
        </div>
      ))}
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
      <label className="flex items-center gap-1.5 text-sm font-medium mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
      {examples && examples.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChange(value ? `${value}, ${ex}` : ex)}
              className="text-xs px-3 py-1 rounded-full border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
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
      <label className="flex items-center gap-1.5 text-sm font-medium mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
      />
      {examples && examples.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onChange(value ? `${value}\n${ex}` : ex)}
              className="text-xs px-3 py-1 rounded-full border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
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
          : "border-[var(--border)] hover:border-[var(--accent)]"
      }`}
    >
      <div className="font-medium text-sm">{title}</div>
      {description && (
        <div className="text-xs text-[var(--muted-foreground)] mt-1">
          {description}
        </div>
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
        <h2 className="inline-flex items-center text-xl font-bold mb-1">
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
          Tell us about your role so we can tailor the voice and focus of your
          brief.
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
        <h2 className="inline-flex items-center text-xl font-bold mb-1">
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
          What physical assets or markets do you need to track? List as many as
          you like.
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
        <h2 className="inline-flex items-center text-xl font-bold mb-1">
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
          List at least 3 &ldquo;must-have&rdquo; subjects. We&apos;ll use AI
          to fill in the blanks based on your profession.
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
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-1">Advanced Intel Modules</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Enable optional high-value modules to expand your intelligence
          coverage.
        </p>
      </div>

      {/* Tender Module */}
      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4">
        <Toggle
          enabled={data.tenderEnabled}
          onToggle={() => update({ tenderEnabled: !data.tenderEnabled })}
          label="Tender Module"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Track maritime and offshore tender opportunities relevant to your
          profile.
        </p>
        {data.tenderEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label={<>Focus Region <HelpTooltip examples={["South East Asia", "Middle East & Gulf", "West Africa", "Northern Europe"]} /></>}
              placeholder="e.g. South East Asia, Middle East, West Africa"
              value={data.tenderRegion}
              onChange={(v) => update({ tenderRegion: v })}
              examples={[
                "South East Asia",
                "Middle East & Gulf",
                "West Africa",
                "Northern Europe",
              ]}
            />
            <TextInput
              label={<>Tender Type <HelpTooltip examples={["Public procurement", "Offshore wind support", "Port services & logistics", "Ship management"]} /></>}
              placeholder="e.g. Public procurement, Offshore wind, Port services"
              value={data.tenderType}
              onChange={(v) => update({ tenderType: v })}
              examples={[
                "Public procurement",
                "Offshore wind support",
                "Port services & logistics",
                "Ship management",
              ]}
            />
          </div>
        )}
      </div>

      {/* Client Prospect Module */}
      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4">
        <Toggle
          enabled={data.prospectsEnabled}
          onToggle={() => update({ prospectsEnabled: !data.prospectsEnabled })}
          label="Client Prospects"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          AI-powered lead generation — we analyse your role and market focus to
          suggest high-fit companies for outreach.
        </p>
        {data.prospectsEnabled && (
          <div className="pt-2 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-3">
                New Prospects Per Report
              </label>
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
              examples={[
                "Tanker operators in the Gulf",
                "European short-sea shipping",
                "Asian dry bulk charterers",
              ]}
            />
          </div>
        )}
      </div>

      {/* Market Pulse Module */}
      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4">
        <Toggle
          enabled={data.marketPulseEnabled}
          onToggle={() => update({ marketPulseEnabled: !data.marketPulseEnabled })}
          label="Market Pulse"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Track live market data — bunker prices, freight indexes, and key
          rates relevant to your operations.
        </p>
        {data.marketPulseEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label={<>Data to Track <HelpTooltip examples={["Bunker Prices SG", "Freight Indexes", "Baltic Dry Index", "VLSFO Rotterdam", "TC Rates Supramax"]} /></>}
              placeholder="e.g. Bunker Prices SG, Freight Indexes, Baltic Dry Index"
              value={data.marketPulseDataToTrack}
              onChange={(v) => update({ marketPulseDataToTrack: v })}
              examples={[
                "Bunker Prices SG",
                "Freight Indexes",
                "Baltic Dry Index",
                "VLSFO Rotterdam",
                "TC Rates Supramax",
              ]}
            />
          </div>
        )}
      </div>

      {/* Regulatory Timeline Module */}
      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4">
        <Toggle
          enabled={data.regulatoryTimelineEnabled}
          onToggle={() =>
            update({ regulatoryTimelineEnabled: !data.regulatoryTimelineEnabled })
          }
          label="Regulatory Timeline"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Countdown tracker for upcoming regulatory deadlines from IMO, USCG,
          EU, and DNV — so nothing catches you off guard.
        </p>
        {data.regulatoryTimelineEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label={
                <>
                  Specific Regulations to Track{" "}
                  <HelpTooltip
                    examples={[
                      "IMO 2030 GHG reduction targets",
                      "EU ETS shipping inclusion from Jan 2024",
                      "CII rating deadlines for your fleet",
                    ]}
                  />
                </>
              }
              placeholder="e.g. CII, EU ETS, IMO 2030, EEXI"
              value={data.regulatoryTimelineRegulations}
              onChange={(v) => update({ regulatoryTimelineRegulations: v })}
              examples={["CII compliance deadlines", "EU ETS shipping", "EEXI certification"]}
            />
          </div>
        )}
      </div>

      {/* Off-Duty Module */}
      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4">
        <Toggle
          enabled={data.offDutyEnabled}
          onToggle={() => update({ offDutyEnabled: !data.offDutyEnabled })}
          label="Off-Duty Module"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Add a personal interest section to your brief — hobbies, sports,
          or anything you follow outside of work. Delivered in a lighter,
          cheerful tone.
        </p>
        {data.offDutyEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label="What do you follow outside of work?"
              placeholder="e.g. Formula 1, Premier League football, deep-sea fishing, vinyl records..."
              value={data.offDutyInterests}
              onChange={(v) => update({ offDutyInterests: v })}
              examples={[
                "Formula 1",
                "Premier League football",
                "Golf",
                "Cycling",
                "Craft beer",
              ]}
            />
          </div>
        )}
      </div>

      {/* Competitor Tracker Module */}
      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4">
        <Toggle
          enabled={data.competitorTrackerEnabled}
          onToggle={() =>
            update({ competitorTrackerEnabled: !data.competitorTrackerEnabled })
          }
          label="Competitor Tracker"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Monitor specific companies — we track their press releases, fleet
          moves, contract wins, and industry news so you stay one step ahead.
        </p>
        {data.competitorTrackerEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label={<>Companies to track <HelpTooltip examples={["Maersk", "BW Group", "Stena Bulk", "Hapag-Lloyd", "Wartsila"]} /></>}
              placeholder="e.g. Maersk, Hapag-Lloyd, BW Group, Stena Bulk"
              value={data.competitorTrackerCompanies}
              onChange={(v) => update({ competitorTrackerCompanies: v })}
              examples={[
                "Maersk",
                "BW Group",
                "Stena Bulk",
                "Hapag-Lloyd",
                "Wartsila",
              ]}
            />
          </div>
        )}
      </div>

      {/* Safety Intelligence Module */}
      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4">
        <Toggle
          enabled={data.safetyEnabled}
          onToggle={() => update({ safetyEnabled: !data.safetyEnabled })}
          label="Safety Intelligence"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Track maritime safety incidents, security threats, and technical
          safety updates — crew welfare, asset protection, and operational
          risk intelligence.
        </p>
        {data.safetyEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label={
                <>
                  Specific Safety/Security Areas to Track{" "}
                  <HelpTooltip
                    examples={[
                      "Piracy alerts — Red Sea, Gulf of Guinea",
                      "Hazardous cargo incidents & DG handling",
                      "Shipyard safety protocols & near-miss reports",
                    ]}
                  />
                </>
              }
              placeholder="e.g. Red Sea piracy alerts, SOLAS fire safety, H2S cargo handling"
              value={data.safetyAreas}
              onChange={(v) => update({ safetyAreas: v })}
              examples={[
                "Piracy alerts — Red Sea, Gulf of Guinea",
                "Hazardous cargo incidents & DG handling",
                "Shipyard safety protocols & near-miss reports",
                "SOLAS fire safety compliance",
                "Port state control detention trends",
              ]}
            />
          </div>
        )}
      </div>

      {/* Vessel Arrivals Module — UNDER CONSTRUCTION */}
      <div
        className="rounded-xl border border-[var(--border)] p-5 space-y-4 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255,180,0,0.04) 10px, rgba(255,180,0,0.04) 20px)",
        }}
      >
        <Toggle
          enabled={data.vesselArrivalsEnabled}
          onToggle={() =>
            update({ vesselArrivalsEnabled: !data.vesselArrivalsEnabled })
          }
          label="Vessel Arrivals"
        />
        <div className="flex items-center gap-2">
          <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">
            Under Construction
          </span>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Track vessel arrivals at key ports — filtered by vessel type and
          timeframe. Coming soon.
        </p>
        {data.vesselArrivalsEnabled && (
          <div className="pt-2 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Port</label>
              <select
                value={data.vesselArrivalsPort}
                onChange={(e) => update({ vesselArrivalsPort: e.target.value })}
                className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">Select port</option>
                <option value="Singapore">Singapore</option>
                <option value="Dubai">Dubai</option>
                <option value="Houston">Houston</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Vessel Type</label>
              <select
                value={data.vesselArrivalsVesselType}
                onChange={(e) => update({ vesselArrivalsVesselType: e.target.value })}
                className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">Select vessel type</option>
                <option value="Tanker">Tanker</option>
                <option value="Bulker">Bulker</option>
                <option value="LPG">LPG</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Timeframe</label>
              <select
                value={data.vesselArrivalsTimeframe}
                onChange={(e) => update({ vesselArrivalsTimeframe: e.target.value })}
                className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              >
                <option value="">Select timeframe</option>
                <option value="48h">48 hours</option>
                <option value="96h">96 hours</option>
                <option value="7d">7 days</option>
              </select>
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
        <h2 className="inline-flex items-center text-xl font-bold mb-1">
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
        <label className="block text-sm font-medium mb-3">
          Report Frequency
        </label>
        <div className="grid grid-cols-3 gap-3">
          <OptionCard
            selected={data.frequency === "business"}
            onClick={() => update({ frequency: "business" })}
            title="Business Days"
            description="Mon – Fri"
          />
          <OptionCard
            selected={data.frequency === "3x"}
            onClick={() => update({ frequency: "3x" })}
            title="3x Week"
            description="Mon, Wed, Fri (Recommended for Deep Dives)"
          />
          <OptionCard
            selected={data.frequency === "weekly"}
            onClick={() => update({ frequency: "weekly" })}
            title="Weekly"
            description="Once a week"
          />
        </div>
      </div>

      <div>
        <label className="inline-flex items-center text-sm font-medium mb-3">
          Report Depth
          <HelpTooltip
            examples={[
              "Executive Summary — fast scan before a call",
              "Deep Dive — full context and analyst commentary",
              "Data Only — numbers and tables, no narrative",
            ]}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <OptionCard
            selected={data.depth === "executive"}
            onClick={() => update({ depth: "executive" })}
            title="Executive Summary"
            description="~1 min read"
          />
          <OptionCard
            selected={data.depth === "deep"}
            onClick={() => update({ depth: "deep" })}
            title="Deep Dive"
            description="~5 min read"
          />
          <OptionCard
            selected={data.depth === "data"}
            onClick={() => update({ depth: "data" })}
            title="Data Only"
            description="Numbers & tables"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">Timezone</label>
        <select
          value={data.timezone}
          onChange={(e) => update({ timezone: e.target.value })}
          className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        >
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
        <label className="block text-sm font-medium mb-3">Delivery Time</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {["06:00", "07:00", "08:00", "09:00", "12:00", "13:00", "17:00", "18:00"].map(
            (t) => (
              <OptionCard
                key={t}
                selected={data.deliveryTime === t}
                onClick={() => update({ deliveryTime: t })}
                title={t}
              />
            )
          )}
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
  return (
    <div className="space-y-6">
      <div>
        <h2 className="inline-flex items-center text-xl font-bold mb-1">
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
          Each month you&apos;ll receive an advanced strategic report. Tell us
          what to include.
        </p>
      </div>
      <TextArea
        label="What would you like in your monthly strategic review?"
        placeholder="e.g. Updated sanction lists, Global scrapping stats, New build order book trends..."
        value={data.monthlyReview}
        onChange={(v) => update({ monthlyReview: v })}
        examples={[
          "Updated sanction lists",
          "Global scrapping stats for 2026",
          "New build order book trends",
        ]}
        rows={4}
      />
      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4">
        <Toggle
          enabled={data.monthlyProspectRollupEnabled}
          onToggle={() =>
            update({ monthlyProspectRollupEnabled: !data.monthlyProspectRollupEnabled })
          }
          label="Monthly Prospect Roll-up"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Include a summary of all prospects surfaced during the month in your
          monthly strategic review — ranked by fit and engagement potential.
        </p>
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

function EntryStage({
  onStart,
}: {
  onStart: (subject: string) => void;
}) {
  const [subject, setSubject] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">
          See your intelligence brief before you sign up
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Enter one subject and we&apos;ll generate a live preview story — real
          data, real sources, zero fluff.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          What maritime subject should we cover?
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && subject.trim()) onStart(subject.trim());
          }}
          placeholder="e.g. Suezmax spot rates, LNG fleet movements, IMO compliance..."
          className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          autoFocus
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_SUBJECTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setSubject(ex)}
              className="text-xs px-3 py-1 rounded-full border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => subject.trim() && onStart(subject.trim())}
        disabled={!subject.trim()}
        className="w-full rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        Generate My Preview
      </button>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

const LOADING_MESSAGES = [
  "Querying live maritime sources…",
  "Filtering for high-signal stories…",
  "Running intelligence analysis…",
  "Applying source fidelity checks…",
  "Composing your brief item…",
];

function GeneratingStage({ subject }: { subject: string }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-[var(--accent)] animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-[var(--foreground)]">
          Generating preview for: <span className="text-[var(--accent)]">{subject}</span>
        </p>
        <p className="text-xs text-[var(--muted-foreground)] h-4 transition-all">
          {LOADING_MESSAGES[msgIdx]}
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
    <div className="space-y-6">
      {!isFresh && (
        <div className="mb-4 flex gap-3 rounded-lg border border-[#53b1c1]/60 bg-[#53b1c1]/15 p-4 shadow-sm">
          <div className="mt-0.5 flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="9" fill="#53b1c1" />
              <rect x="9" y="9" width="2" height="5" rx="1" fill="#0b1424" />
              <rect x="9" y="6" width="2" height="2" rx="1" fill="#0b1424" />
            </svg>
          </div>
          <p className="text-sm font-medium leading-relaxed text-[#f0f4f8]">
            We couldn&apos;t find news newer than 7 days on &lsquo;{subject}&rsquo;. Here&apos;s what we found from earlier. Your daily briefs will surface fresh articles as they publish.
          </p>
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25">
            Live Preview
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">{subject}</span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
          <h3 className="font-semibold text-base leading-snug">{story.headline}</h3>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{story.summary}</p>
          {story.commentary && (
            <div className="border-l-2 border-[var(--accent)]/40 pl-3">
              <p className="text-xs text-[var(--foreground)]/80 italic leading-relaxed">
                {story.commentary}
              </p>
            </div>
          )}
          {story.relevance && (
            <p className="text-xs text-[var(--muted-foreground)]">
              <span className="font-medium text-[var(--foreground)]/70">Why it matters: </span>
              {story.relevance}
            </p>
          )}
          {story.source && (
            <p className="text-[10px] text-[var(--muted-foreground)] truncate">
              Source:{" "}
              <a
                href={story.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                {story.source}
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-4 text-sm text-[var(--muted-foreground)]">
        Your full brief will include <strong className="text-[var(--foreground)]">multiple stories</strong>,
        {" "}market data, analyst commentary, and optional modules — delivered on your schedule.
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 transition"
      >
        Create My Account →
      </button>
    </div>
  );
}

function NoResultsStage({
  subject,
  onRetry,
}: {
  subject: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-6 py-4 text-center">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">No results found</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          We couldn&apos;t find news on &lsquo;{subject}&rsquo;. Try a different topic?
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="w-full rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 transition"
      >
        Try another topic
      </button>
    </div>
  );
}

function SignupStage({
  onSuccess,
}: {
  onSuccess: (id: string) => void;
}) {
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
      <div>
        <h2 className="text-xl font-bold mb-1">Create Your Account</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Your profile and delivery preferences come next. Takes about 2 minutes.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
            Your briefs will be delivered here and also accessible on the dashboard.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Create a password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSignup}
        disabled={!canSubmit || submitting}
        className="w-full rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {submitting ? "Creating Account…" : "Create Account & Continue"}
      </button>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function CompleteStage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      {/* Animated pulse ring */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-[#d4a017]/10 animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-[#d4a017]/15 border border-[#d4a017]/40 flex items-center justify-center">
          {/* Checkmark */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#d4a017"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-9 h-9"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          You&rsquo;re all set
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xs mx-auto leading-relaxed">
          Your profile is saved. Your first brief will arrive based on your
          delivery schedule — curated, sourced, and ready to act on.
        </p>
      </div>

      <div className="pt-2 w-full space-y-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 transition"
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
    // Pre-fill Subject 1 with what the user typed
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
        return true; // advanced modules optional
      case 4:
        return (
          data.frequency !== "" &&
          data.depth !== "" &&
          data.timezone !== "" &&
          data.deliveryTime !== ""
        );
      case 5:
        return true; // monthly review optional
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 h-14 flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2 text-[var(--accent)] font-bold text-sm tracking-tight"
        >
          &larr; IQsea
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-10 sm:py-16">
        <div className="w-full max-w-xl">

          {/* Pre-questionnaire stages: no step indicator */}
          {stage !== "questionnaire" && stage !== "complete" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
              {stage === "entry" && (
                <>
                  {previewError && (
                    <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                      {previewError}
                    </div>
                  )}
                  <EntryStage onStart={handleStartPreview} />
                </>
              )}
              {stage === "generating" && <GeneratingStage subject={subject} />}
              {stage === "sample" && !previewNoResults && story && (
                <SampleStage
                  story={story}
                  subject={subject}
                  isFresh={isFresh ?? true}
                  onContinue={() => setStage("signup")}
                />
              )}
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
              {stage === "signup" && <SignupStage onSuccess={handleSignupSuccess} />}
            </div>
          )}

          {/* Questionnaire stage */}
          {stage === "questionnaire" && (
            <>
              <StepIndicator current={qStep} total={QUESTIONNAIRE_STEPS} />

              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
                {qStepComponents[qStep]}

                {submitError && (
                  <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                    {submitError}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setQStep((s) => s - 1)}
                    disabled={qStep === 0}
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Back
                  </button>

                  {qStep < QUESTIONNAIRE_STEPS - 1 ? (
                    <button
                      type="button"
                      onClick={() => setQStep((s) => s + 1)}
                      disabled={!canAdvanceQ()}
                      className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCompleteProfile}
                      disabled={!canAdvanceQ() || submitting}
                      className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {submitting ? "Saving Profile…" : "Complete Profile"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Complete stage */}
          {stage === "complete" && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
              <CompleteStage />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

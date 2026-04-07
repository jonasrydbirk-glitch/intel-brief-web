"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ────── types ────── */

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
  email: string;
  password: string;
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
  email: "",
  password: "",
};

const TOTAL_STEPS = 6;

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
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  examples?: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
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
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  examples?: string[];
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
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

/* ────── steps ────── */

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
        <h2 className="text-xl font-bold mb-1">Professional Identity</h2>
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
        <h2 className="text-xl font-bold mb-1">Asset & Market Focus</h2>
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
}: {
  data: FormData;
  update: (d: Partial<FormData>) => void;
}) {
  const setSubject = (idx: 0 | 1 | 2, val: string) => {
    const next: [string, string, string] = [...data.subjects];
    next[idx] = val;
    update({ subjects: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Core Intelligence Subjects</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          List at least 3 &ldquo;must-have&rdquo; subjects. We&apos;ll use AI
          to fill in the blanks based on your profession.
        </p>
      </div>
      <TextInput
        label="Subject 1"
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
          onToggle={() =>
            update({ tenderEnabled: !data.tenderEnabled })
          }
          label="Tender Module"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Track maritime and offshore tender opportunities relevant to your
          profile.
        </p>
        {data.tenderEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label="Focus Region"
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
              label="Tender Type"
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
          onToggle={() =>
            update({ prospectsEnabled: !data.prospectsEnabled })
          }
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
              label="Focus Area / Regions"
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
          onToggle={() =>
            update({ marketPulseEnabled: !data.marketPulseEnabled })
          }
          label="Market Pulse"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Track live market data — bunker prices, freight indexes, and key
          rates relevant to your operations.
        </p>
        {data.marketPulseEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label="Data to Track"
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
      </div>

      {/* Off-Duty Module */}
      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4">
        <Toggle
          enabled={data.offDutyEnabled}
          onToggle={() =>
            update({ offDutyEnabled: !data.offDutyEnabled })
          }
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
              label="Companies to track"
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
          onToggle={() =>
            update({ safetyEnabled: !data.safetyEnabled })
          }
          label="Safety Intelligence"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Track maritime safety incidents, security threats, and technical
          safety updates — crew welfare, asset protection, and operational
          risk intelligence.
        </p>
        <details className="text-xs text-[var(--muted-foreground)]">
          <summary className="cursor-pointer inline-flex items-center gap-1 text-[var(--accent)] hover:underline">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-[var(--accent)] text-[10px] font-bold">?</span>
            Examples
          </summary>
          <ul className="mt-2 ml-5 list-disc space-y-1">
            <li>Piracy alerts in Red Sea and Gulf of Aden</li>
            <li>Hazardous cargo handling incidents and bulletins</li>
            <li>Shipyard safety protocols and SOLAS compliance updates</li>
          </ul>
        </details>
        {data.safetyEnabled && (
          <div className="pt-2 space-y-4">
            <TextInput
              label="Specific Safety/Security Areas to Track"
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
      <div className="rounded-xl border border-[var(--border)] p-5 space-y-4 opacity-60" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255,180,0,0.04) 10px, rgba(255,180,0,0.04) 20px)" }}>
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
        <h2 className="text-xl font-bold mb-1">Frequency & Depth</h2>
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
        <label className="block text-sm font-medium mb-3">Report Depth</label>
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
        <h2 className="text-xl font-bold mb-1">Monthly Review & Delivery</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Each month you&apos;ll receive an advanced strategic report. Tell us
          what to include, and where to send everything.
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
      <div>
        <label className="block text-sm font-medium mb-2">
          Delivery email
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => update({ email: e.target.value })}
          placeholder="you@company.com"
          className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Your briefs will also be available on the web dashboard.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">
          Create a password
        </label>
        <input
          type="password"
          value={data.password}
          onChange={(e) => update({ password: e.target.value })}
          placeholder="Minimum 8 characters"
          className="w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          You&apos;ll use this to sign in and manage your account.
        </p>
      </div>
    </div>
  );
}

/* ────── main page ────── */

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (partial: Partial<FormData>) =>
    setData((prev) => ({ ...prev, ...partial }));

  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return data.fullName.trim().length > 0 && data.companyName.trim().length > 0 && data.role.trim().length > 0;
      case 1:
        return data.assets.trim().length > 0;
      case 2:
        return data.subjects.filter((s) => s.trim().length > 0).length >= 3;
      case 3:
        return true; // advanced modules are optional
      case 4:
        return data.frequency !== "" && data.depth !== "" && data.timezone !== "" && data.deliveryTime !== "";
      case 5:
        return data.email.trim().length > 0 && data.password.trim().length >= 8;
      default:
        return false;
    }
  };

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem("iqsea_subscriber_id", result.id);
        localStorage.setItem("iqsea_email", data.email);
        router.push(
          `/success?id=${result.id}&url=${encodeURIComponent(result.profileUrl)}`
        );
      } else {
        setError(result.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const stepComponents = [
    <Step1 key={0} data={data} update={update} />,
    <Step2 key={1} data={data} update={update} />,
    <Step3 key={2} data={data} update={update} />,
    <StepAdvancedModules key={3} data={data} update={update} />,
    <Step4 key={4} data={data} update={update} />,
    <Step5 key={5} data={data} update={update} />,
  ];

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
          <StepIndicator current={step} total={TOTAL_STEPS} />

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            {stepComponents[step]}

            {error && (
              <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>

              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canAdvance()}
                  className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canAdvance() || submitting}
                  className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {submitting ? "Creating Profile..." : "Complete Profile"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

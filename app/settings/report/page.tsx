"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IQseaLogoSmall } from "../../components/iqsea-logo";
import { LogoutButton } from "../../components/logout-button";
import { HelpTooltip } from "../../components/help-tooltip";

/* ────── types ────── */

interface ProfileData {
  id: string;
  email: string;
  role: string;
  assets: string[];
  subjects: string[];
  modules: {
    tender: { enabled: boolean; region?: string; type?: string; focusAreas?: string };
    prospects: { enabled: boolean; perReport?: number; focusAreas?: string };
    offDuty: { enabled: boolean; interests?: string };
    marketPulse: { enabled: boolean; dataToTrack?: string };
    regulatoryTimeline: { enabled: boolean; regulations?: string };
    competitorTracker: { enabled: boolean; companies?: string };
    vesselArrivals: { enabled: boolean; port?: string; vesselType?: string; timeframe?: string };
    safety: { enabled: boolean; areas?: string };
    monthlyProspectRollup: { enabled: boolean };
  };
  frequency: string;
  depth: string;
  timezone: string;
  deliveryTime: string;
  monthlyReview: string[];
}

interface FormState {
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

const PLACEHOLDER: FormState = {
  role: "Ship Owner/Operator",
  assets: "LPG and LNG Carriers\nCapesize Bulkers",
  subjects: [
    "Latest IMO news and regulation updates",
    "Daily charter rates for Supramax",
    "Port congestion at Singapore and Port Klang",
  ],
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
  frequency: "business",
  depth: "executive",
  timezone: "",
  deliveryTime: "08:00",
  monthlyReview: "Updated sanction lists\nGlobal scrapping stats for 2026",
  monthlyProspectRollupEnabled: false,
};

function profileToForm(p: ProfileData): FormState {
  return {
    role: p.role || PLACEHOLDER.role,
    assets: (p.assets || []).join("\n") || PLACEHOLDER.assets,
    subjects: [
      p.subjects?.[0] || PLACEHOLDER.subjects[0],
      p.subjects?.[1] || PLACEHOLDER.subjects[1],
      p.subjects?.[2] || PLACEHOLDER.subjects[2],
    ],
    tenderEnabled: p.modules?.tender?.enabled ?? false,
    tenderRegion: p.modules?.tender?.region || p.modules?.tender?.focusAreas || "",
    tenderType: p.modules?.tender?.type || "",
    prospectsEnabled: p.modules?.prospects?.enabled ?? false,
    prospectsPerReport: p.modules?.prospects?.perReport ?? 3,
    prospectsFocusAreas: p.modules?.prospects?.focusAreas || "",
    offDutyEnabled: p.modules?.offDuty?.enabled ?? false,
    offDutyInterests: p.modules?.offDuty?.interests || "",
    competitorTrackerEnabled: p.modules?.competitorTracker?.enabled ?? false,
    competitorTrackerCompanies: p.modules?.competitorTracker?.companies || "",
    vesselArrivalsEnabled: p.modules?.vesselArrivals?.enabled ?? false,
    vesselArrivalsPort: p.modules?.vesselArrivals?.port || "",
    vesselArrivalsVesselType: p.modules?.vesselArrivals?.vesselType || "",
    vesselArrivalsTimeframe: p.modules?.vesselArrivals?.timeframe || "",
    safetyEnabled: p.modules?.safety?.enabled ?? false,
    safetyAreas: p.modules?.safety?.areas || "",
    frequency: p.frequency || PLACEHOLDER.frequency,
    depth: p.depth || PLACEHOLDER.depth,
    timezone: p.timezone || PLACEHOLDER.timezone,
    deliveryTime: p.deliveryTime || PLACEHOLDER.deliveryTime,
    monthlyReview:
      (p.monthlyReview || []).join("\n") || PLACEHOLDER.monthlyReview,
    marketPulseEnabled: p.modules?.marketPulse?.enabled ?? false,
    marketPulseDataToTrack: p.modules?.marketPulse?.dataToTrack || "",
    regulatoryTimelineEnabled: p.modules?.regulatoryTimeline?.enabled ?? false,
    regulatoryTimelineRegulations: p.modules?.regulatoryTimeline?.regulations || "",
    monthlyProspectRollupEnabled: p.modules?.monthlyProspectRollup?.enabled ?? false,
  };
}

/* ────── small UI components ────── */

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

function SectionHeader({
  icon,
  title,
  subtitle,
  helpExamples,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  helpExamples?: string[];
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-semibold tracking-tight inline-flex items-center">
          {title}
          {helpExamples && <HelpTooltip examples={helpExamples} />}
        </h2>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-[var(--background)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)] transition-colors";
const textareaClass = inputClass + " resize-none";
const labelClass = "block text-sm font-medium text-[var(--slate-300)] mb-2";

/* ────── SVG icons ────── */

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.5} className="w-4.5 h-4.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconShip() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.5} className="w-4.5 h-4.5">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
      <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
      <path d="M12 1v4" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.5} className="w-4.5 h-4.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconPuzzle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.5} className="w-4.5 h-4.5">
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.611a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 2c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.969a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.5} className="w-4.5 h-4.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.5} className="w-4.5 h-4.5">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.5} className="w-4.5 h-4.5">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4.5 h-4.5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

/* ────── main page ────── */

export default function ReportSettingsPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(PLACEHOLDER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwChanging, setPwChanging] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");

  const update = (partial: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const setSubject = (idx: 0 | 1 | 2, val: string) => {
    const next: [string, string, string] = [...form.subjects];
    next[idx] = val;
    update({ subjects: next });
  };

  // Try to load existing profile using session-backed API
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const profile: ProfileData = await res.json();
          setProfileId(profile.id);
          setForm(profileToForm(profile));
        }
      } catch {
        // Use placeholders on error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      if (!profileId) {
        setError("No profile found. Please complete onboarding first.");
        return;
      }
      const res = await fetch("/api/settings/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId, ...form }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to save");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--muted-foreground)] text-sm">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center">
            <IQseaLogoSmall className="h-9" />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/dashboard"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Reports
            </Link>
            <span className="text-[var(--foreground)] font-medium">
              Settings
            </span>
            <Link
              href="/feedback"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Feedback
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Settings</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your intelligence brief preferences. Changes take effect on your next report.
          </p>
        </div>

        <div className="space-y-6">
          {/* ── Professional Identity ── */}
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <SectionHeader
              icon={<IconUser />}
              title="Professional Identity"
              subtitle="How the engine understands your role and perspective"
              helpExamples={[
                "Chartering Manager at a mid-size tanker company",
                "Technical Superintendent — bulk carriers",
                "Sales Director at a marine engine OEM",
              ]}
            />
            <div>
              <label className={labelClass}>Role</label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => update({ role: e.target.value })}
                placeholder="e.g. Ship Owner/Operator"
                className={inputClass}
              />
            </div>
          </section>

          {/* ── Asset & Market Focus ── */}
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <SectionHeader
              icon={<IconShip />}
              title="Asset & Market Focus"
              subtitle="The vessel types, segments, and markets you operate in"
              helpExamples={[
                "MR Tankers on one line, Handysize Bulkers on the next",
                "LPG and LNG Carriers — spot and term markets",
                "Ballast Water Treatment Systems — retrofit market",
              ]}
            />
            <div>
              <label className={labelClass}>Assets and Markets</label>
              <textarea
                value={form.assets}
                onChange={(e) => update({ assets: e.target.value })}
                placeholder="One per line — e.g. LPG and LNG Carriers"
                rows={4}
                className={textareaClass}
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Enter each asset type or market on a new line.
              </p>
            </div>
          </section>

          {/* ── Core Intelligence Subjects ── */}
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <SectionHeader
              icon={<IconTarget />}
              title="Core Intelligence Subjects"
              subtitle="Up to three topics the engine prioritises in every brief"
              helpExamples={[
                "Daily Suezmax spot rates — AG to Med",
                "Port congestion at Singapore and Tanjung Pelepas",
                "Class society approval trends for scrubber retrofits",
              ]}
            />
            <div className="space-y-4">
              {([0, 1, 2] as const).map((idx) => (
                <div key={idx}>
                  <label className={labelClass}>Subject {idx + 1}</label>
                  <input
                    type="text"
                    value={form.subjects[idx]}
                    onChange={(e) => setSubject(idx, e.target.value)}
                    placeholder={`e.g. ${PLACEHOLDER.subjects[idx]}`}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── Advanced Modules ── */}
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <SectionHeader
              icon={<IconPuzzle />}
              title="Advanced Intel Modules"
              subtitle="Optional add-ons to enrich your brief with specialised data"
            />

            <div className="space-y-4">
              {/* Tender Module */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4">
                <Toggle
                  enabled={form.tenderEnabled}
                  onToggle={() =>
                    update({ tenderEnabled: !form.tenderEnabled })
                  }
                  label="Tender Module"
                />
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Track maritime and offshore tender opportunities relevant to
                  your profile.
                </p>
                {form.tenderEnabled && (
                  <div className="space-y-4 pt-1 border-t border-[var(--border)]">
                    <div className="pt-3">
                      <label className={labelClass + " inline-flex items-center"}>Focus Region <HelpTooltip examples={["South East Asia, Middle East", "West Africa, North Sea", "Global — offshore wind installation tenders"]} /></label>
                      <input
                        type="text"
                        value={form.tenderRegion}
                        onChange={(e) =>
                          update({ tenderRegion: e.target.value })
                        }
                        placeholder="e.g. South East Asia, Middle East"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass + " inline-flex items-center"}>Tender Type <HelpTooltip examples={["Public procurement, time charter", "Offshore wind, FPSO conversion", "Equipment supply — propulsion systems"]} /></label>
                      <input
                        type="text"
                        value={form.tenderType}
                        onChange={(e) =>
                          update({ tenderType: e.target.value })
                        }
                        placeholder="e.g. Public procurement, Offshore wind"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Client Prospects Module */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4">
                <Toggle
                  enabled={form.prospectsEnabled}
                  onToggle={() =>
                    update({ prospectsEnabled: !form.prospectsEnabled })
                  }
                  label="Client Prospects"
                />
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  AI-powered lead generation — we analyse your role and market
                  focus to suggest high-fit companies for outreach.
                </p>
                {form.prospectsEnabled && (
                  <div className="space-y-4 pt-1 border-t border-[var(--border)]">
                    <div className="pt-3">
                      <label className={labelClass}>
                        New Prospects Per Report
                      </label>
                      <div className="flex gap-2">
                        {([1, 2, 3, 4, 5] as const).map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => update({ prospectsPerReport: n })}
                            className={`w-11 h-11 rounded-lg text-sm font-semibold transition-all ${
                              form.prospectsPerReport === n
                                ? "bg-[var(--accent)] text-[var(--accent-foreground)] ring-1 ring-[var(--accent)]"
                                : "border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={labelClass + " inline-flex items-center"}>
                        Focus Area / Regions <HelpTooltip examples={["Tanker operators in the Gulf", "Dry bulk shipowners — Greece, Japan", "Shipyards and repair yards seeking OEM partnerships"]} />
                      </label>
                      <input
                        type="text"
                        value={form.prospectsFocusAreas}
                        onChange={(e) =>
                          update({ prospectsFocusAreas: e.target.value })
                        }
                        placeholder="e.g. Tanker operators in the Gulf"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Market Pulse Module */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4">
                <Toggle
                  enabled={form.marketPulseEnabled}
                  onToggle={() =>
                    update({ marketPulseEnabled: !form.marketPulseEnabled })
                  }
                  label="Market Pulse"
                />
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Track live market data — bunker prices, freight indexes, and
                  key rates relevant to your operations.
                </p>
                {form.marketPulseEnabled && (
                  <div className="space-y-4 pt-1 border-t border-[var(--border)]">
                    <div className="pt-3">
                      <label className={labelClass + " inline-flex items-center"}>Data to Track <HelpTooltip examples={["Bunker Prices SG, Baltic Dry Index", "VLSFO Rotterdam, Capesize FFA Q3", "Marine coating market prices, newbuild order book"]} /></label>
                      <input
                        type="text"
                        value={form.marketPulseDataToTrack}
                        onChange={(e) =>
                          update({ marketPulseDataToTrack: e.target.value })
                        }
                        placeholder="e.g. Bunker Prices SG, Freight Indexes, Baltic Dry Index"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Regulatory Timeline Module */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4">
                <Toggle
                  enabled={form.regulatoryTimelineEnabled}
                  onToggle={() =>
                    update({ regulatoryTimelineEnabled: !form.regulatoryTimelineEnabled })
                  }
                  label="Regulatory Timeline"
                />
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Countdown tracker for upcoming regulatory deadlines from IMO,
                  USCG, EU, and DNV — so nothing catches you off guard.
                </p>
                {form.regulatoryTimelineEnabled && (
                  <div className="space-y-4 pt-1 border-t border-[var(--border)]">
                    <div className="pt-3">
                      <label className={labelClass + " inline-flex items-center"}>
                        Specific Regulations to Track <HelpTooltip examples={["IMO CII ratings, EU ETS maritime phase-in", "USCG ballast water management compliance deadlines", "DNV class renewal requirements, MARPOL Annex VI updates"]} />
                      </label>
                      <input
                        type="text"
                        value={form.regulatoryTimelineRegulations}
                        onChange={(e) =>
                          update({ regulatoryTimelineRegulations: e.target.value })
                        }
                        placeholder="e.g. IMO CII ratings, EU ETS shipping, USCG BWMS deadlines"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Off-Duty Module */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4">
                <Toggle
                  enabled={form.offDutyEnabled}
                  onToggle={() =>
                    update({ offDutyEnabled: !form.offDutyEnabled })
                  }
                  label="Off-Duty Module"
                />
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Add a personal interest section to your brief — hobbies,
                  sports, or anything you follow outside of work.
                </p>
                {form.offDutyEnabled && (
                  <div className="space-y-4 pt-1 border-t border-[var(--border)]">
                    <div className="pt-3">
                      <label className={labelClass + " inline-flex items-center"}>
                        What do you follow outside of work? <HelpTooltip examples={["Formula 1, Premier League football", "Cycling, tech startups, wine regions", "Golf tournaments, yacht racing, aviation"]} />
                      </label>
                      <input
                        type="text"
                        value={form.offDutyInterests}
                        onChange={(e) =>
                          update({ offDutyInterests: e.target.value })
                        }
                        placeholder="e.g. Formula 1, Premier League football, deep-sea fishing"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Competitor Tracker Module */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4">
                <Toggle
                  enabled={form.competitorTrackerEnabled}
                  onToggle={() =>
                    update({ competitorTrackerEnabled: !form.competitorTrackerEnabled })
                  }
                  label="Competitor Tracker"
                />
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Monitor specific companies — we track their press releases,
                  fleet moves, contract wins, and industry news so you stay one
                  step ahead.
                </p>
                {form.competitorTrackerEnabled && (
                  <div className="space-y-4 pt-1 border-t border-[var(--border)]">
                    <div className="pt-3">
                      <label className={labelClass + " inline-flex items-center"}>
                        Companies to Track <HelpTooltip examples={["Maersk, Hafnia, BW Group — fleet operator tracking competitor moves", "Wartsila, MAN Energy — tech provider monitoring rival product launches", "V.Group, Wilhelmsen — service company watching for contract wins and partnerships"]} />
                      </label>
                      <input
                        type="text"
                        value={form.competitorTrackerCompanies}
                        onChange={(e) =>
                          update({ competitorTrackerCompanies: e.target.value })
                        }
                        placeholder="e.g. Maersk, Hapag-Lloyd, BW Group, Stena Bulk"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Safety Intelligence Module */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4">
                <Toggle
                  enabled={form.safetyEnabled}
                  onToggle={() =>
                    update({ safetyEnabled: !form.safetyEnabled })
                  }
                  label="Safety Intelligence"
                />
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Track maritime safety incidents, security threats, and
                  technical safety updates — crew welfare, asset protection,
                  and operational risk intelligence.
                </p>
                {form.safetyEnabled && (
                  <div className="space-y-4 pt-1 border-t border-[var(--border)]">
                    <div className="pt-3">
                      <label className={labelClass + " inline-flex items-center"}>
                        Specific Safety/Security Areas to Track <HelpTooltip examples={["Piracy alerts — Red Sea, Gulf of Guinea", "Hazardous cargo incidents & DG handling", "Shipyard safety protocols & near-miss reports"]} />
                      </label>
                      <input
                        type="text"
                        value={form.safetyAreas}
                        onChange={(e) =>
                          update({ safetyAreas: e.target.value })
                        }
                        placeholder="e.g. Red Sea piracy alerts, SOLAS fire safety, H2S cargo handling"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Vessel Arrivals Module — UNDER CONSTRUCTION */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4 opacity-60" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255,180,0,0.04) 10px, rgba(255,180,0,0.04) 20px)" }}>
                <Toggle
                  enabled={form.vesselArrivalsEnabled}
                  onToggle={() =>
                    update({ vesselArrivalsEnabled: !form.vesselArrivalsEnabled })
                  }
                  label="Vessel Arrivals"
                />
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    Under Construction
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Track vessel arrivals at key ports — filtered by vessel type
                  and timeframe. Coming soon.
                </p>
                {form.vesselArrivalsEnabled && (
                  <div className="space-y-4 pt-1 border-t border-[var(--border)]">
                    <div className="pt-3">
                      <label className={labelClass + " inline-flex items-center"}>
                        Port <HelpTooltip examples={["Singapore — busiest bunkering hub, ideal for tanker operators", "Dubai — Middle East gateway for offshore and LPG traffic", "Houston — US Gulf energy corridor for bulk and chemical carriers"]} />
                      </label>
                      <select
                        value={form.vesselArrivalsPort}
                        onChange={(e) => update({ vesselArrivalsPort: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">Select port</option>
                        <option value="Singapore">Singapore</option>
                        <option value="Dubai">Dubai</option>
                        <option value="Houston">Houston</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Vessel Type</label>
                      <select
                        value={form.vesselArrivalsVesselType}
                        onChange={(e) => update({ vesselArrivalsVesselType: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">Select vessel type</option>
                        <option value="Tanker">Tanker</option>
                        <option value="Bulker">Bulker</option>
                        <option value="LPG">LPG</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Timeframe</label>
                      <select
                        value={form.vesselArrivalsTimeframe}
                        onChange={(e) => update({ vesselArrivalsTimeframe: e.target.value })}
                        className={inputClass}
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
          </section>

          {/* ── Frequency & Delivery ── */}
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <SectionHeader
              icon={<IconClock />}
              title="Frequency & Depth"
              subtitle="How often and how detailed your briefs are"
              helpExamples={[
                "Business Days + Executive Summary — concise brief every weekday",
                "Daily + Deep Dive — comprehensive coverage, no gaps",
                "3x Week + Data Only — pure numbers for OEM sales teams",
              ]}
            />

            <div className="space-y-6">
              <div>
                <label className={labelClass}>Report Frequency</label>
                <div className="grid grid-cols-3 gap-3">
                  <OptionCard
                    selected={form.frequency === "business"}
                    onClick={() => update({ frequency: "business" })}
                    title="Business Days"
                    description="Mon - Fri"
                  />
                  <OptionCard
                    selected={form.frequency === "3x"}
                    onClick={() => update({ frequency: "3x" })}
                    title="3x Week"
                    description="Mon, Wed, Fri (Recommended for Deep Dives)"
                  />
                  <OptionCard
                    selected={form.frequency === "weekly"}
                    onClick={() => update({ frequency: "weekly" })}
                    title="Weekly"
                    description="Once a week"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass + " inline-flex items-center"}>
                  Report Depth <HelpTooltip examples={[
                    "Executive Summary — 3-5 bullet points per topic, key headlines only. \"IMO approved CII tightening — your B-rated bulkers may slip to C by 2027.\"",
                    "Deep Dive — full paragraphs with context, analysis, and source links. Covers background, implications, and recommended actions for each story.",
                    "Data Only — pure tables and numbers: charter rates, bunker prices, index movements. No narrative, just the data you need for dashboards and models."
                  ]} />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <OptionCard
                    selected={form.depth === "executive"}
                    onClick={() => update({ depth: "executive" })}
                    title="Executive Summary"
                    description="~1 min read"
                  />
                  <OptionCard
                    selected={form.depth === "deep"}
                    onClick={() => update({ depth: "deep" })}
                    title="Deep Dive"
                    description="~5 min read"
                  />
                  <OptionCard
                    selected={form.depth === "data"}
                    onClick={() => update({ depth: "data" })}
                    title="Data Only"
                    description="Numbers & tables"
                  />
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-3 leading-relaxed italic">
                  Note: Selecting Daily + Deep Dive produces 7 comprehensive reports per week. Consider starting with Business Days for a better balance of coverage and volume.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Timezone</label>
                  <select
                    value={form.timezone}
                    onChange={(e) => update({ timezone: e.target.value })}
                    className={inputClass}
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
                  <label className={labelClass}>Delivery Time</label>
                  <select
                    value={form.deliveryTime}
                    onChange={(e) => update({ deliveryTime: e.target.value })}
                    className={inputClass}
                  >
                    {["06:00", "07:00", "08:00", "09:00", "12:00", "13:00", "17:00", "18:00"].map(
                      (t) => (
                        <option key={t} value={t}>{t}</option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* ── Monthly Review ── */}
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <SectionHeader
              icon={<IconCalendar />}
              title="Monthly Review"
              subtitle="Topics for your end-of-month strategic summary"
              helpExamples={[
                "Updated sanctions list for Russia/Iran",
                "Global scrapping stats and newbuild order book",
                "Competitive landscape — new product launches from rival OEMs",
              ]}
            />
            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  What would you like in your monthly strategic review?
                </label>
                <textarea
                  value={form.monthlyReview}
                  onChange={(e) => update({ monthlyReview: e.target.value })}
                  placeholder="One topic per line — e.g. Updated sanction lists"
                  rows={4}
                  className={textareaClass}
                />
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4">
                <Toggle
                  enabled={form.monthlyProspectRollupEnabled}
                  onToggle={() =>
                    update({ monthlyProspectRollupEnabled: !form.monthlyProspectRollupEnabled })
                  }
                  label="Monthly Prospect Roll-up"
                />
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Include a summary of all prospects surfaced during the month
                  in your monthly strategic review — ranked by fit and engagement
                  potential.
                </p>
              </div>
            </div>
          </section>

          {/* ── Save ── */}
          <div className="flex items-center gap-4 py-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saved && (
              <span className="text-sm text-[var(--accent)] font-medium">
                Settings saved successfully.
              </span>
            )}
            {error && (
              <span className="text-sm text-red-400 font-medium">{error}</span>
            )}
          </div>

          {/* ── Security ── */}
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <SectionHeader
              icon={<IconShield />}
              title="Security"
              subtitle="Manage your password and session"
            />
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={
                    pwChanging ||
                    !currentPassword ||
                    newPassword.length < 8
                  }
                  onClick={async () => {
                    setPwChanging(true);
                    setPwError("");
                    setPwSuccess(false);
                    try {
                      const res = await fetch("/api/auth/change-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ currentPassword, newPassword }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setPwSuccess(true);
                        setCurrentPassword("");
                        setNewPassword("");
                        setTimeout(() => setPwSuccess(false), 3000);
                      } else {
                        setPwError(data.error || "Failed to change password");
                      }
                    } catch {
                      setPwError("Network error — please try again.");
                    } finally {
                      setPwChanging(false);
                    }
                  }}
                  className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {pwChanging ? "Updating..." : "Update Password"}
                </button>
                {pwSuccess && (
                  <span className="text-sm text-[var(--accent)] font-medium">
                    Password updated.
                  </span>
                )}
                {pwError && (
                  <span className="text-sm text-red-400 font-medium">
                    {pwError}
                  </span>
                )}
              </div>

              <div className="border-t border-[var(--border)] pt-4 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Sign Out</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      End your current session
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      localStorage.removeItem("iqsea_subscriber_id");
                      localStorage.removeItem("iqsea_email");
                      router.push("/login");
                    }}
                    className="flex items-center gap-2 rounded-lg border border-red-500/30 px-5 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
                  >
                    <IconLogout />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

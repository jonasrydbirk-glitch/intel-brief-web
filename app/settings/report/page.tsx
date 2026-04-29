"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IQseaLogoNav } from "../../components/iqsea-logo";
import { LogoutButton } from "../../components/logout-button";
import { HelpTooltip } from "../../components/help-tooltip";
import { PasswordInput } from "../../components/password-input";
import { DepthPreview } from "../../components/depth-preview";
import { DELIVERY_TIMES } from "../../../lib/constants";

/* ────── types ────── */

interface ProfileData {
  id: string;
  email: string;
  fullName?: string;
  companyName?: string;
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
    monthlyProspectRollup?: { enabled: boolean }; // legacy — kept for backward-compat read
    monthlyLeadSummary?: { enabled: boolean };
    monthlyTenderSummary?: { enabled: boolean };
  };
  monthlyReviewDay?: number | "last";
  monthlyReviewTime?: string;
  frequency: string;
  depth: string;
  timezone: string;
  deliveryTime: string;
  monthlyReview: string[];
}

interface FormState {
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

const PLACEHOLDER: FormState = {
  fullName: "",
  companyName: "",
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
  industryChatterEnabled: false,
  earningsCallEnabled: false,
  earningsCallCompanies: "",
  safetyEnabled: false,
  safetyAreas: "",
  frequency: "business",
  depth: "executive",
  timezone: "",
  deliveryTime: "08:00",
  monthlyReview: "Updated sanction lists\nGlobal scrapping stats for 2026",
  monthlyLeadSummaryEnabled: false,
  monthlyTenderSummaryEnabled: false,
  monthlyReviewDay: 1,
  monthlyReviewTime: "08:00",
};

function profileToForm(p: ProfileData): FormState {
  return {
    fullName: p.fullName || "",
    companyName: p.companyName || "",
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
    industryChatterEnabled: false,
    earningsCallEnabled: false,
    earningsCallCompanies: "",
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
    // monthlyLeadSummary: read new key, fall back to legacy monthlyProspectRollup for existing subscribers
    monthlyLeadSummaryEnabled:
      p.modules?.monthlyLeadSummary?.enabled ?? p.modules?.monthlyProspectRollup?.enabled ?? false,
    monthlyTenderSummaryEnabled: p.modules?.monthlyTenderSummary?.enabled ?? false,
    monthlyReviewDay: p.monthlyReviewDay ?? 1,
    monthlyReviewTime: p.monthlyReviewTime ?? p.deliveryTime ?? "08:00",
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

/* ────── sidebar sections ────── */

type SectionId =
  | "profile"
  | "assets"
  | "subjects"
  | "modules"
  | "delivery"
  | "monthly"
  | "security";

const SECTIONS: Array<{
  id: SectionId;
  label: string;
  Icon: () => React.ReactElement;
  required: boolean;
}> = [
  { id: "profile",  label: "Profile",        Icon: IconUser,     required: true  },
  { id: "assets",   label: "Asset Focus",     Icon: IconShip,     required: true  },
  { id: "subjects", label: "Intel Subjects",  Icon: IconTarget,   required: true  },
  { id: "modules",  label: "Modules",         Icon: IconPuzzle,   required: false },
  { id: "delivery", label: "Delivery",        Icon: IconClock,    required: true  },
  { id: "monthly",  label: "Monthly Review",  Icon: IconCalendar, required: false },
  { id: "security", label: "Security",        Icon: IconShield,   required: false },
];

/* ────── summary strip ────── */

function SummaryStrip({ form }: { form: FormState }) {
  const freqLabel: Record<string, string> = {
    business: "Business Days",
    "3x": "3× Week",
    weekly: "Weekly",
    daily: "Daily",
  };
  const depthLabel: Record<string, string> = {
    executive: "Executive Summary",
    deep: "Deep Dive",
    data: "Data Only",
  };
  const enabledCount = [
    form.tenderEnabled,
    form.prospectsEnabled,
    form.marketPulseEnabled,
    form.regulatoryTimelineEnabled,
    form.offDutyEnabled,
    form.competitorTrackerEnabled,
    form.safetyEnabled,
    form.monthlyLeadSummaryEnabled,
    form.monthlyTenderSummaryEnabled,
  ].filter(Boolean).length;

  const tzShort = form.timezone
    ? form.timezone.split("/").pop()?.replace(/_/g, " ")
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted-foreground)] mt-1.5">
      <span className="font-medium text-[var(--foreground)]">
        {freqLabel[form.frequency] ?? form.frequency}
      </span>
      <span className="opacity-30">·</span>
      <span>{form.deliveryTime}</span>
      {tzShort && (
        <>
          <span className="opacity-30">·</span>
          <span>{tzShort}</span>
        </>
      )}
      <span className="opacity-30">·</span>
      <span>{depthLabel[form.depth] ?? form.depth}</span>
      <span className="opacity-30">·</span>
      <span className={enabledCount > 0 ? "text-[#53b1c1]" : ""}>
        {enabledCount} module{enabledCount !== 1 ? "s" : ""} active
      </span>
    </div>
  );
}

/* ────── module card ────── */

interface ModuleCardProps {
  id: string;
  title: string;
  enabled: boolean;
  isUC?: boolean;
  description: string;
  configSummary?: string;
  expanded: boolean;
  onToggle: () => void;
  onExpandToggle: () => void;
  children?: React.ReactNode;
}

function ModuleCard({
  title,
  enabled,
  isUC,
  description,
  configSummary,
  expanded,
  onToggle,
  onExpandToggle,
  children,
}: ModuleCardProps) {
  const statusChip = isUC ? (
    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25 whitespace-nowrap">
      Under Construction
    </span>
  ) : enabled ? (
    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#53b1c1]/20 text-[#53b1c1] border border-[#53b1c1]/30 whitespace-nowrap">
      Enabled
    </span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/5 text-[var(--muted-foreground)]/50 border border-[var(--border)] whitespace-nowrap">
      Disabled
    </span>
  );

  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-200 ${
        isUC
          ? "border-[var(--border)] bg-[var(--background)]/40 opacity-60"
          : expanded
          ? "border-[#53b1c1]/40 bg-[var(--card)] shadow-sm"
          : "border-[var(--border)] bg-[var(--card)] hover:border-[#53b1c1]/30 cursor-pointer"
      }`}
      style={
        isUC
          ? {
              backgroundImage:
                "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255,180,0,0.04) 10px, rgba(255,180,0,0.04) 20px)",
            }
          : undefined
      }
      onClick={!isUC ? onExpandToggle : undefined}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <h3 className="text-sm font-semibold leading-snug">{title}</h3>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {statusChip}
          {!isUC && (
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform duration-200 shrink-0 ${
                expanded ? "rotate-180" : ""
              }`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5l5 5 5-5" />
            </svg>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
        {description}
      </p>

      {/* Config summary — shown when enabled + collapsed */}
      {!isUC && enabled && !expanded && configSummary && (
        <p className="mt-2 text-xs text-[#53b1c1]/80 font-medium truncate">
          {configSummary}
        </p>
      )}

      {/* Expanded content */}
      {!isUC && expanded && (
        <div
          className="mt-4 pt-4 border-t border-[var(--border)] space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <Toggle enabled={enabled} onToggle={onToggle} label={`Enable ${title}`} />
          {enabled && children && (
            <div className="space-y-4 pt-2">{children}</div>
          )}
        </div>
      )}
    </div>
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
  const [dirty, setDirty] = useState(false);

  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const [paused, setPaused] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwChanging, setPwChanging] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");

  const update = (partial: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    setDirty(true);
  };

  const setSubject = (idx: 0 | 1 | 2, val: string) => {
    const next: [string, string, string] = [...form.subjects];
    next[idx] = val;
    update({ subjects: next });
  };

  const toggleModule = (id: string) =>
    setExpandedModule((cur) => (cur === id ? null : id));

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const profile: ProfileData & { paused?: boolean } = await res.json();
          setProfileId(profile.id);
          setForm(profileToForm(profile));
          setPaused(profile.paused ?? false);
          setDirty(false);
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
      setDirty(false);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePause() {
    if (!profileId) return;
    setPauseBusy(true);
    const action = paused ? "resume" : "pause";
    try {
      if (action === "resume") {
        const res = await fetch("/api/settings/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: profileId, paused: false }),
        });
        if (res.ok) setPaused(false);
      } else {
        const res = await fetch("/api/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriberId: profileId, action: "pause" }),
        });
        if (res.ok) setPaused(true);
      }
    } catch {
      // swallow — UI stays unchanged
    } finally {
      setPauseBusy(false);
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

  // ── section renderers ─────────────────────────────────────────────────────

  function renderProfile() {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => update({ fullName: e.target.value })}
                placeholder="e.g. James Hargreaves"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Company Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => update({ companyName: e.target.value })}
                placeholder="e.g. Pacific Bulk Carriers"
                className={inputClass}
              />
            </div>
          </div>
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
        </div>
      </div>
    );
  }

  function renderAssets() {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
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
      </div>
    );
  }

  function renderSubjects() {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
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
      </div>
    );
  }

  function renderModules() {
    const modules: ModuleCardProps[] = [
      {
        id: "tender",
        title: "Tender Module",
        enabled: form.tenderEnabled,
        description:
          "Track maritime and offshore tender opportunities relevant to your profile.",
        configSummary:
          [form.tenderRegion, form.tenderType].filter(Boolean).join(" · ") ||
          undefined,
        onToggle: () => update({ tenderEnabled: !form.tenderEnabled }),
        expanded: expandedModule === "tender",
        onExpandToggle: () => toggleModule("tender"),
        children: (
          <>
            <div>
              <label className={labelClass + " inline-flex items-center"}>
                Focus Region{" "}
                <HelpTooltip
                  examples={[
                    "South East Asia, Middle East",
                    "West Africa, North Sea",
                    "Global — offshore wind installation tenders",
                  ]}
                />
              </label>
              <input
                type="text"
                value={form.tenderRegion}
                onChange={(e) => update({ tenderRegion: e.target.value })}
                placeholder="e.g. South East Asia, Middle East"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass + " inline-flex items-center"}>
                Tender Type{" "}
                <HelpTooltip
                  examples={[
                    "Public procurement, time charter",
                    "Offshore wind, FPSO conversion",
                    "Equipment supply — propulsion systems",
                  ]}
                />
              </label>
              <input
                type="text"
                value={form.tenderType}
                onChange={(e) => update({ tenderType: e.target.value })}
                placeholder="e.g. Public procurement, Offshore wind"
                className={inputClass}
              />
            </div>
          </>
        ),
      },
      {
        id: "prospects",
        title: "Client Prospects",
        enabled: form.prospectsEnabled,
        description:
          "AI-powered lead generation — we analyse your role and market focus to suggest high-fit companies for outreach.",
        configSummary: form.prospectsEnabled
          ? `${form.prospectsPerReport} per report${form.prospectsFocusAreas ? ` · ${form.prospectsFocusAreas}` : ""}`
          : undefined,
        onToggle: () => update({ prospectsEnabled: !form.prospectsEnabled }),
        expanded: expandedModule === "prospects",
        onExpandToggle: () => toggleModule("prospects"),
        children: (
          <>
            <div>
              <label className={labelClass}>New Prospects Per Report</label>
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      update({ prospectsPerReport: n });
                    }}
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
                Focus Area / Regions{" "}
                <HelpTooltip
                  examples={[
                    "Tanker operators in the Gulf",
                    "Dry bulk shipowners — Greece, Japan",
                    "Shipyards and repair yards seeking OEM partnerships",
                  ]}
                />
              </label>
              <input
                type="text"
                value={form.prospectsFocusAreas}
                onChange={(e) => update({ prospectsFocusAreas: e.target.value })}
                placeholder="e.g. Tanker operators in the Gulf"
                className={inputClass}
              />
            </div>
          </>
        ),
      },
      {
        id: "marketPulse",
        title: "Market Pulse",
        enabled: form.marketPulseEnabled,
        description:
          "Track live market data — bunker prices, freight indexes, and key rates relevant to your operations.",
        configSummary: form.marketPulseDataToTrack || undefined,
        onToggle: () => update({ marketPulseEnabled: !form.marketPulseEnabled }),
        expanded: expandedModule === "marketPulse",
        onExpandToggle: () => toggleModule("marketPulse"),
        children: (
          <div>
            <label className={labelClass + " inline-flex items-center"}>
              Data to Track{" "}
              <HelpTooltip
                examples={[
                  "Bunker Prices SG, Baltic Dry Index",
                  "VLSFO Rotterdam, Capesize FFA Q3",
                  "Marine coating market prices, newbuild order book",
                ]}
              />
            </label>
            <input
              type="text"
              value={form.marketPulseDataToTrack}
              onChange={(e) => update({ marketPulseDataToTrack: e.target.value })}
              placeholder="e.g. Bunker Prices SG, Freight Indexes, Baltic Dry Index"
              className={inputClass}
            />
          </div>
        ),
      },
      {
        id: "regulatoryTimeline",
        title: "Regulatory Timeline",
        enabled: form.regulatoryTimelineEnabled,
        description:
          "Countdown tracker for upcoming regulatory deadlines from IMO, USCG, EU, and DNV — so nothing catches you off guard.",
        configSummary: form.regulatoryTimelineRegulations || undefined,
        onToggle: () =>
          update({
            regulatoryTimelineEnabled: !form.regulatoryTimelineEnabled,
          }),
        expanded: expandedModule === "regulatoryTimeline",
        onExpandToggle: () => toggleModule("regulatoryTimeline"),
        children: (
          <div>
            <label className={labelClass + " inline-flex items-center"}>
              Specific Regulations to Track{" "}
              <HelpTooltip
                examples={[
                  "IMO CII ratings, EU ETS maritime phase-in",
                  "USCG ballast water management compliance deadlines",
                  "DNV class renewal requirements, MARPOL Annex VI updates",
                ]}
              />
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
        ),
      },
      {
        id: "offDuty",
        title: "Off-Duty Module",
        enabled: form.offDutyEnabled,
        description:
          "Add a personal interest section to your brief — hobbies, sports, or anything you follow outside of work.",
        configSummary: form.offDutyInterests || undefined,
        onToggle: () => update({ offDutyEnabled: !form.offDutyEnabled }),
        expanded: expandedModule === "offDuty",
        onExpandToggle: () => toggleModule("offDuty"),
        children: (
          <div>
            <label className={labelClass + " inline-flex items-center"}>
              What do you follow outside of work?{" "}
              <HelpTooltip
                examples={[
                  "Formula 1, Premier League football",
                  "Cycling, tech startups, wine regions",
                  "Golf tournaments, yacht racing, aviation",
                ]}
              />
            </label>
            <input
              type="text"
              value={form.offDutyInterests}
              onChange={(e) => update({ offDutyInterests: e.target.value })}
              placeholder="e.g. Formula 1, Premier League football, deep-sea fishing"
              className={inputClass}
            />
          </div>
        ),
      },
      {
        id: "competitorTracker",
        title: "Competitor Tracker",
        enabled: form.competitorTrackerEnabled,
        description:
          "Monitor specific companies — we track their press releases, fleet moves, contract wins, and industry news so you stay one step ahead.",
        configSummary: form.competitorTrackerCompanies || undefined,
        onToggle: () =>
          update({
            competitorTrackerEnabled: !form.competitorTrackerEnabled,
          }),
        expanded: expandedModule === "competitorTracker",
        onExpandToggle: () => toggleModule("competitorTracker"),
        children: (
          <div>
            <label className={labelClass + " inline-flex items-center"}>
              Companies to Track{" "}
              <HelpTooltip
                examples={[
                  "Maersk, Hafnia, BW Group — fleet operator tracking competitor moves",
                  "Wartsila, MAN Energy — tech provider monitoring rival product launches",
                  "V.Group, Wilhelmsen — service company watching for contract wins and partnerships",
                ]}
              />
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
        ),
      },
      {
        id: "safety",
        title: "Safety Intelligence",
        enabled: form.safetyEnabled,
        description:
          "Track maritime safety incidents, security threats, and technical safety updates — crew welfare, asset protection, and operational risk intelligence.",
        configSummary: form.safetyAreas || undefined,
        onToggle: () => update({ safetyEnabled: !form.safetyEnabled }),
        expanded: expandedModule === "safety",
        onExpandToggle: () => toggleModule("safety"),
        children: (
          <div>
            <label className={labelClass + " inline-flex items-center"}>
              Specific Safety/Security Areas to Track{" "}
              <HelpTooltip
                examples={[
                  "Piracy alerts — Red Sea, Gulf of Guinea",
                  "Hazardous cargo incidents & DG handling",
                  "Shipyard safety protocols & near-miss reports",
                ]}
              />
            </label>
            <input
              type="text"
              value={form.safetyAreas}
              onChange={(e) => update({ safetyAreas: e.target.value })}
              placeholder="e.g. Red Sea piracy alerts, SOLAS fire safety, H2S cargo handling"
              className={inputClass}
            />
          </div>
        ),
      },
      // Under Construction modules
      {
        id: "vesselArrivals",
        title: "Vessel Arrivals",
        enabled: form.vesselArrivalsEnabled,
        isUC: true,
        description:
          "Track vessel arrivals at key ports — filtered by vessel type and timeframe. Coming soon.",
        onToggle: () =>
          update({ vesselArrivalsEnabled: !form.vesselArrivalsEnabled }),
        expanded: false,
        onExpandToggle: () => {},
      },
      {
        id: "industryChatter",
        title: "Industry Chatter",
        enabled: form.industryChatterEnabled,
        isUC: true,
        description:
          "Stay ahead of the conversation — surface what shipowners, brokers, and operators are actually talking about across industry forums and social channels. Know the sentiment before it moves the market.",
        onToggle: () =>
          update({ industryChatterEnabled: !form.industryChatterEnabled }),
        expanded: false,
        onExpandToggle: () => {},
      },
      {
        id: "earningsCall",
        title: "Earnings Call Summary",
        enabled: form.earningsCallEnabled,
        isUC: true,
        description:
          "Never sit through another three-hour earnings call. Get the key signals — fleet growth plans, rate outlooks, and management guidance — extracted and translated into plain maritime intelligence.",
        onToggle: () =>
          update({ earningsCallEnabled: !form.earningsCallEnabled }),
        expanded: false,
        onExpandToggle: () => {},
      },
    ];

    return (
      <div className="space-y-5">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-5">
          <SectionHeader
            icon={<IconPuzzle />}
            title="Advanced Intel Modules"
            subtitle="Optional add-ons to enrich your brief with specialised data"
          />
          <p className="text-xs text-[var(--muted-foreground)] -mt-2">
            Click any card to expand and configure. Modules marked{" "}
            <span className="text-amber-400 font-medium">Under Construction</span>{" "}
            are coming soon.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {modules.map((mod) => (
            <ModuleCard key={mod.id} {...mod} />
          ))}
        </div>
      </div>
    );
  }

  function renderDelivery() {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
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
              Report Depth{" "}
              <HelpTooltip
                examples={[
                  'Executive Summary — 3-5 bullet points per topic, key headlines only. "IMO approved CII tightening — your B-rated bulkers may slip to C by 2027."',
                  "Deep Dive — full paragraphs with context, analysis, and source links. Covers background, implications, and recommended actions for each story.",
                  "Weekly Digest — your 2 most important stories of the week. Full narrative, analyst commentary, and why it matters.",
                ]}
              />
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
                title="Weekly Digest"
                description="Your week's 2 most important stories. Full narrative, analyst commentary, and why it matters."
              />
            </div>
            <DepthPreview depth={form.depth || "deep"} />
          </div>

          <div>
            <label className={labelClass}>Delivery Time</label>
            <select
              value={form.deliveryTime}
              onChange={(e) => update({ deliveryTime: e.target.value })}
              className={inputClass}
            >
              {DELIVERY_TIMES.map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>
    );
  }

  function renderMonthly() {
    const dayOptions: Array<{ value: number | "last"; label: string }> = [
      ...Array.from({ length: 28 }, (_, i) => ({ value: i + 1 as number, label: String(i + 1) })),
      { value: "last", label: "Last day of month" },
    ];

    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <SectionHeader
          icon={<IconCalendar />}
          title="Monthly Review"
          subtitle="Topics and timing for your end-of-month strategic summary"
          helpExamples={[
            "Updated sanctions list for Russia/Iran",
            "Global scrapping stats and newbuild order book",
            "Competitive landscape — new product launches from rival OEMs",
          ]}
        />
        <div className="space-y-5">
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

          {/* Content toggles */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Content rollups
            </p>
            <div className="space-y-3">
              <Toggle
                enabled={form.monthlyLeadSummaryEnabled}
                onToggle={() => update({ monthlyLeadSummaryEnabled: !form.monthlyLeadSummaryEnabled })}
                label="Include Lead / Prospect summary"
              />
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed pl-14">
                A ranked roll-up of all prospects surfaced during the month — fit score, engagement signals, and cumulative intelligence.
              </p>
            </div>
            <div className="space-y-3 pt-1">
              <Toggle
                enabled={form.monthlyTenderSummaryEnabled}
                onToggle={() => update({ monthlyTenderSummaryEnabled: !form.monthlyTenderSummaryEnabled })}
                label="Include Tender summary"
              />
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed pl-14">
                A consolidated list of all tenders captured during the month, grouped by region and deadline proximity.
              </p>
            </div>
          </div>

          {/* Delivery timing */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Monthly delivery timing
            </p>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed -mt-1">
              Uses your profile timezone ({form.timezone ? form.timezone.split("/").pop()?.replace(/_/g, " ") : "not set"}).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Day of month</label>
                <select
                  value={String(form.monthlyReviewDay)}
                  onChange={(e) => {
                    const v = e.target.value;
                    update({ monthlyReviewDay: v === "last" ? "last" : Number(v) });
                  }}
                  className={inputClass}
                >
                  {dayOptions.map((opt) => (
                    <option key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Delivery time</label>
                <select
                  value={form.monthlyReviewTime}
                  onChange={(e) => update({ monthlyReviewTime: e.target.value })}
                  className={inputClass}
                >
                  {DELIVERY_TIMES.map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSecurity() {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <SectionHeader
          icon={<IconShield />}
          title="Security"
          subtitle="Manage your password and session"
        />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Current Password</label>
              <PasswordInput
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>New Password</label>
              <PasswordInput
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
              disabled={pwChanging || !currentPassword || newPassword.length < 8}
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
              className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {pwChanging ? "Updating..." : "Update Password"}
            </button>
            {pwSuccess && (
              <span className="text-sm text-[var(--accent)] font-medium">
                Password updated.
              </span>
            )}
            {pwError && (
              <span className="text-sm text-red-400 font-medium">{pwError}</span>
            )}
          </div>

          <div className="border-t border-[var(--border)] pt-4 mt-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">{paused ? "Resume Deliveries" : "Pause Deliveries"}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {paused ? "Start receiving Intel Briefs again" : "Temporarily stop receiving Intel Briefs"}
                </p>
              </div>
              <button
                type="button"
                onClick={togglePause}
                disabled={pauseBusy}
                className="flex items-center gap-2 rounded-full border border-amber-500/30 px-5 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pauseBusy ? (paused ? "Resuming…" : "Pausing…") : (paused ? "Resume" : "Pause")}
              </button>
            </div>
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
                className="flex items-center gap-2 rounded-full border border-red-500/30 px-5 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
              >
                <IconLogout />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSection() {
    switch (activeSection) {
      case "profile":  return renderProfile();
      case "assets":   return renderAssets();
      case "subjects": return renderSubjects();
      case "modules":  return renderModules();
      case "delivery": return renderDelivery();
      case "monthly":  return renderMonthly();
      case "security": return renderSecurity();
    }
  }

  const showSaveBar = dirty || saving || saved || !!error;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center">
            <IQseaLogoNav />
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

      <main className="flex-1">
        <div className="max-w-6xl mx-auto w-full px-6 py-8">

          {/* Paused banner */}
          {paused && (
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={1.5} className="w-4 h-4 shrink-0">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                <p className="text-sm text-amber-300">
                  <span className="font-semibold">Deliveries paused.</span>{" "}
                  You&apos;re not receiving Intel Briefs right now.
                </p>
              </div>
              <button
                onClick={togglePause}
                disabled={pauseBusy}
                className="shrink-0 px-4 py-1.5 rounded-full border border-amber-500/40 text-xs font-medium text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
              >
                {pauseBusy ? "Resuming…" : "Resume deliveries"}
              </button>
            </div>
          )}

          {/* Page title + summary strip */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <SummaryStrip form={form} />
          </div>

          {/* Mobile: horizontal scroll pill nav */}
          <div className="md:hidden overflow-x-auto pb-1 mb-5 -mx-1">
            <div className="flex gap-2 px-1 min-w-max">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    activeSection === s.id
                      ? "bg-[#53b1c1]/20 text-[#53b1c1] border border-[#53b1c1]/40"
                      : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop: two-column layout */}
          <div className="flex gap-8 items-start">

            {/* Sidebar — desktop only */}
            <aside className="hidden md:block w-56 shrink-0 sticky top-20">
              <ul className="space-y-0.5">
                {SECTIONS.map((s) => {
                  const isActive = activeSection === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setActiveSection(s.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                          isActive
                            ? "bg-[#53b1c1]/15 text-[#53b1c1] font-medium"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? "" : "opacity-60"
                          }`}
                        >
                          <s.Icon />
                        </span>
                        <span className="flex-1">{s.label}</span>
                        {!s.required && (
                          <span className="text-[10px] text-[var(--muted-foreground)]/50 font-normal">
                            opt
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Content column */}
            <div className="flex-1 min-w-0 pb-24">
              {renderSection()}
            </div>

          </div>
        </div>
      </main>

      {/* Fixed save bar — fades in on unsaved changes */}
      <div
        className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ${
          showSaveBar
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 bg-[var(--card)]/95 backdrop-blur-sm border border-[var(--border)] rounded-2xl px-5 py-3 shadow-2xl">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              dirty
                ? "bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-110 shadow-md shadow-[#53b1c1]/20"
                : "bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-110"
            }`}
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
          </button>
          {error && (
            <span className="text-sm text-red-400 font-medium">{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}

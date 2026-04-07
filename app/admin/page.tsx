"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IQseaLogoSmall } from "../components/iqsea-logo";

interface Subscriber {
  id: string;
  email: string;
  fullName?: string;
  companyName?: string;
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
    marketPulse?: { enabled: boolean; dataToTrack?: string };
    offDuty?: { enabled: boolean; interests?: string };
    regulatoryTimeline?: { enabled: boolean; regulations?: string };
    competitorTracker?: { enabled: boolean; companies?: string };
    safety?: { enabled: boolean; areas?: string };
  };
  frequency: string;
  depth: string;
  monthlyReview: string[];
  tier: string;
  created: string;
  tweaks_used: number;
  tweaks_limit: number;
}

type NavSection = "overview" | "users" | "tenders" | "outreach" | "logs";

const NAV_ITEMS: { key: NavSection; label: string; icon: React.ReactNode }[] = [
  {
    key: "overview",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: "users",
    label: "Users",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "tenders",
    label: "Tenders",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    key: "outreach",
    label: "Outreach",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
      </svg>
    ),
  },
  {
    key: "logs",
    label: "System Logs",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
];

function StatusDot({ status }: { status: "online" | "idle" | "alert" }) {
  const colors = {
    online: "bg-emerald-400",
    idle: "bg-[var(--gold-500)]",
    alert: "bg-red-400",
  };
  return (
    <span className="relative flex h-2 w-2">
      {status === "online" && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colors[status]}`} />
    </span>
  );
}

export default function AdminDashboard() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [moduleStats, setModuleStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<NavSection>("overview");
  const [selectedUser, setSelectedUser] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        setSubscribers(data.subscribers || []);
        setModuleStats(data.moduleStats || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      if (res.ok) {
        setSubscribers((prev) => prev.filter((s) => s.id !== userId));
        setSelectedUser(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete user.");
      }
    } catch {
      alert("Network error — could not delete user.");
    } finally {
      setDeleting(false);
    }
  }

  function renderContent() {
    if (activeNav === "users") return renderUsersView();
    if (activeNav === "tenders") return renderPlaceholder("Tenders", "Tender tracking and pipeline management coming soon.");
    if (activeNav === "outreach") return renderPlaceholder("Outreach", "Client prospect outreach tracking coming soon.");
    if (activeNav === "logs") return renderPlaceholder("System Logs", "System event logs and audit trail coming soon.");
    return renderOverview();
  }

  function renderPlaceholder(title: string, desc: string) {
    return (
      <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth={1.5} className="w-5 h-5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-1 font-[family-name:var(--font-geist-mono)]">{title}</h2>
        <p className="text-sm text-[var(--muted-foreground)]">{desc}</p>
      </div>
    );
  }

  function renderOverview() {
    return (
      <>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "TOTAL USERS", value: subscribers.length },
            { label: "ACTIVE SUBSCRIPTIONS", value: subscribers.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: "var(--teal-500)" }} />
              <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-2 font-[family-name:var(--font-geist-mono)]">
                {stat.label}
              </div>
              <div className="text-2xl font-bold font-[family-name:var(--font-geist-mono)]">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Module Adoption */}
        <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4 mb-6">
          <h3 className="text-xs tracking-[0.15em] text-[var(--muted-foreground)] mb-4 font-[family-name:var(--font-geist-mono)]">
            MODULE ADOPTION
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {([
              { key: "tender", label: "TENDERS", color: "var(--teal-500)" },
              { key: "prospects", label: "PROSPECTS", color: "var(--gold-500)" },
              { key: "marketPulse", label: "MARKET PULSE", color: "#6366f1" },
              { key: "offDuty", label: "OFF-DUTY", color: "#a78bfa" },
              { key: "regulatoryTimeline", label: "REGULATORY", color: "#f59e0b" },
              { key: "competitorTracker", label: "COMPETITOR", color: "#ef4444" },
              { key: "safety", label: "SAFETY", color: "#10b981" },
            ] as const).map((mod) => {
              const count = moduleStats[mod.key] || 0;
              const pct = subscribers.length > 0 ? Math.round((count / subscribers.length) * 100) : 0;
              return (
                <div key={mod.key} className="bg-[var(--navy-800)] border border-[var(--border)] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] tracking-[0.1em] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
                      {mod.label}
                    </span>
                    <span className="text-[10px] font-[family-name:var(--font-geist-mono)]" style={{ color: mod.color }}>
                      {count}/{subscribers.length}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: mod.color }}
                    />
                  </div>
                  <div className="text-right text-sm font-bold font-[family-name:var(--font-geist-mono)]" style={{ color: mod.color }}>
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Status Bar */}
        <div className="flex items-center gap-4 mb-6 px-3 py-2 bg-[var(--navy-900)] border border-[var(--border)] rounded-lg text-xs font-[family-name:var(--font-geist-mono)] text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5"><StatusDot status="online" /> SYSTEMS NOMINAL</span>
          <span className="text-[var(--border)]">|</span>
          <span>BRIEF ENGINE: STANDBY</span>
          <span className="text-[var(--border)]">|</span>
          <span>DATA FEEDS: {subscribers.length > 0 ? "ACTIVE" : "AWAITING"}</span>
          <span className="ml-auto text-[var(--slate-400)]">{new Date().toISOString().replace("T", " ").slice(0, 19)} UTC</span>
        </div>

        {/* Run System Test Card */}
        <Link
          href="/admin/test"
          className="block mb-6 bg-[var(--navy-900)] border border-[var(--gold-500)]/30 rounded-lg p-5 hover:border-[var(--gold-500)]/60 hover:bg-[var(--gold-500)]/5 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--gold-500)]/10 flex items-center justify-center group-hover:bg-[var(--gold-500)]/20 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--gold-400)" strokeWidth={1.5} className="w-5 h-5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold font-[family-name:var(--font-geist-mono)] text-[var(--gold-400)] group-hover:text-[var(--gold-300)] transition-colors">
                  RUN SYSTEM TEST
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Generate a test brief, send test emails, and verify the full pipeline end-to-end.
                </div>
              </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth={1.5} className="w-5 h-5 group-hover:stroke-[var(--gold-400)] transition-colors">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        {/* Frequency Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4">
            <h3 className="text-xs tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
              DELIVERY FREQUENCY
            </h3>
            {["daily", "business", "3x", "weekly"].map((freq) => {
              const count = subscribers.filter((s) => s.frequency === freq).length;
              const pct = subscribers.length > 0 ? (count / subscribers.length) * 100 : 0;
              return (
                <div key={freq} className="flex items-center gap-3 mb-2">
                  <span className="w-16 text-xs text-[var(--slate-300)] font-[family-name:var(--font-geist-mono)] uppercase">{freq}</span>
                  <div className="flex-1 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--teal-500)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-xs text-right text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4">
            <h3 className="text-xs tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
              DEPTH DISTRIBUTION
            </h3>
            {["executive", "deep", "data"].map((depth) => {
              const count = subscribers.filter((s) => s.depth === depth).length;
              const pct = subscribers.length > 0 ? (count / subscribers.length) * 100 : 0;
              return (
                <div key={depth} className="flex items-center gap-3 mb-2">
                  <span className="w-16 text-xs text-[var(--slate-300)] font-[family-name:var(--font-geist-mono)] capitalize">{depth}</span>
                  <div className="flex-1 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--gold-500)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-xs text-right text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-xs tracking-[0.15em] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
              RECENT ONBOARDING ACTIVITY
            </h3>
            <span className="text-[10px] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
              {subscribers.length} TOTAL
            </span>
          </div>

          {subscribers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
              No subscribers onboarded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] tracking-[0.1em] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] border-b border-[var(--border)]">
                    <th className="text-left px-4 py-2 font-medium">ID</th>
                    <th className="text-left px-4 py-2 font-medium">EMAIL</th>
                    <th className="text-left px-4 py-2 font-medium">ROLE</th>
                    <th className="text-left px-4 py-2 font-medium">FREQ</th>
                    <th className="text-left px-4 py-2 font-medium">DEPTH</th>
                    <th className="text-left px-4 py-2 font-medium">MODULES</th>
                    <th className="text-left px-4 py-2 font-medium">CREATED</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.slice(0, 10).map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--navy-800)] transition-colors cursor-pointer"
                      onClick={() => { setSelectedUser(sub); setActiveNav("users"); }}
                    >
                      <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--teal-400)]">
                        {sub.id}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--slate-300)]">{sub.email || "—"}</td>
                      <td className="px-4 py-2.5 text-[var(--slate-300)] max-w-[160px] truncate">{sub.role || "—"}</td>
                      <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-xs uppercase">{sub.frequency}</td>
                      <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-xs capitalize">{sub.depth}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          {sub.modules?.tender?.enabled && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--teal-500)]/20 text-[var(--teal-400)] font-[family-name:var(--font-geist-mono)]">
                              TND
                            </span>
                          )}
                          {sub.modules?.prospects?.enabled && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--gold-500)]/20 text-[var(--gold-400)] font-[family-name:var(--font-geist-mono)]">
                              CPR
                            </span>
                          )}
                          {!sub.modules?.tender?.enabled && !sub.modules?.prospects?.enabled && (
                            <span className="text-[var(--muted-foreground)] text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--muted-foreground)]">
                        {sub.created}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderUsersView() {
    if (selectedUser) return renderUserDetail(selectedUser);

    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-[family-name:var(--font-geist-mono)] tracking-[0.1em] text-[var(--muted-foreground)]">
            ALL USERS ({subscribers.length})
          </h2>
        </div>

        {subscribers.length === 0 ? (
          <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            No users registered.
          </div>
        ) : (
          <div className="space-y-2">
            {subscribers.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedUser(sub)}
                className="w-full text-left bg-[var(--navy-900)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--teal-500)]/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center text-xs font-bold text-[var(--teal-400)] font-[family-name:var(--font-geist-mono)]">
                      {(sub.email || sub.id).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[var(--slate-100)]">{sub.email || sub.id}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{sub.role || "No role set"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.modules?.tender?.enabled && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--teal-500)]/20 text-[var(--teal-400)] font-[family-name:var(--font-geist-mono)]">TND</span>
                    )}
                    {sub.modules?.prospects?.enabled && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--gold-500)]/20 text-[var(--gold-400)] font-[family-name:var(--font-geist-mono)]">CPR</span>
                    )}
                    <span className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">{sub.created}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth={1.5} className="w-4 h-4">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  function renderUserDetail(user: Subscriber) {
    return (
      <>
        <button
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-1 text-xs text-[var(--teal-400)] hover:text-[var(--teal-500)] mb-4 font-[family-name:var(--font-geist-mono)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          BACK TO USERS
        </button>

        <div className="bg-[var(--navy-900)] border border-[var(--border)] rounded-lg overflow-hidden">
          {/* User header */}
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm font-bold text-[var(--teal-400)] font-[family-name:var(--font-geist-mono)]">
                {(user.email || user.id).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold">{user.email || "No email"}</div>
                <div className="text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">{user.id}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-[10px] rounded bg-emerald-500/20 text-emerald-400 font-[family-name:var(--font-geist-mono)] tracking-wider">
                {user.tier.toUpperCase()}
              </span>
              <Link
                href={`/profile/${user.id}`}
                className="px-2 py-1 text-[10px] rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--teal-500)]/40 transition-colors font-[family-name:var(--font-geist-mono)]"
              >
                VIEW PROFILE
              </Link>
              <button
                onClick={() => handleDeleteUser(user.id)}
                disabled={deleting}
                className="px-2 py-1 text-[10px] rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 disabled:opacity-40 transition-colors font-[family-name:var(--font-geist-mono)]"
              >
                {deleting ? "DELETING..." : "DELETE USER"}
              </button>
            </div>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--border)]">
            <DetailField label="ROLE" value={user.role || "—"} />
            <DetailField label="CREATED" value={user.created} />
            <DetailField label="FREQUENCY" value={user.frequency.toUpperCase()} />
            <DetailField label="DEPTH" value={user.depth.toUpperCase()} />
            <DetailField label="TWEAKS USED" value={`${user.tweaks_used} / ${user.tweaks_limit}`} />
            <DetailField label="EMAIL" value={user.email || "—"} />
          </div>

          {/* Subjects */}
          <div className="px-5 py-4 border-t border-[var(--border)]">
            <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-2 font-[family-name:var(--font-geist-mono)]">
              INTELLIGENCE SUBJECTS
            </div>
            <div className="flex flex-wrap gap-1.5">
              {user.subjects.length > 0 ? user.subjects.map((s, i) => (
                <span key={i} className="px-2 py-1 text-xs rounded bg-[var(--navy-800)] border border-[var(--border)] text-[var(--slate-300)]">
                  {s}
                </span>
              )) : <span className="text-xs text-[var(--muted-foreground)]">None specified</span>}
            </div>
          </div>

          {/* Assets */}
          <div className="px-5 py-4 border-t border-[var(--border)]">
            <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-2 font-[family-name:var(--font-geist-mono)]">
              ASSET &amp; MARKET FOCUS
            </div>
            <div className="flex flex-wrap gap-1.5">
              {user.assets.length > 0 ? user.assets.map((a, i) => (
                <span key={i} className="px-2 py-1 text-xs rounded bg-[var(--navy-800)] border border-[var(--border)] text-[var(--slate-300)]">
                  {a}
                </span>
              )) : <span className="text-xs text-[var(--muted-foreground)]">None specified</span>}
            </div>
          </div>

          {/* Modules */}
          <div className="px-5 py-4 border-t border-[var(--border)]">
            <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-3 font-[family-name:var(--font-geist-mono)]">
              ADVANCED MODULES
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border ${user.modules?.tender?.enabled ? "border-[var(--teal-500)]/30 bg-[var(--teal-500)]/5" : "border-[var(--border)] bg-[var(--navy-800)]"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold font-[family-name:var(--font-geist-mono)]">Tender Tracking</span>
                  <span className={`text-[10px] font-[family-name:var(--font-geist-mono)] ${user.modules?.tender?.enabled ? "text-[var(--teal-400)]" : "text-[var(--muted-foreground)]"}`}>
                    {user.modules?.tender?.enabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
                {user.modules?.tender?.enabled && (
                  <div className="text-xs text-[var(--muted-foreground)] space-y-1">
                    {user.modules.tender.region && <div>Region: <span className="text-[var(--slate-300)]">{user.modules.tender.region}</span></div>}
                    {user.modules.tender.type && <div>Type: <span className="text-[var(--slate-300)]">{user.modules.tender.type}</span></div>}
                  </div>
                )}
              </div>

              <div className={`p-3 rounded-lg border ${user.modules?.prospects?.enabled ? "border-[var(--gold-500)]/30 bg-[var(--gold-500)]/5" : "border-[var(--border)] bg-[var(--navy-800)]"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold font-[family-name:var(--font-geist-mono)]">Client Prospects</span>
                  <span className={`text-[10px] font-[family-name:var(--font-geist-mono)] ${user.modules?.prospects?.enabled ? "text-[var(--gold-400)]" : "text-[var(--muted-foreground)]"}`}>
                    {user.modules?.prospects?.enabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
                {user.modules?.prospects?.enabled && (
                  <div className="text-xs text-[var(--muted-foreground)] space-y-1">
                    {user.modules.prospects.perReport && <div>Per Report: <span className="text-[var(--slate-300)]">{user.modules.prospects.perReport}</span></div>}
                    {user.modules.prospects.focusAreas && <div>Focus: <span className="text-[var(--slate-300)]">{user.modules.prospects.focusAreas}</span></div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Review */}
          {user.monthlyReview.length > 0 && (
            <div className="px-5 py-4 border-t border-[var(--border)]">
              <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-2 font-[family-name:var(--font-geist-mono)]">
                MONTHLY REVIEW TOPICS
              </div>
              <div className="flex flex-wrap gap-1.5">
                {user.monthlyReview.map((r, i) => (
                  <span key={i} className="px-2 py-1 text-xs rounded bg-[var(--navy-800)] border border-[var(--border)] text-[var(--slate-300)]">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--navy-950)]/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <IQseaLogoSmall className="h-6" />
            </Link>
            <span className="text-[var(--border)]">|</span>
            <span className="text-[10px] tracking-[0.2em] text-[var(--gold-400)] font-[family-name:var(--font-geist-mono)] font-semibold">
              MISSION CONTROL
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
            <StatusDot status="online" />
            <span>ADMIN</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-48 shrink-0 border-r border-[var(--border)] bg-[var(--navy-950)] py-4 hidden md:block">
          <nav className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => { setActiveNav(item.key); setSelectedUser(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors ${
                  activeNav === item.key
                    ? "bg-[var(--teal-500)]/10 text-[var(--teal-400)] font-semibold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--slate-300)] hover:bg-[var(--navy-900)]"
                } font-[family-name:var(--font-geist-mono)]`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Test Center link */}
          <div className="px-2 mt-4">
            <Link
              href="/admin/test"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors text-[var(--gold-400)] hover:bg-[var(--gold-500)]/10 hover:text-[var(--gold-300)] font-[family-name:var(--font-geist-mono)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
              </svg>
              Test Center
            </Link>
          </div>

          {/* Sidebar footer */}
          <div className="mt-auto px-4 pt-6">
            <div className="border-t border-[var(--border)] pt-4">
              <div className="text-[9px] tracking-[0.15em] text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)] opacity-50">
                IQsea v1.0
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden border-b border-[var(--border)] bg-[var(--navy-950)] px-2 py-2 flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveNav(item.key); setSelectedUser(null); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                activeNav === item.key
                  ? "bg-[var(--teal-500)]/10 text-[var(--teal-400)] font-semibold"
                  : "text-[var(--muted-foreground)]"
              } font-[family-name:var(--font-geist-mono)]`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <Link
            href="/admin/test"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[var(--gold-400)] hover:bg-[var(--gold-500)]/10 font-[family-name:var(--font-geist-mono)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Test Center
          </Link>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {/* Page title */}
            <div className="mb-6">
              <h1 className="text-lg font-bold font-[family-name:var(--font-geist-mono)] tracking-tight">
                {activeNav === "overview" && "System Overview"}
                {activeNav === "users" && (selectedUser ? "User Detail" : "User Management")}
                {activeNav === "tenders" && "Tender Pipeline"}
                {activeNav === "outreach" && "Outreach Tracking"}
                {activeNav === "logs" && "System Logs"}
              </h1>
              <div className="h-px bg-gradient-to-r from-[var(--teal-500)]/50 via-[var(--gold-500)]/30 to-transparent mt-2" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="var(--muted-foreground)" strokeWidth="2" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--teal-500)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  LOADING...
                </div>
              </div>
            ) : (
              renderContent()
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3 bg-[var(--navy-900)]">
      <div className="text-[10px] tracking-[0.15em] text-[var(--muted-foreground)] mb-1 font-[family-name:var(--font-geist-mono)]">
        {label}
      </div>
      <div className="text-sm text-[var(--slate-100)] font-[family-name:var(--font-geist-mono)]">{value}</div>
    </div>
  );
}

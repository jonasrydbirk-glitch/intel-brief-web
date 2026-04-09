"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IQseaLogoSmall } from "../../components/iqsea-logo";
import { BUILD_VERSION } from "../../../lib/constants";

interface Subscriber {
  id: string;
  email: string;
  fullName?: string;
  companyName?: string;
  role: string;
  frequency: string;
  depth: string;
  created: string;
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

export default function AdminTestPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [dispatched, setDispatched] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        setSubscribers(data.subscribers ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch subscribers");
        setLoading(false);
      });
  }, []);

  async function dispatchBrief(subscriberId: string) {
    setDispatching(subscriberId);
    setError(null);

    try {
      const res = await fetch("/api/admin/brief-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId, dispatch_now: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.details
          ? `${data.error}: ${data.details}`
          : (data.error ?? "Failed to dispatch brief");
        setError(msg);
        setDispatching(null);
        return;
      }

      // Success — mark as dispatched
      setDispatched((prev) => new Set(prev).add(subscriberId));
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setDispatching(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Top bar — matches Mission Control */}
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
        {/* Sidebar — matches Mission Control */}
        <aside className="w-48 shrink-0 border-r border-[var(--border)] bg-[var(--navy-950)] py-4 hidden md:block">
          <nav className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href="/admin"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors text-[var(--muted-foreground)] hover:text-[var(--slate-300)] hover:bg-[var(--navy-900)] font-[family-name:var(--font-geist-mono)]"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Test Center link — active state */}
          <div className="px-2 mt-4">
            <Link
              href="/admin/test"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors bg-[var(--gold-500)]/10 text-[var(--gold-300)] font-semibold font-[family-name:var(--font-geist-mono)]"
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
              <div className="inline-block mt-1.5 px-2 py-0.5 rounded bg-[#1a1400] border border-[#FFD700]/40 text-[8px] font-bold tracking-[0.1em] text-[#FFD700] font-[family-name:var(--font-geist-mono)]">
                {BUILD_VERSION}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden border-b border-[var(--border)] bg-[var(--navy-950)] px-2 py-2 flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href="/admin"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors text-[var(--muted-foreground)] font-[family-name:var(--font-geist-mono)]"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin/test"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-[var(--gold-500)]/10 text-[var(--gold-300)] font-semibold font-[family-name:var(--font-geist-mono)]"
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
                One-Button Dispatch
              </h1>
              <div className="h-px bg-gradient-to-r from-[var(--teal-500)]/50 via-[var(--gold-500)]/30 to-transparent mt-2" />
            </div>

            <p className="text-sm text-[var(--muted-foreground)] mb-8">
              Click dispatch to run the full pipeline on the Beelink: Scout &rarr; Architect &rarr; Scribe (PDF) &rarr; Email.
              The PDF will arrive in your inbox.
            </p>

        {/* Error banner */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 underline text-red-400 hover:text-red-200"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Subscriber list */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Subscribers
          </h2>

          {loading ? (
            <div className="text-sm text-muted-foreground animate-pulse">
              Loading subscribers...
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No subscribers found.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Company</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        {sub.fullName || sub.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {sub.email || "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.companyName || "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {dispatched.has(sub.id) ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] tracking-wide text-[var(--teal-400)] bg-white/[0.03] border border-white/[0.06]">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 opacity-70">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Intel brief dispatch command accepted. Processing on Beelink…
                          </span>
                        ) : (
                          <button
                            onClick={() => dispatchBrief(sub.id)}
                            disabled={dispatching !== null}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all
                              bg-transparent text-white/90 border border-[#DBAC32]/50
                              hover:bg-[#DBAC32]/10 hover:border-[#DBAC32] hover:shadow-[0_0_12px_rgba(219,172,50,0.15)]
                              active:scale-[0.97]
                              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                              <path d="M22 2L11 13" />
                              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                            </svg>
                            {dispatching === sub.id
                              ? "Dispatching\u2026"
                              : "Dispatch Brief"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IQseaLogoSmall } from "../../components/iqsea-logo";
import type { BriefPayload } from "@/engine/brief-generator";

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
  const [generating, setGenerating] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [briefResult, setBriefResult] = useState<BriefPayload | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
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

  async function runBrief(subscriberId: string) {
    setGenerating(subscriberId);
    setBriefResult(null);
    setError(null);

    try {
      // 1. Start background job — returns 202 immediately
      const startRes = await fetch("/api/admin/brief-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId }),
      });

      const startData = await startRes.json();

      if (!startRes.ok) {
        const msg = startData.details
          ? `${startData.error}: ${startData.details}`
          : (startData.error ?? "Failed to start brief job");
        setError(msg);
        setGenerating(null);
        return;
      }

      const { jobId } = startData as { jobId: string };

      // 2. Poll for completion every 3 seconds
      const poll = async (): Promise<void> => {
        const pollRes = await fetch(`/api/admin/brief-job?jobId=${jobId}`);
        const job = await pollRes.json();

        if (!pollRes.ok) {
          setError(job.error ?? "Failed to poll job status");
          setGenerating(null);
          return;
        }

        if (job.status === "complete") {
          setBriefResult(job.result);
          setGenerating(null);
          return;
        }

        if (job.status === "error") {
          setError(job.error ?? "Brief generation failed");
          setGenerating(null);
          return;
        }

        // Still pending or running — poll again
        await new Promise((r) => setTimeout(r, 3000));
        return poll();
      };

      await poll();
    } catch {
      setError("Network error — could not reach the server");
      setGenerating(null);
    }
  }

  function openPdfPreview() {
    if (!briefResult) return;

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/print/generate-sample";
    form.target = "_blank";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "json";
    input.value = JSON.stringify(briefResult);
    form.appendChild(input);

    // The print endpoint expects JSON body, so use fetch + blob instead
    fetch("/api/print/generate-sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(briefResult),
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      })
      .catch(() => setError("Failed to open PDF preview"));
  }

  async function emailBrief(subscriberId: string) {
    if (!briefResult) {
      setError("Generate a brief first before emailing.");
      return;
    }
    setSending(subscriberId);
    setEmailStatus(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/email-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId, brief: briefResult }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Email send failed");
        return;
      }

      setEmailStatus(data.message);
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setSending(null);
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
              <div className="text-[9px] font-[family-name:var(--font-geist-mono)] font-bold mt-1 px-1.5 py-0.5 rounded text-[#FFD700] bg-[rgba(0,0,0,0.85)]">
                Build 2026-04-08d
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
                Brief Test Trigger
              </h1>
              <div className="h-px bg-gradient-to-r from-[var(--teal-500)]/50 via-[var(--gold-500)]/30 to-transparent mt-2" />
            </div>

            <p className="text-sm text-[var(--muted-foreground)] mb-8">
              Select a subscriber and run the Scout / Architect / Scribe pipeline.
              Results appear below.
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

        {/* Email success banner */}
        {emailStatus && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-green-900/30 border border-green-500/40 text-green-300 text-sm">
            {emailStatus}
            <button
              onClick={() => setEmailStatus(null)}
              className="ml-3 underline text-green-400 hover:text-green-200"
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
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Depth</th>
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
                        {sub.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.companyName || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {sub.id}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub.depth}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => runBrief(sub.id)}
                          disabled={generating !== null || sending !== null}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                            bg-accent text-accent-foreground hover:bg-teal-400
                            disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {generating === sub.id
                            ? "Generating..."
                            : "Generate Brief"}
                        </button>
                        <button
                          onClick={() => emailBrief(sub.id)}
                          disabled={generating !== null || sending !== null || !briefResult}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                            bg-blue-600 text-white hover:bg-blue-500
                            disabled:opacity-40 disabled:cursor-not-allowed"
                          title={!briefResult ? "Generate a brief first" : "Email the generated brief"}
                        >
                          {sending === sub.id
                            ? "Emailing..."
                            : "Email this Brief"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Brief output */}
        {briefResult && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Intel JSON Output
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setBriefResult(null);
                    setEmailStatus(null);
                    setError(null);
                  }}
                  className="px-4 py-2 rounded-md text-xs font-semibold bg-muted text-muted-foreground hover:bg-muted/80 border border-border transition-colors"
                >
                  Clear Results
                </button>
                <button
                  onClick={openPdfPreview}
                  className="px-4 py-2 rounded-md text-xs font-semibold bg-highlight text-highlight-foreground hover:bg-gold-400 transition-colors"
                >
                  View PDF
                </button>
              </div>
            </div>

            {/* Meta bar */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4 px-4 py-2 rounded-md bg-card border border-border">
              <span>
                <strong className="text-foreground">Subscriber:</strong>{" "}
                {briefResult.subscriberName}
              </span>
              <span>
                <strong className="text-foreground">Company:</strong>{" "}
                {briefResult.companyName}
              </span>
              <span>
                <strong className="text-foreground">Generated:</strong>{" "}
                {new Date(briefResult.generatedAt).toLocaleString()}
              </span>
            </div>

            {/* Sections */}
            {briefResult.sections.map((section, si) => (
              <div key={si} className="mb-6">
                <h3 className="text-sm font-bold text-accent border-b border-accent/30 pb-1 mb-3">
                  {section.title}
                </h3>
                {section.items.map((item, ii) => (
                  <div
                    key={ii}
                    className="mb-3 p-3 rounded-md bg-card border-l-2 border-accent/60"
                  >
                    <div className="font-semibold text-sm mb-1">
                      {item.headline}
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed mb-2">
                      {item.summary}
                    </div>
                    <div className="flex gap-4 text-[11px] text-muted-foreground">
                      <span>
                        <strong>Relevance:</strong> {item.relevance}
                      </span>
                      <span>
                        <strong>Source:</strong> {item.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Tender section */}
            {briefResult.tenderSection &&
              briefResult.tenderSection.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-highlight border-b border-highlight/30 pb-1 mb-3">
                    Tender Watch
                  </h3>
                  {briefResult.tenderSection.map((item, i) => (
                    <div
                      key={i}
                      className="mb-3 p-3 rounded-md bg-card border-l-2 border-highlight/60"
                    >
                      <div className="font-semibold text-sm mb-1">
                        {item.headline}
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {item.summary}
                      </div>
                      <div className="flex gap-4 text-[11px] text-muted-foreground">
                        <span>
                          <strong>Relevance:</strong> {item.relevance}
                        </span>
                        <span>
                          <strong>Source:</strong> {item.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* Prospect section */}
            {briefResult.prospectSection &&
              briefResult.prospectSection.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-blue-400 border-b border-blue-400/30 pb-1 mb-3">
                    Client Prospects
                  </h3>
                  {briefResult.prospectSection.map((item, i) => (
                    <div
                      key={i}
                      className="mb-3 p-3 rounded-md bg-card border-l-2 border-blue-400/60"
                    >
                      <div className="font-semibold text-sm mb-1">
                        {item.headline}
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {item.summary}
                      </div>
                      <div className="flex gap-4 text-[11px] text-muted-foreground">
                        <span>
                          <strong>Relevance:</strong> {item.relevance}
                        </span>
                        <span>
                          <strong>Source:</strong> {item.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* Analyst note */}
            {briefResult.analystNote && (
              <div className="mb-6 p-4 rounded-md bg-yellow-900/20 border-l-2 border-highlight">
                <div className="text-[11px] font-bold text-highlight uppercase tracking-wider mb-1">
                  Analyst Note
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {briefResult.analystNote}
                </div>
              </div>
            )}

            {/* Raw JSON toggle */}
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-accent">
                Show raw JSON
              </summary>
              <pre className="mt-2 p-4 rounded-lg bg-card border border-border text-xs text-muted-foreground overflow-x-auto max-h-96 overflow-y-auto">
                {JSON.stringify(briefResult, null, 2)}
              </pre>
            </details>
          </section>
        )}

          </div>
        </main>
      </div>
    </div>
  );
}

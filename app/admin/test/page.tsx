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
      const res = await fetch("/api/admin/test-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Brief generation failed");
        return;
      }

      setBriefResult(data.brief);
    } catch {
      setError("Network error — could not reach the server");
    } finally {
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

  async function runAndEmail(subscriberId: string) {
    setSending(subscriberId);
    setEmailStatus(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/send-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Send brief failed");
        return;
      }

      setBriefResult(data.brief);
      setEmailStatus(data.message);
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IQseaLogoSmall />
          <span className="text-sm font-medium text-muted-foreground">
            Admin / Test Trigger
          </span>
        </div>
        <Link
          href="/admin"
          className="text-xs text-accent hover:underline"
        >
          Back to Mission Control
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-1">Brief Test Trigger</h1>
        <p className="text-sm text-muted-foreground mb-8">
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
                            : "Run Test Brief"}
                        </button>
                        <button
                          onClick={() => runAndEmail(sub.id)}
                          disabled={generating !== null || sending !== null}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                            bg-blue-600 text-white hover:bg-blue-500
                            disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {sending === sub.id
                            ? "Sending..."
                            : "Run & Email"}
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
      </main>
    </div>
  );
}

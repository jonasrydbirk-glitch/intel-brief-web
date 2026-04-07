"use client";

import { useState, useEffect } from "react";

interface Report {
  id: string;
  user_id: string;
  type: string;
  status: string;
  subject: string;
  generated_at: string;
  pdf_url: string | null;
}

export function ReportHistory({
  emptyState,
}: {
  emptyState: React.ReactNode;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        }
      } catch {
        // Silently fail — empty state will show
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          Loading report history...
        </p>
      </div>
    );
  }

  if (reports.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h2 className="text-base font-semibold tracking-tight">
          Report History
        </h2>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {reports.map((report) => {
          const date = new Date(report.generated_at);
          const dateStr = date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const timeStr = date.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={report.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-[var(--background)]/40 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={1.5}
                    className="w-4 h-4"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {report.subject}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {dateStr} at {timeStr}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    report.status === "delivered"
                      ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "bg-[var(--gold-500)]/15 text-[var(--gold-500)]"
                  }`}
                >
                  {report.status}
                </span>
                {report.pdf_url && (
                  <a
                    href={report.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:text-[var(--teal-400)] transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="w-3.5 h-3.5"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                    PDF
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReportCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const data = await res.json();
          setCount(data.length);
        }
      } catch {
        // leave as null
      }
    }
    load();
  }, []);

  return <>{count !== null ? count : "\u2014"}</>;
}

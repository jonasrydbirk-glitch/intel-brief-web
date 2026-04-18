"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { IQseaLogoSmall } from "../components/iqsea-logo";

// ─── Rating button component ──────────────────────────────────────────────────

const RATINGS = [
  { value: "good", label: "👍 Useful",      bg: "bg-emerald-600 hover:bg-emerald-500" },
  { value: "ok",   label: "😐 OK",          bg: "bg-slate-600  hover:bg-slate-500"   },
  { value: "bad",  label: "👎 Not helpful", bg: "bg-red-700    hover:bg-red-600"     },
] as const;

type Rating = "good" | "ok" | "bad";

// ─── Inner component (needs useSearchParams) ──────────────────────────────────

function FeedbackForm() {
  const searchParams = useSearchParams();

  const briefId    = searchParams.get("briefId") ?? "";
  const subscriberId = searchParams.get("sub") ?? "";
  const ratingParam  = (searchParams.get("rating") ?? "") as Rating | "";

  const isBriefMode = Boolean(briefId && subscriberId);

  const [rating,  setRating]  = useState<Rating | "">(ratingParam);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isBriefMode && !rating) {
      setError("Please select a rating before submitting.");
      return;
    }
    if (!isBriefMode && !message.trim()) {
      setError("Please enter your feedback before submitting.");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = {};
      if (isBriefMode) {
        payload.subscriberId = subscriberId;
        payload.briefJobId   = briefId;
        if (rating)  payload.rating  = rating;
        if (message.trim()) payload.message = message.trim();
      } else {
        payload.message = message.trim();
      }

      const res  = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setMessage("");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="text-4xl">🙏</div>
        <h2 className="text-xl font-bold">Thanks for your feedback</h2>
        <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto">
          We read every submission. Your input helps us make every brief sharper.
        </p>
        {isBriefMode ? (
          <p className="text-xs text-[var(--muted-foreground)]">You can close this tab.</p>
        ) : (
          <Link href="/dashboard" className="inline-block text-sm text-[var(--teal-400)] hover:underline mt-2">
            Back to Reports
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isBriefMode ? (
        <>
          {/* Rating buttons */}
          <div>
            <label className="block text-sm font-medium mb-3 text-[var(--slate-300)]">
              How was {briefId ? "this brief" : "the brief"}?
            </label>
            <div className="flex gap-3 flex-wrap">
              {RATINGS.map(({ value, label, bg }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all border-2 cursor-pointer ${
                    rating === value
                      ? `${bg} text-white border-transparent ring-2 ring-offset-2 ring-offset-[var(--background)] ring-white/30`
                      : "bg-transparent text-[var(--slate-300)] border-[var(--border)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional message */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--slate-300)]">
              Want to add a note? <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would make the brief more useful?"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--navy-900)] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition resize-y min-h-[80px]"
            />
          </div>
        </>
      ) : (
        <>
          {/* Generic feedback mode (legacy — requires session) */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <p className="text-sm text-[var(--slate-300)] leading-relaxed">
              Whether it&apos;s a new data source you&apos;d like covered, a module
              that could be more useful, or something about the format that
              doesn&apos;t work for your workflow — we want to know.
            </p>
          </div>
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium mb-1.5 text-[var(--slate-300)]">
              Your feedback
            </label>
            <textarea
              id="feedback"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's working, what isn't, or what you'd like to see next..."
              required
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--navy-900)] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition resize-y min-h-[120px]"
            />
          </div>
        </>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
      >
        {loading ? "Sending..." : "Send Feedback"}
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center">
            <IQseaLogoSmall className="h-9" />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              Reports
            </Link>
            <Link href="/settings/report" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              Settings
            </Link>
            <span className="text-[var(--foreground)] font-medium">Feedback</span>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Share Your Feedback</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Help us sharpen the intelligence that matters to you.
          </p>
        </div>

        <Suspense fallback={<div className="text-sm text-[var(--muted-foreground)]">Loading…</div>}>
          <FeedbackForm />
        </Suspense>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { IQseaLogoSmall } from "../components/iqsea-logo";
import { LogoutButton } from "../components/logout-button";

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = message.trim();
    if (!trimmed) {
      setError("Please enter your feedback before submitting.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(
          "Thank you — your feedback has been received. We read every submission."
        );
        setMessage("");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
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
            <Link
              href="/settings/report"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Settings
            </Link>
            <span className="text-[var(--foreground)] font-medium">
              Feedback
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        {/* Page heading */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            Share Your Feedback
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Help us sharpen the intelligence that matters to you.
          </p>
        </div>

        {/* Narrative card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-8">
          <p className="text-sm text-[var(--slate-300)] leading-relaxed">
            IQsea is built around one principle: the intelligence you receive
            should be as relevant and actionable as possible. Your operations
            are unique — different vessels, trade routes, regulatory
            environments, and commercial priorities. The only way we can
            ensure every brief meets that standard is by hearing directly
            from the people who rely on them.
          </p>
          <p className="text-sm text-[var(--slate-300)] leading-relaxed mt-4">
            Whether it&apos;s a new data source you&apos;d like covered, a
            module that could be more useful, or something about the format
            that doesn&apos;t work for your workflow — we want to know. Every
            piece of feedback is reviewed by our team and directly informs
            what we build next.
          </p>
        </div>

        {/* Status messages */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg bg-[var(--teal-500)]/10 border border-[var(--teal-500)]/30 px-4 py-3 text-sm text-[var(--teal-400)]">
            {success}
          </div>
        )}

        {/* Feedback form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="feedback"
              className="block text-sm font-medium mb-1.5 text-[var(--slate-300)]"
            >
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      </main>
    </div>
  );
}

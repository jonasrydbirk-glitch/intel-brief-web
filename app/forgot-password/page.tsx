"use client";

import Link from "next/link";
import { useState } from "react";
import { IQseaLogo } from "../components/iqsea-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center">
            <IQseaLogo className="h-9" />
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-semibold hover:bg-[var(--muted)]/50 transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
            <div className="flex justify-center mb-8">
              <IQseaLogo className="h-8" />
            </div>
            {!submitted ? (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
                  <p className="text-sm text-muted-foreground">
                    Enter the email address associated with your account and
                    we&apos;ll send you a link to reset your password.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium mb-1.5 text-slate-300"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--navy-900)] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-accent px-4 py-3.5 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--accent)]/15 flex items-center justify-center mx-auto mb-6">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    className="w-8 h-8"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2">Check your inbox</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  If an account exists for{" "}
                  <span className="text-[var(--accent)] font-medium">
                    {email}
                  </span>
                  , we&apos;ve sent a password reset link. Please check your
                  email and follow the instructions.
                </p>
                <Link
                  href="/login"
                  className="inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110 transition"
                >
                  Back to Sign In
                </Link>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-accent font-medium hover:text-[var(--teal-400)] transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <IQseaLogo className="h-8" />
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} IQsea. Maritime intelligence,
            delivered.
          </p>
        </div>
      </footer>
    </div>
  );
}

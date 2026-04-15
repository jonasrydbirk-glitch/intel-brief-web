"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { IQseaLogo } from "../components/iqsea-logo";
import { PasswordInput } from "../components/password-input";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/login?reset=success");
      } else {
        setError(data.error || "Failed to reset password. Please try again.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-6">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth={2}
            className="w-8 h-8"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Invalid Reset Link</h2>
        <p className="text-sm text-muted-foreground mb-6">
          This password reset link is missing a token. Please request a new
          reset link.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110 transition"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Set new password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below. It must be at least 8 characters.
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
            htmlFor="password"
            className="block text-sm font-medium mb-1.5 text-slate-300"
          >
            New Password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            required
            minLength={8}
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium mb-1.5 text-slate-300"
          >
            Confirm Password
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-3.5 text-sm font-semibold text-accent-foreground hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center">
            <IQseaLogo className="h-9" />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[var(--border)] px-5 py-2 text-sm font-semibold hover:bg-[var(--muted)]/50 transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
            <Suspense
              fallback={
                <div className="text-center text-muted-foreground text-sm py-8">
                  Loading...
                </div>
              }
            >
              <ResetPasswordForm />
            </Suspense>

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

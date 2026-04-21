"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { IQseaLogoSmall } from "../components/iqsea-logo";

type Step = "confirm" | "paused" | "deleted" | "error";

function UnsubscribeContent() {
  const params = useSearchParams();
  const subscriberId = params.get("sub") ?? "";

  const [step, setStep] = useState<Step>("confirm");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  async function act(action: "pause" | "delete") {
    if (!subscriberId) {
      setErrorMsg("Missing subscription ID. Please use the link from your email.");
      setStep("error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStep("error");
        return;
      }
      setStep(action === "pause" ? "paused" : "deleted");
    } catch {
      setErrorMsg("Network error — please try again.");
      setStep("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-8">
        <IQseaLogoSmall className="h-7 opacity-70 hover:opacity-100 transition-opacity" />
      </Link>

      <div className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">

        {step === "confirm" && (
          <>
            <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              Manage your subscription
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mb-8">
              Choose what you&apos;d like to do with your IQsea Intel Brief subscription.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => act("pause")}
                disabled={busy}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Pausing…" : "Pause deliveries"}
              </button>
              <p className="text-xs text-[var(--muted-foreground)] -mt-1">
                Stop receiving briefs. Resume any time from your settings.
              </p>

              {!showDeleteWarning ? (
                <button
                  onClick={() => setShowDeleteWarning(true)}
                  disabled={busy}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--muted-foreground)] hover:border-red-500/50 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  Delete my account
                </button>
              ) : (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-900/10 p-4 text-left">
                  <p className="text-sm text-red-300 mb-3">
                    This permanently deletes your profile and all delivery history. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => act("delete")}
                      disabled={busy}
                      className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {busy ? "Deleting…" : "Yes, delete everything"}
                    </button>
                    <button
                      onClick={() => setShowDeleteWarning(false)}
                      disabled={busy}
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {step === "paused" && (
          <>
            <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.5} className="w-6 h-6">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">Deliveries paused</h1>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              You won&apos;t receive any more briefs. You can resume at any time from your account settings.
            </p>
            <Link
              href="/settings/report"
              className="inline-block px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Go to settings
            </Link>
          </>
        )}

        {step === "deleted" && (
          <>
            <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth={1.5} className="w-6 h-6">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">Account deleted</h1>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Your profile and all delivery history have been removed. We&apos;re sorry to see you go.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Back to homepage
            </Link>
          </>
        )}

        {step === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={1.5} className="w-6 h-6">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">Something went wrong</h1>
            <p className="text-sm text-red-300 mb-6">{errorMsg}</p>
            <button
              onClick={() => { setStep("confirm"); setErrorMsg(""); }}
              className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Try again
            </button>
          </>
        )}

      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const profileUrl = searchParams.get("url") || "";
  const [copied, setCopied] = useState(false);

  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${profileUrl}`
      : profileUrl;

  function copyToClipboard() {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--accent)]/15 flex items-center justify-center mx-auto mb-6">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              className="w-8 h-8"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2">
            Welcome to IQsea
          </h1>
          <p className="text-[var(--muted-foreground)] mb-8">
            Your intelligence profile has been created. Your first brief is on
            its way.
          </p>

          <div className="mb-6">
            <p className="text-xs text-[var(--muted-foreground)] mb-2">
              Your profile URL
            </p>
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 font-mono text-sm text-[var(--accent)] break-all">
              {fullUrl}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={copyToClipboard}
              className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-[var(--accent-foreground)] bg-[var(--accent)] hover:brightness-110 transition"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <Link
              href="/dashboard"
              className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-center border border-[var(--border)] hover:bg-[var(--muted)]/50 transition"
            >
              Go to Dashboard
            </Link>
          </div>

          <p className="text-xs text-[var(--muted-foreground)] mt-6">
            Subscriber ID: {id}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[var(--background)]" />}
    >
      <SuccessContent />
    </Suspense>
  );
}

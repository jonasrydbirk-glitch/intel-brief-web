import Link from "next/link";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 sm:p-10">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
              className="w-8 h-8"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">401 — Unauthorized</h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-8">
            You need to sign in to access this page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 transition"
            >
              Sign In
            </Link>
            <Link
              href="/onboard"
              className="rounded-lg border border-[var(--border)] px-6 py-2.5 text-sm font-semibold hover:bg-[var(--muted)]/50 transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

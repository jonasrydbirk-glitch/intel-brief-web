import Link from "next/link";
import { unauthorized, redirect } from "next/navigation";
import { IQseaLogoNav } from "../components/iqsea-logo";
import { verifySession } from "@/app/lib/session";
import { getUserById } from "@/app/lib/auth";
import { LogoutButton } from "../components/logout-button";
import { ReportHistory, ReportCount } from "./report-history";
import { NextBriefSchedule } from "./next-brief";

export const metadata = {
  title: "Dashboard — IQsea",
};

export default async function DashboardPage() {
  const session = await verifySession();
  if (!session) {
    unauthorized();
  }

  const user = await getUserById(session.userId);

  // Redirect subscribers who haven't finished onboarding back to the questionnaire
  if (user?.data?.onboarding_complete === false) {
    redirect("/onboard");
  }
  const fullName = (user?.data?.fullName as string) || "";
  const frequency = (user?.data?.frequency as string) || "—";
  const depth = (user?.data?.depth as string) || "—";
  const deliveryTime = (user?.data?.deliveryTime as string) || "";
  const timezone = (user?.data?.timezone as string) || "";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const emptyState = (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto mb-6">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          className="w-7 h-7"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2">No reports yet</h2>
      <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto mb-6">
        Your intelligence briefs will appear here once delivery begins.
        Reports are archived automatically so you can search and revisit
        past insights.
      </p>
      <Link
        href="/settings/report"
        className="inline-block rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110 transition"
      >
        Update Report Settings
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dashboard header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center">
            <IQseaLogoNav />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <span className="text-[var(--foreground)] font-medium">
              Reports
            </span>
            <Link
              href="/settings/report"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Settings
            </Link>
            <Link
              href="/feedback"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Feedback
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        {/* Page title */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            {fullName ? `${greeting}, ${fullName}` : "Dashboard"}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Your intelligence briefs and delivery overview.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Reports Delivered */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[var(--accent)]/10 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  className="w-3.5 h-3.5"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                Reports Delivered
              </span>
            </div>
            <div className="text-xl font-bold">
              <ReportCount />
            </div>
          </div>

          {/* Next Brief */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[var(--gold-500)]/10 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gold-500)"
                  strokeWidth={1.5}
                  className="w-3.5 h-3.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                Next Brief
              </span>
            </div>
            <NextBriefSchedule
              deliveryTime={deliveryTime}
              timezone={timezone}
              frequency={frequency}
            />
          </div>

          {/* Frequency */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[var(--blue-400)]/10 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--blue-400)"
                  strokeWidth={1.5}
                  className="w-3.5 h-3.5"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                Frequency
              </span>
            </div>
            <div className="text-lg font-semibold capitalize">{frequency}</div>
          </div>

          {/* Depth */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-md bg-[var(--accent)]/10 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  className="w-3.5 h-3.5"
                >
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                Depth
              </span>
            </div>
            <div className="text-lg font-semibold capitalize">{depth}</div>
          </div>
        </div>

        {/* Report History or Empty State */}
        <ReportHistory emptyState={emptyState} />
      </main>
    </div>
  );
}

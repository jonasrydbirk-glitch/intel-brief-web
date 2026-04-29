import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/app/lib/session';
import { IQseaLogoNav } from '@/app/components/iqsea-logo';

interface Profile {
  id: string;
  role: string;
  segments: string[];
  regions: string[];
  focus: string[];
  company: string;
  watchlist: string[];
  tweaks_used: number;
  tweaks_limit: number;
  tier: string;
  created: string;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 py-1 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] text-sm font-medium">
      {children}
    </span>
  );
}

function ProfileSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
        {label}
      </h2>
      {children}
    </section>
  );
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  if (session.userId !== id) {
    redirect(`/profile/${session.userId}`);
  }

  const filePath = path.join(process.cwd(), 'data', 'subscribers', `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-10 text-center max-w-md">
          <div className="w-14 h-14 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth={1.5} className="w-6 h-6">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            No subscriber profile exists for this ID. Check your URL or complete onboarding first.
          </p>
          <Link
            href="/onboard"
            className="inline-block px-6 py-3 rounded-lg font-semibold text-[var(--accent-foreground)] bg-[var(--accent)] hover:brightness-110 transition"
          >
            Go to Onboarding
          </Link>
        </div>
      </div>
    );
  }

  const profile: Partial<Profile> & { id: string } = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const segments = profile.segments ?? [];
  const regions = profile.regions ?? [];
  const focus = profile.focus ?? [];
  const watchlist = profile.watchlist ?? [];
  const tweaksUsed = profile.tweaks_used ?? 0;
  const tweaksLimit = profile.tweaks_limit ?? 0;
  const tweaksExhausted = tweaksLimit === 0 || tweaksUsed >= tweaksLimit;
  const tweakPercent = tweaksLimit > 0 ? (tweaksUsed / tweaksLimit) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center">
            <IQseaLogoNav className="h-7" />
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
            <Link
              href="/feedback"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Feedback
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Intel Profile</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Subscriber <span className="font-mono text-[var(--accent)]">{profile.id}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Role */}
          <ProfileSection label="Role">
            <p className="text-base font-medium">{profile.role || 'Not set'}</p>
          </ProfileSection>

          {/* Company */}
          <ProfileSection label="Company">
            <p className="text-base font-medium">{profile.company || 'Not provided'}</p>
          </ProfileSection>

          {/* Segments */}
          <ProfileSection label="Segments">
            <div className="flex flex-wrap gap-2">
              {segments.length > 0 ? (
                segments.map((s) => <Badge key={s}>{s}</Badge>)
              ) : (
                <span className="text-sm text-[var(--muted-foreground)]">None selected</span>
              )}
            </div>
          </ProfileSection>

          {/* Regions */}
          <ProfileSection label="Regions">
            <div className="flex flex-wrap gap-2">
              {regions.length > 0 ? (
                regions.map((r) => <Badge key={r}>{r}</Badge>)
              ) : (
                <span className="text-sm text-[var(--muted-foreground)]">None selected</span>
              )}
            </div>
          </ProfileSection>

          {/* Intel Focus */}
          <ProfileSection label="Intel Focus">
            <div className="flex flex-wrap gap-2">
              {focus.length > 0 ? (
                focus.map((f) => <Badge key={f}>{f}</Badge>)
              ) : (
                <span className="text-sm text-[var(--muted-foreground)]">None selected</span>
              )}
            </div>
          </ProfileSection>

          {/* Watchlist */}
          <ProfileSection label="Watchlist">
            {watchlist.length > 0 ? (
              <ul className="space-y-2">
                {watchlist.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="text-[var(--accent)] mt-0.5 shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-[var(--muted-foreground)]">No watchlist items</span>
            )}
          </ProfileSection>

          {/* Tweak Status */}
          <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
              Profile Tweaks
            </h2>
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-sm">
                <span className="text-lg font-semibold">{tweaksUsed}</span>
                <span className="text-[var(--muted-foreground)]"> / {tweaksLimit} used this period</span>
              </p>
              {tweaksExhausted && (
                <span className="text-xs font-medium text-red-400">Limit reached</span>
              )}
            </div>
            <div className="w-full bg-[var(--background)] rounded-full h-2 mb-5">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${tweakPercent}%`,
                  backgroundColor: tweaksExhausted ? '#ef4444' : 'var(--accent)',
                }}
              />
            </div>

            {tweaksExhausted ? (
              <button
                disabled
                className="w-full py-3 rounded-lg font-semibold text-sm text-[var(--muted-foreground)] bg-[var(--muted)]/30 cursor-not-allowed"
              >
                Request Profile Update
              </button>
            ) : (
              <Link
                href={`/alter/${profile.id}`}
                className="block w-full py-3 rounded-lg font-semibold text-sm text-[var(--accent-foreground)] bg-[var(--accent)] hover:brightness-110 transition text-center"
              >
                Request Profile Update
              </Link>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

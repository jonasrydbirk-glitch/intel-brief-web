import Link from "next/link";
import { IQseaLogo } from "./components/iqsea-logo";

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill="currentColor" opacity={0.3} />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  );
}

const briefContents = [
  {
    icon: <ChartIcon />,
    title: "Market Intelligence",
    description:
      "Daily freight rate movements, bunker prices, FFA curves, and S&P activity for your traded segments.",
  },
  {
    icon: <ShieldIcon />,
    title: "Regulatory & Compliance",
    description:
      "IMO deadlines, sanction list changes, EU ETS updates, and flag state circulars — before they become operational problems.",
  },
  {
    icon: <CompassIcon />,
    title: "Competitor Tracking",
    description:
      "Contract wins, fleet acquisitions, and operator news from the specific companies you're watching.",
  },
  {
    icon: <DocumentIcon />,
    title: "Tender Intelligence",
    description:
      "Public maritime tender alerts filtered by vessel type, region, and contract type.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center">
            <IQseaLogo className="h-9" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 transition"
            >
              Login
            </Link>
            <Link
              href="/onboard"
              className="rounded-lg bg-accent px-3 sm:px-5 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 transition whitespace-nowrap"
            >
              See a sample
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-24 sm:py-36">
        <div className="max-w-3xl text-center">
          <div className="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground mb-8">
            For charterers, shipowners, and maritime lawyers
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
            One brief.
            <br />
            <span className="text-accent">Your markets.</span>
            <br />
            Every morning.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Charter rates, regulatory deadlines, competitor moves, and tender
            alerts — curated to your role and delivered before the market opens.
          </p>
          <Link
            href="/onboard"
            className="inline-block rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-accent-foreground hover:brightness-110 transition"
          >
            See a sample brief tailored to your focus →
          </Link>
        </div>
      </section>

      {/* What's in your brief */}
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-16">
            What arrives in your inbox
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {briefContents.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-card p-6 hover:border-accent/40 transition-colors"
              >
                <div className="text-accent mb-4">{item.icon}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample brief teaser */}
      <section className="px-6 py-20 sm:py-28 bg-card/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            From this morning&rsquo;s briefs
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-14">
            Every brief is specific — to your vessel type, your routes, your
            regulatory exposure.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {/* IMO Regulation Update Card */}
            <div className="relative rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-6 pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block rounded-full bg-highlight/15 px-3 py-0.5 text-xs font-semibold text-highlight">
                    Regulation
                  </span>
                  <span className="text-xs text-muted-foreground">Apr 4, 2026</span>
                </div>
                <h3 className="font-bold text-lg mb-2">IMO MEPC 84 — Key Outcomes</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  The Marine Environment Protection Committee concluded with
                  revised GHG reduction targets for 2035 and a draft framework
                  for mid-term measures including a maritime carbon levy...
                </p>
              </div>
              <div className="px-6 pb-6">
                <div className="relative">
                  <div
                    className="text-sm text-muted-foreground leading-relaxed space-y-2 select-none blur-[6px]"
                    aria-hidden="true"
                  >
                    <p>
                      Impact Assessment: The revised targets push the
                      decarbonization timeline forward by 5 years. Owners with
                      LNG-ready tonnage gain a strategic advantage as
                      methane-slip penalties are deferred to 2030.
                    </p>
                    <p>
                      Action Items: Review fleet compliance roadmaps against the
                      new 2035 benchmarks. Carbon-intensity calculations for CII
                      ratings will incorporate the updated EEXI baseline from Q3
                      2026.
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link
                      href="/onboard"
                      className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110 transition shadow-lg"
                    >
                      See a sample tailored to your focus
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Intelligence Card */}
            <div className="relative rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-6 pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block rounded-full bg-accent/15 px-3 py-0.5 text-xs font-semibold text-accent">
                    Market Intel
                  </span>
                  <span className="text-xs text-muted-foreground">Apr 3, 2026</span>
                </div>
                <h3 className="font-bold text-lg mb-2">
                  Dry Bulk Weekly — Capesize Surge
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Capesize rates climbed to $28,450/day this week, driven by
                  Brazilian iron ore demand and tightening tonnage supply in the
                  Pacific basin. FFA curves suggest further upside into Q2...
                </p>
              </div>
              <div className="px-6 pb-6">
                <div className="relative">
                  <div
                    className="text-sm text-muted-foreground leading-relaxed space-y-2 select-none blur-[6px]"
                    aria-hidden="true"
                  >
                    <p>
                      Panamax and Supramax segments saw mixed performance.
                      Panamax T/C average held steady at $14,200/day while
                      Supramaxes softened 3% on reduced grain bookings from the
                      US Gulf.
                    </p>
                    <p>
                      Bunker Watch: VLSFO Singapore traded at $578/mt (+$12
                      WoW). Scrubber spreads widened to $142/mt favoring
                      scrubber-fitted tonnage on long-haul routes.
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link
                      href="/onboard"
                      className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110 transition shadow-lg"
                    >
                      See a sample tailored to your focus
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/onboard"
              className="inline-block rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-accent-foreground hover:brightness-110 transition"
            >
              Build your own sample brief →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <IQseaLogo className="h-8" />
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} IQsea. Maritime intelligence,
              delivered.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { IQseaLogo } from "./components/iqsea-logo";

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" fill="currentColor" opacity={0.3} />
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

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

const features = [
  {
    icon: <CompassIcon />,
    title: "Tailored to Your Role",
    description:
      "Whether you're a ship owner, bunker trader, or maritime lawyer — your brief speaks your language.",
  },
  {
    icon: <ShieldIcon />,
    title: "Regulation & Compliance",
    description:
      "IMO updates, sanctions alerts, and compliance changes surfaced before they impact your operations.",
  },
  {
    icon: <ChartIcon />,
    title: "Market Intelligence",
    description:
      "Charter rates, bunker prices, port congestion, and S&P activity — the data that moves your market.",
  },
  {
    icon: <ClockIcon />,
    title: "Your Schedule, Your Depth",
    description:
      "Daily executive summaries or weekly deep dives. You choose the frequency and level of detail.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center">
            <IQseaLogo className="h-9" />
          </Link>
          <nav className="hidden sm:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 transition"
            >
              Login
            </Link>
            <Link
              href="/onboard"
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-24 sm:py-32">
        <div className="max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground mb-8">
            <span className="inline-block w-2 h-2 rounded-full bg-highlight animate-pulse" />
            Curated by Marine Engineers
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Your Intel Brief,
            <br />
            <span className="text-accent text-3xl sm:text-4xl lg:text-5xl">on your schedule.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop drowning in irrelevant news. IQsea delivers concise, role-specific intelligence — from IMO regulation changes to daily charter rates — straight to your desk.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/onboard"
              className="w-full sm:w-auto rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-accent-foreground hover:brightness-110 transition"
            >
              Build Your Intel Profile
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto rounded-lg border border-border px-8 py-3.5 text-base font-semibold text-foreground hover:bg-muted/50 transition"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Briefing, not noise.
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-16">
            Every brief is built by professionals for professionals. We use AI to sift, but engineering logic to curate.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 hover:border-accent/40 transition-colors"
              >
                <div className="text-accent mb-4">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-20 sm:py-28 bg-card/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-16">
            Three steps to smarter intelligence
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Tell Us Who You Are",
                desc: "Share your role, fleet focus, and the subjects that matter most to your operations.",
              },
              {
                step: "02",
                title: "Pick Your Schedule",
                desc: "Choose daily, business-days, 3x week, or weekly delivery — and how deep you want to go.",
              },
              {
                step: "03",
                title: "Read Your Brief",
                desc: "Receive a professional summary in your inbox. No ads, no fluff, just the facts you need to start your day.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center md:text-left">
                <div className="text-highlight font-mono text-sm font-bold mb-3">
                  {s.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <Link
              href="/onboard"
              className="inline-block rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-accent-foreground hover:brightness-110 transition"
            >
              Start Your Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Sample Briefs */}
      <section id="sample-briefs" className="px-6 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            See what your brief looks like
          </h2>
          <p className="text-muted-foreground text-center max-w-xl mx-auto mb-14">
            Preview real samples from recent IQsea intelligence reports. Sign up to unlock the full content.
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
                  The Marine Environment Protection Committee concluded with revised GHG reduction targets for 2035 and a draft framework for mid-term measures including a maritime carbon levy...
                </p>
              </div>
              {/* Blurred teaser overlay */}
              <div className="px-6 pb-6">
                <div className="relative">
                  <div className="text-sm text-muted-foreground leading-relaxed space-y-2 select-none blur-[6px]" aria-hidden="true">
                    <p>Impact Assessment: The revised targets push the decarbonization timeline forward by 5 years. Owners with LNG-ready tonnage gain a strategic advantage as methane-slip penalties are deferred to 2030.</p>
                    <p>Action Items: Review fleet compliance roadmaps against the new 2035 benchmarks. Carbon-intensity calculations for CII ratings will incorporate the updated EEXI baseline from Q3 2026.</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link
                      href="/onboard"
                      className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110 transition shadow-lg"
                    >
                      Sign up to read full brief
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
                <h3 className="font-bold text-lg mb-2">Dry Bulk Weekly — Capesize Surge</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Capesize rates climbed to $28,450/day this week, driven by Brazilian iron ore demand and tightening tonnage supply in the Pacific basin. FFA curves suggest further upside into Q2...
                </p>
              </div>
              {/* Blurred teaser overlay */}
              <div className="px-6 pb-6">
                <div className="relative">
                  <div className="text-sm text-muted-foreground leading-relaxed space-y-2 select-none blur-[6px]" aria-hidden="true">
                    <p>Panamax and Supramax segments saw mixed performance. Panamax T/C average held steady at $14,200/day while Supramaxes softened 3% on reduced grain bookings from the US Gulf.</p>
                    <p>Bunker Watch: VLSFO Singapore traded at $578/mt (+$12 WoW). Scrubber spreads widened to $142/mt favoring scrubber-fitted tonnage on long-haul routes.</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link
                      href="/onboard"
                      className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-110 transition shadow-lg"
                    >
                      Sign up to read full brief
                    </Link>
                  </div>
                </div>
              </div>
            </div>
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
              &copy; {new Date().getFullYear()} IQsea. Maritime intelligence, delivered.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { IQSEAWordmark } from "./components/iqsea-wordmark";
import { PortScene } from "./components/port-scene";
import { FAQAccordion } from "./components/faq-accordion";

// ─── Icons ──────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 shrink-0">
      <circle cx="8" cy="8" r="7" fill="#2BB3CD" fillOpacity="0.15" />
      <path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="#2BB3CD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 7 22 7 22 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <polyline points="12 7 12 12 15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M1 21v-2a7 7 0 0 1 14 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SunriseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M17 18a5 5 0 0 0-10 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="2" x2="12" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="1" y1="18" x2="3" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="21" y1="18" x2="23" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Nav ────────────────────────────────────────────────────────────────────

function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: "var(--border)", background: "rgba(11,20,36,0.85)" }}>
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
        <Link href="/" className="flex items-center">
          <IQSEAWordmark className="h-9" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {[
            { label: "Product", href: "#modules" },
            { label: "Pricing", href: "#pricing" },
            { label: "About", href: "#about" },
            { label: "Brief sample", href: "#demo" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm transition-colors"
              style={{ color: "var(--slate-300)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--slate-100)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--slate-300)")}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline text-sm transition-colors"
            style={{ color: "var(--slate-300)" }}
          >
            Sign in
          </Link>
          <Link
            href="/onboard"
            className="rounded-full px-5 py-2 text-sm font-semibold transition-all hover:brightness-110"
            style={{ background: "var(--teal-500)", color: "var(--navy-950)" }}
          >
            Get started
          </Link>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md"
            style={{ color: "var(--slate-300)" }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t px-6 py-4 flex flex-col gap-4" style={{ borderColor: "var(--border)", background: "rgba(11,20,36,0.97)" }}>
          {[
            { label: "Product", href: "#modules" },
            { label: "Pricing", href: "#pricing" },
            { label: "About", href: "#about" },
            { label: "Brief sample", href: "#demo" },
            { label: "Sign in", href: "/login" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm py-1"
              style={{ color: "var(--slate-300)" }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

// ─── Brief mock card ─────────────────────────────────────────────────────────

function BriefMockCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl border text-sm"
      style={{ background: "var(--navy-880)", borderColor: "var(--border-strong)" }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: "var(--navy-900)", borderColor: "var(--border)" }}>
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <div className="flex-1 mx-3 rounded-md px-3 py-1 text-xs" style={{ background: "var(--navy-800)", color: "var(--slate-400)" }}>
          iqsea.io / your-brief
        </div>
      </div>

      {/* Brief content */}
      <div className="p-5 space-y-4">
        {/* Brief header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-xs tracking-widest uppercase mb-1" style={{ color: "var(--teal-500)" }}>
              Your Maritime Brief
            </div>
            <div className="text-xs" style={{ color: "var(--slate-400)" }}>Wednesday, 29 April 2026 · 09:00</div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: "var(--slate-400)", fontFamily: "var(--font-mono)" }}>5 min read</div>
          </div>
        </div>

        {/* Article item */}
        <div className="rounded-xl p-4 border" style={{ background: "var(--navy-800)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(244,180,0,0.15)", color: "var(--gold-500)" }}>Regulation</span>
            <span className="text-xs" style={{ color: "var(--slate-400)" }}>IMO · Apr 28, 2026</span>
          </div>
          <div className="font-semibold mb-1" style={{ color: "var(--slate-100)" }}>IMO MEPC 84 — Key Outcomes</div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--slate-300)" }}>
            Revised GHG targets for 2035 and a draft framework for a maritime carbon
            levy. LNG-ready owners gain strategic advantage as methane-slip penalties defer to 2030.
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="rounded-md px-2 py-0.5 text-xs" style={{ background: "rgba(43,179,205,0.1)", color: "var(--teal-400)" }}>Impact: High</span>
            <span className="rounded-md px-2 py-0.5 text-xs" style={{ background: "var(--navy-950)", color: "var(--slate-400)" }}>Fleet: LNG / Capesize</span>
            <span className="rounded-md px-2 py-0.5 text-xs" style={{ background: "var(--navy-950)", color: "var(--slate-400)" }}>Source: Lloyd&apos;s Register</span>
          </div>
        </div>

        {/* Market pulse mini */}
        <div className="rounded-xl p-4 border" style={{ background: "var(--navy-800)", borderColor: "var(--border)" }}>
          <div className="font-semibold mb-2 text-xs tracking-wide uppercase" style={{ color: "var(--teal-500)" }}>Market Pulse</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Capesize TC", value: "$28,450", change: "+4.2%" },
              { label: "VLSFO SGP", value: "$578/mt", change: "+2.1%" },
              { label: "BDI", value: "1,842", change: "-0.8%" },
            ].map(({ label, value, change }) => (
              <div key={label}>
                <div className="text-xs mb-0.5" style={{ color: "var(--slate-400)" }}>{label}</div>
                <div className="font-semibold text-xs" style={{ color: "var(--slate-100)", fontFamily: "var(--font-mono)" }}>{value}</div>
                <div className="text-xs" style={{ color: change.startsWith("+") ? "#4ade80" : "#f87171" }}>{change}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Module card ─────────────────────────────────────────────────────────────

function ModuleCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div
      className="rounded-2xl p-6 border transition-all hover:border-[#2BB3CD]/30 group"
      style={{ background: "rgba(19,39,66,0.6)", borderColor: "var(--border)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-[#2BB3CD]/20"
        style={{ background: "rgba(43,179,205,0.12)", color: "var(--teal-500)" }}
      >
        {icon}
      </div>
      <div className="font-semibold mb-2" style={{ color: "var(--slate-100)" }}>{title}</div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--slate-300)" }}>{description}</p>
    </div>
  );
}

// ─── Role card ───────────────────────────────────────────────────────────────

function RoleCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      className="rounded-xl p-5 border transition-colors hover:border-[#2BB3CD]/30"
      style={{ background: "var(--navy-880)", borderColor: "var(--border)" }}
    >
      <div className="font-semibold mb-2" style={{ color: "var(--slate-100)" }}>{title}</div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--slate-300)" }}>{description}</p>
    </div>
  );
}

// ─── Pricing card ────────────────────────────────────────────────────────────

function PricingCard({
  name,
  price,
  annualPrice,
  tagline,
  features,
  ctaLabel,
  ctaHref,
  highlighted,
  badge,
  annual,
}: {
  name: string;
  price: string;
  annualPrice?: string;
  tagline: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
  badge?: string;
  annual: boolean;
}) {
  const displayPrice = annual && annualPrice ? annualPrice : price;

  return (
    <div
      className="relative rounded-2xl p-8 flex flex-col border"
      style={{
        background: highlighted ? "var(--navy-880)" : "var(--navy-900)",
        borderColor: highlighted ? "var(--teal-500)" : "var(--border)",
        boxShadow: highlighted ? "0 0 40px rgba(43,179,205,0.12)" : undefined,
      }}
    >
      {badge && (
        <div
          className="absolute top-0 right-6 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: "var(--teal-500)", color: "var(--navy-950)" }}
        >
          {badge}
        </div>
      )}
      <div className="font-bold text-lg mb-1" style={{ color: "var(--slate-100)" }}>{name}</div>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-4xl font-bold" style={{ color: "var(--slate-100)", fontFamily: "var(--font-mono)" }}>
          {displayPrice}
        </span>
        {displayPrice !== "Contact us" && (
          <span className="text-sm mb-1.5" style={{ color: "var(--slate-400)" }}>/month</span>
        )}
      </div>
      {annual && annualPrice && (
        <div className="text-xs mb-2" style={{ color: "var(--teal-400)" }}>Billed annually</div>
      )}
      <p className="text-sm mb-6" style={{ color: "var(--slate-300)" }}>{tagline}</p>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--slate-300)" }}>
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className="block text-center rounded-full py-3 font-semibold text-sm transition-all hover:brightness-110"
        style={
          highlighted
            ? { background: "var(--teal-500)", color: "var(--navy-950)" }
            : { background: "var(--navy-800)", color: "var(--slate-100)", border: "1px solid var(--border-strong)" }
        }
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [annual, setAnnual] = useState(false);

  const MODULES = [
    {
      icon: <TrendIcon />,
      title: "Market Pulse",
      description: "Bunker prices, freight indices, FFA curves. The rates that move your P&L — at a glance, before the open.",
    },
    {
      icon: <ClockIcon />,
      title: "Regulatory Timeline",
      description: "Countdown tracker for IMO, USCG, EU, DNV deadlines. Nothing catches you off guard.",
    },
    {
      icon: <UsersIcon />,
      title: "Competitor Tracker",
      description: "Press releases, fleet moves, contract wins, industry news on the companies you watch.",
    },
    {
      icon: <TargetIcon />,
      title: "Client Prospects",
      description: "AI-powered lead generation. We surface high-fit companies and decision-makers for outreach.",
    },
    {
      icon: <FileTextIcon />,
      title: "Tender Module",
      description: "Maritime and offshore tender opportunities matched to your profile and capabilities.",
    },
    {
      icon: <SunriseIcon />,
      title: "Off-Duty Module",
      description: "Personal interest section — hobbies, sports, anything you follow outside work.",
    },
  ];

  const ROLES = [
    { title: "Ship owners", description: "Asset-level news, fleet economics, geopolitical risk to your tonnage." },
    { title: "CEOs & MDs", description: "Strategic moves across competitors, regulatory shifts, market cycle signals." },
    { title: "Ship managers", description: "Compliance deadlines, technical bulletins, drydock and retrofit news." },
    { title: "OEM sales teams", description: "Newbuild orders, retrofit demand, drydock schedules in your segment." },
    { title: "Service providers", description: "Tender opportunities and customer fleet activity — leads, not noise." },
    { title: "Anyone selling into shipping", description: "Industry context that makes you sound like you're in the room." },
  ];

  const TOP_SOURCES = ["TradeWinds", "Lloyd’s Register", "DNV", "Splash247", "Seatrade Maritime", "Maritime Executive", "gCaptain"];

  const TIMELINE = [
    { time: "08:00", label: "Sources crawled", sub: "22 publications scanned" },
    { time: "08:30", label: "Personalized", sub: "Filtered to your role" },
    { time: "09:00", label: "Brief delivered", sub: "In your inbox" },
    { time: "09:05", label: "You’re ahead", sub: "Before the market opens" },
  ];

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 30%, #122036 0%, #0b1424 60%, #050a14 100%)", color: "var(--slate-100)" }}>
      {/* Compass cross dot grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cline x1='16' y1='13' x2='16' y2='19' stroke='rgba(143,168,196,0.08)' stroke-width='0.8' stroke-linecap='round'/%3E%3Cline x1='13' y1='16' x2='19' y2='16' stroke='rgba(143,168,196,0.08)' stroke-width='0.8' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundSize: "32px 32px" }} />
      {/* Hero glow — teal, centered, large */}
      <div className="absolute pointer-events-none" style={{ top: "-200px", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(43,179,205,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
      {/* Modules glow — teal, offset right */}
      <div className="absolute pointer-events-none" style={{ top: "40%", right: "-100px", width: "600px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(43,179,205,0.07) 0%, transparent 70%)", filter: "blur(50px)" }} />
      {/* Roles glow — gold, offset left */}
      <div className="absolute pointer-events-none" style={{ top: "55%", left: "-80px", width: "500px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(244,180,0,0.06) 0%, transparent 70%)", filter: "blur(50px)" }} />
      {/* Timeline glow — teal, centered */}
      <div className="absolute pointer-events-none" style={{ top: "70%", left: "50%", transform: "translateX(-50%)", width: "700px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(43,179,205,0.08) 0%, transparent 70%)", filter: "blur(50px)" }} />
      {/* CTA glow — teal, centered */}
      <div className="absolute pointer-events-none" style={{ top: "85%", left: "50%", transform: "translateX(-50%)", width: "800px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(43,179,205,0.10) 0%, transparent 70%)", filter: "blur(45px)" }} />
      <Nav />

      {/* ── Section 2: Hero ───────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center px-6 pt-24 pb-16 sm:pt-36 sm:pb-24 overflow-hidden text-center">
        {/* PortScene background */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <PortScene className="w-full h-full object-cover" />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(11,20,36,0.6) 0%, rgba(11,20,36,0.2) 40%, rgba(11,20,36,0.7) 100%)" }} />

        <div className="relative max-w-4xl mx-auto z-10">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-8 border"
            style={{ background: "rgba(43,179,205,0.1)", borderColor: "rgba(43,179,205,0.3)", color: "var(--teal-400)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--teal-500)" }} />
            Your Maritime Edge
          </div>

          {/* Headline */}
          <h1
            className="font-bold leading-tight mb-6"
            style={{ fontSize: "clamp(52px, 7vw, 104px)", letterSpacing: "-0.04em" }}
          >
            <span className="block" style={{ color: "var(--slate-100)" }}>Stay Ahead.</span>
            <span
              className="block font-serif-italic"
              style={{
                background: "linear-gradient(135deg, #2BB3CD 0%, #6bc4d2 60%, #8dd4df 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Stay Informed.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "var(--slate-300)" }}>
            Personalized maritime news that helps you make confident decisions, every day.
            Curated from 22 trusted sources, tailored to your role and markets.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/onboard"
              className="rounded-full px-8 py-3.5 font-semibold text-sm transition-all hover:brightness-110 w-full sm:w-auto text-center"
              style={{ background: "var(--teal-500)", color: "var(--navy-950)" }}
            >
              See a sample brief
            </Link>
            <a
              href="#demo"
              className="rounded-full px-8 py-3.5 font-semibold text-sm transition-all border w-full sm:w-auto text-center"
              style={{ borderColor: "var(--border-strong)", color: "var(--slate-200)", background: "rgba(255,255,255,0.04)" }}
            >
              Watch 90-second demo
            </a>
          </div>

          {/* Trust checkmarks */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm" style={{ color: "var(--slate-400)" }}>
            {["14-day free trial", "No credit card", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckIcon />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Product screenshot ────────────────────────────────── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <BriefMockCard />
        </div>
      </section>

      {/* ── Section 4: Source strip ───────────────────────────────────────── */}
      <section className="px-6 py-14 border-y" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-xs font-semibold tracking-widest uppercase mb-8" style={{ color: "var(--slate-400)" }}>
            Sourced from publications you trust
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center justify-center gap-6 sm:gap-8 min-w-max mx-auto px-4">
              {TOP_SOURCES.map((s) => (
                <span
                  key={s}
                  className="text-sm font-serif-italic whitespace-nowrap transition-colors cursor-default"
                  style={{ color: "var(--slate-300)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--teal-400)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--slate-300)")}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-6 text-xs" style={{ color: "var(--slate-400)" }}>
            + 15 more, monitored continuously
          </p>
        </div>
      </section>

      {/* ── Section 5: Intelligence modules ──────────────────────────────── */}
      <section id="modules" className="px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-5 border"
              style={{ background: "rgba(43,179,205,0.08)", borderColor: "rgba(43,179,205,0.2)", color: "var(--teal-400)" }}
            >
              Tailored to Your World
            </div>
            <h2 className="font-bold tracking-tight leading-tight" style={{ fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-0.03em" }}>
              <span className="block">Personalized News.</span>
              <span
                className="block font-serif-italic"
                style={{
                  background: "linear-gradient(135deg, #2BB3CD 0%, #6bc4d2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Smarter Decisions.
              </span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((m) => (
              <ModuleCard key={m.title} {...m} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Who it's for ───────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28" style={{ background: "rgba(9,16,28,0.65)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-5 border"
              style={{ background: "rgba(244,180,0,0.08)", borderColor: "rgba(244,180,0,0.25)", color: "var(--gold-500)" }}
            >
              Built for the Industry
            </div>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(26px, 3.5vw, 48px)", letterSpacing: "-0.03em", color: "var(--slate-100)" }}>
              Built around your role.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map((r) => (
              <RoleCard key={r.title} {...r} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 7: Daily rhythm timeline ─────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left: copy + timeline */}
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-5 border"
                style={{ background: "rgba(43,179,205,0.08)", borderColor: "rgba(43,179,205,0.2)", color: "var(--teal-400)" }}
              >
                Focus on What Matters
              </div>
              <h2 className="font-bold tracking-tight leading-tight mb-5" style={{ fontSize: "clamp(28px, 4vw, 52px)", letterSpacing: "-0.03em" }}>
                <span className="block">Five minutes.</span>
                <span
                  className="block font-serif-italic"
                  style={{
                    background: "linear-gradient(135deg, #2BB3CD 0%, #6bc4d2 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  The whole picture.
                </span>
              </h2>
              <p className="text-base leading-relaxed mb-10" style={{ color: "var(--slate-300)" }}>
                Every morning at 09:00 a personalized intelligence brief lands in your inbox.
                By the time you finish your coffee, you know everything that moved overnight.
              </p>

              {/* Timeline */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-2 bottom-2 w-px" style={{ background: "var(--border-strong)" }} />
                <div className="space-y-8">
                  {TIMELINE.map(({ time, label, sub }, i) => (
                    <div key={time} className="relative flex items-start gap-4">
                      <div
                        className="absolute -left-[1.5rem] mt-0.5 w-3 h-3 rounded-full border-2"
                        style={{
                          background: i === 3 ? "var(--teal-500)" : "var(--navy-800)",
                          borderColor: i === 3 ? "var(--teal-500)" : "var(--border-strong)",
                        }}
                      />
                      <div>
                        <span
                          className="text-sm font-semibold mr-3"
                          style={{ color: "var(--teal-400)", fontFamily: "var(--font-mono)" }}
                        >
                          {time}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: "var(--slate-100)" }}>{label}</span>
                        <div className="text-xs mt-0.5" style={{ color: "var(--slate-400)" }}>{sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: brief card (hidden on mobile) */}
            <div className="hidden lg:block">
              <BriefMockCard />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 8: Demo placeholder ──────────────────────────────────── */}
      <section id="demo" className="px-6 py-16 sm:py-20" style={{ background: "rgba(9,16,28,0.65)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="rounded-2xl aspect-video flex items-center justify-center relative overflow-hidden border"
            style={{ background: "var(--navy-880)", borderColor: "var(--border-strong)" }}
          >
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, #2BB3CD 0%, transparent 70%)" }}
            />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <IQSEAWordmark className="h-12" />
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 cursor-pointer transition-all hover:scale-105"
                style={{ borderColor: "var(--teal-500)", background: "rgba(43,179,205,0.15)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 ml-1" style={{ color: "var(--teal-500)" }}>
                  <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm" style={{ color: "var(--slate-400)" }}>
            See IQSEA in action — 90 seconds
          </p>
        </div>
      </section>

      {/* ── Section 9: Testimonial ────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <svg viewBox="0 0 48 36" fill="none" className="w-10 h-8 mx-auto mb-6 opacity-30" aria-hidden="true">
            <path d="M0 36V22C0 10 7.5 3 22.5 0L25 5C15 7 10.5 10.5 10 16H18V36H0ZM26 36V22C26 10 33.5 3 48.5 0L51 5C41 7 36.5 10.5 36 16H44V36H26Z" fill="var(--teal-500)" />
          </svg>
          <blockquote
            className="text-xl sm:text-2xl font-serif-italic leading-snug mb-8"
            style={{ color: "var(--slate-100)" }}
          >
            &ldquo;We used to spend an hour a day just reading headlines. Now we spend five minutes and know more.&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
              style={{ background: "var(--teal-500)", color: "var(--navy-950)" }}
            >
              SK
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm" style={{ color: "var(--slate-100)" }}>Sarah Kotinsky</div>
              <div className="text-xs" style={{ color: "var(--slate-400)" }}>Head of Chartering, Pacific Bulk</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 10: Pricing ───────────────────────────────────────────── */}
      <section id="pricing" className="px-6 py-20 sm:py-28" style={{ background: "rgba(9,16,28,0.65)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-bold tracking-tight mb-4" style={{ fontSize: "clamp(26px, 3.5vw, 48px)", letterSpacing: "-0.03em", color: "var(--slate-100)" }}>
              Simple, transparent pricing.
            </h2>
            <div className="inline-flex items-center gap-3 mt-2">
              <span className="text-sm" style={{ color: annual ? "var(--slate-400)" : "var(--slate-100)" }}>Monthly</span>
              <button
                onClick={() => setAnnual(!annual)}
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{ background: annual ? "var(--teal-500)" : "var(--navy-700)" }}
                aria-label="Toggle annual billing"
              >
                <span
                  className="absolute top-1 w-4 h-4 rounded-full transition-transform"
                  style={{ background: "white", left: "4px", transform: annual ? "translateX(24px)" : "translateX(0)" }}
                />
              </button>
              <span className="text-sm" style={{ color: annual ? "var(--slate-100)" : "var(--slate-400)" }}>
                Annual <span className="text-xs ml-1" style={{ color: "var(--teal-400)" }}>Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <PricingCard
              name="Standard"
              price="$15"
              annualPrice="$12"
              tagline="Everything you need to stay ahead."
              features={[
                "Daily personalized brief",
                "All 6 intelligence modules",
                "All depth modes (headline, summary, deep-dive)",
                "22 monitored sources",
                "Configurable delivery time",
                "14-day free trial included",
              ]}
              ctaLabel="Get started free"
              ctaHref="/onboard"
              highlighted
              badge="14-day free trial"
              annual={annual}
            />
            <PricingCard
              name="Pro"
              price="Contact us"
              tagline="For teams and enterprises."
              features={[
                "Everything in Standard",
                "Team access & shared briefs",
                "API access",
                "Custom sources",
                "Priority support",
                "Custom integrations",
              ]}
              ctaLabel="Talk to us"
              ctaHref="#"
              badge="Coming soon"
              annual={annual}
            />
          </div>
        </div>
      </section>

      {/* ── Section 11: FAQ ───────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-bold tracking-tight text-center mb-12" style={{ fontSize: "clamp(24px, 3vw, 40px)", letterSpacing: "-0.03em", color: "var(--slate-100)" }}>
            Frequently asked questions
          </h2>
          <FAQAccordion />
        </div>
      </section>

      {/* ── Section 12: Final CTA band ────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28" style={{ background: "rgba(9,16,28,0.65)" }}>
        <div className="max-w-3xl mx-auto">
          <div
            className="relative rounded-3xl px-8 py-16 text-center overflow-hidden"
            style={{ background: "linear-gradient(135deg, var(--navy-880) 0%, var(--navy-800) 100%)", border: "1px solid var(--border-strong)" }}
          >
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, #2BB3CD 0%, transparent 65%)" }}
            />
            <div className="relative z-10">
              <h2 className="font-bold tracking-tight leading-tight mb-6" style={{ fontSize: "clamp(30px, 4.5vw, 60px)", letterSpacing: "-0.04em" }}>
                <span className="block" style={{ color: "var(--slate-100)" }}>Build your</span>
                <span
                  className="block font-serif-italic"
                  style={{
                    background: "linear-gradient(135deg, #2BB3CD 0%, #6bc4d2 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  maritime edge.
                </span>
              </h2>
              <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: "var(--slate-300)" }}>
                14-day free trial, no credit card required. Cancel anytime.
              </p>
              <Link
                href="/onboard"
                className="inline-block rounded-full px-10 py-4 font-semibold text-base transition-all hover:brightness-110"
                style={{ background: "var(--teal-500)", color: "var(--navy-950)" }}
              >
                Get started free &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 13: Footer ────────────────────────────────────────────── */}
      <footer id="about" className="border-t px-6 py-14" style={{ borderColor: "var(--border)", background: "var(--navy-950)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-1">
              <IQSEAWordmark className="h-9 mb-4" />
              <p className="text-sm leading-relaxed" style={{ color: "var(--slate-400)" }}>
                Maritime intelligence, delivered every morning.
              </p>
              <div className="flex gap-3 mt-4">
                {[
                  {
                    label: "LinkedIn",
                    d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
                  },
                  {
                    label: "X",
                    d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.732-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
                  },
                ].map(({ label, d }) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                    style={{ background: "var(--navy-800)", color: "var(--slate-400)" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Nav columns */}
            {[
              {
                heading: "Product",
                links: [
                  { label: "Features", href: "#modules" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Sample brief", href: "#demo" },
                ],
              },
              {
                heading: "Company",
                links: [
                  { label: "About", href: "#about" },
                  { label: "Contact", href: "#" },
                ],
              },
              {
                heading: "Legal",
                links: [
                  { label: "Privacy", href: "#" },
                  { label: "Terms", href: "#" },
                ],
              },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <div className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--slate-400)" }}>
                  {heading}
                </div>
                <ul className="space-y-3">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <a
                        href={href}
                        className="text-sm transition-colors"
                        style={{ color: "var(--slate-300)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--slate-100)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--slate-300)")}
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--slate-400)" }}>&copy; 2026 IQsea. All rights reserved.</p>
            <p className="text-xs" style={{ color: "var(--slate-400)" }}>Maritime intelligence, delivered.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

const SOURCES_22 = "Splash247, gCaptain, Seatrade Maritime, Maritime Executive, Hellenic Shipping News, Riviera, LNG Prime, Ship & Bunker, Offshore Energy, Ship Technology Global, The Loadstar, Marine Link, Marine Log, Container News, Offshore Engineer, LNG Industry, Dry Bulk, TradeWinds, Lloyd's Register, DNV, Safety4Sea, ABS.";

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What sources does IQSEA use?",
    answer: (
      <p>
        We monitor 22 authoritative maritime publications and classification
        societies: {SOURCES_22} All content is attributed to its original source
        with verbatim quotes where relevant.
      </p>
    ),
  },
  {
    question: "How is the brief personalized?",
    answer: (
      <p>
        During onboarding you tell us your role (ship owner, CEO, ship manager,
        OEM sales, etc.), the vessel segments and trade routes you care about,
        and which intelligence modules to include (market pulse, regulatory
        tracker, competitor monitoring, tenders, and more). You can also choose
        a depth mode — headline, summary, or deep-dive — per section. All
        preferences can be changed at any time from your settings page.
      </p>
    ),
  },
  {
    question: "When does my brief arrive?",
    answer: (
      <p>
        Briefs are pre-generated 30 minutes before your chosen delivery time and
        sent by email. The default is 09:00 in your configured timezone, so
        it&apos;s in your inbox before the market opens. You can change your
        delivery time in settings.
      </p>
    ),
  },
  {
    question: "Can I change my preferences after signing up?",
    answer: (
      <p>
        Yes — everything is editable in the Settings page. Role, subjects,
        modules, depth modes, delivery time, and email address can all be
        updated. Changes take effect from the next brief generation.
      </p>
    ),
  },
  {
    question: "Is there a free trial?",
    answer: (
      <p>
        Yes. You get a 14-day free trial with full access to all features and
        modules — no credit card required to start. If you decide IQSEA
        isn&apos;t for you, just let the trial expire or cancel from settings.
        Nothing is charged.
      </p>
    ),
  },
  {
    question: "What is the cancellation policy?",
    answer: (
      <p>
        Cancel anytime from your settings page — no lock-in, no cancellation
        fee. You&apos;ll continue to receive briefs until the end of your
        current billing period, then your subscription ends.
      </p>
    ),
  },
  {
    question: "Do you use AI?",
    answer: (
      <p>
        Yes, but always grounded on real source material. IQSEA ingests
        articles from 22 trusted publications, then uses AI to summarize,
        prioritize, and personalize — always citing the original source and
        using verbatim quotes. We do not generate speculative content or
        fabricate market data.
      </p>
    ),
  },
  {
    question: "How is this different from just reading TradeWinds?",
    answer: (
      <p>
        TradeWinds is one excellent source. IQSEA monitors 22 sources
        simultaneously, filters them to what actually matters for your specific
        role and markets, and delivers a single curated brief — saving 45–60
        minutes of reading per day. You get TradeWinds <em>plus</em> Lloyd&apos;s
        Register, DNV, gCaptain, Seatrade, and 17 more, all condensed to the
        five minutes that actually move your decisions.
      </p>
    ),
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y" style={{ borderColor: "var(--border-strong)" }}>
      {FAQ_ITEMS.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between text-left py-5 gap-4 group"
          >
            <span className="font-semibold text-[var(--slate-100)] group-hover:text-white transition-colors">
              {item.question}
            </span>
            <span
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all"
              style={{
                background: openIndex === i ? "var(--teal-500)" : "var(--navy-800)",
                color: openIndex === i ? "var(--navy-950)" : "var(--slate-400)",
              }}
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="w-3.5 h-3.5 transition-transform"
                style={{ transform: openIndex === i ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
          {openIndex === i && (
            <div className="pb-5 text-sm leading-relaxed" style={{ color: "var(--slate-300)" }}>
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IQsea Logo Options — Intel Brief",
  description: "Preview of five IQsea logo concepts.",
};

/* ─── SVG Logo Components ─── */

function ModernWave() {
  return (
    <svg viewBox="0 0 200 60" className="w-full h-auto">
      <path
        d="M10 40 Q30 10, 50 30 T90 25 T130 35 T170 20"
        fill="none"
        stroke="#003366"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path
        d="M10 50 Q30 25, 50 40 T90 35 T130 45 T170 30"
        fill="none"
        stroke="#708090"
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.7}
      />
      <text x="175" y="45" fill="#003366" fontSize="18" fontWeight="700" fontFamily="sans-serif">
        IQsea
      </text>
    </svg>
  );
}

function CompassIQ() {
  return (
    <svg viewBox="0 0 200 80" className="w-full h-auto">
      {/* outer circle frame */}
      <circle cx="40" cy="40" r="32" fill="none" stroke="#708090" strokeWidth={3} />
      {/* compass needle pointing NE */}
      <polygon points="40,12 44,38 40,42 36,38" fill="#003366" />
      <polygon points="40,68 36,42 40,38 44,42" fill="#708090" opacity={0.5} />
      {/* center dot */}
      <circle cx="40" cy="40" r="3" fill="#003366" />
      {/* label */}
      <text x="85" y="46" fill="#003366" fontSize="22" fontWeight="700" fontFamily="sans-serif">
        IQsea
      </text>
    </svg>
  );
}

function MaritimeShield() {
  return (
    <svg viewBox="0 0 200 80" className="w-full h-auto">
      {/* shield */}
      <path
        d="M20 10 L60 10 L60 50 Q40 70 20 50 Z"
        fill="#003366"
      />
      {/* wave line */}
      <path
        d="M25 40 Q33 32, 40 40 T55 40"
        fill="none"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* chip icon top-left */}
      <rect x="26" y="16" width="12" height="10" rx="2" fill="#708090" />
      <line x1="29" y1="16" x2="29" y2="12" stroke="#708090" strokeWidth={1.5} />
      <line x1="35" y1="16" x2="35" y2="12" stroke="#708090" strokeWidth={1.5} />
      <line x1="26" y1="20" x2="22" y2="20" stroke="#708090" strokeWidth={1.5} />
      <line x1="38" y1="20" x2="42" y2="20" stroke="#708090" strokeWidth={1.5} />
      {/* label */}
      <text x="72" y="46" fill="#003366" fontSize="22" fontWeight="700" fontFamily="sans-serif">
        IQsea
      </text>
    </svg>
  );
}

function MinimalistCircle() {
  return (
    <svg viewBox="0 0 200 80" className="w-full h-auto">
      {/* main circle */}
      <circle cx="40" cy="40" r="32" fill="#003366" />
      {/* wave cut-out at bottom */}
      <path
        d="M8 48 Q20 38, 32 48 T56 48 T72 48 L72 72 L8 72 Z"
        fill="#0d1117"
      />
      {/* IQ text */}
      <text
        x="40"
        y="42"
        fill="#708090"
        fontSize="20"
        fontWeight="700"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        IQ
      </text>
      {/* label */}
      <text x="82" y="46" fill="#003366" fontSize="22" fontWeight="700" fontFamily="sans-serif">
        IQsea
      </text>
    </svg>
  );
}

function TechHorizon() {
  return (
    <svg viewBox="0 0 200 80" className="w-full h-auto">
      {/* three horizontal bars */}
      <rect x="20" y="15" width="40" height="8" rx="2" fill="#003366" />
      <rect x="20" y="31" width="40" height="8" rx="2" fill="#708090" />
      <rect x="20" y="47" width="40" height="8" rx="2" fill="#003366" />
      {/* vertical I bar */}
      <rect x="14" y="12" width="4" height="46" rx="1" fill="#708090" />
      {/* label */}
      <text x="72" y="46" fill="#003366" fontSize="22" fontWeight="700" fontFamily="sans-serif">
        IQsea
      </text>
    </svg>
  );
}

/* ─── Page ─── */

const logos = [
  { name: "Option 1 — Modern Wave", desc: "#003366 wave path with #708090 accent", Component: ModernWave },
  { name: "Option 2 — Compass IQ", desc: "Gray circle frame, Deep Sea Blue needle pointing NE", Component: CompassIQ },
  { name: "Option 3 — Maritime Shield", desc: "#003366 shield, white wave line, Slate Gray chip top-left", Component: MaritimeShield },
  { name: "Option 4 — Minimalist Circle", desc: "#003366 circle, #708090 'IQ' inside, wave cut-out bottom", Component: MinimalistCircle },
  { name: "Option 5 — Tech Horizon", desc: "3 parallel bars (blue/gray) with vertical 'I'", Component: TechHorizon },
];

export default function LogoPreviewPage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-white px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">IQsea Logo Options</h1>
          <p className="text-sm text-gray-400">Five concepts for the IQsea brand mark</p>
        </header>

        {logos.map(({ name, desc, Component }) => (
          <section
            key={name}
            className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3"
          >
            <h2 className="text-lg font-semibold">{name}</h2>
            <p className="text-xs text-gray-400">{desc}</p>
            <div className="bg-[#0d1117] rounded-lg p-4 flex items-center justify-center">
              <div className="w-72">
                <Component />
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

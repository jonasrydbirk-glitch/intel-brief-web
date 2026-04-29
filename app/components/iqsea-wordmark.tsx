// Full hero logo block: IQSEA wordmark + organic brushstroke wave + tagline
export function IQSEAHeroLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-0 select-none ${className}`}>
      {/* Wordmark row — gold accent dot above the I */}
      <div className="relative flex items-baseline">
        {/* Gold dot above the I */}
        <span
          className="absolute"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#F4B400",
            top: -8,
            left: 1,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 700,
            fontSize: "clamp(36px, 5vw, 44px)",
            letterSpacing: "0.15em",
            color: "#e8eef4",
            lineHeight: 1,
          }}
        >
          IQSEA
        </span>
      </div>

      {/* Organic brushstroke wave */}
      <svg
        viewBox="0 0 200 22"
        width="200"
        height="22"
        fill="none"
        aria-hidden="true"
        style={{ display: "block", marginTop: 6, overflow: "visible" }}
      >
        {/* Main sweep — asymmetric S-curve, thicker body */}
        <path
          d="M6,13 C18,4 30,18 50,10 C68,3 82,17 102,9 C120,2 136,16 158,8 C168,5 176,13 192,7"
          stroke="#2BB3CD"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.92"
        />
        {/* Thinner texture layer — offset slightly to add depth */}
        <path
          d="M10,14 C24,5 36,17 54,11 C70,5 84,16 104,10 C122,4 138,15 160,9 C170,6 178,12 190,8"
          stroke="#2BB3CD"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
        />
        {/* Faint leading splash — taper at start */}
        <path
          d="M3,12 C5,9 8,15 10,13"
          stroke="#2BB3CD"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
        {/* Faint trailing splash — taper at end */}
        <path
          d="M188,7 C192,5 196,9 198,6"
          stroke="#2BB3CD"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.25"
        />
        {/* Gold dot anchoring end of wave */}
        <circle cx="193" cy="7" r="2.5" fill="#F4B400" opacity="0.9" />
      </svg>

      {/* Tagline */}
      <span
        style={{
          fontFamily: "var(--font-inter), Inter, sans-serif",
          fontWeight: 300,
          fontSize: 15,
          letterSpacing: "0.12em",
          color: "var(--slate-300)",
          marginTop: 10,
          lineHeight: 1,
        }}
      >
        Your Maritime Edge.
      </span>
    </div>
  );
}

// Compact nav/footer wordmark — unchanged visual, keeps existing usage
export function IQSEAWordmark({ className = "h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="IQSEA"
    >
      <text
        x="0"
        y="22"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="22"
        fill="#e8eef4"
        letterSpacing="0.08em"
      >
        IQSEA
      </text>
      {/* Organic brushstroke wave */}
      <path
        d="M1,32 C8,27 14,36 22,31 C30,26 36,35 46,29 C54,24 62,33 72,28 C80,24 88,32 98,28"
        stroke="#2BB3CD"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <path
        d="M3,33 C10,28 16,35 24,31 C32,27 38,34 48,30 C56,25 64,32 74,29 C82,25 90,31 96,29"
        stroke="#2BB3CD"
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      {/* Gold accent dot */}
      <circle cx="98" cy="28" r="2.5" fill="#F4B400" />
    </svg>
  );
}

export function IQSEAWordmarkSmall({ className = "h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="IQSEA"
    >
      <text
        x="0"
        y="18"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="17"
        fill="#e8eef4"
        letterSpacing="0.08em"
      >
        IQSEA
      </text>
      <path
        d="M1,26 C7,21 13,29 20,24 C27,19 33,27 42,23 C50,19 57,26 66,22 C73,19 78,25 82,23"
        stroke="#2BB3CD"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <path
        d="M3,27 C9,22 15,28 22,25 C29,21 35,26 44,23 C52,20 59,25 68,22 C74,20 79,24 81,23"
        stroke="#2BB3CD"
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />
      <circle cx="82" cy="23" r="2" fill="#F4B400" />
    </svg>
  );
}

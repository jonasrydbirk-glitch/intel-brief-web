export function IQseaLogo({ className = "h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="IQsea"
    >
      {/* Dark rounded rectangle background */}
      <rect width="160" height="44" rx="8" fill="#0b1424" />

      {/* Teal wave line */}
      <path
        d="M14 28 C22 18, 30 34, 40 24 C50 14, 58 34, 66 24"
        stroke="#53b1c1"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Gold dot near end of wave */}
      <circle cx="66" cy="24" r="3" fill="#d4a017" />

      {/* White 'IQsea' text */}
      <text
        x="78"
        y="29"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize="18"
        fill="#ffffff"
        letterSpacing="-0.02em"
      >
        IQsea
      </text>
    </svg>
  );
}

export function IQseaLogoSmall({ className = "h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="IQsea"
    >
      <rect width="140" height="36" rx="6" fill="#0b1424" />
      <path
        d="M10 22 C16 14, 22 28, 30 20 C38 12, 44 28, 52 20"
        stroke="#53b1c1"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="52" cy="20" r="2.5" fill="#d4a017" />
      <text
        x="62"
        y="24"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize="15"
        fill="#ffffff"
        letterSpacing="-0.02em"
      >
        IQsea
      </text>
    </svg>
  );
}

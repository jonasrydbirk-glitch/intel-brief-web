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
      {/* Teal wave under the wordmark */}
      <path
        d="M2 32 C14 24, 22 38, 34 30 C46 22, 54 36, 66 28 C78 20, 88 34, 100 28"
        stroke="#2BB3CD"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Gold accent dot */}
      <circle cx="100" cy="28" r="2.5" fill="#F4B400" />
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
        d="M2 26 C12 19, 19 30, 28 24 C37 18, 44 29, 54 23 C63 17, 70 27, 80 23"
        stroke="#2BB3CD"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="80" cy="23" r="2" fill="#F4B400" />
    </svg>
  );
}

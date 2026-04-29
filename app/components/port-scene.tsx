export function PortScene({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1424" />
          <stop offset="40%" stopColor="#0f2340" />
          <stop offset="70%" stopColor="#1a3058" />
          <stop offset="100%" stopColor="#0f1b30" />
        </linearGradient>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d2240" />
          <stop offset="100%" stopColor="#0b1424" />
        </linearGradient>
        <linearGradient id="glowTeal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2BB3CD" stopOpacity="0" />
          <stop offset="50%" stopColor="#2BB3CD" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2BB3CD" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sunGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4B400" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F4B400" stopOpacity="0" />
        </linearGradient>
        <filter id="blur-sm">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="blur-md">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Sky */}
      <rect width="1200" height="500" fill="url(#skyGrad)" />

      {/* Dawn horizon glow */}
      <ellipse cx="600" cy="320" rx="500" ry="80" fill="url(#sunGlow)" filter="url(#blur-md)" />

      {/* Stars */}
      {[
        [80, 40], [200, 60], [340, 30], [450, 80], [580, 20], [700, 55], [820, 35],
        [940, 70], [1050, 45], [1150, 25], [130, 110], [280, 95], [490, 100], [750, 85],
        [900, 110], [1100, 90], [160, 160], [400, 140], [640, 170], [870, 145],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} fill="white" opacity={0.4 + (i % 3) * 0.2} />
      ))}

      {/* Water surface */}
      <rect x="0" y="320" width="1200" height="180" fill="url(#waterGrad)" />

      {/* Water ripple lines */}
      <path d="M0 340 Q150 336 300 340 Q450 344 600 340 Q750 336 900 340 Q1050 344 1200 340" stroke="#1a3a6080" strokeWidth="1" fill="none" />
      <path d="M0 360 Q200 356 400 360 Q600 364 800 360 Q1000 356 1200 360" stroke="#1a3a6060" strokeWidth="1" fill="none" />
      <path d="M0 385 Q250 381 500 385 Q750 389 1000 385 Q1100 383 1200 385" stroke="#1a3a6040" strokeWidth="1" fill="none" />

      {/* Teal water shimmer */}
      <rect x="0" y="320" width="1200" height="40" fill="url(#glowTeal)" opacity="0.5" />

      {/* Far city skyline (blurred) */}
      <g filter="url(#blur-sm)" opacity="0.4">
        <rect x="50" y="250" width="20" height="70" fill="#132742" />
        <rect x="80" y="230" width="15" height="90" fill="#132742" />
        <rect x="100" y="260" width="30" height="60" fill="#132742" />
        <rect x="140" y="240" width="12" height="80" fill="#132742" />
        <rect x="160" y="255" width="25" height="65" fill="#132742" />
        <rect x="900" y="245" width="18" height="75" fill="#132742" />
        <rect x="925" y="225" width="14" height="95" fill="#132742" />
        <rect x="945" y="260" width="28" height="60" fill="#132742" />
        <rect x="980" y="235" width="20" height="85" fill="#132742" />
        <rect x="1010" y="250" width="15" height="70" fill="#132742" />
        <rect x="1040" y="240" width="22" height="80" fill="#132742" />
        <rect x="1080" y="255" width="18" height="65" fill="#132742" />
        <rect x="1110" y="230" width="12" height="90" fill="#132742" />
      </g>

      {/* Mid-ground: large container ship left */}
      <g opacity="0.85">
        {/* Hull */}
        <path d="M60 305 L60 330 L380 330 L400 305 Z" fill="#0f2040" />
        <path d="M60 330 L80 340 L370 340 L380 330 Z" fill="#0a1830" />
        {/* Superstructure */}
        <rect x="280" y="270" width="80" height="35" fill="#132742" />
        <rect x="295" y="255" width="50" height="20" fill="#1a3a5c" />
        <rect x="310" y="245" width="30" height="12" fill="#1f4470" />
        {/* Crane mast */}
        <line x1="320" y1="245" x2="320" y2="200" stroke="#1a3a5c" strokeWidth="2" />
        <line x1="280" y1="215" x2="360" y2="215" stroke="#1a3a5c" strokeWidth="1.5" />
        {/* Containers on deck */}
        {[70, 100, 130, 160, 195, 225, 255].map((x, i) => (
          <rect key={i} x={x} y={300} width={25} height={12}
            fill={["#1a4a6e","#1e3a5a","#163050","#1a4060","#12283a","#1a3a5c","#163248"][i]} />
        ))}
        {[75, 105, 135, 165, 200, 230].map((x, i) => (
          <rect key={i} x={x} y={289} width={22} height={11}
            fill={["#12283a","#1a4060","#163248","#1a4a6e","#1e3a5a","#163050"][i]} />
        ))}
        {/* Nav lights */}
        <circle cx="400" cy="305" r="2" fill="#2BB3CD" opacity="0.8" />
        <circle cx="400" cy="305" r="5" fill="#2BB3CD" opacity="0.2" filter="url(#blur-sm)" />
      </g>

      {/* Mid-ground: tanker right */}
      <g opacity="0.7">
        <path d="M800 310 L800 332 L1100 332 L1120 310 Z" fill="#0d1e38" />
        <path d="M800 332 L820 342 L1090 342 L1100 332 Z" fill="#090f1e" />
        <rect x="990" y="278" width="90" height="34" fill="#122036" />
        <rect x="1005" y="263" width="60" height="18" fill="#1a3a5c" />
        <rect x="1015" y="252" width="40" height="13" fill="#1a3a5c" />
        {/* Pipe runs on deck */}
        <line x1="830" y1="310" x2="980" y2="310" stroke="#0f2040" strokeWidth="3" />
        <line x1="840" y1="306" x2="980" y2="306" stroke="#0d1e38" strokeWidth="2" />
        {[850, 890, 930, 960].map((x, i) => (
          <rect key={i} x={x} y={304} width={6} height={8} fill="#1a3a5c" />
        ))}
        <circle cx="1120" cy="310" r="2" fill="#F4B400" opacity="0.7" />
        <circle cx="1120" cy="310" r="6" fill="#F4B400" opacity="0.15" filter="url(#blur-sm)" />
      </g>

      {/* Foreground: dock/pier silhouette */}
      <path
        d="M0 490 L0 410 L50 405 L50 390 L80 388 L80 405 L180 400 L180 388 L210 386 L210 400 L1200 395 L1200 490 Z"
        fill="#080f1c"
      />
      {/* Dock bollards */}
      {[100, 300, 500, 700, 900, 1100].map((x, i) => (
        <g key={i}>
          <rect x={x - 4} y={380} width={8} height={18} fill="#0d1e38" />
          <rect x={x - 6} y={378} width={12} height={5} fill="#122036" rx="1" />
        </g>
      ))}

      {/* Mooring ropes */}
      <path d="M150 340 Q200 370 220 388" stroke="#0d1e38" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M350 338 Q360 365 380 388" stroke="#0d1e38" strokeWidth="1.5" fill="none" opacity="0.6" />

      {/* Water reflections of lights */}
      <line x1="400" y1="342" x2="395" y2="380" stroke="#2BB3CD" strokeWidth="1" opacity="0.3" />
      <line x1="1120" y1="344" x2="1115" y2="380" stroke="#F4B400" strokeWidth="1" opacity="0.25" />

      {/* Teal glow on horizon */}
      <ellipse cx="600" cy="320" rx="300" ry="8" fill="#2BB3CD" opacity="0.06" filter="url(#blur-md)" />
    </svg>
  );
}

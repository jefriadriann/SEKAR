/**
 * Ilustrasi dekoratif (SVG buatan sendiri). Hanya hiasan: bukan foto, bukan
 * logo resmi, dan bukan peta data geografis.
 */

export function BuildingIllustration({ className }: { className?: string }) {
  const rows = Array.from({ length: 14 }, (_, i) => i);
  const cols = Array.from({ length: 5 }, (_, i) => i);
  return (
    <svg viewBox="0 0 320 360" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="bld-front" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e3eefb" />
          <stop offset="1" stopColor="#9fc2ea" />
        </linearGradient>
        <linearGradient id="bld-side" x1="0" x2="1">
          <stop offset="0" stopColor="#8fb6e4" />
          <stop offset="1" stopColor="#6d9bd6" />
        </linearGradient>
        <linearGradient id="bld-glass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#cfe2f6" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="bld-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0.78" stopColor="#f3f8fd" stopOpacity="0" />
          <stop offset="1" stopColor="#f3f8fd" stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* gedung belakang */}
      <rect x="190" y="110" width="80" height="210" fill="#d3e3f5" />
      <rect x="250" y="80" width="56" height="240" fill="#e0ebf8" />
      {Array.from({ length: 11 }, (_, i) => (
        <rect key={`b${i}`} x="258" y={92 + i * 20} width="40" height="8" fill="#ffffff" fillOpacity="0.55" />
      ))}
      {/* menara utama: muka depan + samping */}
      <polygon points="40,52 160,40 160,320 40,320" fill="url(#bld-front)" />
      <polygon points="160,40 214,58 214,320 160,320" fill="url(#bld-side)" />
      <polygon points="40,52 160,40 214,58 96,72" fill="#f1f6fd" />
      <rect x="36" y="46" width="128" height="8" fill="#5f8fd0" />
      {rows.map((r) =>
        cols.map((c) => <rect key={`${r}-${c}`} x={50 + c * 22} y={66 + r * 17.5} width="16" height="11" rx="1" fill="url(#bld-glass)" />),
      )}
      {rows.map((r) => (
        <polygon key={`s${r}`} points={`166,${70 + r * 17.5} 208,${82 + r * 17.5} 208,${90 + r * 17.5} 166,${78 + r * 17.5}`} fill="#ffffff" fillOpacity="0.35" />
      ))}
      {/* lobi */}
      <rect x="28" y="306" width="200" height="16" fill="#7fa9dc" />
      <rect x="10" y="320" width="300" height="10" fill="#bcd3ed" />
      {/* pepohonan */}
      {[
        [22, 318, 24],
        [62, 324, 20],
        [104, 322, 22],
        [236, 320, 20],
        [280, 326, 17],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <rect x={x - 2} y={y} width="4" height="20" fill="#5b7a52" />
          <circle cx={x} cy={y - 4} r={r} fill={i % 2 ? "#4f9a6a" : "#3f8a5c"} />
          <circle cx={x - r / 3} cy={y - r / 2} r={r * 0.6} fill="#6ab583" fillOpacity="0.7" />
        </g>
      ))}
      <rect x="0" y="330" width="320" height="30" fill="#e4eef9" />
      <rect x="0" y="0" width="320" height="360" fill="url(#bld-fade)" />
    </svg>
  );
}

/** Pola kepulauan abstrak — dekorasi, sengaja tidak akurat dan tanpa data. */
export function ArchipelagoDecor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 230" className={className} aria-hidden focusable="false">
      <g fill="#c4daf3" fillOpacity="0.75">
        <path d="M30 30 C60 40 95 80 130 115 C150 135 160 150 150 160 C135 158 110 135 90 110 C65 82 40 60 30 30Z" />
        <path d="M165 172 C200 168 250 172 300 178 C305 184 300 190 290 189 C240 186 195 186 168 182 C160 178 160 174 165 172Z" />
        <path d="M305 186 C315 184 322 186 324 190 C318 193 310 192 305 186Z M332 188 C345 186 352 188 356 192 C346 195 338 194 332 188Z M362 190 C380 188 392 190 398 195 C385 198 370 197 362 190Z" />
        <path d="M195 55 C225 35 270 38 295 60 C305 85 290 115 262 128 C235 135 205 120 195 95 C188 80 188 66 195 55Z" />
        <path d="M335 60 C350 55 365 58 372 66 C360 70 352 76 350 88 C365 86 380 90 384 100 C372 104 356 104 350 112 C352 128 346 145 336 150 C330 135 334 118 330 104 C326 90 326 72 335 60Z" />
        <path d="M410 90 C418 86 424 90 424 98 C418 104 410 100 410 90Z M428 118 C440 114 448 118 446 126 C438 130 430 126 428 118Z M402 135 C412 132 418 136 416 142 C408 145 402 142 402 135Z" />
        <path d="M455 105 C480 92 520 95 550 108 C575 118 592 135 588 160 C570 172 540 168 515 160 C495 150 480 140 470 128 C460 120 452 113 455 105Z" />
      </g>
      <g fill="#ffffff" fillOpacity="0.6">
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={40 + ((i * 53) % 540)} cy={40 + ((i * 37) % 150)} r="1.6" />
        ))}
      </g>
      <g fill="none" stroke="#9cc3ec" strokeOpacity="0.6" strokeWidth="1" strokeDasharray="3 4">
        <path d="M110 120 Q 220 20 340 90" />
        <path d="M240 90 Q 400 10 520 130" />
        <path d="M230 180 Q 330 120 430 120" />
      </g>
      <g fill="#7fb2ea">
        {[
          [110, 120],
          [240, 90],
          [340, 90],
          [520, 130],
          [230, 180],
          [430, 120],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />
        ))}
      </g>
    </svg>
  );
}

export function WaveLines({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 900 220" preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      <g fill="none" strokeWidth="1.2">
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M0 ${190 - i * 6} C 250 ${120 - i * 8}, 520 ${230 - i * 4}, 900 ${70 - i * 6}`} stroke="#9ec8f0" strokeOpacity={0.25 + i * 0.05} />
        ))}
        <path d="M120 215 C 380 150, 620 210, 900 110" stroke="#e2b33c" strokeOpacity="0.85" strokeWidth="2" />
        <path d="M60 222 C 360 170, 640 225, 900 135" stroke="#e2b33c" strokeOpacity="0.4" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

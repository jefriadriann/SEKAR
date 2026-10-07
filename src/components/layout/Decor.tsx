import { IndonesiaMap } from "@/components/map/IndonesiaMap";

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

/** Peta Indonesia (Natural Earth) sebagai dekorasi — tanpa data. */
export function ArchipelagoDecor({ className }: { className?: string }) {
  return <IndonesiaMap variant="decor" className={className} />;
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

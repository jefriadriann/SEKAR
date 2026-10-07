/**
 * Ikon ilustrasi SEKAR (SVG buatan sendiri): duotone bergradasi dengan
 * highlight lembut. Semua dekoratif (aria-hidden); label teks ada di sekitarnya.
 */
import { useId, type ReactNode } from "react";

function Svg({ size = 56, children, className }: { size?: number; children: ReactNode; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden focusable="false" className={className}>
      {children}
    </svg>
  );
}

/** Dokumen hasil pemeriksaan + grafik + kaca pembesar. */
export function AuditDocIcon({ size }: { size?: number }) {
  const id = useId();
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d9e9ff" />
          <stop offset="1" stopColor="#a6c8fb" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#4f9bff" />
          <stop offset="1" stopColor="#1a4fae" />
        </linearGradient>
      </defs>
      <rect x="17" y="6" width="30" height="40" rx="5" fill={`url(#${id}a)`} />
      <path d="M11 15a5 5 0 0 1 5-5h17l9 9v30a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5V15Z" fill="#fff" stroke="#9cc3f7" strokeWidth="1.5" />
      <path d="M33 10v6a3 3 0 0 0 3 3h6" fill="#e3efff" stroke="#9cc3f7" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="16" y="21" width="13" height="3" rx="1.5" fill="#bcd6fa" />
      <rect x="16" y="27" width="18" height="3" rx="1.5" fill="#bcd6fa" />
      <rect x="16" y="39" width="4" height="8" rx="1.2" fill="#7cb5ff" />
      <rect x="22" y="35" width="4" height="12" rx="1.2" fill="#2f7fe0" />
      <rect x="28" y="37" width="4" height="10" rx="1.2" fill="#9cc8ff" />
      <circle cx="44.5" cy="43.5" r="11.5" fill={`url(#${id}b)`} stroke="#fff" strokeWidth="2.5" />
      <circle cx="43.3" cy="42.3" r="4.6" stroke="#fff" strokeWidth="2.4" />
      <path d="m46.8 45.8 3.6 3.6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M36 37.5a10 10 0 0 1 6-4.6" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

/** Map dokumen dengan tanda centang (permindok terpenuhi). */
export function FolderCheckIcon({ size }: { size?: number }) {
  const id = useId();
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#5fd8b8" />
          <stop offset="1" stopColor="#1fa883" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#a8f0dc" />
          <stop offset="1" stopColor="#4fcfaa" />
        </linearGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2fd08f" />
          <stop offset="1" stopColor="#0f8f5f" />
        </linearGradient>
      </defs>
      <path d="M8 18a5 5 0 0 1 5-5h11l5 5h22a5 5 0 0 1 5 5v22a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5V18Z" fill={`url(#${id}a)`} />
      <rect x="15" y="15" width="30" height="22" rx="3" fill="#fff" />
      <rect x="19" y="20" width="16" height="2.6" rx="1.3" fill="#bdebdc" />
      <rect x="19" y="25" width="11" height="2.6" rx="1.3" fill="#bdebdc" />
      <path d="M8 29a5 5 0 0 1 5-5h38a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5V29Z" fill={`url(#${id}b)`} />
      <path d="M13 29h38" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="47" cy="46" r="10.5" fill={`url(#${id}c)`} stroke="#fff" strokeWidth="2.5" />
      <path d="m42.4 46.2 3.2 3.2 6-6.4" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Kalender dengan jam (jadwal pemeriksaan). */
export function CalendarClockIcon({ size }: { size?: number }) {
  const id = useId();
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#ffc05a" />
          <stop offset="1" stopColor="#f08c00" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#4f9bff" />
          <stop offset="1" stopColor="#1a4fae" />
        </linearGradient>
      </defs>
      <rect x="8" y="12" width="42" height="40" rx="7" fill="#fff" stroke="#f6cf8a" strokeWidth="1.5" />
      <path d="M8 19a7 7 0 0 1 7-7h28a7 7 0 0 1 7 7v5H8v-5Z" fill={`url(#${id}a)`} />
      <rect x="17" y="7" width="4" height="10" rx="2" fill="#1c3a8a" />
      <rect x="37" y="7" width="4" height="10" rx="2" fill="#1c3a8a" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`${r}-${c}`} x={14 + c * 8} y={29 + r * 7} width="5" height="4" rx="1.2" fill={r === 1 && c === 1 ? "#f08c00" : "#fde3b4"} />
        )),
      )}
      <circle cx="46" cy="45" r="11.5" fill={`url(#${id}b)`} stroke="#fff" strokeWidth="2.5" />
      <path d="M46 39v6.2l4 2.6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Tumpukan materi dengan roda gigi (SGo & ketentuan). */
export function LibraryGearIcon({ size }: { size?: number }) {
  const id = useId();
  const teeth = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#a594ff" />
          <stop offset="1" stopColor="#5a48c8" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#7c6cf0" />
          <stop offset="1" stopColor="#4b3bb5" />
        </linearGradient>
      </defs>
      <rect x="18" y="6" width="28" height="36" rx="5" fill="#ddd5ff" transform="rotate(8 32 24)" />
      <rect x="12" y="11" width="30" height="40" rx="5" fill={`url(#${id}a)`} />
      <rect x="17" y="18" width="16" height="3" rx="1.5" fill="#fff" fillOpacity=".9" />
      <rect x="17" y="24" width="20" height="3" rx="1.5" fill="#fff" fillOpacity=".6" />
      <rect x="17" y="30" width="12" height="3" rx="1.5" fill="#fff" fillOpacity=".6" />
      <path d="M14 16a4 4 0 0 1 4-4h6" stroke="#fff" strokeOpacity=".5" strokeWidth="1.6" strokeLinecap="round" />
      <g transform="translate(46 45)">
        <circle r="12" fill="#fff" />
        {teeth.map((a) => (
          <rect key={a} x="-2.3" y="-10" width="4.6" height="5" rx="1.2" fill={`url(#${id}b)`} transform={`rotate(${a})`} />
        ))}
        <circle r="6.6" fill={`url(#${id}b)`} />
        <circle r="2.6" fill="#fff" />
      </g>
    </Svg>
  );
}

/** Basis data aset dengan tanda centang (rekonsiliasi aset). */
export function ReconcileIcon({ size }: { size?: number }) {
  const id = useId();
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#34d8b4" />
          <stop offset="1" stopColor="#0f9b6e" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#4f9bff" />
          <stop offset="1" stopColor="#1a4fae" />
        </linearGradient>
      </defs>
      {[38, 27, 16].map((y, i) => (
        <g key={y}>
          <path d={`M10 ${y}v8c0 3.3 8.5 6 19 6s19-2.7 19-6v-8`} fill={`url(#${id}a)`} opacity={1 - i * 0.12} />
          <ellipse cx="29" cy={y} rx="19" ry="6" fill={i === 2 ? "#a9f0dc" : "#57dcb9"} />
        </g>
      ))}
      <ellipse cx="29" cy="16" rx="12" ry="3" fill="#fff" fillOpacity=".5" />
      <circle cx="47" cy="46" r="10.5" fill={`url(#${id}b)`} stroke="#fff" strokeWidth="2.5" />
      <path d="M42.5 44.5a5 5 0 0 1 8.6-2.4M51.5 47.5a5 5 0 0 1-8.6 2.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="m51.4 39.6.2 2.8-2.8.2M42.6 52.4l-.2-2.8 2.8-.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Layar video dengan tombol putar dan bar progres (video panduan). */
export function VideoGuideIcon({ size }: { size?: number }) {
  const id = useId();
  return (
    <Svg size={size}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ff6a5c" />
          <stop offset=".55" stopColor="#ee2d48" />
          <stop offset="1" stopColor="#c8133a" />
        </linearGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff" stopOpacity=".45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="5" y="12" width="54" height="40" rx="13" fill={`url(#${id}a)`} />
      <rect x="5" y="12" width="54" height="18" rx="13" fill={`url(#${id}h)`} />
      <path d="M27 24.6c0-1.6 1.7-2.5 3-1.7l10.4 6.6c1.2.8 1.2 2.6 0 3.4L30 39.5c-1.3.8-3-.1-3-1.7V24.6Z" fill="#fff" />
      <rect x="13" y="45" width="38" height="2.6" rx="1.3" fill="#fff" fillOpacity=".4" />
      <rect x="13" y="45" width="16" height="2.6" rx="1.3" fill="#fff" />
      <circle cx="29" cy="46.3" r="2.6" fill="#fff" />
    </Svg>
  );
}

/** Ikon berkas dengan pita label (TXT, PDF, dsb.). */
export function FileTypeIcon({ label, color, size = 40 }: { label: string; color: string; size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".78" />
        </linearGradient>
      </defs>
      <path d="M10 6a4 4 0 0 1 4-4h14l10 10v30a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V6Z" fill="#fff" stroke="#d9e3f0" strokeWidth="1.5" />
      <path d="M28 2v7a3 3 0 0 0 3 3h7" fill="#eef3fa" stroke="#d9e3f0" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="15" y="17" width="14" height="2.4" rx="1.2" fill="#dbe5f2" />
      <rect x="15" y="22" width="18" height="2.4" rx="1.2" fill="#dbe5f2" />
      <rect x="4" y="28" width="30" height="13" rx="3.5" fill={`url(#${id}a)`} />
      <text x="19" y="37.6" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif" letterSpacing=".5">
        {label}
      </text>
    </svg>
  );
}

/** Buku panduan terbuka. */
export function GuideBookIcon({ size = 40 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ffc05a" />
          <stop offset="1" stopColor="#e08b0b" />
        </linearGradient>
      </defs>
      <path d="M4 11c6-3 13-3 20 1v28c-7-4-14-4-20-1V11Z" fill={`url(#${id}a)`} />
      <path d="M44 11c-6-3-13-3-20 1v28c7-4 14-4 20-1V11Z" fill="#ffd98f" />
      <path d="M24 12v28" stroke="#fff" strokeWidth="1.6" />
      <path d="M9 17c3.5-1 7-.8 10.5.6M9 22c3.5-1 7-.8 10.5.6M9 27c3.5-1 7-.8 10.5.6" stroke="#fff" strokeOpacity=".75" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M29 17.6c3.5-1.4 7-1.6 10.5-.6M29 22.6c3.5-1.4 7-1.6 10.5-.6" stroke="#e08b0b" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

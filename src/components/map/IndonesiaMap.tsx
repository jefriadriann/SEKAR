"use client";

/**
 * Peta Indonesia berbasis Natural Earth (public domain) yang dikelompokkan per
 * korwil. Mode "choropleth" mewarnai korwil sesuai nilai (mis. jumlah temuan)
 * dan dapat diklik/difokus keyboard untuk memfilter; mode "decor" untuk hiasan.
 * Peta hanya menampilkan agregat per korwil — tidak ada lokasi kantor.
 */
import { useId, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { KORWIL_CENTERS, KORWIL_PATHS, MAP_HEIGHT, MAP_WIDTH, NEIGHBOR_PATH } from "./indonesia-map-data";

const DOT_COLORS = ["#1d4f9e"];
const RAMP = ["#dbe4f2", "#b5c8e6", "#7f9fd2", "#3f70b9", "#13235a"];

/** Skala warna berurutan dari nilai terkecil hingga terbesar antarkorwil. */
function rampColor(v: number, min: number, max: number) {
  if (max <= 0) return RAMP[0];
  if (max === min) return RAMP[2];
  const t = (v - min) / (max - min);
  return RAMP[Math.min(RAMP.length - 1, Math.floor(t * (RAMP.length - 0.001)))];
}

export function IndonesiaMap({
  values,
  selected,
  onSelect,
  variant = "choropleth",
  unitLabel = "temuan",
  className,
  showLabels = true,
}: {
  values?: Record<string, number>;
  selected?: string | null;
  onSelect?: (korwil: string) => void;
  variant?: "choropleth" | "decor";
  unitLabel?: string;
  className?: string;
  showLabels?: boolean;
}) {
  const id = useId();
  const korwils = Object.keys(KORWIL_PATHS);
  const nums = korwils.map((k) => values?.[k] ?? 0);
  const max = Math.max(0, ...nums);
  const min = Math.min(...nums);
  const decor = variant === "decor";

  const onKey = (k: string) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(k);
    }
  };

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className={cn("h-auto w-full", className)}
      role={decor ? undefined : "group"}
      aria-hidden={decor ? true : undefined}
      aria-label={decor ? undefined : `Peta sebaran ${unitLabel} per korwil`}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-land`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#cfdcef" />
          <stop offset="1" stopColor="#b3c7e5" />
        </linearGradient>
        <pattern id={`${id}-dots`} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="4.5" cy="4.5" r="0.9" fill="#ffffff" fillOpacity="0.55" />
        </pattern>
      </defs>

      <path d={NEIGHBOR_PATH} fill={decor ? "#e6eff9" : "#eef3f9"} stroke="#d5e2f1" strokeWidth="0.6" />

      <g>
        {korwils.map((k) => {
          const v = values?.[k] ?? 0;
          const active = selected === k;
          const fill = decor ? `url(#${id}-land)` : active ? "#0c1a4d" : rampColor(v, min, max);
          const interactive = !decor && !!onSelect;
          return (
            <g
              key={k}
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-pressed={interactive ? active : undefined}
              aria-label={interactive ? `${k}: ${formatNumber(v)} ${unitLabel}` : undefined}
              onClick={interactive ? () => onSelect?.(k) : undefined}
              onKeyDown={interactive ? onKey(k) : undefined}
              className={cn(interactive && "cursor-pointer outline-none [&:focus-visible>path]:stroke-[#f0b429] [&:focus-visible>path]:stroke-[2.5]", "transition-opacity duration-200")}
              opacity={!decor && selected && !active ? 0.45 : 1}
            >
              <title>{decor ? k : `${k}: ${formatNumber(v)} ${unitLabel}`}</title>
              <path d={KORWIL_PATHS[k]} fill={fill} stroke="#ffffff" strokeWidth={decor ? 0.6 : 0.9} strokeLinejoin="round" className={cn(interactive && "transition-[fill] duration-200 hover:fill-[#3a7ee0]")} />
              {decor && <path d={KORWIL_PATHS[k]} fill={`url(#${id}-dots)`} />}
            </g>
          );
        })}
      </g>

      {decor && (
        <g fill="none" stroke="#8ea8d4" strokeOpacity="0.7" strokeWidth="1.2" strokeDasharray="4 5">
          {[
            ["Sumatera", "Jawa"],
            ["Jawa", "Kalimantan"],
            ["Kalimantan", "Sulawesi"],
            ["Sulawesi", "Maluku dan Papua"],
            ["Jawa", "Bali dan Nusa Tenggara"],
            ["Bali dan Nusa Tenggara", "Sulawesi"],
          ].map(([a, b]) => {
            const [x1, y1] = KORWIL_CENTERS[a];
            const [x2, y2] = KORWIL_CENTERS[b];
            const mx = (x1 + x2) / 2;
            const my = Math.min(y1, y2) - 45;
            return <path key={a + b} d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} />;
          })}
        </g>
      )}

      {korwils.map((k) => {
        const [x, y] = KORWIL_CENTERS[k];
        if (decor)
          return (
            <g key={k}>
              <circle cx={x} cy={y} r="10" fill={DOT_COLORS[korwils.indexOf(k) % DOT_COLORS.length]} fillOpacity="0.22" />
              <circle cx={x} cy={y} r="4.5" fill={DOT_COLORS[korwils.indexOf(k) % DOT_COLORS.length]} stroke="#ffffff" strokeWidth="1.5" />
            </g>
          );
        if (!showLabels) return null;
        const v = values?.[k] ?? 0;
        const label = formatNumber(v);
        const w = 22 + label.length * 15;
        return (
          <g key={k} pointerEvents="none" aria-hidden>
            <rect x={x - w / 2} y={y - 18} width={w} height="36" rx="18" fill="#ffffff" fillOpacity="0.95" stroke="#cfdaea" strokeWidth="1.5" />
            <text x={x} y={y + 8} textAnchor="middle" fontSize="24" fontWeight="700" fill="#13235a">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MapLegend({ min = 0, max, unitLabel = "temuan" }: { min?: number; max: number; unitLabel?: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted" aria-hidden>
      <span>{formatNumber(min)}</span>
      <span className="flex h-2 w-28 overflow-hidden rounded-full">
        {RAMP.map((c) => (
          <span key={c} className="flex-1" style={{ background: c }} />
        ))}
      </span>
      <span>
        {formatNumber(max)} {unitLabel}
      </span>
    </div>
  );
}

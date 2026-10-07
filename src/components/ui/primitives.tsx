import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronDown, ChevronRight, Inbox, Search, X } from "lucide-react";
import { NumberTicker } from "@/components/magicui/NumberTicker";
import { ShineBorder } from "@/components/magicui/ShineBorder";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1.5 text-sm" : "px-3.5 py-2 text-[15px]",
        variant === "primary" && "btn-grad text-white",
        variant === "secondary" && "border border-line bg-white text-navy-900 shadow-sm hover:border-sky-300 hover:bg-sky-50",
        variant === "ghost" && "text-navy-800 hover:bg-sky-50",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        className,
      )}
    />
  );
}

/** Kartu putih bergaya referensi (sudut 14px, garis tipis, bayangan lembut). */
export function Card({ children, className, as: Tag = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "article"; "aria-labelledby"?: string }) {
  return (
    <Tag {...rest} className={cx("panel panel-accent min-w-0 p-4 sm:p-5", className)}>
      {children}
    </Tag>
  );
}

const TILE = {
  blue: "bg-gradient-to-br from-[#5aa2ff] to-[#1d58b5] text-white shadow-[0_6px_14px_-6px_rgba(29,88,181,0.7)]",
  teal: "bg-gradient-to-br from-[#34d8b4] to-[#0f9b6e] text-white shadow-[0_6px_14px_-6px_rgba(15,155,110,0.7)]",
  amber: "bg-gradient-to-br from-[#fcc94a] to-[#e08b0b] text-white shadow-[0_6px_14px_-6px_rgba(224,139,11,0.7)]",
  rose: "bg-gradient-to-br from-[#ff8a96] to-[#e0313f] text-white shadow-[0_6px_14px_-6px_rgba(224,49,63,0.7)]",
  violet: "bg-gradient-to-br from-[#b49cff] to-[#6d4fd1] text-white shadow-[0_6px_14px_-6px_rgba(109,79,209,0.7)]",
  sky: "bg-gradient-to-br from-[#7fd6ff] to-[#1f8fd6] text-white shadow-[0_6px_14px_-6px_rgba(31,143,214,0.7)]",
} as const;
export type TileTone = keyof typeof TILE;

export function IconTile({ tone = "blue", children, size = "md" }: { tone?: TileTone; children: ReactNode; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cx(
        "relative grid shrink-0 place-items-center overflow-hidden ring-1 ring-inset ring-white/30",
        TILE[tone],
        size === "sm" && "h-8 w-8 rounded-[10px] [&_svg]:h-4 [&_svg]:w-4",
        size === "md" && "h-10 w-10 rounded-xl [&_svg]:h-5 [&_svg]:w-5",
        size === "lg" && "h-12 w-12 rounded-[14px] [&_svg]:h-6 [&_svg]:w-6",
      )}
    >
      {/* kilau lembut di separuh atas */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" />
      <span className="pointer-events-none absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-white/15" />
      <span className="relative grid place-items-center [&_svg]:drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]">{children}</span>
    </span>
  );
}

/** Judul panel: ikon (opsional) + judul tebal + subjudul + aksi di kanan. */
export function SectionHeader({
  id,
  title,
  description,
  actions,
  icon,
  iconTone = "blue",
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  iconTone?: TileTone;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <IconTile tone={iconTone}>{icon}</IconTile>}
        <div className="min-w-0">
          <h2 id={id} className="flex items-center gap-2 text-[17px] font-bold leading-tight text-navy-900">
            {!icon && <span aria-hidden className="h-4 w-1.5 shrink-0 rounded-full bg-[linear-gradient(180deg,var(--m2),var(--m3))]" />}
            {title}
          </h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Banner judul halaman bergradasi warna modul: breadcrumb, judul, deskripsi, ilustrasi, dan kontrol. */
export function PageHeader({
  title,
  description,
  actions,
  crumb,
  uppercase,
  icon,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  crumb?: string;
  uppercase?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="hero-banner mb-5 px-5 py-5 sm:px-7 sm:py-6">
      {/* Ornamen: cincin, titik, dan gelombang tipis (statis). */}
      <svg aria-hidden focusable="false" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id="hero-dots" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="#fff" fillOpacity=".22" />
          </pattern>
        </defs>
        <rect x="58%" y="0" width="42%" height="100%" fill="url(#hero-dots)" />
      </svg>
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[28px] border-white/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 right-40 h-40 w-40 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />

      <div className="relative">
        <nav aria-label="Breadcrumb" className="mb-2 text-[13px] text-white/80">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="rounded hover:text-white hover:underline">
                Beranda
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="font-semibold text-white">
              {crumb ?? title}
            </li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 max-w-3xl items-center gap-4">
            {icon && (
              <span aria-hidden className="hidden h-[68px] w-[68px] shrink-0 place-items-center rounded-[20px] bg-white/95 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)] ring-4 ring-white/25 sm:grid">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h1 className={cx("text-[26px] font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.15)] sm:text-[32px]", uppercase && "uppercase")}>{title}</h1>
              {description && <p className="mt-1 text-[15px] text-white/85">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-end gap-2 [&_label]:text-white/90">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

const TONES = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  blue: "bg-[#e6efff] text-[#2457c5] border-[#cfe0ff]",
  navy: "bg-navy-800 text-white border-navy-800",
  teal: "bg-[#e3f7ec] text-[#13804f] border-[#c4ecd5]",
  amber: "bg-[#fff4dc] text-[#a86a06] border-[#f7e0a8]",
  rose: "bg-[#fde8e8] text-[#c62f35] border-[#f8cccc]",
  violet: "bg-[#efe9fd] text-[#5b3fc0] border-[#ddd2fa]",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Gradasi cerah kartu KPI per tone (dua/tiga warna agar tidak monoton). */
const KPI_GRADIENT: Record<TileTone, string> = {
  blue: "linear-gradient(135deg, #2563eb 0%, #4f46e5 55%, #7c3aed 100%)",
  teal: "linear-gradient(135deg, #059669 0%, #10b981 50%, #2dd4bf 100%)",
  amber: "linear-gradient(135deg, #f59e0b 0%, #f97316 60%, #fb7185 100%)",
  rose: "linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #ec4899 100%)",
  violet: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%)",
  sky: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #22d3ee 100%)",
};
const KPI_SHADOW: Record<TileTone, string> = {
  blue: "rgba(79,70,229,0.55)",
  teal: "rgba(16,185,129,0.55)",
  amber: "rgba(249,115,22,0.55)",
  rose: "rgba(244,63,94,0.55)",
  violet: "rgba(168,85,247,0.55)",
  sky: "rgba(14,165,233,0.55)",
};

/** Kartu KPI. `tinted` = kartu gradasi cerah dengan teks putih; tanpa `tinted` = panel putih. */
export function KpiCard({
  label,
  value,
  hint,
  tone = "blue",
  icon,
  tinted,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: TileTone;
  icon?: ReactNode;
  tinted?: boolean;
}) {
  const valueClass = cx("text-[30px] font-extrabold leading-tight tabular-nums", tinted ? "text-white" : "text-navy-900");
  return (
    <div
      className={cx(
        "relative flex items-center gap-4 overflow-hidden rounded-[18px] p-4 transition-transform duration-200 hover:-translate-y-0.5",
        tinted ? "text-white" : "panel panel-accent",
      )}
      style={tinted ? { background: KPI_GRADIENT[tone], boxShadow: `0 14px 30px -16px ${KPI_SHADOW[tone]}` } : undefined}
    >
      {tinted ? (
        <>
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border-[18px] border-white/15" />
          <span aria-hidden className="pointer-events-none absolute -bottom-10 right-16 h-24 w-24 rounded-full bg-white/10" />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
        </>
      ) : (
        <ShineBorder shineColor={["var(--m2)", "#ffffff", "var(--m3)"]} />
      )}
      {icon &&
        (tinted ? (
          <span aria-hidden className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-white/20 ring-1 ring-inset ring-white/40 backdrop-blur-[2px] [&_svg]:h-6 [&_svg]:w-6">
            {icon}
          </span>
        ) : (
          <IconTile tone={tone} size="lg">
            {icon}
          </IconTile>
        ))}
      <div className="relative min-w-0">
        <p className={cx("text-[14px] font-semibold", tinted ? "text-white/90" : "text-navy-900")}>{label}</p>
        <p className="flex flex-wrap items-baseline gap-x-2">
          {typeof value === "number" ? (
            <NumberTicker data-kpi={label} value={value} className={valueClass} />
          ) : (
            <span data-kpi={label} className={valueClass}>
              {value}
            </span>
          )}
          {hint && <span className={cx("text-[13px] font-semibold", tinted ? "rounded-full bg-white/20 px-2 py-0.5 text-white" : "text-muted")}>{hint}</span>}
        </p>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-sky-50/40 px-4 py-8 text-center">
      <Inbox className="h-8 w-8 text-sky-600" aria-hidden />
      <p className="mt-2 font-semibold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Select dengan label kecil di atas & ikon di dalam kotak (gaya filter referensi). */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  id,
  className,
  icon,
  hideLabel,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  id: string;
  className?: string;
  icon?: ReactNode;
  hideLabel?: boolean;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className={cx("text-[12px] font-semibold text-muted", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-navy-800 [&_svg]:h-4 [&_svg]:w-4" aria-hidden>
            {icon}
          </span>
        )}
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={cx(
            "h-10 w-full min-w-0 appearance-none rounded-lg border border-line bg-white pr-8 text-[14px] font-semibold text-navy-900 shadow-sm hover:border-sky-300",
            icon ? "pl-8" : "pl-3",
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-800" aria-hidden />
      </div>
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  id,
  label = "Cari",
  placeholder,
  className,
  hideLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
  label?: string;
  placeholder?: string;
  className?: string;
  hideLabel?: boolean;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className={cx("text-[12px] font-semibold text-muted", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-line bg-white pl-8 pr-8 text-[14px] text-navy-900 placeholder:text-slate-400 hover:border-sky-300"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Hapus pencarian">
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

export function FilterChips({ chips, onClearAll }: { chips: { label: string; onRemove: () => void }[]; onClearAll: () => void }) {
  if (!chips.length) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Filter aktif">
      <span className="text-[12px] font-semibold text-muted">Filter aktif:</span>
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.onRemove}
          className="inline-flex items-center gap-1 rounded-full border border-transparent bg-[var(--m-soft)] px-2.5 py-0.5 text-[13px] font-semibold text-[var(--m1)] hover:brightness-95"
          aria-label={`Hapus filter ${c.label}`}
        >
          {c.label}
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
      <button type="button" onClick={onClearAll} className="text-[13px] font-semibold text-navy-800 underline underline-offset-2 hover:text-navy-950">
        Reset semua filter
      </button>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-sky-100/70", className)} aria-hidden />;
}

export function DescriptionList({ items }: { items: { term: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-[15px] sm:grid-cols-[160px_1fr]">
      {items.map((it) => (
        <div key={it.term} className="contents">
          <dt className="font-semibold text-muted">{it.term}</dt>
          <dd className="min-w-0 break-words text-navy-900">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SimulationNote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{children}</p>;
}

/** Tombol bulat panah (kartu beranda / kartu tautan). */
export function ArrowCircle() {
  return (
    <span
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#d7e3f3] bg-white text-navy-800 transition group-hover:border-transparent group-hover:bg-[linear-gradient(135deg,var(--m1),var(--m2))] group-hover:text-white"
    >
      <ChevronRight className="h-4 w-4" />
    </span>
  );
}

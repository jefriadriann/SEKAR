import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronDown, ChevronRight, Inbox, Search, X } from "lucide-react";

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
        variant === "primary" && "bg-brand text-white hover:bg-navy-800",
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
    <Tag {...rest} className={cx("panel min-w-0 p-4 sm:p-5", className)}>
      {children}
    </Tag>
  );
}

const TILE = {
  blue: "bg-[#e6f0ff] text-[#1d58b5]",
  teal: "bg-[#dff7ef] text-[#0f9b6e]",
  amber: "bg-[#fff3d6] text-[#c98a0b]",
  rose: "bg-[#fde8e8] text-[#d93a3f]",
  violet: "bg-[#efe9fd] text-[#6d4fd1]",
  sky: "bg-[#e3f4fd] text-[#1f8fd6]",
} as const;
export type TileTone = keyof typeof TILE;

export function IconTile({ tone = "blue", children, size = "md" }: { tone?: TileTone; children: ReactNode; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cx(
        "grid shrink-0 place-items-center rounded-xl",
        TILE[tone],
        size === "sm" && "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
        size === "md" && "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
        size === "lg" && "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6",
      )}
    >
      {children}
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
          <h2 id={id} className="text-[17px] font-bold leading-tight text-navy-900">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Breadcrumb + judul halaman + deskripsi + kontrol di kanan (sesuai referensi). */
export function PageHeader({
  title,
  description,
  actions,
  crumb,
  uppercase,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  crumb?: string;
  uppercase?: boolean;
}) {
  return (
    <div className="mb-4">
      <nav aria-label="Breadcrumb" className="mb-1 text-[13px] text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-navy-900 hover:underline">
              Beranda
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page" className="text-navy-900">
            {crumb ?? title}
          </li>
        </ol>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className={cx("text-[28px] font-extrabold leading-tight tracking-tight text-navy-900 sm:text-[32px]", uppercase && "uppercase")}>{title}</h1>
          {description && <p className="mt-0.5 text-[15px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-end gap-2">{actions}</div>}
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

/** Kartu KPI. `tinted` memberi latar berwarna seperti KPI Jadwal/DR pada referensi. */
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
  const bg = {
    blue: "bg-[#eaf3fe] border-[#d6e7fb]",
    teal: "bg-[#e6f7ee] border-[#cdeedb]",
    amber: "bg-[#fff5dc] border-[#f6e4b3]",
    rose: "bg-[#fdecec] border-[#f8d3d3]",
    violet: "bg-[#f1ecfd] border-[#e0d6fa]",
    sky: "bg-[#e9f6fd] border-[#d2ecfa]",
  }[tone];
  return (
    <div className={cx("flex items-center gap-4 rounded-[14px] border p-4", tinted ? bg : "panel")}>
      {icon && (
        <IconTile tone={tone} size="lg">
          {icon}
        </IconTile>
      )}
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-navy-900">{label}</p>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span data-kpi={label} className="text-[30px] font-extrabold leading-tight text-navy-900 tabular-nums">
            {value}
          </span>
          {hint && <span className="text-[13px] font-semibold text-muted">{hint}</span>}
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
          className="inline-flex items-center gap-1 rounded-full border border-[#cfe0ff] bg-[#e6efff] px-2.5 py-0.5 text-[13px] font-semibold text-[#2457c5] hover:bg-[#d8e6ff]"
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
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#d7e3f3] bg-white text-navy-800 transition group-hover:border-brand group-hover:bg-brand group-hover:text-white"
    >
      <ChevronRight className="h-4 w-4" />
    </span>
  );
}

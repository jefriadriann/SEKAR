import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Inbox, Search, X } from "lucide-react";

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
        variant === "primary" && "bg-navy-800 text-white hover:bg-navy-700",
        variant === "secondary" && "border border-line bg-white text-navy-800 hover:border-sky-300 hover:bg-sky-50",
        variant === "ghost" && "text-navy-700 hover:bg-sky-50",
        variant === "danger" && "bg-rose-700 text-white hover:bg-rose-800",
        className,
      )}
    />
  );
}

export function Card({ children, className, as: Tag = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "article"; "aria-labelledby"?: string }) {
  return (
    <Tag {...rest} className={cx("min-w-0 rounded-2xl border border-line bg-white/95 p-4 shadow-[0_1px_2px_rgba(11,37,69,0.04)] sm:p-5", className)}>
      {children}
    </Tag>
  );
}

export function SectionHeader({
  id,
  title,
  description,
  actions,
  icon,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-2 text-lg font-bold text-navy-900">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold text-navy-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  blue: "bg-sky-50 text-sky-800 border-sky-200",
  navy: "bg-navy-800 text-white border-navy-800",
  teal: "bg-teal-50 text-teal-800 border-teal-200",
  amber: "bg-amber-50 text-amber-900 border-amber-200",
  rose: "bg-rose-50 text-rose-800 border-rose-200",
  violet: "bg-violet-50 text-violet-800 border-violet-200",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "blue",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "blue" | "teal" | "amber" | "rose" | "violet" | "navy";
  icon?: ReactNode;
}) {
  const accent = {
    blue: "from-sky-500 to-blue-600",
    teal: "from-teal-500 to-cyan-600",
    amber: "from-amber-400 to-amber-600",
    rose: "from-rose-500 to-rose-700",
    violet: "from-violet-500 to-violet-700",
    navy: "from-navy-600 to-navy-900",
  }[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-white p-4">
      <div className={cx("absolute inset-y-0 left-0 w-1 bg-gradient-to-b", accent)} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-muted">{label}</p>
        {icon && <span className="text-navy-600" aria-hidden>{icon}</span>}
      </div>
      <p data-kpi={label} className="mt-1 text-[28px] font-bold leading-tight text-navy-900 tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-sky-50/40 px-4 py-10 text-center">
      <Inbox className="h-8 w-8 text-sky-600" aria-hidden />
      <p className="mt-2 font-semibold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  id,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  id: string;
  className?: string;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full min-w-0 rounded-lg border border-line bg-white px-2.5 text-[15px] text-navy-900 hover:border-sky-300"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wide text-muted">
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
          className="h-10 w-full rounded-lg border border-line bg-white pl-8 pr-8 text-[15px] text-navy-900 placeholder:text-slate-400 hover:border-sky-300"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Hapus pencarian"
          >
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
    <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Filter aktif">
      <span className="text-xs font-bold uppercase tracking-wide text-muted">Filter aktif:</span>
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.onRemove}
          className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sm font-semibold text-sky-900 hover:bg-sky-100"
          aria-label={`Hapus filter ${c.label}`}
        >
          {c.label}
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
      <button type="button" onClick={onClearAll} className="text-sm font-semibold text-navy-700 underline underline-offset-2 hover:text-navy-900">
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

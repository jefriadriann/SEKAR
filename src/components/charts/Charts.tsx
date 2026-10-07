"use client";

import { useId, useState, type ReactNode } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, RotateCcw, Table2 } from "lucide-react";
import { AXIS_TEXT, CATEGORY_GRADIENTS, CATEGORY_RAMP, GRID, SELECTED, SERIES_PRIMARY } from "@/lib/palette";
import { formatNumber, formatPercent, percent } from "@/lib/format";
import { cx } from "@/components/ui/primitives";

/**
 * Kartu chart: judul, toggle chart/tabel (alternatif aksesibel & keyboard),
 * ringkasan teks untuk pembaca layar, dan tombol reset saat kategori dipilih.
 */
export function ChartCard({
  title,
  description,
  summary,
  children,
  table,
  className,
  selectedLabel,
  onReset,
  icon,
}: {
  title: string;
  description?: string;
  summary: string;
  children: ReactNode;
  table: ReactNode;
  className?: string;
  selectedLabel?: string | null;
  onReset?: () => void;
  icon?: ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const id = useId();
  return (
    <section aria-labelledby={`${id}-t`} className={cx("panel panel-accent flex min-w-0 flex-col p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <div className="min-w-0">
            <h2 id={`${id}-t`} className="flex items-center gap-2 text-[16px] font-bold text-navy-900">
              <span aria-hidden className="h-4 w-1 shrink-0 rounded-full bg-[var(--m2)]" />
              {title}
            </h2>
            {description && <p className="text-[12px] text-muted">{description}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {selectedLabel && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-md border border-transparent bg-[var(--m-soft)] px-2 py-1 text-[12px] font-semibold text-[var(--m1)] hover:bg-[#d8e6ff]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Reset<span className="sr-only"> pilihan {selectedLabel}</span>
            </button>
          )}
          <div className="flex rounded-md border border-line p-0.5" role="group" aria-label={`Tampilan ${title}`}>
            <button
              type="button"
              onClick={() => setView("chart")}
              aria-pressed={view === "chart"}
              className={cx("rounded p-1", view === "chart" ? "bg-[var(--m-soft)] text-[var(--m1)]" : "text-muted hover:bg-sky-50")}
              title="Tampilan chart"
            >
              <BarChart3 className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              className={cx("rounded p-1", view === "table" ? "bg-[var(--m-soft)] text-[var(--m1)]" : "text-muted hover:bg-sky-50")}
              title="Tampilan tabel"
            >
              <Table2 className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Tabel</span>
            </button>
          </div>
        </div>
      </div>
      <p className="sr-only">{summary}</p>
      {selectedLabel && <p className="mt-1 text-[12px] font-semibold text-brand">Dipilih: {selectedLabel}</p>}
      <div className="mt-2 min-h-0 flex-1">{view === "chart" ? children : table}</div>
    </section>
  );
}

export interface CategoryDatum {
  key: string;
  count: number;
  uniqueUnits?: number;
}

function TooltipBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] shadow-lg">
      <p className="font-bold text-navy-900">{title}</p>
      {lines.map((l) => (
        <p key={l} className="text-muted">
          {l}
        </p>
      ))}
    </div>
  );
}

/** Label sumbu-x dibungkus maksimal tiga baris. */
function WrappedTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const words = String(payload?.value ?? "").split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 11 && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return (
    <text x={x} y={(y ?? 0) + 10} textAnchor="middle" fill={AXIS_TEXT} fontSize={11}>
      {lines.slice(0, 3).map((l, i) => (
        <tspan key={i} x={x} dy={i ? 12 : 0}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

/** Kolom vertikal berwarna per kategori dengan nilai di atas bar; klik = filter. */
export function ColumnChart({
  data,
  selected,
  onSelect,
  unitLabel = "temuan",
  height = 370,
}: {
  data: CategoryDatum[];
  selected: string | null;
  onSelect?: (key: string) => void;
  unitLabel?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 4, bottom: 18, left: -18 }} barCategoryGap="18%">
        <defs>
          {CATEGORY_GRADIENTS.map(([a, b], i) => (
            <linearGradient key={a} id={`colg-${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={a} />
              <stop offset="1" stopColor={b} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="key" tick={<WrappedTick />} interval={0} tickLine={false} axisLine={{ stroke: GRID }} height={40} />
        <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(29,79,158,0.06)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as CategoryDatum;
            return (
              <TooltipBox
                title={d.key}
                lines={[`${formatNumber(d.count)} ${unitLabel}`, ...(d.uniqueUnits !== undefined ? [`${d.uniqueUnits} KPw unik`] : []), ...(onSelect ? ["Klik untuk memfilter"] : [])]}
              />
            );
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44} cursor={onSelect ? "pointer" : undefined} onClick={(_, index) => onSelect?.(data[index].key)} isAnimationActive={false}>
          <LabelList dataKey="count" position="top" fill="#142a6e" fontSize={12} fontWeight={700} />
          {data.map((d, i) => (
            <Cell key={d.key} fill={selected === d.key ? SELECTED : `url(#colg-${i % CATEGORY_RAMP.length})`} fillOpacity={selected && selected !== d.key ? 0.35 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Bar horizontal berbasis HTML (label kiri, nilai kanan) — setiap baris adalah tombol filter. */
export function HorizontalBars({
  data,
  selected,
  onSelect,
  unitLabel = "temuan",
}: {
  data: CategoryDatum[];
  selected: string | null;
  onSelect?: (key: string) => void;
  unitLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ul className="space-y-2.5">
      {data.map((d, i) => {
        const active = selected === d.key;
        const [ga] = CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length];
        const content = (
          <>
            <span className="w-[150px] shrink-0 truncate text-right text-[12.5px] text-navy-900">{d.key}</span>
            <span className="relative h-[14px] flex-1 overflow-hidden rounded-[3px] bg-[#eef1f7]">
              <span
                className="absolute inset-y-0 left-0 rounded-[3px]"
                style={{
                  width: `${(d.count / max) * 100}%`,
                  background: active ? SELECTED : ga,
                  opacity: selected && !active ? 0.4 : 1,
                }}
              />
            </span>
            <span className="w-9 shrink-0 text-right text-[13px] font-bold tabular-nums text-navy-900">{d.count}</span>
          </>
        );
        return (
          <li key={d.key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(d.key)}
                aria-pressed={active}
                title={`${d.key}: ${d.count} ${unitLabel}${d.uniqueUnits !== undefined ? `, ${d.uniqueUnits} KPw unik` : ""}`}
                className="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-sky-50"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-1 py-0.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export interface TrendDatum {
  year: number;
  total: number;
  selesai: number;
}

/** Tren tahunan: garis biru dengan nilai di setiap titik; klik titik = pilih tahun. */
export function TrendChart({ data, selected, onSelect }: { data: TrendDatum[]; selected: number | null; onSelect?: (year: number) => void }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <ComposedChart
        data={data}
        margin={{ top: 22, right: 18, bottom: 0, left: -16 }}
        onClick={(state) => {
          const idx = state?.activeIndex;
          if (idx !== undefined && idx !== null && onSelect) {
            const d = data[Number(idx)];
            if (d) onSelect(d.year);
          }
        }}
        style={{ cursor: onSelect ? "pointer" : undefined }}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1d4f9e" stopOpacity={0.14} />
            <stop offset="1" stopColor="#1d4f9e" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="year" tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} padding={{ left: 18, right: 18 }} />
        <Area type="linear" dataKey="total" fill="url(#trend-fill)" stroke="none" isAnimationActive={false} tooltipType="none" />
        <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as TrendDatum;
            return <TooltipBox title={`Tahun ${d.year}`} lines={[`${d.total} temuan`, `${d.selesai} selesai (${formatPercent(percent(d.selesai, d.total))})`]} />;
          }}
        />
        <Line
          type="linear"
          dataKey="total"
          name="Jumlah temuan"
          stroke={SERIES_PRIMARY}
          strokeWidth={2.5}
          dot={(p) => {
            const d = p.payload as TrendDatum;
            const sel = selected === d.year;
            return <circle key={`t-${d.year}`} cx={p.cx} cy={p.cy} r={sel ? 7 : 5} fill={sel ? SELECTED : SERIES_PRIMARY} stroke="#fff" strokeWidth={2} />;
          }}
          isAnimationActive={false}
        >
          <LabelList dataKey="total" position="top" offset={10} fill="#142a6e" fontSize={12} fontWeight={700} />
        </Line>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Donut dengan total di tengah dan legenda (tombol) berisi persentase di kanan. */
export function DonutWithLegend({
  data,
  colors,
  selected,
  onSelect,
  centerLabel,
}: {
  data: CategoryDatum[];
  colors: Record<string, string>;
  selected: string | null;
  onSelect?: (key: string) => void;
  centerLabel: string;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as CategoryDatum;
                return <TooltipBox title={d.key} lines={[`${d.count} temuan (${formatPercent(percent(d.count, total))})`]} />;
              }}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="key"
              innerRadius="60%"
              outerRadius="96%"
              paddingAngle={1.5}
              stroke="#fff"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              cursor={onSelect ? "pointer" : undefined}
              onClick={(_, index) => onSelect?.(data[index].key)}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={colors[d.key]} fillOpacity={selected && selected !== d.key ? 0.3 : 1} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[26px] font-extrabold leading-none text-navy-900">{formatNumber(total)}</p>
            <p className="text-[12px] text-muted">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="min-w-[140px] flex-1 space-y-2.5">
        {data.map((d) => (
          <li key={d.key}>
            <button
              type="button"
              onClick={() => onSelect?.(d.key)}
              aria-pressed={selected === d.key}
              className={cx("flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-[14px] hover:bg-sky-50", selected && selected !== d.key && "opacity-50")}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colors[d.key] }} aria-hidden />
              <span className="flex-1 font-semibold text-navy-900">{d.key}</span>
              <span className="font-bold tabular-nums text-navy-900">{formatPercent(percent(d.count, total))}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Bar horizontal bertumpuk (status per kategori) dengan total di ujung. */
export function StackedHBarChart<K extends string>({
  data,
  categoryKey,
  series,
  onSelect,
  selected,
}: {
  data: (Record<string, string | number> & { total: number })[];
  categoryKey: string;
  series: { key: K; label: string; color: string }[];
  onSelect?: (category: string) => void;
  selected: string | null;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 32 + 64)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 30, bottom: 0, left: 0 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey={categoryKey} width={78} tick={{ fill: "#142a6e", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "rgba(29,79,158,0.06)" }} contentStyle={{ borderRadius: 8, borderColor: "#e1eaf5", fontSize: 13 }} />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
          itemSorter={(item) => series.findIndex((s) => s.key === item.dataKey)}
          formatter={(v: string) => <span className="text-navy-900">{v}</span>}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="a"
            fill={s.color}
            maxBarSize={16}
            radius={i === series.length - 1 ? [0, 3, 3, 0] : undefined}
            cursor={onSelect ? "pointer" : undefined}
            onClick={(_, index) => onSelect?.(String(data[index][categoryKey]))}
            isAnimationActive={false}
          >
            {i === series.length - 1 && <LabelList dataKey="total" position="right" fill="#142a6e" fontSize={12} fontWeight={700} />}
            {data.map((d) => (
              <Cell key={String(d[categoryKey])} fillOpacity={selected && selected !== d[categoryKey] ? 0.35 : 1} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Tabel alternatif chart kategori dengan tombol filter (keyboard-friendly). */
export function CategoryTable({
  data,
  selected,
  onSelect,
  keyHeader,
  countHeader = "Jumlah temuan",
  showUnits = true,
}: {
  data: CategoryDatum[];
  selected: string | null;
  onSelect?: (key: string) => void;
  keyHeader: string;
  countHeader?: string;
  showUnits?: boolean;
}) {
  return (
    <div className="relative max-h-[260px] overflow-auto rounded-lg border border-line">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-[var(--m-soft)] text-left text-navy-900">
          <tr>
            <th scope="col" className="px-2 py-1.5">
              {keyHeader}
            </th>
            <th scope="col" className="px-2 py-1.5 text-right">
              {countHeader}
            </th>
            {showUnits && (
              <th scope="col" className="px-2 py-1.5 text-right">
                KPw unik
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key} className={cx("border-t border-[#eef2f7]", selected === d.key && "bg-sky-50")}>
              <td className="px-2 py-1.5">
                {onSelect ? (
                  <button type="button" onClick={() => onSelect(d.key)} aria-pressed={selected === d.key} className="text-left font-semibold text-brand underline-offset-2 hover:underline">
                    {d.key}
                  </button>
                ) : (
                  d.key
                )}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(d.count)}</td>
              {showUnits && <td className="px-2 py-1.5 text-right tabular-nums">{d.uniqueUnits ?? "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

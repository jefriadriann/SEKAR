"use client";

import { useId, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Table2 } from "lucide-react";
import { AXIS_TEXT, GRID, SELECTED, SERIES_PRIMARY, SERIES_SECONDARY } from "@/lib/palette";
import { formatNumber, formatPercent, percent } from "@/lib/format";
import { cx } from "@/components/ui/primitives";

/**
 * Kartu chart dengan ringkasan teks (aksesibilitas) dan tampilan tabel
 * alternatif. Tabel juga berisi tombol filter sehingga interaksi klik chart
 * dapat dilakukan dengan keyboard.
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
}: {
  title: string;
  description?: string;
  summary: string;
  children: ReactNode;
  table: ReactNode;
  className?: string;
  selectedLabel?: string | null;
  onReset?: () => void;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const id = useId();
  return (
    <section aria-labelledby={`${id}-t`} className={cx("flex min-w-0 flex-col rounded-2xl border border-line bg-white p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`${id}-t`} className="font-bold text-navy-900">
            {title}
          </h3>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
        <div className="flex shrink-0 rounded-lg border border-line p-0.5" role="group" aria-label={`Tampilan ${title}`}>
          <button
            type="button"
            onClick={() => setView("chart")}
            aria-pressed={view === "chart"}
            className={cx("rounded-md p-1.5", view === "chart" ? "bg-sky-100 text-navy-900" : "text-muted hover:bg-sky-50")}
            title="Tampilan chart"
          >
            <BarChart3 className="h-4 w-4" aria-hidden />
            <span className="sr-only">Chart</span>
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
            className={cx("rounded-md p-1.5", view === "table" ? "bg-sky-100 text-navy-900" : "text-muted hover:bg-sky-50")}
            title="Tampilan tabel"
          >
            <Table2 className="h-4 w-4" aria-hidden />
            <span className="sr-only">Tabel</span>
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-navy-800">{summary}</p>
      {selectedLabel && onReset && (
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-navy-900">Dipilih: {selectedLabel}</span>
          <button type="button" onClick={onReset} className="font-semibold text-sky-700 underline underline-offset-2">
            Reset
          </button>
        </p>
      )}
      <div className="mt-2 min-h-0 flex-1">{view === "chart" ? <div aria-hidden="true">{children}</div> : table}</div>
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
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-bold text-navy-900">{title}</p>
      {lines.map((l) => (
        <p key={l} className="text-muted">
          {l}
        </p>
      ))}
    </div>
  );
}

/** Bar horizontal; klik bar memilih kategori. */
export function CategoryBarChart({
  data,
  selected,
  onSelect,
  unitLabel = "temuan",
  height,
  showUnits = true,
}: {
  data: CategoryDatum[];
  selected: string | null;
  onSelect?: (key: string) => void;
  unitLabel?: string;
  height?: number;
  showUnits?: boolean;
}) {
  const h = height ?? Math.max(180, data.length * 34 + 30);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 4 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="key" width={150} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
        <Tooltip
          cursor={{ fill: "rgba(14,165,233,0.08)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as CategoryDatum;
            return (
              <TooltipBox
                title={d.key}
                lines={[`${formatNumber(d.count)} ${unitLabel}`, ...(showUnits && d.uniqueUnits !== undefined ? [`${d.uniqueUnits} KPw unik`] : []), ...(onSelect ? ["Klik untuk memfilter"] : [])]}
              />
            );
          }}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          cursor={onSelect ? "pointer" : undefined}
          onClick={(_, index) => onSelect?.(data[index].key)}
          label={{ position: "right", fill: AXIS_TEXT, fontSize: 12 }}
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.key} fill={selected === d.key ? SELECTED : SERIES_PRIMARY} fillOpacity={selected && selected !== d.key ? 0.35 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Bar vertikal (dipakai untuk sebaran korwil). */
export function VerticalBarChart({
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
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 18, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="key" tick={{ fill: AXIS_TEXT, fontSize: 11 }} interval={0} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)} />
        <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(14,165,233,0.08)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as CategoryDatum;
            return <TooltipBox title={d.key} lines={[`${formatNumber(d.count)} ${unitLabel}`, ...(d.uniqueUnits !== undefined ? [`${d.uniqueUnits} KPw unik`] : [])]} />;
          }}
        />
        <Bar
          dataKey="count"
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
          cursor={onSelect ? "pointer" : undefined}
          onClick={(_, index) => onSelect?.(data[index].key)}
          label={{ position: "top", fill: AXIS_TEXT, fontSize: 12 }}
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.key} fill={selected === d.key ? SELECTED : SERIES_SECONDARY} fillOpacity={selected && selected !== d.key ? 0.35 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface TrendDatum {
  year: number;
  total: number;
  selesai: number;
}

export function TrendChart({ data, selected, onSelect }: { data: TrendDatum[]; selected: number | null; onSelect?: (year: number) => void }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={data}
        margin={{ top: 12, right: 16, bottom: 4, left: -16 }}
        onClick={(state) => {
          const idx = state?.activeIndex;
          if (idx !== undefined && idx !== null && onSelect) {
            const d = data[Number(idx)];
            if (d) onSelect(d.year);
          }
        }}
        style={{ cursor: onSelect ? "pointer" : undefined }}
      >
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="year" tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as TrendDatum;
            return <TooltipBox title={`Tahun ${d.year}`} lines={[`${d.total} temuan`, `${d.selesai} selesai (${formatPercent(percent(d.selesai, d.total))})`]} />;
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-navy-900">{v}</span>} />
        <Line
          type="monotone"
          dataKey="total"
          name="Jumlah temuan"
          stroke={SERIES_PRIMARY}
          strokeWidth={2}
          dot={(p) => {
            const d = p.payload as TrendDatum;
            const sel = selected === d.year;
            return <circle key={`t-${d.year}`} cx={p.cx} cy={p.cy} r={sel ? 7 : 5} fill={sel ? SELECTED : SERIES_PRIMARY} stroke="#fff" strokeWidth={2} />;
          }}
          isAnimationActive={false}
        />
        <Line type="monotone" dataKey="selesai" name="Selesai" stroke={SERIES_SECONDARY} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
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
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
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
            innerRadius="58%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
            cursor={onSelect ? "pointer" : undefined}
            onClick={(_, index) => onSelect?.(data[index].key)}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={colors[d.key]} fillOpacity={selected && selected !== d.key ? 0.3 : 1} />
            ))}
          </Pie>
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value: string) => {
              const d = data.find((x) => x.key === value);
              return <span className="text-navy-900">{`${value}: ${d?.count ?? 0} (${formatPercent(percent(d?.count ?? 0, total))})`}</span>;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[96px] text-center">
        <p className="text-2xl font-bold leading-none text-navy-900">{formatNumber(total)}</p>
        <p className="text-xs text-muted">{centerLabel}</p>
      </div>
    </div>
  );
}

export function StackedBarChart<K extends string>({
  data,
  categoryKey,
  series,
  onSelect,
  selected,
}: {
  data: Record<string, string | number>[];
  categoryKey: string;
  series: { key: K; label: string; color: string }[];
  onSelect?: (category: string) => void;
  selected: string | null;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={categoryKey} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
        <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "rgba(14,165,233,0.08)" }} contentStyle={{ borderRadius: 8, borderColor: "#d6e4f2", fontSize: 13 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span className="text-navy-900">{v}</span>} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="a"
            fill={s.color}
            stroke="#fff"
            strokeWidth={1}
            maxBarSize={56}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : undefined}
            cursor={onSelect ? "pointer" : undefined}
            onClick={(_, index) => onSelect?.(String(data[index][categoryKey]))}
            isAnimationActive={false}
          >
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
    <div className="relative max-h-[300px] overflow-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-sky-50 text-left text-navy-800">
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
            <tr key={d.key} className={cx("border-t border-slate-100", selected === d.key && "bg-sky-50")}>
              <td className="px-2 py-1.5">
                {onSelect ? (
                  <button type="button" onClick={() => onSelect(d.key)} aria-pressed={selected === d.key} className="text-left font-semibold text-sky-800 underline-offset-2 hover:underline">
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

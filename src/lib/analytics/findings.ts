/**
 * Transformasi data temuan untuk KPI, chart dan tabel. Murni (tanpa React)
 * sehingga dapat diuji dan dipakai ulang oleh repository mana pun.
 */
import { EXAMINERS, FINDING_STATUSES, type Examiner, type Finding, type FindingStatus, type ISODate, type Unit } from "../types";
import { percent } from "../format";
import { ALL, type All, countBy, matchesSearch, uniqueUnitCount, unitIndex, type CountItem } from "./common";

export type Timeliness = "tepat_waktu" | "terlambat_selesai" | "lewat_tenggat" | "belum_jatuh_tempo";

export const TIMELINESS_LABEL: Record<Timeliness, string> = {
  tepat_waktu: "Selesai tepat waktu",
  terlambat_selesai: "Selesai terlambat",
  lewat_tenggat: "Lewat tenggat",
  belum_jatuh_tempo: "Belum jatuh tempo",
};

/**
 * Ketepatan waktu dihitung terpisah dari status proses: berdasarkan tenggat,
 * tanggal penyelesaian, dan tanggal acuan simulasi.
 */
export function findingTimeliness(f: Pick<Finding, "due_date" | "completed_at" | "status">, asOf: ISODate): Timeliness {
  if (f.status === "selesai" && f.completed_at) {
    return f.completed_at <= f.due_date ? "tepat_waktu" : "terlambat_selesai";
  }
  return f.due_date < asOf ? "lewat_tenggat" : "belum_jatuh_tempo";
}

export interface FindingFilters {
  year: number | All;
  examiner: Examiner | All;
  korwil: string | All;
  unitId: string | All;
  area: string | All;
  status: FindingStatus | All;
  timeliness: Timeliness | All;
  search: string;
}

export const DEFAULT_FINDING_FILTERS: FindingFilters = {
  year: ALL,
  examiner: ALL,
  korwil: ALL,
  unitId: ALL,
  area: ALL,
  status: ALL,
  timeliness: ALL,
  search: "",
};

export function filterFindings(
  findings: Finding[],
  units: Unit[],
  filters: FindingFilters,
  asOf: ISODate,
  ignore: (keyof FindingFilters)[] = [],
): Finding[] {
  const idx = unitIndex(units);
  const on = (k: keyof FindingFilters) => !ignore.includes(k) && filters[k] !== ALL && filters[k] !== "";
  return findings.filter((f) => {
    if (on("year") && f.year !== filters.year) return false;
    if (on("examiner") && f.examiner !== filters.examiner) return false;
    if (on("korwil") && idx.get(f.unit_id)?.korwil !== filters.korwil) return false;
    if (on("unitId") && f.unit_id !== filters.unitId) return false;
    if (on("area") && f.area !== filters.area) return false;
    if (on("status") && f.status !== filters.status) return false;
    if (on("timeliness") && findingTimeliness(f, asOf) !== filters.timeliness) return false;
    if (on("search") && !matchesSearch(filters.search, f.id, f.title, f.summary, f.recommendation, f.pic, idx.get(f.unit_id)?.name))
      return false;
    return true;
  });
}

export interface FindingSummary {
  total: number;
  uniqueUnits: number;
  byStatus: Record<FindingStatus, number>;
  overdue: number;
  completedLate: number;
  repeat: number;
  pctSelesai: number | null;
}

export function summarizeFindings(findings: Finding[], asOf: ISODate): FindingSummary {
  const byStatus = Object.fromEntries(FINDING_STATUSES.map((s) => [s, 0])) as Record<FindingStatus, number>;
  let overdue = 0;
  let completedLate = 0;
  let repeat = 0;
  for (const f of findings) {
    byStatus[f.status] += 1;
    const t = findingTimeliness(f, asOf);
    if (t === "lewat_tenggat") overdue += 1;
    if (t === "terlambat_selesai") completedLate += 1;
    if (f.is_repeat) repeat += 1;
  }
  return {
    total: findings.length,
    uniqueUnits: uniqueUnitCount(findings),
    byStatus,
    overdue,
    completedLate,
    repeat,
    pctSelesai: percent(byStatus.selesai, findings.length),
  };
}

export interface CountWithUnits extends CountItem {
  uniqueUnits: number;
}

function withUnits(rows: Finding[], items: CountItem[], keyOf: (f: Finding) => string): CountWithUnits[] {
  return items.map((it) => ({ ...it, uniqueUnits: uniqueUnitCount(rows.filter((f) => keyOf(f) === it.key)) }));
}

export function findingsByArea(rows: Finding[], areas?: string[]): CountWithUnits[] {
  const items = countBy(rows, (f) => f.area, areas);
  if (areas) items.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "id"));
  return withUnits(rows, items, (f) => f.area);
}

export function findingsByKorwil(rows: Finding[], units: Unit[], korwils?: string[]): CountWithUnits[] {
  const idx = unitIndex(units);
  const keyOf = (f: Finding) => idx.get(f.unit_id)?.korwil ?? "Tanpa korwil";
  return withUnits(rows, countBy(rows, keyOf, korwils), keyOf);
}

export function findingsByExaminer(rows: Finding[]): CountItem[] {
  return countBy(rows, (f) => f.examiner, EXAMINERS);
}

export interface YearTrendPoint {
  year: number;
  total: number;
  selesai: number;
  terbuka: number;
  uniqueUnits: number;
}

export function findingsTrend(rows: Finding[], years: number[]): YearTrendPoint[] {
  return years.map((year) => {
    const ys = rows.filter((f) => f.year === year);
    const selesai = ys.filter((f) => f.status === "selesai").length;
    return { year, total: ys.length, selesai, terbuka: ys.length - selesai, uniqueUnits: uniqueUnitCount(ys) };
  });
}

export interface ThemeAggregate {
  theme: string;
  area: string;
  count: number;
  /** Jumlah kantor (unit unik) yang terdampak tema ini. */
  affectedUnits: number;
  open: number;
  repeat: number;
  recommendation: string;
  nearestOpenDue: ISODate | null;
}

/** Agregasi tema × area: memisahkan jumlah temuan dan jumlah kantor terdampak. */
export function aggregateByTheme(rows: Finding[]): ThemeAggregate[] {
  const groups = new Map<string, Finding[]>();
  for (const f of rows) {
    const k = `${f.theme}\u0000${f.area}`;
    const g = groups.get(k);
    if (g) g.push(f);
    else groups.set(k, [f]);
  }
  return [...groups.values()]
    .map((g) => {
      const open = g.filter((f) => f.status !== "selesai");
      const due = open.map((f) => f.due_date).sort()[0] ?? null;
      return {
        theme: g[0].theme,
        area: g[0].area,
        count: g.length,
        affectedUnits: uniqueUnitCount(g),
        open: open.length,
        repeat: g.filter((f) => f.is_repeat).length,
        recommendation: g[0].recommendation,
        nearestOpenDue: due,
      };
    })
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme, "id"));
}

export interface FindingGroup {
  key: string;
  examiner: Finding["examiner"];
  area: string;
  theme: string;
  /** Judul ringkas yang paling sering muncul dalam grup. */
  title: string;
  recommendation: string;
  count: number;
  /** Jumlah KPw unik (kantor terdampak). */
  affectedUnits: number;
  open: number;
  ids: string[];
}

function mostCommon(values: string[]): string {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))[0]?.[0] ?? "";
}

/** Ringkasan temuan per pemeriksa × area × tema (tabel "Temuan dan Rekomendasi Utama"). */
export function groupFindings(rows: Finding[]): FindingGroup[] {
  const groups = new Map<string, Finding[]>();
  for (const f of rows) {
    const k = `${f.examiner}|${f.area}|${f.theme}`;
    const g = groups.get(k);
    if (g) g.push(f);
    else groups.set(k, [f]);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      examiner: g[0].examiner,
      area: g[0].area,
      theme: g[0].theme,
      title: mostCommon(g.map((f) => f.title)),
      recommendation: mostCommon(g.map((f) => f.recommendation)),
      count: g.length,
      affectedUnits: uniqueUnitCount(g),
      open: g.filter((f) => f.status !== "selesai").length,
      ids: g.map((f) => f.id),
    }))
    .sort((a, b) => b.affectedUnits - a.affectedUnits || b.count - a.count || a.key.localeCompare(b.key, "id"));
}

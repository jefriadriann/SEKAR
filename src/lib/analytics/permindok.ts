/**
 * Transformasi permintaan dokumen (permindok). Status KELENGKAPAN
 * (lengkap/bertahap/dalam_proses/belum_dikirim) dipisahkan dari KETEPATAN
 * WAKTU yang dihitung dari tanggal tenggat, penyampaian dan tanggal acuan.
 */
import { REQUEST_STATUSES, type AuditSchedule, type DocumentRequest, type ISODate, type RequestStatus, type Unit } from "../types";
import { percent } from "../format";
import { ALL, type All, matchesSearch, uniqueSorted, unitIndex } from "./common";

export type RequestTimeliness = "tepat_waktu" | "terlambat" | "lewat_tenggat" | "belum_jatuh_tempo";

export const REQUEST_TIMELINESS_LABEL: Record<RequestTimeliness, string> = {
  tepat_waktu: "Disampaikan tepat waktu",
  terlambat: "Disampaikan terlambat",
  lewat_tenggat: "Lewat tenggat, belum disampaikan",
  belum_jatuh_tempo: "Belum jatuh tempo",
};

export function requestTimeliness(r: Pick<DocumentRequest, "due_date" | "submitted_at">, asOf: ISODate): RequestTimeliness {
  if (r.submitted_at && r.submitted_at <= asOf) return r.submitted_at <= r.due_date ? "tepat_waktu" : "terlambat";
  return r.due_date < asOf ? "lewat_tenggat" : "belum_jatuh_tempo";
}

export interface RequestFilters {
  year: number | All;
  scheduleId: string | All;
  category: string | All;
  unitId: string | All;
  status: RequestStatus | All;
  timeliness: RequestTimeliness | All;
  search: string;
}

export const DEFAULT_REQUEST_FILTERS: RequestFilters = {
  year: ALL,
  scheduleId: ALL,
  category: ALL,
  unitId: ALL,
  status: ALL,
  timeliness: ALL,
  search: "",
};

export function filterRequests(
  rows: DocumentRequest[],
  units: Unit[],
  filters: RequestFilters,
  asOf: ISODate,
  ignore: (keyof RequestFilters)[] = [],
): DocumentRequest[] {
  const idx = unitIndex(units);
  const on = (k: keyof RequestFilters) => !ignore.includes(k) && filters[k] !== ALL && filters[k] !== "";
  return rows.filter((r) => {
    if (on("year") && Number(r.requested_at.slice(0, 4)) !== filters.year) return false;
    if (on("scheduleId") && r.schedule_id !== filters.scheduleId) return false;
    if (on("category") && r.category !== filters.category) return false;
    if (on("unitId") && r.unit_id !== filters.unitId) return false;
    if (on("status") && r.status !== filters.status) return false;
    if (on("timeliness") && requestTimeliness(r, asOf) !== filters.timeliness) return false;
    if (on("search") && !matchesSearch(filters.search, r.id, r.title, r.dr_note, r.category, idx.get(r.unit_id)?.name)) return false;
    return true;
  });
}

export interface RequestSummary {
  total: number;
  byStatus: Record<RequestStatus, number>;
  byTimeliness: Record<RequestTimeliness, number>;
  pctLengkap: number | null;
  /** % tepat waktu dari permintaan yang sudah disampaikan. */
  pctTepatWaktu: number | null;
  uniqueUnits: number;
}

export function summarizeRequests(rows: DocumentRequest[], asOf: ISODate): RequestSummary {
  const byStatus = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0])) as Record<RequestStatus, number>;
  const byTimeliness: Record<RequestTimeliness, number> = { tepat_waktu: 0, terlambat: 0, lewat_tenggat: 0, belum_jatuh_tempo: 0 };
  for (const r of rows) {
    byStatus[r.status] += 1;
    byTimeliness[requestTimeliness(r, asOf)] += 1;
  }
  const delivered = byTimeliness.tepat_waktu + byTimeliness.terlambat;
  return {
    total: rows.length,
    byStatus,
    byTimeliness,
    pctLengkap: percent(byStatus.lengkap, rows.length),
    pctTepatWaktu: percent(byTimeliness.tepat_waktu, delivered),
    uniqueUnits: new Set(rows.map((r) => r.unit_id)).size,
  };
}

export type CategoryStatusRow = { category: string; total: number } & Record<RequestStatus, number>;

export function statusByCategory(rows: DocumentRequest[]): CategoryStatusRow[] {
  const cats = uniqueSorted(rows.map((r) => r.category));
  return cats.map((category) => {
    const cs = rows.filter((r) => r.category === category);
    const row = { category, total: cs.length } as CategoryStatusRow;
    for (const s of REQUEST_STATUSES) row[s] = cs.filter((r) => r.status === s).length;
    return row;
  });
}

export function scheduleLabel(s: AuditSchedule | undefined, units: Unit[]): string {
  if (!s) return "—";
  const unit = units.find((u) => u.id === s.unit_id);
  return `${s.id} · ${s.examiner} ${s.exam_type}${unit ? ` · ${unit.name}` : ""}`;
}

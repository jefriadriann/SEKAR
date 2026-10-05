/**
 * Status jadwal pemeriksaan dihitung dari tanggal terhadap tanggal acuan.
 * Tidak ada status acak/hardcoded.
 */
import type { AuditSchedule, ISODate } from "../types";
import { diffDays, monthLong, monthShort, toUTCDate, fromUTCDate } from "../dates";

export type ScheduleStatus = "selesai" | "berlangsung" | "mendatang";

export const SCHEDULE_STATUS_LABEL: Record<ScheduleStatus, string> = {
  selesai: "Selesai",
  berlangsung: "Berlangsung",
  mendatang: "Mendatang",
};

export function scheduleStatus(s: Pick<AuditSchedule, "start_date" | "end_date">, asOf: ISODate): ScheduleStatus {
  if (s.end_date < asOf) return "selesai";
  if (s.start_date <= asOf) return "berlangsung";
  return "mendatang";
}

/** Mulai dalam N hari ke depan (tidak termasuk hari ini; jadwal hari ini sudah berlangsung). */
export function startsWithin(s: Pick<AuditSchedule, "start_date">, asOf: ISODate, days = 7): boolean {
  const d = diffDays(asOf, s.start_date);
  return d > 0 && d <= days;
}

export interface ScheduleKpis {
  total: number;
  berlangsung: number;
  mulai7Hari: number;
  mendatang: number;
  selesai: number;
  tentatif: number;
}

export function scheduleKpis(rows: AuditSchedule[], asOf: ISODate): ScheduleKpis {
  const k: ScheduleKpis = { total: rows.length, berlangsung: 0, mulai7Hari: 0, mendatang: 0, selesai: 0, tentatif: 0 };
  for (const s of rows) {
    k[scheduleStatus(s, asOf)] += 1;
    if (startsWithin(s, asOf, 7)) k.mulai7Hari += 1;
    if (!s.date_confirmed) k.tentatif += 1;
  }
  return k;
}

export function upcomingSchedules(rows: AuditSchedule[], asOf: ISODate, limit = 5): AuditSchedule[] {
  return rows
    .filter((s) => scheduleStatus(s, asOf) !== "selesai")
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export type TimelineView = "bulan" | "kuartal" | "tahun";

export interface TimelineColumn {
  start: ISODate;
  /** inklusif */
  end: ISODate;
  label: string;
}

export interface TimelineWindow {
  start: ISODate;
  /** inklusif */
  end: ISODate;
  days: number;
  label: string;
  /** Kolom header timeline sesuai granularitas tampilan. */
  columns: TimelineColumn[];
}

const utc = (y: number, m: number, d = 1) => fromUTCDate(new Date(Date.UTC(y, m, d)));

/**
 * Jendela timeline dengan granularitas kolom:
 * - bulan   : 6 bulan (semester yang memuat anchor), kolom per bulan;
 * - kuartal : 12 bulan (tahun anchor), kolom per kuartal;
 * - tahun   : 3 tahun (tahun sebelum s.d. sesudah anchor), kolom per tahun.
 * `offset` menggeser jendela sebanyak satu jendela penuh.
 */
export function timelineWindow(view: TimelineView, anchor: ISODate, offset = 0): TimelineWindow {
  const a = toUTCDate(anchor);
  const y = a.getUTCFullYear();
  const m = a.getUTCMonth();
  const columns: TimelineColumn[] = [];
  let label: string;
  if (view === "bulan") {
    const first = new Date(Date.UTC(y, Math.floor(m / 6) * 6 + offset * 6, 1));
    for (let i = 0; i < 6; i++) {
      const sy = first.getUTCFullYear();
      const sm = first.getUTCMonth() + i;
      const d = new Date(Date.UTC(sy, sm, 1));
      columns.push({ start: fromUTCDate(d), end: utc(sy, sm + 1, 0), label: `${monthShort(d.getUTCMonth())} ${d.getUTCFullYear()}` });
    }
    const last = toUTCDate(columns[5].start);
    label = `${monthLong(first.getUTCMonth())} – ${monthLong(last.getUTCMonth())} ${last.getUTCFullYear()}`;
  } else if (view === "kuartal") {
    const yy = y + offset;
    for (let q = 0; q < 4; q++) columns.push({ start: utc(yy, q * 3), end: utc(yy, q * 3 + 3, 0), label: `Kuartal ${q + 1}` });
    label = `Tahun ${yy}`;
  } else {
    const y0 = y - 1 + offset * 3;
    for (let i = 0; i < 3; i++) columns.push({ start: utc(y0 + i, 0), end: utc(y0 + i, 11, 31), label: String(y0 + i) });
    label = `${y0} – ${y0 + 2}`;
  }
  const start = columns[0].start;
  const end = columns[columns.length - 1].end;
  return { start, end, days: diffDays(start, end) + 1, label, columns };
}

/** Posisi bar (persen) dalam jendela; null bila tidak beririsan. */
export function barPosition(s: Pick<AuditSchedule, "start_date" | "end_date">, w: TimelineWindow): { left: number; width: number } | null {
  if (s.end_date < w.start || s.start_date > w.end) return null;
  const from = s.start_date < w.start ? w.start : s.start_date;
  const to = s.end_date > w.end ? w.end : s.end_date;
  const left = (diffDays(w.start, from) / w.days) * 100;
  const width = ((diffDays(from, to) + 1) / w.days) * 100;
  return { left, width };
}

export function positionOf(date: ISODate, w: TimelineWindow): number | null {
  if (date < w.start || date > w.end) return null;
  return ((diffDays(w.start, date) + 0.5) / w.days) * 100;
}

/** Posisi tepi kiri tanggal (awal hari) dalam persen. */
export function edgeOf(date: ISODate, w: TimelineWindow): number {
  return (Math.min(Math.max(diffDays(w.start, date), 0), w.days) / w.days) * 100;
}

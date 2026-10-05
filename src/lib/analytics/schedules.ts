/**
 * Status jadwal pemeriksaan dihitung dari tanggal terhadap tanggal acuan.
 * Tidak ada status acak/hardcoded.
 */
import type { AuditSchedule, ISODate } from "../types";
import { addDays, diffDays, monthLong, monthShort, toUTCDate, fromUTCDate } from "../dates";

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

export interface TimelineWindow {
  start: ISODate;
  /** inklusif */
  end: ISODate;
  days: number;
  label: string;
  /** Penanda kolom (bulan atau minggu) untuk header timeline. */
  ticks: { date: ISODate; label: string }[];
}

/** Jendela timeline yang memuat `anchor`, digeser `offset` periode. */
export function timelineWindow(view: TimelineView, anchor: ISODate, offset = 0): TimelineWindow {
  const a = toUTCDate(anchor);
  let y = a.getUTCFullYear();
  let m = a.getUTCMonth();
  let startD: Date;
  let endD: Date;
  let label: string;
  if (view === "bulan") {
    const t = new Date(Date.UTC(y, m + offset, 1));
    y = t.getUTCFullYear();
    m = t.getUTCMonth();
    startD = t;
    endD = new Date(Date.UTC(y, m + 1, 0));
    label = `${monthLong(m)} ${y}`;
  } else if (view === "kuartal") {
    const q0 = Math.floor(m / 3) * 3;
    const t = new Date(Date.UTC(y, q0 + offset * 3, 1));
    y = t.getUTCFullYear();
    m = t.getUTCMonth();
    startD = t;
    endD = new Date(Date.UTC(y, m + 3, 0));
    label = `Kuartal ${Math.floor(m / 3) + 1} ${y}`;
  } else {
    y = y + offset;
    startD = new Date(Date.UTC(y, 0, 1));
    endD = new Date(Date.UTC(y, 11, 31));
    label = `Tahun ${y}`;
  }
  const start = fromUTCDate(startD);
  const end = fromUTCDate(endD);
  const days = diffDays(start, end) + 1;
  const ticks: { date: ISODate; label: string }[] = [];
  if (view === "bulan") {
    for (let d = start; d <= end; d = addDays(d, 7)) ticks.push({ date: d, label: String(Number(d.slice(8, 10))) });
  } else {
    const n = view === "kuartal" ? 3 : 12;
    for (let i = 0; i < n; i++) {
      const t = new Date(Date.UTC(startD.getUTCFullYear(), startD.getUTCMonth() + i, 1));
      ticks.push({ date: fromUTCDate(t), label: monthShort(t.getUTCMonth()) });
    }
  }
  return { start, end, days, label, ticks };
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

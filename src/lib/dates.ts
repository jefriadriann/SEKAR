/**
 * Utilitas tanggal berbasis string YYYY-MM-DD (UTC) agar hasil konsisten
 * di semua zona waktu dan tidak bergantung pada jam perangkat.
 */
import type { ISODate } from "./types";

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== "string") return false;
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function toUTCDate(iso: ISODate): Date {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Tanggal tidak valid: ${iso}`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

export function fromUTCDate(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = toUTCDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTCDate(d);
}

/** Selisih hari (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTCDate(b).getTime() - toUTCDate(a).getTime()) / 86_400_000);
}

export function compareISO(a: ISODate | null, b: ISODate | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function monthShort(index: number): string {
  return MONTHS[index];
}

export function monthLong(index: number): string {
  return MONTHS_LONG[index];
}

/** Format "5 Okt 2026". */
export function formatDate(iso: ISODate | null | undefined, fallback = "—"): string {
  if (!iso || !isValidISODate(iso)) return fallback;
  const d = toUTCDate(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Format "5 Oktober 2026". */
export function formatDateLong(iso: ISODate | null | undefined, fallback = "—"): string {
  if (!iso || !isValidISODate(iso)) return fallback;
  const d = toUTCDate(iso);
  return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function yearOf(iso: ISODate): number {
  return Number(iso.slice(0, 4));
}

/**
 * Export CSV yang aman: mencegah formula injection (=, +, -, @, tab, CR)
 * dan meng-escape tanda kutip, koma serta baris baru.
 */
export function escapeCsvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n;]/.test(s) || s.startsWith("'")) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T>(rows: T[], columns: { header: string; value: (row: T) => unknown }[]): string {
  const head = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCsvCell(c.value(r))).join(","));
  // BOM agar Excel membaca UTF-8 dengan benar.
  return "﻿" + [head, ...body].join("\r\n");
}

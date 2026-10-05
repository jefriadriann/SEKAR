import type { Unit } from "../types";

export const ALL = "all" as const;
export type All = typeof ALL;

export interface CountItem {
  key: string;
  count: number;
}

/** Hitung jumlah record per kunci, urut sesuai `order` bila diberikan, lalu menurun. */
export function countBy<T>(rows: T[], keyOf: (row: T) => string, order?: readonly string[]): CountItem[] {
  const map = new Map<string, number>();
  if (order) for (const k of order) map.set(k, 0);
  for (const row of rows) {
    const k = keyOf(row);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const items = [...map.entries()].map(([key, count]) => ({ key, count }));
  if (!order) items.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "id"));
  return items;
}

/** Jumlah unit unik (unit_id) — dipisahkan dari jumlah record. */
export function uniqueUnitCount<T extends { unit_id: string }>(rows: T[]): number {
  return new Set(rows.map((r) => r.unit_id)).size;
}

export function unitIndex(units: Unit[]): Map<string, Unit> {
  return new Map(units.map((u) => [u.id, u]));
}

export function uniqueSorted<T extends string | number>(values: T[]): T[] {
  return [...new Set(values)].sort((a, b) =>
    typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "id", { numeric: true }),
  );
}

export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

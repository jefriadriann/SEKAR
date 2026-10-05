"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cx, EmptyState } from "./primitives";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Bila ada, kolom dapat diurutkan. */
  sortValue?: (row: T) => string | number | null;
  className?: string;
  headerClassName?: string;
}

const PAGE_SIZES = [10, 25, 50];

/**
 * Tabel generik dengan sorting, pagination, scroll horizontal dalam
 * container, dan baris yang dapat dibuka dengan keyboard (tombol "Detail").
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  onRowOpen,
  openLabel = "Detail",
  initialSort,
  emptyTitle = "Tidak ada data",
  emptyDescription = "Tidak ada record yang cocok dengan filter saat ini.",
  emptyAction,
  pageSize: initialPageSize = 10,
  dense,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  caption: string;
  onRowOpen?: (row: T) => void;
  openLabel?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  pageSize?: number;
  dense?: boolean;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va === vb) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "id", { numeric: true }) * dir;
    });
  }, [rows, columns, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (key: string) => {
    setPage(0);
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  if (!rows.length) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  return (
    <div>
      <div className="relative scrollbar-thin overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-sky-50/80 text-navy-800">
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cx("whitespace-nowrap border-b border-line px-3 py-2.5 font-bold", c.headerClassName)}
                  >
                    {c.sortValue ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-sky-700">
                        {c.header}
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
                        )}
                        <span className="sr-only">, urutkan</span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
              {onRowOpen && (
                <th scope="col" className="border-b border-line px-3 py-2.5">
                  <span className="sr-only">Aksi</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowOpen ? () => onRowOpen(row) : undefined}
                className={cx("border-b border-slate-100 align-top last:border-0", onRowOpen && "cursor-pointer hover:bg-sky-50/60")}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cx("px-3", dense ? "py-1.5" : "py-2.5", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
                {onRowOpen && (
                  <td className={cx("px-3 text-right", dense ? "py-1.5" : "py-2.5")}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowOpen(row);
                      }}
                      className="rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold text-navy-700 hover:border-sky-300 hover:bg-sky-50"
                    >
                      {openLabel}
                      <span className="sr-only"> {rowKey(row)}</span>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p aria-live="polite">
          Menampilkan {safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} dari {sorted.length} record
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            <span>Baris</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="h-8 rounded-md border border-line bg-white px-1.5 text-navy-900"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setPage(safePage - 1)}
            disabled={safePage === 0}
            className="rounded-md border border-line bg-white p-1.5 text-navy-700 hover:bg-sky-50 disabled:opacity-40"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="tabular-nums">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(safePage + 1)}
            disabled={safePage >= pageCount - 1}
            className="rounded-md border border-line bg-white p-1.5 text-navy-700 hover:bg-sky-50 disabled:opacity-40"
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

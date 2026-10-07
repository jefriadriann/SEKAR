"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
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

/** Nomor halaman ringkas: 1 2 3 … 9 */
function pageList(current: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const set = new Set([0, count - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < count));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/**
 * Tabel bergaya referensi SEKAR: kolom "No.", header biru muda, pemilih
 * "Tampilkan N data", paginasi bernomor, sorting per kolom, scroll horizontal
 * dalam container. Baris dapat dibuka dengan klik atau tombol pada kolom
 * `openColumnKey` (dapat diakses keyboard).
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  onRowOpen,
  openColumnKey,
  initialSort,
  emptyTitle = "Tidak ada data",
  emptyDescription = "Tidak ada record yang cocok dengan filter saat ini.",
  emptyAction,
  pageSize: initialPageSize = 10,
  pageSizes = [5, 10, 25, 50],
  unitLabel = "data",
  showIndex = true,
  toolbar,
  dense,
  minWidth = 760,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  caption: string;
  onRowOpen?: (row: T) => void;
  /** Kolom yang isinya dibungkus tombol pembuka detail. Default kolom pertama. */
  openColumnKey?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  pageSize?: number;
  pageSizes?: number[];
  unitLabel?: string;
  showIndex?: boolean;
  /** Elemen di kiri baris kontrol (mis. kotak pencarian). */
  toolbar?: ReactNode;
  dense?: boolean;
  minWidth?: number;
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
  const start = safePage * pageSize;
  const visible = sorted.slice(start, start + pageSize);
  const openKey = openColumnKey ?? columns[0]?.key;

  const toggleSort = (key: string) => {
    setPage(0);
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  const sizeId = `${caption.replace(/\W+/g, "-")}-size`;
  const cell = dense ? "px-2 py-2" : "px-3 py-2.5";

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-end gap-3">
        {toolbar && <div className="min-w-[200px] flex-1 sm:max-w-xs">{toolbar}</div>}
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <label htmlFor={sizeId}>Tampilkan</label>
          <select
            id={sizeId}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="h-8 rounded-md border border-line bg-white px-1.5 font-semibold text-navy-900"
          >
            {pageSizes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>{unitLabel}</span>
        </div>
      </div>

      {!rows.length ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <>
          <div className="scrollbar-thin relative overflow-x-auto rounded-xl border border-line">
            <table className={cx("w-full border-collapse text-left", dense ? "text-[13px]" : "text-[13.5px]")} style={{ minWidth }}>
              <caption className="sr-only">{caption}</caption>
              <thead className="bg-[#eef2f8] text-navy-900">
                <tr>
                  {showIndex && (
                    <th scope="col" className={cx("whitespace-nowrap border-b border-line py-2.5 text-center font-bold", dense ? "w-8 px-1.5" : "w-12 px-3")}>
                      No.
                    </th>
                  )}
                  {columns.map((c) => {
                    const active = sort?.key === c.key;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                        className={cx("border-b border-line py-2.5 align-bottom font-bold leading-tight", dense ? "px-2" : "px-3", c.headerClassName)}
                      >
                        {c.sortValue ? (
                          <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 text-left hover:text-brand">
                            {c.header}
                            {active ? (
                              sort!.dir === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                              )
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
                            )}
                            <span className="sr-only">, urutkan</span>
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowOpen ? () => onRowOpen(row) : undefined}
                    className={cx("border-b border-[#eef2f7] align-middle last:border-0", onRowOpen && "cursor-pointer hover:bg-[#f6f8fc]")}
                  >
                    {showIndex && <td className={cx(cell, dense && "px-1.5", "text-center tabular-nums text-muted")}>{start + i + 1}</td>}
                    {columns.map((c) => (
                      <td key={c.key} className={cx(cell, "text-navy-900", c.className)}>
                        {onRowOpen && c.key === openKey ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRowOpen(row);
                            }}
                            className="text-left hover:text-brand hover:underline"
                            aria-label={`Buka detail ${rowKey(row)}`}
                          >
                            {c.render(row)}
                          </button>
                        ) : (
                          c.render(row)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
            <p aria-live="polite">
              Menampilkan {start + 1} - {Math.min(sorted.length, start + pageSize)} dari {sorted.length} {unitLabel}
            </p>
            <nav aria-label={`Halaman ${caption}`} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
                className="grid h-8 w-8 place-items-center rounded-md border border-line bg-white text-navy-800 hover:bg-sky-50 disabled:opacity-40"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              {pageList(safePage, pageCount).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-1">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === safePage ? "page" : undefined}
                    aria-label={`Halaman ${p + 1}`}
                    className={cx(
                      "grid h-8 min-w-8 place-items-center rounded-md border px-2 font-semibold tabular-nums",
                      p === safePage ? "btn-grad border-transparent text-white" : "border-line bg-white text-navy-800 hover:bg-sky-50",
                    )}
                  >
                    {p + 1}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= pageCount - 1}
                className="grid h-8 w-8 place-items-center rounded-md border border-line bg-white text-navy-800 hover:bg-sky-50 disabled:opacity-40"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

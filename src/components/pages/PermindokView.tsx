"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Clock, Download, FileStack, NotebookPen, Stamp, TimerOff } from "lucide-react";
import { CategoryTable, ChartCard, StackedBarChart } from "@/components/charts/Charts";
import { receiptText, RequestDrawer } from "@/components/domain/RequestDrawer";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button, Card, EmptyState, FilterChips, KpiCard, PageHeader, SearchField, SectionHeader, SelectField, SimulationNote } from "@/components/ui/primitives";
import { RequestStatusBadge, RequestTimelinessBadge } from "@/components/ui/StatusBadges";
import { ALL, uniqueSorted, unitIndex } from "@/lib/analytics/common";
import {
  DEFAULT_REQUEST_FILTERS,
  filterRequests,
  REQUEST_TIMELINESS_LABEL,
  requestTimeliness,
  scheduleLabel,
  statusByCategory,
  summarizeRequests,
  type RequestFilters,
  type RequestTimeliness,
} from "@/lib/analytics/permindok";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import { formatNumber, formatPercent, REQUEST_STATUS_LABEL } from "@/lib/format";
import { REQUEST_STATUS_COLOR } from "@/lib/palette";
import { kpwModuleData } from "@/lib/scope";
import { REQUEST_STATUSES, type DocumentRequest } from "@/lib/types";

export function PermindokView() {
  const { data, asOf, notify } = useReadySekar();
  const kpw = useMemo(() => kpwModuleData(data), [data]);
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_REQUEST_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const idx = useMemo(() => unitIndex(kpw.units), [kpw.units]);
  const set = <K extends keyof RequestFilters>(k: K, v: RequestFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const reset = () => setFilters(DEFAULT_REQUEST_FILTERS);

  const years = uniqueSorted(kpw.document_requests.map((r) => Number(r.requested_at.slice(0, 4))));
  const categories = uniqueSorted(kpw.document_requests.map((r) => r.category));
  const schedules = kpw.audit_schedules.filter((s) => kpw.document_requests.some((r) => r.schedule_id === s.id));
  const unitsWithReq = kpw.units.filter((u) => kpw.document_requests.some((r) => r.unit_id === u.id));

  const filtered = useMemo(() => filterRequests(kpw.document_requests, kpw.units, filters, asOf), [kpw, filters, asOf]);
  const summary = summarizeRequests(filtered, asOf);
  const byCategory = useMemo(() => statusByCategory(filterRequests(kpw.document_requests, kpw.units, filters, asOf, ["category"])), [kpw, filters, asOf]);
  const notes = filtered
    .filter((r) => r.status !== "lengkap")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 6);

  const chips = [
    filters.year !== ALL && { label: `Tahun ${filters.year}`, onRemove: () => set("year", ALL) },
    filters.scheduleId !== ALL && { label: `Jadwal ${filters.scheduleId}`, onRemove: () => set("scheduleId", ALL) },
    filters.category !== ALL && { label: `Kategori ${filters.category}`, onRemove: () => set("category", ALL) },
    filters.unitId !== ALL && { label: idx.get(filters.unitId)?.name ?? filters.unitId, onRemove: () => set("unitId", ALL) },
    filters.status !== ALL && { label: REQUEST_STATUS_LABEL[filters.status], onRemove: () => set("status", ALL) },
    filters.timeliness !== ALL && { label: REQUEST_TIMELINESS_LABEL[filters.timeliness], onRemove: () => set("timeliness", ALL) },
    filters.search && { label: `Cari "${filters.search}"`, onRemove: () => set("search", "") },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  const columns: Column<DocumentRequest>[] = [
    { key: "id", header: "ID", render: (r) => <span className="whitespace-nowrap font-mono text-xs">{r.id}</span>, sortValue: (r) => r.id },
    { key: "unit", header: "KPw", render: (r) => <span className="font-semibold">{idx.get(r.unit_id)?.name ?? r.unit_id}</span>, sortValue: (r) => idx.get(r.unit_id)?.name ?? "" },
    { key: "schedule", header: "Jadwal", render: (r) => <span className="whitespace-nowrap font-mono text-xs">{r.schedule_id}</span>, sortValue: (r) => r.schedule_id },
    { key: "category", header: "Kategori", render: (r) => r.category, sortValue: (r) => r.category },
    { key: "req", header: "Tgl permintaan", render: (r) => <span className="whitespace-nowrap">{formatDate(r.requested_at)}</span>, sortValue: (r) => r.requested_at },
    { key: "due", header: "Tenggat", render: (r) => <span className="whitespace-nowrap">{formatDate(r.due_date)}</span>, sortValue: (r) => r.due_date },
    { key: "sub", header: "Penyampaian", render: (r) => <span className="whitespace-nowrap">{formatDate(r.submitted_at, "Belum")}</span>, sortValue: (r) => r.submitted_at },
    { key: "note", header: "Catatan DR", className: "min-w-[200px] max-w-[280px]", render: (r) => <span className="line-clamp-2 text-xs text-muted">{r.dr_note}</span> },
    { key: "status", header: "Kelengkapan", render: (r) => <RequestStatusBadge status={r.status} />, sortValue: (r) => r.status },
    { key: "time", header: "Ketepatan waktu", render: (r) => <RequestTimelinessBadge value={requestTimeliness(r, asOf)} />, sortValue: (r) => requestTimeliness(r, asOf) },
  ];

  const exportCsv = () => {
    const csv = toCsv(filtered, [
      { header: "id", value: (r) => r.id },
      { header: "kpw", value: (r) => idx.get(r.unit_id)?.name ?? r.unit_id },
      { header: "jadwal", value: (r) => r.schedule_id },
      { header: "kategori", value: (r) => r.category },
      { header: "judul", value: (r) => r.title },
      { header: "tanggal_permintaan", value: (r) => r.requested_at },
      { header: "tenggat", value: (r) => r.due_date },
      { header: "tanggal_penyampaian", value: (r) => r.submitted_at ?? "" },
      { header: "catatan_dr", value: (r) => r.dr_note },
      { header: "status_kelengkapan", value: (r) => REQUEST_STATUS_LABEL[r.status] },
      { header: "ketepatan_waktu", value: (r) => REQUEST_TIMELINESS_LABEL[requestTimeliness(r, asOf)] },
    ]);
    downloadText(`sekar-permindok-SIMULASI-${asOf}.csv`, csv, "text/csv;charset=utf-8");
    notify(`${filtered.length} permintaan diekspor ke CSV.`);
  };

  const sampleForReceipt = filtered.find((r) => r.submitted_at) ?? filtered[0];

  return (
    <div>
      <PageHeader
        eyebrow="Modul KPw"
        title="Tracker Permindok"
        description="Permintaan dokumen pemeriksaan per KPw. Status kelengkapan (isi dokumen) dibedakan dari ketepatan waktu penyampaian terhadap tenggat."
        actions={
          <Button onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
        }
      />

      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <SelectField
            id="p-year"
            label="Tahun"
            value={String(filters.year)}
            onChange={(v) => set("year", v === ALL ? ALL : Number(v))}
            options={[{ value: ALL, label: "Semua Tahun" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
          />
          <SelectField
            id="p-sched"
            label="Jadwal"
            value={filters.scheduleId}
            onChange={(v) => set("scheduleId", v)}
            options={[{ value: ALL, label: "Semua jadwal" }, ...schedules.map((s) => ({ value: s.id, label: scheduleLabel(s, kpw.units) }))]}
          />
          <SelectField
            id="p-cat"
            label="Kategori"
            value={filters.category}
            onChange={(v) => set("category", v)}
            options={[{ value: ALL, label: "Semua kategori" }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
          <SelectField
            id="p-unit"
            label="KPw"
            value={filters.unitId}
            onChange={(v) => set("unitId", v)}
            options={[{ value: ALL, label: "Semua KPw" }, ...unitsWithReq.map((u) => ({ value: u.id, label: u.name }))]}
          />
          <SelectField
            id="p-status"
            label="Kelengkapan"
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[{ value: ALL, label: "Semua status" }, ...REQUEST_STATUSES.map((s) => ({ value: s, label: REQUEST_STATUS_LABEL[s] }))]}
          />
          <SelectField
            id="p-time"
            label="Ketepatan waktu"
            value={filters.timeliness}
            onChange={(v) => set("timeliness", v as RequestTimeliness | typeof ALL)}
            options={[{ value: ALL, label: "Semua" }, ...(Object.keys(REQUEST_TIMELINESS_LABEL) as RequestTimeliness[]).map((t) => ({ value: t, label: REQUEST_TIMELINESS_LABEL[t] }))]}
          />
          <SearchField id="p-search" value={filters.search} onChange={(v) => set("search", v)} placeholder="ID, judul, catatan…" />
        </div>
        <FilterChips chips={chips} onClearAll={reset} />
      </Card>

      <div className="mb-5 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Status kelengkapan</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Lengkap" value={formatNumber(summary.byStatus.lengkap)} hint={`${formatPercent(summary.pctLengkap)} dari ${summary.total}`} tone="teal" icon={<CheckCircle2 className="h-5 w-5" />} />
            <KpiCard label="Bertahap" value={formatNumber(summary.byStatus.bertahap)} tone="blue" />
            <KpiCard label="Dalam proses" value={formatNumber(summary.byStatus.dalam_proses)} tone="amber" />
            <KpiCard label="Belum dikirim" value={formatNumber(summary.byStatus.belum_dikirim)} tone="rose" />
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Ketepatan waktu (per {formatDate(asOf)})</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Tepat waktu" value={formatNumber(summary.byTimeliness.tepat_waktu)} hint={`${formatPercent(summary.pctTepatWaktu)} dari yang disampaikan`} tone="teal" icon={<Clock className="h-5 w-5" />} />
            <KpiCard label="Terlambat" value={formatNumber(summary.byTimeliness.terlambat)} hint="Disampaikan lewat tenggat" tone="violet" />
            <KpiCard label="Lewat tenggat" value={formatNumber(summary.byTimeliness.lewat_tenggat)} hint="Belum disampaikan" tone="rose" icon={<TimerOff className="h-5 w-5" />} />
            <KpiCard label="Belum jatuh tempo" value={formatNumber(summary.byTimeliness.belum_jatuh_tempo)} tone="navy" />
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <ChartCard
          title="Status kelengkapan per kategori"
          description="Klik kolom kategori untuk memfilter tabel."
          summary={byCategory.map((c) => `${c.category}: ${c.lengkap}/${c.total} lengkap`).join("; ") || "Tidak ada data."}
          selectedLabel={filters.category !== ALL ? filters.category : null}
          onReset={() => set("category", ALL)}
          table={
            <CategoryTable
              data={byCategory.map((c) => ({ key: c.category, count: c.total }))}
              selected={filters.category === ALL ? null : filters.category}
              onSelect={(k) => set("category", filters.category === k ? ALL : k)}
              keyHeader="Kategori"
              countHeader="Jumlah permintaan"
              showUnits={false}
            />
          }
        >
          {byCategory.length ? (
            <StackedBarChart
              data={byCategory}
              categoryKey="category"
              selected={filters.category === ALL ? null : filters.category}
              onSelect={(c) => set("category", filters.category === c ? ALL : c)}
              series={REQUEST_STATUSES.map((s) => ({ key: s, label: REQUEST_STATUS_LABEL[s], color: REQUEST_STATUS_COLOR[s] }))}
            />
          ) : (
            <EmptyState title="Tidak ada data" />
          )}
        </ChartCard>
        <Card aria-labelledby="catatan">
          <SectionHeader id="catatan" icon={<NotebookPen className="h-5 w-5 text-amber-700" aria-hidden />} title="Catatan pemenuhan" description="Permintaan belum lengkap dengan tenggat terdekat." />
          {notes.length ? (
            <ul className="space-y-2">
              {notes.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpenId(r.id)} className="w-full rounded-lg border border-line px-3 py-2 text-left hover:border-sky-300 hover:bg-sky-50/60">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-navy-900">
                        {r.id} · {idx.get(r.unit_id)?.name}
                      </span>
                      <RequestTimelinessBadge value={requestTimeliness(r, asOf)} />
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Tenggat {formatDate(r.due_date)} · {REQUEST_STATUS_LABEL[r.status]} — {r.dr_note}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Semua permintaan pada filter ini sudah lengkap" />
          )}
        </Card>
      </div>

      <Card className="mb-5" aria-labelledby="tabel-permindok">
        <SectionHeader
          id="tabel-permindok"
          icon={<FileStack className="h-5 w-5 text-navy-700" aria-hidden />}
          title="Daftar permintaan dokumen"
          description="Klik baris atau Detail untuk mengedit status, tanggal penyampaian, dan catatan (tersimpan lokal)."
        />
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          caption="Daftar permintaan dokumen KPw"
          onRowOpen={(r) => setOpenId(r.id)}
          openLabel="Detail/Edit"
          initialSort={{ key: "due", dir: "asc" }}
          emptyAction={<Button onClick={reset}>Reset filter</Button>}
        />
      </Card>

      <Card aria-labelledby="panduan">
        <SectionHeader id="panduan" icon={<Stamp className="h-5 w-5 text-violet-700" aria-hidden />} title="Panduan watermark dan tanda terima" description="Materi simulasi untuk alur penyampaian dokumen." />
        <div className="grid gap-4 md:grid-cols-2">
          <ol className="list-decimal space-y-1.5 pl-5 text-[15px] text-navy-900">
            <li>Periksa daftar permintaan dan catatan DR pada tabel di atas.</li>
            <li>Siapkan dokumen sesuai kategori; beri watermark teks &quot;SALINAN — UNTUK PEMERIKSAAN&quot; (contoh simulasi) pada setiap halaman.</li>
            <li>Pastikan nomor permintaan (mis. PMD-001) tercantum pada nama berkas.</li>
            <li>Catat tanggal penyampaian; tanggal tidak boleh mendahului tanggal permintaan.</li>
            <li>Unduh tanda terima simulasi sebagai bukti serah terima dan simpan bersama dokumen.</li>
          </ol>
          <div className="space-y-3">
            <SimulationNote>Format watermark dan tanda terima di sini adalah contoh demonstrasi, bukan ketentuan resmi.</SimulationNote>
            {sampleForReceipt ? (
              <Button
                onClick={() => {
                  downloadText(`tanda-terima-${sampleForReceipt.id}-SIMULASI.txt`, receiptText(sampleForReceipt, idx.get(sampleForReceipt.unit_id)?.name ?? "", asOf));
                  notify(`Tanda terima simulasi ${sampleForReceipt.id} diunduh.`);
                }}
              >
                <ClipboardList className="h-4 w-4" aria-hidden />
                Unduh contoh tanda terima ({sampleForReceipt.id})
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <RequestDrawer requestId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

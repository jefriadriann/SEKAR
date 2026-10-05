"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Ban, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, FileSpreadsheet, FileStack, FileText, Layers, ListChecks, RotateCcw, ScrollText } from "lucide-react";
import { CategoryTable, ChartCard, StackedHBarChart } from "@/components/charts/Charts";
import { receiptText, RequestDrawer } from "@/components/domain/RequestDrawer";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, Button, Card, cx, EmptyState, FilterChips, IconTile, PageHeader, SearchField, SectionHeader, SelectField, SimulationNote, type TileTone } from "@/components/ui/primitives";
import { RequestStatusBadge, RequestTimelinessBadge } from "@/components/ui/StatusBadges";
import { ALL, uniqueSorted, unitIndex } from "@/lib/analytics/common";
import {
  DEFAULT_REQUEST_FILTERS,
  filterRequests,
  REQUEST_TIMELINESS_LABEL,
  requestTimeliness,
  statusByCategory,
  summarizeRequests,
  type RequestFilters,
  type RequestTimeliness,
} from "@/lib/analytics/permindok";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import { clean, formatPercent, REQUEST_STATUS_LABEL } from "@/lib/format";
import { REQUEST_STATUS_COLOR } from "@/lib/palette";
import { kpwModuleData } from "@/lib/scope";
import { REQUEST_STATUSES, type AuditSchedule, type DocumentRequest } from "@/lib/types";

export function scheduleShortLabel(s: AuditSchedule | undefined): string {
  return s ? `${s.examiner} ${s.exam_type} ${s.year}` : "—";
}

const WATERMARK_STEPS = [
  "Buka dokumen yang akan disampaikan dalam format PDF.",
  "Tambahkan watermark teks “SALINAN — UNTUK PEMERIKSAAN” (contoh simulasi) secara diagonal di setiap halaman.",
  "Pastikan nomor permintaan (mis. PMD-001) tercantum pada nama berkas.",
  "Periksa kembali agar watermark tidak menutupi isi penting dokumen.",
  "Simpan berkas dan unggah melalui kanal resmi; di mode demo tidak ada unggahan ke server.",
];

const DELIVERY_STEPS = [
  "Cek daftar permintaan dan masukan DR pada tabel Daftar Permintaan Dokumen.",
  "Siapkan dokumen sesuai kategori dan pastikan tidak memuat materi SGo.",
  "Beri watermark dan nama berkas sesuai nomor permintaan.",
  "Sampaikan dokumen sebelum tenggat; catat tanggal penyampaian (tidak boleh sebelum tanggal permintaan).",
  "Unduh dan simpan tanda terima sebagai bukti serah terima.",
];

export function PermindokView() {
  const { data, asOf, notify } = useReadySekar();
  const kpw = useMemo(() => kpwModuleData(data), [data]);
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_REQUEST_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [guide, setGuide] = useState<"watermark" | "penyampaian" | "catatan" | null>(null);
  const idx = useMemo(() => unitIndex(kpw.units), [kpw.units]);
  const schedIdx = useMemo(() => new Map(kpw.audit_schedules.map((s) => [s.id, s])), [kpw.audit_schedules]);
  const set = <K extends keyof RequestFilters>(k: K, v: RequestFilters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const reset = () => setFilters(DEFAULT_REQUEST_FILTERS);

  const years = uniqueSorted(kpw.document_requests.map((r) => Number(r.requested_at.slice(0, 4))));
  const categories = uniqueSorted(kpw.document_requests.map((r) => r.category));
  const schedules = kpw.audit_schedules.filter((s) => kpw.document_requests.some((r) => r.schedule_id === s.id));
  const unitsWithReq = kpw.units.filter((u) => kpw.document_requests.some((r) => r.unit_id === u.id));

  const filtered = useMemo(() => filterRequests(kpw.document_requests, kpw.units, filters, asOf), [kpw, filters, asOf]);
  const summary = summarizeRequests(filtered, asOf);
  const byCategory = useMemo(
    () => statusByCategory(filterRequests(kpw.document_requests, kpw.units, filters, asOf, ["category"])).sort((a, b) => b.total - a.total),
    [kpw, filters, asOf],
  );
  const openNotes = filtered.filter((r) => r.status !== "lengkap").sort((a, b) => a.due_date.localeCompare(b.due_date));

  const chips = [
    filters.unitId !== ALL && { label: idx.get(filters.unitId)?.name ?? filters.unitId, onRemove: () => set("unitId", ALL) },
    filters.status !== ALL && { label: REQUEST_STATUS_LABEL[filters.status], onRemove: () => set("status", ALL) },
    filters.timeliness !== ALL && { label: REQUEST_TIMELINESS_LABEL[filters.timeliness], onRemove: () => set("timeliness", ALL) },
    filters.category !== ALL && { label: `Kategori ${filters.category}`, onRemove: () => set("category", ALL) },
    filters.search && { label: `Cari "${filters.search}"`, onRemove: () => set("search", "") },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  const dateCell = (d: string | null, empty = "-") => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {d && <CalendarDays className="h-3.5 w-3.5 text-brand" aria-hidden />}
      {formatDate(d, empty)}
    </span>
  );

  const columns: Column<DocumentRequest>[] = [
    { key: "sched", header: "Pemeriksaan", render: (r) => <span className="whitespace-nowrap">{scheduleShortLabel(schedIdx.get(r.schedule_id))}</span>, sortValue: (r) => scheduleShortLabel(schedIdx.get(r.schedule_id)) },
    { key: "cat", header: "Kategori", render: (r) => r.category, sortValue: (r) => r.category },
    { key: "unit", header: "KPwDN", render: (r) => <span className="whitespace-nowrap">{idx.get(r.unit_id)?.name ?? r.unit_id}</span>, sortValue: (r) => idx.get(r.unit_id)?.name ?? "" },
    {
      key: "doc",
      header: "Dokumen",
      className: "min-w-[200px]",
      render: (r) => (
        <span>
          <span className="block">{clean(r.title)}</span>
          <span className="text-[12px] text-muted">{r.id}</span>
        </span>
      ),
      sortValue: (r) => r.title,
    },
    { key: "note", header: "Masukan DR", className: "min-w-[200px] text-muted", render: (r) => <span className="line-clamp-2">{clean(r.dr_note)}</span> },
    { key: "req", header: "Tanggal Diminta", render: (r) => dateCell(r.requested_at), sortValue: (r) => r.requested_at },
    { key: "due", header: "Tenggat", render: (r) => dateCell(r.due_date), sortValue: (r) => r.due_date },
    {
      key: "sub",
      header: "Tanggal Penyampaian",
      render: (r) => (
        <span>
          {dateCell(r.submitted_at)}
          <span className="mt-1 block">
            <RequestTimelinessBadge short value={requestTimeliness(r, asOf)} />
          </span>
        </span>
      ),
      sortValue: (r) => r.submitted_at,
    },
    { key: "status", header: "Status Penyampaian", render: (r) => <RequestStatusBadge status={r.status} />, sortValue: (r) => r.status },
  ];

  const exportCsv = () => {
    const csv = toCsv(filtered, [
      { header: "id", value: (r) => r.id },
      { header: "pemeriksaan", value: (r) => scheduleShortLabel(schedIdx.get(r.schedule_id)) },
      { header: "kategori", value: (r) => r.category },
      { header: "kpw", value: (r) => idx.get(r.unit_id)?.name ?? r.unit_id },
      { header: "dokumen", value: (r) => r.title },
      { header: "masukan_dr", value: (r) => r.dr_note },
      { header: "tanggal_diminta", value: (r) => r.requested_at },
      { header: "tenggat", value: (r) => r.due_date },
      { header: "tanggal_penyampaian", value: (r) => r.submitted_at ?? "" },
      { header: "status_kelengkapan", value: (r) => REQUEST_STATUS_LABEL[r.status] },
      { header: "ketepatan_waktu", value: (r) => REQUEST_TIMELINESS_LABEL[requestTimeliness(r, asOf)] },
    ]);
    downloadText(`sekar-permindok-SIMULASI-${asOf}.csv`, csv, "text/csv;charset=utf-8");
    notify(`${filtered.length} permintaan diekspor ke CSV.`);
  };

  const templateWatermark = () => {
    downloadText(
      "template-watermark-SIMULASI.txt",
      ["TEMPLATE WATERMARK — SIMULASI", "", "Teks watermark: SALINAN — UNTUK PEMERIKSAAN", "Posisi: diagonal, transparansi 30%", "Nama berkas: <NOMOR PERMINTAAN>_<JUDUL>.pdf", "", "Contoh demonstrasi, bukan ketentuan resmi."].join("\n"),
    );
    notify("Template watermark simulasi diunduh.");
  };
  const templateReceipt = () => {
    const sample = filtered[0] ?? kpw.document_requests[0];
    if (!sample) return;
    downloadText(`template-tanda-terima-SIMULASI.txt`, receiptText(sample, idx.get(sample.unit_id)?.name ?? sample.unit_id, asOf));
    notify("Template tanda terima simulasi diunduh.");
  };

  return (
    <div>
      <PageHeader
        title="Tracker Permindok"
        description="Monitoring pemenuhan dokumen permintaan pemeriksaan pada KPwDN."
        actions={
          <>
            <SelectField
              id="p-year"
              label="Tahun Pemeriksaan"
              icon={<CalendarDays />}
              className="w-[170px]"
              value={String(filters.year)}
              onChange={(v) => set("year", v === ALL ? ALL : Number(v))}
              options={[{ value: ALL, label: "Semua Tahun" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
            />
            <SelectField
              id="p-sched"
              label="Pemeriksaan"
              icon={<ClipboardList />}
              className="w-[210px]"
              value={filters.scheduleId}
              onChange={(v) => set("scheduleId", v)}
              options={[{ value: ALL, label: "Semua Pemeriksaan" }, ...schedules.map((s) => ({ value: s.id, label: `${scheduleShortLabel(s)} · ${idx.get(s.unit_id)?.name ?? ""}` }))]}
            />
            <SelectField
              id="p-cat"
              label="Kategori Dokumen"
              icon={<Layers />}
              className="w-[190px]"
              value={filters.category}
              onChange={(v) => set("category", v)}
              options={[{ value: ALL, label: "Semua Kategori" }, ...categories.map((c) => ({ value: c, label: c }))]}
            />
            <Button onClick={reset} className="h-10">
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset Filter
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr]">
        <section aria-labelledby="catatan" className="flex min-w-0 flex-col rounded-[14px] border border-[#f6d5d5] bg-[#fdf0f0] p-4">
          <h2 id="catatan" className="mb-3 flex items-center gap-2 text-[16px] font-bold text-[#c62f35]">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            Catatan Pemenuhan Permindok
          </h2>
          <ul className="space-y-3 text-[14px] text-navy-900">
            {[
              [true, "Dokumen sudah di-watermark."],
              [false, "Tidak memasukkan SGo dalam dokumen."],
              [true, "Disampaikan tepat waktu sesuai tenggat yang ditetapkan."],
              [true, "Sertakan tanda terima dokumen."],
            ].map(([ok, text]) => (
              <li key={String(text)} className="flex items-start gap-2.5">
                {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#22b07d]" aria-label="Wajib" /> : <Ban className="mt-0.5 h-5 w-5 shrink-0 text-[#e5484d]" aria-label="Dilarang" />}
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setGuide("catatan")}
            className="mt-auto flex items-center justify-between gap-2 rounded-lg border border-[#f3caca] bg-white/70 px-3 py-2 pt-2 text-left text-[13px] font-semibold text-[#a3262b] hover:bg-white"
          >
            {openNotes.length} permintaan belum lengkap · {summary.byTimeliness.lewat_tenggat} lewat tenggat — lihat masukan DR
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        </section>

        <Card aria-labelledby="panduan">
          <SectionHeader id="panduan" title="Panduan dan Template" description="Materi simulasi" />
          <ul className="space-y-2">
            <GuideRow tone="rose" icon={<ListChecks />} title="Panduan: Tata cara melakukan watermark dokumen" sub="Langkah demi langkah · tanpa video" onClick={() => setGuide("watermark")} />
            <GuideRow tone="rose" icon={<FileText />} title="Template watermark" sub="Berkas TXT simulasi" onClick={templateWatermark} />
            <GuideRow tone="blue" icon={<ScrollText />} title="Template tanda terima" sub="Berkas TXT simulasi" onClick={templateReceipt} />
            <GuideRow tone="amber" icon={<FileSpreadsheet />} title="Tata cara penyampaian dokumen" sub="Panduan lengkap (simulasi)" onClick={() => setGuide("penyampaian")} />
          </ul>
        </Card>

        <ChartCard
          title="Jumlah Permindok per Kategori"
          description={`${summary.total} permintaan · ${formatPercent(summary.pctLengkap)} lengkap · ${formatPercent(summary.pctTepatWaktu)} tepat waktu dari yang disampaikan`}
          summary={byCategory.map((c) => `${c.category}: ${c.total} permintaan, ${c.lengkap} lengkap`).join("; ") || "Tidak ada data."}
          selectedLabel={filters.category !== ALL ? filters.category : null}
          onReset={() => set("category", ALL)}
          className="lg:col-span-2 xl:col-span-1"
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
            <StackedHBarChart
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
      </div>

      <Card aria-labelledby="tabel-permindok">
        <SectionHeader
          id="tabel-permindok"
          icon={<FileStack />}
          title="Daftar Permintaan Dokumen"
          description="Status penyampaian (kelengkapan) dibedakan dari ketepatan waktu. Klik baris untuk mengedit (tersimpan lokal)."
          actions={
            <>
              <SelectField
                id="p-unit"
                label="KPwDN"
                hideLabel
                className="w-[170px]"
                value={filters.unitId}
                onChange={(v) => set("unitId", v)}
                options={[{ value: ALL, label: "Semua KPwDN" }, ...unitsWithReq.map((u) => ({ value: u.id, label: u.name }))]}
              />
              <SelectField
                id="p-status"
                label="Status Penyampaian"
                hideLabel
                className="w-[160px]"
                value={filters.status}
                onChange={(v) => set("status", v)}
                options={[{ value: ALL, label: "Semua status" }, ...REQUEST_STATUSES.map((s) => ({ value: s, label: REQUEST_STATUS_LABEL[s] }))]}
              />
              <SelectField
                id="p-time"
                label="Ketepatan waktu"
                hideLabel
                className="w-[200px]"
                value={filters.timeliness}
                onChange={(v) => set("timeliness", v as RequestTimeliness | typeof ALL)}
                options={[{ value: ALL, label: "Semua ketepatan waktu" }, ...(Object.keys(REQUEST_TIMELINESS_LABEL) as RequestTimeliness[]).map((t) => ({ value: t, label: REQUEST_TIMELINESS_LABEL[t] }))]}
              />
              <Button size="sm" className="h-10" onClick={exportCsv} disabled={!filtered.length}>
                Unduh CSV
              </Button>
            </>
          }
        />
        <FilterChips chips={chips} onClearAll={reset} />
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          caption="Daftar permintaan dokumen KPwDN"
          onRowOpen={(r) => setOpenId(r.id)}
          openColumnKey="doc"
          initialSort={{ key: "due", dir: "asc" }}
          pageSize={10}
          unitLabel="dokumen"
          minWidth={1120}
          toolbar={<SearchField id="p-search" label="Cari dokumen" hideLabel value={filters.search} onChange={(v) => set("search", v)} placeholder="Cari dokumen, KPwDN, atau kata kunci..." />}
          emptyAction={<Button onClick={reset}>Reset filter</Button>}
        />
      </Card>

      <Drawer
        open={guide === "watermark" || guide === "penyampaian"}
        onClose={() => setGuide(null)}
        title={guide === "watermark" ? "Tata cara melakukan watermark dokumen" : "Tata cara penyampaian dokumen"}
        subtitle={<Badge tone="amber">SIMULASI — panduan langkah demi langkah</Badge>}
      >
        <ol className="space-y-3">
          {(guide === "watermark" ? WATERMARK_STEPS : DELIVERY_STEPS).map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e6efff] text-sm font-bold text-brand" aria-hidden>
                {i + 1}
              </span>
              <span className="pt-0.5 text-[15px] text-navy-900">
                <span className="sr-only">Langkah {i + 1}: </span>
                {s}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <SimulationNote>Format watermark dan tanda terima adalah contoh demonstrasi, bukan ketentuan resmi.</SimulationNote>
        </div>
      </Drawer>

      <Drawer open={guide === "catatan"} onClose={() => setGuide(null)} title="Masukan DR untuk permintaan belum lengkap" subtitle={`${openNotes.length} permintaan, urut tenggat terdekat`}>
        {openNotes.length ? (
          <ul className="space-y-2">
            {openNotes.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setGuide(null);
                    setOpenId(r.id);
                  }}
                  className="w-full rounded-lg border border-line px-3 py-2 text-left hover:border-sky-300 hover:bg-sky-50/60"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-navy-900">
                      {r.id} · {idx.get(r.unit_id)?.name}
                    </span>
                    <RequestTimelinessBadge value={requestTimeliness(r, asOf)} />
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted">
                    Tenggat {formatDate(r.due_date)} · {REQUEST_STATUS_LABEL[r.status]} — {r.dr_note}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Semua permintaan pada filter ini sudah lengkap" />
        )}
      </Drawer>

      <RequestDrawer requestId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function GuideRow({ tone, icon, title, sub, onClick }: { tone: TileTone; icon: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={cx("group flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition hover:border-sky-300 hover:bg-[#f7fbff]")}>
        <IconTile tone={tone} size="sm">
          {icon}
        </IconTile>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold leading-snug text-navy-900">{title}</span>
          <span className="block text-[12px] text-muted">{sub}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-navy-800" aria-hidden />
      </button>
    </li>
  );
}

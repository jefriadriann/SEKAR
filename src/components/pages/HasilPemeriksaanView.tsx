"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Building, CheckCircle2, ClipboardList, Download, Layers, Repeat, Scale } from "lucide-react";
import { CategoryBarChart, CategoryTable, ChartCard, DonutChart, TrendChart, VerticalBarChart } from "@/components/charts/Charts";
import { FindingDrawer } from "@/components/domain/FindingDrawer";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge, Button, Card, cx, EmptyState, FilterChips, KpiCard, PageHeader, SearchField, SectionHeader, SelectField } from "@/components/ui/primitives";
import { FindingStatusBadge, TimelinessBadge } from "@/components/ui/StatusBadges";
import { reconciliationRate, summarizeAssets } from "@/lib/analytics/assets";
import { ALL, uniqueSorted, unitIndex } from "@/lib/analytics/common";
import {
  aggregateByTheme,
  DEFAULT_FINDING_FILTERS,
  filterFindings,
  findingsByArea,
  findingsByExaminer,
  findingsByKorwil,
  findingsTrend,
  findingTimeliness,
  summarizeFindings,
  TIMELINESS_LABEL,
  type FindingFilters,
  type ThemeAggregate,
  type Timeliness,
} from "@/lib/analytics/findings";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import { FINDING_STATUS_LABEL, formatNumber, formatPercent, REFERENCE_KIND_LABEL } from "@/lib/format";
import { EXAMINER_COLOR } from "@/lib/palette";
import { kpwModuleData } from "@/lib/scope";
import { EXAMINERS, FINDING_STATUSES, type AssetReconciliation, type Finding } from "@/lib/types";

export function HasilPemeriksaanView() {
  const { data, asOf, openDocument, notify } = useReadySekar();
  const kpw = useMemo(() => kpwModuleData(data), [data]);
  const [filters, setFilters] = useState<FindingFilters>(DEFAULT_FINDING_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tableMode, setTableMode] = useState<"temuan" | "tema">("temuan");

  const idx = useMemo(() => unitIndex(kpw.units), [kpw.units]);
  const years = useMemo(() => uniqueSorted(kpw.findings.map((f) => f.year)), [kpw.findings]);
  const korwils = useMemo(() => uniqueSorted(kpw.units.map((u) => u.korwil ?? "")).filter(Boolean), [kpw.units]);
  const areas = useMemo(() => uniqueSorted([...kpw.findings.map((f) => f.area), ...data.references.map((r) => r.area)]), [kpw.findings, data.references]);
  const unitOptions = kpw.units.filter((u) => filters.korwil === ALL || u.korwil === filters.korwil);

  const set = <K extends keyof FindingFilters>(k: K, v: FindingFilters[K]) =>
    setFilters((f) => {
      const next = { ...f, [k]: v };
      // KPw yang dipilih harus berada di korwil terpilih.
      if (k === "korwil" && next.unitId !== ALL && idx.get(next.unitId as string)?.korwil !== v && v !== ALL) next.unitId = ALL;
      return next;
    });
  const toggle = <K extends keyof FindingFilters>(k: K, v: FindingFilters[K]) => set(k, filters[k] === v ? (ALL as FindingFilters[K]) : v);
  const reset = () => setFilters(DEFAULT_FINDING_FILTERS);

  const filtered = useMemo(() => filterFindings(kpw.findings, kpw.units, filters, asOf), [kpw, filters, asOf]);
  const summary = useMemo(() => summarizeFindings(filtered, asOf), [filtered, asOf]);
  // Tiap chart mengabaikan dimensi miliknya sendiri agar kategori terpilih tetap terlihat (disorot).
  const byArea = useMemo(() => findingsByArea(filterFindings(kpw.findings, kpw.units, filters, asOf, ["area"])), [kpw, filters, asOf]);
  const byKorwil = useMemo(
    () => findingsByKorwil(filterFindings(kpw.findings, kpw.units, filters, asOf, ["korwil", "unitId"]), kpw.units, korwils),
    [kpw, filters, asOf, korwils],
  );
  const trend = useMemo(() => findingsTrend(filterFindings(kpw.findings, kpw.units, filters, asOf, ["year"]), years), [kpw, filters, asOf, years]);
  const byExaminer = useMemo(() => findingsByExaminer(filterFindings(kpw.findings, kpw.units, filters, asOf, ["examiner"])), [kpw, filters, asOf]);
  const themes = useMemo(() => aggregateByTheme(filtered), [filtered]);

  const assets = useMemo(
    () =>
      kpw.asset_reconciliations.filter(
        (a) =>
          (filters.year === ALL || a.year === filters.year) &&
          (filters.unitId === ALL || a.unit_id === filters.unitId) &&
          (filters.korwil === ALL || idx.get(a.unit_id)?.korwil === filters.korwil),
      ),
    [kpw.asset_reconciliations, filters, idx],
  );
  const assetSummary = summarizeAssets(assets);
  const learning = data.references.filter((r) => filters.area === ALL || r.area === filters.area);

  const chips = [
    filters.year !== ALL && { label: `Tahun ${filters.year}`, onRemove: () => set("year", ALL) },
    filters.examiner !== ALL && { label: `Pemeriksa ${filters.examiner}`, onRemove: () => set("examiner", ALL) },
    filters.korwil !== ALL && { label: `Korwil ${filters.korwil}`, onRemove: () => set("korwil", ALL) },
    filters.unitId !== ALL && { label: idx.get(filters.unitId)?.name ?? filters.unitId, onRemove: () => set("unitId", ALL) },
    filters.area !== ALL && { label: `Area ${filters.area}`, onRemove: () => set("area", ALL) },
    filters.status !== ALL && { label: FINDING_STATUS_LABEL[filters.status], onRemove: () => set("status", ALL) },
    filters.timeliness !== ALL && { label: TIMELINESS_LABEL[filters.timeliness], onRemove: () => set("timeliness", ALL) },
    filters.search && { label: `Cari "${filters.search}"`, onRemove: () => set("search", "") },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  const columns: Column<Finding>[] = [
    { key: "id", header: "ID", render: (f) => <span className="whitespace-nowrap font-mono text-xs">{f.id}</span>, sortValue: (f) => f.id },
    {
      key: "unit",
      header: "KPw",
      render: (f) => (
        <span>
          <span className="font-semibold">{idx.get(f.unit_id)?.name ?? f.unit_id}</span>
          <span className="block text-xs text-muted">{idx.get(f.unit_id)?.korwil}</span>
        </span>
      ),
      sortValue: (f) => idx.get(f.unit_id)?.name ?? f.unit_id,
    },
    { key: "year", header: "Tahun", render: (f) => f.year, sortValue: (f) => f.year },
    { key: "examiner", header: "Pemeriksa", render: (f) => f.examiner, sortValue: (f) => f.examiner },
    { key: "area", header: "Area", render: (f) => f.area, sortValue: (f) => f.area },
    {
      key: "title",
      header: "Temuan & rekomendasi",
      className: "min-w-[260px] max-w-[360px]",
      render: (f) => (
        <span>
          <span className="font-semibold text-navy-900">{f.title}</span>
          {f.is_repeat && (
            <Badge tone="violet" className="ml-1">
              Berulang
            </Badge>
          )}
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{f.recommendation}</span>
        </span>
      ),
      sortValue: (f) => f.title,
    },
    { key: "status", header: "Status", render: (f) => <FindingStatusBadge status={f.status} />, sortValue: (f) => f.status },
    {
      key: "due",
      header: "Tenggat",
      render: (f) => (
        <span className="whitespace-nowrap">
          {formatDate(f.due_date)}
          <span className="mt-1 block">
            <TimelinessBadge value={findingTimeliness(f, asOf)} />
          </span>
        </span>
      ),
      sortValue: (f) => f.due_date,
    },
    { key: "pic", header: "PIC", render: (f) => <span className="whitespace-nowrap">{f.pic}</span>, sortValue: (f) => f.pic },
  ];

  const themeColumns: Column<ThemeAggregate>[] = [
    { key: "theme", header: "Tema", render: (t) => <span className="font-semibold">{t.theme}</span>, sortValue: (t) => t.theme },
    { key: "area", header: "Area", render: (t) => t.area, sortValue: (t) => t.area },
    { key: "count", header: "Jumlah temuan", render: (t) => formatNumber(t.count), sortValue: (t) => t.count, className: "text-right tabular-nums" },
    { key: "units", header: "Kantor terdampak", render: (t) => `${t.affectedUnits} KPw`, sortValue: (t) => t.affectedUnits, className: "text-right tabular-nums" },
    { key: "open", header: "Belum selesai", render: (t) => formatNumber(t.open), sortValue: (t) => t.open, className: "text-right tabular-nums" },
    { key: "repeat", header: "Berulang", render: (t) => formatNumber(t.repeat), sortValue: (t) => t.repeat, className: "text-right tabular-nums" },
    { key: "due", header: "Tenggat terdekat (terbuka)", render: (t) => formatDate(t.nearestOpenDue), sortValue: (t) => t.nearestOpenDue },
    { key: "rec", header: "Rekomendasi umum", className: "min-w-[220px]", render: (t) => <span className="line-clamp-2 text-xs text-muted">{t.recommendation}</span> },
  ];

  const exportCsv = () => {
    const csv = toCsv(filtered, [
      { header: "id", value: (f) => f.id },
      { header: "kpw", value: (f) => idx.get(f.unit_id)?.name ?? f.unit_id },
      { header: "korwil", value: (f) => idx.get(f.unit_id)?.korwil ?? "" },
      { header: "tahun", value: (f) => f.year },
      { header: "pemeriksa", value: (f) => f.examiner },
      { header: "area", value: (f) => f.area },
      { header: "tema", value: (f) => f.theme },
      { header: "judul", value: (f) => f.title },
      { header: "rekomendasi", value: (f) => f.recommendation },
      { header: "status", value: (f) => FINDING_STATUS_LABEL[f.status] },
      { header: "tenggat", value: (f) => f.due_date },
      { header: "tanggal_selesai", value: (f) => f.completed_at ?? "" },
      { header: "ketepatan_waktu", value: (f) => TIMELINESS_LABEL[findingTimeliness(f, asOf)] },
      { header: "pic", value: (f) => f.pic },
    ]);
    downloadText(`sekar-temuan-kpw-SIMULASI-${asOf}.csv`, csv, "text/csv;charset=utf-8");
    notify(`${filtered.length} temuan diekspor ke CSV.`);
  };

  const topArea = byArea[0];
  const yearScope = filters.year === ALL ? "semua tahun" : `tahun ${filters.year}`;

  return (
    <div>
      <PageHeader
        eyebrow="Modul KPw"
        title="Hasil Pemeriksaan KPwDN"
        description="Temuan pemeriksaan BPK, DAI dan KAA pada Kantor Perwakilan dalam negeri (fiktif). Temuan unit DR tidak termasuk dalam agregasi ini."
        actions={
          <Button onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
        }
      />

      <Card className="mb-5" aria-labelledby="filter-title">
        <h2 id="filter-title" className="sr-only">
          Filter
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <SelectField
            id="f-year"
            label="Tahun"
            value={String(filters.year)}
            onChange={(v) => set("year", v === ALL ? ALL : Number(v))}
            options={[{ value: ALL, label: "Semua Tahun" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
          />
          <SelectField
            id="f-exam"
            label="Pemeriksa"
            value={filters.examiner}
            onChange={(v) => set("examiner", v)}
            options={[{ value: ALL, label: "Semua pemeriksa" }, ...EXAMINERS.map((e) => ({ value: e, label: e }))]}
          />
          <SelectField
            id="f-korwil"
            label="Korwil"
            value={filters.korwil}
            onChange={(v) => set("korwil", v)}
            options={[{ value: ALL, label: "Semua korwil" }, ...korwils.map((k) => ({ value: k, label: k }))]}
          />
          <SelectField
            id="f-unit"
            label="KPw"
            value={filters.unitId}
            onChange={(v) => set("unitId", v)}
            options={[{ value: ALL, label: "Semua KPw" }, ...unitOptions.map((u) => ({ value: u.id, label: u.name }))]}
          />
          <SelectField
            id="f-area"
            label="Area"
            value={filters.area}
            onChange={(v) => set("area", v)}
            options={[{ value: ALL, label: "Semua area" }, ...areas.map((a) => ({ value: a, label: a }))]}
          />
          <SelectField
            id="f-status"
            label="Status"
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[{ value: ALL, label: "Semua status" }, ...FINDING_STATUSES.map((s) => ({ value: s, label: FINDING_STATUS_LABEL[s] }))]}
          />
          <SelectField
            id="f-time"
            label="Ketepatan waktu"
            value={filters.timeliness}
            onChange={(v) => set("timeliness", v as Timeliness | typeof ALL)}
            options={[{ value: ALL, label: "Semua" }, ...(Object.keys(TIMELINESS_LABEL) as Timeliness[]).map((t) => ({ value: t, label: TIMELINESS_LABEL[t] }))]}
          />
          <SearchField id="f-search" value={filters.search} onChange={(v) => set("search", v)} placeholder="ID, judul, PIC…" />
        </div>
        <FilterChips chips={chips} onClearAll={reset} />
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Jumlah temuan" value={formatNumber(summary.total)} hint={`Record temuan, ${yearScope}`} icon={<ClipboardList className="h-5 w-5" />} />
        <KpiCard label="KPw terdampak" value={formatNumber(summary.uniqueUnits)} hint={`KPw unik dari ${kpw.units.length} KPw`} tone="navy" icon={<Building className="h-5 w-5" />} />
        <KpiCard
          label="Selesai"
          value={formatNumber(summary.byStatus.selesai)}
          hint={`${formatPercent(summary.pctSelesai)} dari temuan`}
          tone="teal"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard label="Dalam proses" value={formatNumber(summary.byStatus.dalam_proses)} hint="Tindak lanjut berjalan" tone="amber" />
        <KpiCard label="Belum ditindaklanjuti" value={formatNumber(summary.byStatus.belum_ditindaklanjuti)} hint={`${summary.repeat} temuan berulang`} tone="rose" icon={<Repeat className="h-5 w-5" />} />
        <KpiCard
          label="Lewat tenggat"
          value={formatNumber(summary.overdue)}
          hint={`Belum selesai per ${formatDate(asOf)}`}
          tone="violet"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Jumlah temuan per area"
          description="Klik bar untuk memfilter tabel. Bar terpilih disorot."
          summary={
            topArea
              ? `Area dengan temuan terbanyak: ${topArea.key} (${topArea.count} temuan di ${topArea.uniqueUnits} KPw). Total ${byArea.length} area.`
              : "Tidak ada temuan untuk filter ini."
          }
          selectedLabel={filters.area !== ALL ? filters.area : null}
          onReset={() => set("area", ALL)}
          table={<CategoryTable data={byArea} selected={filters.area === ALL ? null : filters.area} onSelect={(k) => toggle("area", k)} keyHeader="Area" />}
        >
          {byArea.length ? (
            <CategoryBarChart data={byArea} selected={filters.area === ALL ? null : filters.area} onSelect={(k) => toggle("area", k)} />
          ) : (
            <EmptyState title="Tidak ada data" />
          )}
        </ChartCard>
        <ChartCard
          title="Sebaran temuan per korwil"
          description="Jumlah temuan (bar) dan KPw unik (tooltip/tabel) per koordinator wilayah. Klik bar untuk memfilter."
          summary={byKorwil.map((k) => `${k.key}: ${k.count} temuan / ${k.uniqueUnits} KPw`).join("; ") || "Tidak ada data."}
          selectedLabel={filters.korwil !== ALL ? filters.korwil : null}
          onReset={() => set("korwil", ALL)}
          table={<CategoryTable data={byKorwil} selected={filters.korwil === ALL ? null : filters.korwil} onSelect={(k) => toggle("korwil", k)} keyHeader="Korwil" />}
        >
          <VerticalBarChart data={byKorwil} selected={filters.korwil === ALL ? null : filters.korwil} onSelect={(k) => toggle("korwil", k)} />
        </ChartCard>
        <ChartCard
          title="Tren tahunan"
          description="Cakupan: semua tahun dengan filter lain yang aktif (filter tahun tidak diterapkan pada tren). Klik titik untuk memilih tahun."
          summary={trend.map((t) => `${t.year}: ${t.total} temuan (${t.selesai} selesai)`).join("; ")}
          selectedLabel={filters.year !== ALL ? `Tahun ${filters.year}` : null}
          onReset={() => set("year", ALL)}
          table={
            <CategoryTable
              data={trend.map((t) => ({ key: String(t.year), count: t.total, uniqueUnits: t.uniqueUnits }))}
              selected={filters.year === ALL ? null : String(filters.year)}
              onSelect={(k) => toggle("year", Number(k))}
              keyHeader="Tahun"
            />
          }
        >
          <TrendChart data={trend} selected={filters.year === ALL ? null : filters.year} onSelect={(y) => toggle("year", y)} />
        </ChartCard>
        <ChartCard
          title="Proporsi per pemeriksa"
          description="BPK, DAI dan KAA. Klik segmen untuk memfilter."
          summary={byExaminer.map((e) => `${e.key}: ${e.count}`).join("; ")}
          selectedLabel={filters.examiner !== ALL ? filters.examiner : null}
          onReset={() => set("examiner", ALL)}
          table={
            <CategoryTable data={byExaminer} selected={filters.examiner === ALL ? null : filters.examiner} onSelect={(k) => toggle("examiner", k as (typeof EXAMINERS)[number])} keyHeader="Pemeriksa" showUnits={false} />
          }
        >
          <DonutChart
            data={byExaminer}
            colors={EXAMINER_COLOR}
            selected={filters.examiner === ALL ? null : filters.examiner}
            onSelect={(k) => toggle("examiner", k as (typeof EXAMINERS)[number])}
            centerLabel="temuan"
          />
        </ChartCard>
      </div>

      <Card className="mb-5" aria-labelledby="tabel-temuan">
        <SectionHeader
          id="tabel-temuan"
          title={tableMode === "temuan" ? "Daftar temuan" : "Agregasi per tema"}
          description={
            tableMode === "temuan"
              ? "Klik baris atau tombol Detail untuk melihat rincian, bukti, dan memperbarui status."
              : "Satu baris per kombinasi tema × area. Jumlah temuan dihitung per record; kantor terdampak dihitung dari KPw unik."
          }
          actions={
            <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Mode tabel">
              {(["temuan", "tema"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={tableMode === m}
                  onClick={() => setTableMode(m)}
                  className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold", tableMode === m ? "bg-navy-800 text-white" : "text-navy-700 hover:bg-sky-50")}
                >
                  {m === "temuan" ? <ClipboardList className="h-4 w-4" aria-hidden /> : <Layers className="h-4 w-4" aria-hidden />}
                  {m === "temuan" ? "Per temuan" : "Agregasi tema"}
                </button>
              ))}
            </div>
          }
        />
        {tableMode === "temuan" ? (
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(f) => f.id}
            caption="Daftar temuan KPw sesuai filter"
            onRowOpen={(f) => setOpenId(f.id)}
            initialSort={{ key: "due", dir: "asc" }}
            emptyAction={<Button onClick={reset}>Reset filter</Button>}
          />
        ) : (
          <DataTable rows={themes} columns={themeColumns} rowKey={(t) => `${t.theme}-${t.area}`} caption="Agregasi temuan per tema dan area" initialSort={{ key: "count", dir: "desc" }} />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <AssetPanel rows={assets} summary={assetSummary} unitName={(id) => idx.get(id)?.name ?? id} />
        <Card aria-labelledby="materi-title">
          <SectionHeader
            id="materi-title"
            icon={<BookOpen className="h-5 w-5 text-teal-700" aria-hidden />}
            title="Materi pembelajaran"
            description={filters.area === ALL ? "Semua area — materi simulasi" : `Area ${filters.area} — materi simulasi`}
            actions={
              <Link href="/sgo-ketentuan" className="text-sm font-semibold text-sky-700 hover:underline">
                Semua materi
              </Link>
            }
          />
          {learning.length ? (
            <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {learning.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy-900">{r.title}</span>
                    <span className="text-xs text-muted">{r.area}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge tone={r.kind === "worksheet" ? "blue" : r.kind === "ketentuan" ? "teal" : "violet"}>{REFERENCE_KIND_LABEL[r.kind]}</Badge>
                    <Button size="sm" onClick={() => openDocument(r.document_id)}>
                      Buka
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Belum ada materi untuk area ini" />
          )}
        </Card>
      </div>

      <FindingDrawer findingId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function AssetPanel({ rows, summary, unitName }: { rows: AssetReconciliation[]; summary: ReturnType<typeof summarizeAssets>; unitName: (id: string) => string }) {
  const columns: Column<AssetReconciliation>[] = [
    { key: "unit", header: "KPw", render: (a) => <span className="font-semibold">{unitName(a.unit_id)}</span>, sortValue: (a) => unitName(a.unit_id) },
    { key: "year", header: "Tahun", render: (a) => a.year, sortValue: (a) => a.year },
    { key: "total", header: "Total item", render: (a) => formatNumber(a.total_items), sortValue: (a) => a.total_items, className: "text-right tabular-nums" },
    { key: "rec", header: "Rekonsiliasi", render: (a) => formatNumber(a.reconciled_items), sortValue: (a) => a.reconciled_items, className: "text-right tabular-nums" },
    { key: "disc", header: "Selisih", render: (a) => formatNumber(a.discrepancy_items), sortValue: (a) => a.discrepancy_items, className: "text-right tabular-nums" },
    {
      key: "rate",
      header: "% sesuai",
      render: (a) => {
        const r = reconciliationRate(a);
        return (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <span className="block h-full rounded-full bg-teal-600" style={{ width: `${r ?? 0}%` }} />
            </span>
            {formatPercent(r)}
          </span>
        );
      },
      sortValue: (a) => reconciliationRate(a),
    },
  ];
  return (
    <Card aria-labelledby="aset-title">
      <SectionHeader
        id="aset-title"
        icon={<Scale className="h-5 w-5 text-navy-700" aria-hidden />}
        title="Rekonsiliasi aset"
        description="Dari asset_reconciliations, mengikuti filter tahun, korwil dan KPw."
      />
      <dl className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["KPw", formatNumber(summary.units)],
          ["Total item", formatNumber(summary.totalItems)],
          ["Selisih", formatNumber(summary.discrepancy)],
          ["% sesuai", formatPercent(summary.pctReconciled, 1)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-sky-50 px-3 py-2">
            <dt className="text-xs font-semibold text-muted">{k}</dt>
            <dd className="text-lg font-bold text-navy-900 tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        caption="Rekonsiliasi aset per KPw"
        initialSort={{ key: "disc", dir: "desc" }}
        pageSize={10}
        dense
        emptyTitle="Tidak ada data rekonsiliasi"
        emptyDescription="Data rekonsiliasi aset hanya tersedia untuk tahun 2026 pada dataset simulasi ini."
      />
    </Card>
  );
}

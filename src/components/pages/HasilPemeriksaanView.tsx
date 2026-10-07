"use client";

import { useMemo, useState } from "react";
import { BookOpen, CalendarDays, ChevronRight, Download, SlidersHorizontal } from "lucide-react";
import { CategoryTable, ChartCard, ColumnChart, DonutWithLegend, HorizontalBars, TrendChart } from "@/components/charts/Charts";
import { FindingDrawer } from "@/components/domain/FindingDrawer";
import { VideoGuidePlayer } from "@/components/domain/VideoGuidePlayer";
import { ReconcileIcon, VideoGuideIcon } from "@/components/icons/Illustrations";
import { IndonesiaMap, MapLegend } from "@/components/map/IndonesiaMap";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, Button, Card, cx, EmptyState, FilterChips, PageHeader, SearchField, SectionHeader, SelectField, SimulationNote, type Tone } from "@/components/ui/primitives";
import { FindingStatusBadge, TimelinessBadge } from "@/components/ui/StatusBadges";
import { reconciliationRate, summarizeAssets } from "@/lib/analytics/assets";
import { ALL, uniqueSorted, unitIndex } from "@/lib/analytics/common";
import {
  DEFAULT_FINDING_FILTERS,
  filterFindings,
  findingsByArea,
  findingsByExaminer,
  findingsByKorwil,
  findingsTrend,
  findingTimeliness,
  groupFindings,
  summarizeFindings,
  TIMELINESS_LABEL,
  type FindingFilters,
  type FindingGroup,
  type Timeliness,
} from "@/lib/analytics/findings";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import { clean, FINDING_STATUS_LABEL, formatNumber, formatPercent, REFERENCE_KIND_LABEL } from "@/lib/format";
import { EXAMINER_COLOR } from "@/lib/palette";
import { kpwModuleData } from "@/lib/scope";
import { EXAMINERS, FINDING_STATUSES, type AssetReconciliation, type Examiner, type Finding } from "@/lib/types";

export const EXAMINER_TONE: Record<Examiner, Tone> = { BPK: "blue", DAI: "amber", KAA: "violet" };

export function ExaminerBadge({ examiner }: { examiner: Examiner }) {
  return (
    <Badge tone={EXAMINER_TONE[examiner]} className="min-w-[52px] justify-center">
      {examiner}
    </Badge>
  );
}

export function HasilPemeriksaanView() {
  const { data, asOf, notify } = useReadySekar();
  const kpw = useMemo(() => kpwModuleData(data), [data]);
  const years = useMemo(() => uniqueSorted(kpw.findings.map((f) => f.year)), [kpw.findings]);
  const defaultYear = years.includes(Number(asOf.slice(0, 4))) ? Number(asOf.slice(0, 4)) : ALL;
  const [filters, setFilters] = useState<FindingFilters>({ ...DEFAULT_FINDING_FILTERS, year: defaultYear });
  const [showFilters, setShowFilters] = useState(false);
  const [tableMode, setTableMode] = useState<"ringkasan" | "temuan">("ringkasan");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<FindingGroup | null>(null);
  const [panel, setPanel] = useState<"aset" | "panduan" | null>(null);

  const idx = useMemo(() => unitIndex(kpw.units), [kpw.units]);
  const korwils = useMemo(() => uniqueSorted(kpw.units.map((u) => u.korwil ?? "")).filter(Boolean), [kpw.units]);
  const areas = useMemo(() => uniqueSorted([...kpw.findings.map((f) => f.area), ...data.references.map((r) => r.area)]), [kpw.findings, data.references]);
  const unitOptions = kpw.units.filter((u) => filters.korwil === ALL || u.korwil === filters.korwil);

  const set = <K extends keyof FindingFilters>(k: K, v: FindingFilters[K]) =>
    setFilters((f) => {
      const next = { ...f, [k]: v };
      if (k === "korwil" && v !== ALL && next.unitId !== ALL && idx.get(next.unitId)?.korwil !== v) next.unitId = ALL;
      return next;
    });
  const toggle = <K extends keyof FindingFilters>(k: K, v: FindingFilters[K]) => set(k, filters[k] === v ? (ALL as FindingFilters[K]) : v);
  const reset = () => setFilters({ ...DEFAULT_FINDING_FILTERS, year: defaultYear });

  const filtered = useMemo(() => filterFindings(kpw.findings, kpw.units, filters, asOf), [kpw, filters, asOf]);
  const summary = useMemo(() => summarizeFindings(filtered, asOf), [filtered, asOf]);
  // Tiap chart mengabaikan dimensinya sendiri agar kategori terpilih tetap tampil (disorot).
  const byArea = useMemo(() => findingsByArea(filterFindings(kpw.findings, kpw.units, filters, asOf, ["area"])), [kpw, filters, asOf]);
  const byKorwil = useMemo(
    () => findingsByKorwil(filterFindings(kpw.findings, kpw.units, filters, asOf, ["korwil", "unitId"]), kpw.units, korwils).sort((a, b) => b.count - a.count),
    [kpw, filters, asOf, korwils],
  );
  const trend = useMemo(() => findingsTrend(filterFindings(kpw.findings, kpw.units, filters, asOf, ["year"]), years), [kpw, filters, asOf, years]);
  const byExaminer = useMemo(() => findingsByExaminer(filterFindings(kpw.findings, kpw.units, filters, asOf, ["examiner"])), [kpw, filters, asOf]);
  const groups = useMemo(() => groupFindings(filtered), [filtered]);

  const assets = kpw.asset_reconciliations.filter(
    (a) =>
      (filters.year === ALL || a.year === filters.year) &&
      (filters.unitId === ALL || a.unit_id === filters.unitId) &&
      (filters.korwil === ALL || idx.get(a.unit_id)?.korwil === filters.korwil),
  );
  const assetSummary = summarizeAssets(assets);

  const yearLabel = filters.year === ALL ? "semua tahun" : `tahun ${filters.year}`;
  const chips = [
    filters.examiner !== ALL && { label: `Pemeriksa ${filters.examiner}`, onRemove: () => set("examiner", ALL) },
    filters.korwil !== ALL && { label: `Korwil ${filters.korwil}`, onRemove: () => set("korwil", ALL) },
    filters.unitId !== ALL && { label: idx.get(filters.unitId)?.name ?? filters.unitId, onRemove: () => set("unitId", ALL) },
    filters.area !== ALL && { label: `Area ${filters.area}`, onRemove: () => set("area", ALL) },
    filters.status !== ALL && { label: FINDING_STATUS_LABEL[filters.status], onRemove: () => set("status", ALL) },
    filters.timeliness !== ALL && { label: TIMELINESS_LABEL[filters.timeliness], onRemove: () => set("timeliness", ALL) },
    filters.search && { label: `Cari "${filters.search}"`, onRemove: () => set("search", "") },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];
  const advancedCount = chips.filter((c) => !c.label.startsWith("Cari")).length;

  const groupColumns: Column<FindingGroup>[] = [
    { key: "exam", header: "Pemeriksaan", render: (g) => <ExaminerBadge examiner={g.examiner} />, sortValue: (g) => g.examiner },
    { key: "area", header: "Area", render: (g) => <span className="whitespace-nowrap">{g.area}</span>, sortValue: (g) => g.area },
    {
      key: "title",
      header: "Temuan (Ringkasan)",
      className: "min-w-[240px]",
      render: (g) => (
        <span>
          <span className="block">{g.title}</span>
          <span className="text-[12px] text-muted">Tema: {g.theme}</span>
        </span>
      ),
      sortValue: (g) => g.title,
    },
    { key: "rec", header: "Rekomendasi (Ringkasan)", className: "min-w-[240px] text-muted", render: (g) => <span className="line-clamp-2">{clean(g.recommendation)}</span> },
    { key: "count", header: "Jumlah Temuan", headerClassName: "text-center", className: "text-center tabular-nums", render: (g) => g.count, sortValue: (g) => g.count },
    {
      key: "units",
      header: "Jumlah KPwDN",
      headerClassName: "text-center",
      className: "text-center font-bold tabular-nums",
      render: (g) => g.affectedUnits,
      sortValue: (g) => g.affectedUnits,
    },
  ];

  const findingColumns: Column<Finding>[] = [
    {
      key: "title",
      header: "Temuan",
      className: "min-w-[220px]",
      render: (f) => (
        <span>
          <span className="block font-semibold">{f.title}</span>
          <span className="text-[12px] text-muted">{f.id}</span>
        </span>
      ),
      sortValue: (f) => f.title,
    },
    { key: "exam", header: "Pemeriksaan", render: (f) => <ExaminerBadge examiner={f.examiner} />, sortValue: (f) => f.examiner },
    { key: "unit", header: "KPwDN", render: (f) => <span className="whitespace-nowrap">{idx.get(f.unit_id)?.name}</span>, sortValue: (f) => idx.get(f.unit_id)?.name ?? "" },
    { key: "area", header: "Area", render: (f) => f.area, sortValue: (f) => f.area },
    { key: "rec", header: "Rekomendasi", className: "min-w-[200px] text-muted", render: (f) => <span className="line-clamp-2">{clean(f.recommendation)}</span> },
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

  const search = (
    <SearchField id="f-search" label="Cari temuan atau rekomendasi" hideLabel value={filters.search} onChange={(v) => set("search", v)} placeholder="Cari temuan atau rekomendasi..." />
  );

  return (
    <div>
      <PageHeader
        title="Hasil Pemeriksaan KPwDN"
        description="Analisis temuan hasil pemeriksaan BPK, DAI, dan KAA pada KPwDN."
        actions={
          <>
            <Button onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-controls="filter-lanjutan" className="h-10">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filter{advancedCount ? ` (${advancedCount})` : ""}
            </Button>
            <SelectField
              id="f-year"
              label="Tahun Pemeriksaan"
              icon={<CalendarDays />}
              className="w-[190px]"
              value={String(filters.year)}
              onChange={(v) => set("year", v === ALL ? ALL : Number(v))}
              options={[{ value: ALL, label: "Semua Tahun" }, ...[...years].reverse().map((y) => ({ value: String(y), label: String(y) }))]}
            />
          </>
        }
      />

      {showFilters && (
        <Card className="mb-4" aria-labelledby="filter-lanjutan-title">
          <h2 id="filter-lanjutan-title" className="sr-only">
            Filter lanjutan
          </h2>
          <div id="filter-lanjutan" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SelectField id="f-exam" label="Pemeriksa" value={filters.examiner} onChange={(v) => set("examiner", v)} options={[{ value: ALL, label: "Semua pemeriksa" }, ...EXAMINERS.map((e) => ({ value: e, label: e }))]} />
            <SelectField id="f-korwil" label="Korwil" value={filters.korwil} onChange={(v) => set("korwil", v)} options={[{ value: ALL, label: "Semua korwil" }, ...korwils.map((k) => ({ value: k, label: k }))]} />
            <SelectField id="f-unit" label="KPwDN" value={filters.unitId} onChange={(v) => set("unitId", v)} options={[{ value: ALL, label: "Semua KPwDN" }, ...unitOptions.map((u) => ({ value: u.id, label: u.name }))]} />
            <SelectField id="f-area" label="Area" value={filters.area} onChange={(v) => set("area", v)} options={[{ value: ALL, label: "Semua area" }, ...areas.map((a) => ({ value: a, label: a }))]} />
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
          </div>
        </Card>
      )}
      <FilterChips chips={chips} onClearAll={reset} />

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <ChartCard
          title="Jumlah Temuan per Area"
          description={`${formatNumber(summary.total)} temuan · ${summary.uniqueUnits} KPwDN · ${yearLabel}`}
          summary={byArea.map((a) => `${a.key}: ${a.count} temuan di ${a.uniqueUnits} KPw`).join("; ") || "Tidak ada temuan."}
          selectedLabel={filters.area !== ALL ? filters.area : null}
          onReset={() => set("area", ALL)}
          table={<CategoryTable data={byArea} selected={filters.area === ALL ? null : filters.area} onSelect={(k) => toggle("area", k)} keyHeader="Area" />}
        >
          {byArea.length ? (
            <div className="scrollbar-thin relative overflow-x-auto">
              <div className="min-w-[560px]">
                <ColumnChart data={byArea} selected={filters.area === ALL ? null : filters.area} onSelect={(k) => toggle("area", k)} />
              </div>
            </div>
          ) : (
            <EmptyState title="Tidak ada data" />
          )}
        </ChartCard>
        <ChartCard
          title="Sebaran Temuan per Korwil"
          summary={byKorwil.map((k) => `${k.key}: ${k.count} temuan / ${k.uniqueUnits} KPw`).join("; ")}
          selectedLabel={filters.korwil !== ALL ? filters.korwil : null}
          onReset={() => set("korwil", ALL)}
          table={<CategoryTable data={byKorwil} selected={filters.korwil === ALL ? null : filters.korwil} onSelect={(k) => toggle("korwil", k)} keyHeader="Korwil" />}
        >
          <div className="space-y-3">
            <div className="rounded-xl bg-gradient-to-b from-[#f2f8ff] to-white px-1 pt-1">
              <IndonesiaMap
                values={Object.fromEntries(byKorwil.map((k) => [k.key, k.count]))}
                selected={filters.korwil === ALL ? null : filters.korwil}
                onSelect={(k) => toggle("korwil", k)}
              />
            </div>
            <div className="flex justify-end">
              <MapLegend min={Math.min(...byKorwil.map((k) => k.count))} max={Math.max(0, ...byKorwil.map((k) => k.count))} />
            </div>
            <HorizontalBars data={byKorwil} selected={filters.korwil === ALL ? null : filters.korwil} onSelect={(k) => toggle("korwil", k)} />
          </div>
        </ChartCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_0.85fr]">
        <ChartCard
          title="Tren Jumlah Temuan"
          description="Seluruh tahun"
          summary={trend.map((t) => `${t.year}: ${t.total} temuan`).join("; ")}
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
          title="Proporsi Temuan per Pemeriksaan"
                    summary={byExaminer.map((e) => `${e.key}: ${e.count}`).join("; ")}
          selectedLabel={filters.examiner !== ALL ? filters.examiner : null}
          onReset={() => set("examiner", ALL)}
          table={
            <CategoryTable
              data={byExaminer}
              selected={filters.examiner === ALL ? null : filters.examiner}
              onSelect={(k) => toggle("examiner", k as Examiner)}
              keyHeader="Pemeriksa"
              showUnits={false}
            />
          }
        >
          <DonutWithLegend data={byExaminer} colors={EXAMINER_COLOR} selected={filters.examiner === ALL ? null : filters.examiner} onSelect={(k) => toggle("examiner", k as Examiner)} centerLabel="Temuan" />
        </ChartCard>
        <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
          <LinkCard
            glow="#22c3a6"
            icon={<ReconcileIcon size={50} />}
            title="Hasil Rekonsiliasi Aset"
            desc={`${formatPercent(assetSummary.pctReconciled, 1)} item sesuai · ${formatNumber(assetSummary.discrepancy)} selisih`}
            onClick={() => setPanel("aset")}
          />
          <LinkCard
            glow="#ee2d48"
            icon={<VideoGuideIcon size={52} />}
            title="Video Panduan Penyelesaian Temuan Aset"
            desc="Panduan visual langkah demi langkah · 5 langkah"
            onClick={() => setPanel("panduan")}
          />
        </div>
      </div>

      <Card aria-labelledby="tabel-temuan">
        <SectionHeader
          id="tabel-temuan"
          title={tableMode === "ringkasan" ? "Daftar Temuan dan Rekomendasi Utama" : "Daftar Temuan per Record"}
          actions={
            <>
              <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Mode tabel">
                {(["ringkasan", "temuan"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={tableMode === m}
                    onClick={() => setTableMode(m)}
                    className={cx("rounded-md px-3 py-1 text-[13px] font-semibold", tableMode === m ? "bg-brand text-white" : "text-navy-800 hover:bg-sky-50")}
                  >
                    {m === "ringkasan" ? "Ringkasan" : "Per temuan"}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={exportCsv} disabled={!filtered.length}>
                <Download className="h-4 w-4" aria-hidden />
                Unduh CSV
              </Button>
            </>
          }
        />
        {tableMode === "ringkasan" ? (
          <DataTable
            key="ringkasan"
            rows={groups}
            columns={groupColumns}
            rowKey={(g) => g.key}
            caption="Daftar temuan dan rekomendasi utama"
            onRowOpen={setOpenGroup}
            openColumnKey="title"
            initialSort={{ key: "units", dir: "desc" }}
            pageSize={5}
            toolbar={search}
            emptyAction={<Button onClick={reset}>Reset filter</Button>}
          />
        ) : (
          <DataTable
            key="temuan"
            rows={filtered}
            columns={findingColumns}
            rowKey={(f) => f.id}
            caption="Daftar temuan KPw per record"
            onRowOpen={(f) => setOpenId(f.id)}
            initialSort={{ key: "due", dir: "asc" }}
            toolbar={search}
            minWidth={980}
            emptyAction={<Button onClick={reset}>Reset filter</Button>}
          />
        )}
      </Card>

      <GroupDrawer group={openGroup} onClose={() => setOpenGroup(null)} onOpenFinding={setOpenId} unitName={(id) => idx.get(id)?.name ?? id} />
      <AssetDrawer open={panel === "aset"} onClose={() => setPanel(null)} rows={assets} unitName={(id) => idx.get(id)?.name ?? id} />
      <GuideDrawer open={panel === "panduan"} onClose={() => setPanel(null)} />
      <FindingDrawer findingId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function LinkCard({ glow, icon, title, desc, onClick }: { glow: string; icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="panel group relative flex w-full items-center gap-4 overflow-hidden p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <span aria-hidden className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full opacity-15 blur-2xl transition-opacity duration-300 group-hover:opacity-30" style={{ background: glow }} />
      <span
        aria-hidden
        className="relative grid h-[60px] w-[60px] shrink-0 place-items-center rounded-[18px] bg-gradient-to-br from-white to-[#eef4fb] shadow-[inset_0_1px_0_#fff,0_8px_18px_-10px_rgba(20,42,110,0.45)] ring-1 ring-[#e3ecf7] transition-transform duration-300 group-hover:scale-105"
      >
        {icon}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-snug text-navy-900">{title}</span>
        <span className="mt-0.5 block text-[13px] text-muted">{desc}</span>
      </span>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef4fc] text-navy-800 transition-colors duration-200 group-hover:bg-brand group-hover:text-white" aria-hidden>
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

function GroupDrawer({
  group,
  onClose,
  onOpenFinding,
  unitName,
}: {
  group: FindingGroup | null;
  onClose: () => void;
  onOpenFinding: (id: string) => void;
  unitName: (id: string) => string;
}) {
  const { data, asOf } = useReadySekar();
  const rows = group ? data.findings.filter((f) => group.ids.includes(f.id)) : [];
  return (
    <Drawer
      open={!!group}
      onClose={onClose}
      title={group ? `${group.examiner} · ${group.area}` : "Rincian"}
      subtitle={group ? `Tema ${group.theme} — ${group.count} temuan di ${group.affectedUnits} KPwDN` : undefined}
      width="max-w-2xl"
    >
      {group && (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-[#f5f9fe] p-3 text-[14px]">
            <p className="font-semibold text-navy-900">{group.title}</p>
            <p className="mt-1 text-muted">Rekomendasi: {group.recommendation}</p>
            <p className="mt-1 text-muted">{group.open} temuan belum selesai</p>
          </div>
          <ul className="space-y-2">
            {rows.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onOpenFinding(f.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-left hover:border-sky-300 hover:bg-sky-50/60"
                >
                  <span>
                    <span className="font-semibold text-navy-900">{unitName(f.unit_id)}</span>
                    <span className="block text-[12px] text-muted">
                      {f.id} · {f.year} · tenggat {formatDate(f.due_date)} · {f.pic}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    <FindingStatusBadge status={f.status} />
                    <TimelinessBadge value={findingTimeliness(f, asOf)} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Drawer>
  );
}

function AssetDrawer({ open, onClose, rows, unitName }: { open: boolean; onClose: () => void; rows: AssetReconciliation[]; unitName: (id: string) => string }) {
  const s = summarizeAssets(rows);
  const columns: Column<AssetReconciliation>[] = [
    { key: "unit", header: "KPwDN", render: (a) => <span className="font-semibold">{unitName(a.unit_id)}</span>, sortValue: (a) => unitName(a.unit_id) },
    { key: "total", header: "Total item", className: "text-right tabular-nums", render: (a) => formatNumber(a.total_items), sortValue: (a) => a.total_items },
    { key: "rec", header: "Sesuai", className: "text-right tabular-nums", render: (a) => formatNumber(a.reconciled_items), sortValue: (a) => a.reconciled_items },
    { key: "disc", header: "Selisih", className: "text-right tabular-nums", render: (a) => formatNumber(a.discrepancy_items), sortValue: (a) => a.discrepancy_items },
    { key: "rate", header: "% sesuai", className: "text-right tabular-nums", render: (a) => formatPercent(reconciliationRate(a), 1), sortValue: (a) => reconciliationRate(a) },
  ];
  return (
    <Drawer open={open} onClose={onClose} title="Hasil Rekonsiliasi Aset" subtitle="Rekap per KPwDN sesuai filter aktif" width="max-w-2xl">
      <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["KPwDN", formatNumber(s.units)],
          ["Total item", formatNumber(s.totalItems)],
          ["Selisih", formatNumber(s.discrepancy)],
          ["% sesuai", formatPercent(s.pctReconciled, 1)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-[#eef5fd] px-3 py-2">
            <dt className="text-[12px] font-semibold text-muted">{k}</dt>
            <dd className="text-lg font-bold text-navy-900 tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        caption="Rekonsiliasi aset per KPwDN"
        initialSort={{ key: "disc", dir: "desc" }}
        dense
        minWidth={520}
        emptyTitle="Tidak ada data rekonsiliasi"
        emptyDescription="Data rekonsiliasi tersedia untuk tahun 2026."
      />
    </Drawer>
  );
}

export const ASET_GUIDE_STEPS = [
  "Identifikasi temuan aset yang masih terbuka (filter Area = Aset).",
  "Lakukan inventarisasi fisik dan cocokkan dengan aplikasi aset.",
  "Catat selisih beserta penyebabnya pada worksheet area Aset.",
  "Susun rencana tindak lanjut, tetapkan PIC dan target penyelesaian.",
  "Lampirkan bukti penyelesaian, lalu ubah status temuan menjadi Selesai.",
];

function GuideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, openDocument } = useReadySekar();
  const refs = data.references.filter((r) => r.area === "Aset");
  return (
    <Drawer open={open} onClose={onClose} title="Video Panduan Penyelesaian Temuan Aset" subtitle="Panduan visual (simulasi), bukan rekaman video" width="max-w-2xl">
      <VideoGuidePlayer title="Penyelesaian Temuan Aset" steps={ASET_GUIDE_STEPS} />
      <details className="mt-4 rounded-xl border border-line bg-[#f7fbff] px-4 py-3">
        <summary className="cursor-pointer text-[14px] font-semibold text-navy-900">Lihat semua langkah</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] text-navy-900">
          {ASET_GUIDE_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </details>
      <h3 className="mt-6 flex items-center gap-2 font-bold text-navy-900">
        <BookOpen className="h-4 w-4 text-brand" aria-hidden />
        Materi pembelajaran area Aset
      </h3>
      <ul className="mt-2 space-y-2">
        {refs.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
            <span className="min-w-0 truncate font-semibold text-navy-900">{clean(r.title)}</span>
            <Button size="sm" onClick={() => openDocument(r.document_id)}>
              {r.id.endsWith("-pedoman") ? "Pedoman" : REFERENCE_KIND_LABEL[r.kind]}
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <SimulationNote>Materi contoh, bukan ketentuan resmi.</SimulationNote>
      </div>
    </Drawer>
  );
}

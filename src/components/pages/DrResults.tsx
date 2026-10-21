"use client";

/**
 * Hasil pemeriksaan satker Departemen Regional sendiri (bukan agregasi KPw).
 * Hanya dirender untuk DR/admin dari halaman Hasil Pemeriksaan.
 */
import { useMemo, useState, type ReactNode } from "react";
import { AlertCircle, AlertTriangle, CalendarDays, CheckCircle2, Clock, FileSearch } from "lucide-react";
import { CategoryTable, ChartCard, ColumnChart, DonutWithLegend, HorizontalBars, TrendChart } from "@/components/charts/Charts";
import { AssetReconDrawer, AssetVideoDrawer } from "@/components/domain/AssetPanels";
import { FindingDrawer } from "@/components/domain/FindingDrawer";
import { AuditDocIcon, ReconcileIcon, VideoGuideIcon } from "@/components/icons/Illustrations";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Card, EmptyState, KpiCard, PageHeader, SearchField, SectionHeader, SelectField } from "@/components/ui/primitives";
import { FindingStatusBadge, TimelinessBadge } from "@/components/ui/StatusBadges";
import { summarizeAssets } from "@/lib/analytics/assets";
import { ALL, matchesSearch, uniqueSorted } from "@/lib/analytics/common";
import { findingsByArea, findingsByExaminer, findingsByPic, findingsTrend, findingTimeliness, summarizeFindings } from "@/lib/analytics/findings";
import { formatDate } from "@/lib/dates";
import { clean, formatNumber, formatPercent, percent } from "@/lib/format";
import { EXAMINER_COLOR } from "@/lib/palette";
import { onlyDr } from "@/lib/scope";
import { DR_UNIT_ID, EXAMINERS, type Examiner, type Finding } from "@/lib/types";
import { ExaminerBadge, LinkCard } from "./HasilPemeriksaanView";

export function DrResults({ toggle }: { toggle: ReactNode }) {
  const { data, asOf } = useReadySekar();
  const all = useMemo(() => onlyDr(data.findings), [data.findings]);
  const years = useMemo(() => uniqueSorted(all.map((f) => f.year)), [all]);
  const [year, setYear] = useState<number | typeof ALL>(ALL);
  const [examiner, setExaminer] = useState<Examiner | typeof ALL>(ALL);
  const [area, setArea] = useState<string | typeof ALL>(ALL);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"aset" | "panduan" | null>(null);

  const inYear = all.filter((f) => year === ALL || f.year === year);
  const rows = inYear.filter((f) => (examiner === ALL || f.examiner === examiner) && (area === ALL || f.area === area));
  const shown = rows.filter((f) => matchesSearch(q, f.id, f.title, f.recommendation, f.area, f.pic));
  const summary = summarizeFindings(rows, asOf);
  const byArea = findingsByArea(inYear.filter((f) => examiner === ALL || f.examiner === examiner));
  const byExaminer = findingsByExaminer(inYear.filter((f) => area === ALL || f.area === area));
  const byPic = findingsByPic(rows);
  const trend = findingsTrend(all.filter((f) => (examiner === ALL || f.examiner === examiner) && (area === ALL || f.area === area)), years);

  const recs = onlyDr(data.asset_reconciliations).filter((r) => year === ALL || r.year === year);
  const recIds = new Set(recs.map((r) => r.id));
  const items = onlyDr(data.asset_items).filter((i) => recIds.has(i.reconciliation_id));
  const assetSummary = summarizeAssets(recs);
  const unitName = (id: string) => data.units.find((u) => u.id === id)?.name ?? id;
  const toggleSel = <T,>(cur: T | typeof ALL, v: T, set: (x: T | typeof ALL) => void) => set(cur === v ? ALL : v);

  const cols: Column<Finding>[] = [
    {
      key: "title",
      header: "Temuan",
      className: "min-w-[220px]",
      render: (f) => (
        <span>
          <span className="block font-semibold">{clean(f.title)}</span>
          <span className="text-[12px] text-muted">
            {f.id} · {f.area}
          </span>
        </span>
      ),
      sortValue: (f) => f.title,
    },
    {
      key: "exam",
      header: "Pemeriksaan",
      render: (f) => (
        <span className="flex flex-col items-start gap-0.5">
          <ExaminerBadge examiner={f.examiner} />
          <span className="text-[11px] text-muted">{f.year}</span>
        </span>
      ),
      sortValue: (f) => `${f.year}${f.examiner}`,
    },
    { key: "rec", header: "Rekomendasi", className: "min-w-[200px] text-muted", render: (f) => <span className="line-clamp-2">{clean(f.recommendation)}</span> },
    { key: "pic", header: "PIC Kelompok", render: (f) => <span className="whitespace-nowrap">{f.pic}</span>, sortValue: (f) => f.pic },
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
  ];

  return (
    <div>
      <PageHeader
        icon={<AuditDocIcon size={46} />}
        title="Hasil Pemeriksaan Departemen Regional"
        description="Temuan dan tindak lanjut hasil pemeriksaan BPK, DAI, dan KAA atas satker DR sendiri."
        actions={
          <>
            {toggle}
            <SelectField
              id="drr-year"
              label="Tahun Pemeriksaan"
              icon={<CalendarDays />}
              className="w-[190px]"
              value={String(year)}
              onChange={(v) => setYear(v === ALL ? ALL : Number(v))}
              options={[{ value: ALL, label: "Semua Tahun" }, ...[...years].reverse().map((y) => ({ value: String(y), label: String(y) }))]}
            />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard tinted label="Total Temuan DR" value={summary.total} icon={<FileSearch />} tone="blue" />
        <KpiCard tinted tone="teal" label="Selesai" value={summary.byStatus.selesai} hint={formatPercent(summary.pctSelesai)} icon={<CheckCircle2 />} />
        <KpiCard tinted tone="amber" label="Dalam Proses" value={summary.byStatus.dalam_proses} hint={formatPercent(percent(summary.byStatus.dalam_proses, summary.total))} icon={<Clock />} />
        <KpiCard tinted tone="rose" label="Belum Ditindaklanjuti" value={summary.byStatus.belum_ditindaklanjuti} icon={<AlertCircle />} />
        <KpiCard tinted tone="violet" label="Lewat Tenggat" value={summary.overdue} icon={<AlertTriangle />} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <ChartCard
          title="Temuan DR per Area"
          description={`${formatNumber(summary.total)} temuan · ${year === ALL ? "semua tahun" : `tahun ${year}`}`}
          summary={byArea.map((a) => `${a.key}: ${a.count}`).join("; ") || "Tidak ada temuan."}
          selectedLabel={area !== ALL ? area : null}
          onReset={() => setArea(ALL)}
          table={<CategoryTable data={byArea} selected={area === ALL ? null : area} onSelect={(k) => toggleSel(area, k, setArea)} keyHeader="Area" showUnits={false} />}
        >
          {byArea.length ? (
            <div className="scrollbar-thin overflow-x-auto">
              <div className="min-w-[560px]">
                <ColumnChart data={byArea} selected={area === ALL ? null : area} onSelect={(k) => toggleSel(area, k, setArea)} unitLabel="satker" />
              </div>
            </div>
          ) : (
            <EmptyState title="Tidak ada data" />
          )}
        </ChartCard>
        <ChartCard
          title="Proporsi per Pemeriksa"
          summary={byExaminer.map((e) => `${e.key}: ${e.count}`).join("; ")}
          selectedLabel={examiner !== ALL ? examiner : null}
          onReset={() => setExaminer(ALL)}
          table={<CategoryTable data={byExaminer} selected={examiner === ALL ? null : examiner} onSelect={(k) => toggleSel(examiner, k as Examiner, setExaminer)} keyHeader="Pemeriksa" showUnits={false} />}
        >
          <DonutWithLegend data={byExaminer} colors={EXAMINER_COLOR} selected={examiner === ALL ? null : examiner} onSelect={(k) => toggleSel(examiner, k as Examiner, setExaminer)} centerLabel="Temuan" />
        </ChartCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_0.85fr]">
        <ChartCard
          title="Tren Temuan DR"
          description="Seluruh tahun"
          summary={trend.map((t) => `${t.year}: ${t.total}`).join("; ")}
          table={<CategoryTable data={trend.map((t) => ({ key: String(t.year), count: t.total }))} selected={year === ALL ? null : String(year)} onSelect={(k) => toggleSel(year, Number(k), setYear)} keyHeader="Tahun" showUnits={false} />}
        >
          <TrendChart data={trend} selected={year === ALL ? null : year} onSelect={(y) => toggleSel(year, y, setYear)} />
        </ChartCard>
        <ChartCard
          title="Temuan per PIC Kelompok"
          summary={byPic.map((p) => `${p.key}: ${p.count}`).join("; ")}
          table={<CategoryTable data={byPic} selected={null} keyHeader="Kelompok" showUnits={false} />}
        >
          <HorizontalBars data={byPic} selected={null} unitLabel="kelompok" />
        </ChartCard>
        <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
          <LinkCard
            icon={<ReconcileIcon size={50} />}
            title="Rekonsiliasi Aset DR"
            desc={`${formatPercent(assetSummary.pctReconciled, 1)} item sesuai · ${formatNumber(assetSummary.discrepancy)} aset tidak sesuai`}
            onClick={() => setPanel("aset")}
          />
          <LinkCard icon={<VideoGuideIcon size={52} />} title="Video Panduan Pencatatan Aset" desc="Split, penghapusan, penatausahaan, mutasi, dan topik lain" onClick={() => setPanel("panduan")} />
        </div>
      </div>

      <Card aria-labelledby="dr-hasil-tabel">
        <SectionHeader
          id="dr-hasil-tabel"
          title="Daftar Temuan Satker DR"
          description="Klik baris untuk melihat detail, bukti, dan memperbarui status."
          actions={
            <SelectField
              id="drr-exam"
              label="Pemeriksa"
              hideLabel
              className="w-[160px]"
              value={examiner}
              onChange={setExaminer}
              options={[{ value: ALL, label: "Semua pemeriksa" }, ...EXAMINERS.map((e) => ({ value: e, label: e }))]}
            />
          }
        />
        <DataTable
          rows={shown}
          columns={cols}
          rowKey={(f) => f.id}
          caption="Temuan satker Departemen Regional"
          onRowOpen={(f) => setOpenId(f.id)}
          openColumnKey="title"
          initialSort={{ key: "due", dir: "desc" }}
          minWidth={900}
          toolbar={<SearchField id="drr-q" label="Cari temuan DR" hideLabel value={q} onChange={setQ} placeholder="Cari temuan, rekomendasi, atau PIC..." />}
        />
      </Card>

      <AssetReconDrawer open={panel === "aset"} onClose={() => setPanel(null)} recs={recs} items={items} unitName={unitName} title={`Rekonsiliasi Aset ${unitName(DR_UNIT_ID)}`} />
      <AssetVideoDrawer open={panel === "panduan"} onClose={() => setPanel(null)} />
      <FindingDrawer findingId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

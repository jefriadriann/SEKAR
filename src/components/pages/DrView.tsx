"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, FileText, FolderOpen, Loader, Scale, ShieldAlert, Users, XCircle } from "lucide-react";
import { FindingDrawer } from "@/components/domain/FindingDrawer";
import { RequestDrawer } from "@/components/domain/RequestDrawer";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge, Button, Card, cx, EmptyState, KpiCard, PageHeader, SectionHeader } from "@/components/ui/primitives";
import { ComplianceStatusBadge, FindingStatusBadge, RequestStatusBadge, RequestTimelinessBadge, ScheduleStatusBadge, TimelinessBadge } from "@/components/ui/StatusBadges";
import { ALL, uniqueSorted } from "@/lib/analytics/common";
import { findingsByKorwil, findingTimeliness, summarizeFindings } from "@/lib/analytics/findings";
import { requestTimeliness, summarizeRequests } from "@/lib/analytics/permindok";
import { scheduleStatus } from "@/lib/analytics/schedules";
import { formatDate } from "@/lib/dates";
import { COMPLIANCE_STATUS_LABEL, formatNumber, formatPercent } from "@/lib/format";
import { kpwModuleData, onlyDr } from "@/lib/scope";
import { COMPLIANCE_STATUSES, DR_UNIT_ID, EXAMINERS, type ComplianceItem, type ComplianceStatus, type DocumentRequest, type Examiner, type Finding } from "@/lib/types";

export function DrView() {
  const { data, asOf, openDocument, updateCompliance } = useReadySekar();
  const [examiner, setExaminer] = useState<Examiner | typeof ALL>(ALL);
  const [openFinding, setOpenFinding] = useState<string | null>(null);
  const [openRequest, setOpenRequest] = useState<string | null>(null);

  const drFindings = useMemo(() => onlyDr(data.findings), [data.findings]);
  const drRequests = useMemo(() => onlyDr(data.document_requests), [data.document_requests]);
  const drSchedules = useMemo(() => onlyDr(data.audit_schedules).sort((a, b) => a.start_date.localeCompare(b.start_date)), [data.audit_schedules]);
  const drCompliance = useMemo(() => onlyDr(data.compliance), [data.compliance]);
  const drDocs = data.documents.filter((d) => d.scope === DR_UNIT_ID);
  const summary = summarizeFindings(drFindings, asOf);
  const reqSummary = summarizeRequests(drRequests, asOf);
  const shownFindings = drFindings.filter((f) => examiner === ALL || f.examiner === examiner);

  const kpw = useMemo(() => kpwModuleData(data), [data]);
  const kpwSummary = summarizeFindings(kpw.findings, asOf);
  const korwil = findingsByKorwil(kpw.findings, kpw.units, uniqueSorted(kpw.units.map((u) => u.korwil ?? "")).filter(Boolean));

  const groups = uniqueSorted(drFindings.map((f) => f.pic));

  const fCols: Column<Finding>[] = [
    { key: "id", header: "ID", render: (f) => <span className="whitespace-nowrap font-mono text-xs">{f.id}</span>, sortValue: (f) => f.id },
    { key: "exam", header: "Pemeriksa", render: (f) => f.examiner, sortValue: (f) => f.examiner },
    { key: "area", header: "Area", render: (f) => f.area, sortValue: (f) => f.area },
    { key: "title", header: "Temuan & rekomendasi", className: "min-w-[240px]", render: (f) => (
        <span>
          <span className="font-semibold">{f.title}</span>
          <span className="block text-xs text-muted">{f.recommendation}</span>
        </span>
      ), sortValue: (f) => f.title },
    { key: "pic", header: "Kelompok", render: (f) => <span className="whitespace-nowrap">{f.pic}</span>, sortValue: (f) => f.pic },
    { key: "status", header: "Status", render: (f) => <FindingStatusBadge status={f.status} />, sortValue: (f) => f.status },
    { key: "due", header: "Tenggat", render: (f) => (
        <span className="whitespace-nowrap">
          {formatDate(f.due_date)}
          <span className="mt-1 block"><TimelinessBadge value={findingTimeliness(f, asOf)} /></span>
        </span>
      ), sortValue: (f) => f.due_date },
  ];

  const cCols: Column<ComplianceItem>[] = [
    { key: "id", header: "ID", render: (c) => <span className="whitespace-nowrap font-mono text-xs">{c.id}</span>, sortValue: (c) => c.id },
    { key: "aspect", header: "Aspek kepatuhan", className: "min-w-[200px]", render: (c) => c.aspect, sortValue: (c) => c.aspect },
    { key: "pic", header: "PIC", render: (c) => c.pic, sortValue: (c) => c.pic },
    { key: "due", header: "Tenggat", render: (c) => (
        <span className="whitespace-nowrap">
          {formatDate(c.due_date)}
          {c.status !== "selesai" && c.due_date < asOf && <span className="mt-1 block"><Badge tone="rose">Lewat tenggat</Badge></span>}
        </span>
      ), sortValue: (c) => c.due_date },
    { key: "status", header: "Status", render: (c) => <ComplianceStatusBadge status={c.status} />, sortValue: (c) => c.status },
    { key: "edit", header: "Ubah status", render: (c) => (
        <label className="flex items-center gap-1">
          <span className="sr-only">Ubah status {c.id}</span>
          <select
            value={c.status}
            onChange={(e) => updateCompliance(c.id, e.target.value as ComplianceStatus)}
            onClick={(e) => e.stopPropagation()}
            className="h-8 rounded-md border border-line bg-white px-1.5 text-sm"
          >
            {COMPLIANCE_STATUSES.map((s) => <option key={s} value={s}>{COMPLIANCE_STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      ) },
  ];

  const rCols: Column<DocumentRequest>[] = [
    { key: "id", header: "ID", render: (r) => <span className="whitespace-nowrap font-mono text-xs">{r.id}</span>, sortValue: (r) => r.id },
    { key: "cat", header: "Kategori", render: (r) => r.category, sortValue: (r) => r.category },
    { key: "req", header: "Permintaan", render: (r) => formatDate(r.requested_at), sortValue: (r) => r.requested_at },
    { key: "due", header: "Tenggat", render: (r) => formatDate(r.due_date), sortValue: (r) => r.due_date },
    { key: "sub", header: "Penyampaian", render: (r) => formatDate(r.submitted_at, "Belum"), sortValue: (r) => r.submitted_at },
    { key: "status", header: "Kelengkapan", render: (r) => <RequestStatusBadge status={r.status} />, sortValue: (r) => r.status },
    { key: "time", header: "Ketepatan waktu", render: (r) => <RequestTimelinessBadge value={requestTimeliness(r, asOf)} /> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Khusus Departemen Regional"
        title="Dashboard Departemen Regional"
        description="Temuan, kepatuhan dan permintaan dokumen unit DR. Data DR dipisahkan dan tidak pernah muncul pada modul KPw."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Temuan DR" value={formatNumber(summary.total)} hint={`${formatPercent(summary.pctSelesai)} selesai`} icon={<ClipboardList className="h-5 w-5" />} />
        <KpiCard label="Selesai" value={formatNumber(summary.byStatus.selesai)} tone="teal" icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard label="Dalam proses" value={formatNumber(summary.byStatus.dalam_proses)} tone="amber" icon={<Loader className="h-5 w-5" />} />
        <KpiCard label="Belum ditindaklanjuti" value={formatNumber(summary.byStatus.belum_ditindaklanjuti)} tone="rose" icon={<XCircle className="h-5 w-5" />} />
        <KpiCard label="Lewat tenggat" value={formatNumber(summary.overdue)} hint={`per ${formatDate(asOf)}`} tone="violet" icon={<ShieldAlert className="h-5 w-5" />} />
      </div>

      <Card className="mb-5" aria-labelledby="dr-temuan">
        <SectionHeader
          id="dr-temuan"
          title="Pemeriksaan & temuan DR"
          description="Saring berdasarkan pemeriksa. Klik baris untuk detail dan pembaruan status."
          actions={
            <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Filter pemeriksa">
              {[ALL, ...EXAMINERS].map((e) => {
                const count = e === ALL ? drFindings.length : drFindings.filter((f) => f.examiner === e).length;
                return (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={examiner === e}
                    onClick={() => setExaminer(e as Examiner | typeof ALL)}
                    className={cx("rounded-md px-3 py-1.5 text-sm font-semibold", examiner === e ? "bg-navy-800 text-white" : "text-navy-700 hover:bg-sky-50")}
                  >
                    {e === ALL ? "Semua" : e} ({count})
                  </button>
                );
              })}
            </div>
          }
        />
        <DataTable rows={shownFindings} columns={fCols} rowKey={(f) => f.id} caption="Temuan unit DR" onRowOpen={(f) => setOpenFinding(f.id)} initialSort={{ key: "due", dir: "asc" }} />
      </Card>

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <Card aria-labelledby="dr-kepatuhan">
          <SectionHeader id="dr-kepatuhan" icon={<Scale className="h-5 w-5 text-teal-700" aria-hidden />} title="Data kepatuhan DR" description={`${drCompliance.filter((c) => c.status === "selesai").length} dari ${drCompliance.length} kewajiban selesai. Status dapat diubah (demo).`} />
          <DataTable rows={drCompliance} columns={cCols} rowKey={(c) => c.id} caption="Kewajiban kepatuhan DR" initialSort={{ key: "due", dir: "asc" }} dense />
        </Card>
        <Card aria-labelledby="dr-permindok">
          <SectionHeader id="dr-permindok" icon={<FolderOpen className="h-5 w-5 text-navy-700" aria-hidden />} title="Permindok DR" description={`${reqSummary.byStatus.lengkap} lengkap · ${reqSummary.byTimeliness.lewat_tenggat} lewat tenggat dari ${reqSummary.total} permintaan.`} />
          <DataTable rows={drRequests} columns={rCols} rowKey={(r) => r.id} caption="Permintaan dokumen DR" onRowOpen={(r) => setOpenRequest(r.id)} openLabel="Edit" initialSort={{ key: "due", dir: "asc" }} dense />
        </Card>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card aria-labelledby="dr-jadwal">
          <SectionHeader id="dr-jadwal" icon={<CalendarDays className="h-5 w-5 text-violet-700" aria-hidden />} title="Jadwal pemeriksaan DR" />
          {drSchedules.length ? (
            <ul className="space-y-2">
              {drSchedules.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                  <span>
                    <span className="font-semibold">{s.id}</span> · {s.examiner} {s.exam_type}
                    <span className="block text-xs text-muted">{formatDate(s.start_date)} – {formatDate(s.end_date)}</span>
                  </span>
                  <ScheduleStatusBadge status={scheduleStatus(s, asOf)} />
                </li>
              ))}
            </ul>
          ) : <EmptyState title="Tidak ada jadwal DR" />}
        </Card>
        <Card aria-labelledby="dr-dok">
          <SectionHeader id="dr-dok" icon={<FileText className="h-5 w-5 text-sky-700" aria-hidden />} title="Dokumen penting" description="Dokumen dengan cakupan unit DR (khusus DR/admin)." />
          {drDocs.length ? (
            <ul className="space-y-2">
              {drDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                  <span className="font-semibold">{d.title}</span>
                  <Button size="sm" onClick={() => openDocument(d.id)}>Buka</Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Belum ada dokumen DR" description="Dataset simulasi ini belum memuat dokumen dengan cakupan DR. Dokumen yang ditambahkan lewat import akan tampil di sini." />
          )}
        </Card>
        <Card aria-labelledby="dr-ketentuan">
          <SectionHeader id="dr-ketentuan" icon={<Users className="h-5 w-5 text-amber-700" aria-hidden />} title="Ketentuan per kelompok" description="Materi ketentuan simulasi sesuai area temuan tiap kelompok." />
          <div className="space-y-3">
            {groups.map((g) => {
              const areas = uniqueSorted(drFindings.filter((f) => f.pic === g).map((f) => f.area));
              const refs = data.references.filter((r) => r.kind === "ketentuan" && areas.includes(r.area));
              return (
                <div key={g}>
                  <p className="text-sm font-bold text-navy-900">{g}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {refs.map((r) => (
                      <button key={r.id} type="button" onClick={() => openDocument(r.document_id)} className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-100">
                        {r.area}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card aria-labelledby="dr-overview">
        <SectionHeader
          id="dr-overview"
          title="Overview seluruh KPw"
          description="Ringkasan modul KPw (tanpa temuan DR). Buka modul untuk analisis lengkap."
          actions={
            <Link href="/hasil-pemeriksaan" className="inline-flex items-center gap-1 rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-700">
              Buka Hasil Pemeriksaan <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Temuan KPw" value={formatNumber(kpwSummary.total)} hint="Semua tahun" />
          <KpiCard label="KPw terdampak" value={formatNumber(kpwSummary.uniqueUnits)} tone="navy" hint={`dari ${kpw.units.length} KPw`} />
          <KpiCard label="Lewat tenggat" value={formatNumber(kpwSummary.overdue)} tone="rose" hint={`per ${formatDate(asOf)}`} />
        </div>
        <div className="relative mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <caption className="sr-only">Temuan KPw per korwil</caption>
            <thead className="text-left text-muted">
              <tr>
                <th scope="col" className="py-1.5 pr-2">Korwil</th>
                <th scope="col" className="py-1.5 pr-2 text-right">Temuan</th>
                <th scope="col" className="py-1.5 text-right">KPw unik</th>
              </tr>
            </thead>
            <tbody>
              {korwil.map((k) => (
                <tr key={k.key} className="border-t border-slate-100">
                  <td className="py-1.5 pr-2 font-semibold">{k.key}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{k.count}</td>
                  <td className="py-1.5 text-right tabular-nums">{k.uniqueUnits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <FindingDrawer findingId={openFinding} onClose={() => setOpenFinding(null)} />
      <RequestDrawer requestId={openRequest} onClose={() => setOpenRequest(null)} />
    </div>
  );
}

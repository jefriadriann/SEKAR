"use client";

import { useMemo, useState } from "react";
import { AlertCircle, BookOpen, CalendarDays, CheckCircle2, Clock, Download, FileSearch, FileText, FolderOpen, ListChecks, Save } from "lucide-react";
import { FindingDrawer } from "@/components/domain/FindingDrawer";
import { RequestDrawer } from "@/components/domain/RequestDrawer";
import { FileTypeIcon, AuditDocIcon } from "@/components/icons/Illustrations";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, Button, Card, DescriptionList, KpiCard, PageHeader, SearchField, SectionHeader, SelectField } from "@/components/ui/primitives";
import { ComplianceStatusBadge, FindingStatusBadge, RequestStatusBadge } from "@/components/ui/StatusBadges";
import { ALL, matchesSearch, uniqueSorted } from "@/lib/analytics/common";
import { findingTimeliness, summarizeFindings } from "@/lib/analytics/findings";
import { requestTimeliness } from "@/lib/analytics/permindok";
import { scheduleStatus } from "@/lib/analytics/schedules";
import { formatDate } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import { clean, COMPLIANCE_STATUS_LABEL, FINDING_STATUS_LABEL, formatPercent, percent } from "@/lib/format";
import { onlyDr } from "@/lib/scope";
import { COMPLIANCE_STATUSES, DR_UNIT_ID, EXAMINERS, type AuditSchedule, type ComplianceItem, type ComplianceStatus, type DocumentRequest, type Examiner, type Finding } from "@/lib/types";
import { ExaminerBadge } from "./HasilPemeriksaanView";
import { scheduleShortLabel } from "./PermindokView";

interface ImportantDoc {
  id: string;
  name: string;
  date: string;
  available: boolean;
  /** dokumen dataset (scope dr) atau ringkasan yang dibangkitkan dari jadwal DR */
  docId?: string;
  schedule?: AuditSchedule;
}

interface GroupRef {
  id: string;
  name: string;
  group: string;
  documentId: string;
}

export function DrView() {
  const { data, asOf, openDocument, downloadDocument, notify } = useReadySekar();
  const drFindingsAll = useMemo(() => onlyDr(data.findings), [data.findings]);
  const years = uniqueSorted(drFindingsAll.map((f) => f.year));
  const [period, setPeriod] = useState<string>(years.includes(Number(asOf.slice(0, 4))) ? asOf.slice(0, 4) : ALL);
  const [examiner, setExaminer] = useState<Examiner | typeof ALL>(ALL);
  const [qFinding, setQFinding] = useState("");
  const [qCompliance, setQCompliance] = useState("");
  const [qRequest, setQRequest] = useState("");
  const [qDoc, setQDoc] = useState("");
  const [qRef, setQRef] = useState("");
  const [openFinding, setOpenFinding] = useState<string | null>(null);
  const [openRequest, setOpenRequest] = useState<string | null>(null);
  const [openCompliance, setOpenCompliance] = useState<string | null>(null);

  const inPeriod = (d: string) => period === ALL || d.startsWith(period);
  const drFindings = drFindingsAll.filter((f) => period === ALL || f.year === Number(period));
  const summary = summarizeFindings(drFindings, asOf);
  const shownFindings = drFindings.filter((f) => (examiner === ALL || f.examiner === examiner) && matchesSearch(qFinding, f.id, f.title, f.recommendation, f.area, f.pic));
  const compliance = onlyDr(data.compliance).filter((c) => inPeriod(c.due_date) && matchesSearch(qCompliance, c.id, c.aspect, c.pic));
  const schedIdx = new Map(data.audit_schedules.map((s) => [s.id, s]));
  const requests = onlyDr(data.document_requests).filter((r) => inPeriod(r.requested_at) && matchesSearch(qRequest, r.id, r.title, r.category, r.dr_note));
  const drSchedules = onlyDr(data.audit_schedules).filter((s) => period === ALL || s.year === Number(period));

  const importantDocs: ImportantDoc[] = [
    ...data.documents.filter((d) => d.scope === DR_UNIT_ID).map((d) => ({ id: d.id, name: d.title, date: asOf, available: true, docId: d.id })),
    ...drSchedules.map((s) => ({
      id: `LHP-${s.id}`,
      name: `Ringkasan Pemeriksaan ${s.examiner} ${s.exam_type} ${s.year}`,
      date: s.end_date,
      available: scheduleStatus(s, asOf) === "selesai",
      schedule: s,
    })),
  ].filter((d) => matchesSearch(qDoc, d.name, d.id));

  const groupRefs: GroupRef[] = uniqueSorted(drFindingsAll.map((f) => f.pic)).flatMap((g) => {
    const areas = uniqueSorted(drFindingsAll.filter((f) => f.pic === g).map((f) => f.area));
    return data.references
      .filter((r) => r.kind === "ketentuan" && areas.includes(r.area))
      .map((r) => ({ id: `${g}-${r.id}`, name: r.title, group: g, documentId: r.document_id }));
  }).filter((r) => matchesSearch(qRef, r.name, r.group));

  const downloadSummary = (doc: ImportantDoc) => {
    if (doc.docId) return downloadDocument(doc.docId);
    const s = doc.schedule!;
    const rel = drFindingsAll.filter((f) => f.examiner === s.examiner && f.year === s.year);
    downloadText(
      `${doc.id}-SIMULASI.txt`,
      [
        "RINGKASAN PEMERIKSAAN — DOKUMEN SIMULASI",
        "Dibangkitkan otomatis dari data jadwal dan temuan DR (data dummy).",
        "",
        `Jadwal      : ${s.id} · ${s.examiner} ${s.exam_type} ${s.year}`,
        `Periode     : ${formatDate(s.start_date)} – ${formatDate(s.end_date)}`,
        `Temuan      : ${rel.length} (selesai ${rel.filter((f) => f.status === "selesai").length})`,
        "",
        ...rel.map((f) => `- ${f.id} ${f.title} [${FINDING_STATUS_LABEL[f.status]}]`),
      ].join("\n"),
    );
    notify(`Berkas ${doc.id}-SIMULASI.txt diunduh.`);
  };

  const fCols: Column<Finding>[] = [
    { key: "exam", header: "Pemeriksaan", render: (f) => (<span className="flex flex-col items-start gap-0.5"><ExaminerBadge examiner={f.examiner} /><span className="text-[11px] text-muted">{f.year}</span></span>), sortValue: (f) => f.examiner },
    {
      key: "title",
      header: "Temuan Utama",
      className: "min-w-[130px]",
      render: (f) => (
        <span>
          <span className="block">{clean(f.title)}</span>
          <span className="text-[12px] text-muted">{f.area}</span>
        </span>
      ),
      sortValue: (f) => f.title,
    },
    { key: "rec", header: "Rekomendasi", className: "min-w-[120px] text-muted", render: (f) => <span className="line-clamp-2">{clean(f.recommendation)}</span> },
    { key: "pic", header: "PIC Kelompok", render: (f) => f.pic.replace("Kelompok Simulasi", "Kel. Sim."), sortValue: (f) => f.pic },
    { key: "due", header: "Target", render: (f) => <span className="whitespace-nowrap">{formatDate(f.due_date)}</span>, sortValue: (f) => f.due_date },
    {
      key: "status",
      header: "Status",
      render: (f) => (
        <span className="flex flex-col items-start gap-1">
          <FindingStatusBadge status={f.status} />
          {findingTimeliness(f, asOf) === "lewat_tenggat" && <Badge tone="rose">Lewat tenggat</Badge>}
        </span>
      ),
      sortValue: (f) => f.status,
    },
    {
      key: "bukti",
      header: "Bukti",
      render: (f) =>
        f.evidence_document_id ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDocument(f.evidence_document_id!);
            }}
            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Bukti
          </button>
        ) : (
          <span className="text-muted">-</span>
        ),
    },
  ];

  const cCols: Column<ComplianceItem>[] = [
    {
      key: "aspect",
      header: "Aspek Kepatuhan / PIC Kelompok",
      className: "min-w-[150px]",
      render: (c) => (
        <span>
          <span className="block">{clean(c.aspect)}</span>
          <span className="text-[11.5px] text-muted">{c.pic}</span>
        </span>
      ),
      sortValue: (c) => c.aspect,
    },
    {
      key: "due",
      header: "Target Waktu",
      render: (c) => (
        <span className="whitespace-nowrap">
          {formatDate(c.due_date)}
          {c.status !== "selesai" && c.due_date < asOf && <span className="block text-[11px] font-semibold text-[#c62f35]">Lewat tenggat</span>}
        </span>
      ),
      sortValue: (c) => c.due_date,
    },
    { key: "status", header: "Status", render: (c) => <ComplianceStatusBadge status={c.status} />, sortValue: (c) => c.status },
  ];

  const rCols: Column<DocumentRequest>[] = [
    { key: "sched", header: "Pemeriksaan", render: (r) => scheduleShortLabel(schedIdx.get(r.schedule_id)), sortValue: (r) => r.schedule_id },
    {
      key: "title",
      header: "Uraian Permintaan Dokumen",
      className: "min-w-[100px]",
      render: (r) => (
        <span>
          <span className="block">{clean(r.title)}</span>
          <span className="text-[11.5px] text-muted">Kategori {r.category}</span>
        </span>
      ),
      sortValue: (r) => r.title,
    },
    { key: "due", header: "Target Waktu", render: (r) => <span className="whitespace-nowrap">{formatDate(r.due_date)}</span>, sortValue: (r) => r.due_date },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const t = requestTimeliness(r, asOf);
        return (
          <span className="flex flex-col items-start gap-1">
            <RequestStatusBadge status={r.status} />
            {(t === "terlambat" || t === "lewat_tenggat") && (
              <Badge tone="rose">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                Terlambat
              </Badge>
            )}
          </span>
        );
      },
      sortValue: (r) => r.status,
    },
  ];

  const dCols: Column<ImportantDoc>[] = [
    {
      key: "name",
      header: "Nama Dokumen",
      className: "min-w-[180px]",
      render: (d) => (
        <span className="flex items-center gap-2">
          <span className="shrink-0">
            <FileTypeIcon label="TXT" color="#e5484d" size={30} />
          </span>
          <span>{d.name}</span>
        </span>
      ),
      sortValue: (d) => d.name,
    },
    { key: "date", header: "Tanggal", render: (d) => <span className="whitespace-nowrap">{d.available ? formatDate(d.date) : "Belum tersedia"}</span>, sortValue: (d) => d.date },
    {
      key: "dl",
      header: "Unduh",
      render: (d) => (
        <button
          type="button"
          disabled={!d.available}
          onClick={() => downloadSummary(d)}
          className="grid h-8 w-8 place-items-center rounded-md text-brand hover:bg-sky-50 disabled:opacity-30"
          aria-label={`Unduh ${d.name}`}
        >
          <Download className="h-4 w-4" aria-hidden />
        </button>
      ),
    },
  ];

  const gCols: Column<GroupRef>[] = [
    {
      key: "name",
      header: "Nama Dokumen",
      className: "min-w-[170px]",
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="shrink-0">
            <FileTypeIcon label="TXT" color="#e5484d" size={30} />
          </span>
          <span>{clean(r.name)}</span>
        </span>
      ),
      sortValue: (r) => r.name,
    },
    { key: "group", header: "Kelompok", render: (r) => r.group.replace("Kelompok Simulasi", "Kel. Sim."), sortValue: (r) => r.group },
    {
      key: "dl",
      header: "Buka",
      render: (r) => (
        <button type="button" onClick={() => openDocument(r.documentId)} className="grid h-8 w-8 place-items-center rounded-md text-brand hover:bg-sky-50" aria-label={`Buka ${r.name}`}>
          <Download className="h-4 w-4" aria-hidden />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader icon={<AuditDocIcon size={46} />}
        title="Dashboard Departemen Regional"
        description="Informasi pemeriksaan, kepatuhan satker, permintaan dokumen, dan referensi untuk mendukung pengawasan, evaluasi, dan pembelajaran."
        actions={
          <SelectField
            id="dr-period"
            label="Periode Data"
            icon={<CalendarDays />}
            className="w-[180px]"
            value={period}
            onChange={setPeriod}
            options={[{ value: ALL, label: "Semua Tahun" }, ...years.map((y) => ({ value: String(y), label: `Tahun ${y}` }))]}
          />
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard tinted label="Total Temuan Pemeriksaan" value={summary.total} icon={<FileSearch />} tone="blue" />
        <KpiCard tinted tone="teal" label="Selesai" value={summary.byStatus.selesai} hint={formatPercent(summary.pctSelesai)} icon={<CheckCircle2 />} />
        <KpiCard tinted tone="amber" label="Dalam Proses" value={summary.byStatus.dalam_proses} hint={formatPercent(percent(summary.byStatus.dalam_proses, summary.total))} icon={<Clock />} />
        <KpiCard
          tinted
          tone="rose"
          label="Belum Selesai"
          value={summary.byStatus.belum_ditindaklanjuti}
          hint={formatPercent(percent(summary.byStatus.belum_ditindaklanjuti, summary.total))}
          icon={<AlertCircle />}
        />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card aria-labelledby="dr-temuan">
          <SectionHeader
            id="dr-temuan"
            icon={<FileSearch />}
            title="Hasil Pemeriksaan Departemen Regional"
            description="Daftar temuan dan tindak lanjut hasil pemeriksaan BPK, DAI, dan KAA."
            actions={
              <SelectField
                id="dr-exam"
                label="Pemeriksa"
                hideLabel
                className="w-[150px]"
                value={examiner}
                onChange={setExaminer}
                options={[{ value: ALL, label: `Semua (${drFindings.length})` }, ...EXAMINERS.map((e) => ({ value: e, label: `${e} (${drFindings.filter((f) => f.examiner === e).length})` }))]}
              />
            }
          />
          <DataTable
            rows={shownFindings}
            columns={fCols}
            rowKey={(f) => f.id}
            caption="Temuan unit DR"
            onRowOpen={(f) => setOpenFinding(f.id)}
            openColumnKey="title"
            initialSort={{ key: "due", dir: "asc" }}
            pageSize={5}
            dense
            minWidth={740}
            toolbar={<SearchField id="dr-q-f" label="Cari temuan" hideLabel value={qFinding} onChange={setQFinding} placeholder="Cari temuan, rekomendasi, atau PIC..." />}
          />
        </Card>
        <Card aria-labelledby="dr-kepatuhan">
          <SectionHeader id="dr-kepatuhan" icon={<ListChecks />} title="Data Kepatuhan Satker DR" description="Daftar aspek kepatuhan beserta target waktunya." />
          <DataTable
            rows={compliance}
            columns={cCols}
            rowKey={(c) => c.id}
            caption="Kewajiban kepatuhan DR"
            onRowOpen={(c) => setOpenCompliance(c.id)}
            openColumnKey="aspect"
            initialSort={{ key: "due", dir: "asc" }}
            pageSize={5}
            dense
            minWidth={420}
            toolbar={<SearchField id="dr-q-c" label="Cari aspek kepatuhan" hideLabel value={qCompliance} onChange={setQCompliance} placeholder="Cari aspek kepatuhan..." />}
          />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
        <Card aria-labelledby="dr-permindok">
          <SectionHeader id="dr-permindok" icon={<FolderOpen />} title="Tracker Permintaan Dokumen (Permindok)" description="Monitoring permintaan dokumen pemeriksaan." />
          <DataTable
            rows={requests}
            columns={rCols}
            rowKey={(r) => r.id}
            caption="Permintaan dokumen DR"
            onRowOpen={(r) => setOpenRequest(r.id)}
            openColumnKey="title"
            initialSort={{ key: "due", dir: "asc" }}
            pageSize={5}
            dense
            minWidth={360}
            toolbar={<SearchField id="dr-q-r" label="Cari dokumen atau pemeriksaan" hideLabel value={qRequest} onChange={setQRequest} placeholder="Cari dokumen atau pemeriksaan..." />}
          />
        </Card>
        <Card aria-labelledby="dr-dok">
          <SectionHeader id="dr-dok" icon={<FileText />} iconTone="blue" title="Dokumen Penting" description="Laporan hasil pemeriksaan." />
          <DataTable
            rows={importantDocs}
            columns={dCols}
            rowKey={(d) => d.id}
            caption="Dokumen penting DR"
            initialSort={{ key: "date", dir: "asc" }}
            pageSize={5}
            dense
            minWidth={360}
            emptyTitle="Belum ada dokumen DR"
            toolbar={<SearchField id="dr-q-d" label="Cari dokumen" hideLabel value={qDoc} onChange={setQDoc} placeholder="Cari dokumen..." />}
          />
        </Card>
        <Card aria-labelledby="dr-ketentuan">
          <SectionHeader id="dr-ketentuan" icon={<BookOpen />} iconTone="blue" title="Ketentuan Kelompok" description="Kumpulan ketentuan per kelompok." />
          <DataTable
            rows={groupRefs}
            columns={gCols}
            rowKey={(r) => r.id}
            caption="Ketentuan per kelompok"
            initialSort={{ key: "group", dir: "asc" }}
            pageSize={5}
            dense
            minWidth={320}
            toolbar={<SearchField id="dr-q-k" label="Cari dokumen ketentuan" hideLabel value={qRef} onChange={setQRef} placeholder="Cari dokumen..." />}
          />
        </Card>
      </div>

      <ComplianceDrawer id={openCompliance} onClose={() => setOpenCompliance(null)} />
      <FindingDrawer findingId={openFinding} onClose={() => setOpenFinding(null)} />
      <RequestDrawer requestId={openRequest} onClose={() => setOpenRequest(null)} />
    </div>
  );
}

function ComplianceDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, asOf, updateCompliance } = useReadySekar();
  const item = id ? data.compliance.find((c) => c.id === id) : null;
  return (
    <Drawer open={!!item} onClose={onClose} title={item ? `Kewajiban ${item.id}` : "Kewajiban"} subtitle={item?.aspect}>
      {item && <ComplianceForm key={`${item.id}-${item.status}`} item={item} asOf={asOf} onSave={(s) => updateCompliance(item.id, s)} />}
    </Drawer>
  );
}

function ComplianceForm({ item, asOf, onSave }: { item: ComplianceItem; asOf: string; onSave: (s: ComplianceStatus) => void }) {
  const [status, setStatus] = useState<ComplianceStatus>(item.status);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ComplianceStatusBadge status={item.status} />
        {item.status !== "selesai" && item.due_date < asOf && <Badge tone="rose">Lewat tenggat</Badge>}
        <Badge tone="amber">DATA DUMMY</Badge>
      </div>
      <DescriptionList
        items={[
          { term: "PIC Kelompok", value: item.pic },
          { term: "Target waktu", value: formatDate(item.due_date) },
        ]}
      />
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-[#f5f9fe] p-4">
        <SelectField id="comp-status" label="Status" value={status} onChange={setStatus} options={COMPLIANCE_STATUSES.map((s) => ({ value: s, label: COMPLIANCE_STATUS_LABEL[s] }))} />
        <Button variant="primary" onClick={() => onSave(status)} disabled={status === item.status}>
          <Save className="h-4 w-4" aria-hidden />
          Simpan status
        </Button>
      </div>
    </div>
  );
}

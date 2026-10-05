"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Eye, History, PlayCircle, Timer } from "lucide-react";
import { FindingDrawer } from "@/components/domain/FindingDrawer";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, Button, Card, cx, DescriptionList, EmptyState, KpiCard, PageHeader, SearchField, SectionHeader, SelectField } from "@/components/ui/primitives";
import { FindingStatusBadge, RequestStatusBadge, ScheduleStatusBadge, TentativeBadge, TimelinessBadge } from "@/components/ui/StatusBadges";
import { ALL, matchesSearch, uniqueSorted, unitIndex } from "@/lib/analytics/common";
import { findingTimeliness } from "@/lib/analytics/findings";
import {
  barPosition,
  positionOf,
  SCHEDULE_STATUS_LABEL,
  scheduleKpis,
  scheduleStatus,
  startsWithin,
  timelineWindow,
  upcomingSchedules,
  type ScheduleStatus,
  type TimelineView,
} from "@/lib/analytics/schedules";
import { diffDays, formatDate } from "@/lib/dates";
import { FINDING_STATUS_LABEL, formatNumber } from "@/lib/format";
import { EXAMINER_COLOR } from "@/lib/palette";
import { kpwModuleData } from "@/lib/scope";
import { EXAMINERS, type AuditSchedule, type Examiner, type Finding, type FindingStatus } from "@/lib/types";

export function JadwalView() {
  const { data, asOf, openDocument } = useReadySekar();
  const kpw = useMemo(() => kpwModuleData(data), [data]);
  const idx = useMemo(() => unitIndex(kpw.units), [kpw.units]);
  const [view, setView] = useState<TimelineView>("kuartal");
  const [offset, setOffset] = useState(0);
  const [examiner, setExaminer] = useState<Examiner | typeof ALL>(ALL);
  const [examType, setExamType] = useState<string>(ALL);
  const [status, setStatus] = useState<ScheduleStatus | typeof ALL>(ALL);
  const [openSchedule, setOpenSchedule] = useState<string | null>(null);
  const [openFinding, setOpenFinding] = useState<string | null>(null);
  const [fuStatus, setFuStatus] = useState<FindingStatus | "terbuka" | typeof ALL>("terbuka");
  const [fuSearch, setFuSearch] = useState("");

  const types = uniqueSorted(kpw.audit_schedules.map((s) => s.exam_type));
  const filtered = kpw.audit_schedules.filter(
    (s) => (examiner === ALL || s.examiner === examiner) && (examType === ALL || s.exam_type === examType) && (status === ALL || scheduleStatus(s, asOf) === status),
  );
  const kpis = scheduleKpis(filtered, asOf);
  const win = timelineWindow(view, asOf, offset);
  const inWindow = filtered
    .map((s) => ({ s, pos: barPosition(s, win) }))
    .filter((x): x is { s: AuditSchedule; pos: { left: number; width: number } } => x.pos !== null)
    .sort((a, b) => a.s.start_date.localeCompare(b.s.start_date));
  const today = positionOf(asOf, win);
  const upcoming = upcomingSchedules(filtered, asOf, 6);

  const followUps = kpw.findings.filter(
    (f) =>
      (fuStatus === ALL || (fuStatus === "terbuka" ? f.status !== "selesai" : f.status === fuStatus)) &&
      matchesSearch(fuSearch, f.id, f.title, f.area, f.pic, idx.get(f.unit_id)?.name),
  );

  const fuColumns: Column<Finding>[] = [
    { key: "id", header: "ID", render: (f) => <span className="whitespace-nowrap font-mono text-xs">{f.id}</span>, sortValue: (f) => f.id },
    { key: "unit", header: "KPw", render: (f) => <span className="font-semibold">{idx.get(f.unit_id)?.name}</span>, sortValue: (f) => idx.get(f.unit_id)?.name ?? "" },
    { key: "area", header: "Area", render: (f) => f.area, sortValue: (f) => f.area },
    { key: "title", header: "Temuan", className: "min-w-[220px]", render: (f) => <span className="line-clamp-2">{f.title}</span>, sortValue: (f) => f.title },
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
    { key: "status", header: "Status", render: (f) => <FindingStatusBadge status={f.status} />, sortValue: (f) => f.status },
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
            className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:underline"
          >
            <Eye className="h-4 w-4" aria-hidden />
            Lihat
          </button>
        ) : (
          <span className="text-xs text-muted">Belum ada</span>
        ),
    },
  ];

  const sched = openSchedule ? kpw.audit_schedules.find((s) => s.id === openSchedule) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Modul KPw"
        title="Jadwal Pemeriksaan"
        description={`Status jadwal dihitung dari tanggal mulai/selesai terhadap tanggal acuan ${formatDate(asOf)}. Jadwal yang belum terkonfirmasi ditandai Tentatif.`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total jadwal" value={formatNumber(kpis.total)} hint={`${kpis.tentatif} tentatif`} icon={<CalendarDays className="h-5 w-5" />} />
        <KpiCard label="Berlangsung" value={formatNumber(kpis.berlangsung)} tone="teal" icon={<PlayCircle className="h-5 w-5" />} />
        <KpiCard label="Mulai dalam 7 hari" value={formatNumber(kpis.mulai7Hari)} tone="amber" icon={<Timer className="h-5 w-5" />} />
        <KpiCard label="Mendatang" value={formatNumber(kpis.mendatang)} hint="Termasuk yang mulai ≤ 7 hari" tone="violet" icon={<CalendarClock className="h-5 w-5" />} />
        <KpiCard label="Selesai" value={formatNumber(kpis.selesai)} tone="navy" icon={<CalendarCheck2 className="h-5 w-5" />} />
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card aria-labelledby="timeline-title">
          <SectionHeader
            id="timeline-title"
            title={`Timeline — ${win.label}`}
            description={`${inWindow.length} jadwal dalam periode ini. Klik bar untuk detail.`}
            actions={
              <>
                <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Skala timeline">
                  {(["bulan", "kuartal", "tahun"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={view === v}
                      onClick={() => {
                        setView(v);
                        setOffset(0);
                      }}
                      className={cx("rounded-md px-3 py-1.5 text-sm font-semibold capitalize", view === v ? "bg-navy-800 text-white" : "text-navy-700 hover:bg-sky-50")}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" onClick={() => setOffset((o) => o - 1)} aria-label="Periode sebelumnya">
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button size="sm" onClick={() => setOffset(0)} disabled={offset === 0}>
                    Hari ini
                  </Button>
                  <Button size="sm" onClick={() => setOffset((o) => o + 1)} aria-label="Periode berikutnya">
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </>
            }
          />
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectField id="j-exam" label="Pemeriksa" value={examiner} onChange={setExaminer} options={[{ value: ALL, label: "Semua pemeriksa" }, ...EXAMINERS.map((e) => ({ value: e, label: e }))]} />
            <SelectField id="j-type" label="Jenis pemeriksaan" value={examType} onChange={setExamType} options={[{ value: ALL, label: "Semua jenis" }, ...types.map((t) => ({ value: t, label: t }))]} />
            <SelectField
              id="j-status"
              label="Status"
              value={status}
              onChange={setStatus}
              options={[{ value: ALL, label: "Semua status" }, ...(Object.keys(SCHEDULE_STATUS_LABEL) as ScheduleStatus[]).map((s) => ({ value: s, label: SCHEDULE_STATUS_LABEL[s] }))]}
            />
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-muted" aria-label="Legenda">
            {EXAMINERS.map((e) => (
              <span key={e} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-5 rounded-sm" style={{ background: EXAMINER_COLOR[e] }} aria-hidden />
                {e}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-sm border-2 border-dashed border-amber-600 bg-amber-100" aria-hidden />
              Tentatif
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-0.5 bg-rose-600" aria-hidden />
              Hari ini ({formatDate(asOf)})
            </span>
          </div>
          {inWindow.length === 0 ? (
            <EmptyState title="Tidak ada jadwal pada periode ini" description="Geser periode atau ubah filter untuk melihat jadwal lain." />
          ) : (
            <div className="relative scrollbar-thin overflow-x-auto rounded-xl border border-line">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[200px_1fr] border-b border-line bg-sky-50/80 text-xs font-bold text-navy-800">
                  <div className="px-3 py-2">Unit · pemeriksa</div>
                  <div className="relative h-8">
                    {win.ticks.map((t) => {
                      const left = positionOf(t.date, win);
                      return left === null ? null : (
                        <span key={t.date} className="absolute top-2 -translate-x-1/2" style={{ left: `${left}%` }}>
                          {t.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <ul aria-label={`Jadwal pemeriksaan ${win.label}`}>
                  {inWindow.map(({ s, pos }) => {
                    const st = scheduleStatus(s, asOf);
                    const color = EXAMINER_COLOR[s.examiner];
                    return (
                      <li key={s.id} className="grid grid-cols-[200px_1fr] border-b border-slate-100 last:border-0">
                        <div className="min-w-0 px-3 py-2 text-sm">
                          <p className="truncate font-semibold text-navy-900">{idx.get(s.unit_id)?.name ?? s.unit_id}</p>
                          <p className="text-xs text-muted">
                            {s.examiner} · {s.exam_type}
                          </p>
                        </div>
                        <div className="relative h-12">
                          {win.ticks.map((t) => {
                            const left = positionOf(t.date, win);
                            return left === null ? null : <span key={t.date} className="absolute inset-y-0 w-px bg-slate-100" style={{ left: `${left}%` }} aria-hidden />;
                          })}
                          {today !== null && <span className="absolute inset-y-0 z-10 w-0.5 bg-rose-600" style={{ left: `${today}%` }} aria-hidden />}
                          <button
                            type="button"
                            onClick={() => setOpenSchedule(s.id)}
                            className={cx(
                              "absolute top-2.5 flex h-7 min-w-[10px] items-center overflow-hidden rounded-md px-1.5 text-left text-xs font-bold transition hover:brightness-110",
                              s.date_confirmed ? "text-white" : "border-2 border-dashed border-amber-600 bg-amber-100 text-amber-950",
                              st === "selesai" && s.date_confirmed && "opacity-60",
                            )}
                            style={{ left: `${pos.left}%`, width: `${Math.max(pos.width, 1.2)}%`, background: s.date_confirmed ? color : undefined }}
                            title={`${s.id}: ${formatDate(s.start_date)} – ${formatDate(s.end_date)}${s.date_confirmed ? "" : " (Tentatif)"}`}
                          >
                            <span className="truncate">
                              {s.id}
                              {!s.date_confirmed && " · Tentatif"}
                            </span>
                            <span className="sr-only">
                              , {idx.get(s.unit_id)?.name}, {formatDate(s.start_date)} sampai {formatDate(s.end_date)}, {SCHEDULE_STATUS_LABEL[st]}
                            </span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </Card>

        <Card aria-labelledby="terdekat">
          <SectionHeader id="terdekat" icon={<History className="h-5 w-5 text-teal-700" aria-hidden />} title="Pemeriksaan terdekat" description="Berlangsung atau akan datang." />
          {upcoming.length ? (
            <ul className="space-y-2">
              {upcoming.map((s) => {
                const st = scheduleStatus(s, asOf);
                const d = diffDays(asOf, s.start_date);
                return (
                  <li key={s.id}>
                    <button type="button" onClick={() => setOpenSchedule(s.id)} className="w-full rounded-lg border border-line px-3 py-2 text-left hover:border-sky-300 hover:bg-sky-50/60">
                      <span className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-semibold text-navy-900">{idx.get(s.unit_id)?.name}</span>
                        <span className="flex gap-1">
                          <ScheduleStatusBadge status={st} />
                          {!s.date_confirmed && <TentativeBadge />}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {s.id} · {s.examiner} {s.exam_type} · {formatDate(s.start_date)} – {formatDate(s.end_date)}
                        {st === "mendatang" && ` · mulai ${d} hari lagi`}
                        {startsWithin(s, asOf, 7) && " (≤ 7 hari)"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Tidak ada jadwal mendatang" />
          )}
        </Card>
      </div>

      <Card aria-labelledby="tindak-lanjut">
        <SectionHeader
          id="tindak-lanjut"
          title="Tindak lanjut temuan"
          description="Temuan KPw beserta tenggat, status dan bukti. Klik baris untuk detail dan pembaruan status."
          actions={
            <div className="flex flex-wrap items-end gap-2">
              <SelectField
                id="fu-status"
                label="Status"
                value={fuStatus}
                onChange={setFuStatus}
                options={[
                  { value: "terbuka", label: "Belum selesai" },
                  { value: ALL, label: "Semua status" },
                  ...(["selesai", "dalam_proses", "belum_ditindaklanjuti"] as const).map((s) => ({ value: s, label: FINDING_STATUS_LABEL[s] })),
                ]}
              />
              <SearchField id="fu-search" value={fuSearch} onChange={setFuSearch} placeholder="ID, KPw, area…" />
            </div>
          }
        />
        <DataTable rows={followUps} columns={fuColumns} rowKey={(f) => f.id} caption="Tindak lanjut temuan" onRowOpen={(f) => setOpenFinding(f.id)} initialSort={{ key: "due", dir: "asc" }} />
      </Card>

      <Drawer open={!!sched} onClose={() => setOpenSchedule(null)} title={sched ? `Jadwal ${sched.id}` : "Jadwal"} subtitle={sched ? idx.get(sched.unit_id)?.name : undefined}>
        {sched && <ScheduleDetail schedule={sched} />}
      </Drawer>
      <FindingDrawer findingId={openFinding} onClose={() => setOpenFinding(null)} />
    </div>
  );
}

function ScheduleDetail({ schedule: s }: { schedule: AuditSchedule }) {
  const { data, asOf } = useReadySekar();
  const st = scheduleStatus(s, asOf);
  const reqs = data.document_requests.filter((r) => r.schedule_id === s.id);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ScheduleStatusBadge status={st} />
        {s.date_confirmed ? <Badge tone="teal">Tanggal terkonfirmasi</Badge> : <TentativeBadge />}
        <Badge tone="amber">DATA DUMMY</Badge>
      </div>
      <DescriptionList
        items={[
          { term: "Pemeriksa", value: s.examiner },
          { term: "Jenis", value: s.exam_type },
          { term: "Tahun", value: s.year },
          { term: "Mulai", value: formatDate(s.start_date) },
          { term: "Selesai", value: formatDate(s.end_date) },
          { term: "Durasi", value: `${diffDays(s.start_date, s.end_date) + 1} hari` },
          { term: "Status (dihitung)", value: `${SCHEDULE_STATUS_LABEL[st]} per ${formatDate(asOf)}` },
        ]}
      />
      <section>
        <h3 className="font-bold text-navy-900">Permintaan dokumen terkait</h3>
        {reqs.length ? (
          <ul className="mt-2 space-y-1.5">
            {reqs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <span>
                  <span className="font-semibold">{r.id}</span> · {r.category} · tenggat {formatDate(r.due_date)}
                </span>
                <RequestStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">Belum ada permintaan dokumen untuk jadwal ini.</p>
        )}
      </section>
    </div>
  );
}

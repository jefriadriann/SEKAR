"use client";

import { useMemo, useState } from "react";
import { Building2, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, ExternalLink, FileSpreadsheet, FileText, Layers, MapPin, Timer } from "lucide-react";
import { FindingDrawer } from "@/components/domain/FindingDrawer";
import { CalendarClockIcon } from "@/components/icons/Illustrations";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, Button, Card, cx, DescriptionList, EmptyState, IconTile, KpiCard, PageHeader, SearchField, SectionHeader, SelectField, type TileTone } from "@/components/ui/primitives";
import { FindingStatusBadge, RequestStatusBadge, TentativeBadge, TimelinessBadge } from "@/components/ui/StatusBadges";
import { ALL, matchesSearch, uniqueSorted, unitIndex } from "@/lib/analytics/common";
import { findingTimeliness } from "@/lib/analytics/findings";
import { barPosition, edgeOf, positionOf, scheduleKpis, scheduleStatus, startsWithin, timelineWindow, upcomingSchedules, type TimelineView } from "@/lib/analytics/schedules";
import { toCsv } from "@/lib/csv";
import { diffDays, formatDate, monthShort, toUTCDate } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import { clean, FINDING_STATUS_LABEL } from "@/lib/format";
import { kpwModuleData } from "@/lib/scope";
import { FINDING_STATUSES, type AuditSchedule, type Finding, type FindingStatus } from "@/lib/types";

/** "19 - 25 Jul" atau "30 Agu - 5 Sep". */
export function rangeLabel(start: string, end: string): string {
  const a = toUTCDate(start);
  const b = toUTCDate(end);
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()} - ${b.getUTCDate()} ${monthShort(b.getUTCMonth())}`;
  return `${a.getUTCDate()} ${monthShort(a.getUTCMonth())} - ${b.getUTCDate()} ${monthShort(b.getUTCMonth())}`;
}

type Phase = "berlangsung" | "segera" | "mendatang" | "selesai";

const PHASE: Record<Phase, { label: string; bar: string; dot: string; pill: string; tone: TileTone }> = {
  berlangsung: { label: "Dalam Pemeriksaan", bar: "bg-gradient-to-r from-[#1a2552] to-[#3d4f8f] text-white", dot: "#26366f", pill: "bg-[#e9ecf6] text-[#1a2552] border-[#d3d9ec]", tone: "navy" },
  segera: { label: "Mendatang (≤7 Hari)", bar: "bg-gradient-to-r from-[#b8902f] to-[#e2c27a] text-white", dot: "#c9a24a", pill: "bg-[#fbf5e6] text-[#8a6a1c] border-[#efe0b8]", tone: "gold" },
  mendatang: { label: "Mendatang", bar: "bg-white text-[#26366f] ring-[1.5px] ring-inset ring-[#7b88b3]", dot: "#7b88b3", pill: "bg-[#f1f3f9] text-[#3d4f8f] border-[#dde2ef]", tone: "slate" },
  selesai: { label: "Selesai", bar: "bg-gradient-to-r from-[#c9d0e2] to-[#dde2ee] text-[#3d4f8f] ring-1 ring-inset ring-[#bfc7dc]", dot: "#b4bdd4", pill: "bg-[#f4f5f8] text-[#5b6685] border-[#e2e5ec]", tone: "slate" },
};

function phaseOf(s: AuditSchedule, asOf: string): Phase {
  const st = scheduleStatus(s, asOf);
  if (st === "mendatang" && startsWithin(s, asOf, 7)) return "segera";
  return st;
}

function PhasePill({ phase }: { phase: Phase }) {
  return <span className={cx("inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[12px] font-semibold", PHASE[phase].pill)}>{phase === "segera" ? "Mulai ≤7 Hari" : PHASE[phase].label}</span>;
}

export function JadwalView() {
  const { data, asOf, setAsOf, datasetAsOf, resetAsOf, openDocument, notify } = useReadySekar();
  const kpw = useMemo(() => kpwModuleData(data), [data]);
  const idx = useMemo(() => unitIndex(kpw.units), [kpw.units]);
  const [view, setView] = useState<TimelineView>("bulan");
  const [offset, setOffset] = useState(0);
  const [year, setYear] = useState<string>(asOf.slice(0, 4));
  const [examType, setExamType] = useState<string>(ALL);
  const [korwil, setKorwil] = useState<string>(ALL);
  const [unitId, setUnitId] = useState<string>(ALL);
  const [openSchedule, setOpenSchedule] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [openFinding, setOpenFinding] = useState<string | null>(null);
  const [fuStatus, setFuStatus] = useState<FindingStatus | typeof ALL>(ALL);
  const [fuSearch, setFuSearch] = useState("");

  const years = uniqueSorted([...kpw.audit_schedules.map((s) => s.year), ...kpw.findings.map((f) => f.year)]);
  const types = uniqueSorted(kpw.audit_schedules.map((s) => s.exam_type));
  const korwils = uniqueSorted(kpw.units.map((u) => u.korwil ?? "")).filter(Boolean);
  const unitOptions = kpw.units.filter((u) => korwil === ALL || u.korwil === korwil);
  const unitMatch = (id: string) => (korwil === ALL || idx.get(id)?.korwil === korwil) && (unitId === ALL || id === unitId);

  const filtered = kpw.audit_schedules.filter((s) => (year === ALL || s.year === Number(year)) && (examType === ALL || s.exam_type === examType) && unitMatch(s.unit_id));
  const kpis = scheduleKpis(filtered, asOf);
  const win = timelineWindow(view, asOf, offset);
  const inWindow = filtered
    .map((s) => ({ s, pos: barPosition(s, win) }))
    .filter((x): x is { s: AuditSchedule; pos: { left: number; width: number } } => x.pos !== null)
    .sort((a, b) => a.s.start_date.localeCompare(b.s.start_date));
  const today = positionOf(asOf, win);
  const upcoming = upcomingSchedules(filtered, asOf, 50);

  const followUps = kpw.findings.filter(
    (f) =>
      (year === ALL || f.year === Number(year)) &&
      unitMatch(f.unit_id) &&
      (fuStatus === ALL || f.status === fuStatus) &&
      matchesSearch(fuSearch, f.id, f.title, f.recommendation, f.area, f.pic, idx.get(f.unit_id)?.name),
  );

  const fuColumns: Column<Finding>[] = [
    { key: "year", header: "Tahun", render: (f) => f.year, sortValue: (f) => f.year },
    { key: "unit", header: "KPwDN", render: (f) => <span className="whitespace-nowrap">{idx.get(f.unit_id)?.name}</span>, sortValue: (f) => idx.get(f.unit_id)?.name ?? "" },
    { key: "type", header: "Jenis Pemeriksaan", render: (f) => <span className="whitespace-nowrap">{f.examiner} {f.year}</span>, sortValue: (f) => `${f.examiner}${f.year}` },
    {
      key: "title",
      header: "Temuan",
      className: "min-w-[180px]",
      render: (f) => (
        <span>
          <span className="block">{f.title}</span>
        </span>
      ),
      sortValue: (f) => f.title,
    },
    { key: "rec", header: "Rekomendasi", className: "min-w-[160px] text-muted", render: (f) => <span className="line-clamp-2">{clean(f.recommendation)}</span> },
    { key: "pic", header: "PIC", render: (f) => <span className="whitespace-nowrap">{f.pic}</span>, sortValue: (f) => f.pic },
    {
      key: "due",
      header: "Target Penyelesaian",
      render: (f) => (
        <span className="whitespace-nowrap">
          {formatDate(f.due_date)}
          {findingTimeliness(f, asOf) === "lewat_tenggat" && (
            <span className="mt-1 block">
              <TimelinessBadge value="lewat_tenggat" />
            </span>
          )}
        </span>
      ),
      sortValue: (f) => f.due_date,
    },
    { key: "status", header: "Status", render: (f) => <FindingStatusBadge status={f.status} />, sortValue: (f) => f.status },
    {
      key: "bukti",
      header: "Bukti Penyelesaian",
      render: (f) =>
        f.evidence_document_id ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDocument(f.evidence_document_id!);
            }}
            className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-[#33447f] hover:underline"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Bukti
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          <span className="text-muted">-</span>
        ),
    },
  ];

  const exportCsv = () => {
    const csv = toCsv(followUps, [
      { header: "id", value: (f) => f.id },
      { header: "tahun", value: (f) => f.year },
      { header: "kpw", value: (f) => idx.get(f.unit_id)?.name ?? f.unit_id },
      { header: "pemeriksa", value: (f) => f.examiner },
      { header: "temuan", value: (f) => f.title },
      { header: "rekomendasi", value: (f) => f.recommendation },
      { header: "pic", value: (f) => f.pic },
      { header: "target_penyelesaian", value: (f) => f.due_date },
      { header: "status", value: (f) => FINDING_STATUS_LABEL[f.status] },
      { header: "bukti", value: (f) => f.evidence_document_id ?? "" },
    ]);
    downloadText(`sekar-tindak-lanjut-SIMULASI-${asOf}.csv`, csv, "text/csv;charset=utf-8");
    notify(`${followUps.length} baris tindak lanjut diekspor.`);
  };

  const sched = openSchedule ? kpw.audit_schedules.find((s) => s.id === openSchedule) : null;

  return (
    <div>
      <PageHeader icon={<CalendarClockIcon size={46} />} title="Timeline Pemeriksaan" crumb="Jadwal Pemeriksaan" uppercase description="Jadwal pemeriksaan dan agenda terdekat." />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <FilterBox>
          <SelectField id="j-year" label="Tahun Pemeriksaan" icon={<CalendarDays />} value={year} onChange={setYear} options={[{ value: ALL, label: "Semua Tahun" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]} />
        </FilterBox>
        <FilterBox>
          <SelectField id="j-type" label="Jenis Pemeriksaan" icon={<Layers />} value={examType} onChange={setExamType} options={[{ value: ALL, label: "Semua Jenis" }, ...types.map((t) => ({ value: t, label: t }))]} />
        </FilterBox>
        <FilterBox>
          <SelectField
            id="j-korwil"
            label="Korwil"
            icon={<MapPin />}
            value={korwil}
            onChange={(v) => {
              setKorwil(v);
              if (v !== ALL && unitId !== ALL && idx.get(unitId)?.korwil !== v) setUnitId(ALL);
            }}
            options={[{ value: ALL, label: "Semua Korwil" }, ...korwils.map((k) => ({ value: k, label: k }))]}
          />
        </FilterBox>
        <FilterBox>
          <SelectField id="j-unit" label="KPwDN" icon={<Building2 />} value={unitId} onChange={setUnitId} options={[{ value: ALL, label: "Semua KPwDN" }, ...unitOptions.map((u) => ({ value: u.id, label: u.name }))]} />
        </FilterBox>
        <FilterBox>
          <label htmlFor="j-asof" className="text-[12px] font-semibold text-muted">
            Posisi Data
          </label>
          <div className="flex items-center gap-1">
            <input
              id="j-asof"
              type="date"
              value={asOf}
              onChange={(e) => e.target.value && setAsOf(e.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-transparent bg-transparent text-[17px] font-extrabold text-navy-900 hover:border-line"
            />
            {datasetAsOf && asOf !== datasetAsOf && (
              <Button size="sm" variant="ghost" onClick={resetAsOf} title="Kembali ke tanggal dataset">
                Reset
              </Button>
            )}
          </div>
        </FilterBox>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard tinted tone="navy" label="Total Pemeriksaan" value={kpis.total} hint={`${kpis.berlangsung} berlangsung · ${kpis.tentatif} tentatif`} icon={<ClipboardList />} />
        <KpiCard tone="gold" label="Mulai ≤ 7 Hari" value={kpis.mulai7Hari} icon={<Timer />} />
        <KpiCard tone="slate" label="Mendatang" value={kpis.mendatang} icon={<CalendarClock />} />
        <KpiCard tone="navy" label="Selesai" value={kpis.selesai} icon={<CheckCircle2 />} />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card aria-labelledby="timeline-title">
          <SectionHeader
            id="timeline-title"
            icon={<CalendarDays />}
            iconTone="navy"
            title="Jadwal Pemeriksaan KPwDN"
            description={`${win.label} · ${inWindow.length} jadwal`}
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={() => setOffset((o) => o - 1)} aria-label="Periode sebelumnya">
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOffset((o) => o + 1)} aria-label="Periode berikutnya">
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
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
                      className={cx("rounded-md px-3 py-1 text-[13px] font-semibold capitalize", view === v ? "btn-grad text-white" : "text-navy-800 hover:bg-sky-50")}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </>
            }
          />
          {inWindow.length === 0 ? (
            <EmptyState title="Tidak ada jadwal pada periode ini" description="Geser periode atau ubah filter." />
          ) : (
            <div className="scrollbar-thin relative max-h-[470px] overflow-auto rounded-xl border border-line">
              <div className="min-w-[720px]">
                <div className="sticky top-0 z-30 grid grid-cols-[150px_1fr] border-b border-line bg-[#f3f5fa] text-[12.5px] font-bold text-navy-900">
                  <div className="px-3 py-2">KPwDN</div>
                  <div className="relative h-9">
                    {win.columns.map((c) => (
                      <span
                        key={c.start}
                        className="absolute inset-y-0 flex items-center justify-center border-l border-[#dce7f4]"
                        style={{ left: `${edgeOf(c.start, win)}%`, width: `${edgeOf(c.end, win) - edgeOf(c.start, win) + 100 / win.days}%` }}
                      >
                        {c.label}
                      </span>
                    ))}
                    {today !== null && (
                      <span className="absolute top-1 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#c9a24a] px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ left: `${today}%` }}>
                        Hari ini
                      </span>
                    )}
                  </div>
                </div>
                <ul aria-label={`Jadwal pemeriksaan ${win.label}`}>
                  {inWindow.map(({ s, pos }) => {
                    const ph = phaseOf(s, asOf);
                    return (
                      <li key={s.id} className="grid grid-cols-[150px_1fr] border-b border-[#eef2f7] last:border-0">
                        <div className="min-w-0 px-3 py-1.5 text-[13px] font-bold text-navy-900">
                          <span className="block truncate">{idx.get(s.unit_id)?.name ?? s.unit_id}</span>
                          <span className="block text-[11px] font-normal text-muted">
                            {s.examiner} · {s.exam_type}
                          </span>
                        </div>
                        <div className="relative h-11">
                          {win.columns.map((c) => (
                            <span key={c.start} className="absolute inset-y-0 w-px bg-[#eef2f7]" style={{ left: `${edgeOf(c.start, win)}%` }} aria-hidden />
                          ))}
                          {today !== null && <span className="absolute inset-y-0 z-10 border-l-2 border-dashed border-[#c9a24a]" style={{ left: `${today}%` }} aria-hidden />}
                          <button
                            type="button"
                            onClick={() => setOpenSchedule(s.id)}
                            className={cx(
                              "absolute top-2 z-[5] h-7 min-w-[14px] rounded-md shadow-sm transition hover:brightness-105",
                              PHASE[ph].bar,
                              !s.date_confirmed && "border-2 border-dashed border-[#c98a0b]",
                            )}
                            style={{ left: `${pos.left}%`, width: `${Math.max(pos.width, 1.5)}%` }}
                            title={`${s.id}: ${formatDate(s.start_date)} – ${formatDate(s.end_date)}${s.date_confirmed ? "" : " (Tentatif)"}`}
                          >
                            <span className="sr-only">
                              {s.id}, {idx.get(s.unit_id)?.name}, {formatDate(s.start_date)} sampai {formatDate(s.end_date)}, {PHASE[ph].label}
                              {!s.date_confirmed && ", tanggal tentatif"}
                            </span>
                          </button>
                          {(() => {
                            const label = s.date_confirmed ? rangeLabel(s.start_date, s.end_date) : "(Tentatif)";
                            const wide = pos.width >= 9;
                            const right = pos.left + pos.width;
                            const style = wide
                              ? { left: `${pos.left}%`, width: `${pos.width}%` }
                              : right > 78
                                ? { right: `${100 - pos.left + 0.6}%` }
                                : { left: `${right + 0.6}%` };
                            return (
                              <span
                                aria-hidden
                                className={cx(
                                  "pointer-events-none absolute top-2 z-[6] flex h-7 items-center whitespace-nowrap text-[11.5px] font-bold",
                                  wide ? "justify-center" : "text-navy-900",
                                  wide && (ph === "berlangsung" ? "text-white" : "text-navy-900"),
                                )}
                                style={style}
                              >
                                {label}
                              </span>
                            );
                          })()}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-navy-900" aria-label="Legenda">
            {(Object.keys(PHASE) as Phase[]).map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: PHASE[p].dot }} aria-hidden />
                {PHASE[p].label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-5 rounded-sm border-2 border-dashed border-[#c98a0b]" aria-hidden />
              Tentatif
            </span>
          </div>
        </Card>

        <Card aria-labelledby="terdekat">
          <SectionHeader
            id="terdekat"
            icon={<CalendarClock />}
            iconTone="navy"
            title="Pemeriksaan Terdekat"
            actions={
              upcoming.length > 5 && (
                <button type="button" onClick={() => setShowAll(true)} className="text-[13px] font-semibold text-[#33447f] hover:underline">
                  Lihat Semua
                </button>
              )
            }
          />
          {upcoming.length ? (
            <ul className="divide-y divide-[#eef2f7]">
              {upcoming.slice(0, 5).map((s) => (
                <UpcomingItem key={s.id} s={s} unitName={idx.get(s.unit_id)?.name ?? s.unit_id} onOpen={() => setOpenSchedule(s.id)} />
              ))}
            </ul>
          ) : (
            <EmptyState title="Tidak ada jadwal mendatang" />
          )}
        </Card>
      </div>

      <Card aria-labelledby="tindak-lanjut">
        <SectionHeader
          id="tindak-lanjut"
          icon={<FileText />}
          iconTone="navy"
          title="Penyelesaian Temuan Pemeriksaan"
          description="Tracking tindak lanjut temuan dan rekomendasi pemeriksaan pada KPwDN."
          actions={
            <>
              <SelectField
                id="fu-status"
                label="Status"
                hideLabel
                className="w-[200px]"
                value={fuStatus}
                onChange={setFuStatus}
                options={[{ value: ALL, label: "Semua status" }, ...FINDING_STATUSES.map((s) => ({ value: s, label: FINDING_STATUS_LABEL[s] }))]}
              />
              <Button onClick={exportCsv} disabled={!followUps.length} className="h-10">
                <FileSpreadsheet className="h-4 w-4 text-[#1f7a44]" aria-hidden />
                Unduh Data
              </Button>
            </>
          }
        />
        <DataTable
          rows={followUps}
          columns={fuColumns}
          rowKey={(f) => f.id}
          caption="Penyelesaian temuan pemeriksaan"
          onRowOpen={(f) => setOpenFinding(f.id)}
          openColumnKey="title"
          initialSort={{ key: "due", dir: "asc" }}
          minWidth={980}
          toolbar={<SearchField id="fu-search" label="Cari tindak lanjut" hideLabel value={fuSearch} onChange={setFuSearch} placeholder="Cari KPwDN, temuan, atau rekomendasi..." />}
        />
      </Card>

      <Drawer open={showAll} onClose={() => setShowAll(false)} title="Semua Pemeriksaan Mendatang" subtitle={`${upcoming.length} jadwal`}>
        <ul className="divide-y divide-[#eef2f7]">
          {upcoming.map((s) => (
            <UpcomingItem key={s.id} s={s} unitName={idx.get(s.unit_id)?.name ?? s.unit_id} onOpen={() => setOpenSchedule(s.id)} />
          ))}
        </ul>
      </Drawer>
      <Drawer open={!!sched} onClose={() => setOpenSchedule(null)} title={sched ? `Jadwal ${sched.id}` : "Jadwal"} subtitle={sched ? idx.get(sched.unit_id)?.name : undefined}>
        {sched && <ScheduleDetail schedule={sched} />}
      </Drawer>
      <FindingDrawer findingId={openFinding} onClose={() => setOpenFinding(null)} />
    </div>
  );
}

function FilterBox({ children }: { children: React.ReactNode }) {
  return <div className="panel flex min-w-0 flex-col gap-1 px-3 py-2.5 [&_select]:border-transparent [&_select]:shadow-none">{children}</div>;
}

function UpcomingItem({ s, unitName, onOpen }: { s: AuditSchedule; unitName: string; onOpen: () => void }) {
  const { asOf } = useReadySekar();
  const ph = phaseOf(s, asOf);
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-[#f6f7fb]">
        <IconTile tone={PHASE[ph].tone}>
          <Building2 />
        </IconTile>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <span className="text-[14px] font-bold text-navy-900">{unitName}</span>
            <span className="flex gap-1">
              <PhasePill phase={ph} />
              {!s.date_confirmed && <TentativeBadge />}
            </span>
          </span>
          <span className="block text-[12px] text-muted">
            {s.examiner} {s.exam_type} · {s.id}
          </span>
          <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-navy-900">
            <CalendarDays className="h-3.5 w-3.5 text-[#33447f]" aria-hidden />
            {s.date_confirmed ? `${formatDate(s.start_date)} – ${formatDate(s.end_date)}` : "Tanggal tentatif"}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-navy-800" aria-hidden />
      </button>
    </li>
  );
}

function ScheduleDetail({ schedule: s }: { schedule: AuditSchedule }) {
  const { data, asOf } = useReadySekar();
  const ph = phaseOf(s, asOf);
  const reqs = data.document_requests.filter((r) => r.schedule_id === s.id);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <PhasePill phase={ph} />
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
          { term: "Status (dihitung)", value: `${PHASE[ph].label} per ${formatDate(asOf)}` },
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

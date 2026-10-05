import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Hourglass } from "lucide-react";
import { COMPLIANCE_STATUS_LABEL, FINDING_STATUS_LABEL, REQUEST_STATUS_LABEL } from "@/lib/format";
import { TIMELINESS_LABEL, type Timeliness } from "@/lib/analytics/findings";
import { REQUEST_TIMELINESS_LABEL, type RequestTimeliness } from "@/lib/analytics/permindok";
import { SCHEDULE_STATUS_LABEL, type ScheduleStatus } from "@/lib/analytics/schedules";
import type { ComplianceStatus, FindingStatus, RequestStatus } from "@/lib/types";
import { Badge, type Tone } from "./primitives";

const icon = "h-3.5 w-3.5";

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  const map: Record<FindingStatus, [Tone, React.ReactNode]> = {
    selesai: ["teal", <CheckCircle2 key="i" className={icon} aria-hidden />],
    dalam_proses: ["amber", <Clock key="i" className={icon} aria-hidden />],
    belum_ditindaklanjuti: ["rose", <AlertCircle key="i" className={icon} aria-hidden />],
  };
  const [tone, i] = map[status];
  return (
    <Badge tone={tone}>
      {i}
      {FINDING_STATUS_LABEL[status]}
    </Badge>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, Tone> = { lengkap: "teal", bertahap: "amber", dalam_proses: "blue", belum_dikirim: "rose" };
  return (
    <Badge tone={map[status]}>
      {status === "lengkap" ? (
        <CheckCircle2 className={icon} aria-hidden />
      ) : status === "belum_dikirim" ? (
        <AlertCircle className={icon} aria-hidden />
      ) : status === "bertahap" ? (
        <Hourglass className={icon} aria-hidden />
      ) : (
        <Clock className={icon} aria-hidden />
      )}
      {REQUEST_STATUS_LABEL[status]}
    </Badge>
  );
}

export function ComplianceStatusBadge({ status }: { status: ComplianceStatus }) {
  const map: Record<ComplianceStatus, Tone> = { selesai: "teal", dalam_proses: "amber", belum_dimulai: "blue" };
  return (
    <Badge tone={map[status]}>
      {status === "selesai" ? <CheckCircle2 className={icon} aria-hidden /> : <Clock className={icon} aria-hidden />}
      {COMPLIANCE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function TimelinessBadge({ value }: { value: Timeliness }) {
  const map: Record<Timeliness, Tone> = { tepat_waktu: "teal", terlambat_selesai: "violet", lewat_tenggat: "rose", belum_jatuh_tempo: "neutral" };
  return (
    <Badge tone={map[value]}>
      {value === "lewat_tenggat" ? <AlertTriangle className={icon} aria-hidden /> : <Clock className={icon} aria-hidden />}
      {TIMELINESS_LABEL[value]}
    </Badge>
  );
}

const REQUEST_TIMELINESS_SHORT: Record<RequestTimeliness, string> = {
  tepat_waktu: "Tepat waktu",
  terlambat: "Terlambat",
  lewat_tenggat: "Lewat tenggat",
  belum_jatuh_tempo: "Belum jatuh tempo",
};

export function RequestTimelinessBadge({ value, short }: { value: RequestTimeliness; short?: boolean }) {
  const map: Record<RequestTimeliness, Tone> = { tepat_waktu: "teal", terlambat: "violet", lewat_tenggat: "rose", belum_jatuh_tempo: "neutral" };
  return (
    <Badge tone={map[value]}>
      {value === "lewat_tenggat" ? <AlertTriangle className={icon} aria-hidden /> : <Clock className={icon} aria-hidden />}
      {short ? REQUEST_TIMELINESS_SHORT[value] : REQUEST_TIMELINESS_LABEL[value]}
    </Badge>
  );
}

export function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  const map: Record<ScheduleStatus, Tone> = { selesai: "neutral", berlangsung: "teal", mendatang: "blue" };
  return <Badge tone={map[status]}>{SCHEDULE_STATUS_LABEL[status]}</Badge>;
}

export function TentativeBadge() {
  return (
    <Badge tone="amber" title="Tanggal belum terkonfirmasi">
      Tentatif
    </Badge>
  );
}

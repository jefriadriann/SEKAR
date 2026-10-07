"use client";

import { useState, type FormEvent } from "react";
import { Download, Save } from "lucide-react";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, Button, DescriptionList, SimulationNote } from "@/components/ui/primitives";
import { RequestStatusBadge, RequestTimelinessBadge } from "@/components/ui/StatusBadges";
import { requestTimeliness, scheduleLabel } from "@/lib/analytics/permindok";
import { formatDate } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import { REQUEST_STATUS_LABEL } from "@/lib/format";
import { validateRequestPatch } from "@/lib/mutations";
import { REQUEST_STATUSES, type DocumentRequest, type RequestStatus } from "@/lib/types";

export function RequestDrawer({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const { data } = useReadySekar();
  const req = requestId ? data.document_requests.find((r) => r.id === requestId) ?? null : null;
  return (
    <Drawer open={!!requestId} onClose={onClose} title={req ? `Permintaan ${req.id}` : "Permintaan dokumen"} subtitle={req?.title}>
      {req ? <RequestForm key={JSON.stringify(req)} req={req} /> : <p role="alert">Permintaan tidak ditemukan atau di luar cakupan persona.</p>}
    </Drawer>
  );
}

export function receiptText(req: DocumentRequest, unitName: string, asOf: string): string {
  return [
    "TANDA TERIMA DOKUMEN — SIMULASI",
    "==============================",
    "Materi simulasi untuk demonstrasi SEKAR. Bukan tanda terima resmi.",
    "",
    `Nomor permintaan : ${req.id}`,
    `Unit             : ${unitName}`,
    `Kategori         : ${req.category}`,
    `Judul            : ${req.title}`,
    `Tanggal minta    : ${formatDate(req.requested_at)}`,
    `Tenggat          : ${formatDate(req.due_date)}`,
    `Tanggal sampai   : ${formatDate(req.submitted_at, "belum disampaikan")}`,
    `Status           : ${REQUEST_STATUS_LABEL[req.status]}`,
    `Dicetak per      : ${formatDate(asOf)} (tanggal acuan simulasi)`,
    "",
    "Watermark: SIMULASI — HANYA UNTUK DEMO",
  ].join("\n");
}

function RequestForm({ req }: { req: DocumentRequest }) {
  const { data, asOf, updateRequest, config } = useReadySekar();
  const [status, setStatus] = useState<RequestStatus>(req.status);
  const [submittedAt, setSubmittedAt] = useState(req.submitted_at ?? "");
  const [note, setNote] = useState(req.dr_note);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const unit = data.units.find((u) => u.id === req.unit_id);
  const schedule = data.audit_schedules.find((s) => s.id === req.schedule_id);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const patch = { status, submitted_at: submittedAt || null, dr_note: note };
    const errs = validateRequestPatch(req, patch, asOf);
    setErrors(errs);
    if (errs.length) return;
    setSaving(true);
    const err = await updateRequest(req.id, patch);
    setSaving(false);
    if (err) setErrors([err]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <RequestStatusBadge status={req.status} />
        <RequestTimelinessBadge value={requestTimeliness(req, asOf)} />
        <Badge tone="amber">DATA DUMMY</Badge>
      </div>
      <DescriptionList
        items={[
          { term: "Unit", value: unit?.name ?? req.unit_id },
          { term: "Jadwal", value: scheduleLabel(schedule, data.units) },
          { term: "Kategori", value: req.category },
          { term: "Tanggal permintaan", value: formatDate(req.requested_at) },
          { term: "Tenggat", value: formatDate(req.due_date) },
          { term: "Tanggal penyampaian", value: formatDate(req.submitted_at, "Belum disampaikan") },
        ]}
      />
      <form onSubmit={submit} noValidate className="space-y-3 rounded-xl border border-line bg-sky-50/50 p-4" aria-labelledby="edit-req">
        <h3 id="edit-req" className="font-bold text-navy-900">
          Edit pemenuhan (demo)
        </h3>
        <p className="text-sm text-muted">
          Status kelengkapan berbeda dari ketepatan waktu: ketepatan waktu dihitung otomatis dari tanggal penyampaian dan tenggat.
          {config.mode === "dummy" && " Perubahan tersimpan lokal di browser ini."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="req-status" className="text-xs font-bold uppercase tracking-wide text-muted">
              Status kelengkapan
            </label>
            <select id="req-status" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)} className="h-10 rounded-lg border border-line bg-white px-2.5">
              {REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REQUEST_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="req-submitted" className="text-xs font-bold uppercase tracking-wide text-muted">
              Tanggal penyampaian
            </label>
            <input
              id="req-submitted"
              type="date"
              value={submittedAt}
              min={req.requested_at}
              max={asOf}
              onChange={(e) => setSubmittedAt(e.target.value)}
              aria-describedby="req-submitted-hint"
              className="h-10 rounded-lg border border-line bg-white px-2.5"
            />
            <span id="req-submitted-hint" className="text-xs text-muted">
              Tidak boleh sebelum {formatDate(req.requested_at)} atau setelah tanggal acuan. Kosongkan bila belum disampaikan.
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="req-note" className="text-xs font-bold uppercase tracking-wide text-muted">
            Catatan DR
          </label>
          <textarea id="req-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className="rounded-lg border border-line bg-white px-2.5 py-2" />
        </div>
        {errors.length > 0 && (
          <ul role="alert" className="list-disc space-y-0.5 rounded-lg border border-rose-200 bg-rose-50 py-2 pl-7 pr-3 text-sm text-rose-800">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => downloadText(`tanda-terima-${req.id}-SIMULASI.txt`, receiptText(req, unit?.name ?? req.unit_id, asOf))}>
            <Download className="h-4 w-4" aria-hidden />
            Tanda terima simulasi
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            <Save className="h-4 w-4" aria-hidden />
            Simpan perubahan
          </Button>
        </div>
      </form>
      <SimulationNote>Unggah berkas tidak tersedia di mode demo.</SimulationNote>
    </div>
  );
}

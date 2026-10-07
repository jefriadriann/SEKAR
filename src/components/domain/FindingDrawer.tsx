"use client";

import { useState } from "react";
import { Download, Eye, Save } from "lucide-react";
import { useReadySekar } from "@/components/providers/SekarProvider";
import { Drawer } from "@/components/ui/Overlay";
import { Badge, Button, DescriptionList } from "@/components/ui/primitives";
import { FindingStatusBadge, TimelinessBadge } from "@/components/ui/StatusBadges";
import { findingTimeliness } from "@/lib/analytics/findings";
import { formatDate } from "@/lib/dates";
import { FINDING_STATUS_LABEL } from "@/lib/format";
import { FINDING_STATUSES, type Finding, type FindingStatus } from "@/lib/types";

/** Drawer detail temuan: rincian, bukti terkait dan edit status (demo). */
export function FindingDrawer({ findingId, onClose }: { findingId: string | null; onClose: () => void }) {
  const { data } = useReadySekar();
  const finding = findingId ? data.findings.find((f) => f.id === findingId) ?? null : null;
  return (
    <Drawer
      open={!!findingId}
      onClose={onClose}
      title={finding ? `Temuan ${finding.id}` : "Temuan"}
      subtitle={finding ? finding.title : undefined}
    >
      {finding ? <FindingDetail key={`${finding.id}-${finding.status}`} finding={finding} /> : <p role="alert">Temuan tidak ditemukan atau di luar cakupan persona.</p>}
    </Drawer>
  );
}

function FindingDetail({ finding }: { finding: Finding }) {
  const { data, asOf, updateFindingStatus, openDocument, downloadDocument, config } = useReadySekar();
  const [status, setStatus] = useState<FindingStatus>(finding.status);
  const [saving, setSaving] = useState(false);
  const unit = data.units.find((u) => u.id === finding.unit_id);
  const evidence = finding.evidence_document_id ? data.documents.find((d) => d.id === finding.evidence_document_id) : null;
  const related = data.references.filter((r) => r.area === finding.area);

  const save = async () => {
    setSaving(true);
    await updateFindingStatus(finding.id, status);
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <FindingStatusBadge status={finding.status} />
        <TimelinessBadge value={findingTimeliness(finding, asOf)} />
        {finding.is_repeat && <Badge tone="violet">Temuan berulang</Badge>}
        <Badge tone="amber">DATA DUMMY</Badge>
      </div>
      <DescriptionList
        items={[
          { term: "Unit", value: `${unit?.name ?? finding.unit_id}${unit?.korwil ? ` · Korwil ${unit.korwil}` : ""}` },
          { term: "Tahun · Pemeriksa", value: `${finding.year} · ${finding.examiner}` },
          { term: "Area", value: finding.area },
          { term: "Tema", value: finding.theme },
          { term: "Uraian", value: finding.summary },
          { term: "Rekomendasi", value: finding.recommendation },
          { term: "PIC", value: finding.pic },
          { term: "Tenggat", value: formatDate(finding.due_date) },
          { term: "Tanggal selesai", value: formatDate(finding.completed_at, "Belum selesai") },
        ]}
      />

      <section aria-labelledby="edit-status" className="rounded-xl border border-line bg-sky-50/50 p-4">
        <h3 id="edit-status" className="font-bold text-navy-900">
          Perbarui status tindak lanjut
        </h3>
        <p className="mt-0.5 text-sm text-muted">
          Status Selesai mengisi tanggal selesai dengan tanggal acuan ({formatDate(asOf)}); membuka kembali akan mengosongkannya.
          {config.mode === "dummy" && " Perubahan tersimpan lokal di browser ini."}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="finding-status" className="text-xs font-bold uppercase tracking-wide text-muted">
              Status
            </label>
            <select
              id="finding-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as FindingStatus)}
              className="h-10 rounded-lg border border-line bg-white px-2.5"
            >
              {FINDING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {FINDING_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <Button variant="primary" onClick={save} disabled={saving || status === finding.status}>
            <Save className="h-4 w-4" aria-hidden />
            Simpan status
          </Button>
        </div>
      </section>

      <section aria-labelledby="bukti">
        <h3 id="bukti" className="font-bold text-navy-900">
          Bukti terkait
        </h3>
        {evidence ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3">
            <div className="min-w-0">
              <p className="font-semibold text-navy-900">{evidence.title}</p>
              <p className="text-xs text-muted">{evidence.id} · berkas .txt simulasi</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => openDocument(evidence.id)}>
                <Eye className="h-4 w-4" aria-hidden />
                Pratinjau
              </Button>
              <Button size="sm" onClick={() => downloadDocument(evidence.id)}>
                <Download className="h-4 w-4" aria-hidden />
                Unduh
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-2 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">Belum ada bukti yang dilampirkan untuk temuan ini.</p>
        )}
      </section>

      {related.length > 0 && (
        <section aria-labelledby="materi">
          <h3 id="materi" className="font-bold text-navy-900">
            Materi pembelajaran area {finding.area}
          </h3>
          <ul className="mt-2 space-y-1.5">
            {related.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => openDocument(r.document_id)} className="text-left font-semibold text-sky-800 underline-offset-2 hover:underline">
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
          </div>
  );
}

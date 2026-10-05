/**
 * Perubahan data demo yang murni (immutable). Dipakai repository dummy
 * maupun diuji langsung.
 */
import { isValidISODate } from "./dates";
import type { ComplianceItem, ComplianceStatus, Dataset, DocumentRequest, Finding, FindingStatus, ISODate, RequestStatus } from "./types";

/** Status selesai mengisi completed_at (tanggal acuan); membuka kembali mengosongkannya. */
export function applyFindingStatus(f: Finding, status: FindingStatus, asOf: ISODate): Finding {
  if (status === "selesai") return { ...f, status, completed_at: f.status === "selesai" && f.completed_at ? f.completed_at : asOf };
  return { ...f, status, completed_at: null };
}

export interface RequestPatch {
  status: RequestStatus;
  submitted_at: ISODate | null;
  dr_note: string;
}

export function validateRequestPatch(r: DocumentRequest, patch: RequestPatch, asOf: ISODate): string[] {
  const errors: string[] = [];
  if (patch.submitted_at !== null) {
    if (!isValidISODate(patch.submitted_at)) errors.push("Tanggal penyampaian tidak valid.");
    else {
      if (patch.submitted_at < r.requested_at) errors.push("Tanggal penyampaian tidak boleh mendahului tanggal permintaan.");
      if (patch.submitted_at > asOf) errors.push("Tanggal penyampaian tidak boleh melewati tanggal acuan simulasi.");
    }
  }
  if (patch.status === "lengkap" && !patch.submitted_at) errors.push("Status Lengkap memerlukan tanggal penyampaian.");
  if (patch.status === "belum_dikirim" && patch.submitted_at) errors.push("Status Belum dikirim tidak boleh memiliki tanggal penyampaian.");
  if (patch.dr_note.length > 1000) errors.push("Catatan DR maksimal 1000 karakter.");
  return errors;
}

export function applyRequestPatch(r: DocumentRequest, patch: RequestPatch): DocumentRequest {
  return { ...r, status: patch.status, submitted_at: patch.submitted_at, dr_note: patch.dr_note };
}

export function applyComplianceStatus(c: ComplianceItem, status: ComplianceStatus): ComplianceItem {
  return { ...c, status };
}

export function replaceById<T extends { id: string }>(rows: T[], next: T): T[] {
  return rows.map((r) => (r.id === next.id ? next : r));
}

export function updateFindingInDataset(ds: Dataset, id: string, status: FindingStatus, asOf: ISODate): Dataset {
  const f = ds.findings.find((x) => x.id === id);
  if (!f) throw new Error(`Temuan ${id} tidak ditemukan.`);
  return { ...ds, findings: replaceById(ds.findings, applyFindingStatus(f, status, asOf)) };
}

export function updateRequestInDataset(ds: Dataset, id: string, patch: RequestPatch, asOf: ISODate): Dataset {
  const r = ds.document_requests.find((x) => x.id === id);
  if (!r) throw new Error(`Permintaan ${id} tidak ditemukan.`);
  const errors = validateRequestPatch(r, patch, asOf);
  if (errors.length) throw new Error(errors.join(" "));
  return { ...ds, document_requests: replaceById(ds.document_requests, applyRequestPatch(r, patch)) };
}

export function updateComplianceInDataset(ds: Dataset, id: string, status: ComplianceStatus): Dataset {
  const c = ds.compliance.find((x) => x.id === id);
  if (!c) throw new Error(`Kewajiban ${id} tidak ditemukan.`);
  return { ...ds, compliance: replaceById(ds.compliance, applyComplianceStatus(c, status)) };
}

import type { ComplianceStatus, Dataset, FindingStatus, ISODate, SekarDocument, Viewer } from "../types";
import type { RequestPatch } from "../mutations";

export type DataMode = "dummy" | "supabase";

export interface DatasetSource {
  kind: "seed" | "import" | "supabase";
  label: string;
  /** Waktu (ISO datetime) dataset aktif mulai dipakai / diimpor. */
  loadedAt: string;
  /** Ada perubahan demo lokal di atas seed/import. */
  hasLocalChanges: boolean;
}

export interface LoadResult {
  dataset: Dataset;
  source: DatasetSource;
  /** Viewer dari backend (mode Supabase). Mode dummy memakai persona demo. */
  viewer?: Viewer;
}

export type DocumentContent = { kind: "text"; text: string; filename: string } | { kind: "url"; url: string; filename: string };

/**
 * Antarmuka repository SEKAR. UI hanya bergantung pada antarmuka ini,
 * sehingga implementasi dummy (localStorage) dan Supabase dapat ditukar.
 */
export interface SekarRepository {
  readonly mode: DataMode;
  load(): Promise<LoadResult>;
  updateFindingStatus(id: string, status: FindingStatus, asOf: ISODate): Promise<LoadResult>;
  updateDocumentRequest(id: string, patch: RequestPatch, asOf: ISODate): Promise<LoadResult>;
  updateComplianceStatus(id: string, status: ComplianceStatus): Promise<LoadResult>;
  /** Ganti seluruh dataset (hanya mode dummy). */
  replaceDataset(ds: Dataset, label: string): Promise<LoadResult>;
  /** Kembalikan ke seed awal (hanya mode dummy). */
  resetToSeed(): Promise<LoadResult>;
  getDocumentContent(doc: SekarDocument): Promise<DocumentContent>;
}

export function documentFilename(doc: SekarDocument): string {
  const safe = doc.id.replace(/[^A-Za-z0-9_-]+/g, "-");
  return `${safe}-SIMULASI.txt`;
}

/** Isi berkas .txt simulasi yang dibangun dari content_text. */
export function documentText(doc: SekarDocument): string {
  return [
    "SEKAR — DOKUMEN SIMULASI (DATA DUMMY)",
    "=====================================",
    `ID       : ${doc.id}`,
    `Judul    : ${doc.title}`,
    `Jenis    : ${doc.kind}`,
    `Cakupan  : ${doc.scope}`,
    "",
    doc.content_text,
    "",
    "Dokumen ini dibuat otomatis untuk demonstrasi antarmuka dan tidak mengandung data audit asli.",
  ].join("\n");
}

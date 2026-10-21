/**
 * Tipe data SEKAR. Struktur mengikuti data/sekar-dummy.json
 * (lihat docs/DATA-DICTIONARY.md). Semua tanggal berupa string ISO YYYY-MM-DD.
 */

export type ISODate = string;

export const EXAMINERS = ["BPK", "DAI", "KAA"] as const;
export type Examiner = (typeof EXAMINERS)[number];

export const FINDING_STATUSES = ["selesai", "dalam_proses", "belum_ditindaklanjuti"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const REQUEST_STATUSES = ["lengkap", "bertahap", "dalam_proses", "belum_dikirim"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const COMPLIANCE_STATUSES = ["selesai", "dalam_proses", "belum_dimulai"] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export const REFERENCE_KINDS = ["worksheet", "ketentuan", "tutorial"] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

/** Aspek asesmen rekonsiliasi aset (per nomor aset). */
export const ASSET_ASPECTS = [
  "umur_ekonomis",
  "harga_perolehan",
  "satuan_aset",
  "keberadaan_fisik",
  "kondisi_fisik",
  "lokasi",
  "klasifikasi",
  "dokumen_kepemilikan",
  "label",
] as const;
export type AssetAspect = (typeof ASSET_ASPECTS)[number];

/** Tindak lanjut pencatatan aset; sama dengan subkind video panduan area Aset. */
export const ASSET_ACTIONS = ["split", "penghapusan", "penatausahaan", "mutasi", "reklasifikasi", "koreksi_nilai", "penyesuaian_umur", "inventarisasi"] as const;
export type AssetAction = (typeof ASSET_ACTIONS)[number];

export const ROLES = ["dr", "kpw", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** ID unit khusus Departemen Regional. */
export const DR_UNIT_ID = "dr";

export interface DatasetMetadata {
  name: string;
  version: string;
  as_of: ISODate;
  seed?: number;
  all_data_is_synthetic: boolean;
  note?: string;
}

export interface Unit {
  id: string;
  name: string;
  /** null hanya untuk unit DR. */
  korwil: string | null;
  is_dummy: boolean;
}

export interface Finding {
  id: string;
  unit_id: string;
  year: number;
  examiner: Examiner;
  area: string;
  theme: string;
  title: string;
  summary: string;
  recommendation: string;
  status: FindingStatus;
  due_date: ISODate;
  completed_at: ISODate | null;
  pic: string;
  is_repeat: boolean;
  evidence_document_id: string | null;
  is_dummy: boolean;
}

export interface DocumentRequest {
  id: string;
  schedule_id: string;
  unit_id: string;
  category: string;
  title: string;
  dr_note: string;
  requested_at: ISODate;
  due_date: ISODate;
  submitted_at: ISODate | null;
  status: RequestStatus;
  document_id: string | null;
  is_dummy: boolean;
}

export interface AuditSchedule {
  id: string;
  unit_id: string;
  year: number;
  examiner: Examiner;
  exam_type: string;
  start_date: ISODate;
  end_date: ISODate;
  /** false berarti tanggal masih tentatif. */
  date_confirmed: boolean;
  is_dummy: boolean;
}

export interface Reference {
  id: string;
  scope: string;
  area: string;
  kind: ReferenceKind;
  /**
   * Jenis rinci (opsional): ws_aktivitas_supervisi / ws_pengendalian untuk worksheet,
   * pdg / padgi / juknis / se_intern untuk ketentuan, subkind video untuk tutorial.
   */
  subkind?: string | null;
  title: string;
  description: string;
  document_id: string;
  is_dummy: boolean;
}

export interface SekarDocument {
  id: string;
  /** "shared" atau units.id */
  scope: string;
  title: string;
  kind: string;
  content_text: string;
  is_dummy: boolean;
  /** Hanya mode Supabase: path objek di bucket privat. Tidak ada di dataset dummy. */
  storage_path?: string | null;
  /** Berkas demo statis (public/demo/...), mis. worksheet .xlsx, ketentuan .pdf, video .mp4. */
  file_url?: string | null;
}

export interface ComplianceItem {
  id: string;
  unit_id: string;
  aspect: string;
  pic: string;
  due_date: ISODate;
  status: ComplianceStatus;
  is_dummy: boolean;
}

export interface AssetReconciliation {
  id: string;
  unit_id: string;
  year: number;
  total_items: number;
  reconciled_items: number;
  discrepancy_items: number;
  note: string;
  is_dummy: boolean;
}

/** Satu ketidaksesuaian hasil asesmen untuk satu nomor aset (satu aset bisa punya beberapa baris). */
export interface AssetItem {
  id: string;
  reconciliation_id: string;
  unit_id: string;
  asset_number: string;
  asset_name: string;
  category: string;
  location: string;
  acquisition_date: ISODate;
  acquisition_cost: number;
  /** Umur ekonomis tercatat di aplikasi (tahun). */
  useful_life: number;
  aspect: AssetAspect;
  recorded_value: string;
  expected_value: string;
  note: string;
  action: AssetAction;
  status: FindingStatus;
  is_dummy: boolean;
}

export interface DemoPersona {
  id: string;
  name: string;
  role: Role;
  unit_id: string;
}

export interface Dataset {
  metadata: DatasetMetadata;
  units: Unit[];
  findings: Finding[];
  document_requests: DocumentRequest[];
  audit_schedules: AuditSchedule[];
  references: Reference[];
  documents: SekarDocument[];
  compliance: ComplianceItem[];
  asset_reconciliations: AssetReconciliation[];
  asset_items: AssetItem[];
  demo_personas: DemoPersona[];
}

export const COLLECTION_KEYS = [
  "units",
  "findings",
  "document_requests",
  "audit_schedules",
  "references",
  "documents",
  "compliance",
  "asset_reconciliations",
  "asset_items",
  "demo_personas",
] as const;
export type CollectionKey = (typeof COLLECTION_KEYS)[number];

/** Identitas pengguna aktif: persona demo atau pengguna Supabase yang sudah dipetakan. */
export interface Viewer {
  id: string;
  name: string;
  role: Role;
  unit_id: string;
  /** true bila hanya persona simulasi (mode dummy). */
  simulated: boolean;
}

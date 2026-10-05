/**
 * Validasi dataset untuk fitur import Admin. Memeriksa struktur, tipe,
 * keunikan ID, foreign key, nilai status, format tanggal dan aturan bisnis.
 * Data yang tidak valid DITOLAK tanpa menyentuh dataset aktif.
 */
import { isValidISODate } from "./dates";
import {
  COLLECTION_KEYS,
  COMPLIANCE_STATUSES,
  DR_UNIT_ID,
  EXAMINERS,
  FINDING_STATUSES,
  REFERENCE_KINDS,
  REQUEST_STATUSES,
  ROLES,
  type Dataset,
} from "./types";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  dataset?: Dataset;
  counts?: Record<string, number>;
}

type Rec = Record<string, unknown>;
type FieldType = "string" | "number" | "boolean" | "date" | "date?" | "string?";

const SCHEMAS: Record<(typeof COLLECTION_KEYS)[number], Record<string, FieldType>> = {
  units: { id: "string", name: "string", korwil: "string?", is_dummy: "boolean" },
  findings: {
    id: "string",
    unit_id: "string",
    year: "number",
    examiner: "string",
    area: "string",
    theme: "string",
    title: "string",
    summary: "string",
    recommendation: "string",
    status: "string",
    due_date: "date",
    completed_at: "date?",
    pic: "string",
    is_repeat: "boolean",
    evidence_document_id: "string?",
    is_dummy: "boolean",
  },
  document_requests: {
    id: "string",
    schedule_id: "string",
    unit_id: "string",
    category: "string",
    title: "string",
    dr_note: "string",
    requested_at: "date",
    due_date: "date",
    submitted_at: "date?",
    status: "string",
    document_id: "string?",
    is_dummy: "boolean",
  },
  audit_schedules: {
    id: "string",
    unit_id: "string",
    year: "number",
    examiner: "string",
    exam_type: "string",
    start_date: "date",
    end_date: "date",
    date_confirmed: "boolean",
    is_dummy: "boolean",
  },
  references: {
    id: "string",
    scope: "string",
    area: "string",
    kind: "string",
    title: "string",
    description: "string",
    document_id: "string",
    is_dummy: "boolean",
  },
  documents: { id: "string", scope: "string", title: "string", kind: "string", content_text: "string", is_dummy: "boolean" },
  compliance: { id: "string", unit_id: "string", aspect: "string", pic: "string", due_date: "date", status: "string", is_dummy: "boolean" },
  asset_reconciliations: {
    id: "string",
    unit_id: "string",
    year: "number",
    total_items: "number",
    reconciled_items: "number",
    discrepancy_items: "number",
    note: "string",
    is_dummy: "boolean",
  },
  demo_personas: { id: "string", name: "string", role: "string", unit_id: "string" },
};

const MAX_ERRORS = 200;

function checkField(value: unknown, type: FieldType): boolean {
  switch (type) {
    case "string":
      return typeof value === "string" && value.length > 0;
    case "string?":
      return value === null || (typeof value === "string" && value.length > 0);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "date":
      return isValidISODate(value);
    case "date?":
      return value === null || isValidISODate(value);
  }
}

export function validateDataset(input: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const err = (path: string, message: string) => {
    if (errors.length < MAX_ERRORS) errors.push({ path, message });
  };

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: [{ path: "$", message: "Berkas harus berupa objek JSON." }], warnings };
  }
  const root = input as Rec;

  // metadata
  const meta = root.metadata as Rec | undefined;
  if (typeof meta !== "object" || meta === null) {
    err("metadata", "Bagian metadata wajib ada.");
  } else {
    if (typeof meta.name !== "string") err("metadata.name", "Nama dataset wajib berupa teks.");
    if (typeof meta.version !== "string") err("metadata.version", "Versi dataset wajib berupa teks.");
    if (!isValidISODate(meta.as_of)) err("metadata.as_of", "Tanggal acuan harus berformat YYYY-MM-DD yang valid.");
    if (meta.all_data_is_synthetic !== true)
      err("metadata.all_data_is_synthetic", "Hanya dataset simulasi (all_data_is_synthetic: true) yang boleh diimpor.");
  }

  // struktur & tipe
  for (const key of COLLECTION_KEYS) {
    const arr = root[key];
    if (!Array.isArray(arr)) {
      err(key, "Koleksi wajib ada dan berupa array.");
      continue;
    }
    const seen = new Set<string>();
    arr.forEach((item, i) => {
      const p = `${key}[${i}]`;
      if (typeof item !== "object" || item === null) {
        err(p, "Record harus berupa objek.");
        return;
      }
      const rec = item as Rec;
      for (const [field, type] of Object.entries(SCHEMAS[key])) {
        if (!(field in rec)) err(`${p}.${field}`, "Kolom wajib tidak ada.");
        else if (!checkField(rec[field], type)) err(`${p}.${field}`, `Nilai tidak valid (harus ${type.replace("?", " atau null")}).`);
      }
      if (typeof rec.id === "string") {
        if (seen.has(rec.id)) err(`${p}.id`, `ID ganda: ${rec.id}`);
        seen.add(rec.id);
      }
      if ("is_dummy" in SCHEMAS[key] && rec.is_dummy !== true) err(`${p}.is_dummy`, "Semua record harus bertanda is_dummy: true.");
    });
  }

  // Kesalahan struktur koleksi menghentikan validasi lanjutan; kesalahan metadata tidak.
  if (errors.some((e) => !e.path.startsWith("metadata"))) return { ok: false, errors, warnings };

  const ds = root as unknown as Dataset;
  const unitIds = new Set(ds.units.map((u) => u.id));
  const docIds = new Set(ds.documents.map((d) => d.id));
  const schedIds = new Set(ds.audit_schedules.map((s) => s.id));

  if (!unitIds.has(DR_UNIT_ID)) err("units", `Unit "${DR_UNIT_ID}" (Departemen Regional) wajib ada.`);
  ds.units.forEach((u, i) => {
    if (u.id !== DR_UNIT_ID && !u.korwil) err(`units[${i}].korwil`, "Unit KPw wajib memiliki korwil.");
  });

  const fk = (path: string, value: string | null, set: Set<string>, target: string) => {
    if (value !== null && !set.has(value)) err(path, `Referensi ke ${target} tidak ditemukan: ${value}`);
  };
  const enumCheck = (path: string, value: string, allowed: readonly string[]) => {
    if (!allowed.includes(value)) err(path, `Nilai "${value}" tidak dikenal. Pilihan: ${allowed.join(", ")}.`);
  };

  ds.findings.forEach((f, i) => {
    const p = `findings[${i}]`;
    fk(`${p}.unit_id`, f.unit_id, unitIds, "units");
    fk(`${p}.evidence_document_id`, f.evidence_document_id, docIds, "documents");
    enumCheck(`${p}.examiner`, f.examiner, EXAMINERS);
    enumCheck(`${p}.status`, f.status, FINDING_STATUSES);
    if (f.status === "selesai" && !f.completed_at) err(`${p}.completed_at`, "Temuan selesai wajib memiliki completed_at.");
    if (f.status !== "selesai" && f.completed_at) err(`${p}.completed_at`, "Temuan yang belum selesai tidak boleh memiliki completed_at.");
  });

  ds.audit_schedules.forEach((s, i) => {
    const p = `audit_schedules[${i}]`;
    fk(`${p}.unit_id`, s.unit_id, unitIds, "units");
    enumCheck(`${p}.examiner`, s.examiner, EXAMINERS);
    if (s.end_date < s.start_date) err(`${p}.end_date`, "Tanggal selesai mendahului tanggal mulai.");
  });

  ds.document_requests.forEach((r, i) => {
    const p = `document_requests[${i}]`;
    fk(`${p}.unit_id`, r.unit_id, unitIds, "units");
    fk(`${p}.schedule_id`, r.schedule_id, schedIds, "audit_schedules");
    fk(`${p}.document_id`, r.document_id, docIds, "documents");
    enumCheck(`${p}.status`, r.status, REQUEST_STATUSES);
    if (r.due_date < r.requested_at) err(`${p}.due_date`, "Tenggat mendahului tanggal permintaan.");
    if (r.submitted_at && r.submitted_at < r.requested_at) err(`${p}.submitted_at`, "Tanggal penyampaian mendahului tanggal permintaan.");
    const sched = ds.audit_schedules.find((s) => s.id === r.schedule_id);
    if (sched && sched.unit_id !== r.unit_id) warnings.push({ path: `${p}.schedule_id`, message: "Unit permintaan berbeda dengan unit jadwal." });
  });

  ds.references.forEach((r, i) => {
    const p = `references[${i}]`;
    fk(`${p}.document_id`, r.document_id, docIds, "documents");
    enumCheck(`${p}.kind`, r.kind, REFERENCE_KINDS);
    if (r.scope !== "shared" && !unitIds.has(r.scope)) err(`${p}.scope`, `Scope harus "shared" atau ID unit: ${r.scope}`);
  });

  ds.documents.forEach((d, i) => {
    if (d.scope !== "shared" && !unitIds.has(d.scope)) err(`documents[${i}].scope`, `Scope harus "shared" atau ID unit: ${d.scope}`);
  });

  ds.compliance.forEach((c, i) => {
    const p = `compliance[${i}]`;
    fk(`${p}.unit_id`, c.unit_id, unitIds, "units");
    enumCheck(`${p}.status`, c.status, COMPLIANCE_STATUSES);
  });

  ds.asset_reconciliations.forEach((a, i) => {
    const p = `asset_reconciliations[${i}]`;
    fk(`${p}.unit_id`, a.unit_id, unitIds, "units");
    if (a.total_items !== a.reconciled_items + a.discrepancy_items)
      err(`${p}.total_items`, "total_items harus sama dengan reconciled_items + discrepancy_items.");
    if (a.total_items < 0 || a.reconciled_items < 0 || a.discrepancy_items < 0) err(p, "Jumlah item tidak boleh negatif.");
  });

  ds.demo_personas.forEach((d, i) => {
    const p = `demo_personas[${i}]`;
    fk(`${p}.unit_id`, d.unit_id, unitIds, "units");
    enumCheck(`${p}.role`, d.role, ROLES);
  });
  for (const role of ROLES) {
    if (!ds.demo_personas.some((d) => d.role === role)) err("demo_personas", `Persona demo untuk peran "${role}" wajib ada.`);
  }

  if (errors.length) return { ok: false, errors, warnings };
  const counts = Object.fromEntries(COLLECTION_KEYS.map((k) => [k, ds[k].length]));
  return { ok: true, errors, warnings, dataset: ds, counts };
}

/** Parse teks JSON lalu validasi. */
export function parseAndValidate(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [{ path: "$", message: `JSON tidak dapat dibaca: ${(e as Error).message}` }], warnings: [] };
  }
  return validateDataset(parsed);
}

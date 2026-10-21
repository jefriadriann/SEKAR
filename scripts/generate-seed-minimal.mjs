#!/usr/bin/env node
// Membuat supabase/seed-minimal.sql: SUBSET persis dari data/sekar-dummy.json (ID & isi identik
// dengan supabase/seed.sql) untuk uji keamanan antarunit lewat SQL Editor. Data simulasi saja;
// tidak membuat akun Auth, kata sandi, atau baris user_access.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ds = JSON.parse(readFileSync(join(root, "data/sekar-dummy.json"), "utf8"));
if (ds.metadata?.all_data_is_synthetic !== true) throw new Error("Dataset bukan simulasi.");

const UNITS = ["dr", "kpw-01", "kpw-02"];
const PER_UNIT_FINDINGS = 4;
const lit = (v) => (v === null || v === undefined ? "null" : typeof v === "boolean" ? String(v) : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const insert = (table, rows, cols) =>
  rows.length ? `insert into public.${table} (${cols.join(", ")}) values\n${rows.map((r) => `  (${cols.map((c) => lit(r[c])).join(", ")})`).join(",\n")}\non conflict (id) do nothing;\n\n` : "";

// Temuan: per unit, campuran status, utamakan yang punya bukti (dokumen ber-scope unit).
const findings = UNITS.flatMap((u) => {
  const rows = ds.findings.filter((f) => f.unit_id === u).sort((a, b) => b.year - a.year || a.id.localeCompare(b.id));
  const pick = [];
  for (const st of ["selesai", "dalam_proses", "belum_ditindaklanjuti"]) {
    const withEv = rows.find((f) => f.status === st && f.evidence_document_id && !pick.includes(f));
    const any = withEv ?? rows.find((f) => f.status === st && !pick.includes(f));
    if (any) pick.push(any);
  }
  for (const f of rows) if (pick.length < PER_UNIT_FINDINGS && !pick.includes(f)) pick.push(f);
  return pick;
});
// Jadwal: satu per unit yang memiliki permintaan dokumen; dua permintaan per jadwal.
const schedules = UNITS.map((u) =>
  ds.audit_schedules.filter((s) => s.unit_id === u && ds.document_requests.some((r) => r.schedule_id === s.id)).sort((a, b) => b.start_date.localeCompare(a.start_date))[0],
);
const requests = schedules.flatMap((s) => ds.document_requests.filter((r) => r.schedule_id === s.id).slice(0, 2));
// Materi bersama: worksheet & PDG area Aset.
const references = ds.references.filter((r) => r.area === "Aset" && ["ws_pengendalian", "pdg"].includes(r.subkind));
// Kepatuhan DR.
const compliance = ds.compliance.filter((c) => c.unit_id === "dr").slice(0, 2);
// Rekonsiliasi aset terbaru yang memiliki rincian, per unit, + 3 baris asesmen.
const recs = UNITS.map((u) =>
  ds.asset_reconciliations.filter((a) => a.unit_id === u && ds.asset_items.some((i) => i.reconciliation_id === a.id)).sort((a, b) => b.year - a.year)[0],
);
const items = recs.flatMap((r) => ds.asset_items.filter((i) => i.reconciliation_id === r.id).slice(0, 3));
// Dokumen yang dirujuk + satu dokumen ber-scope unit yang tidak dirujuk (uji scope dokumen langsung).
const docIds = new Set([...findings.map((f) => f.evidence_document_id), ...requests.map((r) => r.document_id), ...references.map((r) => r.document_id)].filter(Boolean));
const documents = ds.documents.filter((d) => docIds.has(d.id));
for (const u of UNITS) if (!documents.some((d) => d.scope === u)) {
  const d = ds.documents.find((x) => x.scope === u);
  if (d) documents.push(d);
}

const units = ds.units.filter((u) => UNITS.includes(u.id));
const counts = { units: units.length, documents: documents.length, findings: findings.length, audit_schedules: schedules.length, document_requests: requests.length, reference_materials: references.length, compliance_items: compliance.length, asset_reconciliations: recs.length, asset_items: items.length };

let sql = `-- SEKAR — SEED MINIMAL untuk uji keamanan (Supabase SQL Editor). DATA SIMULASI.
-- Subset persis dari supabase/seed.sql (ID & isi identik): seed lengkap nanti tidak bentrok.
-- Aman dijalankan ulang: hanya INSERT ... ON CONFLICT (id) DO NOTHING; tanpa DELETE/UPDATE.
-- Tidak membuat akun, kata sandi, atau user_access. Prasyarat: migration 0001 + 0002.
-- Jumlah: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}, dataset_metadata 1.
begin;

`;
sql += insert("dataset_metadata", [{ id: 1, ...ds.metadata }], ["id", "name", "version", "as_of", "all_data_is_synthetic", "note"]);
sql += insert("units", units, ["id", "name", "korwil", "is_dummy"]);
sql += insert("documents", documents, ["id", "scope", "title", "kind", "content_text", "file_url", "is_dummy"]);
sql += insert("findings", findings, ["id", "unit_id", "year", "examiner", "area", "theme", "title", "summary", "recommendation", "status", "due_date", "completed_at", "pic", "is_repeat", "evidence_document_id", "is_dummy"]);
sql += insert("audit_schedules", schedules, ["id", "unit_id", "year", "examiner", "exam_type", "start_date", "end_date", "date_confirmed", "is_dummy"]);
sql += insert("document_requests", requests, ["id", "schedule_id", "unit_id", "category", "title", "dr_note", "requested_at", "due_date", "submitted_at", "status", "document_id", "is_dummy"]);
sql += insert("reference_materials", references, ["id", "scope", "area", "kind", "subkind", "title", "description", "document_id", "is_dummy"]);
sql += insert("compliance_items", compliance, ["id", "unit_id", "aspect", "pic", "due_date", "status", "is_dummy"]);
sql += insert("asset_reconciliations", recs, ["id", "unit_id", "year", "total_items", "reconciled_items", "discrepancy_items", "note", "is_dummy"]);
sql += insert("asset_items", items, ["id", "reconciliation_id", "unit_id", "asset_number", "asset_name", "category", "location", "acquisition_date", "acquisition_cost", "useful_life", "aspect", "recorded_value", "expected_value", "note", "action", "status", "is_dummy"]);
sql += `commit;

-- Ringkasan per unit. Hasil yang diharapkan (temuan, jadwal, permindok, dokumen_unit, kepatuhan, rekon_aset, asesmen_aset):
--   dr 4,1,2,1,2,1,3 · kpw-01 4,1,2,1,0,1,3 · kpw-02 4,1,2,1,0,1,3
select u.id as unit,
  (select count(*) from public.findings f where f.unit_id = u.id) as temuan,
  (select count(*) from public.audit_schedules s where s.unit_id = u.id) as jadwal,
  (select count(*) from public.document_requests r where r.unit_id = u.id) as permindok,
  (select count(*) from public.documents d where d.scope = u.id) as dokumen_unit,
  (select count(*) from public.compliance_items c where c.unit_id = u.id) as kepatuhan,
  (select count(*) from public.asset_reconciliations a where a.unit_id = u.id) as rekon_aset,
  (select count(*) from public.asset_items i where i.unit_id = u.id) as asesmen_aset
from public.units u order by u.id;
`;
writeFileSync(join(root, "supabase/seed-minimal.sql"), sql);
console.log("supabase/seed-minimal.sql ditulis:", counts, `${sql.length.toLocaleString()} karakter`);

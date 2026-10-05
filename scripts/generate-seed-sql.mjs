#!/usr/bin/env node
// Membuat supabase/seed.sql dari data/sekar-dummy.json (data simulasi saja).
// Tidak membuat akun Auth maupun kata sandi.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ds = JSON.parse(readFileSync(join(root, "data/sekar-dummy.json"), "utf8"));

if (ds.metadata?.all_data_is_synthetic !== true) {
  console.error("Dataset bukan data simulasi; seed dibatalkan.");
  process.exit(1);
}

const lit = (v) => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

function insert(table, rows, cols) {
  if (!rows.length) return "";
  const values = rows.map((r) => `  (${cols.map((c) => lit(r[c])).join(", ")})`).join(",\n");
  return `insert into public.${table} (${cols.join(", ")}) values\n${values}\non conflict (id) do nothing;\n\n`;
}

let sql = `-- DIHASILKAN OTOMATIS oleh scripts/generate-seed-sql.mjs — jangan diedit manual.
-- Sumber: data/sekar-dummy.json (${ds.metadata.name} v${ds.metadata.version}, as_of ${ds.metadata.as_of}).
-- Seluruh data adalah SIMULASI. Tidak membuat akun Auth atau kata sandi.
begin;

`;
sql += insert("dataset_metadata", [{ id: 1, ...ds.metadata }], ["id", "name", "version", "as_of", "all_data_is_synthetic", "note"]);
sql += insert("units", ds.units, ["id", "name", "korwil", "is_dummy"]);
sql += insert("documents", ds.documents, ["id", "scope", "title", "kind", "content_text", "is_dummy"]);
sql += insert("findings", ds.findings, ["id", "unit_id", "year", "examiner", "area", "theme", "title", "summary", "recommendation", "status", "due_date", "completed_at", "pic", "is_repeat", "evidence_document_id", "is_dummy"]);
sql += insert("audit_schedules", ds.audit_schedules, ["id", "unit_id", "year", "examiner", "exam_type", "start_date", "end_date", "date_confirmed", "is_dummy"]);
sql += insert("document_requests", ds.document_requests, ["id", "schedule_id", "unit_id", "category", "title", "dr_note", "requested_at", "due_date", "submitted_at", "status", "document_id", "is_dummy"]);
sql += insert("reference_materials", ds.references, ["id", "scope", "area", "kind", "title", "description", "document_id", "is_dummy"]);
sql += insert("compliance_items", ds.compliance, ["id", "unit_id", "aspect", "pic", "due_date", "status", "is_dummy"]);
sql += insert("asset_reconciliations", ds.asset_reconciliations, ["id", "unit_id", "year", "total_items", "reconciled_items", "discrepancy_items", "note", "is_dummy"]);
sql += "commit;\n";

writeFileSync(join(root, "supabase/seed.sql"), sql);
console.log(`supabase/seed.sql ditulis (${sql.length.toLocaleString()} karakter).`);

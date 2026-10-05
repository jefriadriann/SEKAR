# Data dictionary

Seluruh tanggal YYYY-MM-DD; ID stabil berupa string. is_dummy selalu true. metadata.as_of adalah tanggal simulasi, bukan waktu update data nyata.

| Koleksi | Kunci dan relasi | Penggunaan |
|---|---|---|
| units | id; korwil nullable untuk DR | 46 KPw fiktif dan unit dr |
| findings | id, unit_id → units, evidence_document_id → documents atau null | Temuan individual; year tahun audit; examiner BPK/DAI/KAA; status selesai/dalam_proses/belum_ditindaklanjuti; due_date; completed_at nullable |
| audit_schedules | id, unit_id → units | start_date/end_date; date_confirmed=false berarti tentatif |
| document_requests | id, unit_id → units, schedule_id → audit_schedules, document_id → documents atau null | status lengkap/bertahap/dalam_proses/belum_dikirim; requested_at/due_date/submitted_at |
| references | id, document_id → documents | scope shared, kind worksheet/ketentuan/tutorial, delapan area |
| documents | id, scope adalah shared atau units.id | content_text untuk preview/unduh .txt simulasi; tidak ada URL dokumen eksternal |
| compliance | id, unit_id=dr | status selesai/dalam_proses/belum_dimulai |
| asset_reconciliations | id, unit_id → units | total_items = reconciled_items + discrepancy_items |
| demo_personas | id, role dr/kpw/admin, unit_id → units | Persona UX, bukan akun login atau mekanisme keamanan |

Scope: modul KPw mengecualikan dr. View DR dapat melihat semua KPw dan modul DR. Persona KPw hanya unit sendiri plus materi shared. Semua angka chart/KPI harus dihitung dari record yang sesuai scope/filter. Jumlah temuan dihitung per record; jumlah KPw terdampak menghitung unit_id unik. Status terlambat dihitung dari tenggat dan penyelesaian terhadap tanggal acuan, terpisah dari status proses.

## Pemetaan ke kode

| Koleksi JSON | Tipe TypeScript (`src/lib/types.ts`) | Tabel Supabase (opsional) |
|---|---|---|
| metadata | `DatasetMetadata` | `dataset_metadata` |
| units | `Unit` | `units` |
| findings | `Finding` | `findings` |
| audit_schedules | `AuditSchedule` | `audit_schedules` |
| document_requests | `DocumentRequest` | `document_requests` |
| references | `Reference` | `reference_materials` (`references` adalah kata kunci SQL) |
| documents | `SekarDocument` (+ `storage_path` opsional di Supabase) | `documents` |
| compliance | `ComplianceItem` | `compliance_items` |
| asset_reconciliations | `AssetReconciliation` | `asset_reconciliations` |
| demo_personas | `DemoPersona` (mode dummy saja) | — (diganti `user_access` + Auth) |

Nilai enum: examiner `BPK`/`DAI`/`KAA`; status temuan `selesai`/`dalam_proses`/`belum_ditindaklanjuti`; status permindok `lengkap`/`bertahap`/`dalam_proses`/`belum_dikirim`; status kepatuhan `selesai`/`dalam_proses`/`belum_dimulai`; jenis referensi `worksheet`/`ketentuan`/`tutorial`.

Nilai turunan (tidak disimpan, dihitung dari tanggal acuan):

- Ketepatan waktu temuan: `tepat_waktu`, `terlambat_selesai`, `lewat_tenggat`, `belum_jatuh_tempo` (`src/lib/analytics/findings.ts`).
- Ketepatan waktu permindok: `tepat_waktu`, `terlambat`, `lewat_tenggat`, `belum_jatuh_tempo` (`src/lib/analytics/permindok.ts`).
- Status jadwal: `selesai`, `berlangsung`, `mendatang` (+ "mulai ≤ 7 hari") (`src/lib/analytics/schedules.ts`).

Validasi import (`src/lib/validation.ts`): struktur & tipe kolom, ID unik, foreign key, enum, tanggal YYYY-MM-DD valid, `end_date ≥ start_date`, `due_date ≥ requested_at`, `submitted_at ≥ requested_at`, konsistensi `status`/`completed_at`, `total_items = reconciled_items + discrepancy_items`, `is_dummy: true`, `all_data_is_synthetic: true`, unit `dr` wajib ada, persona untuk ketiga peran.

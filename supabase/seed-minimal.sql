-- SEKAR — SEED MINIMAL untuk uji keamanan (Supabase SQL Editor). DATA SIMULASI.
-- Subset persis dari supabase/seed.sql (ID & isi identik): seed lengkap nanti tidak bentrok.
-- Aman dijalankan ulang: hanya INSERT ... ON CONFLICT (id) DO NOTHING; tanpa DELETE/UPDATE.
-- Tidak membuat akun, kata sandi, atau user_access. Prasyarat: migration 0001 + 0002.
-- Jumlah: units 3, documents 5, findings 12, audit_schedules 3, document_requests 6, reference_materials 2, compliance_items 2, asset_reconciliations 3, asset_items 9, dataset_metadata 1.
begin;

insert into public.dataset_metadata (id, name, version, as_of, all_data_is_synthetic, note) values
  (1, 'SEKAR Dummy Dataset', '1.3', '2026-10-05', true, '46 KPw fiktif, bukan daftar kantor resmi. Angka dan uraian tidak mewakili kondisi BI. v1.3: data diperluas secara deterministik (scripts/generate-dummy-data.mjs) — temuan multi-tahun KPw & DR, rincian asesmen aset per nomor aset, serta materi SGo/ketentuan/video demo.')
on conflict (id) do nothing;

insert into public.units (id, name, korwil, is_dummy) values
  ('kpw-01', 'KPw Simulasi 01', 'Sumatera', true),
  ('kpw-02', 'KPw Simulasi 02', 'Jawa', true),
  ('dr', 'Departemen Regional — Simulasi', null, true)
on conflict (id) do nothing;

insert into public.documents (id, scope, title, kind, content_text, file_url, is_dummy) values
  ('DOC-0094', 'kpw-02', '[SIMULASI] Bukti TMN-0094', 'bukti', 'DOKUMEN SIMULASI. Tidak mengandung data audit asli.', null, true),
  ('DOC-1053', 'kpw-01', '[SIMULASI] Bukti tindak lanjut TMN-1277', 'bukti', 'DOKUMEN SIMULASI. Bukti tindak lanjut atas temuan "Penyetoran pajak melewati batas waktu" (Keuangan Intern) pada KPw Simulasi 01. Tidak mengandung data audit asli.', null, true),
  ('DOC-1204', 'dr', '[SIMULASI] Bukti tindak lanjut DR-TMN-069', 'bukti', 'DOKUMEN SIMULASI. Bukti tindak lanjut atas temuan "Serah terima pekerjaan melewati jadwal kontrak" (Pengadaan) pada Departemen Regional — Simulasi. Tidak mengandung data audit asli.', null, true),
  ('MAT-REF-1-ws-pengendalian', 'shared', '[SIMULASI] Worksheet Pengendalian Aset', 'worksheet', 'WORKSHEET SIMULASI (Excel). Lembar: Pengendalian, Matriks Risiko, Petunjuk.

No	Proses	Risiko	Pengendalian Kunci	Jenis	Frekuensi	Prosedur Pengujian	Jumlah Sampel	Hasil Pengujian	Kesimpulan	Rekomendasi	Referensi Ketentuan
1	Perencanaan aset	Pengadaan aset tidak sesuai kebutuhan	Reviu kebutuhan berjenjang oleh kepala unit	Preventif	Tahunan	Ambil sampel dan uji apakah ''reviu kebutuhan berjenjang oleh kepala unit'' dijalankan dan terdokumentasi.	5	Seluruh sampel sesuai.	Efektif	-	PADGI SIM/ASET Pasal 3
2	Pencatatan aset	Harga perolehan/umur ekonomis salah input	Verifikasi dokumen sumber oleh pejabat kedua (dual control)	Preventif	Setiap perolehan	Ambil sampel dan uji apakah ''verifikasi dokumen sumber oleh pejabat kedua (dual control)'' dijalankan dan terdokumentasi.	8	2 sampel tidak didukung bukti.	Tidak efektif	Perkuat dokumentasi pengendalian dan lakukan reviu berjenjang.	PADGI SIM/ASET Pasal 4
3	Penatausahaan aset	Lokasi aset tidak sesuai catatan	Rekonsiliasi KIR dengan aplikasi aset	Detektif	Semesteran	Ambil sampel dan uji apakah ''rekonsiliasi kir dengan aplikasi aset'' dijalankan dan terdokumentasi.	11	Seluruh sampel sesuai.	Efektif	-	PADGI SIM/ASET Pasal 5
4	Inventarisasi fisik	Aset hilang tidak terdeteksi	Inventarisasi oleh tim independen + BA selisih	Detektif	Tahunan	Ambil sampel dan uji apakah ''inventarisasi oleh tim independen + ba selisih'' dijalankan dan terdokumentasi.	14	Seluruh sampel sesuai.	Efektif	-	PADGI SIM/ASET Pasal 6', '/demo/sgo/aset-ws-pengendalian.xlsx', true),
  ('MAT-REF-1-pdg', 'shared', '[SIMULASI] PDG No. 01/SIM/PDG/2025 — Pengelolaan Aset Tetap', 'ketentuan', 'KETENTUAN SIMULASI (PDF). Peraturan Dewan Gubernur (Simulasi) No. 01/SIM/PDG/2025 tentang Pengelolaan Aset Tetap. Bukan ketentuan resmi Bank Indonesia.', '/demo/ketentuan/aset-pdg.pdf', true)
on conflict (id) do nothing;

insert into public.findings (id, unit_id, year, examiner, area, theme, title, summary, recommendation, status, due_date, completed_at, pic, is_repeat, evidence_document_id, is_dummy) values
  ('DR-TMN-069', 'dr', 2025, 'BPK', 'Pengadaan', 'Pemantauan tindak lanjut', 'Serah terima pekerjaan melewati jadwal kontrak', '[DATA DUMMY] Serah terima pekerjaan dilakukan melewati jadwal dalam kontrak.', '[DATA DUMMY] Pantau jadwal kontrak dan terapkan ketentuan keterlambatan.', 'selesai', '2025-10-31', '2025-11-06', 'Kelompok Simulasi C', false, 'DOC-1204', true),
  ('DR-TMN-017', 'dr', 2026, 'KAA', 'Pengadaan', 'Dokumentasi', '[DATA DUMMY] Evaluasi proses DR 17', '[DATA DUMMY] Bukti pelaksanaan pengendalian perlu dilengkapi.', '[DATA DUMMY] Lengkapi bukti dan pemantauan berkala.', 'dalam_proses', '2026-12-20', null, 'Kelompok Simulasi C', false, null, true),
  ('DR-TMN-023', 'dr', 2026, 'KAA', 'PI-KEKDA', 'Dokumentasi', '[DATA DUMMY] Evaluasi proses DR 23', '[DATA DUMMY] Bukti pelaksanaan pengendalian perlu dilengkapi.', '[DATA DUMMY] Lengkapi bukti dan pemantauan berkala.', 'belum_ditindaklanjuti', '2026-12-20', null, 'Kelompok Simulasi C', false, null, true),
  ('DR-TMN-001', 'dr', 2026, 'DAI', 'Pengadaan', 'Dokumentasi', '[DATA DUMMY] Evaluasi proses DR 1', '[DATA DUMMY] Bukti pelaksanaan pengendalian perlu dilengkapi.', '[DATA DUMMY] Lengkapi bukti dan pemantauan berkala.', 'selesai', '2026-11-20', '2026-09-20', 'Kelompok Simulasi B', false, null, true),
  ('TMN-1277', 'kpw-01', 2026, 'KAA', 'Keuangan Intern', 'Dokumentasi', 'Penyetoran pajak melewati batas waktu', '[DATA DUMMY] Penyetoran pajak atas transaksi tertentu dilakukan setelah batas waktu.', '[DATA DUMMY] Gunakan kalender pajak dan pemantauan harian.', 'selesai', '2026-06-09', '2026-04-21', 'PIC Simulasi 3', false, 'DOC-1053', true),
  ('TMN-0139', 'kpw-01', 2026, 'DAI', 'Pengamanan', 'Pemantauan tindak lanjut', 'Simulasi kelengkapan pengendalian pengamanan', '[DATA DUMMY] Sampel 139: dokumentasi proses pengamanan belum diperbarui secara konsisten.', '[DATA DUMMY] Perbarui dokumentasi, lakukan pemeriksaan berjenjang, dan catat tindak lanjut.', 'dalam_proses', '2026-12-19', null, 'PIC Simulasi 5', false, null, true),
  ('TMN-1278', 'kpw-01', 2026, 'DAI', 'Perizinan dan Pengawasan SP', 'Kepatuhan prosedur', 'Tindak lanjut hasil pengawasan belum dipantau', '[DATA DUMMY] Tindak lanjut atas hasil pengawasan belum dipantau secara terdokumentasi.', '[DATA DUMMY] Susun daftar pantau tindak lanjut hasil pengawasan.', 'belum_ditindaklanjuti', '2026-10-22', null, 'PIC Simulasi 4', true, null, true),
  ('TMN-1279', 'kpw-01', 2026, 'DAI', 'PUR', 'Kepatuhan prosedur', 'Pencatatan pemusnahan uang belum tepat waktu', '[DATA DUMMY] Pencatatan hasil pemusnahan uang terlambat dimutakhirkan.', '[DATA DUMMY] Mutakhirkan pencatatan pada hari yang sama.', 'dalam_proses', '2026-08-14', null, 'PIC Simulasi 6', true, null, true),
  ('TMN-0094', 'kpw-02', 2026, 'DAI', 'Perizinan dan Pengawasan SP', 'Kepatuhan prosedur', 'Simulasi kelengkapan pengendalian perizinan dan pengawasan sp', '[DATA DUMMY] Sampel 94: dokumentasi proses perizinan dan pengawasan sp belum diperbarui secara konsisten.', '[DATA DUMMY] Perbarui dokumentasi, lakukan pemeriksaan berjenjang, dan catat tindak lanjut.', 'selesai', '2026-12-19', '2026-12-09', 'PIC Simulasi 5', false, 'DOC-0094', true),
  ('TMN-1284', 'kpw-02', 2026, 'KAA', 'Pengamanan', 'Pemantauan tindak lanjut', 'Latihan tanggap darurat belum dilaksanakan', '[DATA DUMMY] Latihan tanggap darurat tahunan belum dilaksanakan.', '[DATA DUMMY] Jadwalkan dan laksanakan latihan tanggap darurat.', 'dalam_proses', '2026-09-17', null, 'PIC Simulasi 5', false, null, true),
  ('TMN-1283', 'kpw-02', 2026, 'BPK', 'Perizinan dan Pengawasan SP', 'Dokumentasi', 'Tindak lanjut hasil pengawasan belum dipantau', '[DATA DUMMY] Tindak lanjut atas hasil pengawasan belum dipantau secara terdokumentasi.', '[DATA DUMMY] Susun daftar pantau tindak lanjut hasil pengawasan.', 'belum_ditindaklanjuti', '2026-09-21', null, 'PIC Simulasi 7', true, null, true),
  ('TMN-1285', 'kpw-02', 2026, 'BPK', 'PI-KEKDA', 'Rekonsiliasi', 'Kajian ekonomi daerah belum terdokumentasi lengkap', '[DATA DUMMY] Kertas kerja kajian ekonomi daerah belum tersimpan sistematis.', '[DATA DUMMY] Susun dan arsipkan kertas kerja kajian secara terstruktur.', 'belum_ditindaklanjuti', '2026-08-16', null, 'PIC Simulasi 2', false, null, true)
on conflict (id) do nothing;

insert into public.audit_schedules (id, unit_id, year, examiner, exam_type, start_date, end_date, date_confirmed, is_dummy) values
  ('JAD-040', 'dr', 2026, 'DAI', 'Interim', '2026-12-24', '2026-12-30', true, true),
  ('JAD-157', 'kpw-01', 2026, 'BPK', 'LKTBI', '2026-03-02', '2026-03-11', true, true),
  ('JAD-204', 'kpw-02', 2027, 'KAA', 'Tematik', '2027-06-21', '2027-06-25', true, true)
on conflict (id) do nothing;

insert into public.document_requests (id, schedule_id, unit_id, category, title, dr_note, requested_at, due_date, submitted_at, status, document_id, is_dummy) values
  ('PMD-040', 'JAD-040', 'dr', 'Keuangan', '[DATA DUMMY] Permintaan dokumen simulasi 40', '[DATA DUMMY] Lengkapi dokumen sesuai daftar permintaan.', '2026-12-12', '2026-12-19', '2026-12-19', 'lengkap', null, true),
  ('PMD-080', 'JAD-040', 'dr', 'Keuangan', '[DATA DUMMY] Permintaan dokumen simulasi 80', '[DATA DUMMY] Lengkapi dokumen sesuai daftar permintaan.', '2026-12-12', '2026-12-19', '2026-12-20', 'lengkap', null, true),
  ('PMD-632', 'JAD-157', 'kpw-01', 'Lainnya', '[DATA DUMMY] Notulen rapat koordinasi', '[DATA DUMMY] Pisahkan dokumen per kegiatan agar mudah ditelusuri.', '2026-02-23', '2026-03-04', '2026-03-01', 'lengkap', null, true),
  ('PMD-633', 'JAD-157', 'kpw-01', 'Pengadaan', '[DATA DUMMY] Rekapitulasi harga perkiraan sendiri', '[DATA DUMMY] Dokumen pendukung belum lengkap, mohon dilengkapi.', '2026-02-14', '2026-02-23', '2026-02-19', 'lengkap', null, true),
  ('PMD-837', 'JAD-204', 'kpw-02', 'Aset', '[DATA DUMMY] Daftar aset tetap terkini', '[DATA DUMMY] Sertakan tanda terima dan beri watermark pada dokumen.', '2027-06-07', '2027-06-14', null, 'belum_dikirim', null, true),
  ('PMD-838', 'JAD-204', 'kpw-02', 'Keuangan', '[DATA DUMMY] Daftar pertanggungjawaban uang muka', '[DATA DUMMY] Pisahkan dokumen per kegiatan agar mudah ditelusuri.', '2027-06-11', '2027-06-21', null, 'belum_dikirim', null, true)
on conflict (id) do nothing;

insert into public.reference_materials (id, scope, area, kind, subkind, title, description, document_id, is_dummy) values
  ('REF-1-ws-pengendalian', 'shared', 'Aset', 'worksheet', 'ws_pengendalian', '[SIMULASI] Worksheet Pengendalian Aset', 'Pemetaan risiko, pengendalian kunci, prosedur pengujian, dan kesimpulan efektivitas.', 'MAT-REF-1-ws-pengendalian', true),
  ('REF-1-pdg', 'shared', 'Aset', 'ketentuan', 'pdg', '[SIMULASI] PDG No. 01/SIM/PDG/2025 — Pengelolaan Aset Tetap', 'Peraturan Dewan Gubernur (simulasi) tentang Pengelolaan Aset Tetap.', 'MAT-REF-1-pdg', true)
on conflict (id) do nothing;

insert into public.compliance_items (id, unit_id, aspect, pic, due_date, status, is_dummy) values
  ('KPT-01', 'dr', '[SIMULASI] Kewajiban pelaporan 1', 'Kelompok Simulasi 2', '2026-09-08', 'dalam_proses', true),
  ('KPT-02', 'dr', '[SIMULASI] Kewajiban pelaporan 2', 'Kelompok Simulasi 3', '2026-09-11', 'belum_dimulai', true)
on conflict (id) do nothing;

insert into public.asset_reconciliations (id, unit_id, year, total_items, reconciled_items, discrepancy_items, note, is_dummy) values
  ('AST-188', 'dr', 2026, 381, 367, 14, '[DATA DUMMY] Rincian asesmen per aset tersedia.', true),
  ('AST-01', 'kpw-01', 2026, 111, 101, 10, '[DATA DUMMY] Rincian asesmen per aset tersedia.', true),
  ('AST-02', 'kpw-02', 2026, 122, 112, 10, '[DATA DUMMY] Rincian asesmen per aset tersedia.', true)
on conflict (id) do nothing;

insert into public.asset_items (id, reconciliation_id, unit_id, asset_number, asset_name, category, location, acquisition_date, acquisition_cost, useful_life, aspect, recorded_value, expected_value, note, action, status, is_dummy) values
  ('ASI-01242', 'AST-188', 'dr', '3.10.02.05.262/DR/2025', 'Printer multifungsi', 'Peralatan TI', 'Ruang Kas', '2025-01-04', 10450000, 4, 'lokasi', 'Ruang Kas', 'Ruang Rapat Utama', '[DATA DUMMY] Aset berada di Ruang Rapat Utama, berbeda dengan kartu inventaris ruangan; mutasi belum dicatat.', 'mutasi', 'selesai', true),
  ('ASI-01243', 'AST-188', 'dr', '3.10.02.05.262/DR/2025', 'Printer multifungsi', 'Peralatan TI', 'Ruang Kas', '2025-01-04', 10450000, 4, 'satuan_aset', '1 nomor aset', '4 unit fisik/komponen terpisah', '[DATA DUMMY] Satu nomor aset mencakup 4 komponen dengan umur dan lokasi berbeda sehingga nilainya tidak dapat ditelusuri per unit.', 'split', 'belum_ditindaklanjuti', true),
  ('ASI-01244', 'AST-188', 'dr', '3.10.02.05.262/DR/2025', 'Printer multifungsi', 'Peralatan TI', 'Ruang Kas', '2025-01-04', 10450000, 4, 'dokumen_kepemilikan', 'Dokumen lengkap', 'Kontrak/BAST perolehan tidak ditemukan', '[DATA DUMMY] Dokumen kepemilikan/perolehan belum diarsipkan sehingga bukti kepemilikan lemah.', 'penatausahaan', 'dalam_proses', true),
  ('ASI-00578', 'AST-01', 'kpw-01', '3.10.02.05.187/KPW01/2021', 'Printer multifungsi', 'Peralatan TI', 'Ruang Pertemuan', '2021-11-19', 13600000, 4, 'dokumen_kepemilikan', 'Dokumen lengkap', 'Kontrak/BAST perolehan tidak ditemukan', '[DATA DUMMY] Dokumen kepemilikan/perolehan belum diarsipkan sehingga bukti kepemilikan lemah.', 'penatausahaan', 'selesai', true),
  ('ASI-00579', 'AST-01', 'kpw-01', '3.10.02.05.187/KPW01/2021', 'Printer multifungsi', 'Peralatan TI', 'Ruang Pertemuan', '2021-11-19', 13600000, 4, 'harga_perolehan', 'Rp13.600.000', 'Rp12.000.000 (sesuai faktur/BAST)', '[DATA DUMMY] Harga perolehan tercatat berbeda Rp1.600.000 dari dokumen sumber; biaya non-kapitalisasi ikut dicatat.', 'koreksi_nilai', 'selesai', true),
  ('ASI-00580', 'AST-01', 'kpw-01', '3.10.02.11.267/KPW01/2023', 'Perangkat jaringan (switch)', 'Peralatan TI', 'Ruang Layanan', '2023-07-04', 22550000, 5, 'kondisi_fisik', 'Baik', 'Rusak berat, tidak dapat diperbaiki', '[DATA DUMMY] Kondisi fisik rusak berat namun masih tercatat aktif dan disusutkan.', 'penghapusan', 'dalam_proses', true),
  ('ASI-00594', 'AST-02', 'kpw-02', '3.05.02.01.448/KPW02/2024', 'Meja rapat', 'Inventaris Kantor', 'Ruang Fungsi Ekonomi', '2024-02-05', 15000000, 8, 'keberadaan_fisik', 'Tercatat aktif', 'Tidak ditemukan saat inventarisasi', '[DATA DUMMY] Aset tidak ditemukan pada lokasi tercatat maupun ruangan lain; belum ada berita acara kehilangan.', 'penghapusan', 'dalam_proses', true),
  ('ASI-00595', 'AST-02', 'kpw-02', '3.05.01.04.085/KPW02/2024', 'Lemari arsip', 'Inventaris Kantor', 'Ruang Kepala Kantor', '2024-03-17', 5100000, 14, 'umur_ekonomis', '14 tahun', '8 tahun (tabel kebijakan)', '[DATA DUMMY] Umur ekonomis di aplikasi 14 tahun, sedangkan kebijakan untuk kategori Inventaris Kantor adalah 8 tahun; beban penyusutan menjadi tidak tepat.', 'penyesuaian_umur', 'selesai', true),
  ('ASI-00596', 'AST-02', 'kpw-02', '3.07.03.05.539/KPW02/2024', 'Mesin sortir uang', 'Peralatan Khusus', 'Ruang Kepala Kantor', '2024-06-21', 621050000, 10, 'lokasi', 'Ruang Kepala Kantor', 'Ruang Kas', '[DATA DUMMY] Aset berada di Ruang Kas, berbeda dengan kartu inventaris ruangan; mutasi belum dicatat.', 'mutasi', 'dalam_proses', true)
on conflict (id) do nothing;

commit;

-- Ringkasan per unit (hasil yang diharapkan tercantum di docs/SUPABASE.md).
select u.id as unit,
  (select count(*) from public.findings f where f.unit_id = u.id) as temuan,
  (select count(*) from public.audit_schedules s where s.unit_id = u.id) as jadwal,
  (select count(*) from public.document_requests r where r.unit_id = u.id) as permindok,
  (select count(*) from public.documents d where d.scope = u.id) as dokumen_unit,
  (select count(*) from public.compliance_items c where c.unit_id = u.id) as kepatuhan,
  (select count(*) from public.asset_reconciliations a where a.unit_id = u.id) as rekon_aset,
  (select count(*) from public.asset_items i where i.unit_id = u.id) as asesmen_aset
from public.units u order by u.id;

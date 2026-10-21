#!/usr/bin/env node
/**
 * Memperluas dataset simulasi SEKAR secara deterministik.
 *
 *   node scripts/generate-dummy-data.mjs
 *
 * Masukan : data/base/sekar-dummy-v1.json (paket awal, tidak diubah)
 * Keluaran: data/sekar-dummy.json
 *
 * Seluruh record asli dipertahankan apa adanya (termasuk 24 temuan DR) dan
 * ditambah record baru yang konsisten: temuan KPw multi-tahun, jadwal 2025–2027,
 * permintaan dokumen per jadwal, rekonsiliasi aset 2023–2026, kewajiban DR,
 * materi pedoman, dan dokumen bukti. Semua tetap bertanda data dummy.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = JSON.parse(readFileSync(join(root, "data/base/sekar-dummy-v1.json"), "utf8"));
const ds = structuredClone(base);
const AS_OF = ds.metadata.as_of;

// PRNG deterministik (mulberry32).
let seed = 20261007;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const pad = (n, w) => String(n).padStart(w, "0");

const iso = (d) => d.toISOString().slice(0, 10);
const date = (s) => new Date(`${s}T00:00:00Z`);
const addDays = (s, n) => {
  const d = date(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const minDate = (a, b) => (a < b ? a : b);

// Korwil mengikuti urutan geografis 46 wilayah (Aceh → Papua Barat), selaras dengan ilustrasi landmark.
const REGIONS = JSON.parse(readFileSync(join(root, "data/base/kpw-regions.json"), "utf8")).regions;
for (const u of ds.units) {
  const r = REGIONS.find((x) => x.unit_id === u.id);
  if (r) u.korwil = r.korwil;
}
const KPW = ds.units.filter((u) => u.id !== "dr");
const AREAS = ["Aset", "Keuangan Intern", "PI-KEKDA", "PSBI / EPML", "PUR", "Pengadaan", "Pengamanan", "Perizinan dan Pengawasan SP"];
const THEMES = ["Dokumentasi", "Kepatuhan prosedur", "Pemantauan tindak lanjut", "Rekonsiliasi"];
const EXAMINERS = ["BPK", "DAI", "KAA"];
const PICS = Array.from({ length: 9 }, (_, i) => `PIC Simulasi ${i + 1}`);

/** Template temuan per area: [judul, uraian, rekomendasi]. Semua fiktif. */
const FINDING_TEMPLATES = {
  Aset: [
    ["Selisih hasil inventarisasi fisik aset tetap", "Jumlah aset hasil inventarisasi fisik berbeda dengan catatan pada aplikasi aset.", "Lakukan rekonsiliasi berkala dan tindak lanjuti selisih dengan berita acara."],
    ["Aset belum diberi label identitas", "Sebagian aset tetap belum memiliki label kode barang yang mutakhir.", "Lengkapi pelabelan aset dan mutakhirkan daftar inventaris."],
    ["Aset rusak berat belum diusulkan penghapusan", "Aset dengan kondisi rusak berat masih tercatat aktif.", "Susun usulan penghapusan aset sesuai prosedur."],
    ["Dokumen kepemilikan aset belum lengkap", "Arsip dokumen kepemilikan beberapa aset belum tersimpan lengkap.", "Lengkapi dan arsipkan dokumen kepemilikan aset."],
    ["Umur ekonomis aset tidak sesuai kebijakan", "Umur ekonomis beberapa aset pada aplikasi berbeda dengan tabel kebijakan akuntansi.", "Koreksi umur ekonomis dan hitung ulang penyusutan."],
    ["Harga perolehan aset tidak didukung dokumen sumber", "Nilai perolehan aset tercatat berbeda dengan faktur/kontrak.", "Telusuri dokumen sumber dan buat jurnal koreksi."],
    ["Aset gabungan belum dipecah per komponen", "Beberapa aset dengan komponen berbeda dicatat dalam satu nomor aset.", "Lakukan split aset per komponen."],
    ["Mutasi aset antarruang belum dicatat", "Lokasi fisik aset berbeda dengan lokasi pada kartu inventaris ruangan.", "Proses mutasi aset dan mutakhirkan KIR."],
  ],
  "Keuangan Intern": [
    ["Pertanggungjawaban uang muka melampaui batas waktu", "Penyelesaian pertanggungjawaban uang muka kegiatan melewati batas waktu.", "Pantau batas waktu pertanggungjawaban dan beri pengingat berjenjang."],
    ["Bukti pendukung pembayaran belum lengkap", "Beberapa transaksi pembayaran belum dilengkapi bukti pendukung memadai.", "Lengkapi bukti pendukung sebelum pembayaran diproses."],
    ["Rekonsiliasi rekening antara belum dilakukan tepat waktu", "Rekonsiliasi rekening antara bulanan terlambat dilakukan.", "Lakukan rekonsiliasi secara berkala dan dokumentasikan hasilnya."],
    ["Pencatatan beban belum sesuai periode", "Terdapat beban yang dicatat tidak pada periode terjadinya.", "Perkuat reviu pencatatan akhir periode."],
    ["Penyetoran pajak melewati batas waktu", "Penyetoran pajak atas transaksi tertentu dilakukan setelah batas waktu.", "Gunakan kalender pajak dan pemantauan harian."],
    ["Otorisasi pembayaran belum berjenjang", "Sebagian pembayaran diotorisasi tanpa pejabat kedua.", "Terapkan otorisasi berjenjang sesuai batas kewenangan."],
  ],
  "PI-KEKDA": [
    ["Kajian ekonomi daerah belum terdokumentasi lengkap", "Kertas kerja kajian ekonomi daerah belum tersimpan sistematis.", "Susun dan arsipkan kertas kerja kajian secara terstruktur."],
    ["Diseminasi hasil kajian belum terjadwal", "Kegiatan diseminasi hasil kajian belum memiliki jadwal rutin.", "Tetapkan kalender diseminasi dan pantau pelaksanaannya."],
    ["Data survei belum divalidasi berjenjang", "Hasil survei belum melalui validasi berjenjang sebelum digunakan.", "Terapkan validasi berjenjang atas data survei."],
    ["Rekomendasi kebijakan belum dipantau", "Rekomendasi kebijakan kepada pemda belum dipantau realisasinya.", "Susun daftar pantau rekomendasi kebijakan."],
  ],
  "PSBI / EPML": [
    ["Pemantauan program sosial belum berkala", "Pemantauan pelaksanaan program sosial belum dilakukan berkala.", "Susun jadwal pemantauan dan laporkan hasilnya."],
    ["Laporan pertanggungjawaban penerima program terlambat", "Laporan pertanggungjawaban dari penerima program diterima melewati tenggat.", "Tetapkan tenggat dan mekanisme pengingat kepada penerima program."],
    ["Dokumentasi seleksi penerima program belum lengkap", "Dokumentasi proses seleksi penerima program belum lengkap.", "Lengkapi dokumentasi seleksi sesuai pedoman."],
    ["Aset program belum diserahterimakan", "Aset hasil program belum disertai berita acara serah terima kepada penerima.", "Lengkapi berita acara serah terima aset program."],
  ],
  PUR: [
    ["Selisih hasil penghitungan kas titipan", "Ditemukan selisih administrasi pada hasil penghitungan kas titipan.", "Lakukan penghitungan ulang dan perkuat dual control."],
    ["Jadwal kas keliling belum dievaluasi", "Efektivitas jadwal layanan kas keliling belum dievaluasi berkala.", "Evaluasi jadwal layanan kas keliling setiap semester."],
    ["Pencatatan pemusnahan uang belum tepat waktu", "Pencatatan hasil pemusnahan uang terlambat dimutakhirkan.", "Mutakhirkan pencatatan pada hari yang sama."],
    ["Pemeriksaan mendadak kas belum terjadwal", "Pemeriksaan mendadak atas kas belum dilakukan sesuai frekuensi.", "Tetapkan jadwal pemeriksaan mendadak dan dokumentasikan."],
  ],
  Pengadaan: [
    ["Dokumen pengadaan belum lengkap", "Dokumen pendukung proses pengadaan belum seluruhnya tersedia.", "Lengkapi dokumen pengadaan sesuai daftar periksa."],
    ["Harga perkiraan sendiri belum didukung survei memadai", "Penyusunan harga perkiraan sendiri belum didukung data survei yang memadai.", "Dokumentasikan survei harga sebagai dasar penyusunan."],
    ["Serah terima pekerjaan melewati jadwal kontrak", "Serah terima pekerjaan dilakukan melewati jadwal dalam kontrak.", "Pantau jadwal kontrak dan terapkan ketentuan keterlambatan."],
    ["Perencanaan kebutuhan belum didukung analisis", "Perencanaan kebutuhan pengadaan belum didukung analisis kebutuhan.", "Perkuat analisis kebutuhan dalam perencanaan pengadaan."],
  ],
  Pengamanan: [
    ["Uji fungsi perangkat pengamanan belum rutin", "Uji fungsi perangkat pengamanan belum dilakukan sesuai jadwal.", "Laksanakan uji fungsi berkala dan catat hasilnya."],
    ["Log akses area terbatas belum direviu", "Log akses ke area terbatas belum direviu secara berkala.", "Lakukan reviu log akses secara berkala."],
    ["Latihan tanggap darurat belum dilaksanakan", "Latihan tanggap darurat tahunan belum dilaksanakan.", "Jadwalkan dan laksanakan latihan tanggap darurat."],
    ["Hak akses pegawai mutasi belum dicabut", "Hak akses area terbatas pegawai yang telah mutasi masih aktif.", "Cabut hak akses dan reviu daftar akses bulanan."],
  ],
  "Perizinan dan Pengawasan SP": [
    ["Pengawasan penyelenggara belum sesuai rencana", "Realisasi kegiatan pengawasan belum sesuai rencana kerja.", "Evaluasi rencana pengawasan dan pantau realisasinya."],
    ["Tindak lanjut hasil pengawasan belum dipantau", "Tindak lanjut atas hasil pengawasan belum dipantau secara terdokumentasi.", "Susun daftar pantau tindak lanjut hasil pengawasan."],
    ["Dokumen perizinan belum diarsipkan terpusat", "Dokumen perizinan belum tersimpan pada arsip terpusat.", "Pindahkan dan kelola dokumen perizinan pada arsip terpusat."],
  ],
};

const REQUEST_TITLES = {
  Pengadaan: ["Daftar kontrak pengadaan", "Dokumen perencanaan pengadaan", "Berita acara serah terima pekerjaan", "Rekapitulasi harga perkiraan sendiri"],
  Aset: ["Daftar aset tetap terkini", "Berita acara inventarisasi fisik", "Kartu inventaris ruangan", "Usulan penghapusan aset"],
  SDM: ["Struktur organisasi dan nama personel", "Rekap kehadiran pegawai", "Daftar pelatihan pegawai", "Dokumen penilaian kinerja"],
  Keuangan: ["Rekonsiliasi rekening antara", "Daftar pertanggungjawaban uang muka", "Laporan realisasi anggaran", "Bukti pembayaran kegiatan"],
  Lainnya: ["Notulen rapat koordinasi", "Laporan kegiatan triwulanan", "Daftar risiko unit kerja", "Rencana kerja tahunan"],
};
const DR_NOTES = [
  "Lengkapi dokumen sesuai daftar permintaan.",
  "Sertakan tanda terima dan beri watermark pada dokumen.",
  "Dokumen pendukung belum lengkap, mohon dilengkapi.",
  "Mohon sampaikan versi final yang telah ditandatangani.",
  "Pisahkan dokumen per kegiatan agar mudah ditelusuri.",
];

// ---------------------------------------------------------------- temuan KPw
let tmn = Math.max(...ds.findings.filter((f) => f.id.startsWith("TMN-")).map((f) => Number(f.id.slice(4))));
let doc = Math.max(...ds.documents.filter((d) => d.id.startsWith("DOC-")).map((d) => Number(d.id.slice(4))));

for (const year of [2022, 2023, 2024, 2025, 2026]) {
  for (const unit of KPW) {
    const n = year === 2026 ? int(5, 9) : int(4, 7);
    for (let i = 0; i < n; i++) {
      const area = pick(AREAS);
      const [title, summary, rec] = pick(FINDING_TEMPLATES[area]);
      const examiner = pick(EXAMINERS);
      const audit = `${year}-${pad(int(2, 10), 2)}-${pad(int(1, 28), 2)}`;
      const due = addDays(audit, int(90, 240));
      const old = due < addDays(AS_OF, -60);
      let status;
      if (old) status = chance(0.86) ? "selesai" : chance(0.6) ? "dalam_proses" : "belum_ditindaklanjuti";
      else status = chance(0.32) ? "selesai" : chance(0.65) ? "dalam_proses" : "belum_ditindaklanjuti";
      let completed = null;
      if (status === "selesai") {
        completed = minDate(addDays(due, chance(0.8) ? -int(5, 70) : int(3, 45)), AS_OF);
        if (completed <= audit) completed = addDays(audit, int(20, 60));
        completed = minDate(completed, AS_OF);
      }
      tmn += 1;
      const id = `TMN-${pad(tmn, 4)}`;
      let evidence = null;
      if (status === "selesai" && chance(0.9)) {
        doc += 1;
        evidence = `DOC-${pad(doc, 4)}`;
        ds.documents.push({
          id: evidence,
          scope: unit.id,
          title: `[SIMULASI] Bukti tindak lanjut ${id}`,
          kind: "bukti",
          content_text: `DOKUMEN SIMULASI. Bukti tindak lanjut atas temuan "${title}" (${area}) pada ${unit.name}. Tidak mengandung data audit asli.`,
          is_dummy: true,
        });
      }
      ds.findings.push({
        id,
        unit_id: unit.id,
        year,
        examiner,
        area,
        theme: pick(THEMES),
        title,
        summary: `[DATA DUMMY] ${summary}`,
        recommendation: `[DATA DUMMY] ${rec}`,
        status,
        due_date: due,
        completed_at: completed,
        pic: pick(PICS),
        is_repeat: chance(0.18),
        evidence_document_id: evidence,
        is_dummy: true,
      });
    }
  }
}

// ---------------------------------------------------------------- temuan DR (riwayat 2022–2025)
// 24 temuan DR 2026 dari paket awal tetap utuh; riwayat tahun sebelumnya ditambahkan.
const DR = ds.units.find((u) => u.id === "dr");
const DR_GROUPS = ["Kelompok Simulasi A", "Kelompok Simulasi B", "Kelompok Simulasi C"];
let drTmn = ds.findings.filter((f) => f.unit_id === "dr").length;
for (const year of [2022, 2023, 2024, 2025]) {
  const n = int(12, 18);
  for (let i = 0; i < n; i++) {
    const area = pick(AREAS);
    const [title, summary, rec] = pick(FINDING_TEMPLATES[area]);
    const audit = `${year}-${pad(int(2, 10), 2)}-${pad(int(1, 28), 2)}`;
    const due = addDays(audit, int(90, 210));
    const old = due < addDays(AS_OF, -60);
    const status = old ? (chance(0.9) ? "selesai" : "dalam_proses") : chance(0.4) ? "selesai" : chance(0.7) ? "dalam_proses" : "belum_ditindaklanjuti";
    let completed = null;
    if (status === "selesai") {
      completed = minDate(addDays(due, chance(0.8) ? -int(5, 60) : int(3, 40)), AS_OF);
      if (completed <= audit) completed = addDays(audit, int(20, 60));
    }
    drTmn += 1;
    const id = `DR-TMN-${pad(drTmn, 3)}`;
    let evidence = null;
    if (status === "selesai" && chance(0.85)) {
      doc += 1;
      evidence = `DOC-${pad(doc, 4)}`;
      ds.documents.push({
        id: evidence,
        scope: "dr",
        title: `[SIMULASI] Bukti tindak lanjut ${id}`,
        kind: "bukti",
        content_text: `DOKUMEN SIMULASI. Bukti tindak lanjut atas temuan "${title}" (${area}) pada ${DR.name}. Tidak mengandung data audit asli.`,
        is_dummy: true,
      });
    }
    ds.findings.push({
      id,
      unit_id: "dr",
      year,
      examiner: pick(EXAMINERS),
      area,
      theme: pick(THEMES),
      title,
      summary: `[DATA DUMMY] ${summary}`,
      recommendation: `[DATA DUMMY] ${rec}`,
      status,
      due_date: due,
      completed_at: completed,
      pic: pick(DR_GROUPS),
      is_repeat: chance(0.12),
      evidence_document_id: evidence,
      is_dummy: true,
    });
  }
}

// ---------------------------------------------------------------- jadwal & permindok
let jad = Math.max(...ds.audit_schedules.map((s) => Number(s.id.slice(4))));
let pmd = Math.max(...ds.document_requests.map((r) => Number(r.id.slice(4))));
const TYPES = ["Interim", "LKTBI", "Tematik", "Asistensi"];
const CATEGORIES = Object.keys(REQUEST_TITLES);

function addSchedule(unitId, year, start, confirmed = true) {
  jad += 1;
  const s = {
    id: `JAD-${pad(jad, 3)}`,
    unit_id: unitId,
    year,
    examiner: pick(EXAMINERS),
    exam_type: unitId === "dr" ? "Interim" : pick(TYPES),
    start_date: start,
    end_date: addDays(start, int(4, 9)),
    date_confirmed: confirmed,
    is_dummy: true,
  };
  ds.audit_schedules.push(s);
  return s;
}

function addRequests(s) {
  const count = int(3, 6);
  for (let i = 0; i < count; i++) {
    const category = pick(CATEGORIES);
    const requested = addDays(s.start_date, -int(7, 16));
    const due = addDays(requested, int(6, 10));
    let status;
    let submitted = null;
    if (due < AS_OF) {
      const r = rand();
      if (r < 0.7) {
        status = "lengkap";
        submitted = minDate(addDays(due, chance(0.78) ? -int(0, 4) : int(1, 6)), AS_OF);
        if (submitted < requested) submitted = requested;
      } else status = r < 0.82 ? "bertahap" : r < 0.93 ? "dalam_proses" : "belum_dikirim";
    } else if (requested <= AS_OF) {
      status = pick(["dalam_proses", "bertahap", "belum_dikirim"]);
    } else status = "belum_dikirim";
    pmd += 1;
    ds.document_requests.push({
      id: `PMD-${pad(pmd, 3)}`,
      schedule_id: s.id,
      unit_id: s.unit_id,
      category,
      title: `[DATA DUMMY] ${pick(REQUEST_TITLES[category])}`,
      dr_note: `[DATA DUMMY] ${pick(DR_NOTES)}`,
      requested_at: requested,
      due_date: due,
      submitted_at: submitted,
      status,
      document_id: null,
      is_dummy: true,
    });
  }
}

// 2025: dua pemeriksaan per KPw (semester I dan II) + DR, seluruhnya telah selesai.
KPW.forEach((u, i) => addRequests(addSchedule(u.id, 2025, addDays("2025-01-13", i * 3 + int(0, 2)))));
KPW.forEach((u, i) => addRequests(addSchedule(u.id, 2025, addDays("2025-07-07", i * 3 + int(0, 2)))));
for (const m of ["2025-03-10", "2025-06-16", "2025-09-08", "2025-11-17"]) addRequests(addSchedule("dr", 2025, m));
// Riwayat pemeriksaan DR 2022–2024 (tiga pemeriksaan per tahun).
for (const y of [2022, 2023, 2024]) for (const m of ["03-14", "07-11", "10-17"]) addRequests(addSchedule("dr", y, `${y}-${m}`));
// 2026 semester I: KPw yang belum memiliki jadwal 2026.
const has2026 = new Set(base.audit_schedules.filter((s) => s.year === 2026).map((s) => s.unit_id));
KPW.filter((u) => !has2026.has(u.id)).forEach((u, i) => addRequests(addSchedule(u.id, 2026, addDays("2026-02-02", i * 12 + int(0, 4)))));
// 2026: pemeriksaan tematik tambahan yang tersebar di seluruh korwil (Maret–Desember).
KPW.forEach((u, i) => addRequests(addSchedule(u.id, 2026, addDays("2026-03-02", ((i * 17) % 46) * 6 + int(0, 3)), chance(0.88))));
// 2027: rencana satu tahun penuh untuk seluruh KPw (makin jauh makin banyak yang tentatif).
KPW.forEach((u, i) => {
  const start = addDays("2027-01-11", ((i * 23) % 46) * 7 + int(0, 3));
  const s = addSchedule(u.id, 2027, start, start < "2027-04-01" ? chance(0.6) : chance(0.25));
  if (s.date_confirmed) addRequests(s);
});

// ---------------------------------------------------------------- rekonsiliasi aset
/**
 * Katalog aset simulasi: [nama, kategori, kode klasifikasi, harga min, harga maks, umur ekonomis (tahun)].
 * Kode dan umur ekonomis fiktif, hanya untuk demonstrasi.
 */
const ASSET_CATALOG = [
  ["Laptop kerja", "Peralatan TI", "3.10.02.03", 12_000_000, 24_000_000, 4],
  ["Personal computer", "Peralatan TI", "3.10.02.01", 10_000_000, 18_000_000, 4],
  ["Printer multifungsi", "Peralatan TI", "3.10.02.05", 4_000_000, 15_000_000, 4],
  ["Server rak", "Peralatan TI", "3.10.02.09", 90_000_000, 260_000_000, 5],
  ["Kamera CCTV", "Peralatan Pengamanan", "3.08.01.04", 3_000_000, 9_000_000, 5],
  ["Mesin hitung uang", "Peralatan Khusus", "3.07.03.02", 35_000_000, 85_000_000, 8],
  ["Mesin sortir uang", "Peralatan Khusus", "3.07.03.05", 450_000_000, 1_200_000_000, 10],
  ["AC split", "Peralatan Kantor", "3.05.02.04", 6_000_000, 14_000_000, 5],
  ["Genset", "Peralatan dan Mesin", "3.03.01.02", 180_000_000, 520_000_000, 10],
  ["Brankas", "Peralatan Kantor", "3.05.01.05", 25_000_000, 70_000_000, 20],
  ["Meja rapat", "Inventaris Kantor", "3.05.02.01", 5_000_000, 22_000_000, 8],
  ["Lemari arsip", "Inventaris Kantor", "3.05.01.04", 3_000_000, 9_000_000, 8],
  ["Kendaraan dinas roda 4", "Kendaraan", "3.02.01.02", 280_000_000, 620_000_000, 8],
  ["Kendaraan dinas roda 2", "Kendaraan", "3.02.01.04", 22_000_000, 38_000_000, 5],
  ["Proyektor ruang rapat", "Peralatan TI", "3.10.02.07", 7_000_000, 16_000_000, 4],
  ["Perangkat jaringan (switch)", "Peralatan TI", "3.10.02.11", 18_000_000, 65_000_000, 5],
];
const ROOMS = ["Ruang Kepala Kantor", "Ruang Rapat Utama", "Ruang Kas", "Ruang Server", "Ruang Arsip", "Ruang Layanan", "Ruang Pengamanan", "Gudang", "Ruang Fungsi Ekonomi", "Ruang Fungsi Keuangan", "Pool Kendaraan", "Ruang Pertemuan"];
const rupiah = (n) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const roundTo = (n, step) => Math.round(n / step) * step;

/** Aspek asesmen → generator nilai tercatat/seharusnya + tindak lanjut (subkind video panduan). */
const ASPECT_RULES = {
  umur_ekonomis: (a) => {
    const wrong = a.life + pick([2, 3, 4, -2, 6].filter((d) => a.life + d > 0));
    return { recorded: `${wrong} tahun`, actual: `${a.life} tahun (tabel kebijakan)`, note: `Umur ekonomis di aplikasi ${wrong} tahun, sedangkan kebijakan untuk kategori ${a.category} adalah ${a.life} tahun; beban penyusutan menjadi tidak tepat.`, action: "penyesuaian_umur", lifeRecorded: wrong };
  },
  harga_perolehan: (a) => {
    const diff = roundTo(a.cost * (pick([1, -1]) * (0.04 + rand() * 0.18)), 50_000);
    return { recorded: rupiah(a.cost), actual: `${rupiah(a.cost - diff)} (sesuai faktur/BAST)`, note: `Harga perolehan tercatat berbeda ${rupiah(Math.abs(diff))} dari dokumen sumber${diff > 0 ? "; biaya non-kapitalisasi ikut dicatat" : "; biaya instalasi belum dikapitalisasi"}.`, action: "koreksi_nilai" };
  },
  satuan_aset: () => {
    const n = int(2, 4);
    return { recorded: "1 nomor aset", actual: `${n} unit fisik/komponen terpisah`, note: `Satu nomor aset mencakup ${n} komponen dengan umur dan lokasi berbeda sehingga nilainya tidak dapat ditelusuri per unit.`, action: "split" };
  },
  keberadaan_fisik: () => ({ recorded: "Tercatat aktif", actual: "Tidak ditemukan saat inventarisasi", note: "Aset tidak ditemukan pada lokasi tercatat maupun ruangan lain; belum ada berita acara kehilangan.", action: "penghapusan" }),
  kondisi_fisik: () => ({ recorded: "Baik", actual: pick(["Rusak berat", "Rusak berat, tidak dapat diperbaiki"]), note: "Kondisi fisik rusak berat namun masih tercatat aktif dan disusutkan.", action: "penghapusan" }),
  lokasi: (a) => {
    const other = pick(ROOMS.filter((r) => r !== a.location && r !== "Pool Kendaraan"));
    return { recorded: a.location, actual: other, note: `Aset berada di ${other}, berbeda dengan kartu inventaris ruangan; mutasi belum dicatat.`, action: "mutasi" };
  },
  klasifikasi: (a) => {
    const wrong = pick(ASSET_CATALOG.filter((c) => c[2] !== a.code));
    return { recorded: `${wrong[2]} (${wrong[1]})`, actual: `${a.code} (${a.category})`, note: "Kode klasifikasi tidak sesuai jenis aset sehingga umur ekonomis dan pelaporan kategori ikut keliru.", action: "reklasifikasi" };
  },
  dokumen_kepemilikan: (a) => ({ recorded: "Dokumen lengkap", actual: a.category === "Kendaraan" ? "BPKB/STNK belum tersimpan di arsip" : "Kontrak/BAST perolehan tidak ditemukan", note: "Dokumen kepemilikan/perolehan belum diarsipkan sehingga bukti kepemilikan lemah.", action: "penatausahaan" }),
  label: () => ({ recorded: "Label terpasang", actual: pick(["Label hilang", "Label tidak terbaca", "Label nomor lama"]), note: "Label nomor aset tidak sesuai/tidak ada sehingga aset sulit diidentifikasi saat inventarisasi.", action: "penatausahaan" }),
};
const ASPECT_KEYS = Object.keys(ASPECT_RULES);
const ASPECT_WEIGHTS = { umur_ekonomis: 4, harga_perolehan: 4, satuan_aset: 2, keberadaan_fisik: 2, kondisi_fisik: 3, lokasi: 4, klasifikasi: 2, dokumen_kepemilikan: 2, label: 3 };
const EXCLUSIVE = new Set(["keberadaan_fisik", "kondisi_fisik", "lokasi"]);
function pickAspects() {
  const k = chance(0.62) ? 1 : chance(0.75) ? 2 : 3;
  const chosen = [];
  const pool = ASPECT_KEYS.flatMap((a) => Array(ASPECT_WEIGHTS[a]).fill(a));
  while (chosen.length < k) {
    const a = pick(pool);
    if (chosen.includes(a)) continue;
    if (EXCLUSIVE.has(a) && chosen.some((c) => EXCLUSIVE.has(c))) continue;
    chosen.push(a);
  }
  return chosen;
}

let ast = ds.asset_reconciliations.length;
let asi = 0;
ds.asset_items = [];
const DETAIL_YEARS = new Set([2025, 2026]);
const unitNo = (u) => (u.id === "dr" ? "DR" : `KPW${u.id.slice(4)}`);

function addAssetItems(rec, unit) {
  const seenNo = new Set();
  for (let i = 0; i < rec.discrepancy_items; i++) {
    const [name, category, code, min, max, life] = pick(ASSET_CATALOG);
    const acqYear = int(rec.year - 9, rec.year - 1);
    let no;
    do no = `${code}.${pad(int(1, 999), 3)}/${unitNo(unit)}/${acqYear}`;
    while (seenNo.has(no));
    seenNo.add(no);
    const location = category === "Kendaraan" ? "Pool Kendaraan" : pick(ROOMS.filter((r) => r !== "Pool Kendaraan"));
    const asset = { name, category, code, life, cost: roundTo(min + rand() * (max - min), 50_000), location };
    const acquired = `${acqYear}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`;
    const results = pickAspects().map((aspect) => [aspect, ASPECT_RULES[aspect](asset)]);
    const recordedLife = results.find(([, r]) => r.lifeRecorded)?.[1].lifeRecorded ?? life;
    for (const [aspect, r] of results) {
      const resolvedP = rec.year < 2026 ? 0.85 : 0.3;
      const status = chance(resolvedP) ? "selesai" : chance(0.6) ? "dalam_proses" : "belum_ditindaklanjuti";
      asi += 1;
      ds.asset_items.push({
        id: `ASI-${pad(asi, 5)}`,
        reconciliation_id: rec.id,
        unit_id: rec.unit_id,
        asset_number: no,
        asset_name: name,
        category,
        location: asset.location,
        acquisition_date: acquired,
        acquisition_cost: asset.cost,
        useful_life: recordedLife,
        aspect,
        recorded_value: r.recorded,
        expected_value: r.actual,
        note: `[DATA DUMMY] ${r.note}`,
        action: r.action,
        status,
        is_dummy: true,
      });
    }
  }
}

// Rekonsiliasi 2026 dari paket awal dipakai apa adanya (diberi rincian per aset), tidak digandakan.
const baseRec = new Map(base.asset_reconciliations.map((r) => [`${r.unit_id}|${r.year}`, r.id]));
for (const year of [2023, 2024, 2025, 2026]) {
  for (const u of [...KPW, DR]) {
    const isDr = u.id === "dr";
    const existing = ds.asset_reconciliations.find((r) => r.id === baseRec.get(`${u.id}|${year}`));
    if (existing) {
      existing.note = "[DATA DUMMY] Rincian asesmen per aset tersedia.";
      addAssetItems(existing, u);
      continue;
    }
    const total = isDr ? int(320, 420) : int(90, 260);
    const detail = DETAIL_YEARS.has(year) || isDr;
    const disc = detail ? (isDr ? int(10, 18) : int(3, 14)) : year <= 2024 ? int(4, 26) : int(2, 18);
    ast += 1;
    const rec = {
      id: `AST-${pad(ast, 3)}`,
      unit_id: u.id,
      year,
      total_items: total,
      reconciled_items: total - disc,
      discrepancy_items: disc,
      note: detail ? "[DATA DUMMY] Rincian asesmen per aset tersedia." : "[DATA DUMMY] Selisih simulasi untuk contoh rekonsiliasi (rekap tanpa rincian per aset).",
      is_dummy: true,
    };
    ds.asset_reconciliations.push(rec);
    if (detail) addAssetItems(rec, u);
  }
}

// ---------------------------------------------------------------- kewajiban DR
const ASPECTS = [
  "Penyampaian laporan realisasi anggaran",
  "Pemutakhiran data BMN",
  "Pelaporan kinerja triwulanan",
  "Pemutakhiran profil risiko",
  "Pemenuhan rekomendasi SPI",
  "Penyusunan rencana kerja anggaran",
  "Pelaporan LHKPN",
  "Evaluasi pengendalian intern",
  "Pelaporan gratifikasi",
  "Reviu SOP kelompok",
  "Penyampaian laporan keuangan semesteran",
  "Pemutakhiran register risiko",
];
let kpt = ds.compliance.length;
ASPECTS.forEach((a, i) => {
  kpt += 1;
  const due = addDays("2026-01-15", i * 28 + int(0, 6));
  ds.compliance.push({
    id: `KPT-${pad(kpt, 2)}`,
    unit_id: "dr",
    aspect: `[SIMULASI] ${a}`,
    pic: `Kelompok Simulasi ${(i % 3) + 1}`,
    due_date: due,
    status: due < addDays(AS_OF, -20) ? (chance(0.85) ? "selesai" : "dalam_proses") : due < AS_OF ? "dalam_proses" : "belum_dimulai",
    is_dummy: true,
  });
});

// ---------------------------------------------------------------- materi SGo, ketentuan & video
// Disusun ulang dari manifest berkas demo (scripts/build-demo-materials.py):
// per area 2 worksheet Excel + 4 ketentuan PDF, ditambah video panduan aset & pengenalan SGo.
const materials = JSON.parse(readFileSync(join(root, "data/base/demo-materials.json"), "utf8"));
const oldRefDocs = new Set(ds.references.map((r) => r.document_id));
ds.documents = ds.documents.filter((d) => !oldRefDocs.has(d.id));
ds.references = [];
const addMaterial = (refId, area, kind, subkind, title, description, fileUrl, contentText, docKind) => {
  const docId = `MAT-${refId}`;
  ds.documents.push({ id: docId, scope: "shared", title: `[SIMULASI] ${title}`, kind: docKind, content_text: contentText, file_url: fileUrl, is_dummy: true });
  ds.references.push({ id: refId, scope: "shared", area, kind, subkind, title: `[SIMULASI] ${title}`, description, document_id: docId, is_dummy: true });
};
materials.areas.forEach((a, i) => {
  const n = i + 1;
  for (const w of a.worksheets) {
    const tsv = [w.columns, ...w.preview].map((r) => r.join("\t")).join("\n");
    const desc = w.subkind === "ws_pengendalian"
      ? "Pemetaan risiko, pengendalian kunci, prosedur pengujian, dan kesimpulan efektivitas."
      : "Daftar aktivitas rutin, bukti pelaksanaan, dan hasil supervisi pejabat berwenang.";
    addMaterial(`REF-${n}-${w.subkind.replace(/_/g, "-")}`, a.area, "worksheet", w.subkind, w.title, desc, w.file_url,
      `WORKSHEET SIMULASI (Excel). Lembar: ${w.sheets.join(", ")}.\n\n${tsv}`, "worksheet");
  }
  for (const k of a.ketentuan) {
    addMaterial(`REF-${n}-${k.subkind.replace(/_/g, "-")}`, a.area, "ketentuan", k.subkind, `${k.label} ${k.number} — ${k.topic}`,
      `${k.jenis} (simulasi) tentang ${k.topic}.`, k.file_url,
      `KETENTUAN SIMULASI (PDF). ${k.title}. Bukan ketentuan resmi Bank Indonesia.`, "ketentuan");
  }
});
materials.asset_videos.forEach((v) =>
  addMaterial(`REF-VID-${v.subkind.replace(/_/g, "-")}`, "Aset", "tutorial", v.subkind, `Video ${v.label}`, v.description, v.file_url,
    `VIDEO PANDUAN SIMULASI (${v.duration} detik).\n${v.steps.map((x, i) => `${i + 1}. ${x}`).join("\n")}`, "video"),
);
addMaterial("REF-SGO-INTRO", "SGo", "tutorial", "sgo_intro", materials.sgo_intro.title, "Pengenalan singkat menu SGo dan Ketentuan.", materials.sgo_intro.file_url,
  `VIDEO PENGENALAN SIMULASI (${materials.sgo_intro.duration} detik).\n${materials.sgo_intro.steps.map((x, i) => `${i + 1}. ${x}`).join("\n")}`, "video");

// ---------------------------------------------------------------- kewajiban DR tambahan 2025
let kpt2 = ds.compliance.length;
ASPECTS.slice(0, 8).forEach((a, i) => {
  kpt2 += 1;
  ds.compliance.push({
    id: `KPT-${pad(kpt2, 2)}`,
    unit_id: "dr",
    aspect: `[SIMULASI] ${a} (2025)`,
    pic: `Kelompok Simulasi ${(i % 3) + 1}`,
    due_date: addDays("2025-02-10", i * 40 + int(0, 6)),
    status: chance(0.9) ? "selesai" : "dalam_proses",
    is_dummy: true,
  });
});

ds.metadata.version = "1.3";
ds.metadata.note =
  "46 KPw fiktif, bukan daftar kantor resmi. Angka dan uraian tidak mewakili kondisi BI. v1.3: data diperluas secara deterministik (scripts/generate-dummy-data.mjs) — temuan multi-tahun KPw & DR, rincian asesmen aset per nomor aset, serta materi SGo/ketentuan/video demo.";

writeFileSync(join(root, "data/sekar-dummy.json"), JSON.stringify(ds, null, 2) + "\n");
const counts = Object.fromEntries(Object.entries(ds).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]));
console.log("data/sekar-dummy.json ditulis:", counts);

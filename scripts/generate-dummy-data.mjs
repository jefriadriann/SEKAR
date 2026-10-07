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
  ],
  "Keuangan Intern": [
    ["Pertanggungjawaban uang muka melampaui batas waktu", "Penyelesaian pertanggungjawaban uang muka kegiatan melewati batas waktu.", "Pantau batas waktu pertanggungjawaban dan beri pengingat berjenjang."],
    ["Bukti pendukung pembayaran belum lengkap", "Beberapa transaksi pembayaran belum dilengkapi bukti pendukung memadai.", "Lengkapi bukti pendukung sebelum pembayaran diproses."],
    ["Rekonsiliasi rekening antara belum dilakukan tepat waktu", "Rekonsiliasi rekening antara bulanan terlambat dilakukan.", "Lakukan rekonsiliasi secara berkala dan dokumentasikan hasilnya."],
    ["Pencatatan beban belum sesuai periode", "Terdapat beban yang dicatat tidak pada periode terjadinya.", "Perkuat reviu pencatatan akhir periode."],
  ],
  "PI-KEKDA": [
    ["Kajian ekonomi daerah belum terdokumentasi lengkap", "Kertas kerja kajian ekonomi daerah belum tersimpan sistematis.", "Susun dan arsipkan kertas kerja kajian secara terstruktur."],
    ["Diseminasi hasil kajian belum terjadwal", "Kegiatan diseminasi hasil kajian belum memiliki jadwal rutin.", "Tetapkan kalender diseminasi dan pantau pelaksanaannya."],
    ["Data survei belum divalidasi berjenjang", "Hasil survei belum melalui validasi berjenjang sebelum digunakan.", "Terapkan validasi berjenjang atas data survei."],
  ],
  "PSBI / EPML": [
    ["Pemantauan program sosial belum berkala", "Pemantauan pelaksanaan program sosial belum dilakukan berkala.", "Susun jadwal pemantauan dan laporkan hasilnya."],
    ["Laporan pertanggungjawaban penerima program terlambat", "Laporan pertanggungjawaban dari penerima program diterima melewati tenggat.", "Tetapkan tenggat dan mekanisme pengingat kepada penerima program."],
    ["Dokumentasi seleksi penerima program belum lengkap", "Dokumentasi proses seleksi penerima program belum lengkap.", "Lengkapi dokumentasi seleksi sesuai pedoman."],
  ],
  PUR: [
    ["Selisih hasil penghitungan kas titipan", "Ditemukan selisih administrasi pada hasil penghitungan kas titipan.", "Lakukan penghitungan ulang dan perkuat dual control."],
    ["Jadwal kas keliling belum dievaluasi", "Efektivitas jadwal layanan kas keliling belum dievaluasi berkala.", "Evaluasi jadwal layanan kas keliling setiap semester."],
    ["Pencatatan pemusnahan uang belum tepat waktu", "Pencatatan hasil pemusnahan uang terlambat dimutakhirkan.", "Mutakhirkan pencatatan pada hari yang sama."],
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
    const n = year === 2026 ? int(4, 7) : int(3, 5);
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
let ast = ds.asset_reconciliations.length;
for (const year of [2023, 2024, 2025, 2026]) {
  for (const u of KPW) {
    const total = int(90, 260);
    const disc = year <= 2024 ? int(4, 26) : int(2, 18);
    ast += 1;
    ds.asset_reconciliations.push({
      id: `AST-${pad(ast, 3)}`,
      unit_id: u.id,
      year,
      total_items: total,
      reconciled_items: total - disc,
      discrepancy_items: disc,
      note: "[DATA DUMMY] Selisih simulasi untuk contoh rekonsiliasi.",
      is_dummy: true,
    });
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

// ---------------------------------------------------------------- materi pedoman tambahan
const AREA_ORDER = [...new Set(base.references.map((r) => r.area))];
AREA_ORDER.forEach((area, i) => {
  const n = i + 1;
  const docId = `REFDOC-${n}-pedoman`;
  ds.documents.push({
    id: docId,
    scope: "shared",
    title: `[SIMULASI] Pedoman Teknis ${area}`,
    kind: "ketentuan",
    content_text: `MATERI SIMULASI. Ringkasan pedoman teknis area ${area}: ruang lingkup, langkah pemeriksaan, dan daftar periksa. Bukan ketentuan resmi BI.`,
    is_dummy: true,
  });
  ds.references.push({
    id: `REF-${n}-pedoman`,
    scope: "shared",
    area,
    kind: "ketentuan",
    title: `[SIMULASI] Pedoman Teknis ${area}`,
    description: "Materi contoh untuk demonstrasi antarmuka; bukan ketentuan resmi.",
    document_id: docId,
    is_dummy: true,
  });
});

ds.metadata.version = "1.2";
ds.metadata.note =
  "46 KPw fiktif, bukan daftar kantor resmi. Angka dan uraian tidak mewakili kondisi BI. v1.2: data diperluas secara deterministik untuk seluruh korwil (scripts/generate-dummy-data.mjs).";

writeFileSync(join(root, "data/sekar-dummy.json"), JSON.stringify(ds, null, 2) + "\n");
const counts = Object.fromEntries(Object.entries(ds).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]));
console.log("data/sekar-dummy.json ditulis:", counts);

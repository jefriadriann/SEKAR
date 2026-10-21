"""Konten materi demo SEKAR (SIMULASI). Dipakai oleh build-demo-materials.py.

Seluruh isi fiktif: nomor ketentuan, uraian aktivitas, risiko, dan pengendalian
disusun hanya untuk demonstrasi antarmuka dan BUKAN ketentuan resmi.
"""

AREAS = [
    "Aset",
    "Keuangan Intern",
    "PI-KEKDA",
    "PSBI / EPML",
    "PUR",
    "Pengadaan",
    "Pengamanan",
    "Perizinan dan Pengawasan SP",
]

SLUG = {
    "Aset": "aset",
    "Keuangan Intern": "keuangan-intern",
    "PI-KEKDA": "pi-kekda",
    "PSBI / EPML": "psbi-epml",
    "PUR": "pur",
    "Pengadaan": "pengadaan",
    "Pengamanan": "pengamanan",
    "Perizinan dan Pengawasan SP": "perizinan-pengawasan-sp",
}

# Per area: (proses, aktivitas, output, frekuensi, risiko, pengendalian kunci, jenis pengendalian)
ACTIVITIES = {
    "Aset": [
        ("Perencanaan aset", "Menyusun rencana kebutuhan aset tahunan", "Daftar rencana kebutuhan", "Tahunan", "Pengadaan aset tidak sesuai kebutuhan", "Reviu kebutuhan berjenjang oleh kepala unit", "Preventif"),
        ("Pencatatan aset", "Mencatat perolehan aset ke aplikasi aset", "Kartu aset & nomor aset", "Setiap perolehan", "Harga perolehan/umur ekonomis salah input", "Verifikasi dokumen sumber oleh pejabat kedua (dual control)", "Preventif"),
        ("Penatausahaan aset", "Memutakhirkan label, lokasi, dan penanggung jawab aset", "Kartu inventaris ruangan", "Semesteran", "Lokasi aset tidak sesuai catatan", "Rekonsiliasi KIR dengan aplikasi aset", "Detektif"),
        ("Inventarisasi fisik", "Melakukan stock opname aset tetap", "Berita acara inventarisasi", "Tahunan", "Aset hilang tidak terdeteksi", "Inventarisasi oleh tim independen + BA selisih", "Detektif"),
        ("Mutasi aset", "Memproses perpindahan aset antarruang/antarunit", "BA serah terima mutasi", "Setiap kejadian", "Mutasi tanpa pencatatan", "Formulir mutasi wajib disetujui pejabat berwenang", "Preventif"),
        ("Split & reklasifikasi", "Memecah aset gabungan dan mengoreksi kode klasifikasi", "Nota koreksi aset", "Setiap kejadian", "Nilai aset gabungan tidak dapat ditelusuri", "Reviu nota koreksi oleh fungsi akuntansi", "Detektif"),
        ("Penghapusan aset", "Mengusulkan penghapusan aset rusak berat/hilang", "SK penghapusan", "Semesteran", "Aset rusak berat tetap tercatat aktif", "Daftar pantau kondisi aset + usulan berkala", "Detektif"),
    ],
    "Keuangan Intern": [
        ("Perencanaan anggaran", "Menyusun rencana anggaran unit", "Rencana anggaran", "Tahunan", "Anggaran tidak realistis", "Reviu kewajaran oleh kepala unit", "Preventif"),
        ("Pembayaran", "Memproses permintaan pembayaran", "Bukti pembayaran", "Harian", "Pembayaran tanpa bukti pendukung", "Checklist kelengkapan sebelum otorisasi", "Preventif"),
        ("Uang muka", "Memantau pertanggungjawaban uang muka", "Daftar pantau uang muka", "Mingguan", "Pertanggungjawaban terlambat", "Pengingat berjenjang H-7 dan H-1", "Detektif"),
        ("Rekonsiliasi", "Merekonsiliasi rekening antara", "BA rekonsiliasi", "Bulanan", "Selisih tidak terdeteksi", "Reviu rekonsiliasi oleh pejabat kedua", "Detektif"),
        ("Pelaporan", "Menyusun laporan realisasi anggaran", "Laporan realisasi", "Bulanan", "Beban dicatat tidak pada periodenya", "Cut-off review akhir periode", "Detektif"),
        ("Perpajakan", "Memotong dan menyetor pajak", "Bukti potong & setor", "Bulanan", "Keterlambatan setor pajak", "Kalender pajak + monitoring harian", "Preventif"),
    ],
    "PI-KEKDA": [
        ("Perencanaan kajian", "Menetapkan topik kajian ekonomi daerah", "Rencana kajian", "Tahunan", "Topik tidak relevan", "Rapat penetapan topik dengan pimpinan", "Preventif"),
        ("Pengumpulan data", "Melaksanakan survei dan liaison", "Data survei", "Triwulanan", "Data tidak valid", "Validasi berjenjang atas data survei", "Detektif"),
        ("Analisis", "Menyusun kajian ekonomi dan keuangan daerah", "Laporan kajian", "Triwulanan", "Analisis tidak didukung data", "Reviu sejawat (peer review)", "Detektif"),
        ("Diseminasi", "Menyampaikan hasil kajian kepada stakeholder", "Materi diseminasi", "Triwulanan", "Diseminasi tidak terjadwal", "Kalender diseminasi tahunan", "Preventif"),
        ("Dokumentasi", "Mengarsipkan kertas kerja kajian", "Arsip kertas kerja", "Setiap kajian", "Kertas kerja tidak dapat ditelusuri", "Struktur folder baku + checklist arsip", "Preventif"),
    ],
    "PSBI / EPML": [
        ("Perencanaan program", "Menyusun rencana program sosial", "Rencana program", "Tahunan", "Program tidak tepat sasaran", "Kajian kebutuhan calon penerima", "Preventif"),
        ("Seleksi penerima", "Menyeleksi proposal penerima program", "BA seleksi", "Setiap periode", "Seleksi tidak objektif", "Kriteria seleksi tertulis + panel seleksi", "Preventif"),
        ("Penyaluran", "Menyalurkan bantuan kepada penerima", "Bukti penyaluran", "Setiap penyaluran", "Penyaluran tidak sesuai perjanjian", "Verifikasi dokumen perjanjian sebelum penyaluran", "Preventif"),
        ("Pemantauan", "Memantau pelaksanaan program", "Laporan monitoring", "Triwulanan", "Program tidak berjalan", "Kunjungan lapangan terjadwal", "Detektif"),
        ("Pertanggungjawaban", "Menerima laporan pertanggungjawaban penerima", "LPJ penerima", "Setiap program", "LPJ terlambat/tidak lengkap", "Tenggat LPJ + surat pengingat", "Detektif"),
    ],
    "PUR": [
        ("Perencanaan kas", "Menyusun perkiraan kebutuhan uang", "Proyeksi kebutuhan uang", "Bulanan", "Kekurangan persediaan kas", "Reviu proyeksi oleh kepala fungsi", "Preventif"),
        ("Penyetoran & penarikan", "Melayani setoran dan penarikan bank", "Bukti transaksi kas", "Harian", "Selisih fisik kas", "Dual control dan penghitungan ulang", "Preventif"),
        ("Kas titipan", "Mengelola kas titipan pada bank", "Laporan kas titipan", "Bulanan", "Selisih administrasi kas titipan", "Pemeriksaan mendadak berkala", "Detektif"),
        ("Kas keliling", "Melaksanakan layanan kas keliling", "Laporan kas keliling", "Mingguan", "Jadwal tidak efektif", "Evaluasi jadwal semesteran", "Detektif"),
        ("Pemusnahan uang", "Memusnahkan uang tidak layar edar", "BA pemusnahan", "Mingguan", "Pencatatan pemusnahan terlambat", "Rekonsiliasi harian hasil pemusnahan", "Detektif"),
    ],
    "Pengadaan": [
        ("Perencanaan", "Menyusun rencana umum pengadaan", "RUP", "Tahunan", "Kebutuhan tidak didukung analisis", "Analisis kebutuhan wajib dilampirkan", "Preventif"),
        ("Persiapan", "Menyusun harga perkiraan sendiri (HPS)", "Dokumen HPS", "Setiap paket", "HPS tidak wajar", "Survei harga minimal 3 sumber", "Preventif"),
        ("Pemilihan penyedia", "Melaksanakan pemilihan penyedia", "BA hasil pemilihan", "Setiap paket", "Persaingan tidak sehat", "Pakta integritas + reviu panitia", "Preventif"),
        ("Pelaksanaan kontrak", "Memantau pelaksanaan kontrak", "Laporan progres", "Mingguan", "Pekerjaan terlambat", "Monitoring jadwal + denda keterlambatan", "Detektif"),
        ("Serah terima", "Melakukan pemeriksaan dan serah terima", "BAST", "Setiap paket", "Barang tidak sesuai spesifikasi", "Pemeriksaan oleh tim penerima", "Detektif"),
        ("Dokumentasi", "Mengarsipkan dokumen pengadaan", "Arsip pengadaan", "Setiap paket", "Dokumen tidak lengkap", "Checklist dokumen per paket", "Preventif"),
    ],
    "Pengamanan": [
        ("Perencanaan", "Menyusun rencana pengamanan", "Rencana pengamanan", "Tahunan", "Ancaman tidak teridentifikasi", "Penilaian risiko keamanan tahunan", "Preventif"),
        ("Akses fisik", "Mengelola hak akses area terbatas", "Daftar hak akses", "Bulanan", "Akses tidak sah", "Reviu log akses berkala", "Detektif"),
        ("Perangkat", "Menguji fungsi perangkat pengamanan", "Laporan uji fungsi", "Bulanan", "Perangkat tidak berfungsi", "Jadwal uji fungsi + perawatan", "Preventif"),
        ("Tanggap darurat", "Melaksanakan latihan tanggap darurat", "Laporan latihan", "Tahunan", "Petugas tidak siap", "Simulasi tahunan + evaluasi", "Preventif"),
        ("Pengawalan", "Mengamankan kegiatan pengiriman kas", "Laporan pengawalan", "Setiap kegiatan", "Gangguan keamanan", "SOP pengawalan + koordinasi aparat", "Preventif"),
    ],
    "Perizinan dan Pengawasan SP": [
        ("Perizinan", "Memproses permohonan izin penyelenggara", "Rekomendasi izin", "Setiap permohonan", "Proses melebihi SLA", "Monitoring SLA perizinan", "Detektif"),
        ("Perencanaan pengawasan", "Menyusun rencana pengawasan", "Rencana pengawasan", "Tahunan", "Pengawasan tidak berbasis risiko", "Pemetaan risiko penyelenggara", "Preventif"),
        ("Pengawasan langsung", "Melaksanakan pemeriksaan on-site", "Laporan hasil pengawasan", "Sesuai rencana", "Realisasi tidak sesuai rencana", "Monitoring realisasi bulanan", "Detektif"),
        ("Tindak lanjut", "Memantau tindak lanjut hasil pengawasan", "Daftar pantau TL", "Bulanan", "Tindak lanjut tidak dipantau", "Daftar pantau terdokumentasi", "Detektif"),
        ("Arsip", "Mengarsipkan dokumen perizinan", "Arsip terpusat", "Setiap dokumen", "Dokumen tercecer", "Arsip terpusat + indeks", "Preventif"),
    ],
}

# Ketentuan per area: (subkind, label singkat, judul jenis)
KETENTUAN_TYPES = [
    ("pdg", "PDG", "Peraturan Dewan Gubernur"),
    ("padgi", "PADGI", "Peraturan Anggota Dewan Gubernur Intern"),
    ("juknis", "Juknis", "Petunjuk Teknis"),
    ("se_intern", "SE Intern", "Surat Edaran Intern"),
]

KETENTUAN_TOPIC = {
    "Aset": "Pengelolaan Aset Tetap",
    "Keuangan Intern": "Pengelolaan Keuangan Intern",
    "PI-KEKDA": "Kajian Ekonomi dan Keuangan Daerah",
    "PSBI / EPML": "Program Sosial dan Pemberdayaan Ekonomi",
    "PUR": "Pengelolaan Uang Rupiah di Kantor Perwakilan",
    "Pengadaan": "Pengadaan Barang dan Jasa",
    "Pengamanan": "Pengamanan Lingkungan Kerja",
    "Perizinan dan Pengawasan SP": "Perizinan dan Pengawasan Sistem Pembayaran",
}

# Video panduan pencatatan aset: (subkind, label, deskripsi, langkah)
ASSET_VIDEOS = [
    ("split", "Split Aset", "Memecah satu nomor aset gabungan menjadi beberapa aset per komponen.", [
        "Identifikasi aset gabungan yang terdiri dari beberapa komponen berbeda.",
        "Hitung harga perolehan per komponen dari kontrak atau faktur.",
        "Buat nomor aset baru per komponen di aplikasi aset.",
        "Pindahkan nilai dan akumulasi penyusutan secara proporsional.",
        "Nonaktifkan nomor aset induk dan lampirkan nota koreksi.",
    ]),
    ("penghapusan", "Penghapusan Aset", "Menghapus aset rusak berat atau hilang dari daftar aset aktif.", [
        "Susun daftar aset rusak berat atau tidak ditemukan.",
        "Minta penilaian kondisi oleh tim teknis dan buat berita acara.",
        "Ajukan usulan penghapusan kepada pejabat berwenang.",
        "Setelah SK terbit, catat penghapusan di aplikasi aset.",
        "Arsipkan SK dan berita acara sebagai bukti tindak lanjut.",
    ]),
    ("penatausahaan", "Penatausahaan Aset", "Memutakhirkan label, kartu inventaris, dan dokumen kepemilikan.", [
        "Cetak ulang label aset yang hilang atau rusak.",
        "Mutakhirkan kartu inventaris ruangan (KIR).",
        "Lengkapi dokumen kepemilikan dan simpan pada arsip.",
        "Cocokkan data penanggung jawab aset dengan data pegawai.",
        "Reviu kelengkapan oleh pejabat kedua dan tandatangani.",
    ]),
    ("mutasi", "Mutasi Aset", "Mencatat perpindahan aset antarruang atau antarunit kerja.", [
        "Isi formulir mutasi: nomor aset, lokasi asal, lokasi tujuan.",
        "Minta persetujuan pejabat berwenang di unit asal dan tujuan.",
        "Buat berita acara serah terima aset.",
        "Perbarui lokasi dan penanggung jawab di aplikasi aset.",
        "Mutakhirkan KIR di ruangan asal dan tujuan.",
    ]),
    ("reklasifikasi", "Reklasifikasi Aset", "Mengoreksi kode klasifikasi aset yang tidak sesuai jenisnya.", [
        "Bandingkan kode klasifikasi dengan bagan akun aset.",
        "Tentukan kode klasifikasi yang benar beserta umur ekonomisnya.",
        "Buat nota koreksi reklasifikasi.",
        "Hitung ulang penyusutan bila umur ekonomis berubah.",
        "Catat reklasifikasi di aplikasi dan arsipkan nota.",
    ]),
    ("koreksi_nilai", "Koreksi Harga Perolehan", "Menyesuaikan harga perolehan dengan dokumen sumber.", [
        "Telusuri dokumen sumber: kontrak, faktur, dan BAST.",
        "Hitung selisih antara nilai tercatat dan nilai seharusnya.",
        "Buat jurnal koreksi beserta penyesuaian penyusutan.",
        "Minta reviu fungsi akuntansi atas jurnal koreksi.",
        "Catat koreksi di aplikasi aset dan lampirkan bukti.",
    ]),
    ("penyesuaian_umur", "Penyesuaian Umur Ekonomis", "Menyelaraskan umur ekonomis dengan tabel kebijakan akuntansi.", [
        "Cocokkan umur ekonomis tercatat dengan tabel kebijakan.",
        "Tandai aset yang umur ekonomisnya tidak sesuai.",
        "Hitung dampak terhadap beban penyusutan.",
        "Ajukan koreksi umur ekonomis melalui nota koreksi.",
        "Mutakhirkan data di aplikasi aset dan dokumentasikan.",
    ]),
    ("inventarisasi", "Inventarisasi Fisik", "Melaksanakan stock opname aset tetap secara menyeluruh.", [
        "Bentuk tim inventarisasi dan bagi area pemeriksaan.",
        "Cetak daftar aset per ruangan dari aplikasi.",
        "Cocokkan fisik, label, kondisi, dan lokasi setiap aset.",
        "Catat selisih dan penyebabnya pada worksheet.",
        "Susun berita acara hasil inventarisasi dan tindak lanjut.",
    ]),
]

SGO_INTRO_STEPS = [
    "SGo adalah ruang materi bersama untuk persiapan pemeriksaan KPwDN dan DR.",
    "Setiap area memiliki dua worksheet: Aktivitas & Supervisi serta Pengendalian.",
    "Worksheet Aktivitas & Supervisi memastikan setiap aktivitas dijalankan dan disupervisi.",
    "Worksheet Pengendalian memetakan risiko, pengendalian kunci, dan hasil pengujiannya.",
    "Menu Ketentuan memuat PDG, PADGI, Juknis, dan SE Intern per area.",
    "Isi worksheet, cocokkan dengan ketentuan, lalu simpan sebagai bukti pemeriksaan.",
]

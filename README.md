# SEKAR — Sistem Informasi Evaluasi Kepatuhan, Audit & Risiko (Mode Demo)

Aplikasi web demonstrasi untuk memantau **hasil pemeriksaan KPw**, **permintaan dokumen (permindok)**, **jadwal pemeriksaan**, **materi SGo & ketentuan**, serta **dashboard khusus Departemen Regional (DR)**.

> **Semua data adalah SIMULASI.** Dataset berisi 46 KPw fiktif + 1 unit DR (`data/sekar-dummy.json`). Angka, uraian, dan dokumen tidak mewakili kantor Bank Indonesia mana pun. Identitas "BANK INDONESIA | DEPARTEMEN REGIONAL" di header hanyalah placeholder teks, bukan logo resmi.

Aplikasi langsung berjalan **tanpa akun Supabase, token, atau secret** (mode `dummy`).

---

## 1. Menjalankan di komputer sendiri

Prasyarat: [Node.js](https://nodejs.org) versi 20.9 atau lebih baru (pilih versi "LTS").

```bash
npm install        # sekali saja, mengunduh dependensi
npm run dev        # menjalankan mode pengembangan
```

Buka <http://localhost:3000> di browser. Tidak perlu membuat file `.env`.

Versi produksi (lebih cepat):

```bash
npm run build
npm run start      # http://localhost:3000
```

## Dataset simulasi

`data/sekar-dummy.json` (v1.2) dibangkitkan secara deterministik oleh `node scripts/generate-dummy-data.mjs` dari paket awal `data/base/sekar-dummy-v1.json` (tidak diubah). Isinya: 46 KPw fiktif yang tersebar merata di 6 korwil + unit DR, **1.289 temuan** (1.265 KPw tahun 2022–2026 + 24 DR), **239 jadwal** (2025–2027, 30 tentatif), **872 permintaan dokumen**, **230 rekonsiliasi aset** (2023–2026), **24 kewajiban DR**, **32 materi** (worksheet, ketentuan, pedoman teknis, tutorial) dan 880 dokumen bukti/materi. Semua record bertanda `is_dummy`.

Peta Indonesia memakai geometri Natural Earth 1:10m (public domain) yang dibangun oleh `node scripts/build-indonesia-map.mjs <ne_10m_admin_0_countries.geojson>`; pulau dikelompokkan per korwil dan peta hanya menampilkan agregat per korwil.

Logo SEKAR berada di `public/brand/` (logo penuh & emblem) serta `src/app/icon.png`.

## 2. Pemeriksaan kualitas

| Perintah | Isi |
|---|---|
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `npm run lint` | ESLint (aturan Next.js) |
| `npm test` | Unit test Vitest: agregasi, scope DR/KPw, status tanggal, import tidak valid, perubahan status, CSV |
| `npm run build` | Build produksi Next.js |
| `npm run check` | Menjalankan keempat perintah di atas berurutan |
| `npm run test:e2e` | Smoke test Playwright pada seluruh halaman (jalankan `npm run build` dulu) |
| `npm run db:test-local` | Menguji migration + seed + RLS Supabase pada PostgreSQL lokal sementara (butuh `initdb`/`pg_ctl`) |

Untuk `test:e2e` dibutuhkan browser Chromium untuk Playwright (`npx playwright install chromium` bila belum ada).

## 3. Fitur per halaman

| Route | Isi |
|---|---|
| `/` | Beranda "Selamat Datang di SEKAR" dengan 4 kartu menu (Hasil Pemeriksaan KPwDN, Tracker Permindok, Jadwal Pemeriksaan, SGo dan Ketentuan); tiap kartu membuka modulnya |
| `/hasil-pemeriksaan` | Filter tahun (termasuk Semua Tahun)/pemeriksa/korwil/KPw/area/status/ketepatan waktu/pencarian; chart per area, korwil, tren tahunan, proporsi pemeriksa (klik = filter, ada reset & tampilan tabel); tabel temuan atau agregasi tema (jumlah temuan vs kantor terdampak); drawer detail + bukti + edit status; rekonsiliasi aset; materi pembelajaran; export CSV |
| `/permindok` | Filter tahun/jadwal/kategori/KPw/status/ketepatan waktu + pencarian; KPI kelengkapan **terpisah** dari ketepatan waktu; chart status per kategori; catatan pemenuhan; tabel + edit (tersimpan lokal, validasi tanggal); panduan watermark & tanda terima simulasi (.txt) |
| `/jadwal-pemeriksaan` | Timeline/Gantt bulan/kuartal/tahun, navigasi periode, garis Hari Ini, label **Tentatif**; KPI total/berlangsung/mulai ≤ 7 hari/mendatang/selesai (dihitung dari tanggal); pemeriksaan terdekat; tabel tindak lanjut temuan dengan bukti |
| `/sgo-ketentuan` | Kartu "Apa itu SGo" & tutorial; grid 8 area dengan tombol Worksheet/Ketentuan/Tutorial; pencarian materi; drawer pratinjau; tutorial langkah demi langkah (tanpa video) |
| `/dr` | Khusus persona DR/admin: KPI 24 temuan DR (16 selesai, 6 proses, 2 belum — dihitung dari dataset), filter BPK/DAI/KAA, kepatuhan DR (status dapat diubah), permindok DR, jadwal DR, dokumen penting, ketentuan per kelompok, overview KPw |
| `/admin` | Khusus persona admin: info & tanggal dataset, import JSON (file/tempel) dengan pratinjau + validasi struktur/FK/status/tanggal, konfirmasi penggantian, export JSON, reset ke seed |

Kontrol global di header (kanan atas):

- **Ikon pengguna** — memilih **persona demo** (DR / KPw / Admin; hanya simulasi tampilan, *bukan* login dan *bukan* kontrol keamanan), mengubah **tanggal acuan** (default `metadata.as_of` = 5 Oktober 2026), dan tautan ke semua modul termasuk Dashboard DR dan Admin sesuai peran.
- **Lonceng notifikasi** — jumlah jadwal yang mulai ≤ 7 hari, permindok dan temuan yang lewat tenggat (dihitung dari data).
- Label **Mode Demo — Data Simulasi** selalu tampil. Di halaman Jadwal, kotak **Posisi Data** juga mengubah tanggal acuan.

Komponen animasi (NumberTicker, BorderBeam, ShineBorder, DotPattern, sorotan kartu) diadaptasi dari Magic UI yang juga dipublikasikan di 21st.dev — lihat `docs/THIRD-PARTY.md`. Animasi otomatis nonaktif bila perangkat meminta *reduced motion*.

Tata letak mengikuti referensi visual (header identitas teks + SEKAR, judul besar, kartu putih bersudut lembut, palet biru/teal/amber/violet). Ilustrasi gedung dan kepulauan adalah dekorasi SVG buatan sendiri, bukan foto, logo resmi, atau peta data.

## 4. Aturan data yang diterapkan

- Modul KPw tidak pernah memuat data unit `dr`; data DR hanya di `/dr`.
- Jumlah temuan dihitung per record; "KPw terdampak" dihitung dari `unit_id` unik.
- Status jadwal (selesai/berlangsung/mendatang) dan ketepatan waktu (tepat/terlambat/lewat tenggat/belum jatuh tempo) dihitung dari tanggal terhadap tanggal acuan.
- Persentase dengan penyebut nol ditampilkan "—".
- Status temuan **Selesai** mengisi `completed_at` (tanggal acuan); membuka kembali mengosongkannya.
- Tanggal penyampaian permindok tidak boleh mendahului tanggal permintaan atau melewati tanggal acuan; status Lengkap wajib memiliki tanggal penyampaian.
- Perubahan demo disimpan di `localStorage` dengan kunci ber-namespace & versi (`sekar-demo:v1:*`); file JSON asli tidak pernah diubah; tombol Reset di `/admin` mengembalikan seed.
- Dokumen/bukti diunduh sebagai `.txt` simulasi dari `content_text` — tidak ada tautan PDF palsu, tidak ada upload ke server.
- Export CSV meng-escape formula injection (`= + - @`), tanda kutip, koma, dan baris baru.

## 5. Struktur kode

```
data/sekar-dummy.json          Dataset simulasi (sumber tunggal mode dummy)
docs/                          Data dictionary, metaprompt, README paket awal, panduan Supabase
src/lib/types.ts               Tipe data (mengikuti DATA-DICTIONARY)
src/lib/analytics/*            Transformasi murni untuk KPI/chart/tabel (terpisah dari UI)
src/lib/scope.ts               Aturan cakupan DR/KPw/admin
src/lib/validation.ts          Validasi dataset (import)
src/lib/mutations.ts           Perubahan status/permindok (immutable)
src/lib/repository/            Antarmuka repository + implementasi dummy (localStorage) & Supabase (opsional)
src/components/                UI (layout, chart Recharts, tabel, drawer, halaman)
src/app/                       Route Next.js App Router (+ /api/documents/[id]/signed-url untuk Supabase)
supabase/                      Migration SQL (RLS), seed.sql hasil generate, tes RLS lokal
tests/, e2e/                   Unit test (Vitest) dan smoke test (Playwright)
```

Mode data dipilih lewat `APP_DATA_MODE` (default `dummy`). Lihat `.env.example`.

## 6. Menyimpan ke GitHub lewat web (tanpa terminal)

1. Masuk ke <https://github.com>, klik **New repository**, beri nama (mis. `sekar-demo`), pilih **Private**, lalu **Create repository**.
2. Di halaman repo baru, klik **uploading an existing file**.
3. Seret seluruh isi folder proyek **kecuali** folder `node_modules`, `.next`, `test-results`, dan file `.env*` selain `.env.example`.
4. Tulis pesan commit (mis. "Versi awal SEKAR demo") lalu klik **Commit changes**.

Jika sudah memakai Git: `git add . && git commit -m "..." && git push`.

## 7. Deploy ke Vercel (mode dummy)

> **Production branch = `main`.** Hanya commit di `main` yang tampil di domain utama (mis. `sekar-demo.vercel.app`). Push ke branch lain menghasilkan *Preview deployment* dengan URL tersendiri. Untuk memperbarui situs utama, gabungkan perubahan ke `main` (atau atur *Settings → Environments → Production → Branch Tracking* di Vercel).

1. Masuk ke <https://vercel.com> dengan akun GitHub.
2. **Add New → Project**, pilih repo SEKAR, klik **Import**.
3. Framework terdeteksi otomatis sebagai **Next.js**. Build command `npm run build`, output default.
4. Environment variables **tidak wajib**. (Opsional: `APP_DATA_MODE` = `dummy`.)
5. Klik **Deploy**. Setelah selesai, Vercel memberi URL publik.

Catatan: di mode dummy seluruh dataset dikirim ke browser. Ini simulasi UX, bukan perlindungan kerahasiaan — jangan pernah memasukkan data audit riil.

## 8. Supabase (opsional)

Mode Supabase **belum diaktifkan dan belum diuji terhadap proyek Supabase nyata** dalam repo ini. Yang sudah tersedia dan diuji:

- `supabase/migrations/0001_sekar_schema.sql` — tabel, constraint, trigger, RLS untuk SELECT/INSERT/UPDATE/DELETE di setiap tabel (termasuk `documents` dan `reference_materials`), bucket storage privat beserta policy.
- `supabase/seed.sql` — dibuat dari JSON dengan `npm run db:seed-sql`; tidak membuat akun Auth atau kata sandi.
- `npm run db:test-local` — menjalankan migration + seed + 27 pemeriksaan RLS pada PostgreSQL lokal dengan *stub* skema `auth`/`storage`. Ini memvalidasi SQL dan logika policy, **bukan** pengganti uji integrasi di Supabase sungguhan.

Langkah lengkap ada di [docs/SUPABASE.md](docs/SUPABASE.md).

## 9. Batasan demo

- Persona demo bukan autentikasi; semua data dummy dapat diperiksa siapa pun lewat browser.
- Perubahan hanya tersimpan di browser yang sama (localStorage); browser/perangkat lain tidak melihatnya.
- Tidak ada upload berkas; bukti dan tanda terima berupa `.txt` simulasi.
- Materi SGo/ketentuan/tutorial berlabel simulasi; tidak ada nomor ketentuan resmi atau video.
- Ilustrasi beranda adalah dekorasi abstrak, bukan peta atau data geografis.
- Mode Supabase memerlukan konfigurasi & pengujian di proyek Supabase Anda sebelum dipakai.

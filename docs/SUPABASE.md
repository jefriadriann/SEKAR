# SEKAR — Backend Supabase (opsional)

Status: **belum diaktifkan dan belum diuji pada proyek Supabase nyata.** Migration dan policy RLS sudah diuji pada PostgreSQL 16 lokal dengan stub skema `auth`/`storage` (`npm run db:test-local`). Lakukan uji ulang di proyek Supabase uji sebelum dipakai.

Jangan memasukkan data audit riil. Seed hanya berisi data simulasi.

## Arsitektur keamanan

| Aspek | Penerapan |
|---|---|
| Autentikasi | Supabase Auth (email + kata sandi) + **MFA TOTP wajib** untuk semua peran (pendaftaran, challenge, kelola faktor di `/keamanan`, reset kata sandi tetap lewat MFA) |
| AAL2 | Policy RESTRICTIVE `*_require_aal2` (migration 0003) di setiap tabel data & bucket storage: JWT tanpa `aal=aal2` tidak dapat membaca/menulis apa pun, apa pun perannya. Pengecualian: baris `user_access` milik sendiri boleh dibaca pada aal1 |
| Peran & unit | Tabel `public.user_access` (role `dr`/`kpw`/`admin`, `unit_id`). Hanya admin yang dapat insert/update/delete. Tidak memakai `user_metadata` yang dapat diubah pengguna |
| Akun baru | Tanpa baris `user_access` ⇒ tidak dapat membaca data apa pun (aplikasi menampilkan "Akun belum memiliki akses") |
| RLS | Aktif di semua tabel; policy per operasi. KPw hanya unit sendiri + materi `shared`; DR & admin semua unit; `compliance_items` hanya DR/admin; anon tidak memiliki hak |
| Kolom | Trigger membatasi non-admin hanya mengubah kolom tindak lanjut; KPw tidak dapat mengubah catatan DR |
| Konsistensi | `completed_at` mengikuti status (trigger); `submitted_at ≥ requested_at`, `total = rekonsiliasi + selisih` (constraint) |
| Storage | Bucket privat `sekar-documents`, path `<scope>/<file>`; `dr/…` hanya DR/admin; `kpw-xx/…` sesuai unit; `shared/…` semua pengguna yang dipetakan |
| Signed URL | `GET /api/documents/[id]/signed-url`: token diverifikasi dengan `getClaims` (tanda tangan + kedaluwarsa), wajib `aal2`, ID divalidasi, rate limit per pengguna di Postgres (`consume_rate_limit`), dokumen dibaca dengan token pengguna (RLS), signed URL 60 detik dibuat dengan token pengguna (policy storage berlaku). Respons `private, no-store` |
| Secret | Hanya `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publik). Service-role key tidak dipakai dan tidak boleh ada di browser/`NEXT_PUBLIC_*` |
| Kegagalan | Jika konfigurasi kurang atau query gagal, aplikasi menampilkan error — **tidak** beralih diam-diam ke dummy |

Menu yang disembunyikan hanyalah kenyamanan UI; pembatasan data sebenarnya ada di RLS.

## Langkah penyiapan

1. Buat proyek di <https://supabase.com> (gunakan proyek uji terlebih dahulu).
2. Buka **SQL Editor**, jalankan `supabase/migrations/0001_sekar_schema.sql` lalu `0002_asset_items_materials.sql` (masing-masing **sekali**; 0001 tidak idempoten, tetapi bila gagal seluruhnya dibatalkan). **Jangan jalankan 0003/0004/0005 satu per satu** — ketiganya dijalankan sekaligus lewat `supabase/activate-mfa-enforcement.sql` (lihat bagian aktivasi); 0003 mewajibkan MFA dan baru dijalankan setelah akun admin dipetakan dan sudah mendaftarkan authenticator (lihat `SECURITY.md` §7).
3. Isi data simulasi dengan `supabase/seed.sql` (±1,6 MB — terlalu besar untuk SQL Editor). Jalankan dari komputer Anda (butuh Node 20+ dan `psql`):

   ```bash
   export SUPABASE_PROJECT_REF=<ref proyek>        # bukan secret; dari URL dashboard
   read -rs SUPABASE_DB_URL && export SUPABASE_DB_URL  # tempel connection string "Session pooler" (tidak tampil)
   npm run db:seed-remote -- --check   # hanya baca: target + isi tabel
   npm run db:seed-remote -- --apply   # seed utuh dalam satu transaksi + verifikasi ID & jumlah
   unset SUPABASE_DB_URL
   ```

   Script menolak berjalan bila connection string tidak menunjuk ke `SUPABASE_PROJECT_REF`, bila 0001/0002 belum ada, dan tidak pernah mencetak password. Seed memakai `on conflict do nothing` (data yang ada dipertahankan); error = rollback penuh. Uji lokal script: `npm run db:test-seed-script`.
4. **Authentication → Providers**: aktifkan Email. Disarankan menonaktifkan pendaftaran publik (**Allow new users to sign up** = off) dan mengundang pengguna dari dashboard.
5. Buat/undang akun pengguna di **Authentication → Users**. Seed tidak membuat akun atau kata sandi.
6. Petakan akun ke peran & unit (jalankan sebagai pemilik proyek di SQL Editor):

   ```sql
   insert into public.user_access (user_id, role, unit_id, display_name)
   select id, 'kpw', 'kpw-01', 'Pengguna KPw 01' from auth.users where email = 'nama@contoh.go.id';
   -- role: 'dr' (unit_id 'dr'), 'kpw' (unit_id 'kpw-xx'), atau 'admin' (unit_id 'dr')
   ```

7. (Opsional) unggah berkas ke bucket `sekar-documents` dengan path `<scope>/<id>.txt` dan isi kolom `documents.storage_path`. Tanpa `storage_path`, aplikasi menampilkan `content_text` sebagai `.txt`.
8. Di Vercel (**Settings → Environment Variables**) atau `.env.local`:

   ```
   APP_DATA_MODE=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://<proyek>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```

   Lalu build ulang/deploy ulang (variabel dibaca saat build).

## Aktivasi enforcement MFA (setelah akun terpetakan mendaftarkan authenticator)

1. Login ke website (Preview) dengan akun yang sudah dipetakan di `user_access`, daftarkan authenticator.
2. SQL Editor → jalankan seluruh isi `supabase/activate-mfa-enforcement.sql` (dibangkitkan `npm run db:activation-sql`). Bila belum ada faktor TOTP terverifikasi, skrip berhenti dengan pesan `DIBATALKAN` tanpa perubahan.
   Skrip ini juga menerapkan 0004 (pengerasan default), 0005 (undangan pengguna) dan menyelaraskan nama korwil unit yang sudah ada (Sumatera, Jawa, Balinusra, Kalimantan, Sulampua) tanpa menyentuh data audit.
3. Hasil berupa tabel 28 baris; semua harus `LULUS`. Uji ulang kapan saja dengan `supabase/tests/remote-verify.sql` (tidak mengubah data).

## Mengundang pengguna (46 KPw)

Peran dan unit **ditetapkan pengundang**, bukan dipilih pengguna (bila pengguna bisa memilih kantornya sendiri, siapa pun yang diundang dapat membuka data kantor lain).

1. Login sebagai DR/admin → menu pengguna → **Kelola pengguna** (`/pengguna`). Isi email, nama, peran (DR hanya dapat mengundang KPw) dan kantor (mis. *KPw Simulasi 01 · Aceh*). Tersimpan di `pending_invites`, berlaku 14 hari.
2. Supabase Dashboard → **Authentication → Users → Invite user** → email yang sama. Saat akun dibuat, trigger `sekar_apply_pending_invite` memetakan `user_access` (peran + unit dari undangan) dan menandai undangan terpakai.
3. Pengguna membuka tautan email → wajib mendaftarkan authenticator (MFA) → membuat kata sandi sendiri → masuk ke tampilan KPw-nya. Login berikutnya: email + kata sandi + kode authenticator.
4. Prasyarat: *Authentication → URL Configuration* → **Site URL** dan **Redirect URLs** berisi alamat Preview/aplikasi; *Allow new users to sign up* = off. Bila Vercel Deployment Protection aktif untuk Preview, pengguna di luar tim Vercel tidak dapat membuka tautan.

Akun yang dibuat tanpa undangan tidak memperoleh akses (tidak ada baris `user_access`) sampai dipetakan pemilik proyek.

## Preview khusus branch keamanan

`config/preview-supabase.json` berisi URL proyek uji dan publishable/anon key (nilai publik) untuk branch `claude/demo-aset-sgo-q2logj`. Hanya berlaku pada deployment Vercel Preview branch tersebut (`VERCEL_ENV=preview`); Production tetap mode dummy. Bila variabel `APP_DATA_MODE` / `NEXT_PUBLIC_SUPABASE_*` diatur di Vercel, nilai itu yang dipakai.

## Daftar uji yang masih harus dilakukan di Supabase nyata

- Login → wajib daftar authenticator; sebelum MFA, REST `/rest/v1/findings` dengan token aal1 harus mengembalikan `[]`.
- Login dengan faktor → challenge; kode salah ditolak; setelah benar data tampil.
- Hapus faktor memerlukan kode; faktor terakhir tidak dapat dihapus.
- Reset kata sandi dari tautan email tetap meminta kode MFA sebelum kata sandi baru dapat disimpan.
- Login dengan akun DR, KPw, admin, dan akun yang belum dipetakan.
- Pastikan KPw tidak dapat membaca temuan/dokumen DR maupun unit lain lewat REST (`/rest/v1/findings?unit_id=eq.dr`).
- Pastikan signed URL dokumen DR ditolak untuk KPw.
- Pastikan pengguna tidak dapat mengubah `user_access` miliknya sendiri.
- Undang satu akun KPw uji (alur di atas): tautan → MFA → buat kata sandi → hanya data unitnya yang tampil; `pending_invites` tidak terbaca oleh KPw.
- Fitur import/reset dataset di `/admin` hanya tersedia di mode dummy.

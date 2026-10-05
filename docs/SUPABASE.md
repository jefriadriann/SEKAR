# SEKAR — Backend Supabase (opsional)

Status: **belum diaktifkan dan belum diuji pada proyek Supabase nyata.** Migration dan policy RLS sudah diuji pada PostgreSQL 16 lokal dengan stub skema `auth`/`storage` (`npm run db:test-local`). Lakukan uji ulang di proyek Supabase uji sebelum dipakai.

Jangan memasukkan data audit riil. Seed hanya berisi data simulasi.

## Arsitektur keamanan

| Aspek | Penerapan |
|---|---|
| Autentikasi | Supabase Auth (email + kata sandi) di halaman masuk aplikasi |
| Peran & unit | Tabel `public.user_access` (role `dr`/`kpw`/`admin`, `unit_id`). Hanya admin yang dapat insert/update/delete. Tidak memakai `user_metadata` yang dapat diubah pengguna |
| Akun baru | Tanpa baris `user_access` ⇒ tidak dapat membaca data apa pun (aplikasi menampilkan "Akun belum memiliki akses") |
| RLS | Aktif di semua tabel; policy per operasi. KPw hanya unit sendiri + materi `shared`; DR & admin semua unit; `compliance_items` hanya DR/admin; anon tidak memiliki hak |
| Kolom | Trigger membatasi non-admin hanya mengubah kolom tindak lanjut; KPw tidak dapat mengubah catatan DR |
| Konsistensi | `completed_at` mengikuti status (trigger); `submitted_at ≥ requested_at`, `total = rekonsiliasi + selisih` (constraint) |
| Storage | Bucket privat `sekar-documents`, path `<scope>/<file>`; `dr/…` hanya DR/admin; `kpw-xx/…` sesuai unit; `shared/…` semua pengguna yang dipetakan |
| Signed URL | `GET /api/documents/[id]/signed-url` memvalidasi token sesi, membaca dokumen dengan token pengguna (RLS), lalu membuat signed URL 60 detik memakai token pengguna (policy storage berlaku) |
| Secret | Hanya `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publik). Service-role key tidak dipakai dan tidak boleh ada di browser/`NEXT_PUBLIC_*` |
| Kegagalan | Jika konfigurasi kurang atau query gagal, aplikasi menampilkan error — **tidak** beralih diam-diam ke dummy |

Menu yang disembunyikan hanyalah kenyamanan UI; pembatasan data sebenarnya ada di RLS.

## Langkah penyiapan

1. Buat proyek di <https://supabase.com> (gunakan proyek uji terlebih dahulu).
2. Buka **SQL Editor**, jalankan seluruh isi `supabase/migrations/0001_sekar_schema.sql`.
3. (Opsional) perbarui seed: `npm run db:seed-sql`, lalu jalankan isi `supabase/seed.sql` di SQL Editor.
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

## Daftar uji yang masih harus dilakukan di Supabase nyata

- Login dengan akun DR, KPw, admin, dan akun yang belum dipetakan.
- Pastikan KPw tidak dapat membaca temuan/dokumen DR maupun unit lain lewat REST (`/rest/v1/findings?unit_id=eq.dr`).
- Pastikan signed URL dokumen DR ditolak untuk KPw.
- Pastikan pengguna tidak dapat mengubah `user_access` miliknya sendiri.
- Fitur import/reset dataset di `/admin` hanya tersedia di mode dummy.

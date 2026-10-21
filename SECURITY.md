# SEKAR — Keamanan aplikasi

Dokumen ini mencatat kontrol keamanan yang **benar-benar diterapkan dan diuji** di repository, pengaturan cloud yang masih harus dilakukan pemilik akun, urutan penerapan/rollback, dan risiko tersisa. Ini **bukan** sertifikasi dan tidak menyatakan aplikasi "100% aman".

Label status:

- **SUDAH DITERAPKAN** — ada di kode/migration repo ini.
- **SUDAH DIUJI** — dibuktikan oleh tes otomatis yang dijalankan (lihat "Hasil pengujian").
- **PERLU PENGATURAN CLOUD** — hanya dapat diatur di dashboard GitHub/Vercel/Supabase/email oleh pemilik akun.
- **BELUM TERVERIFIKASI** — belum dapat dibuktikan dari lingkungan ini.

## 1. Arsitektur & alur data

```
Browser ──(HTTPS)──► Vercel (Next.js 16, halaman statis + 1 route API)
   │                     └─ GET /api/documents/[id]/signed-url ──► Supabase (token pengguna, RLS)
   └─(supabase-js, anon/publishable key + JWT pengguna)──► Supabase Auth (password + MFA TOTP)
                                                        └► PostgREST + Storage (RLS + policy aal2)
GitHub (repo) ──push──► Vercel build ──► deployment production/preview
```

Dua mode data (`APP_DATA_MODE`):

| Mode | Autentikasi | Kontrol akses data | Catatan |
|---|---|---|---|
| `dummy` (default; deployment Vercel saat ini) | Akun demo **simulasi di browser**, kredensial sengaja publik | **Tidak ada.** Seluruh dataset dummy dikirim sebagai berkas JS statis dan dapat diunduh siapa pun | Sesuai tujuan demo; JANGAN pernah memakai mode ini untuk data riil |
| `supabase` | Supabase Auth: email + kata sandi + **MFA TOTP wajib** | RLS peran/unit + policy restrictive **aal2** di database & storage; API memeriksa klaim token | Belum diuji pada proyek Supabase sungguhan (lihat §6) |

Tidak ada database lain, penyedia auth lain, upload pengguna, cookie sesi buatan sendiri, atau GitHub Actions sebelum perubahan ini.

## 2. Temuan

| # | Temuan | Jenis | Dampak | Tindakan |
|---|---|---|---|---|
| T1 | Mode Supabase tidak memiliki MFA; RLS tidak memeriksa `aal`. Kontrol negatif membuktikan: tanpa migration 0003, pengguna KPw dengan sesi aal1 dapat membaca **37 temuan** unitnya | **Terbukti** (tes) | Akun dengan kata sandi bocor = akses data penuh sesuai peran | Diperbaiki: §3 A |
| T2 | Endpoint signed-url tidak memeriksa tingkat autentikasi (aal), tidak memvalidasi ID, tanpa rate limit | Terbukti (kode) | Penyalahgunaan endpoint, enumerasi | Diperbaiki: §3 D |
| T3 | Tidak ada security header (CSP, nosniff, frame, referrer, HSTS), header `X-Powered-By` aktif | Terbukti (respons HTTP) | Memperbesar dampak XSS/clickjacking; token Supabase disimpan di `localStorage` sehingga XSS = pencurian sesi | Diperbaiki: §3 E |
| T4 | Tidak ada penjaga agar service-role/secret key tidak dimasukkan ke variabel `NEXT_PUBLIC_*` (yang terkirim ke browser) | Terbukti (kode) | Kebocoran key berhak penuh (melewati RLS) | Diperbaiki: §3 C |
| T5 | Mode dummy: data & akun demo (termasuk "admin") publik di bundle | Terbukti, **disengaja** | Tidak ada — data dummy. Menjadi risiko bila data riil dimasukkan | Didokumentasikan; mode Supabase tidak memakai akun demo |
| T6 | DevDependency: `vite` (high) — diperbaiki dengan upgrade kompatibel; `braces/micromatch` via `eslint-config-next` (high, ReDoS/DoS pada tooling lint) | Terbukti (`npm audit`) | Hanya alat pengembangan; tidak ada di runtime | Vite diperbaiki; sisanya menunggu rilis eslint-config-next (lihat §8) |
| T7 | Secret di repo/riwayat git | Diperiksa | — | **Tidak ditemukan** pada 169+ file, seluruh riwayat git, dan bundle browser |
| T8 | Pengaturan GitHub/Vercel/Supabase (2FA akun, Deployment Protection, redirect URL, rate limit Auth, backup) | Tidak terlihat dari repo | Bergantung konfigurasi | §6 |

## 3. Kontrol yang diterapkan

### A. MFA pengguna website (mode Supabase)

| Kontrol | Status |
|---|---|
| TOTP via API resmi `supabase.auth.mfa` (enroll → challengeAndVerify → aal2); tidak ada kriptografi buatan sendiri | SUDAH DITERAPKAN, SUDAH DIUJI |
| MFA **wajib untuk semua peran** (admin, DR, KPw). Sesi aal1 hanya melihat layar pendaftaran/challenge dan tombol Keluar; data tidak dimuat | SUDAH DITERAPKAN, SUDAH DIUJI |
| Penegakan server: policy RESTRICTIVE `*_require_aal2` di 10 tabel data, `user_access` (tulis), dan bucket `sekar-documents`; dikombinasikan (AND) dengan RLS peran/unit — aal2 saja tidak memberi hak | SUDAH DITERAPKAN, SUDAH DIUJI |
| Akses URL langsung/REST langsung dengan sesi aal1 → kosong/403 | SUDAH DIUJI |
| Setiap pengguna punya faktornya sendiri (faktor terikat akun Supabase Auth) | SUDAH DITERAPKAN (properti Supabase) |
| Kelola faktor di `/keamanan`: tambah authenticator cadangan/pengganti; hapus faktor **wajib kode TOTP baru (step-up)**; faktor terakhir tidak dapat dihapus | SUDAH DITERAPKAN, SUDAH DIUJI |
| Reset kata sandi: tautan email memberi sesi aal1 → wajib challenge MFA → baru dapat menyimpan kata sandi baru → sesi diakhiri. Respons "lupa kata sandi" generik (tanpa enumerasi akun) | SUDAH DITERAPKAN, SUDAH DIUJI (dengan Supabase tiruan) |
| QR & kunci manual hanya di state komponen, kunci manual tampil atas permintaan, tidak ditulis ke log/storage | SUDAH DITERAPKAN, SUDAH DIUJI |
| Pembatasan percobaan kode: UI mengunci 30 detik setelah 5 kegagalan (UX); batas sebenarnya rate limit Supabase Auth | SUDAH DITERAPKAN (UI); PERLU PENGATURAN CLOUD (Auth rate limits) |
| Tidak ada bypass MFA, akun tersembunyi, atau akun demo di mode Supabase | SUDAH DITERAPKAN |
| Pemulihan tanpa mengunci pemilik: authenticator cadangan + reset faktor oleh pengelola proyek (runbook §7). Pemilik proyek tetap memiliki akses Dashboard/SQL Editor yang tidak tunduk pada RLS | SUDAH DITERAPKAN (dokumen); PERLU PENGATURAN CLOUD (MFA akun Supabase pemilik) |
| Passkey/WebAuthn | **Tidak diterapkan.** Pustaka terpasang mengenal faktor `webauthn`, tetapi dokumentasi panduan MFA resmi Supabase saat ini hanya membahas TOTP & telepon; ditunda sampai fitur stabil dan dapat diuji |
| Recovery code bawaan Supabase | **Tidak diterapkan.** API `mfa.recoveryCodes` ada di klien, tetapi belum terdokumentasi di panduan resmi; dipakai authenticator cadangan sebagai gantinya |

### B. Otorisasi & pemisahan data

| Kontrol | Status |
|---|---|
| Peran (`dr`/`kpw`/`admin`) & unit hanya dari `public.user_access`, yang hanya dapat diubah admin (aal2). Tidak memakai `user_metadata`/input browser | SUDAH DITERAPKAN, SUDAH DIUJI |
| Deny-by-default: akun tanpa baris `user_access` tidak melihat data; anon tidak punya hak tabel | SUDAH DIUJI |
| KPw hanya unit sendiri + materi `shared`; DR/admin semua unit; `compliance_items` hanya DR/admin | SUDAH DIUJI |
| Manipulasi ID: KPw tidak dapat membaca/mengubah/menghapus record unit lain (temuan, permindok), tidak dapat insert temuan, tidak dapat mengubah `asset_items` | SUDAH DIUJI |
| Tidak dapat menaikkan peran atau mengganti unit sendiri (KPw maupun DR) | SUDAH DIUJI |
| Kolom non-tindak-lanjut dilindungi trigger | SUDAH DIUJI |
| Filter dashboard di UI ≠ pembatasan akses; pembatasan sebenarnya di RLS | SUDAH DITERAPKAN |
| Route server tidak memakai service-role; memakai token pengguna sehingga RLS & policy storage berlaku | SUDAH DITERAPKAN |

### C. Secret & integrasi

| Kontrol | Status |
|---|---|
| Aplikasi hanya membutuhkan nilai publik (`NEXT_PUBLIC_SUPABASE_URL`, anon/publishable key) | SUDAH DITERAPKAN |
| `readAppConfig` menolak berjalan bila anon key ternyata `sb_secret_…`/JWT `role=service_role`, bila ada variabel `NEXT_PUBLIC_*` bernama SECRET/SERVICE_ROLE/PRIVATE/PASSWORD, atau URL Supabase non-HTTPS; nilai key tidak disertakan dalam pesan dan tidak diteruskan ke browser | SUDAH DITERAPKAN, SUDAH DIUJI |
| `.gitignore` mengabaikan `.env*` (kecuali `.env.example`), `.vercel`, `*.pem`; `.env.example` hanya placeholder | SUDAH DITERAPKAN |
| Pemindai secret `scripts/check-secrets.mjs`: file yang dilacak, bundle browser, dan seluruh riwayat git; hanya mencetak lokasi & jenis | SUDAH DITERAPKAN, SUDAH DIUJI (kontrol positif) |

### D. Sesi, API, input

| Kontrol | Status |
|---|---|
| Token diverifikasi server dengan `supabase.auth.getClaims(token)` (tanda tangan + `exp`), wajib `role=authenticated` & `aal=aal2` | SUDAH DITERAPKAN, SUDAH DIUJI (unit + HTTP) |
| Sesi kedaluwarsa/tidak valid/format salah → 401; aal1 → 403 | SUDAH DIUJI |
| Validasi ID dokumen (`^[A-Za-z0-9_-]{1,64}$`); query PostgREST terparameterisasi | SUDAH DIUJI |
| Rate limit per pengguna untuk signed-url (30/menit) disimpan di Postgres (`consume_rate_limit`, tabel tanpa grant) — bekerja di serverless; gagal memeriksa → 503 (fail closed) | SUDAH DITERAPKAN, SUDAH DIUJI |
| Respons API `private, no-store`, `Vary: Authorization`, `X-Robots-Tag: noindex`; hanya `GET` (metode lain 405) | SUDAH DIUJI |
| Log keamanan terstruktur (`signed_url_denied`/`issued`) tanpa token atau signed URL | SUDAH DIUJI |
| CSRF: autentikasi memakai header `Authorization: Bearer` (bukan cookie), sehingga request lintas situs tidak membawa kredensial; tidak ada endpoint pengubah state di server Next.js | SUDAH DITERAPKAN (desain) |
| CORS: route tidak mengirim header CORS → browser lain tidak dapat membaca respons; CORS bukan pengganti autentikasi | SUDAH DITERAPKAN |
| XSS: React escaping; tidak ada `dangerouslySetInnerHTML`; QR dirender sebagai `<img>`; CSP ditegakkan | SUDAH DITERAPKAN |
| Upload pengguna | Tidak ada fitur upload (hanya admin via dashboard Supabase) |

### E. Dependency & deployment

| Kontrol | Status |
|---|---|
| Security headers di semua rute: CSP (ditegakkan), `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, HSTS, COOP; `X-Powered-By` dimatikan | SUDAH DITERAPKAN, SUDAH DIUJI (e2e memeriksa header & **nol pelanggaran CSP** di 18 skenario) |
| CI GitHub Actions: `permissions: contents: read`, trigger `pull_request` (bukan `pull_request_target`), tanpa secret, `persist-credentials: false`; menjalankan check + audit + uji RLS | SUDAH DITERAPKAN; BELUM TERVERIFIKASI berjalan di GitHub |
| Dependabot (npm & actions) | SUDAH DITERAPKAN; PERLU PENGATURAN CLOUD (alerts aktif) |
| `npm audit --omit=dev`: 0 kerentanan | SUDAH DIUJI |

## 4. File yang berubah

| File | Alasan |
|---|---|
| `supabase/migrations/0003_mfa_aal2_rate_limit.sql` | Policy restrictive aal2, `is_aal2()`, tabel & fungsi rate limit |
| `supabase/rollback/0003_mfa_aal2_rate_limit.down.sql` | Rollback 0003 |
| `supabase/tests/00_local_stub.sql`, `02_rls_check.sql`, `03_rollback_check.sql`, `run-local.sh` | Stub `auth.jwt()`; 61 pemeriksaan RLS/MFA; uji rollback & re-apply |
| `src/lib/auth/mfa.ts` | Alur MFA di atas API resmi Supabase |
| `src/lib/server/signed-url.ts`, `src/app/api/documents/[id]/signed-url/route.ts` | Verifikasi klaim, aal2, validasi, rate limit, log aman |
| `src/lib/config.ts` | Penjaga secret pada variabel publik |
| `src/lib/repository/supabase.ts`, `src/components/providers/SekarProvider.tsx` | Gerbang MFA sebelum data dimuat; kontrol MFA/reset kata sandi |
| `src/components/auth/MfaScreens.tsx`, `LoginPage.tsx`, `src/components/pages/KeamananView.tsx`, `src/app/keamanan/page.tsx`, `AppShell.tsx`, `src/lib/scope.ts` | UI pendaftaran/challenge/reset, halaman Keamanan Akun |
| `next.config.ts` | Security headers & CSP, `poweredByHeader: false` |
| `scripts/check-secrets.mjs`, `package.json` | Pemindaian secret; `check` kini memuat scan file & bundle |
| `.github/workflows/ci.yml`, `.github/dependabot.yml` | CI hak minimum, pembaruan dependency |
| `tests/security.test.ts`, `tests/mfa.test.ts`, `e2e/mfa.spec.ts`, `e2e/supabase-mock.ts`, `e2e/smoke.spec.ts`, `playwright.supabase.config.ts`, `playwright.config.ts` | Pengujian |
| `.env.example`, `.gitignore`, `eslint.config.mjs`, `AGENTS.md`, `README.md`, `docs/SUPABASE.md`, `package-lock.json` | Dokumentasi, konfigurasi, upgrade `vite` (patch) |

## 5. Hasil pengujian (dijalankan di lingkungan lokal/CI container)

| Perintah | Hasil |
|---|---|
| `npm run check` (typecheck, lint, 56 unit test, scan secret file, build, scan bundle) | Lulus |
| `npm run db:test-local` (PostgreSQL 16 + stub `auth`/`storage`) | 61 pemeriksaan RLS/MFA lulus + rollback/re-apply 0003 lulus. **Kontrol negatif:** tanpa 0003, tes gagal (KPw aal1 membaca 37 temuan) |
| `npm run test:e2e` (mode demo, 15 skenario) | Lulus; header keamanan terverifikasi; 0 pelanggaran CSP |
| `npm run test:e2e:supabase` (3 skenario MFA, Supabase ditiru di jaringan browser) | Lulus; tidak ada request data sebelum aal2; ganti kata sandi hanya terjadi dengan token aal2 |
| Probe HTTP ke build produksi mode Supabase | Tanpa token 401, token palsu 401, `POST` 405, `Cache-Control: private, no-store`, log tanpa token |
| `npm run security:secrets` / `security:history` / `security:bundle` | Tidak ada secret berhak istimewa (file, seluruh riwayat git, bundle `.next` & `.next-supabase`) |
| `npm audit --omit=dev` | 0 kerentanan |

Pemetaan ke uji wajib: (1) pengunjung tanpa login — anon RLS + API 401; (2) belum MFA — RLS aal1 = 0 baris, API 403, e2e tanpa request data; (3) MFA sesuai izin — RLS aal2 KPw/DR/admin; (4) ganti ID — 7 pemeriksaan RLS + validasi ID API; (5) fungsi admin/naik peran — RLS `user_access`, insert temuan, units; (6) sesi kedaluwarsa/tidak valid — unit test & probe HTTP; (7) secret di bundle — `security:bundle`; (8) login/enroll/logout/pemulihan — e2e kedua mode.

## 6. Pengaturan cloud yang masih harus dilakukan (PERLU PENGATURAN CLOUD)

### Supabase (saat mode Supabase diaktifkan)
1. Gunakan **proyek uji terpisah** untuk preview; proyek produksi hanya untuk deployment production.
2. **Authentication → Sign In / Providers**: matikan *Allow new users to sign up*; aktifkan konfirmasi email. Akun dibuat/diundang admin.
3. **Authentication → Multi-Factor**: pastikan TOTP aktif.
4. **Authentication → Rate Limits**: tinjau batas sign-in, verifikasi token/MFA, dan pengiriman email (mis. verifikasi MFA ≤ 30 per 5 menit per IP).
5. **Authentication → Passwords / Policies**: panjang minimal ≥ 12, aktifkan *leaked password protection* (bila tersedia di paket), *Secure password change*, *Secure email change*.
6. **Authentication → URL Configuration**: *Site URL* = domain production; *Redirect URLs* hanya domain production (+ `http://localhost:3000` untuk pengembangan). **Jangan** memakai wildcard `*.vercel.app`, karena tautan reset dapat diarahkan ke deployment lain.
7. **Sessions** (bila paket mendukung): batas waktu sesi / inactivity timeout.
8. **JWT signing keys**: gunakan asymmetric signing keys dan publishable/secret keys baru; nonaktifkan legacy keys setelah migrasi. `getClaims` di server lalu memverifikasi token secara lokal.
9. Jalankan migration 0001 → 0002 → 0003 (urutan §7), lalu daftar uji di `docs/SUPABASE.md`.
10. Aktifkan backup / Point-in-Time Recovery (sesuai paket) dan pantau **Auth logs** & **Postgres logs**.
11. Aktifkan MFA untuk akun pemilik/anggota organisasi Supabase.

### Vercel
1. **Settings → Environment Variables**: pisahkan Production vs Preview. Preview → proyek Supabase uji (atau mode dummy); jangan beri Preview kredensial production. Tandai variabel sebagai *Sensitive* bila ada.
2. **Settings → Deployment Protection**: aktifkan *Vercel Authentication* minimal untuk Preview. Karena data mode dummy publik di bundle, pertimbangkan perlindungan untuk *All Deployments* bila demo tidak dimaksudkan publik. Perlindungan berlaku juga untuk deployment lama; hapus deployment lama yang tidak diperlukan.
3. **Settings → Git → Fork Protection**: biarkan aktif (PR dari fork tidak otomatis memakai env).
4. **Firewall**: pertimbangkan aturan rate limit untuk `/api/*` (sesuai paket).
5. **Team Settings → Security**: wajibkan 2FA untuk anggota tim.
6. Pantau **Logs** untuk event `signed_url_denied`.

### GitHub
1. Wajibkan 2FA (akun pemilik; *Require two-factor authentication* bila organisasi).
2. **Rulesets/branch protection** untuk `main`: wajib PR + status check CI (`check`, `database-rls`), larang force-push & penghapusan. (Catatan: push langsung ke `main` sebelumnya dilakukan atas permintaan pemilik; ruleset mencegahnya ke depan.)
3. **Settings → Code security**: aktifkan Dependabot alerts, secret scanning, dan push protection.
4. **Settings → Actions**: default `GITHUB_TOKEN` read-only; *Require approval for workflows from outside collaborators*.
5. Opsional: pin action ke commit SHA (`actions/checkout`, `actions/setup-node`); Dependabot akan memperbaruinya.

### Email & akun pengelola
Aktifkan MFA (authenticator/passkey) untuk email pemulihan dan semua akun GitHub, Vercel, Supabase; simpan recovery code masing-masing secara offline. Status pengaturan ini **BELUM TERVERIFIKASI** dari repo.

## 7. Urutan penerapan & rollback

**Kondisi sekarang:** deployment Vercel berjalan pada mode dummy. Perubahan ini pada mode dummy hanya menambahkan security headers/CSP (diuji e2e); alur MFA tidak aktif.

Penerapan mode Supabase (bertahap, reversible):
1. Proyek Supabase **uji**: jalankan 0001 → 0002, seed bila perlu, buat akun admin, petakan `user_access`.
2. Deploy aplikasi (Preview, env proyek uji). Login admin → aplikasi mewajibkan pendaftaran authenticator; daftarkan **dua** authenticator (utama + cadangan).
3. Jalankan **0003** di proyek uji. Ulangi daftar uji `docs/SUPABASE.md` (REST dengan token aal1 harus `[]`).
4. Ulangi 1–3 pada proyek production. Urutan aplikasi dulu, baru 0003, memastikan pengguna dapat mendaftar MFA sebelum database menolak sesi aal1. Pendaftaran MFA memakai Auth API dan tidak terhalang 0003; pemilik proyek tetap dapat mengelola data via Dashboard/SQL Editor.

Rollback:
- **Aplikasi:** Vercel → Deployments → pilih deployment sebelumnya → *Instant Rollback* (atau `git revert` lalu deploy).
- **Database 0003:** jalankan `supabase/rollback/0003_mfa_aal2_rate_limit.down.sql` (teruji lokal; re-apply 0003 juga teruji idempoten). Setelah rollback, data dapat dibaca tanpa MFA — terapkan ulang 0003 secepatnya.

### Runbook: pengguna kehilangan semua authenticator
1. Verifikasi identitas di luar aplikasi (mis. panggilan ke nomor resmi / atasan langsung). Jangan memproses hanya berdasarkan email.
2. Pengelola proyek Supabase (akun dengan MFA) menghapus faktor pengguna: via Dashboard **Authentication → Users** (bila tersedia opsi hapus faktor MFA), atau Admin API `supabase.auth.admin.mfa.deleteFactor({ id, userId })` dari lingkungan server tepercaya, atau SQL Editor: `delete from auth.mfa_factors where user_id = '<uuid>';`.
3. Akhiri sesi lama pengguna (Dashboard → user → sign out / revoke sessions).
4. Pengguna login dan wajib mendaftarkan authenticator baru. Catat kejadian.

## 8. Risiko tersisa & keterbatasan

- **Belum diuji pada proyek Supabase sungguhan.** RLS diuji di PostgreSQL lokal dengan stub `auth.jwt()`/`auth.uid()`; alur MFA UI diuji dengan Supabase tiruan. Perilaku nyata GoTrue (rate limit, unenroll yang mensyaratkan aal2, email reset) **BELUM TERVERIFIKASI**.
- **CSP memakai `'unsafe-inline'` untuk skrip** (dibutuhkan halaman statis Next.js tanpa nonce). Nonce akan memaksa render dinamis. Sesi Supabase disimpan di `localStorage` (pola bawaan supabase-js), sehingga XSS tetap berdampak tinggi; mitigasinya escaping React, CSP ketat untuk sumber lain, tanpa skrip pihak ketiga.
- **Mode dummy tidak memiliki kontrol akses** dan bundle mode Supabase pun masih memuat chunk data dummy. Jangan pernah menaruh data riil di `data/*.json`.
- Rate limit aplikasi hanya pada endpoint signed-url; login/MFA/reset mengandalkan rate limit Supabase Auth (pengaturan cloud).
- Tidak ada recovery code; pemulihan bergantung pada authenticator cadangan atau proses admin.
- Logout hanya mencabut refresh token; access token yang sudah terbit tetap valid sampai `exp` (bawaan JWT). Persingkat masa berlaku JWT di Supabase bila perlu.
- Kerentanan devDependency `braces` (via `eslint-config-next`) belum memiliki perbaikan kompatibel; berdampak pada tooling lint, bukan runtime.
- CI belum pernah berjalan di GitHub; job `database-rls` mengandalkan PostgreSQL yang terpasang di runner `ubuntu-latest`.
- Pengaturan cloud §6 **BELUM TERVERIFIKASI**.

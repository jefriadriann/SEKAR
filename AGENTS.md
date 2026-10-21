<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SEKAR — konvensi proyek

- Aplikasi demo dengan DATA SIMULASI saja (`data/sekar-dummy.json`). Jangan menambahkan data audit riil.
- Mode data via `APP_DATA_MODE` (default `dummy`). UI hanya bergantung pada `SekarRepository` (`src/lib/repository`).
- Logika KPI/chart/filter berada di `src/lib/analytics` (fungsi murni, diuji di `tests/`); komponen tidak menghitung angka sendiri.
- Modul KPw selalu memakai `kpwModuleData()` sehingga data unit `dr` tidak pernah masuk.
- Sebelum commit: `npm run check`; bila UI berubah, `npm run build && npm run test:e2e`.
- Bila mengubah skema Supabase: perbarui migration, `npm run db:seed-sql`, dan `npm run db:test-local`.

# Keamanan (lihat SECURITY.md)

- Mode `supabase`: MFA (TOTP, aal2) wajib untuk semua peran. Penegakan di database (policy RESTRICTIVE `*_require_aal2`, migration 0003) dan di API (`src/lib/server/signed-url.ts`); UI hanya membantu. Jangan menambah tabel/route data tanpa policy aal2 + RLS peran/unit dan tes di `supabase/tests/02_rls_check.sql`.
- Jangan memakai service-role key di aplikasi/browser; route server memakai token pengguna agar RLS tetap berlaku.
- Jangan menambah bypass MFA, akun istimewa tersembunyi, atau logging token/secret/QR MFA.
- Sebelum commit: `npm run check` (termasuk pemindaian secret file & bundle). Bila auth/DB berubah: `npm run db:test-local` dan `npm run test:e2e:supabase`.

/**
 * E2E mode Supabase (MFA). Dijalankan dengan playwright.supabase.config.ts
 * terhadap build terpisah (APP_DATA_MODE=supabase). Supabase ditiru di
 * jaringan browser — lihat e2e/supabase-mock.ts.
 */
import { expect, test, type Page } from "@playwright/test";
import { jwt, mockSupabase, VALID_CODE, type MockState } from "./supabase-mock";

/** Kumpulkan pelanggaran CSP; harus kosong di akhir setiap tes. */
function watchCsp(page: Page) {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
  });
  return violations;
}

async function login(page: Page, state: MockState) {
  await page.goto("/");
  await page.getByLabel("Email").fill("kpw01@contoh.test");
  await page.getByLabel("Kata sandi", { exact: true }).fill(state.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}

const noDataBeforeMfa = (s: MockState) => expect(s.dataRequests.filter((r) => r.aal !== "aal2")).toEqual([]);

test("pengguna baru: wajib daftar authenticator sebelum data dimuat; URL langsung tetap tertahan", async ({ page }) => {
  const csp = watchCsp(page);
  const s = await mockSupabase(page, { factors: "none" });
  await login(page, s);
  await expect(page.getByRole("heading", { name: "Aktifkan verifikasi dua langkah" })).toBeVisible();
  // Akses langsung ke modul data tetap menampilkan layar MFA, bukan data.
  await page.goto("/hasil-pemeriksaan");
  await expect(page.getByRole("heading", { name: "Aktifkan verifikasi dua langkah" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hasil Pemeriksaan KPwDN" })).toHaveCount(0);
  expect(s.dataRequests).toEqual([]);

  await page.getByRole("button", { name: "Mulai pendaftaran authenticator" }).click();
  await expect(page.getByRole("img", { name: "Kode QR untuk aplikasi authenticator" })).toBeVisible();
  // Kunci manual hanya tampil atas permintaan.
  await expect(page.getByText("PLACEHOLDERSECRET")).toHaveCount(0);
  await page.getByRole("button", { name: /Tampilkan kunci manual/ }).click();
  await expect(page.getByText("PLACEHOLDERSECRET")).toBeVisible();

  await page.getByLabel(/Kode 6 digit/).fill("000000");
  await page.getByRole("button", { name: "Verifikasi dan aktifkan" }).click();
  await expect(page.getByText("Invalid TOTP code entered")).toBeVisible();
  expect(s.aal).toBe("aal1");

  await page.getByLabel(/Kode 6 digit/).fill(VALID_CODE);
  await page.getByRole("button", { name: "Verifikasi dan aktifkan" }).click();
  await expect(page.getByRole("heading", { name: "Hasil Pemeriksaan KPwDN", level: 1 })).toBeVisible();
  await expect(page.getByText("Masuk sebagai KPw Uji MFA").or(page.getByText(/KPw Simulasi 01/)).first()).toBeVisible();
  expect(s.dataRequests.length).toBeGreaterThan(0);
  noDataBeforeMfa(s);
  expect(csp).toEqual([]);
});

test("pengguna dengan faktor: challenge saat login, kelola faktor dengan step-up, lalu keluar", async ({ page }) => {
  const csp = watchCsp(page);
  const s = await mockSupabase(page, { factors: "one" });
  await login(page, s);
  await expect(page.getByRole("heading", { name: "Verifikasi dua langkah" })).toBeVisible();
  await page.getByLabel(/Kode 6 digit/).fill("111111");
  await page.getByRole("button", { name: "Verifikasi", exact: true }).click();
  await expect(page.getByText("Invalid TOTP code entered")).toBeVisible();
  expect(s.dataRequests).toEqual([]);
  await page.getByLabel(/Kode 6 digit/).fill(VALID_CODE);
  await page.getByRole("button", { name: "Verifikasi", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Menu utama SEKAR" })).toBeVisible();
  noDataBeforeMfa(s);

  // Halaman keamanan: faktor terakhir tidak dapat dihapus.
  await page.goto("/keamanan");
  await expect(page.getByRole("heading", { name: "Keamanan Akun", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hapus Authenticator lama" })).toBeDisabled();
  // Tambah authenticator pengganti.
  await page.getByRole("button", { name: /Tambah authenticator cadangan/ }).click();
  await page.getByRole("button", { name: "Buat kode QR authenticator baru" }).click();
  await page.getByLabel(/Kode 6 digit/).fill(VALID_CODE);
  await page.getByRole("button", { name: "Verifikasi dan aktifkan" }).click();
  await expect(page.getByText("Authenticator baru aktif.")).toBeVisible();
  await expect(page.getByText("Aktif", { exact: true })).toHaveCount(2);
  // Hapus faktor lama: kode salah ditolak, kode benar berhasil.
  await page.getByRole("button", { name: "Hapus Authenticator lama" }).click();
  const form = page.getByRole("form", { name: "Konfirmasi hapus authenticator" });
  await form.getByLabel("Kode 6 digit").fill("222222");
  await form.getByRole("button", { name: "Hapus authenticator" }).click();
  await expect(form.getByRole("alert")).toBeVisible();
  expect(s.factors).toHaveLength(2);
  await form.getByLabel("Kode 6 digit").fill(VALID_CODE);
  await form.getByRole("button", { name: "Hapus authenticator" }).click();
  await expect(page.getByText("Authenticator dihapus.")).toBeVisible();
  expect(s.factors.map((f) => f.friendly_name)).not.toContain("Authenticator lama");

  // Keluar.
  await page.getByRole("button", { name: /Menu pengguna/ }).click();
  await page.getByRole("button", { name: "Keluar", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Masuk ke akun Anda" })).toBeVisible();
  expect(csp).toEqual([]);
});

test("reset kata sandi: tautan pemulihan tetap wajib MFA sebelum kata sandi dapat diganti", async ({ page }) => {
  const csp = watchCsp(page);
  const s = await mockSupabase(page, { factors: "one" });
  // Permintaan reset dari halaman login: respons generik.
  await page.goto("/");
  await page.getByLabel("Email").fill("kpw01@contoh.test");
  await page.getByRole("button", { name: "Lupa kata sandi?" }).click();
  await page.getByRole("button", { name: "Kirim tautan reset" }).click();
  await expect(page.getByText("Jika email terdaftar, tautan reset telah dikirim.")).toBeVisible();

  // Membuka tautan pemulihan (implicit flow) → sesi aal1 + event PASSWORD_RECOVERY.
  await page.goto(`/?pemulihan=1#access_token=${jwt("aal1")}&refresh_token=r-rec&expires_in=3600&expires_at=${Math.floor(Date.now() / 1000) + 3600}&token_type=bearer&type=recovery`);
  await expect(page.getByRole("heading", { name: "Verifikasi dua langkah" })).toBeVisible();
  await expect(page.getByLabel("Kata sandi baru", { exact: true })).toHaveCount(0);
  await page.getByLabel(/Kode 6 digit/).fill(VALID_CODE);
  await page.getByRole("button", { name: "Verifikasi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tetapkan kata sandi baru" })).toBeVisible();
  await page.getByLabel("Kata sandi baru", { exact: true }).fill("kata-sandi-baru-yang-panjang");
  await page.getByLabel("Ulangi kata sandi baru").fill("kata-sandi-baru-yang-panjang");
  await page.getByRole("button", { name: "Simpan kata sandi" }).click();
  await expect(page.getByRole("heading", { name: "Masuk ke akun Anda" })).toBeVisible();
  expect(s.passwordUpdates).toEqual([{ aal: "aal2" }]);
  expect(csp).toEqual([]);
});

test("mode Supabase: tidak ada akun demo dan kredensial demo ditolak tanpa membuka data", async ({ page }) => {
  const csp = watchCsp(page);
  const s = await mockSupabase(page, { factors: "one" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Masuk ke akun Anda" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Akun demo" })).toHaveCount(0);
  await expect(page.getByText("Mode Demo — Data Simulasi")).toHaveCount(0);
  await page.getByLabel("Email").fill("admin@sekar.demo");
  await page.getByLabel("Kata sandi", { exact: true }).fill("kata-sandi-akun-demo");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Invalid login credentials");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Masuk ke akun Anda" })).toBeVisible();
  expect(s.dataRequests).toEqual([]);
  expect(csp).toEqual([]);
});

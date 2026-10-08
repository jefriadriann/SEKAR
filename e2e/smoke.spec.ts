import { expect, test, type Page } from "@playwright/test";

const ROUTES = ["/", "/hasil-pemeriksaan", "/permindok", "/jadwal-pemeriksaan", "/sgo-ketentuan", "/dr", "/admin"];

const ACCOUNTS = {
  dr: ["dr@sekar.demo", "SekarDR#2026"],
  kpw: ["kpw01@sekar.demo", "SekarKPw#2026"],
  admin: ["admin@sekar.demo", "SekarAdmin#2026"],
} as const;
type Who = keyof typeof ACCOUNTS;

async function login(page: Page, who: Who) {
  await page.getByLabel("Email").fill(ACCOUNTS[who][0]);
  await page.getByLabel("Kata sandi", { exact: true }).fill(ACCOUNTS[who][1]);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.locator("#konten h1").first()).toBeVisible();
}

/** Buka halaman; bila belum masuk, login sebagai DR (default). */
async function ready(page: Page, path: string, who: Who = "dr") {
  await page.goto(path);
  const loginHeading = page.getByRole("heading", { name: "Masuk ke akun Anda" });
  await expect(loginHeading.or(page.locator("#konten h1")).first()).toBeVisible();
  if (await loginHeading.isVisible()) {
    await login(page, who);
    await expect(page).toHaveURL(/\/$/);
    if (path !== "/") await page.goto(path);
  }
  await expect(page.getByText("Mode Demo — Data Simulasi").first()).toBeAttached();
  await expect(page.locator("#konten h1").first()).toBeVisible();
}

/** Keluar lalu masuk dengan akun lain. */
async function switchAccount(page: Page, who: Who) {
  await page.getByRole("button", { name: /Menu pengguna/ }).click();
  await page.getByRole("button", { name: "Keluar" }).click();
  await expect(page.getByRole("heading", { name: "Masuk ke akun Anda" })).toBeVisible();
  await login(page, who);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("login: kata sandi salah ditolak, akun DR dan KPw membedakan tampilan", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Masuk ke akun Anda" })).toBeVisible();
  await page.getByLabel("Email").fill("dr@sekar.demo");
  await page.getByLabel("Kata sandi", { exact: true }).fill("salah");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Kata sandi salah.");
  // Akun demo dapat diisi dengan satu klik.
  await page.getByRole("button", { name: "Isi akun demo Departemen Regional" }).click();
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByText("DR · Super Koordinator")).toBeVisible();
  // Sesi bertahan setelah muat ulang.
  await page.reload();
  await expect(page.getByText("DR · Super Koordinator")).toBeVisible();
  // Keluar dari halaman modul lalu masuk sebagai KPw: selalu mendarat di beranda.
  await page.goto("/permindok");
  await switchAccount(page, "kpw");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("navigation", { name: "Menu utama SEKAR" })).toBeVisible();
  await page.goto("/permindok");
  await expect(page.getByRole("status").filter({ hasText: "Masuk sebagai KPw Simulasi 01" })).toBeVisible();
});

test("beranda: empat menu dapat dibuka", async ({ page }) => {
  await ready(page, "/");
  await expect(page.getByRole("heading", { name: "SEKAR", level: 1 })).toBeVisible();
  const menu = page.getByRole("navigation", { name: "Menu utama SEKAR" });
  for (const [name, url, h1] of [
    ["Hasil Pemeriksaan KPwDN", "/hasil-pemeriksaan", "Hasil Pemeriksaan KPwDN"],
    ["Tracker Permindok", "/permindok", "Tracker Permindok"],
    ["Jadwal Pemeriksaan", "/jadwal-pemeriksaan", "Timeline Pemeriksaan"],
    ["SGo dan Ketentuan", "/sgo-ketentuan", "SGo dan Ketentuan"],
  ] as const) {
    await ready(page, "/");
    await menu.getByRole("link", { name: new RegExp(name) }).click();
    await expect(page).toHaveURL(new RegExp(`${url}$`));
    await expect(page.getByRole("heading", { level: 1, name: new RegExp(h1, "i") })).toBeVisible();
  }
});

test("semua halaman tampil tanpa error konsol dan tanpa overflow horizontal", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    // 404 untuk halaman not-found memang diharapkan.
    if (m.type() === "error" && !(page.url().endsWith("/tidak-ada") && m.text().includes("404"))) errors.push(`${page.url()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  await ready(page, "/");
  await switchAccount(page, "admin");
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const r of ROUTES) {
      await ready(page, r);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${r} @ ${size.width}px`).toBeLessThanOrEqual(0);
    }
  }
  await page.goto("/tidak-ada");
  await expect(page.getByRole("heading", { name: "Halaman tidak ditemukan" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("hasil pemeriksaan: filter, klik kategori, drilldown, edit status tersimpan lokal", async ({ page }) => {
  await ready(page, "/hasil-pemeriksaan");
  const areaCard = page.locator("section", { has: page.getByRole("heading", { name: "Jumlah Temuan per Area" }) });
  await expect(areaCard.getByText(/300 temuan · \d+ KPwDN · tahun 2026/)).toBeVisible();
  await page.getByLabel("Tahun Pemeriksaan").selectOption("all");
  await expect(areaCard.getByText(/1\.265 temuan · 46 KPwDN · semua tahun/)).toBeVisible();

  // Klik kategori via tampilan tabel chart (setara klik bar) + reset.
  await areaCard.getByRole("button", { name: "Tabel" }).click();
  await areaCard.getByRole("button", { name: "Pengadaan" }).click();
  await expect(page.getByRole("button", { name: "Hapus filter Area Pengadaan" })).toBeVisible();
  await areaCard.getByRole("button", { name: /^Reset/ }).click();
  await expect(page.getByRole("button", { name: "Hapus filter Area Pengadaan" })).toHaveCount(0);

  // Klik bar pada chart.
  await areaCard.getByRole("button", { name: "Chart" }).click();
  await areaCard.locator(".recharts-bar-rectangle").first().click();
  await expect(areaCard.getByText(/^Dipilih:/)).toBeVisible();
  await page.getByRole("button", { name: "Reset semua filter" }).click();

  // Drilldown ringkasan → daftar temuan.
  await page.getByRole("button", { name: /^Buka detail BPK\|/ }).first().click();
  const group = page.getByRole("dialog");
  await expect(group.getByText(/temuan di \d+ KPwDN/)).toBeVisible();
  await page.keyboard.press("Escape");

  // Filter lanjutan + tabel per temuan + edit status.
  await page.getByRole("button", { name: /^Filter/ }).click();
  await page.getByLabel("Status", { exact: true }).selectOption("belum_ditindaklanjuti");
  await page.getByRole("button", { name: "Per temuan" }).click();
  await page.getByRole("button", { name: /^Buka detail TMN-/ }).first().click();
  const drawer = page.getByRole("dialog");
  const id = (await drawer.getByRole("heading").first().textContent())!.replace("Temuan ", "").trim();
  await drawer.getByLabel("Status", { exact: true }).selectOption("selesai");
  await drawer.getByRole("button", { name: "Simpan status" }).click();
  await expect(page.getByText(`Status temuan ${id} diperbarui.`)).toBeVisible();
  await expect(drawer.locator("dt", { hasText: "Tanggal selesai" }).locator("xpath=following-sibling::dd[1]")).toHaveText("5 Okt 2026");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  await page.reload();
  await expect(page.locator("main h1")).toBeVisible();
  await page.getByLabel("Tahun Pemeriksaan").selectOption("all");
  await page.getByRole("button", { name: "Per temuan" }).click();
  await page.getByLabel("Cari temuan atau rekomendasi").fill(id);
  await expect(page.getByRole("table", { name: /per record/ }).getByText("Selesai", { exact: true })).toBeVisible();

  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh CSV" }).click();
  expect((await dl).suggestedFilename()).toMatch(/\.csv$/);

  await page.getByRole("button", { name: /Hasil Rekonsiliasi Aset/ }).click();
  await expect(page.getByRole("dialog").getByRole("table", { name: /Rekonsiliasi aset/ })).toBeVisible();
});

test("bukti dapat dipratinjau dan diunduh sebagai .txt", async ({ page }) => {
  await ready(page, "/jadwal-pemeriksaan");
  await page.getByRole("button", { name: "Bukti", exact: true }).first().click();
  const preview = page.getByRole("dialog");
  await expect(preview.locator("pre", { hasText: "DOKUMEN SIMULASI" })).toBeVisible();
  const dl = page.waitForEvent("download");
  await preview.getByRole("button", { name: /Unduh \.txt/ }).click();
  expect((await dl).suggestedFilename()).toMatch(/SIMULASI\.txt$/);
});

test("permindok: validasi tanggal, simpan perubahan, template", async ({ page }) => {
  await ready(page, "/permindok");
  await page.getByLabel("Status Penyampaian").selectOption("belum_dikirim");
  await page.getByRole("button", { name: /^Buka detail PMD-/ }).first().click();
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel("Status kelengkapan").selectOption("lengkap");
  await drawer.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(drawer.getByText("Status Lengkap memerlukan tanggal penyampaian.")).toBeVisible();
  await drawer.getByLabel("Tanggal penyampaian").fill("2020-01-01");
  await drawer.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(drawer.getByText("Tanggal penyampaian tidak boleh mendahului tanggal permintaan.")).toBeVisible();
  await drawer.getByLabel("Tanggal penyampaian").fill("2026-10-01");
  await drawer.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.getByText(/Permintaan PMD-\d+ disimpan\./)).toBeVisible();
  await page.keyboard.press("Escape");

  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: /Template watermark/ }).click();
  expect((await dl).suggestedFilename()).toMatch(/watermark/);
  await page.getByRole("button", { name: /Panduan: Tata cara melakukan watermark/ }).click();
  await expect(page.getByRole("dialog").getByText("Langkah 1:")).toBeAttached();
});

test("jadwal: tampilan bulan/kuartal/tahun dan posisi data simulasi", async ({ page }) => {
  await ready(page, "/jadwal-pemeriksaan");
  const card = page.locator("section", { has: page.getByRole("heading", { name: "Jadwal Pemeriksaan KPwDN" }) });
  await expect(card.getByText(/Juli – Desember 2026/)).toBeVisible();
  await page.getByRole("button", { name: "Periode sebelumnya" }).click();
  await expect(card.getByText(/Januari – Juni 2026/)).toBeVisible();
  await page.getByRole("button", { name: "kuartal", exact: true }).click();
  await expect(card.getByText(/Tahun 2026 ·/)).toBeVisible();
  await page.getByRole("button", { name: "tahun", exact: true }).click();
  await expect(card.getByText(/2025 – 2027/)).toBeVisible();
  await expect(page.getByText("(Tentatif)").first()).toBeVisible();
  await expect(page.getByText("Hari ini").first()).toBeVisible();
  await page.getByLabel("Posisi Data").fill("2026-12-31");
  const selesai = page.locator('[data-kpi="Selesai"]');
  await expect(selesai).toHaveText("92");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(selesai).toHaveText("62");
});

test("persona KPw tidak melihat data/route DR", async ({ page }) => {
  await ready(page, "/");
  await switchAccount(page, "kpw");
  await page.getByRole("button", { name: /Menu pengguna/ }).click();
  await expect(page.getByRole("link", { name: /Dashboard Departemen Regional/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await ready(page, "/dr");
  await expect(page.getByRole("heading", { name: /Halaman tidak tersedia/ })).toBeVisible();
  await expect(page.getByText("DR-TMN-")).toHaveCount(0);
  await ready(page, "/hasil-pemeriksaan");
  await page.getByLabel("Tahun Pemeriksaan").selectOption("all");
  await page.getByRole("button", { name: "Per temuan" }).click();
  const units = await page.getByRole("table", { name: /per record/ }).locator("tbody tr td:nth-child(4)").allTextContents();
  expect(new Set(units)).toEqual(new Set(["KPw Simulasi 01"]));
  await ready(page, "/admin");
  await expect(page.getByRole("heading", { name: /Halaman tidak tersedia/ })).toBeVisible();
});

test("dashboard DR: KPI dihitung dari dataset, filter pemeriksa, edit kepatuhan", async ({ page }) => {
  await ready(page, "/dr");
  await expect(page.locator('[data-kpi="Total Temuan Pemeriksaan"]')).toHaveText("24");
  await expect(page.locator('[data-kpi="Selesai"]')).toHaveText("16");
  await expect(page.locator('[data-kpi="Dalam Proses"]')).toHaveText("6");
  await expect(page.locator('[data-kpi="Belum Selesai"]')).toHaveText("2");
  await page.getByLabel("Pemeriksa", { exact: true }).selectOption("BPK");
  await expect(page.getByText("Menampilkan 1 - 5 dari 8 data")).toBeVisible();
  await page.getByRole("button", { name: /^Buka detail KPT-/ }).first().click();
  const drawer = page.getByRole("dialog");
  const current = await drawer.getByLabel("Status").inputValue();
  await drawer.getByLabel("Status").selectOption(current === "selesai" ? "dalam_proses" : "selesai");
  await drawer.getByRole("button", { name: "Simpan status" }).click();
  await expect(page.getByText(/Status kewajiban KPT-\d+ diperbarui\./)).toBeVisible();
});

test("notifikasi: lonceng menampilkan tautan tindak lanjut", async ({ page }) => {
  await ready(page, "/hasil-pemeriksaan");
  await page.getByRole("button", { name: /Notifikasi/ }).click();
  await page.getByRole("link", { name: /permintaan dokumen lewat tenggat/ }).click();
  await expect(page).toHaveURL(/\/permindok$/);
});

test("SGo: pencarian, preview materi, tutorial langkah demi langkah", async ({ page }) => {
  await ready(page, "/sgo-ketentuan");
  await expect(page.locator("article")).toHaveCount(8);
  await page.getByRole("button", { name: "Tutorial Aset" }).click();
  await expect(page.getByRole("dialog").getByText("Langkah 1:")).toBeAttached();
  await page.keyboard.press("Escape");
  await page.getByLabel("Cari materi").fill("Pengadaan");
  await expect(page.getByRole("heading", { name: "Hasil pencarian (4)" })).toBeVisible();
  await page.getByRole("button", { name: "Buka" }).first().click();
  await expect(page.getByRole("dialog").getByText("MATERI SIMULASI")).toBeVisible();
});

test("admin: import tidak valid ditolak, import valid diterapkan, reset seed", async ({ page }) => {
  await ready(page, "/");
  await switchAccount(page, "admin");
  await ready(page, "/admin");
  await page.getByLabel("Atau tempel teks JSON").fill('{"metadata":{}}');
  await page.getByRole("button", { name: "Validasi teks" }).click();
  await expect(page.getByText(/Dataset ditolak/)).toBeVisible();
  await expect(page.getByText("Dataset aktif tidak diubah.")).toBeVisible();

  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const file = await (await dl).path();
  const fs = await import("node:fs");
  const data = JSON.parse(fs.readFileSync(file!, "utf8"));
  data.metadata.version = "9.9";
  data.findings = data.findings.slice(0, 100);
  await page.getByLabel("Pilih berkas .json").setInputFiles({ name: "kecil.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.getByText("Validasi berhasil: kecil.json")).toBeVisible();
  await page.getByRole("button", { name: "Terapkan dataset ini" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ya, ganti dataset" }).click();
  await expect(page.getByText("Import: kecil.json")).toBeVisible();

  const broken = { ...data, findings: [{ ...data.findings[0], unit_id: "kpw-999" }] };
  await page.getByLabel("Pilih berkas .json").setInputFiles({ name: "rusak.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(broken)) });
  await expect(page.getByText(/Referensi ke units tidak ditemukan: kpw-999/)).toBeVisible();
  await expect(page.getByText("Import: kecil.json")).toBeVisible();

  await page.getByRole("button", { name: "Reset ke seed awal" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ya, reset" }).click();
  await expect(page.getByText("data/sekar-dummy.json (seed bawaan)")).toBeVisible();
});

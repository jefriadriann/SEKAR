import { expect, test, type Page } from "@playwright/test";

const ROUTES = ["/", "/hasil-pemeriksaan", "/permindok", "/jadwal-pemeriksaan", "/sgo-ketentuan", "/dr", "/admin"];

async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByText("Mode Demo — Data Simulasi")).toBeVisible();
  await expect(page.locator("main h1").first()).toBeVisible();
}

async function persona(page: Page, label: RegExp) {
  await page.getByLabel("Persona demo").selectOption({ label: (await page.getByLabel("Persona demo").locator("option").allTextContents()).find((t) => label.test(t))! });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("semua halaman tampil tanpa error konsol dan tanpa overflow horizontal", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    // 404 untuk halaman not-found memang diharapkan.
    if (m.type() === "error" && !(page.url().endsWith("/tidak-ada") && m.text().includes("404"))) errors.push(`${page.url()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  await ready(page, "/");
  await persona(page, /^Admin/);
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

test("hasil pemeriksaan: filter, klik kategori, drawer, edit status tersimpan lokal", async ({ page }) => {
  await ready(page, "/hasil-pemeriksaan");
  const kpi = page.locator('[data-kpi="Jumlah temuan"]');
  await expect(kpi).toHaveText("276");
  await page.getByLabel("Tahun", { exact: true }).selectOption("2026");
  await expect(kpi).not.toHaveText("276");
  await page.getByRole("button", { name: "Reset semua filter" }).click();
  await expect(kpi).toHaveText("276");

  // Klik kategori area via tampilan tabel chart (setara klik bar).
  const areaCard = page.locator("section", { has: page.getByRole("heading", { name: "Jumlah temuan per area" }) });
  await areaCard.getByRole("button", { name: "Tabel" }).click();
  await areaCard.getByRole("button", { name: "Pengadaan" }).click();
  await expect(page.getByRole("button", { name: "Hapus filter Area Pengadaan" })).toBeVisible();
  await expect(kpi).toHaveText("35");
  await areaCard.getByRole("button", { name: "Reset" }).click();
  await expect(kpi).toHaveText("276");

  // Klik bar pada chart.
  await areaCard.getByRole("button", { name: "Chart" }).click();
  await areaCard.locator(".recharts-bar-rectangle").first().click();
  await expect(page.getByText(/^Dipilih:/).first()).toBeVisible();
  await page.getByRole("button", { name: "Reset semua filter" }).click();

  // Drawer + edit status.
  await page.getByLabel("Status", { exact: true }).selectOption("belum_ditindaklanjuti");
  await page.getByRole("button", { name: /^Detail TMN-/ }).first().click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  const id = (await drawer.getByRole("heading").first().textContent())!.replace("Temuan ", "").trim();
  await drawer.getByLabel("Status", { exact: true }).selectOption("selesai");
  await drawer.getByRole("button", { name: "Simpan status" }).click();
  await expect(page.getByText(`Status temuan ${id} diperbarui.`)).toBeVisible();
  await expect(drawer.locator("dt", { hasText: "Tanggal selesai" }).locator("xpath=following-sibling::dd[1]")).toHaveText("5 Okt 2026");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  await page.reload();
  await expect(page.locator("main h1")).toBeVisible();
  await page.getByLabel("Cari").fill(id);
  await expect(page.getByRole("table", { name: /Daftar temuan/ }).getByText("Selesai", { exact: true })).toBeVisible();

  // Export CSV.
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await dl).suggestedFilename()).toMatch(/\.csv$/);
});

test("bukti dapat dipratinjau dan diunduh sebagai .txt", async ({ page }) => {
  await ready(page, "/jadwal-pemeriksaan");
  await page.getByLabel("Status", { exact: true }).last().selectOption("all");
  await page.getByRole("button", { name: "Lihat" }).first().click();
  const preview = page.getByRole("dialog");
  await expect(preview.locator("pre", { hasText: "DOKUMEN SIMULASI" })).toBeVisible();
  const dl = page.waitForEvent("download");
  await preview.getByRole("button", { name: /Unduh \.txt/ }).click();
  expect((await dl).suggestedFilename()).toMatch(/SIMULASI\.txt$/);
});

test("permindok: validasi tanggal dan simpan perubahan", async ({ page }) => {
  await ready(page, "/permindok");
  await page.getByLabel("Kelengkapan", { exact: true }).selectOption("belum_dikirim");
  await page.getByRole("button", { name: /^Detail\/Edit PMD-/ }).first().click();
  const drawer = page.getByRole("dialog");
  await drawer.getByLabel("Status kelengkapan").selectOption("lengkap");
  await drawer.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(drawer.getByText("Status Lengkap memerlukan tanggal penyampaian.")).toBeVisible();
  await drawer.getByLabel("Tanggal penyampaian").fill("2026-01-01");
  await drawer.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(drawer.getByText("Tanggal penyampaian tidak boleh mendahului tanggal permintaan.")).toBeVisible();
  await drawer.getByLabel("Tanggal penyampaian").fill("2026-10-01");
  await drawer.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.getByText(/Permintaan PMD-\d+ disimpan\./)).toBeVisible();
  const dl = page.waitForEvent("download");
  await drawer.getByRole("button", { name: "Tanda terima simulasi" }).click();
  expect((await dl).suggestedFilename()).toMatch(/tanda-terima-PMD/);
});

test("jadwal: tampilan bulan/kuartal/tahun dan tanggal simulasi", async ({ page }) => {
  await ready(page, "/jadwal-pemeriksaan");
  await expect(page.getByRole("heading", { name: "Timeline — Kuartal 4 2026" })).toBeVisible();
  await page.getByRole("button", { name: "bulan" }).click();
  await expect(page.getByRole("heading", { name: "Timeline — Oktober 2026" })).toBeVisible();
  await page.getByRole("button", { name: "Periode sebelumnya" }).click();
  await expect(page.getByRole("heading", { name: "Timeline — September 2026" })).toBeVisible();
  await page.getByRole("button", { name: "tahun" }).click();
  await expect(page.getByRole("heading", { name: "Timeline — Tahun 2026" })).toBeVisible();
  await expect(page.getByText("Tentatif").first()).toBeVisible();
  await page.getByLabel("Tanggal acuan").fill("2026-12-31");
  const selesai = page.locator('[data-kpi="Selesai"]');
  await expect(selesai).toHaveText("35");
  await page.getByRole("button", { name: /Kembali ke 5 Okt 2026/ }).click();
  await expect(selesai).toHaveText("16");
});

test("persona KPw tidak melihat data/route DR", async ({ page }) => {
  await ready(page, "/");
  await persona(page, /^KPw/);
  await expect(page.getByRole("link", { name: /Dashboard DR/ })).toHaveCount(0);
  await ready(page, "/dr");
  await expect(page.getByRole("heading", { name: /Halaman tidak tersedia/ })).toBeVisible();
  await expect(page.getByText("DR-TMN-")).toHaveCount(0);
  await ready(page, "/hasil-pemeriksaan");
  const units = await page.getByRole("table", { name: /Daftar temuan/ }).locator("tbody tr td:nth-child(2) span span:first-child").allTextContents();
  expect(new Set(units)).toEqual(new Set(["KPw Simulasi 01"]));
  await ready(page, "/admin");
  await expect(page.getByRole("heading", { name: /Halaman tidak tersedia/ })).toBeVisible();
});

test("dashboard DR menghitung KPI dari dataset dan filter pemeriksa", async ({ page }) => {
  await ready(page, "/dr");
  const v = (label: string) => page.locator(`[data-kpi="${label}"]`).first();
  await expect(v("Temuan DR")).toHaveText("24");
  await expect(v("Selesai")).toHaveText("16");
  await expect(v("Dalam proses")).toHaveText("6");
  await expect(v("Belum ditindaklanjuti")).toHaveText("2");
  await page.getByRole("button", { name: "BPK (8)" }).click();
  await expect(page.getByText("Menampilkan 1–8 dari 8 record")).toBeVisible();
});

test("SGo: pencarian, preview materi, tutorial langkah demi langkah", async ({ page }) => {
  await ready(page, "/sgo-ketentuan");
  await expect(page.locator("article")).toHaveCount(8);
  await page.getByRole("button", { name: "Tutorial Aset" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByText("Langkah 1:")).toBeAttached();
  await page.keyboard.press("Escape");
  await page.getByLabel("Cari materi").fill("Pengadaan");
  await expect(page.getByRole("heading", { name: "Hasil pencarian (3)" })).toBeVisible();
  await page.getByRole("button", { name: "Buka" }).first().click();
  await expect(page.getByRole("dialog").getByText("MATERI SIMULASI")).toBeVisible();
});

test("admin: import tidak valid ditolak, import valid diterapkan, reset seed", async ({ page }) => {
  await ready(page, "/");
  await persona(page, /^Admin/);
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

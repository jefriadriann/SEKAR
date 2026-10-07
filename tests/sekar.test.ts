import { describe, expect, it } from "vitest";
import seed from "../data/sekar-dummy.json";
import { ALL } from "@/lib/analytics/common";
import { aggregateByTheme, DEFAULT_FINDING_FILTERS, filterFindings, findingsByArea, findingTimeliness, summarizeFindings } from "@/lib/analytics/findings";
import { requestTimeliness, summarizeRequests } from "@/lib/analytics/permindok";
import { barPosition, scheduleKpis, scheduleStatus, startsWithin, timelineWindow } from "@/lib/analytics/schedules";
import { readAppConfig } from "@/lib/config";
import { escapeCsvCell, toCsv } from "@/lib/csv";
import { isValidISODate } from "@/lib/dates";
import { formatPercent, percent } from "@/lib/format";
import { applyFindingStatus, updateFindingInDataset, updateRequestInDataset, validateRequestPatch } from "@/lib/mutations";
import { DATASET_KEY, DummyRepository } from "@/lib/repository/dummy";
import { canAccessRoute, canOpenDocument, kpwModuleData, onlyDr, scopeDatasetForViewer } from "@/lib/scope";
import type { Dataset, Viewer } from "@/lib/types";
import { parseAndValidate, validateDataset } from "@/lib/validation";

const ds = () => structuredClone(seed) as unknown as Dataset;
const AS_OF = "2026-10-05";
const dr: Viewer = { id: "demo-dr", name: "DR", role: "dr", unit_id: "dr", simulated: true };
const kpw: Viewer = { id: "demo-kpw", name: "KPw", role: "kpw", unit_id: "kpw-01", simulated: true };
const admin: Viewer = { id: "demo-admin", name: "Admin", role: "admin", unit_id: "dr", simulated: true };

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe("seed dataset", () => {
  it("lolos validasi dan sesuai jumlah yang dijelaskan README", () => {
    const r = validateDataset(ds());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.counts).toMatchObject({ units: 47, findings: 659, document_requests: 291, audit_schedules: 115, references: 32, compliance: 24, asset_reconciliations: 138 });
  });
});

describe("agregasi temuan", () => {
  it("memisahkan temuan KPw (635) dari temuan DR (24)", () => {
    const d = ds();
    expect(kpwModuleData(d).findings).toHaveLength(635);
    expect(kpwModuleData(d).findings.some((f) => f.unit_id === "dr")).toBe(false);
    expect(onlyDr(d.findings)).toHaveLength(24);
  });

  it("KPI DR dihitung dari dataset: 24 temuan, 16 selesai, 6 dalam proses, 2 belum", () => {
    const s = summarizeFindings(onlyDr(ds().findings), AS_OF);
    expect(s.total).toBe(24);
    expect(s.byStatus).toEqual({ selesai: 16, dalam_proses: 6, belum_ditindaklanjuti: 2 });
  });

  it("jumlah temuan berbeda dari jumlah KPw unik", () => {
    const k = kpwModuleData(ds());
    const pengadaan = filterFindings(k.findings, k.units, { ...DEFAULT_FINDING_FILTERS, area: "Pengadaan" }, AS_OF);
    const s = summarizeFindings(pengadaan, AS_OF);
    expect(s.total).toBe(pengadaan.length);
    expect(s.uniqueUnits).toBe(new Set(pengadaan.map((f) => f.unit_id)).size);
    expect(s.uniqueUnits).toBeLessThan(s.total);
    const area = findingsByArea(k.findings).find((a) => a.key === "Pengadaan")!;
    expect(area.count).toBe(s.total);
    expect(area.uniqueUnits).toBe(s.uniqueUnits);
  });

  it("filter tahun, pemeriksa dan korwil konsisten dengan total", () => {
    const k = kpwModuleData(ds());
    const all = filterFindings(k.findings, k.units, DEFAULT_FINDING_FILTERS, AS_OF);
    expect(all).toHaveLength(635);
    const byYear = [2022, 2023, 2024, 2025, 2026].map((y) => filterFindings(k.findings, k.units, { ...DEFAULT_FINDING_FILTERS, year: y }, AS_OF).length);
    expect(byYear.reduce((a, b) => a + b, 0)).toBe(635);
    const jawa = filterFindings(k.findings, k.units, { ...DEFAULT_FINDING_FILTERS, korwil: "Jawa" }, AS_OF);
    const jawaUnits = new Set(k.units.filter((u) => u.korwil === "Jawa").map((u) => u.id));
    expect(jawa.every((f) => jawaUnits.has(f.unit_id))).toBe(true);
    const ignoreYear = filterFindings(k.findings, k.units, { ...DEFAULT_FINDING_FILTERS, year: 2022 }, AS_OF, ["year"]);
    expect(ignoreYear).toHaveLength(635);
  });

  it("agregasi tema menjumlahkan kembali ke total temuan", () => {
    const k = kpwModuleData(ds());
    const agg = aggregateByTheme(k.findings);
    expect(agg.reduce((s, a) => s + a.count, 0)).toBe(635);
    for (const a of agg) expect(a.affectedUnits).toBeLessThanOrEqual(a.count);
  });

  it("persentase menangani denominator nol", () => {
    expect(percent(5, 0)).toBeNull();
    expect(formatPercent(null)).toBe("—");
    expect(summarizeFindings([], AS_OF).pctSelesai).toBeNull();
    expect(summarizeRequests([], AS_OF).pctTepatWaktu).toBeNull();
  });
});

describe("scope DR/KPw/admin", () => {
  it("persona KPw hanya melihat kpw-01 dan materi shared, tanpa data DR", () => {
    const s = scopeDatasetForViewer(ds(), kpw);
    expect(s.units.map((u) => u.id)).toEqual(["kpw-01"]);
    for (const coll of [s.findings, s.document_requests, s.audit_schedules, s.asset_reconciliations, s.compliance]) {
      expect(coll.every((r) => r.unit_id === "kpw-01")).toBe(true);
    }
    expect(s.compliance).toHaveLength(0);
    expect(s.findings.length).toBeGreaterThan(0);
    expect(s.documents.every((d) => d.scope === "shared" || d.scope === "kpw-01")).toBe(true);
    expect(s.references).toHaveLength(32);
  });

  it("persona DR dan admin melihat seluruh data", () => {
    expect(scopeDatasetForViewer(ds(), dr).findings).toHaveLength(659);
    expect(scopeDatasetForViewer(ds(), admin).units).toHaveLength(47);
  });

  it("akses route dan dokumen sesuai peran", () => {
    expect(canAccessRoute("kpw", "/dr")).toBe(false);
    expect(canAccessRoute("kpw", "/admin")).toBe(false);
    expect(canAccessRoute("dr", "/dr")).toBe(true);
    expect(canAccessRoute("dr", "/admin")).toBe(false);
    expect(canAccessRoute("admin", "/admin")).toBe(true);
    expect(canOpenDocument(kpw, "dr")).toBe(false);
    expect(canOpenDocument(kpw, "kpw-02")).toBe(false);
    expect(canOpenDocument(kpw, "shared")).toBe(true);
    expect(canOpenDocument(dr, "dr")).toBe(true);
  });
});

describe("status berbasis tanggal", () => {
  it("status jadwal dihitung dari tanggal acuan", () => {
    const s = { start_date: "2026-10-01", end_date: "2026-10-07" };
    expect(scheduleStatus(s, "2026-09-30")).toBe("mendatang");
    expect(scheduleStatus(s, "2026-10-01")).toBe("berlangsung");
    expect(scheduleStatus(s, "2026-10-07")).toBe("berlangsung");
    expect(scheduleStatus(s, "2026-10-08")).toBe("selesai");
    expect(startsWithin({ start_date: "2026-10-12" }, AS_OF, 7)).toBe(true);
    expect(startsWithin({ start_date: "2026-10-13" }, AS_OF, 7)).toBe(false);
    expect(startsWithin({ start_date: AS_OF }, AS_OF, 7)).toBe(false);
  });

  it("KPI jadwal KPw konsisten (selesai + berlangsung + mendatang = total)", () => {
    const k = scheduleKpis(kpwModuleData(ds()).audit_schedules, AS_OF);
    expect(k.total).toBe(106);
    expect(k.selesai + k.berlangsung + k.mendatang).toBe(k.total);
    expect(k.tentatif).toBe(11);
  });

  it("jendela timeline dan posisi bar", () => {
    const w = timelineWindow("bulan", AS_OF);
    expect(w.start).toBe("2026-07-01");
    expect(w.end).toBe("2026-12-31");
    expect(w.columns.map((c) => c.label)).toEqual(["Jul 2026", "Agu 2026", "Sep 2026", "Okt 2026", "Nov 2026", "Des 2026"]);
    expect(timelineWindow("bulan", AS_OF, -1).label).toBe("Januari – Juni 2026");
    const q = timelineWindow("kuartal", AS_OF);
    expect(q.days).toBe(365);
    expect(q.columns).toHaveLength(4);
    expect(q.columns[3]).toEqual({ start: "2026-10-01", end: "2026-12-31", label: "Kuartal 4" });
    expect(timelineWindow("tahun", AS_OF).columns.map((c) => c.label)).toEqual(["2025", "2026", "2027"]);
    expect(barPosition({ start_date: "2026-06-01", end_date: "2026-06-05" }, w)).toBeNull();
    const p = barPosition({ start_date: "2026-06-28", end_date: "2026-07-03" }, w)!;
    expect(p.left).toBe(0);
  });

  it("ketepatan waktu temuan dan permindok terpisah dari status proses", () => {
    expect(findingTimeliness({ status: "dalam_proses", due_date: "2026-10-01", completed_at: null }, AS_OF)).toBe("lewat_tenggat");
    expect(findingTimeliness({ status: "dalam_proses", due_date: "2026-10-10", completed_at: null }, AS_OF)).toBe("belum_jatuh_tempo");
    expect(findingTimeliness({ status: "selesai", due_date: "2026-10-01", completed_at: "2026-10-03" }, AS_OF)).toBe("terlambat_selesai");
    expect(requestTimeliness({ due_date: "2026-10-01", submitted_at: "2026-09-30" }, AS_OF)).toBe("tepat_waktu");
    expect(requestTimeliness({ due_date: "2026-10-01", submitted_at: "2026-10-02" }, AS_OF)).toBe("terlambat");
    expect(requestTimeliness({ due_date: "2026-10-01", submitted_at: null }, AS_OF)).toBe("lewat_tenggat");
  });

  it("validasi format tanggal", () => {
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(isValidISODate("05-10-2026")).toBe(false);
  });
});

describe("perubahan status", () => {
  it("status selesai mengisi completed_at; membuka kembali mengosongkan", () => {
    const f = ds().findings.find((x) => x.status === "dalam_proses")!;
    const done = applyFindingStatus(f, "selesai", AS_OF);
    expect(done.completed_at).toBe(AS_OF);
    const reopened = applyFindingStatus(done, "dalam_proses", AS_OF);
    expect(reopened.completed_at).toBeNull();
    const already = ds().findings.find((x) => x.status === "selesai")!;
    expect(applyFindingStatus(already, "selesai", AS_OF).completed_at).toBe(already.completed_at);
  });

  it("tanggal penyampaian tidak boleh mendahului permintaan", () => {
    const d = ds();
    const r = d.document_requests[0];
    const errs = validateRequestPatch(r, { status: "lengkap", submitted_at: "2026-01-01", dr_note: "" }, AS_OF);
    expect(errs.join(" ")).toMatch(/mendahului/);
    expect(() => updateRequestInDataset(d, r.id, { status: "lengkap", submitted_at: "2026-01-01", dr_note: "" }, AS_OF)).toThrow();
    expect(validateRequestPatch(r, { status: "lengkap", submitted_at: null, dr_note: "" }, AS_OF)).toContain("Status Lengkap memerlukan tanggal penyampaian.");
    const ok = updateRequestInDataset(d, r.id, { status: "lengkap", submitted_at: r.requested_at, dr_note: "ok" }, AS_OF);
    expect(ok.document_requests[0].status).toBe("lengkap");
    expect(d.document_requests[0].status).toBe(r.status); // immutable
  });

  it("repository dummy menyimpan perubahan dengan namespace dan dapat di-reset tanpa mengubah seed", async () => {
    const storage = new MemoryStorage();
    const repo = new DummyRepository(storage);
    const f = (await repo.load()).dataset.findings.find((x) => x.status === "belum_ditindaklanjuti")!;
    await repo.updateFindingStatus(f.id, "selesai", AS_OF);
    expect(storage.getItem(DATASET_KEY)).toContain('"hasLocalChanges":true');
    const repo2 = new DummyRepository(storage);
    const reloaded = (await repo2.load()).dataset.findings.find((x) => x.id === f.id)!;
    expect(reloaded.status).toBe("selesai");
    expect(reloaded.completed_at).toBe(AS_OF);
    await repo2.resetToSeed();
    expect(storage.getItem(DATASET_KEY)).toBeNull();
    expect((await repo2.load()).dataset.findings.find((x) => x.id === f.id)!.status).toBe("belum_ditindaklanjuti");
    expect((seed as unknown as Dataset).findings.find((x) => x.id === f.id)!.status).toBe("belum_ditindaklanjuti");
    void updateFindingInDataset;
  });
});

describe("import tidak valid ditolak", () => {
  it("menolak JSON rusak", () => {
    expect(parseAndValidate("{bukan json").ok).toBe(false);
  });

  it("menolak foreign key, status, tanggal dan data non-dummy", () => {
    const d = ds();
    d.findings[0].unit_id = "kpw-99";
    d.findings[1].status = "selesai_banget" as never;
    d.findings[2].due_date = "2026-13-40";
    d.document_requests[3].submitted_at = "2026-01-01";
    d.asset_reconciliations[0].total_items += 1;
    d.units[0].is_dummy = false;
    const r = validateDataset(d);
    expect(r.ok).toBe(false);
    const paths = r.errors.map((e) => e.path);
    expect(paths).toContain("units[0].is_dummy");
    expect(paths).toContain("findings[2].due_date");
  });

  it("menolak FK & aturan bisnis bila struktur valid", () => {
    const d = ds();
    d.findings[0].unit_id = "kpw-99";
    d.findings[1].status = "selesai_banget" as never;
    d.document_requests[3].submitted_at = "2026-01-01";
    d.asset_reconciliations[0].total_items += 1;
    d.metadata.all_data_is_synthetic = false;
    const paths = validateDataset(d).errors.map((e) => e.path);
    expect(paths).toEqual(
      expect.arrayContaining(["metadata.all_data_is_synthetic", "findings[0].unit_id", "findings[1].status", "document_requests[3].submitted_at", "asset_reconciliations[0].total_items"]),
    );
  });

  it("menolak koleksi yang hilang dan ID ganda", () => {
    const d = ds() as unknown as Record<string, unknown>;
    delete d.audit_schedules;
    expect(validateDataset(d).errors.some((e) => e.path === "audit_schedules")).toBe(true);
    const d2 = ds();
    d2.units[1].id = d2.units[0].id;
    expect(validateDataset(d2).errors.some((e) => e.message.includes("ID ganda"))).toBe(true);
  });

  it("import tidak valid tidak merusak dataset aktif", async () => {
    const storage = new MemoryStorage();
    const repo = new DummyRepository(storage);
    const before = (await repo.load()).dataset;
    const bad = ds();
    bad.findings[0].unit_id = "tidak-ada";
    await expect(repo.replaceDataset(bad, "bad.json")).rejects.toThrow();
    expect((await repo.load()).dataset).toEqual(before);
    expect(storage.getItem(DATASET_KEY)).toBeNull();
  });
});

describe("CSV & konfigurasi", () => {
  it("escape formula injection, kutip, koma dan newline", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
    expect(escapeCsvCell("+1")).toBe(`"'+1"`);
    expect(escapeCsvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(escapeCsvCell("baris\nbaru")).toBe('"baris\nbaru"');
    expect(escapeCsvCell(null)).toBe("");
    expect(toCsv([{ a: "x" }], [{ header: "a", value: (r) => r.a }])).toBe("﻿a\r\nx");
  });

  it("mode default dummy; supabase tanpa variabel menampilkan error, tanpa fallback", () => {
    expect(readAppConfig({}).mode).toBe("dummy");
    expect(readAppConfig({}).configError).toBeUndefined();
    const s = readAppConfig({ APP_DATA_MODE: "supabase" });
    expect(s.mode).toBe("supabase");
    expect(s.configError).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(readAppConfig({ APP_DATA_MODE: "lain" }).configError).toBeTruthy();
  });

  it("filter ALL konstan", () => {
    expect(ALL).toBe("all");
  });
});
